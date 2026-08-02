import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Surfaces separate by border, never by drop shadow. */
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-subtle bg-surface-raised', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  actions,
  icon,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-subtle px-4 py-2.5',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className="shrink-0 text-muted">{icon}</span>}
        <div className="min-w-0">
          <h3 className="truncate text-md leading-tight font-semibold text-primary">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  )
}

export function SectionTitle({
  children,
  actions,
  className,
}: {
  children: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-2 flex items-center justify-between gap-3', className)}>
      <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">{children}</h2>
      {actions}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      {icon && <div className="mb-3 text-(--color-steel-400)">{icon}</div>}
      <p className="font-display text-lg text-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-base text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function KeyValue({
  label,
  children,
  mono,
  className,
}: {
  label: ReactNode
  children: ReactNode
  mono?: boolean
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 truncate text-base text-primary',
          mono && 'font-mono text-sm tabular',
        )}
      >
        {children}
      </dd>
    </div>
  )
}
