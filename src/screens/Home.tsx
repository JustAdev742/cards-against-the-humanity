import type { ReactNode } from 'react'

import { DECK_COUNTS } from '../data/counts.ts'
import { CardMark } from '../ui/Card.tsx'
import { DoorCard } from '../ui/DoorCard.tsx'

/** Staggered entrance: each element carries `rise` and its own delay. */
const rise = (delay: number) => ({ style: { animationDelay: `${delay}s` } })

/**
 * The shell every front-of-house screen sits in, so stepping between them
 * only swaps the cards in the middle.
 */
export function Doorway({
  headline,
  back,
  children,
  footer,
}: {
  headline: ReactNode
  back?: { label: string; onClick: () => void }
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-10 pt-[max(1.5rem,var(--inset-top))]">
      <header {...rise(0)} className="rise flex items-center gap-3">
        <CardMark className="w-6 text-paper" />
        <h1 className="label text-paper!">Cards Against The Humanity</h1>
        {back && (
          <button
            type="button"
            onClick={back.onClick}
            className="label ml-auto cursor-pointer hover:text-paper!"
          >
            ← {back.label}
          </button>
        )}
      </header>

      <div className="flex flex-1 flex-col justify-center gap-10 py-12">
        <p
          {...rise(0.06)}
          className="rise max-w-xl text-balance text-3xl font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-5xl"
        >
          {headline}
        </p>
        <div {...rise(0.14)} className="rise grid gap-4 sm:grid-cols-2 sm:gap-6">
          {children}
        </div>
      </div>

      <footer {...rise(0.22)} className="rise border-t border-line pt-5 text-sm text-ash">
        {footer ?? <Credits />}
      </footer>
    </main>
  )
}

function Credits() {
  return (
    <>
      <p className="m-0">
        Two printed decks: the original ({DECK_COUNTS.white} white, {DECK_COUNTS.black} black) and
        the Family Edition ({DECK_COUNTS.familyWhite} white, {DECK_COUNTS.familyBlack} black). Three
        players or more. Nothing to install.
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
    </>
  )
}

/** Everyone in the same room, or everyone somewhere else. */
export function Home({ onLocal, onOnline }: { onLocal: () => void; onOnline: () => void }) {
  return (
    <Doorway headline="The TV is the table. Everybody’s phone is their hand.">
      <DoorCard
        tone="black"
        eyebrow="Everyone in one room"
        headline="Local game."
        detail="Put it on the TV and hand out a four-letter code. The way it is meant to be played."
        action="Play in the room"
        onClick={onLocal}
      />
      <DoorCard
        tone="white"
        eyebrow="Everyone somewhere else"
        headline="Online game."
        detail="No TV needed. The table and your hand both live on your own screen."
        action="Play online"
        onClick={onOnline}
      />
    </Doorway>
  )
}

/** The two seats in a room: the screen everyone looks at, and a hand of cards. */
export function LocalMenu({
  onHost,
  onJoin,
  onBack,
}: {
  onHost: () => void
  onJoin: () => void
  onBack: () => void
}) {
  return (
    <Doorway
      headline="One screen for the table, one phone each."
      back={{ label: 'Back', onClick: onBack }}
    >
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
    </Doorway>
  )
}
