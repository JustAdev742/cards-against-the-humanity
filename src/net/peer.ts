import type { PeerJSOption } from 'peerjs'

/**
 * Signalling runs through the public PeerJS broker; the game itself runs
 * peer to peer over WebRTC, so there is no game server to host. Point
 * `?peer=host:port` at your own broker if you would rather not use theirs.
 */
export function peerOptions(): PeerJSOption {
  const base: PeerJSOption = {
    debug: 0,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    },
  }

  const override = new URLSearchParams(location.search).get('peer')
  if (!override) return base

  const [host, port] = override.split(':')
  return { ...base, host, port: port ? Number(port) : 443, path: '/', secure: true }
}

/** Human-readable reasons for the connection states a player can hit. */
export const CONNECTION_HELP: Record<string, string> = {
  'peer-unavailable': 'No table with that code. Check the letters on the TV.',
  'unavailable-id': 'That code is already in use. Getting a new one…',
  network: 'Lost the connection. Trying again…',
  'browser-incompatible': 'This browser cannot do peer-to-peer. Try Chrome or Safari.',
  'server-error': 'The matchmaking service is not responding. Try again in a moment.',
  webrtc: 'The connection dropped. Trying again…',
}
