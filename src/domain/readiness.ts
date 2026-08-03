import type { JobRole, JobStatus, StageId } from './types'
import { formForCategory, requiredFields } from '@/data/siteVisitForms'
import { CHECKLIST_BY_ID } from '@/data/checklists'
import { estimateTotal } from '@/store/useStore'

/* ==========================================================================
   Readiness
   ==========================================================================
   Sales gates check Opportunity.stage. Job gates check Job.status.
   ========================================================================== */

export interface Check {
  id: string
  label: string
  ok: boolean
  detail: string
  href?: string
}

export interface ReadinessInput {
  opportunity: {
    id: string
    category: string
    estimatedQuantity: number
    stage: StageId
    pmId: string | null
    estimatorId: string | null
    value: number
  }
  siteVisit?: { values: Record<string, string | number | boolean>; completedAt: string | null }
  artifacts: { kind: string; photoPhase?: string }[]
  estimate?: {
    id: string
    token: string
    options: { lineItems: unknown[] }[]
    status: string
    approvedById: string | null
    signedAt: string | null
    templateId: string
  }
  checklists: { templateId: string; done: string[] }[]
  procurementOrder?: { status: string }
  job?: { status?: JobStatus; crewLeaderId: string | null; start: string; team?: { userId: string; role: JobRole }[] }
  invoices: { kind: string; amount: number; payments: { amount: number }[] }[]
  changeOrders: { status: string }[]
}

const has = (input: ReadinessInput, kind: string, phase?: string) =>
  input.artifacts.some((a) => a.kind === kind && (!phase || a.photoPhase === phase))

function checklistProgress(input: ReadinessInput, templateId: string) {
  const tpl = CHECKLIST_BY_ID[templateId]
  const inst = input.checklists.find((c) => c.templateId === templateId)
  return { done: inst?.done.length ?? 0, total: tpl?.items.length ?? 0 }
}

function siteVisitChecks(input: ReadinessInput): Check[] {
  const form = formForCategory(input.opportunity.category)
  const required = form ? requiredFields(form) : []
  const answered = required.filter((f) => {
    const v = input.siteVisit?.values[f.id]
    return v !== undefined && v !== '' && v !== null
  })
  return [
    {
      id: 'form',
      label: 'Guided site visit form completed',
      ok: required.length > 0 && answered.length === required.length,
      detail: `${answered.length} of ${required.length} required fields answered`,
      href: `/opportunities/${input.opportunity.id}/visit`,
    },
    {
      id: 'photos',
      label: 'Site photos or architectural plans attached',
      ok: has(input, 'photo') || has(input, 'plan'),
      detail: has(input, 'plan')
        ? 'Architectural plans on file'
        : has(input, 'photo')
          ? 'Site photos on file'
          : 'Nothing attached',
      href: `/opportunities/${input.opportunity.id}?tab=photos`,
    },
    {
      id: 'measure',
      label: 'Measurements recorded',
      ok: input.opportunity.estimatedQuantity > 0,
      detail:
        input.opportunity.estimatedQuantity > 0
          ? `${input.opportunity.estimatedQuantity.toLocaleString()} units`
          : 'No quantity recorded',
      href: `/opportunities/${input.opportunity.id}/visit`,
    },
  ]
}

function approvalChecks(input: ReadinessInput): Check[] {
  const est = input.estimate
  const lines = est?.options.reduce((s, o) => s + o.lineItems.length, 0) ?? 0
  return [
    ...siteVisitChecks(input),
    {
      id: 'estimate',
      label: 'Estimate completed',
      ok: lines > 0,
      detail:
        lines > 0
          ? `${lines} line items across ${est!.options.length} options`
          : 'No estimate built',
      href: `/estimate/${input.opportunity.id}`,
    },
    {
      id: 'margin',
      label: 'Pricing and margin validated',
      ok: Boolean(est && estimateTotal(est as never) > 0),
      detail: est ? 'Contract value calculated from the catalogue' : 'No pricing',
      href: `/estimate/${input.opportunity.id}`,
    },
    {
      id: 'terms',
      label: 'Terms and exclusions selected',
      ok: Boolean(est?.templateId),
      detail: est?.templateId ? 'Proposal template applied' : 'No template selected',
      href: `/estimate/${input.opportunity.id}`,
    },
    {
      id: 'estimator',
      label: 'Estimator assigned',
      ok: Boolean(input.opportunity.estimatorId),
      detail: input.opportunity.estimatorId ? 'Assigned' : 'Nobody owns this estimate',
    },
  ]
}

