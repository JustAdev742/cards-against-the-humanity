import Peer, { type DataConnection } from 'peerjs'

import {
  addPlayer,
  chooseWinner,
  createGame,
  deckCounts,
  makeRoomCode,
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
import { RANDO_ID, type DeckMode, type GameState } from '../game/types.ts'
import { peerOptions } from './peer.ts'
import {
  peerIdForRoom,
  type ClientMessage,
  type SelfView,
  type ServerMessage,
  type TableView,
} from './protocol.ts'

export type HostStatus = 'starting' | 'open' | 'error'

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
    deck: state.options.deck,
    deckCounts: deckCounts(state.options.deck),
    waitingOn: pendingPlayers(state).map((p) => p.name),
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
export function createHost(
  options: { targetScore?: number; rando?: boolean },
  onChange: (snapshot: HostSnapshot) => void,
) {
  let code = makeRoomCode()
  let state = createGame(code, options)
  let peer: Peer | null = null
  let status: HostStatus = 'starting'
  let error: string | null = null
  let destroyed = false
  /** The first player to sit down runs the table. */
  let hostPlayerId: string | null = null

  const connections = new Map<string, DataConnection>()

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
      connection.send({ type: 'table', table } satisfies ServerMessage)
      connection.send({ type: 'self', self: selfView(state, playerId, hostPlayerId) })
    }
    emit()
  }

  function handle(playerId: string, message: ClientMessage) {
    const isTableHost = playerId === hostPlayerId
    const isCzar = state.czarId === playerId

    switch (message.type) {
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
          if (message.deck) setDeck(state, message.deck)
        }
        break
      case 'kick':
        if (isTableHost && message.playerId !== hostPlayerId) {
          connections.get(message.playerId)?.close()
          connections.delete(message.playerId)
          removePlayer(state, message.playerId)
        }
        break
    }
    broadcast()
  }

  function accept(connection: DataConnection) {
    let playerId: string | null = null

    connection.on('data', (raw) => {
      const message = raw as ClientMessage
      if (!message || typeof message.type !== 'string') return

      if (message.type === 'hello') {
        if (message.playerId === RANDO_ID) return
        const result = addPlayer(state, message.playerId, message.name)
        if (!result.ok) {
          connection.send({ type: 'rejected', reason: result.reason } satisfies ServerMessage)
          setTimeout(() => connection.close(), 250)
          return
        }
        playerId = message.playerId
        // A phone that reloads replaces its own stale connection.
        const stale = connections.get(playerId)
        if (stale && stale !== connection) stale.close()
        connections.set(playerId, connection)
        if (!hostPlayerId || !state.players.some((p) => p.id === hostPlayerId)) {
          hostPlayerId = playerId
        }
        connection.send({
          type: 'welcome',
          self: selfView(state, playerId, hostPlayerId),
          table: tableView(state),
        } satisfies ServerMessage)
        broadcast()
        return
      }

      if (playerId) handle(playerId, message)
    })

    const drop = () => {
      if (!playerId) return
      // Only forget the seat if this is still the live connection for it;
      // a reconnect will have replaced it already.
      if (connections.get(playerId) === connection) connections.delete(playerId)
      setConnected(state, playerId, false)
      broadcast()
    }
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
      // Another TV already has this code — take a different one.
      if (err.type === 'unavailable-id' && attempt < 5) {
        peer?.destroy()
        code = makeRoomCode()
        state.code = code
        open(attempt + 1)
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

  open()
  emit()

  return {
    get snapshot(): HostSnapshot {
      return { status, code, error, table: tableView(state) }
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
    setOptions(next: { targetScore?: number; rando?: boolean; deck?: DeckMode }) {
      if (state.phase !== 'lobby') return
      if (next.targetScore) state.options.targetScore = next.targetScore
      if (next.rando !== undefined) state.options.rando = next.rando
      if (next.deck) setDeck(state, next.deck)
      broadcast()
    },
    destroy() {
      destroyed = true
      for (const connection of connections.values()) connection.close()
      connections.clear()
      peer?.destroy()
    },
  }
}

export type Host = ReturnType<typeof createHost>
