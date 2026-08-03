/* ==========================================================================
   Domain types
   ==========================================================================
   The shape here answers the central complaint from discovery: "I really
   don't want a contact spot and a deal spot. I want one name that
   everything lives in."

   So there is ONE spine —

     Location → Account → Opportunity → { Estimate, Job, Material, Invoice }

   — and Prospect/Contact are not separate tables, they are simply the first
   two STAGES an Account-backed record can occupy. Residential collapses
   Account and Opportunity to 1:1; commercial and industrial fan one Account
   out to many Opportunities (the "one brand, ten projects" case).
   ========================================================================== */

export type Role =
  | 'franchisor'
  | 'owner'
  | 'sales'
  | 'estimator'
  | 'pm'
  | 'crew_leader'
  | 'tech'
  | 'accounting'

export const ROLE_LABEL: Record<Role, string> = {
  franchisor: 'Franchisor Admin',
  owner: 'Location Admin',
  sales: 'Sales Rep',
  estimator: 'Estimator / Head of Projects',
  pm: 'Project Manager',
  crew_leader: 'Crew Leader',
  tech: 'Field Technician',
  accounting: 'Accounting',
}

export type Category = 'residential' | 'commercial' | 'industrial'

export type StageGroup =
  | 'pre'
  | 'sales'
  | 'estimating'
  | 'stalled'
  | 'won'
  | 'lost'

/**
 * Pre = customer workspace anchors. Sales = opportunity pipeline.
 * Job progress lives on Job.status — not on the opportunity stage.
 */
export type Phase = 'pre' | 'sales'

/** Lead urgency — a field on the opportunity, never a pipeline stage. */
export type LeadTemperature = 'hot' | 'warm' | 'cold'

export const TEMPERATURE_LABEL: Record<LeadTemperature, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
}

/**
 * Sales (and pre) stages on the Opportunity. After Awarded, operational
 * progress moves to Job.status so the sales board stays short.
 */
export type StageId =
  | 'prospect'
  | 'contact'
  | 'new_lead'
  | 'contacted'
  | 'qualified'
  | 'site_visit_required'
  | 'site_visit_scheduled'
  | 'site_visit_completed'
  | 'estimate_in_progress'
  | 'estimate_ready'
  | 'proposal_sent'
  | 'follow_up'
  | 'delayed'
  | 'awarded'
  | 'lost'

/** Job workflow — Awarded through Paid. Managed in the Jobs module. */
export type JobStatus =
  | 'scheduling_required'
  | 'scheduled'
  | 'material_required'
  | 'material_ordered'
  | 'ready_to_start'
  | 'in_progress'
  | 'on_hold'
  | 'completion_review'
  | 'completed'
  | 'ready_to_invoice'
  | 'invoiced'
  | 'paid'

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  scheduling_required: 'Scheduling Required',
  scheduled: 'Scheduled',
  material_required: 'Material Required',
  material_ordered: 'Material Ordered',
  ready_to_start: 'Ready to Start',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completion_review: 'Completion Review',
  completed: 'Completed',
  ready_to_invoice: 'Ready to Invoice',
  invoiced: 'Invoiced',
  paid: 'Paid',
}

/** A requirement that must be satisfied to ENTER a stage. */
export type Gate =
  | { kind: 'checklist'; templateId: string; label: string; blocking: boolean }
  | { kind: 'approval'; role: Role; label: string; blocking: boolean }
  | { kind: 'reminder'; label: string; helper: string; blocking: boolean }
  | { kind: 'assign'; role: Role; label: string; blocking: boolean }
  | { kind: 'attach'; label: string; helper: string; blocking: boolean }
  | { kind: 'confirm'; label: string; helper: string; blocking: boolean }
  /** Verified against real record state rather than a user ticking a box. */
  | { kind: 'readiness'; label: string; helper: string; blocking: boolean }
  | { kind: 'reason'; label: string; helper: string; blocking: boolean }

export interface StageDef {
  id: StageId
  label: string
  /** Residential says "sales call" where commercial/industrial says "site visit". */
  labelByCategory?: Partial<Record<Category, string>>
  group: StageGroup
  phase: Phase
  /** Shown in the gate modal as the "why am I being asked this" line. */
  purpose: string
  /** Fired when a record lands here. This is the pipeline-as-control-plane. */
  gates: Gate[]
  notify: { role: Role; message: string }[]
  /** Anchor stages hold Accounts, not Opportunities. */
  isAnchor?: boolean
  /** Terminal stages sit outside the default flow. */
  isTerminal?: boolean
  probability: number
}

