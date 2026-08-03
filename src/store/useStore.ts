import { create, type StateCreator } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Account,
  Activity,
  Artifact,
  ChangeOrder,
  ChecklistInstance,
  Estimate,
  Invoice,
  Issue,
  Job,
  JobStatus,
  MaterialOrder,
  Opportunity,
  ProspectRequest,
  Reminder,
  Role,
  SiteVisitResponse,
  StageId,
  Takeoff,
} from '@/domain/types'
import { ROLE_LABEL } from '@/domain/types'
import { formForCategory } from '@/data/siteVisitForms'
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
  MATERIAL_ORDERS,
  OPPORTUNITIES,
  PROSPECT_REQUESTS,
  REMINDERS,
  SITE_VISIT_RESPONSES,
  TAKEOFFS,
  USERS,
  iso,
} from '@/data/seed'
import { STAGE_BY_ID, stageLabel } from '@/domain/stages'

let seq = 1000
const nextId = (prefix: string) => `${prefix}_${++seq}`

export interface MoveMeta {
  reminderAt?: string
  reminderNote?: string
  reminderReason?: string
  expectedPeriod?: string
  assigneeId?: string
  reason?: string
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
  prospectRequests: ProspectRequest[]
  siteVisits: SiteVisitResponse[]
  takeoffs: Takeoff[]
  materialOrders: MaterialOrder[]
  changeOrders: ChangeOrder[]
  issues: Issue[]

  viewerId: string
  locationFilter: string | 'all'
  density: 'comfortable' | 'field'
  theme: 'light' | 'dark'

  setViewer: (id: string) => void
  setLocationFilter: (id: string | 'all') => void
  setDensity: (d: 'comfortable' | 'field') => void
  setTheme: (t: 'light' | 'dark') => void

  moveStage: (opportunityId: string, to: StageId, meta?: MoveMeta) => void
  setJobStatus: (opportunityId: string, status: JobStatus) => void
  patchOpportunity: (id: string, next: Partial<Opportunity>) => void
  createOpportunity: (o: Omit<Opportunity, 'id'>) => string
  createLead: (input: LeadInput) => string
  ensureEstimate: (opportunityId: string) => string

  addArtifact: (a: Omit<Artifact, 'id'>) => void
  toggleChecklistItem: (opportunityId: string, templateId: string, itemId: string) => void
  saveSiteVisit: (opportunityId: string, formId: string, values: Record<string, string | number | boolean>, complete: boolean) => void

  upsertEstimate: (e: Estimate) => void
  updateEstimate: (id: string, next: Partial<Estimate>) => void
  approveEstimate: (id: string, approverId: string) => void
  rejectEstimate: (id: string, note: string) => void
  signEstimate: (id: string, signedBy: string, selectedOptionId?: string) => void

  acceptTakeoff: (takeoffId: string) => void

  scheduleJob: (job: Omit<Job, 'id'>) => void
  updateJob: (jobId: string, next: Partial<Job>) => void
  addDailyLog: (jobId: string, note: string) => void

  upsertMaterialOrder: (o: MaterialOrder) => void
  submitMaterialOrder: (id: string) => void
  advanceMaterialOrder: (id: string) => void

  addChangeOrder: (c: Omit<ChangeOrder, 'id'>) => void
  setChangeOrderStatus: (id: string, status: ChangeOrder['status']) => void
  addIssue: (i: Omit<Issue, 'id'>) => void
  resolveIssue: (id: string) => void

  createInvoice: (i: Omit<Invoice, 'id'>) => void
  recordPayment: (invoiceId: string, amount: number, method: 'Check' | 'ACH' | 'Card') => void

  submitProspectRequest: (r: Omit<ProspectRequest, 'id'>) => void
  decideProspectRequest: (id: string, approve: boolean, approverId: string) => void
  importProspects: (id: string) => void

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
  sqft: number
}

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
  prospectRequests: structuredClone(PROSPECT_REQUESTS),
  siteVisits: structuredClone(SITE_VISIT_RESPONSES),
  takeoffs: structuredClone(TAKEOFFS),
  materialOrders: structuredClone(MATERIAL_ORDERS),
  changeOrders: structuredClone(CHANGE_ORDERS),
  issues: structuredClone(ISSUES),
})

