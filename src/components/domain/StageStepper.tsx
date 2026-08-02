import { ChevronRight } from 'lucide-react'
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
}: {
  opportunity: Opportunity
  onPick: (stage: StageId) => void
}) {
  const current = stageIndex(opportunity.stage)
  const stages = BOARD_STAGES.filter((s) => !STAGE_BY_ID[s].isAnchor)

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
