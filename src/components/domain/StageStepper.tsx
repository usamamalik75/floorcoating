import { Check, ChevronRight } from 'lucide-react'
import type { Opportunity, StageId } from '@/domain/types'
import { BOARD_STAGES, STAGE_BY_ID, stageIndex, stageLabel } from '@/domain/stages'
import { cn } from '@/lib/cn'

/**
 * The stage rail. Clicking a stage is how work advances — the record page
 * and the board are two views of the same control plane, so both routes to
 * a transition go through the same gate.
 */
export function StageStepper({
  opportunity,
  onPick,
  orientation = 'horizontal',
}: {
  opportunity: Opportunity
  onPick: (stage: StageId) => void
  orientation?: 'horizontal' | 'vertical'
}) {
  const current = stageIndex(opportunity.stage)
  const stages = BOARD_STAGES.filter((s) => !STAGE_BY_ID[s].isAnchor)

  if (orientation === 'vertical') {
    return (
      <nav aria-label="Sales pipeline stages" className="flex flex-col">
        <ol className="space-y-2">
          {stages.map((id, i) => {
            const def = STAGE_BY_ID[id]
            const idx = stageIndex(id)
            const isCurrent = id === opportunity.stage
            const isPast = idx < current
            const isNext = idx === current + 1
            const last = i === stages.length - 1

            return (
              <li key={id} className="flex gap-3">
                <div className="flex w-6 shrink-0 flex-col items-center">
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-2xs font-bold',
                      isCurrent && 'bg-action text-action-fg',
                      isPast && 'bg-success-soft text-success-text',
                      isNext && 'border border-(--accent-attention) bg-attention-soft text-attention-text',
                      !isCurrent && !isPast && !isNext && 'bg-surface-inset text-muted',
                    )}
                  >
                    {isPast ? <Check size={11} strokeWidth={2.5} /> : i + 1}
                  </span>
                  {!last && (
                    <span
                      className={cn(
                        'mt-1 h-5 w-px',
                        isPast ? 'bg-success-soft' : 'bg-(--border-subtle)',
                      )}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => !isCurrent && onPick(id)}
                  disabled={isCurrent}
                  title={def.purpose}
                  className={cn(
                    'min-w-0 flex-1 rounded-md px-2.5 py-2 text-left transition-colors duration-(--duration-fast)',
                    isCurrent && 'bg-action-soft/60',
                    isPast && 'hover:bg-surface-inset',
                    isNext && 'bg-attention-soft/40 hover:bg-attention-soft/60',
                    !isCurrent && !isPast && !isNext && 'hover:bg-surface-inset',
                  )}
                >
                  <span
                    className={cn(
                      'block text-sm leading-snug',
                      isCurrent && 'font-semibold text-primary',
                      isPast && 'text-secondary',
                      isNext && 'text-attention-text',
                      !isCurrent && !isPast && !isNext && 'text-muted',
                    )}
                  >
                    {stageLabel(id, opportunity.category)}
                  </span>
                  {isCurrent && <span className="mt-0.5 block text-2xs text-muted">Current stage</span>}
                  {isNext && <span className="mt-0.5 block text-2xs text-attention-text">Next step</span>}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>
    )
  }

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto pb-1 scrollbar-thin">
      {stages.map((id, i) => {
        const def = STAGE_BY_ID[id]
        const idx = stageIndex(id)
        const isCurrent = id === opportunity.stage
        const isPast = idx < current
        const isNext = idx === current + 1

        return (
          <div key={id} className="flex shrink-0 items-center">
            <button
              onClick={() => !isCurrent && onPick(id)}
              disabled={isCurrent}
              title={def.purpose}
              className={cn(
                'rounded-sm px-2 py-1 text-2xs font-medium whitespace-nowrap',
                'transition-colors duration-(--duration-fast)',
                isCurrent && 'cursor-default text-white',
                isPast && 'text-muted hover:bg-surface-inset',
                !isCurrent && !isPast && 'text-muted hover:bg-surface-inset',
                // Copper ring marks the single next action, per the token contract.
                isNext && 'ring-1 ring-(--accent-attention) ring-inset text-attention-text',
              )}
              style={isCurrent ? { backgroundColor: `var(--stage-${def.group}-solid)` } : undefined}
            >
              {stageLabel(id, opportunity.category)}
            </button>
            {i < stages.length - 1 && (
              <ChevronRight size={11} className="shrink-0 text-(--color-steel-300)" />
            )}
          </div>
        )
      })}
    </div>
  )
}
