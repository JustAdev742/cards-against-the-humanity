/**
 * The phone's half of the feedback. Sound lives on the TV, so a phone speaks
 * through the one channel that belongs to its owner alone. Silent on iOS,
 * where the Vibration API is not implemented; nothing here is load bearing.
 */

function allowed(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false
  // Anyone asking for less motion is asking for less of this too.
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function buzz(pattern: number | number[]): void {
  if (!allowed()) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* Some browsers throw when the page is not visible. */
  }
}

/** Picking a card up or putting it back down. */
export const tapSelect = () => buzz(12)

/** Your cards are in. */
export const tapPlayed = () => buzz(26)

/** The round has turned and it wants something from you. */
export const tapYourTurn = () => buzz([45, 70, 45])

/** You took the round. */
export const tapWon = () => buzz([30, 55, 30, 55, 80])
