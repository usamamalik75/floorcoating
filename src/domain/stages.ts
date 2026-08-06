import type { Category, JobStatus, Phase, SalesPipeline, StageDef, StageGroup, StageId } from './types'
import { JOB_STATUS_LABEL } from './types'

/* ==========================================================================
   The stage machine
   ==========================================================================
   Modules represent types of work. Statuses represent progress. The pipeline
   coordinates the journey.

   Opportunity.stage  = sales (lead → awarded / lost)
   Job.status         = operations (scheduling → completed)
   ========================================================================== */

export const STAGES: StageDef[] = [
  /* ====================== PRE (customer workspace) ====================== */
  {
    id: 'prospect',
    label: 'Prospects',
    group: 'pre',
    phase: 'pre',
    isAnchor: true,
    probability: 0,
    purpose:
      'A company we want to work with, but there is no active interest or opportunity yet. Imported from an external source or added manually.',
    gates: [],
    notify: [],
  },
  {
    id: 'contact',
    label: 'Contacts / Accounts',
    group: 'pre',
    phase: 'pre',
    isAnchor: true,
    probability: 5,
    purpose:
      'Someone we have actually spoken to, or have worked with before. Opportunities are created off an Account and the Account stays here.',
    gates: [],
    notify: [],
  },

  /* ====================== SALES PIPELINE ================================ */
  {
    id: 'new_lead',
    label: 'New Lead',
    group: 'sales',
    phase: 'sales',
    probability: 10,
    purpose:
      'An inbound enquiry from the national site, a location site, an ad, a phone call, an email or a referral. Routed to a territory but nobody has spoken to them yet.',
    gates: [
      {
        kind: 'confirm',
        label: 'Confirm project category',
        helper: 'Residential, commercial or industrial — this decides which checklist and vocabulary the rep receives.',
        blocking: true,
      },
      { kind: 'assign', role: 'sales', label: 'Assign a sales representative', blocking: true },
    ],
    notify: [{ role: 'sales', message: 'New lead assigned to you — make first contact within 24 hours' }],
  },
  {
    id: 'contacted',
    label: 'Contacted',
    group: 'sales',
    phase: 'sales',
    probability: 15,
    purpose: 'First contact made. Still qualifying intent, budget and decision-maker.',
    gates: [
      { kind: 'confirm', label: 'Log the outcome of first contact', helper: '', blocking: true },
    ],
    notify: [],
  },
  {
    id: 'qualified',
    label: 'Qualified',
    group: 'sales',
    phase: 'sales',
    probability: 25,
    purpose:
      'Genuine intent, budget authority and scope confirmed. Next action is usually a site visit.',
    gates: [
      {
        kind: 'confirm',
        label: 'Confirm decision maker and budget authority',
        helper: '',
        blocking: true,
      },
    ],
    notify: [],
  },
  {
    id: 'site_visit_required',
    label: 'Site Visit Required',
    labelByCategory: { residential: 'Sales Call Required' },
    group: 'sales',
    phase: 'sales',
    probability: 30,
    purpose:
      'A site visit is needed before estimating. Status only — set the appointment time when you move to Scheduled.',
    gates: [
      {
        kind: 'confirm',
        label: 'Confirm a site visit is required',
        helper: 'No form or date yet. Next: schedule the appointment time.',
        blocking: true,
      },
    ],
    notify: [{ role: 'sales', message: 'Site visit required — set the appointment time to schedule' }],
  },
  {
    id: 'site_visit_scheduled',
    label: 'Site Visit Scheduled',
    labelByCategory: { residential: 'Sales Call Scheduled' },
    group: 'sales',
    phase: 'sales',
    probability: 35,
    purpose:
      'Set the appointment date and time. The guided form opens here — fill it now or during the visit, then mark completed.',
    gates: [
      {
        kind: 'appointment',
        label: 'Set appointment date & time',
        helper: 'Required to move into Scheduled. Creates the guided form for this opportunity.',
        blocking: true,
      },
    ],
    notify: [{ role: 'sales', message: 'Visit booked — open the guided form anytime before or during the visit' }],
  },
  {
    id: 'site_visit_completed',
    label: 'Site Visit Completed',
    labelByCategory: { residential: 'Sales Call Completed' },
    group: 'sales',
    phase: 'sales',
    probability: 45,
    purpose:
      'The guided form must be fully completed (checklist, scope, and required fields) before this stage.',
    gates: [
      {
        kind: 'readiness',
        label: 'Guided site visit form completed',
        helper: 'Checklist, scope requests, and all required fields must be done. Commercial also needs photos or plans.',
        blocking: true,
      },
    ],
    notify: [{ role: 'estimator', message: 'Site visit complete — ready for estimating' }],
  },
  {
    id: 'estimate_in_progress',
    label: 'Estimate In Progress',
    group: 'estimating',
    phase: 'sales',
    probability: 55,
    purpose:
      'Creates or opens a draft Estimate. Detailed work happens in the Estimates module.',
    gates: [
      { kind: 'assign', role: 'estimator', label: 'Assign an estimator', blocking: true },
      {
        kind: 'confirm',
        label: 'Select products and services',
        helper: 'Pulls the spec sheet, resource requirements, labour assumptions, install checklist, load list and exclusions automatically.',
        blocking: true,
      },
    ],
    notify: [{ role: 'estimator', message: 'Estimate assigned — site visit data and photos are attached' }],
  },
  {
    id: 'estimate_ready',
    label: 'Estimate Ready',
    group: 'estimating',
    phase: 'sales',
    probability: 60,
    purpose:
      'Estimate approved internally. Ready to generate a customer proposal — nothing goes out until the record is complete.',
    gates: [
      {
        kind: 'readiness',
        label: 'All required information present',
        helper: 'Site visit form, photos, measurements, estimate lines, margin and terms are verified against the record.',
        blocking: true,
      },
      { kind: 'approval', role: 'estimator', label: 'Head of Projects approval', blocking: true },
    ],
    notify: [{ role: 'estimator', message: 'Estimate awaiting your approval' }],
  },
  {
    id: 'proposal_sent',
    label: 'Proposal Sent',
    group: 'estimating',
    phase: 'sales',
    probability: 70,
    purpose:
      'Customer has a secure proposal link. Managed in the Proposals module; the pipeline only tracks that it was sent.',
    gates: [
      {
        kind: 'confirm',
        label: 'Send the secure proposal link',
        helper: 'Customer can review options, select one, accept and sign.',
        blocking: true,
      },
    ],
    notify: [{ role: 'sales', message: 'Proposal delivered — follow-up cadence started' }],
  },
  {
    id: 'follow_up',
    label: 'Follow-up',
    group: 'stalled',
    phase: 'sales',
    probability: 65,
    purpose: 'Proposal is out; customer is quiet or negotiating.',
    gates: [
      {
        kind: 'reminder',
        label: 'Set your next follow-up date',
        helper: 'You cannot leave this screen without one.',
        blocking: true,
      },
    ],
    notify: [{ role: 'sales', message: 'Follow-up due — this proposal is still open' }],
  },
  {
    id: 'delayed',
    label: 'Project Delayed',
    group: 'stalled',
    phase: 'sales',
    probability: 20,
    purpose:
      'Budget pushed or project postponed. Must not disappear — reason, period and follow-up are required.',
    gates: [
      {
        kind: 'reason',
        label: 'Record the delay reason',
        helper: 'Budget cycle, ownership change, scope change, permitting or competitor.',
        blocking: true,
      },
      {
        kind: 'confirm',
        label: 'Record the expected project period',
        helper: 'When does the customer expect to revisit this?',
        blocking: true,
      },
      {
        kind: 'reminder',
        label: 'Set a mandatory follow-up date',
        helper: 'If the customer says 2029, set it for mid-2028. Blocking by design.',
        blocking: true,
      },
    ],
    notify: [{ role: 'sales', message: 'Project delayed — follow-up scheduled, opportunity retained in nurture' }],
  },
  {
    id: 'awarded',
    label: 'Sold / Awarded',
    group: 'won',
    phase: 'sales',
    probability: 100,
    purpose:
      'Proposal accepted and signed. The work is sold, the Contact converts into a Customer, and delivery progress moves onto the Job pipeline. This does not mean the full job has been paid yet.',
    gates: [
      {
        kind: 'readiness',
        label: 'Signed proposal on file',
        helper: 'Electronic signature captured from the customer proposal link.',
        blocking: true,
      },
    ],
    notify: [
      { role: 'pm', message: 'Project sold — job created, scheduling required' },
      { role: 'accounting', message: 'Project sold — deposit invoice can be raised if needed' },
    ],
  },
  {
    id: 'lost',
    label: 'Lost',
    group: 'lost',
    phase: 'sales',
    isTerminal: true,
    probability: 0,
    purpose: 'Went to a competitor, was cancelled, or the customer went silent for good.',
    gates: [
      {
        kind: 'reason',
        label: 'Record the reason lost',
        helper: 'Price, timing, competitor, scope or no decision. Feeds the win-rate report.',
        blocking: true,
      },
    ],
    notify: [],
  },
]

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<
  StageId,
  StageDef
