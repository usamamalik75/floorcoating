import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, isToday, parseISO } from 'date-fns'
import { FileText, MapPin, Ruler } from 'lucide-react'
import { useStore, money, estimateTotal } from '@/store/useStore'
import { useScopedOpportunities, useChecklistTemplates, useLocations, usePriceBookItems, useProposalTemplates, useUserDirectory } from '@/store/selectors'
import { ACCOUNT_BY_ID } from '@/data/seed'
import { STAGE_BY_ID, stageLabel, JOB_STATUSES, jobStatusLabel } from '@/domain/stages'
import { VISIT_MODULE_LABEL, visitVocab } from '@/domain/types'
import { Customers as CustomerWorkspace } from '@/routes/Customers'
import { Accounting } from '@/routes/Accounting'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  SectionTitle,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import { cn } from '@/lib/cn'

type VisitFilter = 'upcoming' | 'today' | 'completed' | 'all'

export function SiteVisits() {
  const opps = useScopedOpportunities()
  const visits = useStore((s) => s.siteVisits)
  const moveStage = useStore((s) => s.moveStage)
  const navigate = useNavigate()
  const userById = useUserDirectory()
  const [filter, setFilter] = useState<VisitFilter>('all')
  const [creating, setCreating] = useState(false)

  const rows = useMemo(() => {
    return opps
      .filter((o) =>
        [
          'site_visit_required',
          'site_visit_scheduled',
          'site_visit_completed',
          'estimate_in_progress',
          'estimate_ready',
          'proposal_sent',
          'awarded',
        ].includes(o.stage),
      )
      .map((o) => ({
        opp: o,
        visit: visits.find((v) => v.opportunityId === o.id),
      }))
      .filter(({ opp, visit }) => {
        if (filter === 'completed') return Boolean(visit?.completedAt)
        if (filter === 'today') return opp.visitAt && isToday(parseISO(opp.visitAt))
        if (filter === 'upcoming')
          return opp.visitAt && !visit?.completedAt && parseISO(opp.visitAt) >= new Date()
        return true
      })
  }, [opps, visits, filter])

  const candidates = opps.filter(
    (opp) =>
      ['new_lead', 'contacted', 'qualified', 'site_visit_required'].includes(opp.stage) &&
      !visits.some((visit) => visit.opportunityId === opp.id),
  )

  return (
    <ModuleShell
      title={VISIT_MODULE_LABEL}
      subtitle="Site visits for commercial & industrial; sales calls for residential. Forms, measurements, files, and photos stay on the opportunity."
      action={
        <div className="flex flex-wrap gap-2">
          <Link to="/intake">
            <Button size="sm">New lead</Button>
          </Link>
          <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
            Schedule visit or call
          </Button>
        </div>
      }
      filters={[
        { id: 'all', label: 'All' },
        { id: 'today', label: 'Today' },
        { id: 'upcoming', label: 'Upcoming' },
        { id: 'completed', label: 'Completed' },
      ]}
      active={filter}
      onFilter={(id) => setFilter(id as VisitFilter)}
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<MapPin size={28} />}
          title="No visits or calls"
          description="Scheduling from the sales pipeline creates a record here."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Opportunity</Th>
              <Th width={140}>When</Th>
              <Th width={120}>Rep</Th>
              <Th width={120}>Status</Th>
              <Th width={100} />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ opp, visit }) => (
              <Tr key={opp.id}>
                <Td>
                  <Link to={`/opportunities/${opp.id}?tab=visits`} className="font-medium hover:underline">
                    {opp.name}
                  </Link>
                  <p className="text-sm text-muted">{ACCOUNT_BY_ID[opp.accountId]?.name}</p>
                </Td>
                <Td className="text-secondary">
                  {opp.visitAt ? format(parseISO(opp.visitAt), 'd MMM · HH:mm') : '—'}
                </Td>
                <Td className="text-secondary">{userById[opp.ownerId]?.name}</Td>
                <Td>
                  <Badge tone={visit?.completedAt ? 'success' : 'attention'}>
                    {visit?.completedAt ? 'Completed' : stageLabel(opp.stage, opp.category)}
                  </Badge>
                </Td>
                <Td>
                  <Link to={`/opportunities/${opp.id}/visit`} className="text-sm font-medium text-brand hover:underline">
                    Open form
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Schedule visit or call"
        subtitle="Start the site visit or sales call workflow from an eligible sales opportunity."
      >
        <div className="space-y-2">
          {candidates.length === 0 ? (
            <EmptyState
              title="No eligible opportunities"
              description="Qualify or route a lead first, then schedule the visit or call."
            />
          ) : (
            candidates.map((opp) => (
              <button
                key={opp.id}
                type="button"
                onClick={() => {
                  moveStage(opp.id, 'site_visit_required')
                  setCreating(false)
                  navigate(`/opportunities/${opp.id}?tab=visits`)
                }}
                className="flex w-full items-start justify-between gap-3 rounded-md border border-subtle bg-surface-raised px-3 py-2.5 text-left hover:border-strong"
              >
                <div className="min-w-0">
                  <p className="font-medium text-primary">{opp.name}</p>
                  <p className="text-sm text-muted">
                    {ACCOUNT_BY_ID[opp.accountId]?.name} · {visitVocab(opp.category).Singular}
                  </p>
                </div>
                <Badge tone="neutral">{stageLabel(opp.stage, opp.category)}</Badge>
              </button>
            ))
          )}
        </div>
      </Modal>
    </ModuleShell>
  )
}

