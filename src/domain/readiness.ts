import type { Category, ChecklistTemplate, JobRole, JobStatus, SiteVisitForm, StageId } from './types'
import { visitVocab } from './types'
import { requiredFields } from '@/data/siteVisitForms'
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
    category: Category
    estimatedQuantity: number
    stage: StageId
    pmId: string | null
    estimatorId: string | null
    value: number
  }
  siteVisit?: {
    values: Record<string, string | number | boolean>
    requests?: { quantity: number; serviceType: string; areaOrEquipment: string; unit: string; concernOrOutcome: string }[]
    completedAt: string | null
  }
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
  /** Live Admin Setup forms — drives guided-form readiness. */
  siteVisitForms?: SiteVisitForm[]
  /** Live Admin Setup checklists — drives prep/progress item counts. */
  checklistTemplates?: ChecklistTemplate[]
}

const has = (input: ReadinessInput, kind: string, phase?: string) =>
  input.artifacts.some((a) => a.kind === kind && (!phase || a.photoPhase === phase))

function checklistProgress(input: ReadinessInput, templateId: string) {
  const tpl = input.checklistTemplates?.find((t) => t.id === templateId)
  const inst = input.checklists.find((c) => c.templateId === templateId)
  return { done: inst?.done.length ?? 0, total: tpl?.items.length ?? 0 }
}

function siteVisitChecks(input: ReadinessInput): Check[] {
  const form = input.siteVisitForms?.find((f) => f.category === input.opportunity.category)
  const required = form ? requiredFields(form) : []
  const answered = required.filter((f) => {
    const v = input.siteVisit?.values[f.id]
    return v !== undefined && v !== '' && v !== null
  })
  const v = visitVocab(input.opportunity.category)
  const requests = input.siteVisit?.requests ?? []
  const completeRequests = requests.filter(
    (r) =>
      r.serviceType.trim() &&
      r.concernOrOutcome.trim() &&
      r.areaOrEquipment.trim() &&
      r.unit.trim() &&
      r.quantity > 0,
  )
  const visitChecklist = input.checklists.find(
    (c) =>
      input.checklistTemplates?.some(
        (t) => t.id === c.templateId && t.stage === 'site_visit_scheduled',
      ) ||
      ['cl_sales_call_residential', 'cl_site_visit_commercial', 'cl_site_visit_industrial'].includes(
        c.templateId,
      ),
  )
  const checklistDone = visitChecklist?.done.length ?? 0
  const checklistTotal =
    input.checklistTemplates?.find((t) => t.id === visitChecklist?.templateId)?.items.length ??
    (visitChecklist ? visitChecklist.done.length : 0)
  const checklistComplete =
    Boolean(input.siteVisit?.completedAt) ||
    (checklistTotal > 0 && checklistDone >= checklistTotal)
  return [
    {
      id: 'checklist',
      label: `${v.Singular} checklist complete`,
      ok: checklistComplete,
      detail: visitChecklist
        ? `${checklistDone} of ${checklistTotal || checklistDone} items checked`
        : 'Open the visit to start the checklist',
      href: `/opportunities/${input.opportunity.id}/visit`,
    },
    {
      id: 'requests',
      label: 'At least one complete scope request',
      ok: completeRequests.length > 0,
      detail:
        completeRequests.length > 0
          ? `${completeRequests.length} request${completeRequests.length === 1 ? '' : 's'}`
          : 'Add service, area, quantity and unit per request',
      href: `/opportunities/${input.opportunity.id}/visit`,
    },
    {
      id: 'form',
      label: `Guided ${v.singular} form completed`,
      ok: required.length > 0 && answered.length === required.length,
      detail:
        required.length === 0
          ? 'No required fields configured in Setup'
          : `${answered.length} of ${required.length} required fields answered`,
      href: `/opportunities/${input.opportunity.id}/visit`,
    },
    ...(input.opportunity.category === 'residential'
      ? []
      : [
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
        ]),
    {
      id: 'measure',
      label: 'Measurements recorded',
      ok: input.opportunity.estimatedQuantity > 0 || completeRequests.some((r) => r.quantity > 0),
      detail:
        input.opportunity.estimatedQuantity > 0
          ? `${input.opportunity.estimatedQuantity.toLocaleString()} total units across requests`
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
      detail: input.opportunity.estimatorId
        ? 'Assigned'
        : 'Assignment missing — select an estimator on the estimate',
      href: `/estimate/${input.opportunity.id}`,
    },
    {
      id: 'estimation_request',
      label: 'Estimation request sent (approval pending or approved)',
      ok: Boolean(est && ['pending_approval', 'approved', 'sent', 'signed'].includes(est.status)),
      detail:
        est?.status === 'pending_approval'
          ? 'Approval pending'
          : est && ['approved', 'sent', 'signed'].includes(est.status)
            ? `Status: ${est.status.replace(/_/g, ' ')}`
            : 'Complete the estimate and send the estimation request',
      href: `/estimate/${input.opportunity.id}`,
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
