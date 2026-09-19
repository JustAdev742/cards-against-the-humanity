import Peer, { type DataConnection } from 'peerjs'

import { CONNECTION_HELP, peerOptions } from './peer.ts'
import {
  HOST_TIMEOUT_MS,
  PING_EVERY_MS,
  peerIdForRoom,
  type ClientMessage,
  type SelfView,
  type ServerMessage,
  type TableView,
} from './protocol.ts'

export type ClientStatus = 'connecting' | 'connected' | 'reconnecting' | 'rejected' | 'error'

export interface ClientSnapshot {
  status: ClientStatus
  table: TableView | null
  self: SelfView | null
  /** A message about the connection itself — shown as a banner. */
  notice: string | null
  /** A message about the last move — shown next to the hand, then cleared. */
  moveError: string | null
}

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

  /** Stops talking to a connection we are about to give up on. */
  function stopTimers() {
    if (heartbeat) clearInterval(heartbeat)
    if (watchdog) clearInterval(watchdog)
    heartbeat = null
    watchdog = null
  }

  const snapshot: ClientSnapshot = {
    status: 'connecting',
    table: null,
    self: null,
    notice: null,
    moveError: null,
  }

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
      })

      connection.on('data', (raw) => {
        const message = raw as ServerMessage
        lastHeard = Date.now()
        switch (message.type) {
          case 'pong':
            return
          case 'welcome':
            snapshot.self = message.self
            snapshot.table = message.table
            snapshot.status = 'connected'
            snapshot.notice = null
            break
          case 'table':
            snapshot.table = message.table
            break
          case 'self':
            snapshot.self = message.self
            break
          case 'error':
            snapshot.moveError = message.message
            break
          case 'rejected':
            snapshot.status = 'rejected'
            snapshot.notice =
              message.reason === 'full'
                ? 'That table is full. Ten players is the limit.'
                : 'Someone at this table already goes by that name. Pick another.'
            break
        }
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
