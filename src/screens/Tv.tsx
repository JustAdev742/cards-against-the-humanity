import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import QRCode from 'qrcode'

import {
  sfxCardFlip,
  sfxCardPlayed,
  sfxDeal,
  sfxGameOver,
  sfxJoin,
  sfxWinner,
} from '../audio/sfx.ts'
import { useMusic, type Music } from '../audio/useMusic.ts'
import { MIN_PLAYERS, RANDO_ID } from '../game/types.ts'
import { useHost } from '../net/hooks.ts'
import type { TableView } from '../net/protocol.ts'
import { BlackCardFace, CardBack, CardMark, WhiteCard } from '../ui/Card.tsx'
import { Button } from '../ui/Button.tsx'
import { ConfirmButton } from '../ui/ConfirmButton.tsx'
import { DeckChoice } from '../ui/DeckChoice.tsx'
import { PlayerChip, PlayerDot, playerColor } from '../ui/PlayerChip.tsx'
import { MuteButton, SoundControls } from '../ui/SoundControls.tsx'
import { TargetScore } from '../ui/TargetScore.tsx'

/** How long the winning card stays up before the next round deals. */
const WINNER_DWELL_MS = 7000

export function Tv({ onExit }: { onExit: () => void }) {
  const { snapshot, host } = useHost({ targetScore: 7, rando: false })
  const music = useMusic()

  // The click that opened the table counts as the gesture browsers want
  // before they will play sound, so the track can start as soon as it loads.
  useEffect(() => {
    if (music.available && !music.playing) music.start()
  }, [music])

  if (!snapshot) return <TvMessage title="Setting the table" detail="Opening a room…" />
  if (snapshot.status === 'error') {
    return (
      <TvMessage title="Could not open a table" detail={snapshot.error ?? 'Unknown problem.'}>
        <Button onClick={() => location.reload()}>Try again</Button>
      </TvMessage>
    )
  }
  if (snapshot.status !== 'open') {
    return <TvMessage title="Setting the table" detail="Reaching the matchmaking service…" />
  }

  return <TvTable table={snapshot.table} host={host} music={music} onExit={onExit} />
}

function TvTable({
  table,
  host,
  music,
  onExit,
}: {
  table: TableView
  host: ReturnType<typeof useHost>['host']
  music: Music
  onExit: () => void
}) {
  // The winning card holds the screen for a beat, then the next round deals.
  useEffect(() => {
    if (table.phase !== 'roundEnd') return
    const timer = setTimeout(() => host?.nextRound(), WINNER_DWELL_MS)
    return () => clearTimeout(timer)
  }, [table.phase, table.round, host])

  // Sound follows the table rather than the clicks, so it fires for whatever
  // the phones did, not just for what happened on this screen.
  const previous = useRef({ phase: table.phase, played: 0, revealed: 0, players: 0 })
  useEffect(() => {
    const was = previous.current
    const revealed = table.revealed.length

    if (table.phase === 'lobby' && table.players.length > was.players) sfxJoin()
    if (table.phase === 'writing' && was.phase !== 'writing') sfxDeal()
    if (table.phase === 'writing' && table.submissionCount > was.played) sfxCardPlayed()
    if (table.phase === 'judging' && revealed > was.revealed) sfxCardFlip()
    if (table.phase === 'roundEnd' && was.phase !== 'roundEnd') {
      sfxWinner()
      music.duck(4)
    }
    if (table.phase === 'gameOver' && was.phase !== 'gameOver') {
      sfxGameOver()
      music.duck(6)
    }

    previous.current = {
      phase: table.phase,
      played: table.submissionCount,
      revealed,
      players: table.players.length,
    }
  }, [table, music])

  // A TV is usually driven by a remote or a stray keyboard, not a mouse.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
      if (event.key === 'm' || event.key === 'M') music.toggleMuted()
      if (event.key === 'Enter' && table.phase === 'lobby') host?.startGame()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [music, host, table.phase])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ink">
      <TopRail table={table} music={music} onExit={onExit} />

      <main className="relative min-h-0 flex-1">
        {/* The TV shows no visible heading — a heading would be furniture on
            a screen people glance at. Screen readers still get one. */}
        <h1 className="sr-only">{headingFor(table)}</h1>
        <AnimatePresence mode="wait">
          <motion.div
            key={table.phase === 'writing' || table.phase === 'judging' ? 'round' : table.phase}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            {table.phase === 'lobby' && <Lobby table={table} host={host} music={music} />}
            {(table.phase === 'writing' || table.phase === 'judging') && <Round table={table} />}
            {table.phase === 'roundEnd' && <Winner table={table} />}
            {table.phase === 'gameOver' && <GameOver table={table} host={host} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {table.phase !== 'lobby' && <BottomRail table={table} />}
    </div>
  )
}

