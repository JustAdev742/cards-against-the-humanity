import { useEffect, useMemo, useRef, useState } from 'react'

import { createClient, type Client, type ClientSnapshot } from './client.ts'
import { createHost, type Host, type HostSnapshot } from './host.ts'

/* ── Who this phone is ──────────────────────────────────────────
   A player id lives in localStorage so a reload, a locked screen or a
   dropped connection all come back to the same seat. */

const ID_KEY = 'cath.playerId'
const NAME_KEY = 'cath.name'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* Private browsing. The seat just will not survive a reload. */
  }
}

export function playerId(): string {
  const existing = read(ID_KEY)
  if (existing) return existing
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `p-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
  write(ID_KEY, id)
  return id
}

export const rememberedName = () => read(NAME_KEY) ?? ''
export const rememberName = (name: string) => write(NAME_KEY, name)

/* ── Hosting a table (the TV) ───────────────────────────────── */

export function useHost(options: { targetScore: number; rando: boolean }) {
  const [snapshot, setSnapshot] = useState<HostSnapshot | null>(null)
  const hostRef = useRef<Host | null>(null)
  // Read once: the TV picks up later option changes through host.setOptions.
  const initial = useRef(options)

  useEffect(() => {
    const host = createHost(initial.current, setSnapshot)
    hostRef.current = host
    return () => {
      host.destroy()
      hostRef.current = null
    }
  }, [])

  return { snapshot, host: hostRef.current }
}

/* ── Joining a table (a phone) ──────────────────────────────── */

export function useClient(code: string | null, name: string) {
  const id = useMemo(playerId, [])
  const [snapshot, setSnapshot] = useState<ClientSnapshot | null>(null)
  const clientRef = useRef<Client | null>(null)

  useEffect(() => {
    if (!code || !name) return
    const client = createClient(code, id, name, setSnapshot)
    clientRef.current = client
    return () => {
      client.destroy()
      clientRef.current = null
      setSnapshot(null)
    }
  }, [code, name, id])

  return { snapshot, client: clientRef.current, playerId: id }
}

/** Keeps a phone awake while it is someone's hand of cards. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen')
      } catch {
        /* Denied, or the tab is in the background. Not worth surfacing. */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) void request()
    }

    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
    }
  }, [active])
}
