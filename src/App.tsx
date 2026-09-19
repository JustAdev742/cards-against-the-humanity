import { Suspense, lazy, useCallback, useState } from 'react'

import { unlockAudio } from './audio/sfx.ts'
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

type Mode =
  | 'home'
  | 'local'
  | 'tv'
  | 'join'
  | 'online'
  | 'private'
  | 'public'
  | 'hostPrivate'
  | 'hostPublic'

/** A code in the address bar means a QR scan or a shared link: go and join. */
function codeFromUrl(): string {
  const raw = new URLSearchParams(location.search).get('r') ?? ''
  return raw.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4)
}

/**
 * Shown while a screen's chunk arrives. Brief, but it is a real page state,
 * so it carries the same landmark and heading as any other.
 */
function Loading() {
  return (
    <main className="grid h-dvh place-items-center">
      <h1 className="sr-only">Cards Against The Humanity</h1>
      <CardMark className="w-10 animate-pulse text-ash" />
      <p className="sr-only" role="status">
        Loading…
      </p>
    </main>
  )
}

export function App() {
  const initialCode = codeFromUrl()
  const [joinCode, setJoinCode] = useState(initialCode)
  const [joinHint, setJoinHint] = useState<string | undefined>(undefined)
  const [mode, setMode] = useState<Mode>(initialCode ? 'join' : 'home')

  const goHome = useCallback(() => {
    // Drop the room code so "Back" does not bounce straight into joining again.
    if (location.search) history.replaceState(null, '', location.pathname)
    setJoinCode('')
    setJoinHint(undefined)
    setMode('home')
  }, [])

  // Browsers only allow sound after a gesture. Opening a table is that
  // gesture, so the table can make noise from the moment it appears.
  const open = useCallback((next: Mode) => {
    unlockAudio()
    setMode(next)
  }, [])

  const joinWith = useCallback(
    (code: string) => {
      setJoinCode(code)
      setJoinHint('Found a table with people at it. Pick a name and sit down.')
      open('join')
    },
    [open],
  )

  return (
    <Suspense fallback={<Loading />}>
      {mode === 'home' && (
        <Home onLocal={() => setMode('local')} onOnline={() => setMode('online')} />
      )}

      {mode === 'local' && (
        <LocalMenu onHost={() => open('tv')} onJoin={() => open('join')} onBack={goHome} />
      )}
      {mode === 'tv' && <Tv onExit={goHome} />}
      {mode === 'join' && <Phone initialCode={joinCode} hint={joinHint} onExit={goHome} />}

      {mode === 'online' && (
        <OnlineMenu
          onPrivate={() => setMode('private')}
          onPublic={() => setMode('public')}
          onBack={goHome}
        />
      )}
      {mode === 'private' && (
        <PrivateMenu
          onCreate={() => open('hostPrivate')}
          onJoin={() => open('join')}
          onBack={() => setMode('online')}
        />
      )}
      {mode === 'public' && (
        <PublicSearch
          onFound={joinWith}
          onHost={() => open('hostPublic')}
          onBack={() => setMode('online')}
        />
      )}
      {mode === 'hostPrivate' && <HostedTable visibility="private" onExit={goHome} />}
      {mode === 'hostPublic' && <HostedTable visibility="public" onExit={goHome} />}
    </Suspense>
  )
}
