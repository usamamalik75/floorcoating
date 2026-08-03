import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { format, isBefore, isSameDay } from 'date-fns'
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Boxes,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  HardHat,
  Receipt,
  ScanSearch,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useStore, money, estimateTotal, ROYALTY_RATE } from '@/store/useStore'
import { useScopedOpportunities, useViewer } from '@/store/selectors'
import { LOCATIONS, LOCATION_BY_ID, TODAY, USER_BY_ID } from '@/data/seed'
import { STAGE_BY_ID, stageLabel } from '@/domain/stages'
import type { Opportunity, StageId } from '@/domain/types'
import { Badge, Button, Card, CardHeader, EmptyState, StageChip } from '@/components/ui'
import { cn } from '@/lib/cn'

/* ==========================================================================
   Role-based dashboard
   ==========================================================================
   Seven job functions, seven different first screens, one dataset. A crew
   leader should never have to scroll past pipeline metrics to find today's
   address, and an accountant should never have to open a deal record to see
   what is ready to invoice.
   ========================================================================== */

export function Dashboard() {
  const viewer = useViewer()
  if (!viewer) return null

  // A crew leader or technician has no use for a desktop workspace. Their home
  // is the job sheet, so signing in as one lands there.
  if (viewer.role === 'crew_leader' || viewer.role === 'tech') {
    return <Navigate to="/field" replace />
  }

  const common = {
    franchisor: <FranchisorHome />,
    owner: <OwnerHome />,
    sales: <SalesHome />,
    estimator: <EstimatorHome />,
    pm: <PmHome />,
    crew_leader: <CrewHome />,
    tech: <CrewHome />,
    accounting: <AccountingHome />,
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-[80rem] px-5 py-5">
        <header className="mb-5">
          <p className="text-sm text-muted">{format(TODAY, 'EEEE d MMMM yyyy')}</p>
          <h1 className="font-display text-2xl text-primary">
            {viewer.name.split(' ')[0]}’s workspace
          </h1>
          <p className="mt-0.5 text-base text-muted">
            {viewer.title}
            {viewer.locationId && ` · ${LOCATION_BY_ID[viewer.locationId].name}`}
          </p>
        </header>
        {common[viewer.role]}
      </div>
    </div>
  )
}

/* ---------- shared pieces ------------------------------------------------ */

function Stat({
  label,
  value,
  sub,
  tone,
  icon,
  to,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'default' | 'warning' | 'success'
  icon?: ReactNode
  to?: string
}) {
  const body = (
    <Card
      className={cn(
        'px-4 py-3 transition-colors duration-(--duration-fast)',
        to && 'hover:border-strong',
        tone === 'warning' && 'border-(--status-warning) bg-warning-soft',
        tone === 'success' && 'border-(--status-success) bg-success-soft',
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted">{icon}</span>}
        <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      </div>
      <p className="mt-1 font-display text-2xl leading-none text-primary tabular">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </Card>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

function OppRow({ o, right }: { o: Opportunity; right?: ReactNode }) {
  return (
    <Link
      to={`/opportunities/${o.id}`}
      className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0 hover:bg-surface-inset"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-primary">{o.name}</p>
        <p className="truncate text-sm text-muted">
          {o.code} · {LOCATION_BY_ID[o.locationId]?.name}
        </p>
      </div>
      {right ?? (
        <>
          <StageChip group={STAGE_BY_ID[o.stage].group} label={stageLabel(o.stage, o.category)} />
          <span className="w-20 shrink-0 text-right font-mono text-sm text-primary tabular">
            {money(o.value, true)}
          </span>
        </>
      )}
    </Link>
  )
}

function List({
  title,
  subtitle,
  icon,
  items,
  empty,
  action,
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  items: ReactNode[]
  empty: string
  action?: ReactNode
}) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} icon={icon} actions={action} />
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-base text-muted">{empty}</p>
      ) : (
        items
      )}
    </Card>
  )
}

/* ---------- 1. Franchisor ------------------------------------------------ */

function isOpenOpportunity(
  o: Opportunity,
  jobs: { opportunityId: string; status: string }[],
) {
  if (o.stage === 'lost') return false
  if (STAGE_BY_ID[o.stage]?.phase === 'pre') return false
  if (o.stage === 'awarded') {
    const job = jobs.find((j) => j.opportunityId === o.id)
    return job?.status !== 'paid'
  }
  return true
}

