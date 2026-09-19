import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { MIN_PLAYERS, RANDO_ID } from '../game/types.ts'
import { rememberName, rememberedName, useClient, useWakeLock } from '../net/hooks.ts'
import type { Client, ClientSnapshot } from '../net/client.ts'
import type { SelfView, TableView } from '../net/protocol.ts'
import { BlackCardFace, CardMark, WhiteCard, blackCardSentence } from '../ui/Card.tsx'
import { Button } from '../ui/Button.tsx'
import { ConfirmButton } from '../ui/ConfirmButton.tsx'
import { DeckChoice } from '../ui/DeckChoice.tsx'
import { CodeInput } from '../ui/CodeInput.tsx'
import { PlayerChip, PlayerDot } from '../ui/PlayerChip.tsx'

export function Phone({ initialCode, onExit }: { initialCode: string; onExit: () => void }) {
  const [entry, setEntry] = useState<{ code: string; name: string } | null>(null)
  const { snapshot, client } = useClient(entry?.code ?? null, entry?.name ?? '')

  useWakeLock(snapshot?.status === 'connected')

  // A rejected name or a full table sends the player back to the form.
  useEffect(() => {
    if (snapshot?.status === 'rejected') setEntry(null)
  }, [snapshot?.status])

  if (!entry) {
    return (
      <JoinForm
        initialCode={initialCode}
        notice={snapshot?.status === 'rejected' ? snapshot.notice : null}
        onJoin={(code, name) => {
          rememberName(name)
          setEntry({ code, name })
        }}
        onExit={onExit}
      />
    )
  }

  if (!snapshot || !snapshot.table || !snapshot.self) {
    return (
      <Shell>
        <Connecting notice={snapshot?.notice ?? 'Looking for the table…'} onExit={() => setEntry(null)} />
      </Shell>
    )
  }

  return (
    <Shell>
      <Seat snapshot={snapshot} client={client} table={snapshot.table} self={snapshot.self} />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-dvh flex-col bg-ink">{children}</main>
}

/* ── Getting in ─────────────────────────────────────────────── */

function JoinForm({
  initialCode,
  notice,
  onJoin,
  onExit,
}: {
  initialCode: string
  notice: string | null
  onJoin: (code: string, name: string) => void
  onExit: () => void
}) {
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, 4))
  const [name, setName] = useState(rememberedName())
  const [touched, setTouched] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const codeReady = code.length === 4
  const nameReady = name.trim().length > 0
  const submit = () => {
    setTouched(true)
    if (codeReady && nameReady) {
      onJoin(code, name.trim())
      return
    }
    // Send the cursor to whichever field is holding things up. The code
    // input focuses itself when it goes invalid, so only the name needs this.
    if (codeReady && !nameReady) nameRef.current?.focus()
  }

  return (
    <main className="flex min-h-dvh flex-col px-5 pb-[max(1.5rem,var(--inset-bottom))] pt-[max(1.5rem,var(--inset-top))]">
      <button type="button" onClick={onExit} className="label w-fit cursor-pointer hover:text-paper!">
        ← Back
      </button>

      <form
        className="flex flex-1 flex-col justify-center gap-8"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div>
          <h1 className="m-0 text-3xl font-extrabold tracking-[-0.03em]">Join the table</h1>
          <p className="m-0 mt-2 text-ash-bright">The four letters are on the TV.</p>
        </div>

        {notice && (
          <p role="alert" className="m-0 rounded-xl border-2 border-danger px-4 py-3 font-bold text-danger">
            {notice}
          </p>
        )}

        <div>
          <CodeInput
            value={code}
            onChange={setCode}
            invalid={touched && !codeReady}
            describedBy="code-help"
            label="Table code"
          />
          <p id="code-help" className="mt-3 text-center text-sm text-ash">
            {touched && !codeReady ? 'Four letters, exactly as shown on the TV.' : 'Four letters.'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="player-name" className="label">
            Your name
          </label>
          <input
            id="player-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={14}
            autoComplete="nickname"
            enterKeyHint="go"
            aria-describedby="name-help"
            aria-invalid={touched && !nameReady ? true : undefined}
            className={
              'h-14 rounded-xl border-2 bg-transparent px-4 text-xl font-bold text-paper ' +
              'transition-colors placeholder:text-ash ' +
              (touched && !nameReady ? 'border-danger' : 'border-line focus-visible:border-paper')
            }
            placeholder="Sam"
            ref={nameRef}
          />
          <p id="name-help" className="m-0 text-sm text-ash">
            {touched && !nameReady ? 'Everyone needs a name on the TV.' : 'Up to 14 characters.'}
          </p>
        </div>

        <Button type="submit" onClick={submit}>
          Take a seat
        </Button>
      </form>
    </main>
  )
}

