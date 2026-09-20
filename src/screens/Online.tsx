import { useCallback, useEffect, useRef, useState } from 'react'

import { FeedbackProvider } from '../audio/feedback.tsx'
import { createHost, type Host, type Visibility } from '../net/host.ts'
import { createLocalClient } from '../net/localClient.ts'
import { findPublicTable } from '../net/publicTables.ts'
import { playerId as ownId, rememberName, rememberedName } from '../net/hooks.ts'
import type { SeatSnapshot } from '../net/seat.ts'
import { Button } from '../ui/Button.tsx'
import { CardMark } from '../ui/Card.tsx'
import { DoorCard } from '../ui/DoorCard.tsx'
import { Doorway } from './Home.tsx'
import { Seat, Shell } from './Phone.tsx'
import { useMusic } from '../audio/useMusic.ts'

/* ── Choosing a kind of game ────────────────────────────────── */

export function OnlineMenu({
  onPrivate,
  onPublic,
  onBack,
}: {
  onPrivate: () => void
  onPublic: () => void
  onBack: () => void
}) {
  return (
    <Doorway
      headline="Play with the people you want, or whoever turns up."
      back={{ label: 'Back', onClick: onBack }}
    >
      <DoorCard
        tone="black"
        eyebrow="With people you know"
        headline="Private match."
        detail="Open a table and send the code to your friends. Nobody else can walk in."
        action="Private game"
        onClick={onPrivate}
      />
      <DoorCard
        tone="white"
        eyebrow="With whoever is around"
        headline="Public match."
        detail="Drops you into a table with strangers, or opens one for them to find."
        action="Find a game"
        onClick={onPublic}
      />
    </Doorway>
  )
}

export function PrivateMenu({
  onCreate,
  onJoin,
  onBack,
}: {
  onCreate: () => void
  onJoin: () => void
  onBack: () => void
}) {
  return (
    <Doorway
      headline="Somebody opens the table, everybody else types the code."
      back={{ label: 'Back', onClick: onBack }}
    >
      <DoorCard
        tone="black"
        eyebrow="You run it"
        headline="Open a table."
        detail="You get a four-letter code and a link to send round. Your device keeps the game."
        action="Open a table"
        onClick={onCreate}
      />
      <DoorCard
        tone="white"
        eyebrow="Somebody sent you a code"
        headline="Join a table."
        detail="Four letters and a name and you are in."
        action="Join with a code"
        onClick={onJoin}
      />
    </Doorway>
  )
}

/* ── Finding a public table ─────────────────────────────────── */

export function PublicSearch({
  onFound,
  onHost,
  onBack,
}: {
  onFound: (code: string) => void
  onHost: () => void
  onBack: () => void
}) {
  const [checked, setChecked] = useState(0)
  const [total, setTotal] = useState(0)
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    const search = findPublicTable((done, all) => {
      setChecked(done)
      setTotal(all)
    })
    let cancelled = false
    void search.result.then((code) => {
      if (cancelled) return
      if (code) onFound(code)
      else setEmpty(true)
    })
    return () => {
      cancelled = true
      search.cancel()
    }
  }, [onFound])

  return (
    <Doorway
      headline={empty ? 'Nobody is playing right now.' : 'Looking for a table…'}
      back={{ label: 'Back', onClick: onBack }}
      footer={
        <p className="m-0">
          Public tables live on a few well-known codes. There is no server keeping a list, so
          finding one means knocking on each of them.
        </p>
      }
    >
      {empty ? (
        <DoorCard
          tone="white"
          eyebrow="Be the first"
          headline="Open a public table."
          detail="It shows up for anyone else who goes looking. You can start as soon as three people are in."
          action="Open one"
          onClick={onHost}
        />
      ) : (
        <div className="card-face card-black min-h-[15rem] p-6">
          <div>
            <span className="label text-ash-bright!">Knocking on doors</span>
            <p className="m-0 mt-3 text-3xl leading-[1.05] tracking-[-0.025em]">
              {total ? `${checked} of ${total}` : 'Starting up'}
            </p>
          </div>
          <CardMark className="w-8 animate-pulse text-ash" />
        </div>
      )}
    </Doorway>
  )
}

/* ── Running a table you are also sitting at ────────────────── */