function FranchisorHome() {
  const s = useStore()
  const open = s.opportunities.filter((o) => isOpenOpportunity(o, s.jobs))
  const invoiced = s.invoices.reduce((sum, i) => sum + i.amount, 0)
  const pendingRequests = s.prospectRequests.filter((r) => r.status === 'pending_approval')
  const pendingOrders = s.materialOrders.filter((m) => m.status === 'submitted')

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Network pipeline" value={money(open.reduce((a, o) => a + o.value, 0), true)} sub={`${open.length} live opportunities`} icon={<TrendingUp size={12} />} to="/admin" />
        <Stat label="Invoiced revenue" value={money(invoiced, true)} sub={`Royalty accrued ${money(invoiced * ROYALTY_RATE, true)}`} icon={<Receipt size={12} />} to="/admin" />
        <Stat label="Locations" value={LOCATIONS.length} sub="1 corporate, 2 franchise" icon={<Building2 size={12} />} to="/fms/locations" />
        <Stat
          label="Awaiting your approval"
          value={pendingRequests.length + pendingOrders.length}
          sub={`${pendingRequests.length} prospecting, ${pendingOrders.length} material`}
          tone={pendingRequests.length + pendingOrders.length > 0 ? 'warning' : undefined}
          icon={<ClipboardCheck size={12} />}
          to="/admin"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <List
          title="Prospecting requests awaiting approval"
          subtitle="Locations requesting data-provider lists"
          icon={<ScanSearch size={14} />}
          action={
            <Link to="/prospecting">
              <Button size="sm">Review</Button>
            </Link>
          }
          empty="Nothing pending."
          items={pendingRequests.map((r) => (
            <div key={r.id} className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-primary">
                  {r.vertical} within {r.radiusMiles} miles of {r.originCity}
                </p>
                <p className="text-sm text-muted">
                  {LOCATION_BY_ID[r.locationId].name} · {USER_BY_ID[r.requestedById]?.name} · ~
                  {r.estimatedCount} companies
                </p>
              </div>
              <Badge tone="warning">Pending</Badge>
            </div>
          ))}
        />

        <List
          title="Territory performance"
          subtitle="Win rate and open pipeline by location"
          icon={<Building2 size={14} />}
          empty=""
          items={LOCATIONS.map((l) => {
            const mine = s.opportunities.filter((o) => o.locationId === l.id)
            const won = mine.filter((o) => o.stage === 'awarded')
            const lost = mine.filter((o) => o.stage === 'lost')
            const rate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0
            const openValue = mine
              .filter((o) => isOpenOpportunity(o, s.jobs))
              .reduce((a, o) => a + o.value, 0)
            return (
              <div key={l.id} className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-primary">{l.name}</p>
                  <p className="text-sm text-muted">
                    {l.city}, {l.state} · opened {format(new Date(l.openedAt), 'MMM yyyy')}
                  </p>
                </div>
                <span className="w-16 text-right font-mono text-sm text-secondary tabular">{rate}% win</span>
                <span className="w-20 text-right font-mono text-sm text-primary tabular">
                  {money(openValue, true)}
                </span>
              </div>
            )
          })}
        />
      </div>
    </div>
  )
}

/* ---------- 2. Location owner ------------------------------------------- */

