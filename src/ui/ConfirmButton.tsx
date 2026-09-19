import { useEffect, useRef, useState } from 'react'

/**
 * Two taps for anything that cannot be undone — ending the table, or putting
 * a player out of the game. A dialog would be the wrong weight here: people
 * are holding phones in a noisy room, and the second tap is the confirmation.
 * The button arms itself, says so, and disarms on its own after a few seconds.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className = '',
  armedClassName = '',
  timeoutMs = 4000,
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  className?: string
  armedClassName?: string
  timeoutMs?: number
}) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!armed) return
    timer.current = setTimeout(() => setArmed(false), timeoutMs)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [armed, timeoutMs])

  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
        }
      }}
      onBlur={() => setArmed(false)}
      aria-live="polite"
      className={`${className} ${armed ? armedClassName : ''}`}
    >
      {armed ? confirmLabel : label}
    </button>
  )
}
