import blackCards from '../data/black.json' with { type: 'json' }
import whiteCards from '../data/white.json' with { type: 'json' }
import familyBlack from '../data/family-black.json' with { type: 'json' }
import familyWhite from '../data/family-white.json' with { type: 'json' }
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  RANDO_ID,
  type BlackCard,
  type DeckMode,
  type GameOptions,
  type GameState,
  type Player,
} from './types.ts'

const BLACK = blackCards as BlackCard[]
const WHITE = whiteCards as string[]

/* ── Which cards are in play ────────────────────────────────────
   The family deck is an allowlist of exact card text, so the card
   itself is only ever written down once. */
const FAMILY_WHITE = new Set(familyWhite as string[])
const FAMILY_BLACK = new Set(familyBlack as string[])

const whitePool = (deck: DeckMode) =>
  deck === 'family' ? WHITE.filter((t) => FAMILY_WHITE.has(t)) : WHITE
const blackPool = (deck: DeckMode) =>
  deck === 'family' ? BLACK.filter((c) => FAMILY_BLACK.has(c.t)) : BLACK

export function deckCounts(deck: DeckMode) {
  return { white: whitePool(deck).length, black: blackPool(deck).length }
}

export const DEFAULT_OPTIONS: GameOptions = {
  deck: 'full',
  targetScore: 7,
  handSize: 10,
  rando: false,
}

/* ── Randomness ─────────────────────────────────────────────────
   Seeded so a game can be replayed exactly in tests. The host seeds
   from crypto at table creation, so real games are unpredictable. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

/** Room codes leave out letters that get misread across a room: I, O, Q, S, Z. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPRTUVWXY'

export function makeRoomCode(rand: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < 4; i++) code += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)]
  return code
}

export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0]
  }
  return Math.floor(Math.random() * 2 ** 32)
}

/* ── Deck ───────────────────────────────────────────────────────
   Decks are drawn from the end. When one runs out its discard pile is
   reshuffled back in, so a long night never runs dry. */
function drawWhite(state: GameState, n: number): string[] {
  const rand = mulberry32(state.seed++)
  const drawn: string[] = []
  for (let i = 0; i < n; i++) {
    if (state.whiteDeck.length === 0) {
      if (state.whiteDiscard.length === 0) break
      state.whiteDeck = shuffle(state.whiteDiscard, rand)
      state.whiteDiscard = []
    }
    drawn.push(state.whiteDeck.pop()!)
  }
  return drawn
}

function drawBlack(state: GameState): BlackCard | null {
  if (state.blackDeck.length === 0) {
    if (state.blackDiscard.length === 0) return null
    state.blackDeck = shuffle(state.blackDiscard, mulberry32(state.seed++))
    state.blackDiscard = []
  }
  return state.blackDeck.pop() ?? null
}

/* ── Lifecycle ──────────────────────────────────────────────── */

export function createGame(
  code: string,
  options: Partial<GameOptions> = {},
  seed = randomSeed(),
): GameState {
  const settings = { ...DEFAULT_OPTIONS, ...options }
  const rand = mulberry32(seed)
  return {
    code,
    phase: 'lobby',
    round: 0,
    options: settings,
    players: [],
    czarId: null,
    black: null,
    submissions: [],
    revealOrder: [],
    revealed: 0,
    winnerId: null,
    winningCards: null,
    whiteDeck: shuffle(whitePool(settings.deck), rand),
    blackDeck: shuffle(blackPool(settings.deck), rand),
    whiteDiscard: [],
    blackDiscard: [],
    seed: seed + 1,
  }
}

export type JoinResult =
  | { ok: true; player: Player }
  | { ok: false; reason: 'full' | 'nameTaken' }

export function addPlayer(state: GameState, id: string, rawName: string): JoinResult {
  const name = rawName.trim().slice(0, 14)
  const existing = state.players.find((p) => p.id === id)
  if (existing) {
    // A reconnecting phone keeps its seat, its hand and its score.
    existing.connected = true
    if (name) existing.name = name
    return { ok: true, player: existing }
  }
  if (state.players.length >= MAX_PLAYERS) return { ok: false, reason: 'full' }
  if (state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, reason: 'nameTaken' }
  }

  const used = new Set(state.players.map((p) => p.color))
  let color = 0
  while (used.has(color) && color < 7) color++

  const player: Player = { id, name, score: 0, connected: true, color, hand: [] }
  // Someone arriving mid-game is dealt in now and plays from the next round.
  if (state.phase !== 'lobby') player.hand = drawWhite(state, state.options.handSize)
  state.players.push(player)
  return { ok: true, player }
}

export function setConnected(state: GameState, id: string, connected: boolean): GameState {
  const player = state.players.find((p) => p.id === id)
  if (player) player.connected = connected
  return connected ? state : maybeCloseWriting(state)
}

/** Drops a player for good and keeps the round playable without them. */
export function removePlayer(state: GameState, id: string): GameState {
  const index = state.players.findIndex((p) => p.id === id)
  if (index === -1) return state
  const [gone] = state.players.splice(index, 1)
  state.whiteDiscard.push(...gone.hand)
  state.submissions = state.submissions.filter((s) => s.playerId !== id)
  state.revealOrder = state.revealOrder.filter((pid) => pid !== id)
  if (state.revealed > state.revealOrder.length) state.revealed = state.revealOrder.length

  if (state.phase === 'lobby') return state
  if (state.players.length < MIN_PLAYERS) {
    state.phase = 'lobby'
    state.czarId = null
    return state
  }
  // If the Czar walks out the round is void and the next player judges.
  if (state.czarId === id) return startRound(state, index % state.players.length)
  return maybeCloseWriting(state)
}

