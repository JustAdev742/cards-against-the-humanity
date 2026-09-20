import { useId } from 'react'

/** Roughly a quarter of an hour, half an hour, and a whole evening. */
const TARGETS = [5, 7, 10] as const

export function TargetScore({
  value,
  onChange,
  size = 'tv',
  disabled = false,
}: {
  value: number
  onChange: (target: number) => void
  size?: 'tv' | 'phone'
  disabled?: boolean
}) {
  const name = useId()
  const tv = size === 'tv'

  return (
    <fieldset className="m-0 border-0 p-0" disabled={disabled}>
      <legend className={`label ${tv ? 'text-[min(1.3vw,1.1rem)]!' : ''}`}>Play to</legend>
      <div className={`mt-3 flex ${tv ? 'gap-[0.8vw]' : 'gap-2'}`}>
        {TARGETS.map((target) => {
          const checked = value === target
          return (
            <label
              key={target}
              className={
                'mono flex cursor-pointer items-center justify-center rounded-xl border-2 ' +
                'font-medium tabular-nums transition-colors duration-150 ' +
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 ' +
                'has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-paper ' +
                (tv
                  ? 'h-[5.5vh] min-h-11 w-[5.5vh] min-w-11 text-[min(1.7vw,1.4rem)]'
                  : 'h-12 w-12 text-lg') +
                (checked
                  ? ' border-paper bg-paper text-ink'
                  : ' border-line text-ash hover:border-ash hover:text-paper')
              }
            >
              <input
                type="radio"
                name={name}
                value={target}
                checked={checked}
                onChange={() => onChange(target)}
                className="sr-only"
              />
              {target}
              <span className="sr-only"> points to win</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