function OwnerHome() {
  const s = useStore()
  const opps = useScopedOpportunities()
  const unassigned = opps.filter((o) => o.stage === 'new_lead' && !o.ownerId)
  const needsScheduling = opps.filter(
    (o) =>
      o.stage === 'awarded' &&
      s.jobs.find((j) => j.opportunityId === o.id)?.status === 'scheduling_required',
  )
  const awaitingApproval = s.estimates.filter(
    (e) => e.status === 'pending_approval' && opps.some((o) => o.id === e.opportunityId),
  )
  const open = opps.filter((o) => isOpenOpportunity(o, s.jobs))
  const outstanding = s.invoices
    .filter((i) => opps.some((o) => o.id === i.opportunityId) && i.status !== 'paid')
    .reduce((a, i) => a + (i.amount - i.payments.reduce((p, x) => p + x.amount, 0)), 0)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open pipeline" value={money(open.reduce((a, o) => a + o.value, 0), true)} sub={`${open.length} opportunities`} to="/sales" />
        <Stat label="Unassigned leads" value={unassigned.length} tone={unassigned.length ? 'warning' : undefined} sub="Need a rep today" to="/sales" />
        <Stat label="Awaiting scheduling" value={needsScheduling.length} tone={needsScheduling.length ? 'warning' : undefined} sub="Signed with no dates" to="/schedule" />
        <Stat label="Outstanding receivables" value={money(outstanding, true)} sub="Across all open invoices" to="/finance" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <List
          title="Leads needing an owner"
          subtitle="Nobody has been assigned yet"
          icon={<Users size={14} />}
          empty="Every lead has a rep."
          items={unassigned.map((o) => (
            <OppRow key={o.id} o={o} right={<Badge tone="warning">Unassigned</Badge>} />
          ))}
        />
        <List
          title="Estimates awaiting approval"
          subtitle="Nothing goes to a customer until this clears"
          icon={<FileSignature size={14} />}
          empty="No estimates pending."
          items={awaitingApproval.map((e) => {
            const o = opps.find((x) => x.id === e.opportunityId)!
            return (
              <OppRow
                key={e.id}
                o={o}
                right={<span className="font-mono text-sm text-primary tabular">{money(estimateTotal(e), true)}</span>}
              />
            )
          })}
        />
      </div>
    </div>
  )
}

/* ---------- 3. Sales rep ------------------------------------------------- */