/** Swaps the deck out. Only meaningful in the lobby, before anyone holds cards. */
export function setDeck(state: GameState, deck: DeckMode): GameState {
  if (state.phase !== 'lobby' || state.options.deck === deck) return state
  const rand = mulberry32(state.seed++)
  state.options.deck = deck
  state.whiteDeck = shuffle(whitePool(deck), rand)
  state.blackDeck = shuffle(blackPool(deck), rand)
  state.whiteDiscard = []
  state.blackDiscard = []
  for (const player of state.players) player.hand = []
  return state
}

export function canStart(state: GameState): boolean {
  return state.players.filter((p) => p.connected).length >= MIN_PLAYERS
}

export function startGame(state: GameState): GameState {
  if (!canStart(state)) return state
  for (const player of state.players) {
    player.score = 0
    state.whiteDiscard.push(...player.hand)
    player.hand = drawWhite(state, state.options.handSize)
  }
  return startRound(state, 0)
}

function startRound(state: GameState, czarIndex: number): GameState {
  if (state.black) state.blackDiscard.push(state.black)

  state.round += 1
  state.phase = 'writing'
  state.czarId = state.players[czarIndex % state.players.length]?.id ?? null
  state.black = drawBlack(state)
  state.submissions = []
  state.revealOrder = []
  state.revealed = 0
  state.winnerId = null
  state.winningCards = null

  for (const player of state.players) {
    const missing = state.options.handSize - player.hand.length
    if (missing > 0) player.hand.push(...drawWhite(state, missing))
  }

  if (state.options.rando && state.black) {
    state.submissions.push({ playerId: RANDO_ID, cards: drawWhite(state, state.black.p) })
  }
  return state
}

/** Everyone who is connected, is not the Czar, and still owes a play. */
export function pendingPlayers(state: GameState): Player[] {
  return state.players.filter(
    (p) =>
      p.connected && p.id !== state.czarId && !state.submissions.some((s) => s.playerId === p.id),
  )
}

export type PlayResult = { ok: true } | { ok: false; reason: string }

export function playCards(state: GameState, playerId: string, cards: string[]): PlayResult {
  if (state.phase !== 'writing') return { ok: false, reason: 'Not taking plays right now.' }
  if (playerId === state.czarId) return { ok: false, reason: 'The Card Czar does not play a card.' }
  if (state.submissions.some((s) => s.playerId === playerId)) {
    return { ok: false, reason: 'You already played this round.' }
  }
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return { ok: false, reason: 'You are not at this table.' }

  const need = state.black?.p ?? 1
  if (cards.length !== need) return { ok: false, reason: `This one takes ${need}.` }

  // Every card played has to actually be in the hand, duplicates counted.
  const hand = player.hand.slice()
  for (const card of cards) {
    const at = hand.indexOf(card)
    if (at === -1) return { ok: false, reason: 'That card is not in your hand.' }
    hand.splice(at, 1)
  }
  player.hand = hand
  state.submissions.push({ playerId, cards })
  maybeCloseWriting(state)
  return { ok: true }
}

function maybeCloseWriting(state: GameState): GameState {
  if (state.phase !== 'writing') return state
  if (pendingPlayers(state).length > 0) return state
  if (state.submissions.length === 0) return state

  state.phase = 'judging'
  state.revealOrder = shuffle(
    state.submissions.map((s) => s.playerId),
    mulberry32(state.seed++),
  )
  state.revealed = 0
  return state
}

/** Turns the next submission face up on the TV. */
export function revealNext(state: GameState): GameState {
  if (state.phase !== 'judging') return state
  if (state.revealed < state.revealOrder.length) state.revealed += 1
  return state
}

export function allRevealed(state: GameState): boolean {
  return state.phase === 'judging' && state.revealed >= state.revealOrder.length
}

export function chooseWinner(state: GameState, playerId: string): GameState {
  if (!allRevealed(state)) return state
  const submission = state.submissions.find((s) => s.playerId === playerId)
  if (!submission) return state

  state.winnerId = playerId
  state.winningCards = submission.cards
  state.phase = 'roundEnd'

  if (playerId !== RANDO_ID) {
    const winner = state.players.find((p) => p.id === playerId)
    if (winner) winner.score += 1
  }
  return state
}

export function nextRound(state: GameState): GameState {
  if (state.phase !== 'roundEnd') return state

  for (const submission of state.submissions) state.whiteDiscard.push(...submission.cards)

  const best = state.players.reduce((top, p) => Math.max(top, p.score), 0)
  if (best >= state.options.targetScore) {
    state.phase = 'gameOver'
    return state
  }

  const czarIndex = state.players.findIndex((p) => p.id === state.czarId)
  return startRound(state, (czarIndex + 1) % state.players.length)
}

export function playAgain(state: GameState): GameState {
  for (const player of state.players) {
    state.whiteDiscard.push(...player.hand)
    player.hand = []
    player.score = 0
  }
  state.round = 0
  state.phase = 'lobby'
  state.czarId = null
  state.black = null
  state.submissions = []
  state.revealOrder = []
  state.revealed = 0
  state.winnerId = null
  state.winningCards = null
  return state
}

export function standings(state: GameState): Player[] {
  return state.players.slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

export const deckSize = { black: BLACK.length, white: WHITE.length }
