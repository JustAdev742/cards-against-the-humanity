import type { Player } from '../game/types.ts'
import { AWAY_GRACE_MS, PLAYER_TIMEOUT_MS } from './protocol.ts'

/**
 * Whether a seat has gone quiet for long enough to be given up on.
 *
 * A phone that is switched off, thrown in a bag or driven out of range never
 * fires a close event — the data channel just goes quiet — so silence is the
 * only signal there is. How long that silence is allowed to run depends on
 * whether the channel itself is still up: a phone that is still connected but
 * not talking is probably somebody putting it down for a minute, while one
 * whose channel has gone is not coming back on its own.
 */
export function shouldDrop(
  player: Pick<Player, 'connected' | 'bot'>,
  silentMs: number,
  transportAlive: boolean,
): boolean {
  if (!player.connected) return false
  // A bot has no phone to lose. It never pings, so it is always silent, and
  // sweeping on that alone would empty the table of the players it just sat.
  if (player.bot) return false
  return silentMs >= (transportAlive ? AWAY_GRACE_MS : PLAYER_TIMEOUT_MS)
}