function Connecting({ notice, onExit }: { notice: string; onExit: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <CardMark className="w-9 animate-pulse text-ash" />
      <p className="m-0 text-lg font-bold">{notice}</p>
      <Button variant="secondary" onClick={onExit}>
        Use a different code
      </Button>
    </div>
  )
}

/* ── At the table ───────────────────────────────────────────── */

function Seat({
  snapshot,
  client,
  table,
  self,
}: {
  snapshot: ClientSnapshot
  client: Client | null
  table: TableView
  self: SelfView
}) {
  const me = table.players.find((p) => p.id === self.playerId)

  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 pt-[max(0.75rem,var(--inset-top))]">
        {me ? (
          <PlayerChip player={me} />
        ) : (
          <span className="label">Joining</span>
        )}
        <div className="flex items-center gap-3">
          {table.phase !== 'lobby' && (
            <span className="label">
              Round <span className="mono text-paper!">{table.round}</span>
            </span>
          )}
          <span className="label mono text-ash-bright!" translate="no">
            {table.code}
          </span>
        </div>
      </header>

      {snapshot.status !== 'connected' && (
        <p role="status" className="m-0 bg-paper px-4 py-2 text-center text-sm font-bold text-ink">
          {snapshot.notice ?? 'Reconnecting…'}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <h1 className="sr-only">{headingFor(table, self)}</h1>
        {table.phase === 'lobby' && <PhoneLobby table={table} self={self} client={client} />}
        {table.phase === 'writing' && <PhoneWriting snapshot={snapshot} table={table} self={self} client={client} />}
        {table.phase === 'judging' && <PhoneJudging table={table} self={self} client={client} />}
        {table.phase === 'roundEnd' && <PhoneRoundEnd table={table} self={self} client={client} />}
        {table.phase === 'gameOver' && <PhoneGameOver table={table} self={self} client={client} />}
      </div>
    </>
  )
}

/** What this screen is asking of this particular player. */
function headingFor(table: TableView, self: SelfView): string {
  switch (table.phase) {
    case 'lobby':
      return `Waiting to start at table ${table.code.split('').join(' ')}.`
    case 'writing':
      if (self.isCzar) return `Round ${table.round}. You are the Card Czar. Read the card out.`
      return self.submitted
        ? `Round ${table.round}. Your cards are in.`
        : `Round ${table.round}. Pick your answer.`
    case 'judging':
      return self.isCzar
        ? `Round ${table.round}. Read the answers out and pick the funniest.`
        : `Round ${table.round}. The Card Czar is choosing.`
    case 'roundEnd':
      return `Round ${table.round} is over.`
    case 'gameOver':
      return 'The game is over.'
  }
}

function PhoneLobby({
  table,
  self,
  client,
}: {
  table: TableView
  self: SelfView
  client: Client | null
}) {
  const ready = table.players.filter((p) => p.connected).length
  const short = MIN_PLAYERS - ready

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 py-6 pb-[max(1.5rem,var(--inset-bottom))]">
      <div>
        <h2 className="m-0 text-2xl font-extrabold tracking-[-0.02em]">You’re in.</h2>
        <p className="m-0 mt-1 text-ash-bright">
          {short > 0
            ? `${short} more ${short === 1 ? 'player' : 'players'} before the game can start.`
            : self.isHost
              ? 'Start when everyone has a seat.'
              : 'Waiting for the first player to start it.'}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {table.players.map((player) => (
          <li key={player.id} className="flex items-center justify-between gap-3">
            <PlayerChip player={player} showScore={false} />
            {self.isHost && player.id !== self.playerId && (
              <ConfirmButton
                label="Remove"
                confirmLabel="Tap again"
                onConfirm={() => client?.send({ type: 'kick', playerId: player.id })}
                className="label min-h-11 cursor-pointer px-2 hover:text-danger!"
                armedClassName="text-danger!"
              />
            )}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-4">
        {self.isHost ? (
          <>
            <DeckChoice
              value={table.deck}
              counts={table.deckCounts}
              onChange={(deck) => client?.send({ type: 'setOptions', deck })}
            />
            <label className="flex cursor-pointer items-start gap-3 text-sm text-ash-bright">
              <input
                type="checkbox"
                checked={table.rando}
                onChange={(event) => client?.send({ type: 'setOptions', rando: event.target.checked })}
                className="mt-0.5 h-5 w-5 accent-white"
              />
              Deal in Rando Cardrissian: a random card plays every round. If it wins,
              everyone should feel bad.
            </label>
            <Button disabled={short > 0} onClick={() => client?.send({ type: 'start' })}>
              {short > 0 ? `Need ${short} more` : 'Start the game'}
            </Button>
          </>
        ) : (
          <p className="m-0 text-sm text-ash">
            {table.deck === 'family' ? 'Family deck' : 'Full deck'}: {table.deckCounts.white} white
            cards, {table.deckCounts.black} black.
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Playing a card ─────────────────────────────────────────── */

function PhoneWriting({
  snapshot,
  table,
  self,
  client,
}: {
  snapshot: ClientSnapshot
  table: TableView
  self: SelfView
  client: Client | null
}) {
  const [picked, setPicked] = useState<string[]>([])
  const need = table.black?.p ?? 1

  // A new round means a new hand and a clean slate.
  useEffect(() => {
    setPicked([])
    client?.clearMoveError()
  }, [table.round, client])

  if (self.isCzar) {
    return (
      <CzarWaiting table={table} />
    )
  }

  if (self.submitted) {
    return (
      <div className="flex flex-1 flex-col gap-5 px-5 py-6">
        <p className="label">Handed in. Waiting for everyone else</p>
        <ul className="flex flex-col gap-3">
          {self.submitted.map((card, index) => (
            <li key={index}>
              <WhiteCard
                text={card}
                scale="1.1rem"
                className="min-h-24 p-4"
                footer={
                  need > 1 ? (
                    <span className="label text-xs! text-ash-ink!">{index + 1}</span>
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
        {table.waitingOn.length > 0 && (
          <p className="m-0 text-sm text-ash">Still to play: {table.waitingOn.join(', ')}.</p>
        )}
      </div>
    )
  }

  const toggle = (index: number) => {
    const key = `${index}`
    setPicked((current) => {
      const at = current.indexOf(key)
      if (at !== -1) return current.filter((k) => k !== key)
      if (current.length >= need) return [...current.slice(1), key]
      return [...current, key]
    })
    client?.clearMoveError()
  }

  const play = () => {
    const cards = picked.map((key) => self.hand[Number(key)])
    client?.send({ type: 'play', cards })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {table.black && (
        <div className="shrink-0 px-4 pt-4">
          <BlackCardFace
            card={table.black}
            fills={picked.map((key) => self.hand[Number(key)])}
            scale="1.25rem"
            className="min-h-32 p-4"
          />
        </div>
      )}

      <p className="label shrink-0 px-5 pt-4">
        {need > 1 ? `Pick ${need}, in the order they should be read` : 'Pick your answer'}
      </p>

      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
        {self.hand.map((card, index) => {
          const order = picked.indexOf(`${index}`)
          const isPicked = order !== -1
          return (
            <li key={`${index}-${card}`} className="pb-3">
              <button
                type="button"
                onClick={() => toggle(index)}
                aria-pressed={isPicked}
                className={
                  'block w-full cursor-pointer rounded-[14px] text-left transition-transform duration-150 ' +
                  'active:scale-[0.985] ' +
                  (isPicked ? 'translate-x-2' : '')
                }
              >
                <WhiteCard
                  text={card}
                  scale="1.15rem"
                  className={
                    'min-h-24 p-4 ' + (isPicked ? 'outline outline-[3px] outline-offset-[3px] outline-paper' : '')
                  }
                  footer={
                    isPicked ? (
                      <span className="mt-3 inline-grid h-7 w-7 place-items-center rounded-full bg-ink text-sm font-extrabold text-paper">
                        {need > 1 ? order + 1 : '✓'}
                        <span className="sr-only">
                          {need > 1 ? `chosen, position ${order + 1}` : 'chosen'}
                        </span>
                      </span>
                    ) : null
                  }
                />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="shrink-0 border-t border-line bg-ink px-4 pb-[max(1rem,var(--inset-bottom))] pt-3">
        {snapshot.moveError && (
          <p role="alert" className="m-0 mb-2 text-center text-sm font-bold text-danger">
            {snapshot.moveError}
          </p>
        )}
        <Button className="w-full" disabled={picked.length !== need} onClick={play}>
          {picked.length === need ? 'Play it' : `Pick ${need - picked.length} more`}
        </Button>
      </div>
    </div>
  )
}

function CzarWaiting({ table }: { table: TableView }) {
  return (
    <div className="flex flex-1 flex-col gap-5 px-5 py-6">
      <p className="label">You’re the Card Czar. Read this out</p>
      {table.black && <BlackCardFace card={table.black} scale="1.5rem" className="min-h-48 p-5" />}
      <p className="m-0 text-ash-bright">
        {table.waitingOn.length > 0
          ? `Waiting on ${table.waitingOn.join(', ')}.`
          : 'Everyone has played. Shuffling them for you.'}
      </p>
    </div>
  )
}

/* ── Judging ────────────────────────────────────────────────── */

function PhoneJudging({
  table,
  self,
  client,
}: {
  table: TableView
  self: SelfView
  client: Client | null
}) {
  const [candidate, setCandidate] = useState<string | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => setCandidate(null), [table.round])

  if (!self.isCzar) {
    return (
      <div className="flex flex-1 flex-col gap-5 px-5 py-6">
        <p className="label">The Czar is reading them out</p>
        {table.black && <BlackCardFace card={table.black} scale="1.25rem" className="min-h-32 p-4" />}
        {self.submitted && (
          <>
            <p className="label">Yours</p>
            <ul className="flex flex-col gap-3">
              {self.submitted.map((card, index) => (
                <li key={index}>
                  <WhiteCard text={card} scale="1.1rem" className="min-h-24 p-4" />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }

  const left = table.submissionCount - table.revealed.length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-4 pt-4">
        {table.black && (
          <BlackCardFace
            card={table.black}
            fills={table.revealed.at(-1)?.cards}
            scale="1.25rem"
            className="min-h-32 p-4"
          />
        )}
      </div>

      {!table.allRevealed ? (
        <div className="flex flex-1 flex-col justify-center gap-6 px-5 py-6">
          <p className="m-0 text-center text-ash-bright">
            {table.revealed.length} of {table.submissionCount} read out.
          </p>
          <Button className="w-full" onClick={() => client?.send({ type: 'reveal' })}>
            {table.revealed.length === 0 ? 'Turn the first one over' : `Next one (${left} left)`}
          </Button>
        </div>
      ) : (
        <>
          <p className="label shrink-0 px-5 pt-4">Pick the funniest</p>
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
            {table.revealed.map((submission) => {
              const chosen = candidate === submission.playerId
              return (
                <li key={submission.playerId} className="pb-7">
                  <button
                    type="button"
                    onClick={() => setCandidate(chosen ? null : submission.playerId)}
                    aria-pressed={chosen}
                    aria-label={
                      table.black
                        ? blackCardSentence(table.black, submission.cards)
                        : submission.cards.join(' ')
                    }
                    className={
                      'block w-full cursor-pointer rounded-[18px] text-left transition-transform ' +
                      'duration-150 active:scale-[0.985] ' + (chosen ? 'translate-x-2' : '')
                    }
                  >
                    {/* One play, however many cards it took: the group is what
                        gets picked, so the group is what carries the outline. */}
                    <div
                      className={
                        'flex flex-col gap-1.5 rounded-[18px] ' +
                        (chosen ? 'outline outline-[3px] outline-offset-[5px] outline-paper' : '')
                      }
                    >
                      {submission.cards.map((card, index) => (
                        <WhiteCard
                          key={index}
                          text={card}
                          scale="1.15rem"
                          className="min-h-24 p-4"
                          footer={
                            submission.cards.length > 1 ? (
                              <span className="label text-[0.55em]! text-ash-ink!">{index + 1}</span>
                            ) : null
                          }
                        />
                      ))}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="shrink-0 border-t border-line bg-ink px-4 pb-[max(1rem,var(--inset-bottom))] pt-3">
            <AnimatePresence initial={false}>
              {candidate && (
                <motion.div
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                >
                  <Button
                    className="w-full"
                    onClick={() => client?.send({ type: 'choose', playerId: candidate })}
                  >
                    Give them the point
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            {!candidate && (
              <p className="m-0 py-4 text-center text-sm text-ash">
                Tap a card, then confirm. Nothing is final until you confirm.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Between rounds ─────────────────────────────────────────── */

function PhoneRoundEnd({
  table,
  self,
  client,
}: {
  table: TableView
  self: SelfView
  client: Client | null
}) {
  const isRando = table.winnerId === RANDO_ID
  const winner = table.players.find((p) => p.id === table.winnerId)
  const youWon = table.winnerId === self.playerId

  return (
    <div className="flex flex-1 flex-col gap-5 px-5 py-6 pb-[max(1.5rem,var(--inset-bottom))]">
      <p className="label">{youWon ? 'You took the round' : 'Round over'}</p>
      {table.black && (
        <BlackCardFace
          card={table.black}
          fills={table.winningCards ?? []}
          scale="1.35rem"
          className="min-h-44 p-5"
        />
      )}
      <p className="m-0 flex items-center gap-2 text-lg font-extrabold">
        {winner && !isRando && <PlayerDot player={winner} />}
        {isRando ? 'Rando Cardrissian wins it.' : `${winner?.name ?? 'Nobody'} takes the point.`}
      </p>
      {(self.isCzar || self.isHost) && (
        <Button className="mt-auto w-full" onClick={() => client?.send({ type: 'nextRound' })}>
          Next round
        </Button>
      )}
    </div>
  )
}

function PhoneGameOver({
  table,
  self,
  client,
}: {
  table: TableView
  self: SelfView
  client: Client | null
}) {
  const ranked = [...table.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  const champion = ranked[0]
  const youWon = champion?.id === self.playerId

  return (
    <div className="flex flex-1 flex-col gap-6 px-5 py-6 pb-[max(1.5rem,var(--inset-bottom))]">
      <div>
        <p className="label">Game over</p>
        <h2 className="m-0 mt-2 text-3xl font-extrabold tracking-[-0.03em]">
          {youWon ? 'You won.' : `${champion?.name ?? 'Nobody'} won.`}
        </h2>
      </div>
      <ol className="flex flex-col">
        {ranked.map((player, index) => (
          <li
            key={player.id}
            className="flex items-center gap-3 border-b border-line py-3 last:border-b-0"
          >
            <span className="mono w-[2ch] shrink-0 tabular-nums text-ash">{index + 1}</span>
            <PlayerChip player={player} />
          </li>
        ))}
      </ol>
      {self.isHost && (
        <Button className="mt-auto w-full" onClick={() => client?.send({ type: 'playAgain' })}>
          Play again
        </Button>
      )}
    </div>
  )
}
