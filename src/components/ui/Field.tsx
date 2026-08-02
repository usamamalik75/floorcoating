import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

const control =
  'w-full bg-surface-raised text-primary border border-strong rounded-md px-2.5 ' +
  'placeholder:text-muted transition-colors duration-(--duration-fast) ' +
  'hover:border-(--color-steel-400) disabled:opacity-50 disabled:bg-surface-inset'

export function Label({
  children,
  required,
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn(
        'mb-1 block text-xs font-medium tracking-wide text-secondary uppercase',
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-(--control-h) text-base', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'py-2 text-base leading-relaxed', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, 'h-(--control-h) text-base', className)} {...props}>
      {children}
    </select>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <label
      className={cn(
        'group flex cursor-pointer items-start gap-2.5 select-none',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span
        className={cn(
          'mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border transition-colors duration-(--duration-fast)',
          checked
            ? 'border-action bg-action text-action-fg'
            : 'border-strong bg-surface-raised group-hover:border-(--color-steel-400)',
        )}
      >
        {checked && <Check size={11} strokeWidth={3.5} />}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {(label || description) && (
        <span className="min-w-0 flex-1">
          {label && <span className="block text-base leading-tight text-primary">{label}</span>}
          {description && (
            <span className="mt-0.5 block text-sm leading-snug text-muted">{description}</span>
          )}
        </span>
      )}
    </label>
  )
}

export function FieldRow({
  label,
  required,
  hint,
  error,
  children,
  className,
}: {
  label?: ReactNode
  required?: boolean
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  className?: string
}) {
  // The label wraps its control rather than sitting beside it, so the
  // association is implicit and the whole label is a touch target in the
  // field density where that matters most.
  return (
    <div className={cn('min-w-0', className)}>
      {label ? (
        <label className="block">
          {/* Flex, not block: labels can carry unit and badge elements and the
              required marker has to stay on the same line as them. */}
          <span className="mb-1 flex items-center gap-0.5 text-xs font-medium tracking-wide text-secondary uppercase">
            {label}
            {required && <span className="text-danger">*</span>}
          </span>
          {children}
        </label>
      ) : (
        children
      )}
      {error ? (
        <p className="mt-1 text-sm text-danger-text">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  )
}
