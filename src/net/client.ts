import Peer, { type DataConnection } from 'peerjs'

import { CONNECTION_HELP, peerOptions } from './peer.ts'
import { applyServerMessage, emptySeat, type SeatSnapshot, type SeatStatus } from './seat.ts'
import {
  HOST_TIMEOUT_MS,
  PING_EVERY_MS,
  peerIdForRoom,
  type ClientMessage,
  type ServerMessage,
} from './protocol.ts'

export type ClientStatus = SeatStatus
export type ClientSnapshot = SeatSnapshot

const MAX_RETRIES = 8

/**
 * A phone. It holds no rules of its own: it sends what the player did and
 * draws whatever the TV sends back.
 */
export function createClient(
  code: string,
  playerId: string,
  name: string,
  onChange: (snapshot: ClientSnapshot) => void,
) {
  let peer: Peer | null = null
  let connection: DataConnection | null = null
  let destroyed = false
  let retries = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null
  let watchdog: ReturnType<typeof setInterval> | null = null
  let lastHeard = Date.now()
  let onVisible: (() => void) | null = null

  /** Stops talking to a connection we are about to give up on. */
  function stopTimers() {
    if (heartbeat) clearInterval(heartbeat)
    if (watchdog) clearInterval(watchdog)
    if (onVisible) document.removeEventListener('visibilitychange', onVisible)
    heartbeat = null
    watchdog = null
    onVisible = null
  }

  const snapshot: ClientSnapshot = emptySeat()

  const emit = () => onChange({ ...snapshot })

  function scheduleRetry(reason: string) {
    stopTimers()
    if (destroyed || snapshot.status === 'rejected') return
    if (retries >= MAX_RETRIES) {
      snapshot.status = 'error'
      snapshot.notice = `${reason} Reload to try again.`
      emit()
      return
    }
    // Back off gently so a flaky room wifi gets a chance to settle.
    const delay = Math.min(1000 * 2 ** retries, 8000)
    retries += 1
    snapshot.status = 'reconnecting'
    snapshot.notice = reason
    emit()
    retryTimer = setTimeout(connect, delay)
  }

  function connect() {
    if (destroyed) return
    peer?.destroy()
    peer = new Peer(peerOptions())

    peer.on('open', () => {
      if (destroyed || !peer) return
      connection = peer.connect(peerIdForRoom(code), { reliable: true })

      connection.on('open', () => {
        retries = 0
        lastHeard = Date.now()
        snapshot.status = 'connected'
        snapshot.notice = null
        emit()
        connection?.send({ type: 'hello', playerId, name } satisfies ClientMessage)

        // Say hello periodically so the table knows this phone is still in the
        // room, and watch for the table going quiet on us.
        stopTimers()
        heartbeat = setInterval(() => {
          if (connection?.open) connection.send({ type: 'ping' } satisfies ClientMessage)
        }, PING_EVERY_MS)
        watchdog = setInterval(() => {
          if (Date.now() - lastHeard > HOST_TIMEOUT_MS) scheduleRetry('Lost the table.')
        }, PING_EVERY_MS)

        // Coming back to the tab is the moment to prove this phone is still
        // here, before a sweep on the table decides otherwise.
        onVisible = () => {
          if (document.visibilityState !== 'visible') return
          lastHeard = Date.now()
          if (connection?.open) connection.send({ type: 'ping' } satisfies ClientMessage)
        }
        document.addEventListener('visibilitychange', onVisible)
      })

      connection.on('data', (raw) => {
        lastHeard = Date.now()
        applyServerMessage(snapshot, raw as ServerMessage)
        emit()
      })

      connection.on('close', () => scheduleRetry('Lost the table.'))
      connection.on('error', () => scheduleRetry('Lost the table.'))
    })

    peer.on('error', (err: Error & { type?: string }) => {
      scheduleRetry(CONNECTION_HELP[err.type ?? ''] ?? 'Could not reach the table.')
    })
    peer.on('disconnected', () => {
      if (!destroyed) peer?.reconnect()
    })
  }

  connect()
  emit()

  return {
    send(message: ClientMessage) {
      if (connection?.open) connection.send(message)
    },
    clearMoveError() {
      if (snapshot.moveError === null) return
      snapshot.moveError = null
      emit()
    },
    destroy() {
      destroyed = true
      stopTimers()
      if (retryTimer) clearTimeout(retryTimer)
      connection?.close()
      peer?.destroy()
    },
  }
}

export type Client = ReturnType<typeof createClient>
