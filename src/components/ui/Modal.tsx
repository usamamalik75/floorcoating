import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  footer,
  children,
  size = 'md',
  /**
   * A blocking modal cannot be dismissed by backdrop click, Escape, or a
   * close button. Used for stage gates that must be satisfied before the
   * record is allowed to move — the "you can't leave until you set a
   * reminder" rule from the requirements.
   */
  blocking = false,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  footer?: ReactNode
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  blocking?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !blocking) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, blocking, onClose])

  if (!open) return null

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div
        className="fixed inset-0 bg-(--surface-overlay)"
        onClick={blocking ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 my-auto w-full rounded-lg border border-strong bg-surface-raised',
          'shadow-[0_16px_48px_-12px_rgba(19,24,32,0.35)]',
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-subtle px-5 py-3.5">
          <div className="flex min-w-0 items-start gap-2.5">
            {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
            <div className="min-w-0">
              <h2 className="font-display text-lg leading-tight text-primary">{title}</h2>
              {subtitle && <p className="mt-1 text-base text-muted">{subtitle}</p>}
            </div>
          </div>
          {!blocking && (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <X size={14} />
            </Button>
          )}
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-subtle bg-surface-inset px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/** Right-hand slide-over for secondary detail that shouldn't take the page. */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-(--surface-overlay)" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-strong bg-surface-raised">
        <div className="flex items-start justify-between gap-4 border-b border-subtle px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-tight text-primary">{title}</h2>
            {subtitle && <p className="mt-1 text-base text-muted">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X size={14} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-subtle bg-surface-inset px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
