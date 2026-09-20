import { Suspense, lazy, useCallback, useEffect, useState } from 'react'

import { unlockAudio } from './audio/sfx.ts'
import {
  currentNav,
  onNav,
  pushNav,
  replaceNav,
  startNav,
  unwindNav,
  type Mode,
  type Nav,
} from './nav.ts'
import { Home, LocalMenu } from './screens/Home.tsx'
import { CardMark } from './ui/Card.tsx'

// The TV pulls in a QR encoder, a seat pulls in a peer stack, and the online
// screens pull in both. None of it belongs in the bundle someone downloads
// just to read the front page.
const Tv = lazy(() => import('./screens/Tv.tsx').then((m) => ({ default: m.Tv })))
const Phone = lazy(() => import('./screens/Phone.tsx').then((m) => ({ default: m.Phone })))
const OnlineMenu = lazy(() =>
  import('./screens/Online.tsx').then((m) => ({ default: m.OnlineMenu })),
)
const PrivateMenu = lazy(() =>
  import('./screens/Online.tsx').then((m) => ({ default: m.PrivateMenu })),
)
const PublicSearch = lazy(() =>
  import('./screens/Online.tsx').then((m) => ({ default: m.PublicSearch })),
)
const HostedTable = lazy(() =>
  import('./screens/Online.tsx').then((m) => ({ default: m.HostedTable })),
)

/**
 * Shown while a screen's chunk arrives.
 *
 * Deliberately not a <main>: React keeps the screen being replaced mounted
 * while the fallback shows, so making this a landmark too gave the page two
 * of them on every transition. A moment with none is the better trade, and
 * it announces itself as a status either way.
 */
function Loading() {
  return (
    <div className="grid h-dvh place-items-center" role="status">
      <CardMark className="w-10 animate-pulse text-ash" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

const withoutCode = () => location.pathname
const withCode = (code: string) => `${location.pathname}?r=${code}`

export function App() {
  // currentNav, not openingNav: a reload restores history.state, and starting
  // from a fresh guess instead left React saying "at the form" while history
  // said "at the table" — so the phone never sat back down.
  const [nav, setNav] = useState<Nav>(() => currentNav())

  // The opening entry needs state of its own, or the first Back lands on an
  // entry the app cannot describe.
  useEffect(() => {
    startNav(currentNav())
    return onNav(setNav)
  }, [])

  /** Forward, to a screen that can be backed out of. */
  const go = useCallback((mode: Mode, extra: Partial<Nav> = {}) => {
    // Opening a table is the gesture browsers want before they play sound.
    unlockAudio()
    const here = currentNav()
    setNav(
      pushNav(
        { mode, code: extra.code ?? here.code, hint: extra.hint, seated: extra.seated ?? false },
        mode === 'join' && (extra.code ?? here.code)
          ? withCode(extra.code ?? here.code)
          : undefined,
      ),
    )
  }, [])

  /**
   * All the way out. Used by "End table" and by every screen's own way of
   * leaving, so backing out of a game does not leave the dead table sitting
   * one Back press away.
   */
  const goHome = useCallback(() => {
    if (unwindNav()) return
    // Nothing behind us: this page was opened on a link straight to a table.
    setNav(pushNav({ mode: 'home', code: '', seated: false }, withoutCode()))
  }, [])

  /** The join screen telling us whether it is at the table or still asking. */
  const setSeated = useCallback((seated: boolean, code: string) => {
    const here = currentNav()
    if (here.mode !== 'join' || here.seated === seated) return
    setNav(
      seated
        ? pushNav({ mode: 'join', code, seated: true }, withCode(code))
        : replaceNav({ mode: 'join', code, hint: here.hint, seated: false }, withCode(code)),
    )
  }, [])

  const joinWith = useCallback(
    (code: string) => {
      go('join', { code, hint: 'Found a table with people at it. Pick a name and sit down.' })
    },
    [go],
  )

  const back = useCallback(() => history.back(), [])

  return (
    <Suspense fallback={<Loading />}>
      {nav.mode === 'home' && <Home onLocal={() => go('local')} onOnline={() => go('online')} />}

      {nav.mode === 'local' && (
        <LocalMenu onHost={() => go('tv')} onJoin={() => go('join')} onBack={back} />
      )}
      {nav.mode === 'tv' && <Tv onExit={goHome} />}
      {nav.mode === 'join' && (
        <Phone
          initialCode={nav.code}
          hint={nav.hint}
          seated={nav.seated}
          onSeated={setSeated}
          onExit={back}
        />
      )}

      {nav.mode === 'online' && (
        <OnlineMenu onPrivate={() => go('private')} onPublic={() => go('public')} onBack={back} />
      )}
      {nav.mode === 'private' && (
        <PrivateMenu onCreate={() => go('hostPrivate')} onJoin={() => go('join')} onBack={back} />
      )}
      {nav.mode === 'public' && (
        <PublicSearch onFound={joinWith} onHost={() => go('hostPublic')} onBack={back} />
      )}
      {nav.mode === 'hostPrivate' && <HostedTable visibility="private" onExit={goHome} />}
      {nav.mode === 'hostPublic' && <HostedTable visibility="public" onExit={goHome} />}
    </Suspense>
  )
}