/** What this screen is, for anyone who cannot see it. */
function headingFor(table: TableView): string {
  const winner = table.players.find((p) => p.id === table.winnerId)?.name ?? 'Rando Cardrissian'
  switch (table.phase) {
    case 'lobby':
      return `Cards Against The Humanity. Join this table with the code ${table.code
        .split('')
        .join(' ')}.`
    case 'writing':
      return `Round ${table.round}. Everyone is picking a card.`
    case 'judging':
      return `Round ${table.round}. The Card Czar is reading the answers out.`
    case 'roundEnd':
      return `${winner} wins round ${table.round}.`
    case 'gameOver':
      return `${winner} wins the game.`
  }
}

/* ── Rails ──────────────────────────────────────────────────── */

function TopRail({
  table,
  music,
  onExit,
}: {
  table: TableView
  music: Music
  onExit: () => void
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-6 border-b border-line px-[3vw] py-[1.4vh]">
      <div className="flex items-baseline gap-[1.6vw]">
        {table.phase !== 'lobby' && (
          <>
            <span className="label text-[min(1.2vw,1rem)]!">Round</span>
            <span className="mono text-[min(2vw,1.7rem)] font-medium tabular-nums">
              {table.round}
            </span>
            <span className="label text-[min(1.2vw,1rem)]!">First to {table.targetScore}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-[1.4vw]">
        <MuteButton music={music} className="w-[min(1.8vw,1.5rem)]" />
        <span className="label text-[min(1.1vw,0.9rem)]!">Cards Against The Humanity</span>
        <CardMark className="w-[min(1.6vw,1.4rem)] text-ash" />
        <ConfirmButton
          label="End table"
          confirmLabel="Tap again to end it"
          onConfirm={onExit}
          className="label cursor-pointer text-[min(1vw,0.8rem)]! hover:text-paper!"
          armedClassName="text-danger!"
        />
      </div>
    </header>
  )
}

function BottomRail({ table }: { table: TableView }) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-[2vw] border-t border-line px-[3vw] py-[1.4vh]">
      <ul className="flex min-w-0 flex-wrap items-center gap-x-[1.8vw] gap-y-2">
        {table.players.map((player) => (
          <li key={player.id} className="text-[min(1.5vw,1.25rem)]">
            <PlayerChip player={player} />
          </li>
        ))}
        {table.rando && (
          <li className="flex items-center gap-2 text-[min(1.5vw,1.25rem)] text-ash">
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full border-2 border-line text-xs font-extrabold">
              R
            </span>
            <span className="font-bold">Rando</span>
          </li>
        )}
      </ul>
      <p className="label m-0 shrink-0 text-[min(1.1vw,0.9rem)]!">
        Join at this table, code{' '}
        <span className="mono text-paper!" translate="no">
          {table.code}
        </span>
      </p>
    </footer>
  )
}

/* ── Lobby ──────────────────────────────────────────────────── */

