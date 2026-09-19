import type { Host } from './host.ts'
import type { ClientMessage } from './protocol.ts'
import { applyServerMessage, emptySeat, type SeatSnapshot } from './seat.ts'

/**
 * A seat at a table you are also running. Nothing goes near the network: the
 * message goes straight into the host in the same tab. The screen cannot tell
 * the difference, which is the point — one player UI serves both.
 */
export function createLocalClient(
  host: Host,
  playerId: string,
  name: string,
  onChange: (snapshot: SeatSnapshot) => void,
) {
  const snapshot = emptySeat()
  const emit = () => onChange({ ...snapshot })

  const pipe = host.joinHere((message) => {
    applyServerMessage(snapshot, message)
    emit()
  })

  pipe.send({ type: 'hello', playerId, name } satisfies ClientMessage)

  return {
    send(message: ClientMessage) {
      pipe.send(message)
    },
    clearMoveError() {
      if (snapshot.moveError === null) return
      snapshot.moveError = null
      emit()
    },
    destroy() {
      pipe.close()
    },
  }
}
