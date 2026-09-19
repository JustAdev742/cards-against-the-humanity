import { DECK_COUNTS } from '../data/counts.ts'
import { CardMark } from '../ui/Card.tsx'

/**
 * The two ways in are the two kinds of card. You are either the table —
 * the black card everyone is answering — or you are a hand of white cards.
 * Picking a door is picking up the card that is yours.
 */
export function Home({ onHost, onJoin }: { onHost: () => void; onJoin: () => void }) {
  /** Staggered entrance: each element carries `rise` and its own delay. */
  const rise = (delay: number) => ({ style: { animationDelay: `${delay}s` } })

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-10 pt-[max(1.5rem,var(--inset-top))]">
      <header {...rise(0)} className="rise flex items-center gap-3">
        <CardMark className="w-6 text-paper" />
        <h1 className="label text-paper!">Cards Against The Humanity</h1>
      </header>

      <div className="flex flex-1 flex-col justify-center gap-10 py-12">
        <p
          {...rise(0.06)}
          className="rise max-w-xl text-balance text-3xl font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-5xl"
        >
          The TV is the table. Everybody’s phone is their hand.
        </p>

        <div {...rise(0.14)} className="rise grid gap-4 sm:grid-cols-2 sm:gap-6">
          <DoorCard
            tone="black"
            eyebrow="On the big screen"
            headline="I’m the TV."
            detail="Opens a table and shows a four-letter code for everyone to join."
            action="Start a table"
            onClick={onHost}
          />
          <DoorCard
            tone="white"
            eyebrow="On your phone"
            headline="I’m playing."
            detail="Type the code on the TV and your cards arrive here."
            action="Join a table"
            onClick={onJoin}
          />
        </div>
      </div>

      <footer {...rise(0.22)} className="rise border-t border-line pt-5 text-sm text-ash">
        <p className="m-0">
          {DECK_COUNTS.black} black cards and {DECK_COUNTS.white} white cards: the whole 2022
          print-and-play deck. Three players or more. Nothing to install.
        </p>
        <p className="m-0 mt-2">
          <em className="not-italic">Cards Against Humanity</em> is by Cards Against Humanity LLC,
          under{' '}
          <a
            className="underline decoration-line underline-offset-4 hover:text-paper hover:decoration-paper"
            href="https://creativecommons.org/licenses/by-nc-sa/2.0/"
            target="_blank"
            rel="noreferrer noopener"
          >
            CC BY-NC-SA 2.0
          </a>
          . This is an unofficial, non-commercial way to play it.
        </p>
      </footer>
    </main>
  )
}

function DoorCard({
  tone,
  eyebrow,
  headline,
  detail,
  action,
  onClick,
}: {
  tone: 'black' | 'white'
  eyebrow: string
  headline: string
  detail: string
  action: string
  onClick: () => void
}) {
  const isWhite = tone === 'white'
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'card-face group relative min-h-[15rem] cursor-pointer p-6 text-left ' +
        'transition-transform duration-200 hover:-translate-y-1 active:translate-y-0 ' +
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
          <svg viewBox="0 0 20 14" className="w-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden>
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
      </div>
    </button>
  )
}
