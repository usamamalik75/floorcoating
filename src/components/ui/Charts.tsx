import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card } from './Surface'
import { cn } from '@/lib/cn'

export interface ChartSegment {
  label: string
  value: number
  color: string
  formattedValue?: string
}

export function HorizontalBarChart({
  title,
  data,
  totalLabel,
  totalValue,
  className,
}: {
  title?: ReactNode
  data: ChartSegment[]
  totalLabel?: string
  totalValue?: string
  className?: string
}) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0) || 1

  return (
    <Card className={cn('p-5 flex flex-col', className)}>
      <div className="flex items-end justify-between mb-4">
        {title && <h3 className="text-md font-semibold text-primary">{title}</h3>}
        {totalValue && (
          <div className="text-right">
            <p className="font-display text-2xl text-primary leading-none tabular">{totalValue}</p>
            {totalLabel && <p className="text-xs text-muted mt-1 uppercase tracking-wide">{totalLabel}</p>}
          </div>
        )}
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-inset">
        {data.map((segment, i) => {
          const pct = Math.max(0, (segment.value / total) * 100)
          if (pct === 0) return null
          return (
            <div
              key={segment.label + i}
              style={{ width: `${pct}%`, backgroundColor: segment.color }}
              className="h-full transition-all duration-500 ease-out first:rounded-l-full last:rounded-r-full border-r border-surface-base last:border-0"
              title={`${segment.label}: ${segment.formattedValue || segment.value}`}
            />
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.map((segment, i) => (
          <div key={segment.label + i} className="flex items-start gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
              style={{ backgroundColor: segment.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary truncate">{segment.label}</p>
              <p className="text-sm text-muted font-mono tabular">{segment.formattedValue || segment.value}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function TrendMetric({
  label,
  value,
  trend,
  trendLabel,
  className,
}: {
  label: string
  value: ReactNode
  trend: number
  trendLabel?: string
  className?: string
}) {
  const isPositive = trend >= 0
  const colorClass = isPositive ? 'text-success-text bg-success-soft' : 'text-danger-text bg-danger-soft'
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight

  return (
    <Card className={cn('p-4 flex flex-col justify-center', className)}>
      <p className="text-xs font-medium tracking-wide text-muted uppercase mb-1">{label}</p>
      <div className="flex items-center gap-3">
        <p className="font-display text-3xl text-primary tabular leading-none">{value}</p>
        <div className={cn('flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium', colorClass)}>
          <Icon size={14} />
          {Math.abs(trend)}%
        </div>
      </div>
      {trendLabel && <p className="mt-2 text-sm text-muted">{trendLabel}</p>}
    </Card>
  )
}
