import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Avatar({
  name,
  size = 24,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  // Deterministic hue per person so the same rep is always the same colour.
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundColor: `hsl(${hue} 30% 88%)`,
        color: `hsl(${hue} 45% 28%)`,
      }}
      title={name}
    >
      {initials}
    </span>
  )
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (next: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-subtle bg-surface-inset p-0.5',
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-sm font-medium',
            'transition-colors duration-(--duration-fast)',
            value === o.value
              ? 'bg-surface-raised text-primary shadow-[0_1px_2px_rgba(19,24,32,0.08)]'
              : 'text-muted hover:text-secondary',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
}) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        className={cn(
          'pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 rounded-sm px-2 py-1',
          'bg-(--color-steel-900) text-xs whitespace-nowrap text-white',
          'opacity-0 transition-opacity duration-(--duration-fast) group-hover/tip:opacity-100',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {label}
      </span>
    </span>
  )
}

/** Thin progress meter used for pipeline value rollups and job completion. */
export function Meter({
  value,
  max = 100,
  tone = 'action',
  className,
}: {
  value: number
  max?: number
  tone?: 'action' | 'attention' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  const pct = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  const colors = {
    action: 'var(--action-primary)',
    attention: 'var(--accent-attention)',
    success: 'var(--status-success)',
    warning: 'var(--status-warning)',
    danger: 'var(--status-danger)',
  }
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-(--duration-slow) ease-(--ease-out)"
        style={{ width: `${pct}%`, backgroundColor: colors[tone] }}
      />
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-(--border-subtle)', className)} />
}
