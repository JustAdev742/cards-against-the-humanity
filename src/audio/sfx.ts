/**
 * Table sounds, synthesised rather than sampled: a few oscillators cost
 * nothing to ship and cannot be the wrong licence. These only ever play on
 * the TV — the TV has the speakers, and ten phones chirping at once would
 * be unbearable.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null

/** Browsers only allow audio after a gesture, so this runs on the first click. */
export function unlockAudio(): void {
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
}

export function setSfxVolume(volume: number): void {
  if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.01)
}

function envelope(gain: GainNode, at: number, peak: number, attack: number, decay: number) {
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(peak, at + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
}

function tone(
  freq: number,
  { at = 0, peak = 0.3, attack = 0.008, decay = 0.2, type = 'sine' as OscillatorType, to = 0 },
) {
  if (!ctx || !master) return
  const start = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, start + attack + decay)
  envelope(gain, start, peak, attack, decay)
  osc.connect(gain).connect(master)
  osc.start(start)
  osc.stop(start + attack + decay + 0.05)
}

/** Filtered noise: the paper part of a card sound. */
function noise({ at = 0, peak = 0.2, decay = 0.12, from = 2400, to = 700, q = 1 }) {
  if (!ctx || !master) return
  const start = ctx.currentTime + at
  const frames = Math.floor(ctx.sampleRate * (decay + 0.05))
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1

  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, start)
  filter.frequency.exponentialRampToValueAtTime(to, start + decay)
  const gain = ctx.createGain()
  envelope(gain, start, peak, 0.005, decay)

  source.connect(filter).connect(gain).connect(master)
  source.start(start)
  source.stop(start + decay + 0.05)
}

/** A card landing face down on the table. */
export function sfxCardPlayed(): void {
  noise({ peak: 0.16, decay: 0.09, from: 2000, to: 600 })
  tone(150, { peak: 0.18, attack: 0.004, decay: 0.09, type: 'triangle', to: 90 })
}

/** A card being turned over. */
export function sfxCardFlip(): void {
  noise({ peak: 0.2, decay: 0.13, from: 900, to: 3200, q: 0.7 })
  tone(320, { at: 0.05, peak: 0.12, attack: 0.005, decay: 0.1, type: 'triangle', to: 480 })
}

/** Someone takes the round. A major triad, because winning should sound like winning. */
export function sfxWinner(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((freq, i) =>
    tone(freq, { at: i * 0.085, peak: 0.24, attack: 0.01, decay: 0.42, type: 'triangle' }),
  )
}

/** The whole game is over. */
export function sfxGameOver(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
  notes.forEach((freq, i) =>
    tone(freq, { at: i * 0.1, peak: 0.26, attack: 0.012, decay: 0.6, type: 'triangle' }),
  )
}

/** A phone sits down at the table. */
export function sfxJoin(): void {
  tone(587.33, { peak: 0.18, attack: 0.008, decay: 0.16, type: 'sine' })
  tone(880, { at: 0.09, peak: 0.16, attack: 0.008, decay: 0.2, type: 'sine' })
}

/** The round opens and the black card goes up. */
export function sfxDeal(): void {
  for (let i = 0; i < 3; i++) {
    noise({ at: i * 0.06, peak: 0.1, decay: 0.07, from: 1800, to: 500 })
  }
}

/* ── Phone interface sounds ─────────────────────────────────────
   Much smaller than the table sounds above: a phone is six inches from
   a face, and a room can hold ten of them. These are dry clicks in the
   40–140 ms range, quiet enough to sit under conversation. */

/** Picking a card up. */
export function sfxTap(): void {
  noise({ peak: 0.07, decay: 0.028, from: 3200, to: 1800, q: 1.8 })
  tone(880, { peak: 0.06, attack: 0.002, decay: 0.035, type: 'sine' })
}

/** Putting one back down. */
export function sfxUntap(): void {
  noise({ peak: 0.055, decay: 0.03, from: 2200, to: 1100, q: 1.8 })
  tone(560, { peak: 0.05, attack: 0.002, decay: 0.04, type: 'sine' })
}

/** A committed action: cards in, winner chosen, seat taken. */
export function sfxConfirm(): void {
  tone(660, { peak: 0.085, attack: 0.004, decay: 0.06, type: 'triangle' })
  tone(990, { at: 0.055, peak: 0.075, attack: 0.004, decay: 0.09, type: 'triangle' })
}

/** Stepping back out of something. */
export function sfxBack(): void {
  tone(660, { peak: 0.06, attack: 0.004, decay: 0.05, type: 'sine' })
  tone(440, { at: 0.05, peak: 0.055, attack: 0.004, decay: 0.08, type: 'sine' })
}

/** The table turned a move down. */
export function sfxDeny(): void {
  tone(200, { peak: 0.09, attack: 0.004, decay: 0.12, type: 'sawtooth', to: 150 })
}

/** The round has turned and it wants something from you. */
export function sfxNudge(): void {
  tone(740, { peak: 0.07, attack: 0.006, decay: 0.1, type: 'sine' })
  tone(988, { at: 0.11, peak: 0.07, attack: 0.006, decay: 0.14, type: 'sine' })
}
