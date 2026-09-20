import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { tapPlayed, tapSelect, tapWon, tapYourTurn } from './haptics.ts'
import {
  sfxBack,
  sfxConfirm,
  sfxDeny,
  sfxNudge,
  sfxTap,
  sfxUntap,
  sfxWinner,
  setSfxVolume,
  unlockAudio,
} from './sfx.ts'

const KEY = 'cath.phoneSound'
/** Phone cues sit well under the TV, which is carrying the room. */
const PHONE_VOLUME = 0.45

function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'false'
  } catch {
    return true
  }
}

export interface Feedback {
  soundOn: boolean
  toggleSound: () => void
  /** Call from the first tap; browsers will not make a sound before one. */
  unlock: () => void
  select: () => void
  deselect: () => void
  confirm: () => void
  back: () => void
  deny: () => void
  nudge: () => void
  win: () => void
}

const NOTHING = () => {}
const SILENT: Feedback = {
  soundOn: false,
  toggleSound: NOTHING,
  unlock: NOTHING,
  select: NOTHING,
  deselect: NOTHING,
  confirm: NOTHING,
  back: NOTHING,
  deny: NOTHING,
  nudge: NOTHING,
  win: NOTHING,
}

const FeedbackContext = createContext<Feedback>(SILENT)

/**
 * What a phone does when you touch it: a click and a buzz together. The buzz
 * is there for a pocket and the click is there for a hand, and which one lands
 * depends on the phone and how its owner has it set.
 *
 * The sound is quiet and switchable on purpose — a table can hold ten of these.
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [soundOn, setSoundOn] = useState(read)

  const unlock = useCallback(() => {
    unlockAudio()
    setSfxVolume(read() ? PHONE_VOLUME : 0)
  }, [])

  const toggleSound = useCallback(() => {
    const next = !read()
    try {
      localStorage.setItem(KEY, String(next))
    } catch {
      /* Private browsing. The preference just will not survive a reload. */
    }
    setSoundOn(next)
    if (next) unlockAudio()
    setSfxVolume(next ? PHONE_VOLUME : 0)
  }, [])

  const value = useMemo<Feedback>(() => {
    const sound = (play: () => void) => () => {
      if (soundOn) play()
    }
    const both = (play: () => void, buzz: () => void) => () => {
      if (soundOn) play()
      buzz()
    }
    return {
      soundOn,
      toggleSound,
      unlock,
      select: both(sfxTap, tapSelect),
      deselect: both(sfxUntap, tapSelect),
      confirm: both(sfxConfirm, tapPlayed),
      back: sound(sfxBack),
      deny: sound(sfxDeny),
      nudge: both(sfxNudge, tapYourTurn),
      win: both(sfxWinner, tapWon),
    }
  }, [soundOn, toggleSound, unlock])

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>
}

export const useFeedback = (): Feedback => useContext(FeedbackContext)