export function checksForStage(stage: StageId, input: ReadinessInput): Check[] {
  switch (stage) {
    case 'site_visit_completed':
      return siteVisitChecks(input)

    case 'estimate_ready':
      return approvalChecks(input)

    case 'awarded':
      return [
        {
          id: 'signed',
          label: 'Signed proposal on file',
          ok: Boolean(input.estimate?.signedAt),
          detail: input.estimate?.signedAt
            ? 'Electronic signature captured'
            : 'Customer has not signed yet',
          href: input.estimate ? `/proposal/${input.estimate.token ?? input.estimate.id}` : undefined,
        },
      ]

    default:
      return []
  }
}

export function checksForJobStatus(status: JobStatus, input: ReadinessInput): Check[] {
  switch (status) {
    case 'procurement_required':
    case 'procurement_ordered':
      return [
        {
          id: 'po',
          label: 'Procurement order submitted',
          ok: Boolean(input.procurementOrder && input.procurementOrder.status !== 'draft'),
          detail: input.procurementOrder
            ? `Order is ${input.procurementOrder.status}`
            : 'No purchase order created',
          href: `/opportunities/${input.opportunity.id}/procurement`,
        },
      ]

    case 'ready_to_start': {
      const prep = checklistProgress(input, 'cl_prep')
      return [
        {
          id: 'prep',
          label: 'Project preparation checklist complete',
          ok: prep.total > 0 && prep.done === prep.total,
          detail: `${prep.done} of ${prep.total} items`,
          href: `/opportunities/${input.opportunity.id}?tab=job`,
        },
        {
          id: 'procurement',
          label: 'Required resources delivered',
          ok: input.procurementOrder?.status === 'delivered',
          detail: input.procurementOrder ? `Order is ${input.procurementOrder.status}` : 'Not ordered',
          href: `/opportunities/${input.opportunity.id}/procurement`,
        },
        {
          id: 'crew',
          label: 'Field leadership assigned',
          ok: Boolean(input.job?.team?.some((a) => a.role === 'crew_lead' || a.role === 'field_supervisor') || input.job?.crewLeaderId),
          detail: input.job?.team?.some((a) => a.role === 'crew_lead' || a.role === 'field_supervisor') || input.job?.crewLeaderId ? 'Assigned' : 'No field lead',
          href: '/schedule',
        },
        {
          id: 'map',
          label: 'Installation map available to the crew',
          ok: has(input, 'map'),
          detail: has(input, 'map') ? 'On the job sheet' : 'Not produced',
        },
      ]
    }

    case 'in_progress':
      return [
        {
          id: 'before',
          label: 'Before photos captured',
          ok: has(input, 'photo', 'before'),
          detail: has(input, 'photo', 'before')
            ? 'On file'
            : 'The service area as found has not been photographed',
        },
      ]

    case 'completion_review':
    case 'completed':
      return [
        {
          id: 'after',
          label: 'After photos captured',
          ok: has(input, 'photo', 'after'),
          detail: has(input, 'photo', 'after') ? 'On file' : 'No completion photos',
        },
        {
          id: 'signoff',
          label: 'Customer sign-off captured',
          ok: has(input, 'signature'),
          detail: has(input, 'signature') ? 'Signed off' : 'Customer has not signed off',
          href: `/opportunities/${input.opportunity.id}?tab=job`,
        },
      ]

    case 'invoiced':
      return [
        {
          id: 'co',
          label: 'All change orders resolved',
          ok: !input.changeOrders.some((c) => c.status === 'pending'),
          detail: input.changeOrders.some((c) => c.status === 'pending')
            ? 'A change order is still pending customer approval'
            : 'No pending change orders',
          href: `/opportunities/${input.opportunity.id}?tab=job`,
        },
      ]

    case 'paid': {
      const billed = input.invoices.reduce((s, i) => s + i.amount, 0)
      const paid = input.invoices.reduce(
        (s, i) => s + i.payments.reduce((p, x) => p + x.amount, 0),
        0,
      )
      return [
        {
          id: 'balance',
          label: 'Balance settled in full',
          ok: billed > 0 && paid >= billed,
          detail: `${paid.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} received of ${billed.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} billed`,
          href: '/finance',
        },
      ]
    }

    default:
      return []
  }
}