>

/** Sales board columns — excludes pre-pipeline anchors (those live in Customers). */
export const SALES_BOARD_STAGES: StageId[] = STAGES.filter((s) => s.phase === 'sales').map((s) => s.id)

export const BOARD_STAGES: StageId[] = STAGES.map((s) => s.id)

export const JOB_STATUSES: JobStatus[] = [
  'scheduling_required',
  'scheduled',
  'procurement_required',
  'procurement_ordered',
  'ready_to_start',
  'in_progress',
  'on_hold',
  'completion_review',
  'completed',
]

export const PHASE_LABEL: Record<Phase, string> = {
  pre: 'Customers',
  sales: 'Sales pipeline',
}

export function stagesInPhase(phase: Phase): StageId[] {
  return STAGES.filter((s) => s.phase === phase).map((s) => s.id)
}

export const GROUP_LABELS: Record<StageGroup, string> = {
  pre: 'Pre-pipeline',
  sales: 'Sales',
  estimating: 'Estimating',
  stalled: 'Stalled',
  won: 'Won',
  lost: 'Lost',
}

export function stageLabel(stage: StageId, category?: Category): string {
  const def = STAGE_BY_ID[stage]
  if (!def) return stage
  if (category && def.labelByCategory?.[category]) return def.labelByCategory[category]!
  return def.label
}

