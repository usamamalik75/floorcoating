import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <table className={cn('w-full border-collapse text-base', className)}>{children}</table>
    </div>
  )
}

export function Th({
  children,
  align = 'left',
  className,
  width,
}: {
  children?: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  width?: string | number
}) {
  return (
    <th
      style={{ width }}
      className={cn(
        'sticky top-0 z-10 border-b border-subtle bg-surface-inset px-3 py-2',
        'text-xs font-semibold tracking-wider text-muted uppercase whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  align = 'left',
  mono,
  className,
}: {
  children?: ReactNode
  align?: 'left' | 'right' | 'center'
  mono?: boolean
  className?: string
}) {
  return (
    <td
      className={cn(
        'border-b border-subtle px-3 align-middle text-primary',
        'h-(--row-h)',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        mono && 'font-mono text-sm tabular',
        className,
      )}
    >
      {children}
    </td>
  )
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors duration-(--duration-fast)',
        onClick && 'cursor-pointer hover:bg-surface-inset',
        className,
      )}
    >
      {children}
    </tr>
  )
}