/**
 * Demo state survives a refresh or a link opened in a new tab, which is how a
 * walkthrough actually gets used. It is per-tab and versioned, so a changed
 * seed invalidates it and "Reset demo" always returns to the story's start.
 */
const STORAGE_KEY = 'fcg-prototype'
const STORAGE_VERSION = 2

const createState: StateCreator<State> = (set, get) => ({
  ...initial(),

  viewerId: 'u_nic',
  locationFilter: 'all',
  density: 'comfortable',
  theme: 'light',

  setViewer: (id) => {
    const user = USERS.find((u) => u.id === id)
    set({
      viewerId: id,
      // Anyone but the franchisor is scoped to their own territory.
      locationFilter: user?.locationId ?? 'all',
      // Field roles land in the field-density experience automatically.
      density: user?.role === 'tech' || user?.role === 'crew_leader' ? 'field' : 'comfortable',
    })
  },
  setLocationFilter: (id) => set({ locationFilter: id }),
  setDensity: (density) => set({ density }),
  setTheme: (theme) => set({ theme }),

  /* ---- Pipeline ------------------------------------------------------- */

  moveStage: (opportunityId, to, meta = {}) => {
    const { opportunities, viewerId } = get()
    const o = opportunities.find((x) => x.id === opportunityId)
    if (!o) return

    const from = o.stage
    const def = STAGE_BY_ID[to]

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
    }

    def.notify.forEach((n) =>
      get().logActivity(opportunityId, 'system', `Notified ${ROLE_LABEL[n.role]}: ${n.message}`),
    )

    // Stage changes create related module records — they do not redirect the user.
    if (to === 'site_visit_scheduled' || to === 'site_visit_required') {
      const form = formForCategory(o.category)
      if (form && !get().siteVisits.some((v) => v.opportunityId === opportunityId)) {
        set((s) => ({
          siteVisits: [
            ...s.siteVisits,
            {
              opportunityId,
              formId: form.id,
              values: {},
              completedAt: null,
              completedById: null,
            },
          ],
        }))
        get().logActivity(opportunityId, 'system', 'Site Visit record created — open it from Site Visits or this opportunity.')
      }
    }

    if (to === 'estimate_in_progress') {
      get().ensureEstimate(opportunityId)
    }

    if (to === 'awarded') {
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
        number: `FCG-INV-${2100 + get().invoices.length}`,
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
        `Final invoice synced to QuickBooks — contract plus ${approvedCo > 0 ? 'approved change orders ' : ''}less deposit. Royalty accrued at 5% of gross.`,
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
    let account = accounts.find(
      (a) => a.name.toLowerCase() === input.company.toLowerCase() && a.locationId === input.locationId,
    )
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
    }

    const code = `FCG-${input.locationId.replace('loc_', '').toUpperCase()}-${1100 + get().opportunities.length}`
    const id = nextId('op')
    set((s) => ({
      opportunities: [
        ...s.opportunities,
        {
          id,
          code,
          name: `${input.company} — new enquiry`,
          accountId: account!.id,
          locationId: input.locationId,
          category: input.category,
          stage: 'new_lead',
          temperature: 'warm',
          ownerId: '',
          estimatorId: null,
          pmId: null,
          value: 0,
          sqft: input.sqft,
          coveLf: 0,
          address: `${input.city}, ${input.state}`,
          zip: input.zip,
          createdAt: new Date().toISOString(),
          stageEnteredAt: new Date().toISOString(),
          systemIds: [],
          reminderAt: null,
          source: input.source,
          visitAt: null,
        },
      ],
    }))
    get().logActivity(id, 'system', `Lead captured from ${input.source} and routed by zip ${input.zip}.`)
    if (input.message) get().logActivity(id, 'note', `Customer message: “${input.message}”`)
    return id
  },

  /* ---- Records -------------------------------------------------------- */

  addArtifact: (a) => {
    set((s) => ({ artifacts: [...s.artifacts, { ...a, id: nextId('ar') }] }))
    get().logActivity(a.opportunityId, 'artifact', `Added ${a.kind} — ${a.name}.`)
  },

  toggleChecklistItem: (opportunityId, templateId, itemId) => {
    const { checklists } = get()
    const existing = checklists.find(
      (c) => c.opportunityId === opportunityId && c.templateId === templateId,
    )
    if (!existing) {
      set({
        checklists: [...checklists, { id: nextId('ci'), templateId, opportunityId, done: [itemId], completedAt: null }],
      })
      return
    }
    const done = existing.done.includes(itemId)
      ? existing.done.filter((i) => i !== itemId)
      : [...existing.done, itemId]
    set({ checklists: checklists.map((c) => (c.id === existing.id ? { ...c, done } : c)) })
  },

  saveSiteVisit: (opportunityId, formId, values, complete) => {
    const { siteVisits, viewerId } = get()
    const existing = siteVisits.find((v) => v.opportunityId === opportunityId)
    const next: SiteVisitResponse = {
      opportunityId,
      formId,
      values,
      completedAt: complete ? new Date().toISOString() : (existing?.completedAt ?? null),
      completedById: complete ? viewerId : (existing?.completedById ?? null),
    }
    set({
      siteVisits: existing
        ? siteVisits.map((v) => (v.opportunityId === opportunityId ? next : v))
        : [...siteVisits, next],
    })

    // Measurements captured on site flow straight into the record, so the
    // estimator never re-keys them.
    const sqft = Number(values.sqft)
    const cove = Number(values.cove_lf)
    get().patchOpportunity(opportunityId, {
      ...(Number.isFinite(sqft) && sqft > 0 ? { sqft } : {}),
      ...(Number.isFinite(cove) && cove > 0 ? { coveLf: cove } : {}),
    })

    if (complete) {
      get().logActivity(opportunityId, 'checklist', 'Guided site visit form submitted from the field.')
      const opp = get().opportunities.find((o) => o.id === opportunityId)
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
    get().logActivity(est.opportunityId, 'system', `Estimate approved by ${USERS.find((u) => u.id === approverId)?.name}.`)
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
    const id = nextId('est')
    const token = id.replace('est_', '').slice(0, 6)
    const estimate: Estimate = {
      id,
      opportunityId,
      options: [],
      templateId: 'pt_industrial',
      internalNotes: '',
      status: 'draft',
      approvedById: null,
      approvedAt: null,
      rejectionNote: null,
      sentAt: null,
      signedAt: null,
      signedBy: null,
      token,
      depositPct: 40,
    }
    get().upsertEstimate(estimate)
    get().logActivity(opportunityId, 'system', 'Draft estimate created — open it from Estimates or this opportunity.')
    return id
  },

  acceptTakeoff: (takeoffId) => {
    const tk = get().takeoffs.find((t) => t.id === takeoffId)
    if (!tk) return
    set((s) => ({
      takeoffs: s.takeoffs.map((t) => (t.id === takeoffId ? { ...t, status: 'accepted' as const } : t)),
    }))
    const sqft = tk.areas.reduce((s, a) => s + a.sqft, 0)
    const cove = tk.areas.reduce((s, a) => s + a.coveLf, 0)
    get().patchOpportunity(tk.opportunityId, { sqft, coveLf: cove })
    get().logActivity(
      tk.opportunityId,
      'system',
      `AI takeoff accepted by the estimator — ${sqft.toLocaleString()} sq ft and ${cove} lin ft of cove written to the record.`,
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

  upsertMaterialOrder: (o) =>
    set((s) => ({
      materialOrders: s.materialOrders.some((x) => x.id === o.id)
        ? s.materialOrders.map((x) => (x.id === o.id ? o : x))
        : [...s.materialOrders, o],
    })),

  submitMaterialOrder: (id) => {
    const mo = get().materialOrders.find((m) => m.id === id)
    if (!mo) return
    const fmsId = `FMS-${4500 + get().materialOrders.length}`
    set((s) => ({
      materialOrders: s.materialOrders.map((m) =>
        m.id === id
          ? { ...m, status: 'submitted' as const, submittedAt: new Date().toISOString(), fmsOrderId: fmsId }
          : m,
      ),
    }))
    get().logActivity(
      mo.opportunityId,
      'system',
      `Material order ${fmsId} submitted to the franchisor via the Franchise Management System.`,
    )
  },

  advanceMaterialOrder: (id) => {
    const order: MaterialOrder['status'][] = ['draft', 'submitted', 'approved', 'shipped', 'delivered']
    const mo = get().materialOrders.find((m) => m.id === id)
    if (!mo) return
    const next = order[Math.min(order.length - 1, order.indexOf(mo.status) + 1)]
    set((s) => ({
      materialOrders: s.materialOrders.map((m) =>
        m.id === id
          ? { ...m, status: next, trackingRef: next === 'shipped' ? `1Z-994-${nextId('T').toUpperCase()}` : m.trackingRef }
          : m,
      ),
    }))
    get().logActivity(mo.opportunityId, 'system', `Material order ${mo.fmsOrderId ?? ''} is now ${next}.`)
  },

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

  /* ---- Prospecting ---------------------------------------------------- */

  submitProspectRequest: (r) =>
    set((s) => ({ prospectRequests: [...s.prospectRequests, { ...r, id: nextId('pr') }] })),

  decideProspectRequest: (id, approve, approverId) =>
    set((s) => ({
      prospectRequests: s.prospectRequests.map((r) =>
        r.id === id
          ? {
              ...r,
              status: approve ? ('approved' as const) : ('rejected' as const),
              approvedById: approverId,
              approvedAt: new Date().toISOString(),
            }
          : r,
      ),
    })),

  importProspects: (id) => {
    const req = get().prospectRequests.find((r) => r.id === id)
    if (!req) return
    const n = Math.round(req.estimatedCount * 0.93)
    const names = [
      'Cascade Provisions', 'Ridgeline Foods', 'Bayou Bottling', 'Summit Creamery',
      'Ironwood Packing', 'Valley Fresh Produce', 'Northstar Frozen', 'Copperfield Mills',
    ]
    const made: Account[] = names.slice(0, 6).map((name, i) => ({
      id: nextId('ac'),
      name,
      vertical: req.vertical,
      locationId: req.locationId,
      contactName: ['Dale Munro', 'Rita Okafor', 'Chris Vance', 'Nadia Ellis', 'Paul Grieve', 'Tess Rowan'][i],
      contactTitle: req.targetTitles[i % req.targetTitles.length],
      email: `contact@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      phone: '(555) 555-0199',
      city: req.originCity.split(',')[0],
      state: req.originCity.split(',')[1]?.trim() ?? '',
      zip: '00000',
      isNational: false,
      source: 'Apollo',
      createdAt: new Date().toISOString(),
      anchorStage: 'prospect',
      prospectRequestId: req.id,
    }))

    set((s) => ({
      accounts: [...s.accounts, ...made],
      prospectRequests: s.prospectRequests.map((r) =>
        r.id === id ? { ...r, status: 'imported' as const, importedCount: n } : r,
      ),
    }))
  },

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
      prospectRequests: s.prospectRequests,
      siteVisits: s.siteVisits,
      takeoffs: s.takeoffs,
      materialOrders: s.materialOrders,
      changeOrders: s.changeOrders,
      issues: s.issues,
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
 * Areas always add up. Alternatives are a customer choice, so only the
 * selected one (or the recommended one, pre-signature) counts.
 */
export function estimateTotal(est: Estimate): number {
  const areas = est.options.filter((o) => o.kind === 'area')
  const alts = est.options.filter((o) => o.kind === 'alternative')
  const chosen = alts.find((o) => o.selectedByCustomer) ?? alts.find((o) => o.recommended)
  return [...areas, ...(chosen ? [chosen] : [])]
    .flatMap((o) => o.lineItems)
    .reduce((s, li) => s + li.qty * li.unitPrice, 0)
}

export const optionTotal = (items: { qty: number; unitPrice: number }[]) =>
  items.reduce((s, li) => s + li.qty * li.unitPrice, 0)

export const money = (n: number, compact = false) =>
  compact && Math.abs(n) >= 1000
    ? `$${(n / 1000).toFixed(Math.abs(n) >= 100_000 ? 0 : 1)}k`
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export const ROYALTY_RATE = 0.05

export function roleLabel(role: Role) {
  return ROLE_LABEL[role]
}

export { iso }
