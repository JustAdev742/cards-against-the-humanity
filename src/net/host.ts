import Peer, { type DataConnection } from 'peerjs'

import {
  PUBLIC_CODES,
  addBot,
  addPlayer,
  chooseWinner,
  createGame,
  deckCounts,
  isShortHanded,
  makeRoomCode,
  nextCzarId,
  nextRound,
  pendingPlayers,
  playAgain,
  playCards,
  removePlayer,
  revealNext,
  setConnected,
  setDeck,
  startGame,
} from '../game/engine.ts'
import { MAX_PLAYERS, MIN_PLAYERS, RANDO_ID, type DeckMode, type GameState } from '../game/types.ts'
import { PERSONALITIES, personalityFor } from '../bots/taste.ts'
import { createBots } from './botRunner.ts'
import { shouldDrop } from './liveness.ts'
import { peerOptions } from './peer.ts'
import {
  peerIdForRoom,
  type ClientMessage,
  type SelfView,
  type ServerMessage,
  type TableView,
} from './protocol.ts'

export type HostStatus = 'starting' | 'open' | 'error'

/**
 * One seat's worth of connection, as the table sees it. A phone reaches the
 * table over WebRTC; the person running the table reaches it by calling a
 * function. Both look like this from here.
 */
interface Channel {
  readonly open: boolean
  send(message: ServerMessage): void
  close(): void
  /** The transport under this channel, when there is one. */
  peerConnection?: RTCPeerConnection
}

function fromDataConnection(connection: DataConnection): Channel {
  return {
    get open() {
      return connection.open
    },
    send: (message) => connection.send(message),
    close: () => connection.close(),
    get peerConnection() {
      return (connection as unknown as { peerConnection?: RTCPeerConnection }).peerConnection
    },
  }
}

export interface HostSnapshot {
  status: HostStatus
  code: string
  error: string | null
  /**
   * A freshly built view on every emit. The game state itself is mutated in
   * place, so handing it out directly would give React a reference that never
   * changes and a screen that never updates.
   */
  table: TableView
}

/** Everything a phone may see about the table. Hands stay private. */
export function tableView(state: GameState): TableView {
  const revealed = state.revealOrder.slice(0, state.revealed).map((playerId) => ({
    playerId,
    cards: state.submissions.find((s) => s.playerId === playerId)?.cards ?? [],
  }))

  return {
    code: state.code,
    phase: state.phase,
    round: state.round,
    black: state.black,
    czarId: state.czarId,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
      color: p.color,
      botBlurb: p.bot ? personalityFor(p.bot).blurb : null,
      played: state.submissions.some((s) => s.playerId === p.id),
      isCzar: p.id === state.czarId,
    })),
    submissionCount: state.submissions.length,
    revealed,
    allRevealed: state.phase === 'judging' && state.revealed >= state.revealOrder.length,
    winnerId: state.winnerId,
    winningCards: state.winningCards,
    targetScore: state.options.targetScore,
    rando: state.options.rando,
    randoScore: state.randoScore,
    meritocracy: state.options.meritocracy,
    nextCzarId: state.phase === 'roundEnd' ? nextCzarId(state) : null,
    deck: state.options.deck,
    deckCounts: deckCounts(state.options.deck),
    waitingOn: pendingPlayers(state).map((p) => p.name),
    shortHanded: isShortHanded(state),
    canAddBot:
      state.players.length < MAX_PLAYERS &&
      PERSONALITIES.some((k) => !state.players.some((p) => p.bot === k.kind)),
  }
}

function selfView(state: GameState, playerId: string, hostId: string | null): SelfView {
  const player = state.players.find((p) => p.id === playerId)
  return {
    playerId,
    hand: player?.hand ?? [],
    isCzar: state.czarId === playerId,
    submitted: state.submissions.find((s) => s.playerId === playerId)?.cards ?? null,
    isHost: playerId === hostId,
  }
}

/**
 * The TV. It owns the deck, the scores and every rule; phones only ever
 * send intents, and each one is re-checked here before it counts.
 */
export type Visibility = 'private' | 'public'

