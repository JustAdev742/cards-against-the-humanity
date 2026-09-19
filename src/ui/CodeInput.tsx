import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { motion, useReducedMotion } from 'motion/react'

const ALLOWED = /^[A-Za-z]$/

/**
 * The four letters from the TV. Adapted from the 21st.dev OTP input — the
 * per-cell paste, arrow-key and backspace handling is theirs; the letters,
 * sizing and the shake on a wrong code are this game's.
 */
export function CodeInput({
  length = 4,
  value,
  onChange,
  onComplete,
  invalid = false,
  disabled = false,
  label = 'Table code',
  describedBy,
}: {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  invalid?: boolean
  disabled?: boolean
  label?: string
  describedBy?: string
}) {
  const reduced = useReducedMotion()
  const groupId = useId()
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const [focused, setFocused] = useState(-1)

  const chars = Array.from({ length }, (_, i) => value[i] ?? '')

  const completed = useRef(onComplete)
  completed.current = onComplete

  const focusAt = useCallback(
    (index: number) => {
      const el = refs.current[Math.max(0, Math.min(length - 1, index))]
      el?.focus()
      el?.select()
    },
    [length],
  )

  const commit = useCallback(
    (next: string) => {
      const cleaned = next.slice(0, length)
      onChange(cleaned)
      if (cleaned.length === length) completed.current?.(cleaned)
    },
    [length, onChange],
  )

  const fillFrom = useCallback(
    (index: number, text: string) => {
      const incoming = text
        .split('')
        .filter((c) => ALLOWED.test(c))
        .map((c) => c.toUpperCase())
      if (incoming.length === 0) return

      const next = chars.slice()
      let cursor = index
      for (const char of incoming) {
        if (cursor >= length) break
        next[cursor] = char
        cursor += 1
      }
      commit(next.join('').trimEnd())
      focusAt(cursor)
    },
    [chars, commit, focusAt, length],
  )

  useEffect(() => {
    if (invalid && !disabled) focusAt(0)
  }, [invalid, disabled, focusAt])

  const setChar = (index: number, char: string) => {
    const next = chars.slice()
    next[index] = char
    commit(next.join(''))
  }

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const previous = chars[index]
    const raw = event.currentTarget.value
    // Mobile keyboards often hand back the whole field, not just the new key.
    const trimmed = raw.length > 1 && previous && raw.startsWith(previous) ? raw.slice(previous.length) : raw
    const incoming = trimmed
      .split('')
      .filter((c) => ALLOWED.test(c))
      .map((c) => c.toUpperCase())

    if (incoming.length === 0) {
      if (raw.length === 0 && previous) setChar(index, '')
      event.currentTarget.value = chars[index] ?? ''
      return
    }
    if (incoming.length === 1) {
      event.currentTarget.value = incoming[0]
      setChar(index, incoming[0])
      if (index < length - 1) focusAt(index + 1)
      return
    }
    fillFrom(index, incoming.join(''))
  }

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Backspace': {
        event.preventDefault()
        if (chars[index]) {
          setChar(index, '')
          return
        }
        if (index > 0) {
          setChar(index - 1, '')
          focusAt(index - 1)
        }
        return
      }
      case 'Delete':
        event.preventDefault()
        setChar(index, '')
        return
      case 'ArrowLeft':
        event.preventDefault()
        focusAt(index - 1)
        return
      case 'ArrowRight':
        event.preventDefault()
        focusAt(index + 1)
        return
      case 'Home':
        event.preventDefault()
        focusAt(0)
        return
      case 'End':
        event.preventDefault()
        focusAt(length - 1)
    }
  }

  const handlePaste = (index: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const text = event.clipboardData.getData('text')
    const letters = text.split('').filter((c) => ALLOWED.test(c))
    fillFrom(letters.length >= length ? 0 : index, letters.join(''))
  }

  const handleFocus = (index: number) => (event: FocusEvent<HTMLInputElement>) => {
    event.currentTarget.select()
    setFocused(index)
  }

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const next = event.relatedTarget as HTMLInputElement | null
    if (next && refs.current.includes(next)) return
    setFocused(-1)
  }

  return (
    <motion.div
      role="group"
      aria-label={label}
      id={groupId}
      className="flex justify-center gap-2.5"
      initial={false}
      animate={invalid && !reduced ? { x: [0, -8, 7, -5, 0] } : { x: 0 }}
      transition={{ duration: 0.34, ease: [0.23, 1, 0.32, 1] }}
    >
      {chars.map((char, index) => {
        const active = focused === index
        return (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el
            }}
            value={char}
            disabled={disabled}
            type="text"
            inputMode="text"
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={length}
            aria-label={`${label}, letter ${index + 1} of ${length}`}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onChange={handleChange(index)}
            onKeyDown={handleKeyDown(index)}
            onPaste={handlePaste(index)}
            onFocus={handleFocus(index)}
            onBlur={handleBlur}
            className={
              'mono h-20 w-16 rounded-xl border-2 bg-transparent text-center text-4xl font-medium uppercase ' +
              'text-paper caret-paper transition-colors duration-150 disabled:opacity-40 ' +
              (invalid
                ? 'border-danger'
                : active
                  ? 'border-paper bg-paper/10'
                  : char
                    ? 'border-paper/60'
                    : 'border-line')
            }
          />
        )
      })}
    </motion.div>
  )
}
