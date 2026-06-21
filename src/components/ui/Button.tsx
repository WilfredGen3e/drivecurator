import React from 'react'

/**
 * Button — de centrale knop-component in Apple/iOS-stijl.
 *
 * Varianten:
 *  - primary    gevuld accent (hoofdactie)
 *  - secondary  getinte accent-vulling (lichte nadruk)
 *  - neutral    grijze vulling (rustige actie)
 *  - success    gevuld groen (bewaren / volgende)
 *  - destructive gevuld rood (verwijderen)
 *  - ghost      alleen tekst (tertiaire actie / annuleren)
 *
 * Alle varianten hebben een min. tikdoel van 44px (iOS-richtlijn),
 * een subtiele "ingedrukt"-animatie en werken zowel op touch als desktop.
 */

type Variant = 'primary' | 'secondary' | 'neutral' | 'success' | 'destructive' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  /** Icoon links van het label */
  icon?: React.ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl ' +
  'select-none transition-[transform,background-color,opacity] duration-150 ' +
  'active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 ' +
  'disabled:cursor-not-allowed focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-fluent-accent focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-fluent-bg-primary'

const variants: Record<Variant, string> = {
  primary:
    'bg-fluent-accent text-white hover:bg-fluent-accent-hover active:bg-fluent-accent-hover',
  secondary:
    'bg-fluent-accent-light text-fluent-accent hover:brightness-95 active:brightness-90',
  neutral:
    'bg-fluent-bg-secondary text-fluent-text-primary hover:bg-fluent-bg-hover active:bg-fluent-bg-hover',
  success:
    'bg-fluent-success text-white hover:brightness-95 active:brightness-90',
  destructive:
    'bg-fluent-danger text-white hover:brightness-95 active:brightness-90',
  ghost:
    'bg-transparent text-fluent-accent hover:bg-fluent-bg-hover active:bg-fluent-bg-hover',
}

const sizes: Record<Size, string> = {
  // min-h volgt de 44px iOS-tikdoelrichtlijn
  sm: 'min-h-[36px] px-3.5 text-sm',
  md: 'min-h-[44px] px-5 text-[15px]',
  lg: 'min-h-[52px] px-6 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