function SalesHome() {
  const s = useStore()
  const viewer = useViewer()!
  const mine = s.opportunities.filter((o) => o.ownerId === viewer.id)
  const todayVisits = mine.filter((o) => o.visitAt && isSameDay(new Date(o.visitAt), TODAY))
  const dueReminders = s.reminders.filter(
    (r) => !r.done && r.ownerId === viewer.id && isBefore(new Date(r.dueAt), new Date(TODAY.getTime() + 7 * 86_400_000)),
  )
  const openProposals = mine.filter((o) => ['proposal_sent', 'follow_up'].includes(o.stage))
  const newLeads = s.opportunities.filter((o) => o.stage === 'new_lead' && o.locationId === viewer.locationId)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Appointments today" value={todayVisits.length} icon={<CalendarClock size={12} />} tone={todayVisits.length ? 'success' : undefined} to="/field" />
        <Stat label="My open pipeline" value={money(mine.filter((o) => isOpenOpportunity(o, s.jobs)).reduce((a, o) => a + o.value, 0), true)} sub={`${mine.length} records`} to="/sales" />
        <Stat label="Proposals out" value={openProposals.length} sub={money(openProposals.reduce((a, o) => a + o.value, 0), true)} to="/sales" />
        <Stat label="Follow-ups due" value={dueReminders.length} tone={dueReminders.length ? 'warning' : undefined} sub="Next 7 days" icon={<BellRing size={12} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <List
          title="Today’s appointments"
          subtitle="Your guided form is already on the record"
          icon={<CalendarClock size={14} />}
          empty="Nothing booked today."
          items={todayVisits.map((o) => (
            <div key={o.id} className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0">
              <span className="w-14 shrink-0 font-mono text-sm text-primary tabular">
                {format(new Date(o.visitAt!), 'HH:mm')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-primary">{o.name}</p>
                <p className="truncate text-sm text-muted">{o.address}</p>
              </div>
              <Link to={`/opportunities/${o.id}/visit`}>
                <Button size="sm" variant="primary">
                  Open form
                </Button>
              </Link>
            </div>
          ))}
        />

        <List
          title="Follow-ups due"
          subtitle="Delayed and nurture records that must not go quiet"
          icon={<BellRing size={14} />}
          empty="Nothing due this week."
          items={dueReminders.map((r) => {
            const o = s.opportunities.find((x) => x.id === r.opportunityId)
            if (!o) return null
            return (
              <OppRow
                key={r.id}
                o={o}
                right={<Badge tone="warning">{format(new Date(r.dueAt), 'd MMM')}</Badge>}
              />
            )
          })}
        />

        <List
          title="New leads in your territory"
          icon={<Users size={14} />}
          empty="No new leads."
          items={newLeads.map((o) => <OppRow key={o.id} o={o} />)}
        />

        <List
          title="Proposals awaiting a decision"
          icon={<FileSignature size={14} />}
          empty="No open proposals."
          items={openProposals.map((o) => <OppRow key={o.id} o={o} />)}
        />
      </div>
    </div>
  )
}

/* ---------- 4. Estimator / Head of Projects ------------------------------ */

function EstimatorHome() {
  const s = useStore()
  const opps = useScopedOpportunities()
  const queue = opps.filter((o) => o.stage === 'site_visit_completed')
  const inProgress = opps.filter((o) => o.stage === 'estimate_in_progress')
  const forApproval = opps.filter((o) => o.stage === 'estimate_ready')
  const takeoffs = s.takeoffs.filter((t) => t.status === 'ready')

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Waiting to be estimated" value={queue.length} sub="Site visit complete" tone={queue.length ? 'warning' : undefined} />
        <Stat label="Estimates in progress" value={inProgress.length} />
        <Stat label="Awaiting my approval" value={forApproval.length} tone={forApproval.length ? 'warning' : undefined} icon={<ClipboardCheck size={12} />} />
        <Stat label="AI takeoffs to review" value={takeoffs.length} icon={<ScanSearch size={12} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <List
          title="Estimate queue"
          subtitle="Everything the rep captured is already attached"
          icon={<ClipboardCheck size={14} />}
          empty="Queue is clear."
          items={[...queue, ...inProgress].map((o) => (
            <div key={o.id} className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-primary">{o.name}</p>
                <p className="truncate text-sm text-muted">
                  {o.sqft.toLocaleString()} sq ft{o.coveLf > 0 && ` · ${o.coveLf} lin ft cove`}
                </p>
              </div>
              <Link to={`/estimate/${o.id}`}>
                <Button size="sm" variant="primary">
                  Build estimate
                </Button>
              </Link>
            </div>
          ))}
        />

        <List
          title="Awaiting your approval"
          subtitle="Verified complete before it can reach a customer"
          icon={<FileSignature size={14} />}
          empty="Nothing to approve."
          items={forApproval.map((o) => (
            <div key={o.id} className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-primary">{o.name}</p>
                <p className="text-sm text-muted">{money(o.value)}</p>
              </div>
              <Link to={`/estimate/${o.id}`}>
                <Button size="sm" variant="primary">
                  Review
                </Button>
              </Link>
            </div>
          ))}
        />

        <List
          title="AI takeoffs ready for verification"
          subtitle="Extracted from architectural sets — an estimator must confirm"
          icon={<ScanSearch size={14} />}
          empty="No takeoffs pending."
          items={takeoffs.map((t) => {
            const o = s.opportunities.find((x) => x.id === t.opportunityId)
            if (!o) return null
            return (
              <div key={t.id} className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-primary">{o.name}</p>
                  <p className="truncate text-sm text-muted">
                    {t.fileName} · {t.relevantPages.length} of {t.pageCount} pages relevant
                  </p>
                </div>
                <Link to={`/estimate/${o.id}#takeoff`}>
                  <Button size="sm">Verify</Button>
                </Link>
              </div>
            )
          })}
        />
      </div>
    </div>
  )
}

/* ---------- 5. Project manager ------------------------------------------- */

function jobStatusOf(
  opportunityId: string,
  jobs: { opportunityId: string; status: string }[],
) {
  return jobs.find((j) => j.opportunityId === opportunityId)?.status
}

function PmHome() {
  const s = useStore()
  const scoped = useScopedOpportunities()
  const opps = scoped.filter((o) => o.stage === 'awarded')
  const toSchedule = opps.filter((o) => jobStatusOf(o.id, s.jobs) === 'scheduling_required')
  const materialNeeded = opps.filter((o) => jobStatusOf(o.id, s.jobs) === 'material_required')
  const active = opps.filter((o) => jobStatusOf(o.id, s.jobs) === 'in_progress')
  const openIssues = s.issues.filter((i) => i.status === 'open' && scoped.some((o) => o.id === i.opportunityId))
  const pendingCo = s.changeOrders.filter(
    (c) => c.status === 'pending' && scoped.some((o) => o.id === c.opportunityId),
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Needs dates and a crew" value={toSchedule.length} tone={toSchedule.length ? 'warning' : undefined} icon={<CalendarClock size={12} />} to="/schedule" />
        <Stat label="Material to order" value={materialNeeded.length} icon={<Boxes size={12} />} to="/jobs" />
        <Stat label="Active installations" value={active.length} icon={<HardHat size={12} />} to="/jobs" />
        <Stat label="Open issues" value={openIssues.length} tone={openIssues.length ? 'warning' : undefined} icon={<AlertTriangle size={12} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <List
          title="Awarded, not yet scheduled"
          subtitle="Signed work with no dates against it"
          icon={<CalendarClock size={14} />}
          empty="Everything awarded is scheduled."
          items={toSchedule.map((o) => (
            <div key={o.id} className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-primary">{o.name}</p>
                <p className="text-sm text-muted">{money(o.value)}</p>
              </div>
              <Link to="/schedule">
                <Button size="sm" variant="primary">
                  Schedule
                </Button>
              </Link>
            </div>
          ))}
        />

        <List
          title="Material orders to raise"
          subtitle="Quantities are derived from the sold system"
          icon={<Boxes size={14} />}
          empty="No material outstanding."
          items={materialNeeded.map((o) => (
            <div key={o.id} className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-primary">{o.name}</p>
                <p className="text-sm text-muted">{o.sqft.toLocaleString()} sq ft</p>
              </div>
              <Link to={`/opportunities/${o.id}/material`}>
                <Button size="sm" variant="primary">
                  Prepare order
                </Button>
              </Link>
            </div>
          ))}
        />

        <List
          title="Open issues from the field"
          icon={<AlertTriangle size={14} />}
          empty="No open issues."
          items={openIssues.map((i) => {
            const o = s.opportunities.find((x) => x.id === i.opportunityId)
            return (
              <Link
                key={i.id}
                to={`/opportunities/${i.opportunityId}#issues`}
                className="flex items-start gap-3 border-b border-subtle px-4 py-2.5 last:border-0 hover:bg-surface-inset"
              >
                <AlertTriangle
                  size={14}
                  className={cn('mt-0.5 shrink-0', i.severity === 'high' ? 'text-danger-text' : 'text-warning-text')}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-primary">{i.title}</p>
                  <p className="truncate text-sm text-muted">
                    {o?.name} · raised by {USER_BY_ID[i.raisedById]?.name}
                  </p>
                </div>
              </Link>
            )
          })}
        />

        <List
          title="Change orders pending approval"
          icon={<Receipt size={14} />}
          empty="No pending change orders."
          items={pendingCo.map((c) => {
            const o = s.opportunities.find((x) => x.id === c.opportunityId)
            return (
              <Link
                key={c.id}
                to={`/opportunities/${c.opportunityId}#changes`}
                className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0 hover:bg-surface-inset"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base text-primary">{c.description}</p>
                  <p className="truncate text-sm text-muted">{o?.name}</p>
                </div>
                <span className="font-mono text-sm text-primary tabular">{money(c.amount)}</span>
              </Link>
            )
          })}
        />
      </div>
    </div>
  )
}

/* ---------- 6. Crew leader / technician ---------------------------------- */

function CrewHome() {
  const s = useStore()
  const viewer = useViewer()!
  const myJobs = s.jobs.filter((j) => j.crewLeaderId === viewer.id || j.crewIds.includes(viewer.id))
  const today = myJobs.filter(
    (j) => new Date(j.start) <= TODAY && new Date(j.end) >= TODAY,
  )

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Today on site" icon={<HardHat size={14} />} />
        {today.length === 0 ? (
          <EmptyState title="Nothing scheduled today" description="Your next job will appear here the moment it is assigned." />
        ) : (
          today.map((j) => {
            const o = s.opportunities.find((x) => x.id === j.opportunityId)!
            return (
              <Link
                key={j.id}
                to={`/field/job/${o.id}`}
                className="flex items-center gap-3 border-b border-subtle px-4 py-3 last:border-0 hover:bg-surface-inset"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-md font-semibold text-primary">{o.name}</p>
                  <p className="truncate text-base text-muted">{o.address}</p>
                  <p className="mt-1 text-sm text-muted">
                    Day {Math.max(1, Math.round((TODAY.getTime() - new Date(j.start).getTime()) / 86_400_000) + 1)} ·{' '}
                    {j.progress}% complete
                  </p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-muted" />
              </Link>
            )
          })
        )}
      </Card>

      <List
        title="Upcoming jobs"
        icon={<CalendarClock size={14} />}
        empty="Nothing upcoming."
        items={myJobs
          .filter((j) => new Date(j.start) > TODAY)
          .map((j) => {
            const o = s.opportunities.find((x) => x.id === j.opportunityId)!
            return (
              <Link
                key={j.id}
                to={`/field/job/${o.id}`}
                className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0 hover:bg-surface-inset"
              >
                <span className="w-16 shrink-0 font-mono text-sm text-primary tabular">
                  {format(new Date(j.start), 'd MMM')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-primary">{o.name}</p>
                  <p className="truncate text-sm text-muted">{o.address}</p>
                </div>
              </Link>
            )
          })}
      />
    </div>
  )
}

/* ---------- 7. Accounting ------------------------------------------------ */

function AccountingHome() {
  const s = useStore()
  const scoped = useScopedOpportunities()
  const opps = scoped.filter((o) => o.stage === 'awarded')
  const mineInv = s.invoices.filter((i) => scoped.some((o) => o.id === i.opportunityId))
  const readyToInvoice = opps.filter((o) => jobStatusOf(o.id, s.jobs) === 'ready_to_invoice')
  const inCompletion = opps.filter((o) => jobStatusOf(o.id, s.jobs) === 'completion_review')
  const outstanding = mineInv
    .filter((i) => i.status !== 'paid')
    .reduce((a, i) => a + (i.amount - i.payments.reduce((p, x) => p + x.amount, 0)), 0)
  const pendingCo = s.changeOrders.filter(
    (c) => c.status === 'pending' && scoped.some((o) => o.id === c.opportunityId),
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ready to invoice" value={readyToInvoice.length} tone={readyToInvoice.length ? 'warning' : undefined} icon={<Receipt size={12} />} to="/finance" />
        <Stat label="In completion review" value={inCompletion.length} sub="Sign-off and change orders pending" />
        <Stat label="Outstanding balance" value={money(outstanding, true)} sub={`${mineInv.filter((i) => i.status !== 'paid').length} open invoices`} to="/finance" />
        <Stat label="Change orders to confirm" value={pendingCo.length} tone={pendingCo.length ? 'warning' : undefined} />
      </div>

      <List
        title="Ready to invoice"
        subtitle="Closeout complete, quantities confirmed"
        icon={<CheckCircle2 size={14} />}
        empty="Nothing waiting."
        action={
          <Link to="/finance">
            <Button size="sm">Open accounting</Button>
          </Link>
        }
        items={readyToInvoice.map((o) => (
          <OppRow key={o.id} o={o} right={<span className="font-mono text-sm text-primary tabular">{money(o.value)}</span>} />
        ))}
      />

      <List
        title="Open invoices"
        subtitle="Synced with QuickBooks"
        icon={<Receipt size={14} />}
        empty="Everything is settled."
        items={mineInv
          .filter((i) => i.status !== 'paid')
          .map((i) => {
            const o = s.opportunities.find((x) => x.id === i.opportunityId)
            const paid = i.payments.reduce((a, p) => a + p.amount, 0)
            return (
              <Link
                key={i.id}
                to="/finance"
                className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0 hover:bg-surface-inset"
              >
                <span className="w-28 shrink-0 font-mono text-sm text-muted">{i.number}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium text-primary">{o?.name}</p>
                  <p className="text-sm text-muted capitalize">
                    {i.kind} invoice · {i.quickbooksId}
                  </p>
                </div>
                <Badge tone={i.status === 'partial' ? 'warning' : 'neutral'}>{i.status}</Badge>
                <span className="w-24 shrink-0 text-right font-mono text-sm text-primary tabular">
                  {money(i.amount - paid)}
                </span>
              </Link>
            )
          })}
      />
    </div>
  )
}

export type { StageId }