function NameForm({
  title,
  onReady,
  onBack,
}: {
  title: string
  onReady: (name: string) => void
  onBack: () => void
}) {
  const [name, setName] = useState(rememberedName())
  const [touched, setTouched] = useState(false)
  const ready = name.trim().length > 0

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-[max(1.5rem,var(--inset-top))]">
      <button type="button" onClick={onBack} className="label w-fit cursor-pointer hover:text-paper!">
        ← Back
      </button>
      <form
        className="flex flex-1 flex-col justify-center gap-8"
        onSubmit={(event) => {
          event.preventDefault()
          setTouched(true)
          if (ready) {
            rememberName(name.trim())
            onReady(name.trim())
          }
        }}
      >
        <h2 className="m-0 text-3xl font-extrabold tracking-[-0.03em]">{title}</h2>
        <div className="flex flex-col gap-2">
          <label htmlFor="host-name" className="label">
            Your name
          </label>
          <input
            id="host-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={14}
            autoComplete="nickname"
            enterKeyHint="go"
            aria-describedby="host-name-help"
            aria-invalid={touched && !ready ? true : undefined}
            className={
              'h-14 rounded-xl border-2 bg-transparent px-4 text-xl font-bold text-paper ' +
              'transition-colors placeholder:text-ash ' +
              (touched && !ready ? 'border-danger' : 'border-line focus-visible:border-paper')
            }
            placeholder="Sam"
          />
          <p id="host-name-help" className="m-0 text-sm text-ash">
            {touched && !ready ? 'Everyone needs a name at the table.' : 'Up to 14 characters.'}
          </p>
        </div>
        <Button type="submit">Open the table</Button>
      </form>
    </main>
  )
}

/**
 * A table with no TV: this device runs the game and plays in it. The seat is
 * wired straight into the host in the same tab, so the player screen is the
 * same one everybody else is looking at.
 */
export function HostedTable({
  visibility,
  onExit,
}: {
  visibility: Visibility
  onExit: () => void
}) {
  const [name, setName] = useState<string | null>(null)
  if (!name) {
    return (
      <NameForm
        title={visibility === 'public' ? 'Open a public table' : 'Open a private table'}
        onReady={setName}
        onBack={onExit}
      />
    )
  }
  return (
    <FeedbackProvider>
      <RunningTable visibility={visibility} name={name} onExit={onExit} />
    </FeedbackProvider>
  )
}

function RunningTable({
  visibility,
  name,
  onExit,
}: {
  visibility: Visibility
  name: string
  onExit: () => void
}) {
  const [snapshot, setSnapshot] = useState<SeatSnapshot | null>(null)
  const [status, setStatus] = useState<'starting' | 'open' | 'error'>('starting')
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const clientRef = useRef<ReturnType<typeof createLocalClient> | null>(null)
  // An online table has no TV to carry the room, so it carries it itself.
  const music = useMusic()

  // Opening the table was a click, which is the gesture browsers want before
  // they will play anything.
  useEffect(() => {
    if (music.available && !music.playing) music.start()
  }, [music])

  useEffect(() => {
    let host: Host | null = null
    let client: ReturnType<typeof createLocalClient> | null = null
    // Taking the seat says hello, which makes the table broadcast, which calls
    // this back before `client` has been assigned. Without this the callback
    // would sit down again, forever.
    let seating = false

    host = createHost({ visibility }, (snap) => {
      setStatus(snap.status)
      setError(snap.error)
      setCode(snap.code)
      // The seat only exists once the table is actually reachable.
      if (snap.status === 'open' && !seating && !client && host) {
        seating = true
        client = createLocalClient(host, ownId(), name, setSnapshot)
        clientRef.current = client
      }
    })

    return () => {
      client?.destroy()
      host?.destroy()
      clientRef.current = null
    }
  }, [visibility, name])

  if (status === 'error') {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="m-0 text-lg font-bold">{error ?? 'Could not open a table.'}</p>
          <Button variant="secondary" onClick={onExit}>
            Back
          </Button>
        </div>
      </Shell>
    )
  }

  if (!snapshot?.table || !snapshot.self) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <CardMark className="w-9 animate-pulse text-ash" />
          <p className="m-0 text-lg font-bold">Opening the table…</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {snapshot.table.phase === 'lobby' && <ShareStrip code={code} visibility={visibility} />}
      <Seat
        snapshot={snapshot}
        client={clientRef.current}
        table={snapshot.table}
        self={snapshot.self}
        music={music}
      />
    </Shell>
  )
}

/** How the others get in. Only worth showing while the table is still filling. */
function ShareStrip({ code, visibility }: { code: string; visibility: Visibility }) {
  const [copied, setCopied] = useState(false)
  const link = `${location.origin}${location.pathname}?r=${code}`

  const copy = useCallback(() => {
    void navigator.clipboard
      ?.writeText(link)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => setCopied(false))
  }, [link])

  return (
    <section className="shrink-0 border-b border-line px-4 py-3">
      <p className="label m-0">
        {visibility === 'public' ? 'Public table — anyone can join' : 'Send this to your friends'}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <span className="mono text-3xl tracking-[0.12em]" translate="no">
          {code}
        </span>
        <Button variant="secondary" onClick={copy} className="ml-auto min-h-11! px-4! text-sm!">
          {copied ? 'Link copied' : 'Copy link'}
        </Button>
      </div>
    </section>
  )
}
