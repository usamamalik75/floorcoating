import { create, type StateCreator } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Account,
  Activity,
  Artifact,
  ChangeOrder,
  ChecklistInstance,
  ChecklistTemplate,
  CommunicationChannel,
  CommunicationTemplate,
  CommunicationThread,
  Estimate,
  Invoice,
  Issue,
  Job,
  JobStatus,
  Location,
  Opportunity,
  PaymentRequest,
  PriceBookItem,
  ProspectRequest,
  ProcurementOrder,
  ProposalTemplate,
  Reminder,
  Role,
  ScopeRequest,
  ScopeServiceTemplate,
  SiteVisitCustomQA,
  User,
  SiteVisitForm,
  SiteVisitResponse,
  StageDef,
  StageId,
  ScopeExtraction,
} from '@/domain/types'
import { ROLE_LABEL, visitVocab, withVisitVocab } from '@/domain/types'
import { WORKSPACE_TEMPLATE, type WorkspaceTemplate } from '@/config/workspace'
import { CHECKLIST_TEMPLATES, templateForStage } from '@/data/checklists'
import { PRICE_BOOK, PROPOSAL_TEMPLATES } from '@/data/priceBook'
import {
  preferredServiceTemplate,
  requestsFromServiceTemplate,
  SERVICE_TEMPLATES,
} from '@/data/serviceTemplates'
import { formForCategory, SITE_VISIT_FORMS } from '@/data/siteVisitForms'
import { estimatePackFor, suggestFloorSystem } from '@/data/estimating'
import {
  ACCOUNTS,
  ACTIVITY,
  ARTIFACTS,
  CHANGE_ORDERS,
  CHECKLIST_INSTANCES,
  ESTIMATES,
  INVOICES,
  ISSUES,
  JOBS,
  LOCATIONS,
  OPPORTUNITIES,
  PROCUREMENT_ORDERS,
  REMINDERS,
  SITE_VISIT_RESPONSES,
  SCOPE_EXTRACTIONS,
  USERS,
  iso,
} from '@/data/seed'
import { STAGE_BY_ID, stageLabel, STAGES } from '@/domain/stages'

let seq = 1000
const nextId = (prefix: string) => `${prefix}_${++seq}`

export interface MoveMeta {
  reminderAt?: string
  reminderNote?: string
  reminderReason?: string
  expectedPeriod?: string
  assigneeId?: string
  reason?: string
  followUpChannel?: CommunicationChannel
  followUpRecipient?: string
}

interface State {
  accounts: Account[]
  opportunities: Opportunity[]
  artifacts: Artifact[]
  estimates: Estimate[]
  jobs: Job[]
  invoices: Invoice[]
  reminders: Reminder[]
  checklists: ChecklistInstance[]
  activity: Activity[]
  siteVisits: SiteVisitResponse[]
  scopeExtractions: ScopeExtraction[]
  procurementOrders: ProcurementOrder[]
  /** @deprecated Compatibility alias; use procurementOrders. */
  materialOrders: ProcurementOrder[]
  changeOrders: ChangeOrder[]
  issues: Issue[]
  users: User[]
  locations: Location[]
  workspaceTemplate: WorkspaceTemplate
  siteVisitForms: SiteVisitForm[]
  checklistTemplates: ChecklistTemplate[]
  serviceTemplates: ScopeServiceTemplate[]
  priceBookItems: PriceBookItem[]
  proposalTemplates: ProposalTemplate[]
  stageDefinitions: StageDef[]
  messageThreads: CommunicationThread[]
  communicationTemplates: CommunicationTemplate[]
  paymentRequests: PaymentRequest[]
  prospectRequests: ProspectRequest[]

  viewerId: string
  locationFilter: string | 'all'
  density: 'comfortable' | 'field'
  theme: 'light' | 'dark'

  setViewer: (id: string) => void
  setLocationFilter: (id: string | 'all') => void
  setDensity: (d: 'comfortable' | 'field') => void
  setTheme: (t: 'light' | 'dark') => void
  upsertUser: (user: User) => void

  moveStage: (opportunityId: string, to: StageId, meta?: MoveMeta) => void
  setJobStatus: (opportunityId: string, status: JobStatus) => void
  patchOpportunity: (id: string, next: Partial<Opportunity>) => void
  createOpportunity: (o: Omit<Opportunity, 'id'>) => string
  createLead: (input: LeadInput) => string
  ensureEstimate: (opportunityId: string) => string
  upsertAccount: (account: Account) => void

  addArtifact: (a: Omit<Artifact, 'id'>) => void
  toggleChecklistItem: (opportunityId: string, templateId: string, itemId: string) => void
  /** Select / replace the visit checklist from a company template (copies items). */
  assignVisitChecklist: (opportunityId: string, templateId: string) => void
  addChecklistInstanceItem: (opportunityId: string, templateId: string, label: string) => void
  removeChecklistInstanceItem: (opportunityId: string, templateId: string, itemId: string) => void
  /** Select / replace scope request lines from a company service template. */
  assignVisitServiceTemplate: (opportunityId: string, templateId: string) => void
  /** Patch scope requests on an in-progress visit (hub tab editing). */
  patchVisitRequests: (opportunityId: string, requests: ScopeRequest[]) => void
  saveSiteVisit: (
    opportunityId: string,
    formId: string,
    values: Record<string, string | number | boolean>,
    requests: ScopeRequest[],
    complete: boolean,
    customQuestions?: SiteVisitCustomQA[],
  ) => void
  /** Add / update / remove free-form Q&A on a visit section. */
  patchVisitCustomQuestions: (opportunityId: string, customQuestions: SiteVisitCustomQA[]) => void

  upsertEstimate: (e: Estimate) => void
  updateEstimate: (id: string, next: Partial<Estimate>) => void
  approveEstimate: (id: string, approverId: string) => void
  rejectEstimate: (id: string, note: string) => void
  signEstimate: (id: string, signedBy: string, selectedOptionId?: string) => void

  acceptScopeExtraction: (scopeExtractionId: string) => void

  scheduleJob: (job: Omit<Job, 'id'>) => void
  updateJob: (jobId: string, next: Partial<Job>) => void
  addDailyLog: (jobId: string, note: string) => void

  upsertProcurementOrder: (o: ProcurementOrder) => void
  submitProcurementOrder: (id: string) => void
  advanceProcurementOrder: (id: string) => void
  /** @deprecated Compatibility alias; use upsertProcurementOrder. */
  upsertMaterialOrder: (o: ProcurementOrder) => void
  /** @deprecated Compatibility alias; use submitProcurementOrder. */
  submitMaterialOrder: (id: string) => void
  /** @deprecated Compatibility alias; use advanceProcurementOrder. */
  advanceMaterialOrder: (id: string) => void

