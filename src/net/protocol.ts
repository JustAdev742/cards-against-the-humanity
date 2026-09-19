import type { BlackCard, DeckMode, Phase } from '../game/types.ts'

/**
 * The TV is the host and the only authority. Phones send intents; the TV
 * sends back a view of the table plus a private view of your own hand.
 * Nothing a phone sends is trusted — the host re-checks every move.
 */

export const PROTOCOL_VERSION = 1

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
  | { type: 'setOptions'; targetScore?: number; rando?: boolean; deck?: DeckMode }
  | { type: 'kick'; playerId: string }

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
  deck: DeckMode
  /** How many cards the chosen deck holds, for the lobby to show. */
  deckCounts: { white: number; black: number }
  /** Names still to hand in, so the TV can nudge the right people. */
  waitingOn: string[]
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
