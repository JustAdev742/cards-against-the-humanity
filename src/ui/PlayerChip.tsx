import type { PlayerView } from '../net/protocol.ts'

export function playerColor(index: number): string {
  return `var(--player-${(index % 8) + 1})`
}

/**
 * A player's colour is decoration; their initial is the identifier. Anyone
 * who cannot tell two of these hues apart can still read the name.
 */
export function PlayerDot({
  player,
  size = 'md',
}: {
  player: Pick<PlayerView, 'name' | 'color' | 'connected'>
  size?: 'sm' | 'md' | 'lg'
}) {
  const box = size === 'lg' ? 'w-10 h-10 text-lg' : size === 'sm' ? 'w-5 h-5 text-[0.6rem]' : 'w-7 h-7 text-xs'
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full font-extrabold text-ink ${box}`}
      style={{
        background: playerColor(player.color),
        opacity: player.connected ? 1 : 0.35,
      }}
    >
      {player.name.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function PlayerChip({
  player,
  showScore = true,
  size = 'md',
}: {
  player: PlayerView
  showScore?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const label = [
    player.name,
    player.botBlurb ? 'a bot' : null,
    showScore ? `${player.score} ${player.score === 1 ? 'point' : 'points'}` : null,
    player.isCzar ? 'Card Czar' : null,
    player.connected ? null : 'disconnected',
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className={`flex items-center gap-2.5 ${player.connected ? '' : 'opacity-45'}`}
      title={label}
    >
      <PlayerDot player={player} size={size} />
      <span className="flex min-w-0 items-baseline gap-2">
        <span
          className={`truncate font-bold ${size === 'lg' ? 'text-2xl' : ''} ${
            player.isCzar ? 'underline decoration-2 underline-offset-4' : ''
          }`}
        >
          {player.name}
        </span>
        {player.botBlurb && (
          <span
            aria-hidden
            className="label shrink-0 rounded border border-line px-1.5 py-0.5 text-[0.55em]! leading-none"
          >
            Bot
          </span>
        )}
        {showScore && (
          <span className={`mono tabular-nums text-ash-bright ${size === 'lg' ? 'text-2xl' : ''}`}>
            {player.score}
          </span>
        )}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  )
}