  addChangeOrder: (c: Omit<ChangeOrder, 'id'>) => void
  setChangeOrderStatus: (id: string, status: ChangeOrder['status']) => void
  addIssue: (i: Omit<Issue, 'id'>) => void
  resolveIssue: (id: string) => void

  createInvoice: (i: Omit<Invoice, 'id'>) => void
  recordPayment: (invoiceId: string, amount: number, method: 'Check' | 'ACH' | 'Card') => void
  createPaymentRequest: (request: Omit<PaymentRequest, 'id' | 'events' | 'token'> & { token?: string }) => string
  updatePaymentRequestStatus: (
    id: string,
    status: PaymentRequest['status'],
    detail?: string,
    options?: { recordInvoicePayment?: boolean; method?: 'Check' | 'ACH' | 'Card' },
  ) => void
  upsertMessageThread: (thread: CommunicationThread) => void
  sendMessage: (
    opportunityId: string,
    input: {
      channel: CommunicationChannel
      body: string
      subject?: string
      contactName: string
      contactEmail?: string
      contactPhone?: string
      status?: 'draft' | 'sent'
    },
  ) => string
  markThreadStatus: (threadId: string, status: CommunicationThread['status']) => void
  addInboundMessage: (
    threadId: string,
    input: { channel: CommunicationChannel; body: string; subject?: string; at?: string },
  ) => void
  updateWorkspaceTemplate: (next: WorkspaceTemplate) => void
  upsertLocation: (location: Location) => void
  upsertProspectRequest: (request: ProspectRequest) => void
  upsertSiteVisitForm: (form: SiteVisitForm) => void
  upsertChecklistTemplate: (template: ChecklistTemplate) => void
  upsertPriceBookItem: (item: PriceBookItem) => void
  upsertProposalTemplate: (template: ProposalTemplate) => void
  upsertStageDefinition: (stage: StageDef) => void


  logActivity: (opportunityId: string, kind: Activity['kind'], text: string) => void
  reset: () => void
}

export interface LeadInput {
  company: string
  contactName: string
  email: string
  phone: string
  zip: string
  city: string
  state: string
  category: Opportunity['category']
  source: Opportunity['source']
  message: string
  locationId: string
  estimatedQuantity: number
  /** new_contact = create/link a Contact; known_customer = attach to existing Customer. */
  accountMode?: 'new_contact' | 'known_customer'
  /** Required when accountMode is known_customer. */
  accountId?: string
}

const createCommunicationTemplates = (): CommunicationTemplate[] => [
  {
    id: 'tmpl_followup_email',
    name: 'Proposal follow-up email',
    channel: 'email',
    subject: 'Checking in on your proposal',
    body:
      'Hi {{contactName}},\n\nI wanted to follow up on the proposal and answer any questions before we lock in dates.\n\nBest,\n{{ownerName}}',
  },
  {
    id: 'tmpl_followup_sms',
    name: 'Proposal follow-up text',
    channel: 'sms',
    body: 'Hi {{contactName}}, just checking in on the proposal. Happy to answer any questions and hold dates for you.',
  },
  {
    id: 'tmpl_payment_email',
    name: 'Payment request email',
    channel: 'email',
    subject: 'Your payment link is ready',
    body:
      'Hi {{contactName}},\n\nYour payment link is ready. Once the deposit is received we can confirm scheduling.\n\nThank you,\n{{ownerName}}',
  },
]

const createMessageThreads = (): CommunicationThread[] =>
  OPPORTUNITIES.slice(0, 4).map((opp, index) => {
    const account = ACCOUNTS.find((a) => a.id === opp.accountId)
    return {
      id: `thread_${opp.id}`,
      opportunityId: opp.id,
      contactName: account?.contactName ?? 'Customer',
      contactEmail: account?.email,
      contactPhone: account?.phone,
      lastChannel: index % 2 === 0 ? 'email' : 'sms',
      status: index === 0 ? 'waiting' : 'open',
      messages: [
        {
          id: `msg_${opp.id}_1`,
          at: new Date(opp.createdAt).toISOString(),
          channel: index % 2 === 0 ? 'email' : 'sms',
          direction: 'outbound',
          status: 'sent',
          subject: index % 2 === 0 ? 'Intro and next steps' : undefined,
          body:
            index % 2 === 0
              ? 'Thanks for reaching out. We have your project details and will confirm the next step shortly.'
              : 'Thanks for contacting us. We received your request and will confirm the next step shortly.',
          byId: opp.ownerId || 'u_nic',
        },
      ],
    }
  })

const createProspectRequests = (): ProspectRequest[] => [
  {
    id: 'pr_local_1',
    locationId: LOCATIONS[0]?.id ?? 'loc_chi',
    requestedById: USERS.find((user) => user.role === 'sales' && user.locationId === LOCATIONS[0]?.id)?.id ?? 'u_nic',
    vertical: 'Food & Beverage',
    originCity: LOCATIONS[0]?.city ?? 'Chicago',
    radiusMiles: 100,
    minEmployees: 75,
    estimatedCount: 84,
    status: 'approved',
  },
]

const initial = () => ({
  accounts: structuredClone(ACCOUNTS),
  opportunities: structuredClone(OPPORTUNITIES),
  artifacts: structuredClone(ARTIFACTS),
  estimates: structuredClone(ESTIMATES),
  jobs: structuredClone(JOBS),
  invoices: structuredClone(INVOICES),
  reminders: structuredClone(REMINDERS),
  checklists: structuredClone(CHECKLIST_INSTANCES),
  activity: structuredClone(ACTIVITY),
  siteVisits: structuredClone(SITE_VISIT_RESPONSES),
  scopeExtractions: structuredClone(SCOPE_EXTRACTIONS),
  procurementOrders: structuredClone(PROCUREMENT_ORDERS),
  materialOrders: structuredClone(PROCUREMENT_ORDERS),
  changeOrders: structuredClone(CHANGE_ORDERS),
  issues: structuredClone(ISSUES),
  users: structuredClone(USERS),
  locations: structuredClone(LOCATIONS),
  workspaceTemplate: structuredClone(WORKSPACE_TEMPLATE),
  siteVisitForms: structuredClone(SITE_VISIT_FORMS),
  checklistTemplates: structuredClone(CHECKLIST_TEMPLATES),
  serviceTemplates: structuredClone(SERVICE_TEMPLATES),
  priceBookItems: structuredClone(PRICE_BOOK),
  proposalTemplates: structuredClone(PROPOSAL_TEMPLATES),
  stageDefinitions: structuredClone(STAGES),
  messageThreads: createMessageThreads(),
  communicationTemplates: createCommunicationTemplates(),
  paymentRequests: [],
  prospectRequests: createProspectRequests(),
})

