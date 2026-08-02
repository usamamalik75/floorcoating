import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'attention'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  // Burgundy. Identity and commitment: submit, advance, confirm.
  primary:
    'bg-action text-action-fg border border-transparent hover:bg-action-hover active:bg-action-pressed',
  secondary:
    'bg-surface-raised text-primary border border-strong hover:bg-surface-inset active:bg-surface-sunken',
  ghost:
    'bg-transparent text-secondary border border-transparent hover:bg-surface-inset hover:text-primary',
  // Scarlet, never burgundy, and always paired with an icon at the call site.
  danger:
    'bg-danger text-white border border-transparent hover:brightness-95 active:brightness-90',
  // Copper. Attention: the one thing the user should do next.
  attention:
    'bg-attention text-white border border-transparent hover:brightness-95 active:brightness-90',
}

const sizes: Record<Size, string> = {
  sm: 'h-6 px-2 text-xs gap-1 rounded-sm',
  md: 'h-(--control-h) px-3 text-base gap-1.5 rounded-md',
  lg: 'h-(--touch-min) px-4 text-md gap-2 rounded-md',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap',
        'transition-[background-color,border-color,filter] duration-(--duration-fast)',
        'disabled:pointer-events-none disabled:opacity-40',
        '[&_svg]:shrink-0',
        variants[variant],
        sizes[size],
        !children && (size === 'sm' ? 'w-6 px-0' : 'aspect-square px-0'),
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  )
}