export type Vertical =
  | 'Food & Beverage'
  | 'Industrial'
  | 'Hospitality'
  | 'Retail'
  | 'Aerospace'
  | 'Warehouse'
  | 'Institutional'
  | 'Traffic & Parking'
  | 'Showrooms'
  | 'Education'
  | 'Pharmaceutical'
  | 'Office Space'
  | 'Commercial'
  | 'Residential'

export interface Location {
  id: string
  name: string
  city: string
  state: string
  /** Zip prefixes owned by this territory — drives inbound lead routing. */
  zips: string[]
  ownerId: string
  openedAt: string
  isCorporate: boolean
  /** Location-specific price multiplier applied over franchisor base pricing. */
  priceMultiplier: number
}

export interface User {
  id: string
  name: string
  role: Role
  title: string
  locationId: string | null
}

export interface Account {
  id: string
  name: string
  vertical: Vertical
  locationId: string
  contactName: string
  contactTitle: string
  email: string
  phone: string
  city: string
  state: string
  zip: string
  isNational: boolean
  source: LeadSource
  createdAt: string
  /**
   * Accounts live in the board's first two columns. Pulling an Opportunity
   * out of an Account does NOT remove the Account from its column — it stays
   * put, exactly as described in discovery.
   */
  anchorStage: 'prospect' | 'contact'
  /** Set when the account arrived via a prospecting import. */
  prospectRequestId?: string
  lastActivityAt?: string
}

export type LeadSource =
  | 'Apollo'
  | 'National Website'
  | 'Location Website'
  | 'Ad Campaign'
  | 'Phone-in'
  | 'Email'
  | 'Referral'
  | 'Manual Entry'
  | 'Repeat'

/* ---- Prospecting ------------------------------------------------------- */

export interface ProspectRequest {
  id: string
  locationId: string
  requestedById: string
  requestedAt: string
  vertical: Vertical
  radiusMiles: number
  originCity: string
  minEmployees: number
  targetTitles: string[]
  estimatedCount: number
  status: 'draft' | 'pending_approval' | 'approved' | 'importing' | 'imported' | 'rejected'
  approvedById: string | null
  approvedAt: string | null
  importedCount: number
  /** Franchisor-set allowance, so prospecting spend stays governed. */
  creditCost: number
}

/* ---- Site visit -------------------------------------------------------- */

export type FieldType = 'text' | 'number' | 'select' | 'boolean' | 'longtext' | 'photo'

export interface SiteVisitField {
  id: string
  label: string
  type: FieldType
  unit?: string
  options?: string[]
  helper?: string
  required: boolean
  /** Drives estimating downstream, so it is worth flagging in the UI. */
  feedsEstimate?: boolean
}

export interface SiteVisitForm {
  id: string
  name: string
  category: Category
  sections: { id: string; title: string; fields: SiteVisitField[] }[]
}

export interface SiteVisitResponse {
  opportunityId: string
  formId: string
  values: Record<string, string | number | boolean>
  completedAt: string | null
  completedById: string | null
}

/* ---- Artifacts --------------------------------------------------------- */

export type ArtifactKind = 'photo' | 'doc' | 'plan' | 'note' | 'form' | 'signature' | 'map'

export interface Artifact {
  id: string
  opportunityId: string
  kind: ArtifactKind
  name: string
  /** The stage this landed at — lets downstream stages show what they INHERIT. */
  stageAdded: StageId
  addedById: string
  addedAt: string
  meta?: string
  body?: string
  /** Internal artifacts are never exposed on the customer proposal. */
  internal?: boolean
  /** before | progress | after — the required photo discipline. */
  photoPhase?: 'before' | 'progress' | 'after'
}

/* ---- Checklists -------------------------------------------------------- */

export interface ChecklistItem {
  id: string
  label: string
  helper?: string
}

export interface ChecklistTemplate {
  id: string
  name: string
  category?: Category
  /** Fired when an opportunity or job reaches this status. */
  stage: StageId | JobStatus
  /** Franchisor-controlled templates are locked at the location. */
  managedByFranchisor: boolean
  items: ChecklistItem[]
}

export interface ChecklistInstance {
  id: string
  templateId: string
  opportunityId: string
  done: string[]
  completedAt: string | null
}

/* ---- Price book -------------------------------------------------------- */

export interface PriceBookItem {
  id: string
  name: string
  system: string
  unit: 'sq ft' | 'lin ft' | 'ea'
  unitPrice: number
  description: string
  categories: Category[]
  swatch: string
  /* Everything below is what auto-populates when the system is selected. */
  coats: number
  /** Material units consumed per unit of measure, per coat. Zero = no orderable material. */
  coveragePerUnit: number
  materialUnit: string
  /** Franchisor list cost of one material unit, used for the order value. */
  materialCost: number
  wasteAllowance: number
  labourHoursPerUnit: number
  specSheet: string
  installChecklistId: string
  loadList: string[]
  exclusions: string[]
  /** Franchisor-managed items cannot be edited at the location. */
  managedByFranchisor: boolean
}

