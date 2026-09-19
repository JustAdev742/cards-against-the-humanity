import { useId } from 'react'

import type { DeckMode } from '../game/types.ts'

/**
 * Two decks, one choice. The family deck is the printed deck with the adult
 * cards removed rather than bleeped: a starred-out word is not a joke, so the
 * card does not get dealt at all. Everything that is left is the real game.
 */
const OPTIONS: { value: DeckMode; label: string; detail: string }[] = [
  { value: 'full', label: 'Full deck', detail: 'Everything in the box. Adults only.' },
  { value: 'family', label: 'Family deck', detail: 'Fine for about twelve and up.' },
]

export function DeckChoice({
  value,
  counts,
  onChange,
  size = 'phone',
  disabled = false,
}: {
  value: DeckMode
  counts: { white: number; black: number }
  onChange: (deck: DeckMode) => void
  size?: 'phone' | 'tv'
  disabled?: boolean
}) {
  const name = useId()
  const tv = size === 'tv'

  return (
    <fieldset className="m-0 border-0 p-0" disabled={disabled}>
      <legend className={`label ${tv ? 'text-[min(1.3vw,1.1rem)]!' : ''}`}>Deck</legend>

      <div className={`mt-3 grid grid-cols-2 ${tv ? 'gap-[1vw]' : 'gap-3'}`}>
        {OPTIONS.map((option) => {
          const checked = value === option.value
          return (
            <label
              key={option.value}
              className={
                'flex cursor-pointer flex-col justify-center rounded-xl border-2 transition-colors ' +
                'duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 ' +
                'has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-paper ' +
                (tv ? 'px-[1.2vw] py-[1.4vh]' : 'min-h-16 px-4 py-3 ') +
                (checked
                  ? ' border-paper bg-paper text-ink'
                  : ' border-line text-paper hover:border-ash')
              }
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className={`font-extrabold ${tv ? 'text-[min(1.5vw,1.25rem)]' : 'text-base'}`}>
                {option.label}
              </span>
              <span
                className={
                  `mt-0.5 font-medium leading-snug ${tv ? 'text-[min(1.1vw,0.9rem)]' : 'text-xs'} ` +
                  (checked ? 'text-ink/65' : 'text-ash')
                }
              >
                {option.detail}
              </span>
            </label>
          )
        })}
      </div>

      <p
        className={`m-0 mt-2.5 text-ash ${tv ? 'text-[min(1.1vw,0.9rem)]' : 'text-xs'}`}
        aria-live="polite"
      >
        {counts.white} white cards and {counts.black} black cards in play.
        {value === 'family' && ' Sex, drugs and slurs are taken out, not bleeped.'}
      </p>
    </fieldset>
  )
}
