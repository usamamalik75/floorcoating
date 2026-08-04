/* ==========================================================================
   Domain types
   ==========================================================================
   The shape here answers the central complaint from discovery: "I really
   don't want a contact spot and a deal spot. I want one name that
   everything lives in."

   So there is ONE spine —

    Location → Account → Opportunity → { Estimate, Job, Procurement, Invoice }

   — and Prospect/Contact are not separate tables, they are simply the first
   two STAGES an Account-backed record can occupy. Residential collapses
   Account and Opportunity to 1:1; commercial and industrial fan one Account
   out to many Opportunities (the "one brand, ten projects" case).
   ========================================================================== */

export type Role =
  | 'admin'
  | 'owner'
  | 'sales'
  | 'estimator'
  | 'pm'
  | 'crew_leader'
  | 'tech'
  | 'accounting'

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Platform Admin',
  owner: 'Business Owner',
  sales: 'Sales Rep',
  estimator: 'Estimator / Head of Projects',
  pm: 'Project Manager',
  crew_leader: 'Crew Leader',
  tech: 'Installer',
  accounting: 'Accounting',
}

export type Category = 'residential' | 'commercial' | 'industrial'

/**
 * Sales is run as two pipelines in practice:
 * Residential alone, and Commercial + Industrial together.
 * Category still records the finer project type for forms and pricing.
 */
export type SalesPipeline = 'residential' | 'commercial_industrial'

export const SALES_PIPELINE_LABEL: Record<SalesPipeline, string> = {
  residential: 'Residential',
  commercial_industrial: 'Commercial & Industrial',
}

export const CATEGORY_LABEL: Record<Category, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
}

export function salesPipelineOf(category: Category): SalesPipeline {
  return category === 'residential' ? 'residential' : 'commercial_industrial'
}

export function categoriesInPipeline(pipeline: SalesPipeline): Category[] {
  return pipeline === 'residential' ? ['residential'] : ['commercial', 'industrial']
}

/**
 * Field appointment vocabulary follows the sales pipeline:
 * Residential → "sales call"; Commercial & Industrial → "site visit".
 */
export type VisitKind = 'sales_call' | 'site_visit'

export interface VisitVocab {
  kind: VisitKind
  singular: string
  Singular: string
  plural: string
  Plural: string
}

export function visitVocab(category: Category): VisitVocab {
  if (category === 'residential') {
    return {
      kind: 'sales_call',
      singular: 'sales call',
      Singular: 'Sales Call',
      plural: 'sales calls',
      Plural: 'Sales Calls',
    }
  }
  return {
    kind: 'site_visit',
    singular: 'site visit',
    Singular: 'Site Visit',
    plural: 'site visits',
    Plural: 'Site Visits',
  }
}

/** Left-nav / shared module label when both pipelines appear in one list. */
export const VISIT_MODULE_LABEL = 'Visits & Calls'

/** Rewrite copy that defaults to "site visit" for the opportunity's category. */
export function withVisitVocab(text: string, category: Category): string {
  const v = visitVocab(category)
  if (v.kind === 'site_visit') return text
  return text
    .replace(/Site Visits/g, v.Plural)
    .replace(/site visits/g, v.plural)
    .replace(/Site Visit/g, v.Singular)
    .replace(/site visit/g, v.singular)
}

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
  | 'procurement_required'
  | 'procurement_ordered'
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
  procurement_required: 'Material Required',
  procurement_ordered: 'Resources Ordered',
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
  /** Location-specific price multiplier applied over company administrator base pricing. */
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
   * Relationship to the business:
   * - prospect: imported / no open opportunity yet
   * - contact: selling (new lead through proposal)
   * - customer: won (awarded) — Jobs hang off this account
   */
  anchorStage: AccountRelationship
  /** Optional batch reference when imported from an external source. */
  importBatchId?: string
  lastActivityAt?: string
  /** Industry-specific data belongs to configuration, not the core schema. */
  customFields?: Record<string, string | number | boolean>
}

export type AccountRelationship = 'prospect' | 'contact' | 'customer'

export const ACCOUNT_RELATIONSHIP_LABEL: Record<AccountRelationship, string> = {
  prospect: 'Prospect',
  contact: 'Contact',
  customer: 'Customer',
}

