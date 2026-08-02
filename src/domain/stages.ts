import type { Category, Phase, StageDef, StageGroup, StageId } from './types'

/* ==========================================================================
   The stage machine
   ==========================================================================
   This file IS the product thesis, expressed as data:

     "The pipeline itself could kind of be the control of the whole thing,
      and then each time it moves, it's new notifications, new checklists
      that it populates, new resources."

   Nothing in the UI hard-codes a stage. The board, the gate modal, the
   record timeline, the calendar, the dashboards and the reporting rollup
   all read from this array. Adding a stage is a data edit, not a code
   change.

   Three phases. The system separates sales from operations for permissions
   and board legibility, but the record page renders all 22 stages as one
   continuous journey.
   ========================================================================== */

export const STAGES: StageDef[] = [
  /* ====================== PRE-PIPELINE ================================== */
  {
    id: 'prospect',
    label: 'Prospects',
    group: 'pre',
    phase: 'pre',
    isAnchor: true,
    probability: 0,
    purpose:
      'A company we want to work with, but there is no active interest or opportunity yet. Imported in bulk from a prospecting request.',
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
    id: 'unqualified_lead',
    label: 'Unqualified Lead',
    group: 'sales',
    phase: 'sales',
    probability: 10,
    purpose:
      'An inbound enquiry from the national site, a location site, an ad, a phone call, an email or a referral. Routed to a territory but nobody has spoken to them yet.',
    gates: [
      { kind: 'confirm', label: 'Confirm project category', helper: 'Residential, commercial or industrial — this decides which checklist and vocabulary the rep receives.', blocking: true },
      { kind: 'assign', role: 'sales', label: 'Assign a sales representative', blocking: true },
    ],
    notify: [{ role: 'sales', message: 'New lead assigned to you — make first contact within 24 hours' }],
  },
  {
    id: 'qualified_lead',
    label: 'Qualified Lead',
    group: 'sales',
    phase: 'sales',
    probability: 25,
    purpose:
      'We reached the customer, confirmed genuine intent, budget authority and scope. Ready to put a visit on the calendar.',
    gates: [
      { kind: 'confirm', label: 'Confirm decision maker and budget authority', helper: '', blocking: true },
    ],
    notify: [],
  },
  {
    id: 'site_visit_scheduled',
    label: 'Site Visit Scheduled',
    labelByCategory: { residential: 'Sales Call Scheduled' },
    group: 'sales',
    phase: 'sales',
    probability: 35,
    purpose:
      'The appointment is booked and on the rep’s calendar. The correct guided form is generated now, so it is waiting on their phone when they arrive.',
    gates: [
      { kind: 'confirm', label: 'Book the appointment on the rep calendar', helper: 'Generates the category-specific guided form and sends a reminder the day before.', blocking: true },
    ],
    notify: [{ role: 'sales', message: 'Visit booked — your guided form and photo list are ready on mobile' }],
  },
  {
    id: 'site_visit_complete',
    label: 'Site Visit Completed',
    labelByCategory: { residential: 'Sales Call Completed' },
    group: 'sales',
    phase: 'sales',
    probability: 45,
    purpose:
      'Measurements, conditions, testing, photos and plans are captured on the record. Nothing here should ever be re-entered by anyone downstream.',
    gates: [
      { kind: 'readiness', label: 'Guided site visit form completed', helper: 'Every required field answered on the mobile form.', blocking: true },
      { kind: 'readiness', label: 'Site photos attached', helper: 'Existing building → photos. New build → architectural plans.', blocking: true },
    ],
    notify: [{ role: 'estimator', message: 'Site visit complete — ready for estimating' }],
  },
  {
    id: 'estimating',
    label: 'Estimating',
    group: 'estimating',
    phase: 'sales',
    probability: 55,
    purpose:
      'The estimator selects the floor system and builds the estimate off the price book, working from the site visit data rather than a phone call.',
    gates: [
      { kind: 'assign', role: 'estimator', label: 'Assign an estimator', blocking: true },
      { kind: 'confirm', label: 'Select the floor system', helper: 'Pulls the spec sheet, material requirements, labour assumptions, install checklist, load list and exclusions automatically.', blocking: true },
    ],
    notify: [{ role: 'estimator', message: 'Estimate assigned — site visit data and photos are attached' }],
  },
  {
    id: 'internal_approval',
    label: 'Internal Approval',
    group: 'estimating',
    phase: 'sales',
    probability: 60,
    purpose:
      'Nothing goes to a customer until the record is provably complete and someone senior has signed off on scope and margin.',
    gates: [
      { kind: 'readiness', label: 'All required information present', helper: 'Site visit form, photos, measurements, estimate lines, margin and terms are verified against the record — not ticked by hand.', blocking: true },
      { kind: 'approval', role: 'estimator', label: 'Head of Projects approval', blocking: true },
    ],
    notify: [{ role: 'estimator', message: 'Estimate awaiting your approval' }],
  },
  {
    id: 'proposal_delivered',
    label: 'Proposal Delivered',
    group: 'estimating',
    phase: 'sales',
    probability: 70,
    purpose:
      'The customer has a secure proposal link with pricing options, terms, deposit and electronic signature. Internal notes are never on it.',
    gates: [
      { kind: 'confirm', label: 'Send the secure proposal link', helper: 'Customer can review options, select one, accept and sign.', blocking: true },
    ],
    notify: [{ role: 'sales', message: 'Proposal delivered — follow-up cadence started' }],
  },
  {
    id: 'follow_up',
    label: 'Follow-up Required',
    group: 'stalled',
    phase: 'sales',
    probability: 65,
    purpose:
      'The proposal is out and the customer has gone quiet or is negotiating. This is where reps should be working hardest.',
    gates: [
      { kind: 'reminder', label: 'Set your next follow-up date', helper: 'You cannot leave this screen without one.', blocking: true },
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
      'Budget pushed or the project postponed. These are the six-figure jobs that quietly disappear because nobody set a reminder.',
    gates: [
      { kind: 'reason', label: 'Record the delay reason', helper: 'Budget cycle, ownership change, scope change, permitting or competitor.', blocking: true },
      { kind: 'confirm', label: 'Record the expected project period', helper: 'When does the customer expect to revisit this?', blocking: true },
      { kind: 'reminder', label: 'Set a mandatory follow-up date', helper: 'If the customer says 2029, set it for mid-2028. This gate is blocking by design — the record cannot move without a date.', blocking: true },
    ],
    notify: [{ role: 'owner', message: 'Project delayed — follow-up scheduled, opportunity retained in nurture' }],
  },
  {
    id: 'awarded',
    label: 'Awarded',
    group: 'won',
    phase: 'sales',
    probability: 100,
    purpose:
      'The customer accepted and signed. The record now crosses from the sales pipeline into operations.',
    gates: [
      { kind: 'readiness', label: 'Signed proposal on file', helper: 'Electronic signature captured from the customer proposal link.', blocking: true },
    ],
    notify: [
      { role: 'pm', message: 'Project awarded — scheduling required' },
      { role: 'accounting', message: 'Project awarded — deposit invoice can be raised' },
      { role: 'franchisor', message: 'Awarded project recorded in the network rollup' },
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
      { kind: 'reason', label: 'Record the reason lost', helper: 'Price, timing, competitor, scope or no decision. Feeds the win-rate report.', blocking: true },
    ],
    notify: [],
  },

  /* ==================== OPERATIONS PIPELINE ============================= */
  {
    id: 'scheduling_required',
    label: 'Scheduling Required',
    group: 'execution',
    phase: 'operations',
    probability: 100,
    purpose:
      'Signed work with no dates against it. Awarded jobs sitting here unscheduled is the single most common failure point in the current process.',
    gates: [
      { kind: 'assign', role: 'pm', label: 'Assign a project manager', blocking: true },
    ],
    notify: [{ role: 'pm', message: 'New awarded project needs dates and a crew' }],
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    group: 'execution',
    phase: 'operations',
    probability: 100,
    purpose: 'Installation dates are set and a crew leader is committed.',
    gates: [
      { kind: 'confirm', label: 'Set the installation dates', helper: 'Multi-day projects block the crew for the full duration and surface conflicts.', blocking: true },
      { kind: 'assign', role: 'crew_leader', label: 'Assign a crew leader', blocking: true },
    ],
    notify: [
      { role: 'crew_leader', message: 'Job assigned — scope, photos, plans and specs are attached' },
      { role: 'tech', message: 'You are scheduled on a new installation' },
    ],
  },
  {
    id: 'material_required',
    label: 'Material Required',
    group: 'execution',
    phase: 'operations',
    probability: 100,
    purpose:
      'Material requirements are calculated from the sold system, area, cove, coats and waste allowance, then ordered from the franchisor.',
    gates: [
      { kind: 'readiness', label: 'Material order submitted to the franchisor', helper: 'Generated from the estimate, adjustable by the project manager, routed to the Franchise Management System.', blocking: true },
    ],
    notify: [{ role: 'franchisor', message: 'Material order received from a location' }],
  },
  {
    id: 'ready_install',
    label: 'Ready for Installation',
    group: 'execution',
    phase: 'operations',
    probability: 100,
    purpose:
      'Every precondition for the crew to succeed is verified. The crew inherits everything sales and estimating captured — they never have to ask for it.',
    gates: [
      { kind: 'readiness', label: 'Project preparation complete', helper: 'Material delivered, crew assigned, specs, plans, install map, photos and customer expectations all present on the record.', blocking: true },
    ],
    notify: [{ role: 'crew_leader', message: 'Job is ready — all documentation is on your mobile job sheet' }],
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    group: 'execution',
    phase: 'operations',
    probability: 100,
    purpose: 'Crew is on site. The daily photo log builds the record from messy floor to finished floor.',
    gates: [
      { kind: 'readiness', label: 'Before photos captured', helper: 'The floor as found, before any prep begins.', blocking: true },
    ],
    notify: [{ role: 'pm', message: 'Installation started — daily log is open' }],
  },
  {
    id: 'completion_review',
    label: 'Completion Review',
    group: 'closed',
    phase: 'operations',
    probability: 100,
    purpose:
      'The system asks the closeout questions rather than relying on someone remembering. This is where missed change orders currently cost money.',
    gates: [
      { kind: 'checklist', templateId: 'cl_closeout', label: 'Complete the closeout checklist', blocking: true },
      { kind: 'readiness', label: 'After photos captured', helper: 'Same angles as the before shots.', blocking: true },
      { kind: 'readiness', label: 'Customer sign-off captured', helper: 'Electronic completion sign-off from the customer.', blocking: true },
    ],
    notify: [{ role: 'accounting', message: 'Project complete — confirm change orders before invoicing' }],
  },
  {
    id: 'ready_invoice',
    label: 'Ready to Invoice',
    group: 'closed',
    phase: 'operations',
    probability: 100,
    purpose:
      'Accounting confirms final quantities and any approved change orders, then raises the final invoice.',
    gates: [
      { kind: 'confirm', label: 'Confirm final quantities and change orders', helper: 'Approved change orders are added to the final invoice automatically.', blocking: true },
    ],
    notify: [{ role: 'accounting', message: 'Ready to invoice' }],
  },
  {
    id: 'invoiced',
    label: 'Invoiced',
    group: 'closed',
    phase: 'operations',
    probability: 100,
    purpose: 'Invoice raised and synchronised with QuickBooks. Royalty accrues on gross at 5%.',
    gates: [
      { kind: 'readiness', label: 'Final invoice synced to QuickBooks', helper: 'Includes base contract plus approved change orders, less any deposit already received.', blocking: true },
    ],
    notify: [{ role: 'franchisor', message: 'Invoice issued — 5% royalty accrued' }],
  },
  {
    id: 'paid',
    label: 'Paid and Closed',
    group: 'closed',
    phase: 'operations',
    probability: 100,
    purpose:
      'QuickBooks reports the balance settled and the record closes itself. Nobody marks this by hand.',
    gates: [
      { kind: 'readiness', label: 'Balance settled in full', helper: 'Payment status flows back from QuickBooks.', blocking: true },
    ],
    notify: [{ role: 'owner', message: 'Payment received in full — project closed' }],
  },
]

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<
  StageId,
  StageDef
>

export const BOARD_STAGES: StageId[] = STAGES.map((s) => s.id)

export const PHASE_LABEL: Record<Phase, string> = {
  pre: 'Pre-pipeline',
  sales: 'Sales pipeline',
  operations: 'Operations pipeline',
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
  execution: 'Execution',
  closed: 'Closed',
  lost: 'Lost',
}

/**
 * Residential says "sales call" where commercial and industrial say "site
 * visit". Same stage, same machinery, different vocabulary — using the wrong
 * word in front of a homeowner is how reps lose trust in a tool.
 */
export function stageLabel(stage: StageId, category?: Category): string {
  const def = STAGE_BY_ID[stage]
  if (!def) return stage
  if (category && def.labelByCategory?.[category]) return def.labelByCategory[category]!
  return def.label
}

export function stageGroup(stage: StageId): StageGroup {
  return STAGE_BY_ID[stage]?.group ?? 'pre'
}

export function stagePhase(stage: StageId): Phase {
  return STAGE_BY_ID[stage]?.phase ?? 'pre'
}

/** Layer-3 token lookup. Components never touch hex values. */
export function stageVar(stage: StageId, part: 'solid' | 'soft' | 'text'): string {
  return `var(--stage-${stageGroup(stage)}-${part})`
}

export function stageIndex(stage: StageId): number {
  return BOARD_STAGES.indexOf(stage)
}

/** The next stage in the happy path, skipping the stalled and lost branches. */
export function nextStage(stage: StageId): StageId | null {
  const skip: StageId[] = ['follow_up', 'delayed', 'lost']
  let i = stageIndex(stage) + 1
  while (i < BOARD_STAGES.length && skip.includes(BOARD_STAGES[i])) i++
  return BOARD_STAGES[i] ?? null
}