/**
 * Demo state survives a refresh or a link opened in a new tab, which is how a
 * walkthrough actually gets used. It is per-tab and versioned, so a changed
 * seed invalidates it and "Reset demo" always returns to the story's start.
 */
const STORAGE_KEY = 'fcg-prototype'
const STORAGE_VERSION = 14

const createState: StateCreator<State> = (set, get) => ({
  ...initial(),

  viewerId: 'u_nic',
  locationFilter: 'all',
  density: 'comfortable',
  theme: 'light',

  setViewer: (id) => {
    const user = get().users.find((u) => u.id === id)
    set({
      viewerId: id,
      // Team members are scoped to their location; administrators can view all locations.
      locationFilter: user?.locationId ?? 'all',
      // Field roles land in the field-density experience automatically.
      density: user?.role === 'tech' || user?.role === 'crew_leader' ? 'field' : 'comfortable',
    })
  },
  setLocationFilter: (id) => set({ locationFilter: id }),
  setDensity: (density) => set({ density }),
  setTheme: (theme) => set({ theme }),
  upsertUser: (user) =>
    set((s) => ({
      users: s.users.some((existing) => existing.id === user.id)
        ? s.users.map((existing) => (existing.id === user.id ? user : existing))
        : [...s.users, user],
    })),

  /* ---- Pipeline ------------------------------------------------------- */

  moveStage: (opportunityId, to, meta = {}) => {
    const { opportunities, viewerId } = get()
    const o = opportunities.find((x) => x.id === opportunityId)
    if (!o) return

    const from = o.stage
    const def = get().stageDefinitions.find((stage) => stage.id === to) ?? STAGE_BY_ID[to]

    set({
      opportunities: opportunities.map((x) =>
        x.id === opportunityId
          ? {
              ...x,
              stage: to,
              stageEnteredAt: new Date().toISOString(),
              reminderAt: meta.reminderAt ?? x.reminderAt,
              lostReason: to === 'lost' ? (meta.reason ?? x.lostReason) : x.lostReason,
              // Assignment gates write to the right field for the role.
              ownerId: def.gates.some((g) => g.kind === 'assign' && g.role === 'sales') && meta.assigneeId ? meta.assigneeId : x.ownerId,
              estimatorId: def.gates.some((g) => g.kind === 'assign' && g.role === 'estimator') && meta.assigneeId ? meta.assigneeId : x.estimatorId,
              pmId: def.gates.some((g) => g.kind === 'assign' && g.role === 'pm') && meta.assigneeId ? meta.assigneeId : x.pmId,
            }
          : x,
      ),
    })

    get().logActivity(
      opportunityId,
      'stage',
      `Moved from ${stageLabel(from, o.category)} to ${stageLabel(to, o.category)}.${meta.reason ? ` Reason: ${meta.reason}.` : ''}`,
    )

    if (meta.reminderAt) {
      set((s) => ({
        reminders: [
          ...s.reminders.filter((r) => r.opportunityId !== opportunityId || r.done),
          {
            id: nextId('rm'),
            opportunityId,
            dueAt: meta.reminderAt!,
            note: meta.reminderNote ?? '',
            reason: meta.reminderReason,
            expectedPeriod: meta.expectedPeriod,
            ownerId: viewerId,
            done: false,
          },
        ],
      }))

      if (meta.followUpChannel) {
        const account = get().accounts.find((a) => a.id === o.accountId)
        get().sendMessage(opportunityId, {
          channel: meta.followUpChannel,
          body: meta.reminderNote || `Follow-up scheduled for ${stageLabel(to, o.category)}.`,
          contactName: account?.contactName ?? 'Customer',
          contactEmail: account?.email,
          contactPhone: account?.phone,
          status: 'draft',
          subject: meta.followUpChannel === 'email' ? 'Follow-up scheduled' : undefined,
        })
      }
    }

    def.notify.forEach((n) =>
      get().logActivity(
        opportunityId,
        'system',
        `Notified ${ROLE_LABEL[n.role]}: ${withVisitVocab(n.message, o.category)}`,
      ),
    )

    // Stage changes create related module records — they do not redirect the user.
    if (to === 'site_visit_scheduled' || to === 'site_visit_required') {
      const form = get().siteVisitForms.find((candidate) => candidate.category === o.category) ?? formForCategory(o.category)
      if (form && !get().siteVisits.some((v) => v.opportunityId === opportunityId)) {
        const serviceTpl = preferredServiceTemplate(get().serviceTemplates, o.category)
        const seededRequests = serviceTpl
          ? requestsFromServiceTemplate(serviceTpl, () => nextId('req'))
          : []
        set((s) => ({
          siteVisits: [
            ...s.siteVisits,
            {
              opportunityId,
              formId: form.id,
              values: {},
              requests: seededRequests,
              serviceTemplateId: serviceTpl?.id ?? null,
              completedAt: null,
              completedById: null,
            },
          ],
        }))
        const v = visitVocab(o.category)
        get().logActivity(
          opportunityId,
          'system',
          `${v.Singular} record created — open it from Visits & Calls or this opportunity.`,
        )
      }
      const hasVisitChecklist = get().checklists.some((c) => {
        const tpl = get().checklistTemplates.find((t) => t.id === c.templateId)
        return c.opportunityId === opportunityId && tpl?.stage === 'site_visit_scheduled'
      })
      if (!hasVisitChecklist) {
        const visitChecklist =
          get().checklistTemplates.find(
            (t) => t.stage === 'site_visit_scheduled' && t.category === o.category,
          ) ?? templateForStage('site_visit_scheduled', o.category)
        if (visitChecklist) {
          set((s) => ({
            checklists: [
              ...s.checklists,
              {
                id: nextId('ci'),
                templateId: visitChecklist.id,
                opportunityId,
                items: structuredClone(visitChecklist.items),
                done: [],
                completedAt: null,
              },
            ],
          }))
        }
      }
    }

    if (to === 'estimate_in_progress') {
      get().ensureEstimate(opportunityId)
    }

    if (to === 'awarded') {
      const account = get().accounts.find((a) => a.id === o.accountId)
      if (account && account.anchorStage !== 'customer') {
        get().upsertAccount({
          ...account,
          anchorStage: 'customer',
          lastActivityAt: new Date().toISOString(),
        })
        get().logActivity(
          opportunityId,
          'system',
          `Contact converted to Customer — ${account.name}. Job is assigned to this customer.`,
        )
      }
      const existing = get().jobs.find((j) => j.opportunityId === opportunityId)
      if (!existing) {
        get().scheduleJob({
          opportunityId,
          status: 'scheduling_required',
          start: iso(14),
          end: iso(17),
          crewLeaderId: null,
          pmId: o.pmId,
          crewIds: [],
          team: [
            { userId: o.ownerId, role: 'sales_owner' },
            ...(o.estimatorId ? [{ userId: o.estimatorId, role: 'estimator' as const }] : []),
            ...(o.pmId ? [{ userId: o.pmId, role: 'project_manager' as const }] : []),
          ],
          progress: 0,
          dailyLogs: [],
        })
        get().logActivity(opportunityId, 'system', 'Job created at Scheduling Required — open it from Jobs.')
      }
    }
  },

  setJobStatus: (opportunityId, status) => {
    const job = get().jobs.find((j) => j.opportunityId === opportunityId)
    if (!job) return
    const from = job.status
    set((s) => ({
      jobs: s.jobs.map((j) => (j.opportunityId === opportunityId ? { ...j, status } : j)),
    }))
    get().logActivity(opportunityId, 'stage', `Job moved from ${from.replace(/_/g, ' ')} to ${status.replace(/_/g, ' ')}.`)

    if (status === 'invoiced') {
      const o = get().opportunities.find((x) => x.id === opportunityId)
      const contract = contractTotal(get(), opportunityId) || o?.value || 0
      const approvedCo = get()
        .changeOrders.filter((c) => c.opportunityId === opportunityId && c.status === 'customer_approved')
        .reduce((s, c) => s + c.amount, 0)
      const deposits = get()
        .invoices.filter((i) => i.opportunityId === opportunityId && i.kind === 'deposit')
        .reduce((s, i) => s + i.amount, 0)
      const due = contract + approvedCo - deposits

      get().createInvoice({
        opportunityId,
        number: `JOB-INV-${2100 + get().invoices.length}`,
        kind: 'final',
        amount: due,
        status: 'sent',
        issuedAt: new Date().toISOString(),
        dueAt: iso(30),
        quickbooksId: `QB-${9000 + get().invoices.length}`,
        payments: [],
      })
      get().logActivity(
        opportunityId,
        'money',
        `Final invoice synced to QuickBooks — contract plus ${approvedCo > 0 ? 'approved change orders ' : ''}less deposit.`,
      )
    }

    if (status === 'paid') {
      set((s) => ({
        invoices: s.invoices.map((i) =>
          i.opportunityId === opportunityId && i.status !== 'paid'
            ? {
                ...i,
                status: 'paid' as const,
                payments: [
                  ...i.payments,
                  {
                    id: nextId('pay'),
                    amount: i.amount - i.payments.reduce((s2, p) => s2 + p.amount, 0),
                    receivedAt: new Date().toISOString(),
                    method: 'ACH' as const,
                  },
                ],
              }
            : i,
        ),
      }))
    }
  },

  patchOpportunity: (id, next) =>
    set((s) => ({ opportunities: s.opportunities.map((o) => (o.id === id ? { ...o, ...next } : o)) })),

  createOpportunity: (o) => {
    const id = nextId('op')
    set((s) => ({ opportunities: [...s.opportunities, { ...o, id }] }))
    return id
  },

  createLead: (input) => {
    const { accounts } = get()
    const mode = input.accountMode ?? 'new_contact'
    let account =
      mode === 'known_customer' && input.accountId
        ? accounts.find((a) => a.id === input.accountId && a.anchorStage === 'customer')
        : accounts.find(
            (a) =>
              a.name.toLowerCase() === input.company.toLowerCase() &&
              a.locationId === input.locationId,
          )

    if (mode === 'known_customer' && !account) return ''

    if (!account) {
      account = {
        id: nextId('ac'),
        name: input.company,
        vertical: input.category === 'residential' ? 'Residential' : 'Commercial',
        locationId: input.locationId,
        contactName: input.contactName,
        contactTitle: input.category === 'residential' ? 'Homeowner' : 'Contact',
        email: input.email,
        phone: input.phone,
        city: input.city,
        state: input.state,
        zip: input.zip,
        isNational: false,
        source: input.source,
        createdAt: new Date().toISOString(),
        anchorStage: 'contact',
        lastActivityAt: new Date().toISOString(),
      }
      const created = account
      set((s) => ({ accounts: [...s.accounts, created] }))
    } else if (account.anchorStage === 'prospect') {
      get().upsertAccount({
        ...account,
        anchorStage: 'contact',
        lastActivityAt: new Date().toISOString(),
      })
      account = { ...account, anchorStage: 'contact' }
    }

    const companyName = account.name
    const code = `JOB-${input.locationId.replace('loc_', '').toUpperCase()}-${1100 + get().opportunities.length}`
    const id = nextId('op')
    set((s) => ({
      opportunities: [
        ...s.opportunities,
        {
          id,
          code,
          name: `${companyName} — new enquiry`,
          accountId: account!.id,
          locationId: input.locationId,
          category: input.category,
          stage: 'new_lead',
          temperature: 'warm',
          ownerId: '',
          estimatorId: null,
          pmId: null,
          value: 0,
          estimatedQuantity: input.estimatedQuantity,
          secondaryQuantity: 0,
          address: `${input.city}, ${input.state}`,
          zip: input.zip,
          createdAt: new Date().toISOString(),
          stageEnteredAt: new Date().toISOString(),
          catalogItemIds: [],
          reminderAt: null,
          source: input.source,
          visitAt: null,
        },
      ],
    }))
    get().logActivity(
      id,
      'system',
      mode === 'known_customer'
        ? `Lead opened on known customer ${companyName} from ${input.source}.`
        : `Lead captured from ${input.source} and routed by zip ${input.zip}. Account is a Contact until awarded.`,
    )
    if (input.message) get().logActivity(id, 'note', `Customer message: “${input.message}”`)
    return id
  },

  upsertAccount: (account) =>
    set((s) => ({
      accounts: s.accounts.some((existing) => existing.id === account.id)
        ? s.accounts.map((existing) => (existing.id === account.id ? account : existing))
        : [...s.accounts, account],
    })),

  /* ---- Records -------------------------------------------------------- */

  addArtifact: (a) => {
    set((s) => ({ artifacts: [...s.artifacts, { ...a, id: nextId('ar') }] }))
    get().logActivity(a.opportunityId, 'artifact', `Added ${a.kind} — ${a.name}.`)
  },

  toggleChecklistItem: (opportunityId, templateId, itemId) => {
    const { checklists, checklistTemplates } = get()
    const existing = checklists.find(
      (c) => c.opportunityId === opportunityId && c.templateId === templateId,
    )
    if (!existing) {
      const tpl = checklistTemplates.find((t) => t.id === templateId)
      set({
        checklists: [
          ...checklists,
          {
            id: nextId('ci'),
            templateId,
            opportunityId,
            items: tpl ? structuredClone(tpl.items) : undefined,
            done: [itemId],
            completedAt: null,
          },
        ],
      })
      return
    }
    const done = existing.done.includes(itemId)
      ? existing.done.filter((i) => i !== itemId)
      : [...existing.done, itemId]
    set({ checklists: checklists.map((c) => (c.id === existing.id ? { ...c, done } : c)) })
  },

  assignVisitChecklist: (opportunityId, templateId) => {
    const { checklists, checklistTemplates } = get()
    const tpl = checklistTemplates.find((t) => t.id === templateId)
    if (!tpl || tpl.stage !== 'site_visit_scheduled') return

    const others = checklists.filter((c) => {
      if (c.opportunityId !== opportunityId) return true
      const t = checklistTemplates.find((x) => x.id === c.templateId)
      return t?.stage !== 'site_visit_scheduled'
    })

    set({
      checklists: [
        ...others,
        {
          id: nextId('ci'),
          templateId,
          opportunityId,
          items: structuredClone(tpl.items),
          done: [],
          completedAt: null,
        },
      ],
    })
    get().logActivity(opportunityId, 'checklist', `Selected checklist template: ${tpl.name}.`)
  },

  addChecklistInstanceItem: (opportunityId, templateId, label) => {
    const trimmed = label.trim()
    if (!trimmed) return
    const { checklists, checklistTemplates } = get()
    const existing = checklists.find(
      (c) => c.opportunityId === opportunityId && c.templateId === templateId,
    )
    const tpl = checklistTemplates.find((t) => t.id === templateId)
    const baseItems = existing?.items?.length
      ? existing.items
      : structuredClone(tpl?.items ?? [])
    const item = { id: nextId('cli'), label: trimmed }
    if (!existing) {
      set({
        checklists: [
          ...checklists,
          {
            id: nextId('ci'),
            templateId,
            opportunityId,
            items: [...baseItems, item],
            done: [],
            completedAt: null,
          },
        ],
      })
      return
    }
    set({
      checklists: checklists.map((c) =>
        c.id === existing.id ? { ...c, items: [...baseItems, item] } : c,
      ),
    })
  },

  removeChecklistInstanceItem: (opportunityId, templateId, itemId) => {
    const { checklists, checklistTemplates } = get()
    const existing = checklists.find(
      (c) => c.opportunityId === opportunityId && c.templateId === templateId,
    )
    if (!existing) return
    const tpl = checklistTemplates.find((t) => t.id === templateId)
    const baseItems = existing.items?.length ? existing.items : structuredClone(tpl?.items ?? [])
    set({
      checklists: checklists.map((c) =>
        c.id === existing.id
          ? {
              ...c,
              items: baseItems.filter((i) => i.id !== itemId),
              done: c.done.filter((d) => d !== itemId),
            }
          : c,
      ),
    })
  },

  assignVisitServiceTemplate: (opportunityId, templateId) => {
    const tpl = get().serviceTemplates.find((t) => t.id === templateId)
    if (!tpl) return
    const requests = requestsFromServiceTemplate(tpl, () => nextId('req'))
    const existing = get().siteVisits.find((v) => v.opportunityId === opportunityId)
    const opp = get().opportunities.find((o) => o.id === opportunityId)
    const form =
      get().siteVisitForms.find((candidate) => candidate.category === opp?.category) ??
      (opp ? formForCategory(opp.category) : undefined)

    if (!existing) {
      if (!form) return
      set((s) => ({
        siteVisits: [
          ...s.siteVisits,
          {
            opportunityId,
            formId: form.id,
            values: {},
            requests,
            serviceTemplateId: templateId,
            completedAt: null,
            completedById: null,
          },
        ],
      }))
    } else {
      set((s) => ({
        siteVisits: s.siteVisits.map((v) =>
          v.opportunityId === opportunityId
            ? { ...v, requests, serviceTemplateId: templateId }
            : v,
        ),
      }))
    }

    const estimatedQuantity = requests.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
    if (estimatedQuantity > 0) {
      get().patchOpportunity(opportunityId, { estimatedQuantity })
    }
    get().logActivity(
      opportunityId,
      'system',
      `Service template applied — ${tpl.name} (${requests.length} scope line${requests.length === 1 ? '' : 's'}).`,
    )
  },

  patchVisitRequests: (opportunityId, requests) => {
    const existing = get().siteVisits.find((v) => v.opportunityId === opportunityId)
    if (!existing) return
    set((s) => ({
      siteVisits: s.siteVisits.map((v) =>
        v.opportunityId === opportunityId ? { ...v, requests } : v,
      ),
    }))
    const estimatedQuantity = requests.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
    if (estimatedQuantity > 0) {
      get().patchOpportunity(opportunityId, { estimatedQuantity })
    }
  },

  patchVisitCustomQuestions: (opportunityId, customQuestions) => {
    const existing = get().siteVisits.find((v) => v.opportunityId === opportunityId)
    if (!existing) return
    set((s) => ({
      siteVisits: s.siteVisits.map((v) =>
        v.opportunityId === opportunityId ? { ...v, customQuestions } : v,
      ),
    }))
  },

  saveSiteVisit: (opportunityId, formId, values, requests, complete, customQuestions) => {
    const { siteVisits, viewerId } = get()
    const existing = siteVisits.find((v) => v.opportunityId === opportunityId)
    const next: SiteVisitResponse = {
      opportunityId,
      formId,
      values,
      requests,
      serviceTemplateId: existing?.serviceTemplateId ?? null,
      customQuestions: customQuestions ?? existing?.customQuestions ?? [],
      completedAt: complete ? new Date().toISOString() : (existing?.completedAt ?? null),
      completedById: complete ? viewerId : (existing?.completedById ?? null),
    }
    set({
      siteVisits: existing
        ? siteVisits.map((v) => (v.opportunityId === opportunityId ? next : v))
        : [...siteVisits, next],
    })

    // Sum quantities from scope requests so estimating never re-keys.
    const estimatedQuantity = requests.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
    get().patchOpportunity(opportunityId, {
      ...(estimatedQuantity > 0 ? { estimatedQuantity } : {}),
    })

    if (complete) {
      const oppForLog = get().opportunities.find((o) => o.id === opportunityId)
      const v = visitVocab(oppForLog?.category ?? 'commercial')
      get().logActivity(
        opportunityId,
        'checklist',
        `Guided ${v.singular} submitted — ${requests.length} scope request${requests.length === 1 ? '' : 's'}.`,
      )
      const opp = oppForLog
      if (
        opp &&
        (opp.stage === 'site_visit_scheduled' ||
          opp.stage === 'site_visit_required' ||
          opp.stage === 'qualified')
      ) {
        get().moveStage(opportunityId, 'site_visit_completed')
      }
    }
  },

  /* ---- Estimating ----------------------------------------------------- */

  upsertEstimate: (e) =>
    set((s) => ({
      estimates: s.estimates.some((x) => x.id === e.id)
        ? s.estimates.map((x) => (x.id === e.id ? e : x))
        : [...s.estimates, e],
    })),

  updateEstimate: (id, next) =>
    set((s) => ({ estimates: s.estimates.map((e) => (e.id === id ? { ...e, ...next } : e)) })),

  approveEstimate: (id, approverId) => {
    const est = get().estimates.find((e) => e.id === id)
    if (!est) return
    get().updateEstimate(id, {
      status: 'approved',
      approvedById: approverId,
      approvedAt: new Date().toISOString(),
      rejectionNote: null,
    })
    get().logActivity(
      est.opportunityId,
      'system',
      `Estimate approved by ${get().users.find((u) => u.id === approverId)?.name}.`,
    )
    const opp = get().opportunities.find((o) => o.id === est.opportunityId)
    if (opp && (opp.stage === 'estimate_in_progress' || opp.stage === 'site_visit_completed')) {
      get().moveStage(est.opportunityId, 'estimate_ready')
    }
  },

  rejectEstimate: (id, note) => {
    const est = get().estimates.find((e) => e.id === id)
    if (!est) return
    get().updateEstimate(id, { status: 'draft', rejectionNote: note })
    get().logActivity(est.opportunityId, 'system', `Estimate sent back for revision: ${note}`)
  },

  signEstimate: (id, signedBy, selectedOptionId) => {
    const est = get().estimates.find((e) => e.id === id)
    if (!est) return
    set((s) => ({
      estimates: s.estimates.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'signed' as const,
              signedAt: new Date().toISOString(),
              signedBy,
              options: e.options.map((o) => ({
                ...o,
                selectedByCustomer:
                  o.kind === 'alternative' ? o.id === selectedOptionId : true,
              })),
            }
          : e,
      ),
    }))
    get().logActivity(est.opportunityId, 'money', `Proposal accepted and signed electronically by ${signedBy}.`)
    // Signature awards the opportunity; moveStage('awarded') creates the Job.
    get().moveStage(est.opportunityId, 'awarded')
  },

  ensureEstimate: (opportunityId) => {
    const existing = get().estimates.find((e) => e.opportunityId === opportunityId)
    if (existing) return existing.id
    const opp = get().opportunities.find((o) => o.id === opportunityId)
    const pack = estimatePackFor(opp?.category ?? 'commercial')
    const visit = get().siteVisits.find((v) => v.opportunityId === opportunityId)
    const suggestion = suggestFloorSystem(opp?.category ?? 'commercial', visit?.requests ?? [], visit?.values ?? {})
    const id = nextId('est')
    const token = id.replace('est_', '').slice(0, 6)
    const estimate: Estimate = {
      id,
      opportunityId,
      options: [
        {
          id: nextId('eo'),
          label: 'Scope 1',
          kind: 'scope',
          recommended: true,
          lineItems: [],
        },
      ],
      templateId: pack.templateId,
      internalNotes: '',
      status: 'draft',
      approvedById: null,
      approvedAt: null,
      rejectionNote: null,
      sentAt: null,
      signedAt: null,
      signedBy: null,
      token,
      depositPct: pack.depositPct,
      estimateRemindersDone: [],
      suggestedPriceBookId: suggestion.priceBookId,
      suggestionDecision: 'pending',
    }
    get().upsertEstimate(estimate)
    get().logActivity(
      opportunityId,
      'system',
      `Draft estimate created with ${pack.label} — price book and floor-system suggestion ready.`,
    )
    return id
  },

  acceptScopeExtraction: (scopeExtractionId) => {
    const tk = get().scopeExtractions.find((t) => t.id === scopeExtractionId)
    if (!tk) return
    set((s) => ({
      scopeExtractions: s.scopeExtractions.map((t) => (t.id === scopeExtractionId ? { ...t, status: 'accepted' as const } : t)),
    }))
    const estimatedQuantity = tk.sections.reduce((s, a) => s + a.estimatedQuantity, 0)
    const secondaryQuantityValue = tk.sections.reduce((s, a) => s + a.secondaryQuantity, 0)
    get().patchOpportunity(tk.opportunityId, { estimatedQuantity, secondaryQuantity: secondaryQuantityValue })
    get().logActivity(
      tk.opportunityId,
      'system',
      `Document-assisted scope accepted by the estimator — ${estimatedQuantity.toLocaleString()} units and ${secondaryQuantityValue} secondary units written to the record.`,
    )
  },

  /* ---- Operations ----------------------------------------------------- */

  scheduleJob: (job) => {
    set((s) => ({
      jobs: [
        ...s.jobs.filter((j) => j.opportunityId !== job.opportunityId),
        { ...job, status: job.status ?? ('scheduling_required' as JobStatus), id: nextId('job') },
      ],
    }))
    get().logActivity(job.opportunityId, 'system', 'Job placed on the schedule.')
  },

  updateJob: (jobId, next) =>
    set((s) => ({ jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, ...next } : j)) })),

  addDailyLog: (jobId, note) => {
    const job = get().jobs.find((j) => j.id === jobId)
    if (!job) return
    set((s) => ({
      jobs: s.jobs.map((j) =>
        j.id === jobId
          ? { ...j, dailyLogs: [...j.dailyLogs, { id: nextId('dl'), date: new Date().toISOString(), note, byId: get().viewerId }] }
          : j,
      ),
    }))
    get().logActivity(job.opportunityId, 'note', `Daily log: ${note}`)
  },

  upsertProcurementOrder: (o) =>
    set((s) => {
      const procurementOrders = s.procurementOrders.some((x) => x.id === o.id)
        ? s.procurementOrders.map((x) => (x.id === o.id ? o : x))
        : [...s.procurementOrders, o]
      return {
        procurementOrders,
        materialOrders: procurementOrders,
      }
    }),

  submitProcurementOrder: (id) => {
    const mo = get().procurementOrders.find((m) => m.id === id)
    if (!mo) return
    const purchaseOrderId = `PO-${4500 + get().procurementOrders.length}`
    set((s) => {
      const procurementOrders = s.procurementOrders.map((m) =>
        m.id === id
          ? { ...m, status: 'submitted' as const, submittedAt: new Date().toISOString(), purchaseOrderId }
          : m,
      )
      return {
        procurementOrders,
        materialOrders: procurementOrders,
      }
    })
    get().logActivity(
      mo.opportunityId,
      'system',
      `Material order ${purchaseOrderId} submitted to purchasing.`,
    )
  },

  advanceProcurementOrder: (id) => {
    const order: ProcurementOrder['status'][] = ['draft', 'submitted', 'approved', 'shipped', 'delivered']
    const mo = get().procurementOrders.find((m) => m.id === id)
    if (!mo) return
    const next = order[Math.min(order.length - 1, order.indexOf(mo.status) + 1)]
    set((s) => {
      const procurementOrders = s.procurementOrders.map((m) =>
        m.id === id
          ? { ...m, status: next, trackingRef: next === 'shipped' ? `1Z-994-${nextId('T').toUpperCase()}` : m.trackingRef }
          : m,
      )
      return {
        procurementOrders,
        materialOrders: procurementOrders,
      }
    })
    get().logActivity(mo.opportunityId, 'system', `Material order ${mo.purchaseOrderId ?? ''} is now ${next}.`)
  },

  upsertMaterialOrder: (o) => get().upsertProcurementOrder(o),
  submitMaterialOrder: (id) => get().submitProcurementOrder(id),
  advanceMaterialOrder: (id) => get().advanceProcurementOrder(id),

  addChangeOrder: (c) => {
    set((s) => ({ changeOrders: [...s.changeOrders, { ...c, id: nextId('co') }] }))
    get().logActivity(
      c.opportunityId,
      'money',
      `Change order raised — ${c.description} (${c.qty} ${c.unit}).`,
    )
  },

  setChangeOrderStatus: (id, status) => {
    const co = get().changeOrders.find((c) => c.id === id)
    if (!co) return
    set((s) => ({ changeOrders: s.changeOrders.map((c) => (c.id === id ? { ...c, status } : c)) }))
    get().logActivity(
      co.opportunityId,
      'money',
      status === 'customer_approved'
        ? 'Change order approved by the customer — it will be added to the final invoice automatically.'
        : 'Change order rejected.',
    )
  },

  addIssue: (i) => {
    set((s) => ({ issues: [...s.issues, { ...i, id: nextId('is') }] }))
    get().logActivity(i.opportunityId, 'issue', `Issue raised — ${i.title}`)
  },

  resolveIssue: (id) =>
    set((s) => ({ issues: s.issues.map((i) => (i.id === id ? { ...i, status: 'resolved' as const } : i)) })),

  /* ---- Money ---------------------------------------------------------- */

  createInvoice: (i) => {
    set((s) => ({ invoices: [...s.invoices, { ...i, id: nextId('inv') }] }))
    get().logActivity(i.opportunityId, 'money', `${i.kind} invoice ${i.number} raised for ${money(i.amount)}.`)
  },

  recordPayment: (invoiceId, amount, method) => {
    const inv = get().invoices.find((i) => i.id === invoiceId)
    if (!inv) return
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0) + amount
    set((s) => ({
      invoices: s.invoices.map((i) =>
        i.id === invoiceId
          ? {
              ...i,
              payments: [...i.payments, { id: nextId('pay'), amount, receivedAt: new Date().toISOString(), method }],
              status: paid >= i.amount ? ('paid' as const) : ('partial' as const),
            }
          : i,
      ),
    }))
    get().logActivity(
      inv.opportunityId,
      'money',
      `Payment of ${money(amount)} received by ${method} and reconciled from QuickBooks.`,
    )
  },

  createPaymentRequest: (request) => {
    const id = nextId('pr')
    const token = request.token ?? id.replace('pr_', 'pay_')
    const created: PaymentRequest = {
      ...request,
      id,
      token,
      events: [
        {
          id: nextId('pre'),
          at: new Date().toISOString(),
          label: 'Payment request created',
          detail: `${request.kind === 'deposit' ? 'Deposit' : 'Invoice'} request prepared for ${money(request.amount)}.`,
        },
      ],
    }
    set((s) => ({ paymentRequests: [...s.paymentRequests, created] }))
    get().logActivity(
      request.opportunityId,
      'money',
      `${request.kind === 'deposit' ? 'Deposit' : 'Invoice'} payment link prepared for ${money(request.amount)}.`,
    )
    return id
  },

  updatePaymentRequestStatus: (id, status, detail, options) => {
    const request = get().paymentRequests.find((x) => x.id === id)
    if (!request) return
    const at = new Date().toISOString()
    set((s) => ({
      paymentRequests: s.paymentRequests.map((x) =>
        x.id === id
          ? {
              ...x,
              status,
              processorStatus:
                status === 'paid'
                  ? 'succeeded'
                  : status === 'failed'
                    ? 'failed'
                    : status === 'refunded'
                      ? 'refunded'
                      : x.processorStatus,
              sentAt: status === 'sent' && !x.sentAt ? at : x.sentAt,
              viewedAt: status === 'viewed' && !x.viewedAt ? at : x.viewedAt,
              paidAt: status === 'paid' ? at : x.paidAt,
              events: [
                ...x.events,
                {
                  id: nextId('pre'),
                  at,
                  label: `Request ${status}`,
                  detail: detail ?? `Payment request marked ${status}.`,
                },
              ],
            }
          : x,
      ),
    }))

    if (status === 'paid' && request.invoiceId && options?.recordInvoicePayment !== false) {
      const invoice = get().invoices.find((inv) => inv.id === request.invoiceId)
      if (invoice) {
        const outstanding = Math.max(0, invoice.amount - invoice.payments.reduce((sum, payment) => sum + payment.amount, 0))
        if (outstanding > 0) {
          get().recordPayment(request.invoiceId, Math.min(outstanding, request.amount), options?.method ?? 'ACH')
        }
      }
    }

    get().logActivity(request.opportunityId, 'money', detail ?? `Payment request marked ${status}.`)
  },

  upsertMessageThread: (thread) =>
    set((s) => ({
      messageThreads: s.messageThreads.some((existing) => existing.id === thread.id)
        ? s.messageThreads.map((existing) => (existing.id === thread.id ? thread : existing))
        : [...s.messageThreads, thread],
    })),

  sendMessage: (opportunityId, input) => {
    const existing = get().messageThreads.find((thread) => thread.opportunityId === opportunityId)
    const threadId = existing?.id ?? nextId('thread')
    const message = {
      id: nextId('msg'),
      at: new Date().toISOString(),
      channel: input.channel,
      direction: 'outbound' as const,
      status: input.status === 'draft' ? 'draft' as const : 'sent' as const,
      subject: input.subject,
      body: input.body,
      byId: get().viewerId,
    }
    const thread: CommunicationThread = existing
      ? {
          ...existing,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          lastChannel: input.channel,
          status: input.status === 'draft' ? 'open' : 'waiting',
          messages: [...existing.messages, message],
        }
      : {
          id: threadId,
          opportunityId,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          lastChannel: input.channel,
          status: input.status === 'draft' ? 'open' : 'waiting',
          messages: [message],
        }
    get().upsertMessageThread(thread)
    get().logActivity(
      opportunityId,
      'system',
      `${input.status === 'draft' ? 'Drafted' : 'Sent'} ${input.channel.toUpperCase()} message${input.subject ? `: ${input.subject}` : ''}.`,
    )
    return thread.id
  },

  markThreadStatus: (threadId, status) =>
    set((s) => ({
      messageThreads: s.messageThreads.map((thread) => (thread.id === threadId ? { ...thread, status } : thread)),
    })),

  addInboundMessage: (threadId, input) => {
    const thread = get().messageThreads.find((existing) => existing.id === threadId)
    if (!thread) return
    const at = input.at ?? new Date().toISOString()
    set((s) => ({
      messageThreads: s.messageThreads.map((existing) =>
        existing.id === threadId
          ? {
              ...existing,
              lastChannel: input.channel,
              status: 'open',
              messages: [
                ...existing.messages,
                {
                  id: nextId('msg'),
                  at,
                  channel: input.channel,
                  direction: 'inbound',
                  status: 'delivered',
                  subject: input.subject,
                  body: input.body,
                  byId: 'customer',
                },
              ],
            }
          : existing,
      ),
    }))
    get().logActivity(thread.opportunityId, 'note', `Customer replied by ${input.channel.toUpperCase()}.`)
  },

  updateWorkspaceTemplate: (next) => set({ workspaceTemplate: next }),

  upsertLocation: (location) =>
    set((s) => ({
      locations: s.locations.some((existing) => existing.id === location.id)
        ? s.locations.map((existing) => (existing.id === location.id ? location : existing))
        : [...s.locations, location],
    })),

  upsertProspectRequest: (request) =>
    set((s) => ({
      prospectRequests: s.prospectRequests.some((existing) => existing.id === request.id)
        ? s.prospectRequests.map((existing) => (existing.id === request.id ? request : existing))
        : [request, ...s.prospectRequests],
    })),

  upsertSiteVisitForm: (form) =>
    set((s) => ({
      siteVisitForms: s.siteVisitForms.some((existing) => existing.id === form.id)
        ? s.siteVisitForms.map((existing) => (existing.id === form.id ? form : existing))
        : [...s.siteVisitForms, form],
    })),

  upsertChecklistTemplate: (template) =>
    set((s) => ({
      checklistTemplates: s.checklistTemplates.some((existing) => existing.id === template.id)
        ? s.checklistTemplates.map((existing) => (existing.id === template.id ? template : existing))
        : [...s.checklistTemplates, template],
    })),

  upsertPriceBookItem: (item) =>
    set((s) => ({
      priceBookItems: s.priceBookItems.some((existing) => existing.id === item.id)
        ? s.priceBookItems.map((existing) => (existing.id === item.id ? item : existing))
        : [...s.priceBookItems, item],
    })),

  upsertProposalTemplate: (template) =>
    set((s) => ({
      proposalTemplates: s.proposalTemplates.some((existing) => existing.id === template.id)
        ? s.proposalTemplates.map((existing) => (existing.id === template.id ? template : existing))
        : [...s.proposalTemplates, template],
    })),

  upsertStageDefinition: (stage) =>
    set((s) => ({
      stageDefinitions: s.stageDefinitions.some((existing) => existing.id === stage.id)
        ? s.stageDefinitions.map((existing) => (existing.id === stage.id ? stage : existing))
        : [...s.stageDefinitions, stage],
    })),


  logActivity: (opportunityId, kind, text) =>
    set((s) => ({
      activity: [
        ...s.activity,
        { id: nextId('act'), opportunityId, at: new Date().toISOString(), actorId: s.viewerId, kind, text },
      ],
    })),

  reset: () => set({ ...initial() }),
})

