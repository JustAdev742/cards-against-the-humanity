import Peer, { type DataConnection } from 'peerjs'

import { PUBLIC_CODES } from '../game/engine.ts'
import { peerOptions } from './peer.ts'
import { peerIdForRoom } from './protocol.ts'

/** How long to give one table to answer before moving on. */
const PROBE_MS = 4000
/** How many to knock on at once. All of them at once is a lot of WebRTC. */
const BATCH = 7

function shuffled<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Knocks on one reserved code and reports whether anybody is home. */
function knock(peer: Peer, code: string): Promise<string | null> {
  return new Promise((resolve) => {
    const target = peerIdForRoom(code)
    let connection: DataConnection | null = null
    let settled = false

    const finish = (found: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      peer.off('error', onPeerError)
      try {
        connection?.close()
      } catch {
        /* Already gone. */
      }
      resolve(found)
    }

    // PeerJS reports an unreachable id on the peer, not the connection, so
    // the id has to be matched out of the message.
    const onPeerError = (err: Error) => {
      if (err.message.includes(target)) finish(null)
    }
    const timer = setTimeout(() => finish(null), PROBE_MS)

    try {
      peer.on('error', onPeerError)
      connection = peer.connect(target, { reliable: true })
      connection.on('open', () => finish(code))
      connection.on('error', () => finish(null))
    } catch {
      finish(null)
    }
  })
}

export interface Search {
  /** The code of a table that answered, or null if nobody did. */
  result: Promise<string | null>
  cancel: () => void
}

/**
 * Looks for a public table with somebody already at it.
 *
 * There is no directory to ask, and no server to keep one, so the public
 * tables live on a handful of reserved codes and this knocks on them. A few
 * at a time, in a random order, so two people searching at the same moment
 * do not both pile into the same table.
 */
export function findPublicTable(onProgress?: (checked: number, total: number) => void): Search {
  let cancelled = false
  let peer: Peer | null = null

  const result = (async (): Promise<string | null> => {
    peer = new Peer(peerOptions())
    const ready = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 8000)
      peer!.on('open', () => {
        clearTimeout(timer)
        resolve(true)
      })
      peer!.on('error', () => {
        clearTimeout(timer)
        resolve(false)
      })
    })
    if (!ready || cancelled) return null

    const codes = shuffled(PUBLIC_CODES)
    let checked = 0
    for (let i = 0; i < codes.length && !cancelled; i += BATCH) {
      const batch = codes.slice(i, i + BATCH)
      const answers = await Promise.all(batch.map((code) => knock(peer!, code)))
      checked += batch.length
      onProgress?.(Math.min(checked, codes.length), codes.length)
      const found = answers.find((code): code is string => code !== null)
      if (found) return found
    }
    return null
  })().finally(() => {
    peer?.destroy()
  })

  return {
    result,
    cancel() {
      cancelled = true
      peer?.destroy()
    },
  }
}
