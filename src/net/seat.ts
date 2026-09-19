import type { SelfView, ServerMessage, TableView } from './protocol.ts'

export type SeatStatus = 'connecting' | 'connected' | 'reconnecting' | 'rejected' | 'error'

export interface SeatSnapshot {
  status: SeatStatus
  table: TableView | null
  self: SelfView | null
  /** A message about the connection itself — shown as a banner. */
  notice: string | null
  /** A message about the last move — shown next to the hand, then cleared. */
  moveError: string | null
}

export function emptySeat(): SeatSnapshot {
  return { status: 'connecting', table: null, self: null, notice: null, moveError: null }
}

/**
 * Folds one message from the table into a seat's view of it. Shared by the
 * phone across a data channel and by the person running the table in the same
 * tab, so the two can never drift apart.
 */
export function applyServerMessage(snapshot: SeatSnapshot, message: ServerMessage): void {
  switch (message.type) {
    case 'pong':
      return
    case 'welcome':
      snapshot.self = message.self
      snapshot.table = message.table
      snapshot.status = 'connected'
      snapshot.notice = null
      return
    case 'table':
      snapshot.table = message.table
      return
    case 'self':
      snapshot.self = message.self
      return
    case 'error':
      snapshot.moveError = message.message
      return
    case 'rejected':
      snapshot.status = 'rejected'
      snapshot.notice =
        message.reason === 'full'
          ? 'That table is full. Ten players is the limit.'
          : 'Someone at this table already goes by that name. Pick another.'
  }
}