export const useStore = create<State>()(
  persist(createState, {
    name: STORAGE_KEY,
    version: STORAGE_VERSION,
    storage: createJSONStorage(() => sessionStorage),
    // Actions are rebuilt on load; only the data and the demo lenses persist.
    partialize: (s) => ({
      accounts: s.accounts,
      opportunities: s.opportunities,
      artifacts: s.artifacts,
      estimates: s.estimates,
      jobs: s.jobs,
      invoices: s.invoices,
      reminders: s.reminders,
      checklists: s.checklists,
      activity: s.activity,
      siteVisits: s.siteVisits,
      scopeExtractions: s.scopeExtractions,
      procurementOrders: s.procurementOrders,
      materialOrders: s.procurementOrders,
      changeOrders: s.changeOrders,
      issues: s.issues,
      users: s.users,
      locations: s.locations,
      workspaceTemplate: s.workspaceTemplate,
      siteVisitForms: s.siteVisitForms,
      checklistTemplates: s.checklistTemplates,
      serviceTemplates: s.serviceTemplates,
      priceBookItems: s.priceBookItems,
      proposalTemplates: s.proposalTemplates,
      stageDefinitions: s.stageDefinitions,
      messageThreads: s.messageThreads,
      communicationTemplates: s.communicationTemplates,
      paymentRequests: s.paymentRequests,
      prospectRequests: s.prospectRequests,
      viewerId: s.viewerId,
      locationFilter: s.locationFilter,
      density: s.density,
      theme: s.theme,
    }),
  }),
)

