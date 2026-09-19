import { useCallback, useState } from 'react'

import { Home } from './screens/Home.tsx'
import { Phone } from './screens/Phone.tsx'
import { Tv } from './screens/Tv.tsx'

type Mode = 'home' | 'tv' | 'phone'

/** A code in the address bar means a QR scan: go straight to joining. */
function codeFromUrl(): string {
  const raw = new URLSearchParams(location.search).get('r') ?? ''
  return raw.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4)
}

export function App() {
  const initialCode = codeFromUrl()
  const [mode, setMode] = useState<Mode>(initialCode ? 'phone' : 'home')

  const goHome = useCallback(() => {
    // Drop the room code so "Back" does not bounce straight into joining again.
    if (location.search) history.replaceState(null, '', location.pathname)
    setMode('home')
  }, [])

  if (mode === 'tv') return <Tv onExit={goHome} />
  if (mode === 'phone') return <Phone initialCode={initialCode} onExit={goHome} />
  return <Home onHost={() => setMode('tv')} onJoin={() => setMode('phone')} />
}
