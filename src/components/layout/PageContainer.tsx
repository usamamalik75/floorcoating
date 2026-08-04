import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function PageContainer({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('w-full px-4 py-6 sm:px-6 lg:px-8', className)}
      {...props}
    >
      {children}
    </div>
  )
}