export function createHost(
  options: { targetScore?: number; rando?: boolean; visibility?: Visibility },
  onChange: (snapshot: HostSnapshot) => void,
) {
  const visibility: Visibility = options.visibility ?? 'private'
  // A public table takes one of the reserved codes so strangers can find it;
  // a private one takes a random code that nobody can guess.
  const freeSlots =
    visibility === 'public' ? PUBLIC_CODES.slice().sort(() => Math.random() - 0.5) : []
  let code = visibility === 'public' ? (freeSlots.shift() ?? makeRoomCode()) : makeRoomCode()
  let state = createGame(code, options)
  let peer: Peer | null = null
  let status: HostStatus = 'starting'
  let error: string | null = null
  let destroyed = false
  /** The first player to sit down runs the table, for as long as they are here. */
  let hostPlayerId: string | null = null

  const connections = new Map<string, Channel>()

  /**
   * Whether the transport under a connection is still up. Browsers throttle
   * timers in background tabs to a crawl, so a phone in a pocket stops
   * pinging long before it has actually gone anywhere. The peer connection
   * keeps telling the truth while the JavaScript on top of it is asleep.
   */
  function transportAlive(connection: Channel | undefined): boolean {
    if (!connection?.open) return false
    // An in-tab channel has no transport to check; being open is the whole story.
    const pc = connection.peerConnection
    if (!pc) return connection.open
    return (
      pc.connectionState === 'connected' ||
      pc.iceConnectionState === 'connected' ||
      pc.iceConnectionState === 'completed'
    )
  }
  /** When each phone last said anything. A dead phone stops saying things. */
  const lastSeen = new Map<string, number>()
  /** Bots this table seated by itself, which people are welcome to replace. */
  const autoBots = new Set<string>()

  /**
   * Seats a bot with a personality nobody at this table has yet, so the bots
   * disagree with each other rather than all playing the same card.
   */
  function seatBot() {
    const taken = new Set(state.players.map((p) => p.bot).filter(Boolean))
    const free = PERSONALITIES.filter((p) => !taken.has(p.kind))
    if (free.length === 0) return null
    const choice = free[Math.floor(Math.random() * free.length)]
    return addBot(state, choice.kind, choice.name)
  }

  const bots = createBots({
    play(botId, cards) {
      playCards(state, botId, cards)
      broadcast()
    },
    reveal() {
      revealNext(state)
      broadcast()
    },
    choose(botId, winnerId) {
      if (state.czarId !== botId) return
      chooseWinner(state, winnerId)
      broadcast()
    },
  })

  /**
   * Whoever is running the table right now. The job follows the first player
   * to sit down, but it cannot stay with a phone that has gone: somebody
   * present has to be able to start the next game.
   */
  function tableHost(): string | null {
    const held = state.players.find((p) => p.id === hostPlayerId)
    if (held?.connected) return held.id
    return state.players.find((p) => p.connected)?.id ?? hostPlayerId
  }

  const emit = () => onChange({ status, code, error, table: tableView(state) })

  function send(playerId: string, message: ServerMessage) {
    const connection = connections.get(playerId)
    if (connection?.open) connection.send(message)
  }

  /** Pushes the table to every phone, and each hand to its owner. */
  function broadcast() {
    const table = tableView(state)
    for (const [playerId, connection] of connections) {
      if (!connection.open) continue
      const host = tableHost()
      connection.send({ type: 'table', table } satisfies ServerMessage)
      connection.send({ type: 'self', self: selfView(state, playerId, host) })
    }
    bots.sync(state)
    emit()
  }

  function handle(playerId: string, message: ClientMessage) {
    const isTableHost = playerId === tableHost()
    const isCzar = state.czarId === playerId

    switch (message.type) {
      case 'ping':
        // Answered so the phone knows the TV is still here too.
        send(playerId, { type: 'pong' })
        return
      case 'play': {
        const result = playCards(state, playerId, message.cards)
        if (!result.ok) send(playerId, { type: 'error', message: result.reason })
        break
      }
      case 'reveal':
        if (isCzar) revealNext(state)
        break
      case 'choose':
        if (isCzar) chooseWinner(state, message.playerId)
        break
      case 'nextRound':
        if (isCzar || isTableHost) nextRound(state)
        break
      case 'start':
        if (isTableHost) startGame(state)
        break
      case 'playAgain':
        if (isTableHost) playAgain(state)
        break
      case 'setOptions':
        if (isTableHost && state.phase === 'lobby') {
          if (message.targetScore) state.options.targetScore = message.targetScore
          if (message.rando !== undefined) state.options.rando = message.rando
          if (message.meritocracy !== undefined) state.options.meritocracy = message.meritocracy
          if (message.deck) setDeck(state, message.deck)
        }
        break
      case 'addBot':
        if (isTableHost && state.phase === 'lobby') seatBot()
        break
      case 'kick':
        if (isTableHost && message.playerId !== playerId) {
          connections.get(message.playerId)?.close()
          connections.delete(message.playerId)
          removePlayer(state, message.playerId)
        }
        break
    }
    broadcast()
  }

  /**
   * Takes a seat on behalf of whatever is on the other end of `channel`.
   * That is usually a phone across a WebRTC data channel, but when the person
   * running the table is also playing it is a direct call in the same tab —
   * the rules do not care which, so neither does this.
   */
  function attach(channel: Channel) {
    let playerId: string | null = null

    function receive(message: ClientMessage) {
      if (!message || typeof message.type !== 'string') return
      if (playerId) lastSeen.set(playerId, Date.now())

      if (message.type === 'hello') {
        if (message.playerId === RANDO_ID) return
        const result = addPlayer(state, message.playerId, message.name)
        if (!result.ok) {
          channel.send({ type: 'rejected', reason: result.reason } satisfies ServerMessage)
          setTimeout(() => channel.close(), 250)
          return
        }
        playerId = message.playerId
        lastSeen.set(playerId, Date.now())
        // A phone that reloads replaces its own stale connection.
        const stale = connections.get(playerId)
        if (stale && stale !== channel) stale.close()
        connections.set(playerId, channel)
        if (!hostPlayerId || !state.players.some((p) => p.id === hostPlayerId)) {
          hostPlayerId = playerId
        }
        channel.send({
          type: 'welcome',
          self: selfView(state, playerId, tableHost()),
          table: tableView(state),
        } satisfies ServerMessage)
        broadcast()
        return
      }

      if (playerId) handle(playerId, message)
    }

    function drop() {
      if (!playerId) return
      // Only forget the seat if this is still the live connection for it;
      // a reconnect will have replaced it already.
      if (connections.get(playerId) === channel) {
        connections.delete(playerId)
        lastSeen.delete(playerId)
      }
      setConnected(state, playerId, false)
      broadcast()
    }

    return { receive, drop }
  }

  function accept(connection: DataConnection) {
    const channel = fromDataConnection(connection)
    const { receive, drop } = attach(channel)
    connection.on('data', (raw) => receive(raw as ClientMessage))
    connection.on('close', drop)
    connection.on('error', drop)
  }

  function open(attempt = 0) {
    if (destroyed) return
    peer = new Peer(peerIdForRoom(code), peerOptions())

    peer.on('open', () => {
      status = 'open'
      error = null
      emit()
    })
    peer.on('connection', accept)
    peer.on('error', (err: Error & { type?: string }) => {
      // Somebody already has this code. A private table just takes another;
      // a public one works down its list of reserved tables until one is free.
      if (err.type === 'unavailable-id' && attempt < PUBLIC_CODES.length + 5) {
        const next = visibility === 'public' ? freeSlots.shift() : makeRoomCode()
        if (next) {
          peer?.destroy()
          code = next
          state.code = code
          open(attempt + 1)
          return
        }
        status = 'error'
        error = 'Every public table is busy right now. Start a private one instead.'
        emit()
        return
      }
      if (err.type === 'peer-unavailable') return
      status = 'error'
      error =
        err.type === 'network' || err.type === 'server-error'
          ? 'Lost contact with the matchmaking service. Reload to try again.'
          : err.message
      emit()
    })
    peer.on('disconnected', () => {
      if (!destroyed) peer?.reconnect()
    })
  }

  /**
   * A phone that is switched off, thrown in a bag or driven out of range
   * never fires a close event: the data channel just goes quiet. Without
   * this sweep the round would wait on it for the rest of the evening.
   */
  const sweep = setInterval(() => {
    const now = Date.now()
    let changed = false
    for (const player of state.players) {
      const connection = connections.get(player.id)
      const silent = now - (lastSeen.get(player.id) ?? 0)
      if (!shouldDrop(player, silent, transportAlive(connection))) continue
      connection?.close()
      connections.delete(player.id)
      lastSeen.delete(player.id)
      setConnected(state, player.id, false)
      changed = true
    }
    if (changed) broadcast()
  }, 2500)

  /**
   * The winning card holds the screen for a beat and then the next round
   * deals. This lives on the table rather than on the TV, because an online
   * game has no TV and would otherwise sit on the winner until somebody
   * remembered to press the button.
   */
  const WINNER_DWELL_MS = 7000
  let dwellFrom = -1
  const dwell = setInterval(() => {
    if (destroyed || state.phase !== 'roundEnd') {
      if (state.phase !== 'roundEnd') dwellFrom = -1
      return
    }
    if (dwellFrom === -1) {
      dwellFrom = Date.now()
      return
    }
    if (Date.now() - dwellFrom < WINNER_DWELL_MS) return
    dwellFrom = -1
    nextRound(state)
    broadcast()
  }, 1000)

  /**
   * A public table with one person at it is not a game. After a short wait
   * the table seats bots so they can actually play — and gives those seats
   * straight back when real people turn up. Private and local tables never
   * do this: somebody chose who is at those.
   */
  const AUTO_FILL_AFTER_MS = 20000
  let waitingSince = 0
  const autofill = setInterval(() => {
    if (destroyed || visibility !== 'public' || state.phase !== 'lobby') return
    const humans = state.players.filter((p) => !p.bot && p.connected).length
    if (humans === 0) {
      waitingSince = 0
      return
    }
    if (!waitingSince) waitingSince = Date.now()

    let changed = false
    while (autoBots.size > 0 && state.players.length > MIN_PLAYERS) {
      const [id] = [...autoBots].slice(-1)
      autoBots.delete(id)
      removePlayer(state, id)
      changed = true
    }
    if (Date.now() - waitingSince >= AUTO_FILL_AFTER_MS && state.players.length < MIN_PLAYERS) {
      const bot = seatBot()
      if (bot) {
        autoBots.add(bot.id)
        changed = true
      }
    }
    if (changed) broadcast()
  }, 4000)

  open()
  emit()

  return {
    visibility,
    get snapshot(): HostSnapshot {
      return { status, code, error, table: tableView(state) }
    },
    /** Seats one more bot, from the TV's own controls. */
    addBot() {
      seatBot()
      broadcast()
    },

    /**
     * Sits the person running the table down as a player, without a round
     * trip through the network. Used when there is no TV in the room and the
     * host is playing along on the same device.
     */
    joinHere(onMessage: (message: ServerMessage) => void) {
      let open = true
      const channel: Channel = {
        get open() {
          return open
        },
        send: (message) => {
          if (open) onMessage(message)
        },
        close: () => {
          open = false
        },
      }
      const { receive, drop } = attach(channel)
      return {
        send: (message: ClientMessage) => {
          if (open) receive(message)
        },
        close: () => {
          open = false
          drop()
        },
      }
    },

    /** TV-side controls, for a table driven by a keyboard or a remote. */
    startGame() {
      startGame(state)
      broadcast()
    },
    nextRound() {
      nextRound(state)
      broadcast()
    },
    playAgain() {
      playAgain(state)
      broadcast()
    },
    setOptions(next: {
      targetScore?: number
      rando?: boolean
      meritocracy?: boolean
      deck?: DeckMode
    }) {
      if (state.phase !== 'lobby') return
      if (next.targetScore) state.options.targetScore = next.targetScore
      if (next.rando !== undefined) state.options.rando = next.rando
      if (next.meritocracy !== undefined) state.options.meritocracy = next.meritocracy
      if (next.deck) setDeck(state, next.deck)
      broadcast()
    },
    destroy() {
      destroyed = true
      clearInterval(sweep)
      clearInterval(autofill)
      clearInterval(dwell)
      bots.destroy()
      for (const connection of connections.values()) connection.close()
      connections.clear()
      peer?.destroy()
    },
  }
}

export type Host = ReturnType<typeof createHost>