export function Estimates() {
  const estimates = useStore((s) => s.estimates)
  const opps = useScopedOpportunities()
  const moveStage = useStore((s) => s.moveStage)
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)

  const statusMap: Record<string, string[]> = {
    all: [],
    draft: ['draft'],
    review: ['pending_approval'],
    approved: ['approved'],
    converted: ['sent', 'signed'],
    rejected: ['declined'],
  }

  const rows = estimates
    .filter((e) => opps.some((o) => o.id === e.opportunityId))
    .filter((e) => filter === 'all' || statusMap[filter]?.includes(e.status))
  const candidates = opps.filter(
    (opp) =>
      ['site_visit_completed', 'estimate_in_progress', 'estimate_ready'].includes(opp.stage) &&
      !estimates.some((estimate) => estimate.opportunityId === opp.id),
  )

  return (
    <ModuleShell
      title="Estimates"
      subtitle="Versioned pricing and scope live here; the pipeline tracks progress and approval."
      action={
        <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
          New estimate
        </Button>
      }
      filters={[
        { id: 'all', label: 'All' },
        { id: 'draft', label: 'Draft' },
        { id: 'review', label: 'In Review' },
        { id: 'approved', label: 'Approved' },
        { id: 'converted', label: 'Converted' },
        { id: 'rejected', label: 'Rejected' },
      ]}
      active={filter}
      onFilter={setFilter}
    >
      {rows.length === 0 ? (
        <EmptyState icon={<Ruler size={28} />} title="No estimates" description="Moving an opportunity to Estimate In Progress creates a draft here." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Opportunity</Th>
              <Th width={120}>Status</Th>
              <Th width={110} align="right">
                Total
              </Th>
              <Th width={100} />
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const opp = opps.find((o) => o.id === e.opportunityId)
              return (
                <Tr key={e.id}>
                  <Td>
                    <p className="font-medium">{opp?.name ?? e.opportunityId}</p>
                    <p className="text-sm text-muted">{opp?.code}</p>
                  </Td>
                  <Td>
                    <Badge tone={e.status === 'approved' || e.status === 'signed' ? 'success' : 'neutral'}>
                      {e.status.replace(/_/g, ' ')}
                    </Badge>
                  </Td>
                  <Td align="right" mono>
                    {money(estimateTotal(e))}
                  </Td>
                  <Td>
                    <Link to={`/estimate/${e.opportunityId}`} className="text-sm font-medium text-brand hover:underline">
                      Open
                    </Link>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create estimate"
        subtitle="Start an estimate from a visit-complete opportunity."
      >
        <div className="space-y-2">
          {candidates.length === 0 ? (
            <EmptyState
              title="No eligible opportunities"
              description="Complete a site visit or sales call first, then start the estimate."
            />
          ) : (
            candidates.map((opp) => (
              <button
                key={opp.id}
                type="button"
                onClick={() => {
                  moveStage(opp.id, 'estimate_in_progress')
                  setCreating(false)
                  navigate(`/estimate/${opp.id}`)
                }}
                className="flex w-full items-start justify-between gap-3 rounded-md border border-subtle bg-surface-raised px-3 py-2.5 text-left hover:border-strong"
              >
                <div className="min-w-0">
                  <p className="font-medium text-primary">{opp.name}</p>
                  <p className="text-sm text-muted">{opp.code}</p>
                </div>
                <Badge tone="neutral">{stageLabel(opp.stage, opp.category)}</Badge>
              </button>
            ))
          )}
        </div>
      </Modal>
    </ModuleShell>
  )
}

export function Proposals() {
  const estimates = useStore((s) => s.estimates)
  const opps = useScopedOpportunities()
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const rows = estimates
    .filter((e) => ['approved', 'sent', 'signed', 'declined'].includes(e.status))
    .filter((e) => opps.some((o) => o.id === e.opportunityId))
    .filter((e) => {
      if (filter === 'all') return true
      if (filter === 'draft') return e.status === 'approved'
      if (filter === 'sent') return e.status === 'sent'
      if (filter === 'accepted') return e.status === 'signed'
      if (filter === 'declined') return e.status === 'declined'
      return true
    })
  const candidates = estimates
    .filter((estimate) => estimate.status === 'approved')
    .filter((estimate) => opps.some((opp) => opp.id === estimate.opportunityId))

  return (
    <ModuleShell
      title="Proposals"
      subtitle="Customer-facing documents. Proposal acceptance awards the opportunity and creates a Job."
      action={
        <Button size="sm" variant="primary" onClick={() => setCreating(true)}>
          New proposal
        </Button>
      }
      filters={[
        { id: 'all', label: 'All' },
        { id: 'draft', label: 'Ready to Send' },
        { id: 'sent', label: 'Sent' },
        { id: 'accepted', label: 'Proposal acceptance' },
        { id: 'declined', label: 'Declined' },
      ]}
      active={filter}
      onFilter={setFilter}
    >
      {rows.length === 0 ? (
        <EmptyState icon={<FileText size={28} />} title="No proposals" description="Approve an estimate, then generate a proposal from the estimate builder." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Opportunity</Th>
              <Th width={110}>Status</Th>
              <Th width={110} align="right">
                Value
              </Th>
              <Th width={140} />
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const opp = opps.find((o) => o.id === e.opportunityId)
              return (
                <Tr key={e.id}>
                  <Td>
                    <p className="font-medium">{opp?.name}</p>
                    <p className="text-sm text-muted">{ACCOUNT_BY_ID[opp?.accountId ?? '']?.name}</p>
                  </Td>
                  <Td>
                    <Badge tone={e.status === 'signed' ? 'success' : e.status === 'sent' ? 'attention' : 'neutral'}>
                      {e.status === 'signed' ? 'Proposal acceptance' : e.status === 'approved' ? 'Ready' : e.status}
                    </Badge>
                  </Td>
                  <Td align="right" mono>
                    {money(estimateTotal(e))}
                  </Td>
                  <Td className="space-x-3">
                    <Link to={`/estimate/${e.opportunityId}`} className="text-sm font-medium text-brand hover:underline">
                      Preview
                    </Link>
                    {e.token && (
                      <Link to={`/proposal/${e.token}`} className="text-sm text-muted hover:underline">
                        Customer link
                      </Link>
                    )}
                    {e.status === 'signed' && (
                      <Link to="/jobs" className="text-sm font-medium text-brand hover:underline">
                        Open Job
                      </Link>
                    )}
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create proposal"
        subtitle="Open an approved estimate and continue into the proposal send workflow."
      >
        <div className="space-y-2">
          {candidates.length === 0 ? (
            <EmptyState title="No approved estimates" description="Approve an estimate first, then create the proposal send flow." />
          ) : (
            candidates.map((estimate) => {
              const opp = opps.find((candidate) => candidate.id === estimate.opportunityId)
              if (!opp) return null
              return (
                <button
                  key={estimate.id}
                  type="button"
                  onClick={() => {
                    setCreating(false)
                    navigate(`/estimate/${estimate.opportunityId}`)
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-md border border-subtle bg-surface-raised px-3 py-2.5 text-left hover:border-strong"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-primary">{opp.name}</p>
                    <p className="text-sm text-muted">{ACCOUNT_BY_ID[opp.accountId]?.name}</p>
                  </div>
                  <Badge tone="success">Approved</Badge>
                </button>
              )
            })
          )}
        </div>
      </Modal>
    </ModuleShell>
  )
}

export function Customers() {
  return (
    <div className="h-full overflow-hidden">
      <CustomerWorkspace />
    </div>
  )
}

export function Finance() {
  return <Accounting />
}

export function Reports() {
  const opps = useStore((s) => s.opportunities)
  const jobs = useStore((s) => s.jobs)
  const invoices = useStore((s) => s.invoices)
  const locations = useLocations()

  const sales = opps.filter((o) => STAGE_BY_ID[o.stage]?.phase === 'sales')
  const awarded = opps.filter((o) => o.stage === 'awarded')
  const lost = opps.filter((o) => o.stage === 'lost')
  const billed = invoices.reduce((s, i) => s + i.amount, 0)
  const paid = invoices.reduce((s, i) => s + i.payments.reduce((a, p) => a + p.amount, 0), 0)

  const byLocation = locations.map((loc) => {
    const locOpps = opps.filter((o) => o.locationId === loc.id)
    const won = locOpps.filter((o) => o.stage === 'awarded')
    return {
      loc,
      open: locOpps.filter((o) => STAGE_BY_ID[o.stage]?.phase === 'sales' && o.stage !== 'lost' && o.stage !== 'awarded').length,
      won: won.length,
      value: won.reduce((a, o) => a + o.value, 0),
    }
  })

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="w-full px-5 py-5">
        <header className="mb-5">
          <h1 className="font-display text-2xl text-primary">Reports</h1>
          <p className="mt-0.5 text-base text-muted">
            End-to-end journey without stuffing twenty stages onto one board.
          </p>
        </header>

        <div className="mb-5 grid gap-3 sm:grid-cols-4">
          <Stat label="Open sales" value={String(sales.filter((o) => !['awarded', 'lost'].includes(o.stage)).length)} />
          <Stat label="Awarded" value={String(awarded.length)} />
          <Stat label="Win rate" value={`${sales.length ? Math.round((awarded.length / (awarded.length + lost.length || 1)) * 100) : 0}%`} />
          <Stat label="Collected" value={money(paid, true)} helper={`of ${money(billed, true)} billed`} />
        </div>

        <SectionTitle>Location performance</SectionTitle>
        <Card className="mb-5 overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Location</Th>
                <Th width={80} align="right">
                  Open
                </Th>
                <Th width={80} align="right">
                  Won
                </Th>
                <Th width={120} align="right">
                  Won value
                </Th>
              </tr>
            </thead>
            <tbody>
              {byLocation.map((r) => (
                <Tr key={r.loc.id}>
                  <Td>{r.loc.name}</Td>
                  <Td align="right" mono>
                    {r.open}
                  </Td>
                  <Td align="right" mono>
                    {r.won}
                  </Td>
                  <Td align="right" mono>
                    {money(r.value)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <SectionTitle>Job pipeline snapshot</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {JOB_STATUSES.map((st) => (
            <Card key={st} className="p-3">
              <p className="text-2xs tracking-wide text-muted uppercase">{jobStatusLabel(st)}</p>
              <p className="mt-1 font-display text-xl text-primary">
                {jobs.filter((j) => j.status === st).length}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Settings() {
  const priceBookItems = usePriceBookItems()
  const proposalTemplates = useProposalTemplates()
  const checklistTemplates = useChecklistTemplates()

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="w-full px-5 py-5">
        <header className="mb-5">
          <h1 className="font-display text-2xl text-primary">Settings</h1>
          <p className="mt-0.5 text-base text-muted">
            Live company standards from Admin Setup — catalogue, proposal templates, and checklists.
          </p>
        </header>

        <SectionTitle>Builder entry points</SectionTitle>
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-base font-medium text-primary">Admin Setup</p>
            <p className="mt-1 text-sm text-muted">
              Edit proposal templates, estimating packs, assessment forms, and checklists.
            </p>
            <Link to="/admin">
              <Button size="sm" className="mt-3">Open Admin</Button>
            </Link>
          </Card>
          <Card className="p-4">
            <p className="text-base font-medium text-primary">Communications</p>
            <p className="mt-1 text-sm text-muted">
              Review customer threads, templates, and follow-up drafts in one inbox.
            </p>
            <Link to="/communications">
              <Button size="sm" className="mt-3">Open communications</Button>
            </Link>
          </Card>
          <Card className="p-4">
            <p className="text-base font-medium text-primary">Hosted payments</p>
            <p className="mt-1 text-sm text-muted">
              Payment links are issued from Finance and displayed back on the opportunity.
            </p>
            <Link to="/finance">
              <Button size="sm" className="mt-3">Open finance</Button>
            </Link>
          </Card>
        </div>

        <SectionTitle>Product and service catalogue</SectionTitle>
        <Card className="mb-5 overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>System</Th>
                <Th width={100} align="right">
                  Unit price
                </Th>
                <Th width={80}>Unit</Th>
              </tr>
            </thead>
            <tbody>
              {priceBookItems.slice(0, 8).map((p) => (
                <Tr key={p.id}>
                  <Td>{p.name}</Td>
                  <Td align="right" mono>
                    {money(p.unitPrice)}
                  </Td>
                  <Td className="text-muted">{p.unit}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <SectionTitle>Proposal templates</SectionTitle>
        <div className="mb-5 grid gap-2 sm:grid-cols-2">
          {proposalTemplates.map((t) => (
            <Card key={t.id} className="p-3">
              <p className="font-medium text-primary">{t.name}</p>
              <p className="mt-1 text-sm text-muted">
                {t.depositPct}% deposit · valid {t.validDays} days
              </p>
            </Card>
          ))}
        </div>

        <SectionTitle>Checklist standards</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {checklistTemplates.map((c) => (
            <Card key={c.id} className="p-3">
              <p className="font-medium text-primary">{c.name}</p>
              <p className="mt-1 text-sm text-muted">
                {c.items.length} items · {c.managedByCompany ? 'Company managed' : 'Location editable'}
              </p>
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <Link to="/admin" className="text-sm font-medium text-brand hover:underline">
            Open full network overview →
          </Link>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <Card className="p-3">
      <p className="text-2xs tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl text-primary">{value}</p>
      {helper && <p className="mt-0.5 text-sm text-muted">{helper}</p>}
    </Card>
  )
}

function ModuleShell({
  title,
  subtitle,
  action,
  filters,
  active,
  onFilter,
  children,
}: {
  title: string
  subtitle: string
  action?: React.ReactNode
  filters: { id: string; label: string }[]
  active: string
  onFilter: (id: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="w-full px-5 py-5">
        <header className="mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="font-display text-2xl text-primary">{title}</h1>
              <p className="mt-0.5 text-base text-muted">{subtitle}</p>
            </div>
            <div className="ml-auto">{action}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilter(f.id)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-sm font-medium',
                  active === f.id ? 'bg-action-soft text-brand' : 'text-muted hover:bg-surface-sunken',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>
        <Card className="overflow-hidden">{children}</Card>
      </div>
    </div>
  )
}