/** Column headers on the Sales board — follows the active pipeline filter. */
export function stageLabelForPipeline(stage: StageId, pipeline: SalesPipeline | 'all'): string {
  if (pipeline === 'residential') return stageLabel(stage, 'residential')
  if (pipeline === 'commercial_industrial') return stageLabel(stage, 'commercial')
  const def = STAGE_BY_ID[stage]
  if (!def) return stage
  if (def.labelByCategory?.residential) {
    return def.label.replace(/^Site Visit/, 'Visit / Call')
  }
  return def.label
}

/**
 * Opportunity hub tab that should open for the current sales stage.
 * Early pipeline → Overview; visit/call → Visits; estimating → Estimates; etc.
 */
export function defaultHubTabForStage(stage: StageId): string {
  switch (stage) {
    case 'site_visit_required':
      // Status only — stay on Overview until the appointment is scheduled.
      return 'overview'
    case 'site_visit_scheduled':
    case 'site_visit_completed':
      return 'visits'
    case 'estimate_in_progress':
    case 'estimate_ready':
      return 'estimates'
    case 'proposal_sent':
    case 'follow_up':
      return 'proposals'
    case 'awarded':
      return 'job'
    default:
      return 'overview'
  }
}

/**
 * Guided sales-call / site-visit form unlocks only after Scheduled.
 * Required (and earlier) stages are status-only — no form yet.
 */
export function isVisitFormAvailable(stage: StageId): boolean {
  switch (stage) {
    case 'prospect':
    case 'contact':
    case 'new_lead':
    case 'contacted':
    case 'qualified':
    case 'site_visit_required':
      return false
    default:
      return true
  }
}

export function stageGroup(stage: StageId): StageGroup {
  return STAGE_BY_ID[stage]?.group ?? 'pre'
}

export function stagePhase(stage: StageId): Phase {
  return STAGE_BY_ID[stage]?.phase ?? 'pre'
}

export function stageVar(stage: StageId, part: 'solid' | 'soft' | 'text'): string {
  return `var(--stage-${stageGroup(stage)}-${part})`
}

export function stageIndex(stage: StageId): number {
  return BOARD_STAGES.indexOf(stage)
}

export function nextStage(stage: StageId): StageId | null {
  const skip: StageId[] = ['follow_up', 'delayed', 'lost']
  let i = stageIndex(stage) + 1
  while (i < BOARD_STAGES.length && skip.includes(BOARD_STAGES[i])) i++
  const next = BOARD_STAGES[i]
  if (!next || STAGE_BY_ID[next]?.phase !== 'sales') return null
  return next
}

export function normalizeJobStatus(status: JobStatus): JobStatus {
  switch (status) {
    case 'ready_to_invoice':
    case 'invoiced':
    case 'paid':
      return 'completed'
    default:
      return status
  }
}

export function jobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_LABEL[normalizeJobStatus(status)]
}

export function jobStatusIndex(status: JobStatus): number {
  return JOB_STATUSES.indexOf(normalizeJobStatus(status))
}

export function nextJobStatus(status: JobStatus): JobStatus | null {
  const current = normalizeJobStatus(status)
  const skip: JobStatus[] = ['on_hold']
  let i = jobStatusIndex(current) + 1
  while (i < JOB_STATUSES.length && skip.includes(JOB_STATUSES[i])) i++
  return JOB_STATUSES[i] ?? null
}

/** Job statuses that map to the execution colour triad. */
export function jobStatusGroup(status: JobStatus): 'execution' | 'closed' | 'stalled' {
  const current = normalizeJobStatus(status)
  if (current === 'on_hold') return 'stalled'
  if (current === 'completion_review' || current === 'completed') {
    return 'closed'
  }
  return 'execution'
}

export function jobStatusVar(status: JobStatus, part: 'solid' | 'soft' | 'text'): string {
  return `var(--stage-${jobStatusGroup(status)}-${part})`
}
