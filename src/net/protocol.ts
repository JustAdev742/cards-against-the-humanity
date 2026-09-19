import type { BlackCard, DeckMode, Phase } from '../game/types.ts'

/**
 * The TV is the host and the only authority. Phones send intents; the TV
 * sends back a view of the table plus a private view of your own hand.
 * Nothing a phone sends is trusted — the host re-checks every move.
 */

export const PROTOCOL_VERSION = 1

/* ── Liveness ───────────────────────────────────────────────────
   A phone that dies does not get to say goodbye. WebRTC will happily
   hold a connection open long after the browser behind it is gone, so
   both ends watch the clock instead of waiting for an event. */

/** How often a phone says it is still here. */
export const PING_EVERY_MS = 3000
/**
 * Silence from a phone whose connection has also dropped. Nothing is coming
 * back from this one, so there is no reason to keep the table waiting.
 */
export const PLAYER_TIMEOUT_MS = 10000

/**
 * Silence from a phone whose connection still claims to be up. That is what a
 * locked screen looks like: the browser has frozen the timers but left the
 * data channel open, and it may well come back in a moment. It is also what a
 * killed tab looks like for a while, because WebRTC is slow to notice, so the
 * table gives it a grace period and then carries on. The seat and the score
 * are kept either way, so being wrong here is cheap.
 */
export const AWAY_GRACE_MS = 25000
/** Silence from the TV for this long and the phone starts reconnecting. */
export const HOST_TIMEOUT_MS = 12000

/** The peer id a TV listens on for a given room code. */
export function peerIdForRoom(code: string): string {
  return `cath-v${PROTOCOL_VERSION}-${code.toUpperCase()}`
}

/* ── Phone → TV ─────────────────────────────────────────────── */

export type ClientMessage =
  | { type: 'hello'; playerId: string; name: string }
  | { type: 'play'; cards: string[] }
  | { type: 'reveal' }
  | { type: 'choose'; playerId: string }
  | { type: 'start' }
  | { type: 'nextRound' }
  | { type: 'playAgain' }
  | {
      type: 'setOptions'
      targetScore?: number
      rando?: boolean
      meritocracy?: boolean
      deck?: DeckMode
    }
  | { type: 'kick'; playerId: string }
  | { type: 'ping' }

/* ── TV → phone ─────────────────────────────────────────────── */

export interface PlayerView {
  id: string
  name: string
  score: number
  connected: boolean
  color: number
  /** True once this player has handed in their cards for the round. */
  played: boolean
  isCzar: boolean
}

/** A submission the Czar has turned face up. */
export interface RevealedSubmission {
  playerId: string
  cards: string[]
}

export interface TableView {
  code: string
  phase: Phase
  round: number
  black: BlackCard | null
  players: PlayerView[]
  czarId: string | null
  /** How many plays are in, whether or not they are face up yet. */
  submissionCount: number
  /** Face-up submissions, in the order the Czar is revealing them. */
  revealed: RevealedSubmission[]
  allRevealed: boolean
  winnerId: string | null
  winningCards: string[] | null
  targetScore: number
  rando: boolean
  meritocracy: boolean
  /** Who judges next, while the winning card is up. */
  nextCzarId: string | null
  deck: DeckMode
  /** How many cards the chosen deck holds, for the lobby to show. */
  deckCounts: { white: number; black: number }
  /** Names still to hand in, so the TV can nudge the right people. */
  waitingOn: string[]
  /** Fewer players here than a game needs. The round is waiting, not over. */
  shortHanded: boolean
}

export interface SelfView {
  playerId: string
  hand: string[]
  isCzar: boolean
  /** What this player put in this round, if anything. */
  submitted: string[] | null
  isHost: boolean
}

export type ServerMessage =
  | { type: 'welcome'; self: SelfView; table: TableView }
  | { type: 'table'; table: TableView }
  | { type: 'self'; self: SelfView }
  | { type: 'error'; message: string }
  | { type: 'rejected'; reason: 'full' | 'nameTaken' }
  | { type: 'pong' }