export interface ProspectRequest {
  id: string
  locationId: string
  requestedById: string
  vertical: Vertical
  originCity: string
  radiusMiles: number
  minEmployees: number
  estimatedCount: number
  status: 'draft' | 'pending_approval' | 'approved' | 'imported'
}

export type LeadSource =
  | 'External provider'
  | 'National Website'
  | 'Location Website'
  | 'Ad Campaign'
  | 'Phone-in'
  | 'Email'
  | 'Referral'
  | 'Manual Entry'
  | 'Repeat'

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

/** One scoped work request captured on a site visit / sales call. */
export interface ScopeRequest {
  id: string
  serviceType: string
  /** Customer concern or desired outcome. */
  concernOrOutcome: string
  quantity: number
  unit: string
  /** Room, zone, asset, or equipment surface. */
  areaOrEquipment: string
  notes?: string
}

/** Starter line inside a company service template. */
export interface ScopeServiceLineTemplate {
  serviceType: string
  concernOrOutcome: string
  unit: string
  areaOrEquipment: string
  notes?: string
  /** Optional starter quantity; 0 means the rep fills it on site. */
  quantity?: number
}

/**
 * Company template for scope / service lines on a visit — parallel to
 * ChecklistTemplate for the do-this list.
 */
export interface ScopeServiceTemplate {
  id: string
  name: string
  category?: Category
  managedByCompany: boolean
  lines: ScopeServiceLineTemplate[]
}

export const SCOPE_UNITS = ['sq ft', 'lin ft', 'each', 'rooms', 'hours', 'gallons'] as const

export interface SiteVisitResponse {
  opportunityId: string
  formId: string
  values: Record<string, string | number | boolean>
  /** Multiple scope lines — separate from the do-this checklist. */
  requests: ScopeRequest[]
  /** Selected company service template that seeded the request lines. */
  serviceTemplateId?: string | null
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
  /** Company administrator-controlled templates are locked at the location. */
  managedByCompany: boolean
  items: ChecklistItem[]
}

export interface ChecklistInstance {
  id: string
  templateId: string
  opportunityId: string
  /**
   * Working copy for this opportunity. Starts from the selected template;
   * the user can add or remove items without changing the company template.
   * When omitted, UI falls back to the template items (job checklists).
   */
  items?: ChecklistItem[]
  done: string[]
  completedAt: string | null
}

/* ---- Price book -------------------------------------------------------- */

export interface PriceBookItem {
  id: string
  name: string
  catalogueGroup: string
  unit: string
  unitPrice: number
  description: string
  categories: Category[]
  swatch: string
  /* Everything below auto-populates when a catalogue item is selected. */
  resourceMultiplier: number
  /** Material units consumed per quoted unit. Zero means no orderable resource. */
  materialRate: number
  materialUnit: string
  /** Company cost of one resource unit, used for estimated job cost. */
  materialCost: number
  contingencyAllowance: number
  laborHoursPerUnit: number
  serviceDocument: string
  jobChecklistId: string
  requiredResources: string[]
  exclusions: string[]
  /** Company-managed items cannot be edited at a location. */
  managedByCompany: boolean
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
  /** Either a distinct scope section or a price/quality alternative. */
  label: string
  kind: 'scope' | 'alternative'
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
  /** Category estimating-pack reminders the estimator has acknowledged. */
  estimateRemindersDone?: string[]
  /** AI / rules suggested floor-system price book id. */
  suggestedPriceBookId?: string | null
  suggestionDecision?: 'pending' | 'accepted' | 'overridden' | 'dismissed'
}

export interface ProposalTemplate {
  id: string
  name: string
  terms: string
  exclusions: string[]
  depositPct: number
  validDays: number
  managedByCompany: boolean
}

/* ---- Document-assisted scope extraction ------------------------------- */

export interface ScopeExtraction {
  id: string
  opportunityId: string
  fileName: string
  pageCount: number
  status: 'uploaded' | 'analysing' | 'ready' | 'accepted'
  relevantPages: { page: number; sheet: string; reason: string }[]
  sections: { id: string; name: string; estimatedQuantity: number; secondaryQuantity: number; specification: string }[]
  recommendedCatalogItemId: string
  confidence: number
  notes: string
}

