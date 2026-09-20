/**
 * Where you are, kept in the browser's own history.
 *
 * The app is one page with no router, so without this the Back button — and
 * the back gesture, which on a phone is very easy to trigger by accident —
 * left the site entirely from wherever you happened to be. Every screen now
 * puts an entry on the stack, so Back walks back through the app.
 *
 * The state lives in `history.state` rather than in the URL. The only thing
 * worth having in the address bar is the table code, because that is what
 * gets scanned and shared; nobody needs a link to the settings menu.
 */

export type Mode =
  'home' | 'local' | 'tv' | 'join' | 'online' | 'private' | 'public' | 'hostPrivate' | 'hostPublic'

export interface Nav {
  mode: Mode
  /** The table code, for the join screen. */
  code: string
  /** A line explaining how you got here, shown above the form. */
  hint?: string
  /** On the join screen: are you at the table, or still filling the form? */
  seated: boolean
  /** How many entries this app has pushed, so it can unwind to the start. */
  depth: number
}

/** A code in the address bar means a QR scan or a shared link. */
export function codeFromUrl(): string {
  const raw = new URLSearchParams(location.search).get('r') ?? ''
  return raw
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 4)
}

/** Where a fresh page load starts. */
export function openingNav(): Nav {
  const code = codeFromUrl()
  return { mode: code ? 'join' : 'home', code, seated: false, depth: 0 }
}

function isNav(value: unknown): value is Nav {
  return Boolean(value && typeof value === 'object' && 'mode' in value && 'depth' in value)
}

/** What the browser currently thinks we are looking at. */
export function currentNav(): Nav {
  return isNav(history.state) ? history.state : openingNav()
}

/** Writes the opening entry, so entry zero has something to come back to. */
export function startNav(nav: Nav): void {
  history.replaceState(nav, '')
}

/**
 * Moves forward a screen. `url` is only passed when the address bar itself
 * has to change — joining a table puts the code in it so a reload rejoins,
 * and going home takes it back out.
 */
export function pushNav(next: Omit<Nav, 'depth'>, url?: string): Nav {
  const nav: Nav = { ...next, depth: currentNav().depth + 1 }
  history.pushState(nav, '', url)
  return nav
}

/** Changes the current screen without adding to the stack. */
export function replaceNav(next: Omit<Nav, 'depth'>, url?: string): Nav {
  const nav: Nav = { ...next, depth: currentNav().depth }
  history.replaceState(nav, '', url)
  return nav
}

/**
 * Unwinds to where this app started, in one go, so that leaving a table does
 * not leave a trail of dead screens behind the Back button. Returns false
 * when there is nothing to unwind — a link straight into a table — and the
 * caller should push instead.
 */
export function unwindNav(): boolean {
  const { depth } = currentNav()
  if (depth <= 0) return false
  history.go(-depth)
  return true
}

/** Calls back whenever the browser moves through the stack. */
export function onNav(listen: (nav: Nav) => void): () => void {
  const handle = (event: PopStateEvent) => {
    listen(isNav(event.state) ? event.state : openingNav())
  }
  addEventListener('popstate', handle)
  return () => removeEventListener('popstate', handle)
}
