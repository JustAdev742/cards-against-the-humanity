import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'quiet'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

/**
 * There are two colours in this game, so a button says "press me" by being
 * the opposite of what is around it, and says "pressed" by turning back.
 * No hue is ever added to carry meaning.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-paper text-ink border-paper hover:bg-paper-edge hover:border-paper-edge ' +
    'active:bg-ink active:text-paper active:border-paper ' +
    'disabled:bg-transparent disabled:text-ash disabled:border-line disabled:hover:bg-transparent',
  secondary:
    'bg-transparent text-paper border-paper hover:bg-paper/15 ' +
    'active:bg-paper active:text-ink ' +
    'disabled:text-ash disabled:border-line disabled:hover:bg-transparent',
  quiet:
    'bg-transparent text-ash border-transparent hover:text-paper active:text-paper ' +
    'disabled:text-line',
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={
        'inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl ' +
        'border-2 px-6 text-base font-extrabold tracking-[0.02em] ' +
        'transition-[background-color,color,border-color,transform] duration-150 ' +
        'active:scale-[0.985] disabled:cursor-not-allowed disabled:active:scale-100 ' +
        `${VARIANTS[variant]} ${className}`
      }
    >
      {children}
    </button>
  )
}