/* ---- Operations -------------------------------------------------------- */

export interface ProcurementLine {
  id: string
  priceBookId: string
  product: string
  qty: number
  unit: string
  derivation: string
  adjusted: boolean
}

export interface ProcurementOrder {
  id: string
  opportunityId: string
  lines: ProcurementLine[]
  status: 'draft' | 'submitted' | 'approved' | 'shipped' | 'delivered'
  submittedAt: string | null
  neededBy: string
  /** Purchasing reference for the job-to-fulfilment handoff. */
  purchaseOrderId: string | null
  trackingRef: string | null
}

export type MaterialLine = ProcurementLine
export type MaterialOrder = ProcurementOrder

export interface Job {
  id: string
  opportunityId: string
  status: JobStatus
  start: string
  end: string
  crewLeaderId: string | null
  pmId: string | null
  crewIds: string[]
  /** Flexible per-job responsibilities. A person may hold more than one role. */
  team?: JobAssignment[]
  progress: number
  dispatchState?: 'unassigned' | 'ready' | 'at_risk'
  syncStatus?: 'synced' | 'pending'
  clockStatus?: 'not_started' | 'traveling' | 'on_site' | 'wrapped'
  travelMinutes?: number
  checkInAt?: string | null
  checkOutAt?: string | null
  customerNotifiedAt?: string | null
  lastDispatchNote?: string
  dailyLogs: { id: string; date: string; note: string; byId: string }[]
}

export type JobRole =
  | 'sales_owner'
  | 'estimator'
  | 'project_manager'
  | 'scheduler'
  | 'field_supervisor'
  | 'crew_lead'
  | 'technician'
  | 'quality_reviewer'
  | 'billing_owner'

export const JOB_ROLE_LABEL: Record<JobRole, string> = {
  sales_owner: 'Sales owner',
  estimator: 'Estimator',
  project_manager: 'Project manager',
  scheduler: 'Scheduler',
  field_supervisor: 'Field supervisor',
  crew_lead: 'Crew lead',
  technician: 'Installer',
  quality_reviewer: 'Quality reviewer',
  billing_owner: 'Billing owner',
}

export interface JobAssignment {
  userId: string
  role: JobRole
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

export type CommunicationChannel = 'email' | 'sms'
export type CommunicationDirection = 'inbound' | 'outbound'
export type CommunicationStatus = 'draft' | 'scheduled' | 'sent' | 'delivered' | 'no_response'

export interface CommunicationMessage {
  id: string
  at: string
  channel: CommunicationChannel
  direction: CommunicationDirection
  status: CommunicationStatus
  subject?: string
  body: string
  byId: string
}

export interface CommunicationThread {
  id: string
  opportunityId: string
  contactName: string
  contactEmail?: string
  contactPhone?: string
  lastChannel: CommunicationChannel
  status: 'open' | 'waiting' | 'closed'
  messages: CommunicationMessage[]
}

export interface CommunicationTemplate {
  id: string
  name: string
  channel: CommunicationChannel
  subject?: string
  body: string
}

export type PaymentRequestStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'

export interface PaymentRequestEvent {
  id: string
  at: string
  label: string
  detail: string
}

export interface PaymentRequest {
  id: string
  opportunityId: string
  invoiceId: string | null
  estimateId: string | null
  token: string
  kind: 'deposit' | 'invoice'
  amount: number
  channel: 'email' | 'sms' | 'link'
  recipientName: string
  recipientEmail?: string
  recipientPhone?: string
  note?: string
  status: PaymentRequestStatus
  processorStatus: 'pending' | 'succeeded' | 'failed' | 'refunded'
  sentAt: string | null
  viewedAt: string | null
  paidAt: string | null
  events: PaymentRequestEvent[]
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
  estimatedQuantity: number
  secondaryQuantity: number
  address: string
  zip: string
  createdAt: string
  stageEnteredAt: string
  catalogItemIds: string[]
  reminderAt: string | null
  source: LeadSource
  /** Scheduled sales call / site visit, set at qualification. */
  visitAt: string | null
  lostReason?: string
  /** Template-defined values keep the core useful beyond any one trade. */
  customFields?: Record<string, string | number | boolean>
}
