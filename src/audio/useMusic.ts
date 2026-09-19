import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { setSfxVolume, unlockAudio } from './sfx.ts'
import {
  canRememberTrack,
  hasRememberedTrack,
  pickTrack,
  recallTrack,
  requestRememberedTrack,
} from './trackStore.ts'

/** Where a bundled track lives, if the build has one. */
const BUNDLED_TRACK = `${import.meta.env.BASE_URL}music/tv-loop.webm`

const VOLUME_KEY = 'cath.volume'
const MUTED_KEY = 'cath.muted'

function readNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    const value = raw === null ? NaN : Number(raw)
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback
  } catch {
    return fallback
  }
}

function readBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : raw === 'true'
  } catch {
    return fallback
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* Private browsing. The setting just will not survive a reload. */
  }
}

export interface Music {
  /** True once a track has actually loaded and can play. */
  available: boolean
  playing: boolean
  volume: number
  muted: boolean
  /** The file name, when the track came from the person's own device. */
  trackName: string | null
  setVolume: (volume: number) => void
  toggleMuted: () => void
  /** Plays a track the person picked from this device. */
  useFile: (file: File) => void
  /** Opens a picker, and remembers the choice where the browser allows it. */
  chooseTrack: () => void
  /** True when a track was picked before but needs permission again. */
  needsPermission: boolean
  /** Starts playback. Must be called from a click, or the browser refuses. */
  start: () => void
  /** Drops the volume for a moment so something on screen can land. */
  duck: (seconds: number) => void
}

/**
 * Background music for the TV. A bundled track is used when the build ships
 * one; otherwise the TV offers to play a file from the device it is running
 * on, which keeps the deployed site from having to host anyone's music.
 */
export function useMusic(): Music {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const duckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const [available, setAvailable] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolumeState] = useState(() => readNumber(VOLUME_KEY, 0.35))
  const [muted, setMuted] = useState(() => readBoolean(MUTED_KEY, false))
  const mutedRef = useRef(muted)
  const [trackName, setTrackName] = useState<string | null>(null)
  const [needsPermission, setNeedsPermission] = useState(false)

  // The audio element outlives re-renders; volume is pushed onto it, never
  // read from it. It is attached to the document so the browser treats it as
  // page media: OS volume controls and the tab's audio indicator both work.
  if (audioRef.current === null && typeof document !== 'undefined') {
    const audio = document.createElement('audio')
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0
    audio.hidden = true
    audio.setAttribute('aria-hidden', 'true')
    document.body.appendChild(audio)
    audioRef.current = audio
  }

  const target = muted ? 0 : volume

  /** Glides to a volume instead of stepping, so nothing clicks. */
  const glideTo = useCallback((to: number, ms: number) => {
    const audio = audioRef.current
    if (!audio) return
    if (fadeTimer.current) clearInterval(fadeTimer.current)
    const from = audio.volume
    const started = performance.now()
    fadeTimer.current = setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / ms)
      audio.volume = Math.min(1, Math.max(0, from + (to - from) * t))
      if (t >= 1 && fadeTimer.current) {
        clearInterval(fadeTimer.current)
        fadeTimer.current = null
      }
    }, 40)
  }, [])

  // Look for a bundled track once. A missing file is the normal case on a
  // deployment that does not ship music, so it is not surfaced as an error.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    let cancelled = false

    const load = async () => {
      // A track this TV chose beats the bundled one: it is the later decision.
      const remembered = await recallTrack()
      if (cancelled) return
      if (remembered) {
        objectUrlRef.current = URL.createObjectURL(remembered)
        audio.src = objectUrlRef.current
        setTrackName(remembered.name.replace(/\.[^.]+$/, ''))
        setAvailable(true)
        return
      }
      if (canRememberTrack() && (await hasRememberedTrack())) {
        if (!cancelled) setNeedsPermission(true)
      }

      const response = await fetch(BUNDLED_TRACK, { method: 'HEAD' }).catch(() => null)
      if (cancelled || !response?.ok) return
      audio.src = BUNDLED_TRACK
      setAvailable(true)
    }
    void load()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (playing) glideTo(target, 400)
    setSfxVolume(muted ? 0 : Math.max(0.25, target))
  }, [target, muted, playing, glideTo])

  useEffect(() => {
    const url = objectUrlRef.current
    return () => {
      if (fadeTimer.current) clearInterval(fadeTimer.current)
      if (duckTimer.current) clearTimeout(duckTimer.current)
      if (url) URL.revokeObjectURL(url)
      const audio = audioRef.current
      audio?.pause()
      audio?.remove()
    }
  }, [])

  const start = useCallback(() => {
    unlockAudio()
    const audio = audioRef.current
    if (!audio || !audio.src) return
    audio.volume = 0
    void audio
      .play()
      .then(() => {
        setPlaying(true)
        glideTo(muted ? 0 : volume, 1200)
      })
      .catch(() => {
        // Autoplay was refused. The lobby's own play control is the fallback.
        setPlaying(false)
      })
  }, [glideTo, muted, volume])

  const useFile = useCallback(
    (file: File) => {
      const audio = audioRef.current
      if (!audio) return
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      audio.src = url
      setTrackName(file.name.replace(/\.[^.]+$/, ''))
      setAvailable(true)
      setNeedsPermission(false)
      unlockAudio()
      audio.volume = 0
      void audio
        .play()
        .then(() => {
          setPlaying(true)
          glideTo(muted ? 0 : volume, 900)
        })
        .catch(() => setPlaying(false))
    },
    [glideTo, muted, volume],
  )

  /**
   * The click path for choosing music. Where the browser can remember a file
   * handle it does, so the next evening starts with the track already there.
   */
  const chooseTrack = useCallback(() => {
    void (async () => {
      const file = needsPermission ? await requestRememberedTrack() : await pickTrack()
      if (file) useFile(file)
    })()
  }, [needsPermission, useFile])

  const setVolume = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next))
    setVolumeState(clamped)
    write(VOLUME_KEY, String(clamped))
    const audio = audioRef.current
    if (audio && !mutedRef.current) audio.volume = clamped
  }, [])

  const toggleMuted = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    write(MUTED_KEY, String(next))
    // Unmuting is a click, so it is also the moment a browser that refused to
    // autoplay will allow the track to start.
    if (!next && !playing) start()
  }, [playing, start])

  const duck = useCallback(
    (seconds: number) => {
      if (!playing || muted) return
      if (duckTimer.current) clearTimeout(duckTimer.current)
      glideTo(volume * 0.3, 250)
      duckTimer.current = setTimeout(() => glideTo(volume, 700), seconds * 1000)
    },
    [glideTo, playing, muted, volume],
  )

  // Stable identity, so effects keyed on the controls do not re-fire every
  // time the table re-renders.
  return useMemo(
    () => ({
      available,
      playing,
      volume,
      muted,
      trackName,
      setVolume,
      toggleMuted,
      useFile,
      chooseTrack,
      needsPermission,
      start,
      duck,
    }),
    [
      available,
      playing,
      volume,
      muted,
      trackName,
      needsPermission,
      setVolume,
      toggleMuted,
      useFile,
      chooseTrack,
      start,
      duck,
    ],
  )
}
