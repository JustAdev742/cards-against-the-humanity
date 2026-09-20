import { useId, useRef } from 'react'

import { canRememberTrack } from '../audio/trackStore.ts'
import type { Music } from '../audio/useMusic.ts'

function SpeakerIcon({ muted, className = '' }: { muted: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <>
          <path
            d="M15.8 9.2a4 4 0 0 1 0 5.6"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M18.4 6.6a7.6 7.6 0 0 1 0 10.8"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}

/** The compact toggle that stays on screen during play. */
export function MuteButton({ music, className = '' }: { music: Music; className?: string }) {
  if (!music.available) return null
  return (
    <button
      type="button"
      onClick={music.toggleMuted}
      aria-pressed={music.muted}
      aria-label={music.muted ? 'Unmute the music' : 'Mute the music'}
      title={`${music.muted ? 'Unmute' : 'Mute'} (M)`}
      // The box is always a target; the className sizes the icon inside it.
      // An icon is not a tap target, and on a TV this is a mouse target too.
      className="grid min-h-11 min-w-11 cursor-pointer place-items-center text-ash transition-colors hover:text-paper"
    >
      <SpeakerIcon muted={music.muted} className={className || 'w-5'} />
    </button>
  )
}

/** A phone's own sound switch. Small, always reachable, never in the way. */
export function SoundToggle({
  on,
  onToggle,
  className = '',
}: {
  on: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!on}
      aria-label={on ? 'Turn button sounds off' : 'Turn button sounds on'}
      className={
        'grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-lg ' +
        `transition-colors ${on ? 'text-ash-bright' : 'text-line'} hover:text-paper ${className}`
      }
    >
      <SpeakerIcon muted={!on} className="w-5" />
    </button>
  )
}

/**
 * Music setup, in the lobby where the rest of the setting up happens.
 * A deployment that ships no track offers to play one off this device
 * instead, so nobody has to host anybody's music to get it.
 */
export function SoundControls({ music, size = 'tv' }: { music: Music; size?: 'tv' | 'phone' }) {
  const sliderId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const tv = size === 'tv'

  const label = tv ? 'text-[min(1.3vw,1.1rem)]!' : ''
  const body = tv ? 'text-[min(1.1vw,0.9rem)]' : 'text-xs'

  return (
    <section>
      <p className={`label ${label}`}>Music</p>

      {music.available ? (
        <div className={`mt-3 flex items-center ${tv ? 'gap-[1.2vw]' : 'gap-3'}`}>
          <button
            type="button"
            onClick={music.toggleMuted}
            aria-pressed={music.muted}
            aria-label={music.muted ? 'Unmute the music' : 'Mute the music'}
            className={
              'flex shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 ' +
              'transition-colors duration-150 ' +
              (tv ? 'h-[5vh] w-[5vh] min-h-11 min-w-11' : 'h-12 w-12') +
              (music.muted
                ? ' border-line text-ash hover:border-ash'
                : ' border-paper bg-paper text-ink')
            }
          >
            <SpeakerIcon muted={music.muted} className={tv ? 'w-[55%]' : 'w-6'} />
          </button>

          <label htmlFor={sliderId} className="sr-only">
            Music volume
          </label>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(music.volume * 100)}
            disabled={music.muted}
            onChange={(event) => music.setVolume(Number(event.target.value) / 100)}
            className={
              'h-2 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-white ' +
              'disabled:cursor-not-allowed disabled:opacity-40'
            }
          />
          <span className={`mono shrink-0 tabular-nums text-ash ${body}`}>
            {music.muted ? 'Off' : `${Math.round(music.volume * 100)}%`}
          </span>
        </div>
      ) : (
        <p className={`m-0 mt-2 text-ash ${body}`}>
          {music.needsPermission
            ? 'A track was picked here before. Play it again to let this page read the file.'
            : 'No track ships with this build. Pick one off this device and it loops for the whole game.'}
        </p>
      )}

      <div className={`mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 ${body}`}>
        <button
          type="button"
          onClick={() => (canRememberTrack() ? music.chooseTrack() : fileRef.current?.click())}
          className={
            'label inline-flex min-h-11 cursor-pointer items-center underline ' +
            'decoration-line underline-offset-4 hover:text-paper! hover:decoration-paper'
          }
        >
          {music.needsPermission
            ? 'Play the saved track'
            : music.available
              ? 'Use a different track'
              : 'Add music from this device'}
        </button>
        {music.trackName && (
          <span className="min-w-0 truncate text-ash" title={music.trackName}>
            Playing {music.trackName}
          </span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="sr-only"
        aria-label="Choose a music file from this device"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) music.useFile(file)
          event.target.value = ''
        }}
      />
    </section>
  )
}