function Lobby({
  table,
  host,
  music,
}: {
  table: TableView
  host: ReturnType<typeof useHost>['host']
  music: Music
}) {
  const qr = useJoinQr(table.code)
  const ready = table.players.filter((p) => p.connected).length
  const short = MIN_PLAYERS - ready

  return (
    <div className="grid h-full grid-cols-[1.05fr_1fr] gap-[3vw] px-[3vw] py-[3vh]">
      <section className="flex min-w-0 flex-col justify-center">
        <p className="label text-[min(1.3vw,1.1rem)]!">Everyone opens this page and types</p>
        <p
          className="mono m-0 mt-[1vh] leading-none tracking-[0.08em]"
          style={{ fontSize: 'min(17vw, 26vh)' }}
        >
          <span translate="no">{table.code}</span>
        </p>
        {/* The address people type. A project path can be long, so it breaks
            after the domain rather than shrinking to something nobody can read
            from a sofa, or wrapping mid-word. */}
        <p className="m-0 mt-[2.5vh] font-bold leading-[1.15] text-ash-bright">
          <span className="block text-[min(2vw,1.9rem)]">{joinAddress().host}</span>
          {joinAddress().path && (
            <span className="block text-[min(1.5vw,1.45rem)] text-ash">{joinAddress().path}</span>
          )}
        </p>
      </section>

      <section className="flex min-w-0 flex-col justify-center gap-[2vh]">
        <div className="flex items-start gap-[2vw]">
          {qr && (
            <img
              src={qr}
              width={512}
              height={512}
              alt={`QR code that opens this table, code ${table.code.split('').join(' ')}`}
              className="aspect-square w-[min(16vw,22vh)] shrink-0 rounded-xl bg-paper p-[0.8vw]"
            />
          )}
          <div className="min-w-0">
            <p className="label text-[min(1.3vw,1.1rem)]!">
              {ready} {ready === 1 ? 'player' : 'players'} in
            </p>
            <ul className="mt-[1.5vh] flex flex-col gap-[1.2vh]">
              <AnimatePresence initial={false}>
                {table.players.map((player) => (
                  <motion.li
                    key={player.id}
                    layout
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 14 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[min(2.2vw,2rem)]"
                  >
                    <PlayerChip player={player} showScore={false} size="lg" />
                  </motion.li>
                ))}
              </AnimatePresence>
              {table.players.length === 0 && (
                <li className="text-[min(1.7vw,1.4rem)] text-ash">Nobody yet.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-[2vw] border-t border-line pt-[2vh]">
          <DeckChoice
            size="tv"
            value={table.deck}
            counts={table.deckCounts}
            onChange={(deck) => host?.setOptions({ deck })}
          />
          <TargetScore
            value={table.targetScore}
            onChange={(targetScore) => host?.setOptions({ targetScore })}
          />
        </div>

        <div className="border-t border-line pt-[2vh]">
          <SoundControls music={music} />
        </div>

        <div className="border-t border-line pt-[2vh]">
          {short > 0 ? (
            <p className="m-0 text-[min(1.7vw,1.4rem)] font-bold text-ash-bright">
              {short} more {short === 1 ? 'player' : 'players'} and you can start.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={() => host?.startGame()} className="min-h-[6vh]! text-[min(1.6vw,1.3rem)]!">
                Start the game
              </Button>
              <p className="m-0 text-[min(1.3vw,1.05rem)] text-ash">
                The first player in can also start it from their phone.
              </p>
            </div>
          )}
          <label className="mt-[1.6vh] flex w-fit cursor-pointer items-center gap-3 text-[min(1.3vw,1.05rem)] text-ash-bright">
            <input
              type="checkbox"
              checked={table.rando}
              onChange={(event) => host?.setOptions({ rando: event.target.checked })}
              className="h-5 w-5 accent-white"
            />
            Deal Rando Cardrissian in: a random card plays every round.
          </label>
        </div>
      </section>
    </div>
  )
}

/* ── The round ──────────────────────────────────────────────── */

function Round({ table }: { table: TableView }) {
  const reduced = useReducedMotion()
  // While the Czar reads them out, the newest card face up is written into
  // the black card — the way it sounds when someone reads it at the table.
  const featured = table.revealed.at(-1)
  const waiting = table.phase === 'writing'

  return (
    <div className="grid h-full grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-[3vw] px-[3vw] py-[3vh]">
      <section className="flex min-h-0 items-center">
        {table.black && (
          <BlackCardFace
            card={table.black}
            fills={featured?.cards}
            scale="min(3.4vw, 5.6vh)"
            className="h-full max-h-[62vh] w-full p-[2.2vw]"
            footer={
              <span className="label text-[0.34em]! text-ash-bright!">
                {waiting ? 'Everyone answers' : 'The Card Czar reads'}
              </span>
            }
          />
        )}
      </section>

      <section className="flex min-h-0 flex-col justify-center">
        {waiting ? (
          <WaitingOn table={table} reduced={reduced} />
        ) : (
          <RevealedRow table={table} reduced={reduced} />
        )}
      </section>
    </div>
  )
}

function WaitingOn({ table, reduced }: { table: TableView; reduced: boolean | null }) {
  const handedIn = table.players.filter((p) => p.played)
  const owing = table.waitingOn

  return (
    <>
      <p className="label text-[min(1.3vw,1.1rem)]!">
        {table.submissionCount} in
        {owing.length > 0 && `. Still waiting on ${listNames(owing)}`}
        {owing.length === 0 && '. Handing them to the Czar'}
      </p>

      <ul className="mt-[3vh] flex flex-wrap gap-[1.2vw]">
        <AnimatePresence initial={false}>
          {handedIn.map((player, index) => (
            <motion.li
              key={player.id}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: -40, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: index % 2 ? 1.5 : -1.5 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
              <CardBack className="h-[22vh] w-[15vh] text-paper" />
              <span className="sr-only">{player.name} has played</span>
            </motion.li>
          ))}
        </AnimatePresence>
        {table.rando && (
          <li>
            <CardBack className="h-[22vh] w-[15vh] text-paper" />
          </li>
        )}
      </ul>

      {owing.length > 0 && (
        <ul className="mt-[3.5vh] flex flex-wrap gap-x-[1.8vw] gap-y-2">
          {table.players
            .filter((p) => !p.played && !p.isCzar && p.connected)
            .map((player) => (
              <li key={player.id} className="flex items-center gap-2 text-[min(1.6vw,1.35rem)] text-ash">
                <PlayerDot player={player} />
                <span className="font-bold">{player.name}</span>
              </li>
            ))}
        </ul>
      )}
    </>
  )
}

function RevealedRow({ table, reduced }: { table: TableView; reduced: boolean | null }) {
  const total = table.submissionCount
  const left = total - table.revealed.length
  // Three plays get big cards; nine get small ones. The row always fills the
  // space it has, so a small table is not reading postage stamps from a sofa.
  const columns = total <= 2 ? 2 : total <= 4 ? 2 : total <= 6 ? 3 : 4
  const width = `calc((100% - ${(columns - 1) * 1.2}vw) / ${columns})`

  return (
    <>
      <p className="label text-[min(1.3vw,1.1rem)]!">
        {left > 0
          ? `${table.revealed.length} of ${total} read out`
          : `All ${total} read. The Czar is choosing`}
      </p>

      {/* Perspective lives on the row so a revealed card reads as an object
          turning over, not a width animation. */}
      <ul
        className="mt-[2.5vh] flex flex-wrap items-stretch gap-[1.2vw]"
        style={{ perspective: '1400px' }}
      >
        {Array.from({ length: total }, (_, index) => {
          const submission = table.revealed[index]
          return (
            <li key={index} style={{ width }}>
              {submission ? (
                <motion.div
                  initial={reduced ? { opacity: 0 } : { rotateY: 180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformStyle: 'preserve-3d', transformOrigin: '50% 50%' }}
                  className="flex flex-col gap-[0.6vh]"
                >
                  {submission.cards.map((card, cardIndex) => (
                    <WhiteCard
                      key={cardIndex}
                      text={card}
                      scale={columns <= 2 ? 'min(2.1vw, 3.4vh)' : 'min(1.5vw, 2.5vh)'}
                      className="min-h-[13vh] p-[1vw]"
                      footer={
                        submission.cards.length > 1 ? (
                          <span className="label text-[0.5em]! text-ash-ink!">{cardIndex + 1}</span>
                        ) : null
                      }
                    />
                  ))}
                </motion.div>
              ) : (
                <CardBack className="h-full min-h-[22vh] w-full text-paper opacity-45" />
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

/* ── Winner ─────────────────────────────────────────────────── */

function Winner({ table }: { table: TableView }) {
  const reduced = useReducedMotion()
  const winner = table.players.find((p) => p.id === table.winnerId)
  const isRando = table.winnerId === RANDO_ID
  const name = isRando ? 'Rando Cardrissian' : (winner?.name ?? 'Nobody')

  return (
    <div className="flex h-full flex-col items-center justify-center gap-[3vh] px-[3vw] py-[3vh]">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="w-full max-w-[72vw]"
      >
        {table.black && (
          <BlackCardFace
            card={table.black}
            fills={table.winningCards ?? []}
            scale="min(3.6vw, 6vh)"
            className="w-full p-[2.4vw]"
          />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : 0.5 }}
        className="flex items-center gap-[1.2vw] text-[min(3vw,2.6rem)] font-extrabold tracking-[-0.02em]"
      >
        {winner && !isRando && <PlayerDot player={winner} size="lg" />}
        {isRando && (
          <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full border-2 border-paper text-base font-extrabold">
            R
          </span>
        )}
        <span>
          {name} {isRando ? 'wins the round. Everyone should feel bad.' : 'takes the point.'}
        </span>
      </motion.div>

      <p className="label text-[min(1.2vw,1rem)]!">Next round deals in a moment</p>
    </div>
  )
}

/* ── Game over ──────────────────────────────────────────────── */

function GameOver({ table, host }: { table: TableView; host: ReturnType<typeof useHost>['host'] }) {
  const ranked = [...table.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
  const champion = ranked[0]

  return (
    <div className="grid h-full grid-cols-[1fr_1fr] items-center gap-[4vw] px-[4vw] py-[4vh]">
      <section>
        <p className="label text-[min(1.3vw,1.1rem)]!">Winner</p>
        <div className="mt-[2vh] flex items-center gap-[1.5vw]">
          {champion && <PlayerDot player={champion} size="lg" />}
          <p
            className="m-0 leading-none tracking-[-0.035em]"
            style={{ fontSize: 'min(8vw, 14vh)', fontWeight: 900 }}
          >
            {champion?.name ?? '—'}
          </p>
        </div>
        <p className="m-0 mt-[2.5vh] text-[min(1.8vw,1.5rem)] text-ash-bright">
          {champion?.score} {champion?.score === 1 ? 'point' : 'points'} out of {table.targetScore}.
        </p>
        <div className="mt-[4vh] flex gap-4">
          <Button onClick={() => host?.playAgain()} className="min-h-[6vh]! text-[min(1.6vw,1.3rem)]!">
            Play again
          </Button>
        </div>
      </section>

      <section>
        <p className="label text-[min(1.3vw,1.1rem)]!">Final standings</p>
        <ol className="mt-[2vh] flex flex-col">
          {ranked.map((player, index) => (
            <li
              key={player.id}
              className="flex items-center gap-[1.2vw] border-b border-line py-[1.4vh] text-[min(2.2vw,2rem)] last:border-b-0"
            >
              <span className="mono w-[2ch] shrink-0 tabular-nums text-ash">{index + 1}</span>
              <PlayerDot player={player} size="lg" />
              <span className="min-w-0 flex-1 truncate font-bold">{player.name}</span>
              <span className="mono tabular-nums" style={{ color: playerColor(player.color) }}>
                {player.score}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

/* ── Odds and ends ──────────────────────────────────────────── */

function TvMessage({
  title,
  detail,
  children,
}: {
  title: string
  detail: string
  children?: React.ReactNode
}) {
  return (
    <div className="grid h-dvh place-items-center px-[6vw] text-center">
      <div>
        <CardMark className="mx-auto mb-6 w-10 text-ash" />
        <h1 className="m-0 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-[46ch] text-lg text-ash-bright">{detail}</p>
        {children && <div className="mt-8 flex justify-center">{children}</div>}
      </div>
    </div>
  )
}

/** The address players type, split so it can break after the domain. */
function joinAddress(): { host: string; path: string } {
  return { host: location.host, path: location.pathname.replace(/\/$/, '') }
}

function useJoinQr(code: string): string | null {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    const url = `${location.origin}${location.pathname}?r=${code}`
    QRCode.toDataURL(url, {
      margin: 0,
      scale: 10,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(setSrc)
      .catch(() => setSrc(null))
  }, [code])
  return src
}

function listNames(names: string[]): string {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}
