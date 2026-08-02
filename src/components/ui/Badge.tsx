import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Tone =
  | 'neutral'
  | 'brand'
  | 'attention'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-inset text-secondary border-subtle',
  brand: 'bg-action-soft text-brand border-transparent',
  attention: 'bg-attention-soft text-attention-text border-transparent',
  success: 'bg-success-soft text-success-text border-transparent',
  warning: 'bg-warning-soft text-warning-text border-transparent',
  danger: 'bg-danger-soft text-danger-text border-transparent',
  info: 'bg-info-soft text-info-text border-transparent',
}

export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: Tone
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5',
        'text-xs leading-none font-medium whitespace-nowrap',
        '[&_svg]:shrink-0',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/**
 * A stage chip that pulls its colour from the layer-3 stage tokens, so the
 * same stage looks identical on the board, in a table, on a timeline and in
 * the calendar without any component knowing the hex values.
 */
export function StageChip({
  group,
  label,
  dot = true,
  className,
}: {
  group: string
  label: string
  dot?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5',
        'text-xs leading-none font-medium whitespace-nowrap',
        className,
      )}
      style={{
        backgroundColor: `var(--stage-${group}-soft)`,
        color: `var(--stage-${group}-text)`,
      }}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: `var(--stage-${group}-solid)` }}
        />
      )}
      {label}
    </span>
  )
}
