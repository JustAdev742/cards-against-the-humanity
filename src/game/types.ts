export type Phase = 'lobby' | 'writing' | 'judging' | 'roundEnd' | 'gameOver'

/**
 * Which cards are in play. The family deck is the printed deck with the
 * adult cards taken out rather than starred out — a bleeped card is not a
 * joke any more, so those cards simply are not dealt.
 */
export type DeckMode = 'full' | 'family'

export interface BlackCard {
  /** Card text. `_` marks a blank to fill. */
  t: string
  /** How many white cards this card takes. */
  p: number
}

export interface Player {
  id: string
  name: string
  score: number
  connected: boolean
  /** Index into the player colour ramp; stable for the whole game. */
  color: number
  hand: string[]
}

export interface Submission {
  playerId: string
  cards: string[]
}

export interface GameOptions {
  deck: DeckMode
  targetScore: number
  handSize: number
  /** Rando Cardrissian: a random card is played for an imaginary player. */
  rando: boolean
  /**
   * Meritocracy, from the printed house rules: the winner of a round judges
   * the next one, instead of the job passing round the table in seat order.
   */
  meritocracy: boolean
}

export interface GameState {
  code: string
  phase: Phase
  round: number
  options: GameOptions
  players: Player[]
  /** Player id whose turn it is to judge. */
  czarId: string | null
  black: BlackCard | null
  submissions: Submission[]
  /** Submission ids in the shuffled order the Czar reveals them. */
  revealOrder: string[]
  /** How many submissions the Czar has turned face up. */
  revealed: number
  winnerId: string | null
  winningCards: string[] | null
  whiteDeck: string[]
  blackDeck: BlackCard[]
  whiteDiscard: string[]
  blackDiscard: BlackCard[]
  seed: number
}

export const RANDO_ID = 'rando-cardrissian'
export const MAX_PLAYERS = 10
export const MIN_PLAYERS = 3
