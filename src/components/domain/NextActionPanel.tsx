import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { Opportunity, StageId } from '@/domain/types'
import { visitVocab } from '@/domain/types'
import { useStore } from '@/store/useStore'
import { Button, Card } from '@/components/ui'

/**
 * After a stage change, offer intentional next steps — never auto-redirect.
 */
export function NextActionPanel({
  opportunity,
  onDismiss,
  onMove,
}: {
  opportunity: Opportunity
  onDismiss?: () => void
  onMove?: (to: StageId) => void
}) {
  const ensureEstimate = useStore((s) => s.ensureEstimate)
  const job = useStore((s) => s.jobs.find((j) => j.opportunityId === opportunity.id))
  const estimate = useStore((s) => s.estimates.find((e) => e.opportunityId === opportunity.id))

  const actions = actionsFor(opportunity, {
    hasEstimate: Boolean(estimate),
    hasJob: Boolean(job),
    estimateId: estimate?.opportunityId,
    token: estimate?.token,
  })

  if (!actions) return null

  return (
    <Card className="mb-4 border-(--accent-attention) bg-attention-soft/40 p-4">
      <div className="flex items-start gap-3">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-attention-text" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-primary">{actions.title}</p>
          <p className="mt-0.5 text-sm text-secondary">{actions.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.buttons.map((b) => {
              if (b.kind === 'link') {
                return (
                  <Link key={b.label} to={b.to}>
                    <Button size="sm" variant={b.primary ? 'primary' : 'secondary'}>
                      {b.label}
                      <ArrowRight size={12} />
                    </Button>
                  </Link>
                )
              }
              if (b.kind === 'ensureEstimate') {
                return (
                  <Button
                    key={b.label}
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      ensureEstimate(opportunity.id)
                    }}
                  >
                    {b.label}
                  </Button>
                )
              }
              return (
                <Button
                  key={b.label}
                  size="sm"
                  variant={b.primary ? 'primary' : 'secondary'}
                  onClick={() => b.toStage && onMove?.(b.toStage)}
                >
                  {b.label}
                </Button>
              )
            })}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

type ActionBtn =
  | { kind: 'link'; label: string; to: string; primary?: boolean }
  | { kind: 'stage'; label: string; toStage: StageId; primary?: boolean }
  | { kind: 'ensureEstimate'; label: string }

function actionsFor(
  opportunity: Opportunity,
  ctx: { hasEstimate: boolean; hasJob: boolean; estimateId?: string; token?: string },
): { title: string; body: string; buttons: ActionBtn[] } | null {
  const v = visitVocab(opportunity.category)

  switch (opportunity.stage) {
    case 'qualified':
      return {
        title: 'Lead qualified',
        body: `Mark a ${v.singular} as required, or set the appointment time to schedule it.`,
        buttons: [
          { kind: 'stage', label: `${v.Singular} Required`, toStage: 'site_visit_required', primary: true },
          { kind: 'stage', label: `Schedule ${v.Singular}`, toStage: 'site_visit_scheduled' },
          { kind: 'ensureEstimate', label: 'Create Estimate' },
          { kind: 'link', label: 'Return to Sales', to: '/sales' },
        ],
      }
    case 'site_visit_required':
      return {
        title: `${v.Singular} required`,
        body: `Set the appointment date and time to move into Scheduled. The guided form opens after scheduling.`,
        buttons: [
          { kind: 'stage', label: `Schedule ${v.Singular}`, toStage: 'site_visit_scheduled', primary: true },
          { kind: 'ensureEstimate', label: 'Create Estimate' },
          { kind: 'link', label: 'Return to Sales', to: '/sales' },
        ],
      }
    case 'site_visit_scheduled':
      return {
        title: `${v.Singular} scheduled`,
        body: opportunity.visitAt
          ? `Appointment is set. Open the guided form now or during the ${v.singular}, then mark completed when everything is filled.`
          : `Open the guided form now or during the ${v.singular}. Mark completed only after all required fields are done.`,
        buttons: [
          {
            kind: 'link',
            label: 'Open form',
            to: `/opportunities/${opportunity.id}/visit`,
            primary: true,
          },
          { kind: 'stage', label: `Mark ${v.Singular} Completed`, toStage: 'site_visit_completed' },
          { kind: 'link', label: 'Return to Sales', to: '/sales' },
        ],
      }
    case 'site_visit_completed':
      return {
        title: `${v.Singular} completed`,
        body: 'Measurements and answers are on the record. Create or open the estimate when you are ready.',
        buttons: [
          ctx.hasEstimate
            ? { kind: 'link', label: 'Open Estimate', to: `/estimate/${ctx.estimateId}`, primary: true }
            : { kind: 'ensureEstimate', label: 'Create Estimate' },
          { kind: 'link', label: 'Return to Sales', to: '/sales' },
        ],
      }
    case 'estimate_ready':
      return {
        title: 'Estimate approved',
        body: 'Generate the customer proposal when you are ready to send it.',
        buttons: [
          {
            kind: 'link',
            label: 'Generate Proposal',
            to: `/estimate/${ctx.estimateId}`,
            primary: true,
          },
          { kind: 'link', label: 'Return to Sales', to: '/sales' },
        ],
      }
    case 'proposal_sent':
      return {
        title: 'Proposal sent',
        body: 'Follow up from Sales, or open the customer link to preview what they see.',
        buttons: [
          ...(ctx.token
            ? [{ kind: 'link' as const, label: 'Customer link', to: `/proposal/${ctx.token}`, primary: true }]
            : []),
          { kind: 'stage', label: 'Mark Follow-up', toStage: 'follow_up' },
          { kind: 'link', label: 'Return to Sales', to: '/sales' },
        ],
      }
    case 'awarded':
      return {
        title: 'Proposal accepted — job created',
        body: 'Sales history stays on this opportunity. Operational work continues in the Job module.',
        buttons: [
          {
            kind: 'link',
            label: 'Open Job',
            to: '/jobs',
            primary: true,
          },
          {
            kind: 'link',
            label: 'Job on this lead',
            to: `/opportunities/${opportunity.id}?tab=job`,
          },
          { kind: 'link', label: 'Return to Sales', to: '/sales' },
        ],
      }
    default:
      return null
  }
}
