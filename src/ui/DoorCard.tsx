import type { ReactNode } from 'react'

/**
 * A way in, shaped like the thing it leads to. The two kinds of card are the
 * game's whole visual language, so every choice in the front of the app is
 * made by picking up a card rather than reading a menu.
 */
export function DoorCard({
  tone,
  eyebrow,
  headline,
  detail,
  action,
  onClick,
  disabled = false,
  footer,
}: {
  tone: 'black' | 'white'
  eyebrow: string
  headline: string
  detail: string
  action: string
  onClick: () => void
  disabled?: boolean
  footer?: ReactNode
}) {
  const isWhite = tone === 'white'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'card-face group relative min-h-[15rem] cursor-pointer p-6 text-left ' +
        'transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 ' +
        'disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ' +
        (isWhite ? 'card-white' : 'card-black')
      }
    >
      <div>
        <span className={`label ${isWhite ? 'text-ash-ink!' : 'text-ash-bright!'}`}>{eyebrow}</span>
        <p className="m-0 mt-3 text-3xl leading-[1.05] tracking-[-0.025em] sm:text-4xl">
          {headline}
        </p>
      </div>
      <div>
        <p
          className={`m-0 mb-5 max-w-[26ch] text-sm font-medium leading-snug tracking-normal ${
            isWhite ? 'text-ash-ink' : 'text-ash-bright'
          }`}
        >
          {detail}
        </p>
        <span
          className={
            'inline-flex items-center gap-2 text-base font-extrabold tracking-[0.01em] ' +
            (isWhite ? 'text-ink' : 'text-paper')
          }
        >
          {action}
          <svg
            viewBox="0 0 20 14"
            className="w-5 transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden
          >
            <path
              d="M1 7h17m0 0-6-6m6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </span>
        {footer}
      </div>
    </button>
  )
}
