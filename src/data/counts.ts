/**
 * Deck sizes as plain literals. The front page shows these, and importing the
 * decks themselves to count them would drag 60 kB of card text into the first
 * chunk every visitor downloads. `test/engine.test.ts` checks they stay true.
 */
export const DECK_COUNTS = {
  black: 100,
  white: 500,
  familyBlack: 84,
  familyWhite: 237,
} as const
