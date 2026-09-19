import { Suspense, lazy, useCallback, useState } from 'react'

import { unlockAudio } from './audio/sfx.ts'
import { Home } from './screens/Home.tsx'
import { CardMark } from './ui/Card.tsx'

// The TV pulls in a QR encoder and the phone pulls in a peer stack. Neither
// belongs in the bundle someone downloads just to read the front page.
const Tv = lazy(() => import('./screens/Tv.tsx').then((m) => ({ default: m.Tv })))
const Phone = lazy(() => import('./screens/Phone.tsx').then((m) => ({ default: m.Phone })))

type Mode = 'home' | 'tv' | 'phone'

/** A code in the address bar means a QR scan: go straight to joining. */
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
  const [mode, setMode] = useState<Mode>(initialCode ? 'phone' : 'home')

  const goHome = useCallback(() => {
    // Drop the room code so "Back" does not bounce straight into joining again.
    if (location.search) history.replaceState(null, '', location.pathname)
    setMode('home')
  }, [])

  // Browsers only allow sound after a gesture. This click is that gesture,
  // so the TV can make noise from the moment it opens.
  const hostTable = useCallback(() => {
    unlockAudio()
    setMode('tv')
  }, [])

  return (
    <Suspense fallback={<Loading />}>
      {mode === 'tv' && <Tv onExit={goHome} />}
      {mode === 'phone' && <Phone initialCode={initialCode} onExit={goHome} />}
      {mode === 'home' && <Home onHost={hostTable} onJoin={() => setMode('phone')} />}
    </Suspense>
  )
}