/* ---- Derived helpers used across screens -------------------------------- */

function contractTotal(state: State, opportunityId: string) {
  const est = state.estimates.find((e) => e.opportunityId === opportunityId)
  return est ? estimateTotal(est) : 0
}

/**
 * Scope sections always add up. Alternatives are a customer choice, so only the
 * selected one (or the recommended one, pre-signature) counts.
 */
export function estimateTotal(est: Estimate): number {
  const scopes = est.options.filter((o) => o.kind === 'scope')
  const alts = est.options.filter((o) => o.kind === 'alternative')
  const chosen = alts.find((o) => o.selectedByCustomer) ?? alts.find((o) => o.recommended)
  return [...scopes, ...(chosen ? [chosen] : [])]
    .flatMap((o) => o.lineItems)
    .reduce((s, li) => s + li.qty * li.unitPrice, 0)
}

export const optionTotal = (items: { qty: number; unitPrice: number }[]) =>
  items.reduce((s, li) => s + li.qty * li.unitPrice, 0)

export const money = (n: number, compact = false) =>
  compact && Math.abs(n) >= 1000
    ? `$${(n / 1000).toFixed(Math.abs(n) >= 100_000 ? 0 : 1)}k`
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function roleLabel(role: Role) {
  return ROLE_LABEL[role]
}

export { iso }