export interface LineItem {
  id: string
  priceBookId: string
  name: string
  description: string
  qty: number
  unit: string
  unitPrice: number
}

export interface EstimateOption {
  id: string
  /** Either a distinct AREA of the facility, or a price/quality ALTERNATIVE. */
  label: string
  kind: 'area' | 'alternative'
  recommended: boolean
  lineItems: LineItem[]
  /** Set when the customer picks between alternatives on the proposal. */
  selectedByCustomer?: boolean
}

export interface Estimate {
  id: string
  opportunityId: string
  options: EstimateOption[]
  templateId: string
  internalNotes: string
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'signed' | 'declined'
  approvedById: string | null
  approvedAt: string | null
  rejectionNote: string | null
  sentAt: string | null
  signedAt: string | null
  signedBy: string | null
  /** Public token for the customer-facing proposal link. */
  token: string
  depositPct: number
}

export interface ProposalTemplate {
  id: string
  name: string
  terms: string
  exclusions: string[]
  depositPct: number
  validDays: number
  managedByFranchisor: boolean
}

/* ---- AI takeoff -------------------------------------------------------- */

export interface Takeoff {
  id: string
  opportunityId: string
  fileName: string
  pageCount: number
  status: 'uploaded' | 'analysing' | 'ready' | 'accepted'
  relevantPages: { page: number; sheet: string; reason: string }[]
  areas: { id: string; name: string; sqft: number; coveLf: number; specifiedFinish: string }[]
  recommendedSystemId: string
  confidence: number
  notes: string
}

/* ---- Operations -------------------------------------------------------- */

export interface MaterialLine {
  id: string
  priceBookId: string
  product: string
  qty: number
  unit: string
  derivation: string
  adjusted: boolean
}

export interface MaterialOrder {
  id: string
  opportunityId: string
  lines: MaterialLine[]
  status: 'draft' | 'submitted' | 'approved' | 'shipped' | 'delivered'
  submittedAt: string | null
  neededBy: string
  /** Franchise Management System reference — the cross-product handoff. */
  fmsOrderId: string | null
  trackingRef: string | null
}

export interface Job {
  id: string
  opportunityId: string
  status: JobStatus
  start: string
  end: string
  crewLeaderId: string | null
  pmId: string | null
  crewIds: string[]
  progress: number
  dailyLogs: { id: string; date: string; note: string; byId: string }[]
}

export interface ChangeOrder {
  id: string
  opportunityId: string
  description: string
  qty: number
  unit: string
  amount: number
  raisedById: string
  raisedAt: string
  status: 'pending' | 'customer_approved' | 'rejected'
  scheduleImpactDays: number
  internalNote: string
  photoIds: string[]
}

export interface Issue {
  id: string
  opportunityId: string
  title: string
  detail: string
  severity: 'low' | 'medium' | 'high'
  raisedById: string
  raisedAt: string
  status: 'open' | 'resolved'
}

/* ---- Money ------------------------------------------------------------- */

export type InvoiceKind = 'deposit' | 'progress' | 'final' | 'change_order'

export interface Payment {
  id: string
  amount: number
  receivedAt: string
  method: 'Check' | 'ACH' | 'Card'
}

export interface Invoice {
  id: string
  opportunityId: string
  number: string
  kind: InvoiceKind
  amount: number
  status: 'draft' | 'sent' | 'partial' | 'paid'
  issuedAt: string | null
  dueAt: string | null
  quickbooksId: string | null
  payments: Payment[]
}

export interface Reminder {
  id: string
  opportunityId: string
  dueAt: string
  note: string
  ownerId: string
  done: boolean
  reason?: string
  expectedPeriod?: string
}

export interface Activity {
  id: string
  opportunityId: string
  at: string
  actorId: string
  kind: 'stage' | 'note' | 'artifact' | 'system' | 'checklist' | 'money' | 'issue'
  text: string
}

export interface Opportunity {
  id: string
  code: string
  name: string
  accountId: string
  locationId: string
  category: Category
  stage: StageId
  /** Urgency / likelihood — independent of pipeline stage. */
  temperature: LeadTemperature
  /** Sales rep. */
  ownerId: string
  estimatorId: string | null
  pmId: string | null
  value: number
  sqft: number
  coveLf: number
  address: string
  zip: string
  createdAt: string
  stageEnteredAt: string
  systemIds: string[]
  reminderAt: string | null
  source: LeadSource
  /** Scheduled sales call / site visit, set at qualification. */
  visitAt: string | null
  lostReason?: string
}
