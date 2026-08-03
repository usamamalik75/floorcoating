import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isToday, parseISO } from 'date-fns'
import { FileText, MapPin, Package, Ruler } from 'lucide-react'
import { useStore, money, estimateTotal } from '@/store/useStore'
import { useScopedOpportunities } from '@/store/selectors'
import { ACCOUNT_BY_ID, LOCATION_BY_ID, USER_BY_ID } from '@/data/seed'
import { PRICE_BOOK } from '@/data/priceBook'
import { CHECKLIST_TEMPLATES } from '@/data/checklists'
import { PROPOSAL_TEMPLATES } from '@/data/priceBook'
import { STAGE_BY_ID, stageLabel, JOB_STATUSES, jobStatusLabel } from '@/domain/stages'
import { Accounts } from '@/routes/Admin'
import { Accounting } from '@/routes/Accounting'
import { FmsOrders } from '@/routes/Fms'
import {
  Badge,
  Card,
  EmptyState,
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
  const [filter, setFilter] = useState<VisitFilter>('all')

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

  return (
    <ModuleShell
      title="Site Visits"
      subtitle="Guided forms, measurements and photos — linked to the opportunity."
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
        <EmptyState icon={<MapPin size={28} />} title="No site visits" description="Scheduling a visit on the sales pipeline creates a record here." />
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
                <Td className="text-secondary">{USER_BY_ID[opp.ownerId]?.name}</Td>
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
    </ModuleShell>
  )
}

export function Estimates() {
  const estimates = useStore((s) => s.estimates)
  const opps = useScopedOpportunities()
  const [filter, setFilter] = useState('all')

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

  return (
    <ModuleShell
      title="Estimates"
      subtitle="Detailed pricing lives here. The sales pipeline only tracks Estimate In Progress / Ready."
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
    </ModuleShell>
  )
}

export function Proposals() {
  const estimates = useStore((s) => s.estimates)
  const opps = useScopedOpportunities()
  const [filter, setFilter] = useState('all')

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

  return (
    <ModuleShell
      title="Proposals"
      subtitle="Customer-facing documents. Acceptance awards the opportunity and creates a Job."
      filters={[
        { id: 'all', label: 'All' },
        { id: 'draft', label: 'Ready to Send' },
        { id: 'sent', label: 'Sent' },
        { id: 'accepted', label: 'Accepted' },
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
                      {e.status === 'signed' ? 'Accepted' : e.status === 'approved' ? 'Ready' : e.status}
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
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </ModuleShell>
  )
}

export function Materials() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-[80rem] px-5 py-5">
        <header className="mb-4">
          <h1 className="font-display text-2xl text-primary">Materials</h1>
          <p className="mt-0.5 text-base text-muted">
            Requirements raised from Jobs; fulfilment continues in Franchise Management.
          </p>
        </header>
        <Card className="mb-4 p-3">
          <p className="flex items-center gap-2 text-base text-secondary">
            <Package size={14} />
            Orders below are the same records as FMS Material Orders — one ecosystem, two products.
          </p>
        </Card>
        <FmsOrders />
      </div>
    </div>
  )
}

export function Customers() {
  return (
    <div className="h-full overflow-hidden">
      <Accounts />
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

  const sales = opps.filter((o) => STAGE_BY_ID[o.stage]?.phase === 'sales')
  const awarded = opps.filter((o) => o.stage === 'awarded')
  const lost = opps.filter((o) => o.stage === 'lost')
  const billed = invoices.reduce((s, i) => s + i.amount, 0)
  const paid = invoices.reduce((s, i) => s + i.payments.reduce((a, p) => a + p.amount, 0), 0)

  const byLocation = Object.values(LOCATION_BY_ID).map((loc) => {
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
      <div className="mx-auto max-w-[80rem] px-5 py-5">
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
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-[80rem] px-5 py-5">
        <header className="mb-5">
          <h1 className="font-display text-2xl text-primary">Settings</h1>
          <p className="mt-0.5 text-base text-muted">
            Network standards — price book, proposal templates and checklists.
          </p>
        </header>

        <SectionTitle>Price book</SectionTitle>
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
              {PRICE_BOOK.slice(0, 8).map((p) => (
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
          {PROPOSAL_TEMPLATES.map((t) => (
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
          {CHECKLIST_TEMPLATES.map((c) => (
            <Card key={c.id} className="p-3">
              <p className="font-medium text-primary">{c.name}</p>
              <p className="mt-1 text-sm text-muted">
                {c.items.length} items · {c.managedByFranchisor ? 'Franchisor managed' : 'Location editable'}
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
  filters,
  active,
  onFilter,
  children,
}: {
  title: string
  subtitle: string
  filters: { id: string; label: string }[]
  active: string
  onFilter: (id: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-[80rem] px-5 py-5">
        <header className="mb-4">
          <h1 className="font-display text-2xl text-primary">{title}</h1>
          <p className="mt-0.5 text-base text-muted">{subtitle}</p>
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
