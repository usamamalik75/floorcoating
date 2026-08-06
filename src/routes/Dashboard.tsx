import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { format, isBefore, isSameDay } from 'date-fns'
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  HardHat,
  Plus,
  Receipt,
  ScanSearch,
  Users,
} from 'lucide-react'
import { useStore, money, estimateTotal } from '@/store/useStore'
import { assignedTo, deriveJobProgress } from '@/domain/jobs'
import { useScopedOpportunities, useLocations, useUserDirectory, useViewer } from '@/store/selectors'
import { TODAY } from '@/data/seed'
import { STAGE_BY_ID, jobStatusIndex, normalizeJobStatus, stageLabel } from '@/domain/stages'
import type { Opportunity, StageId } from '@/domain/types'
import { Badge, Button, Card, CardHeader, EmptyState, StageChip, HorizontalBarChart, TrendMetric } from '@/components/ui'
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
  const locations = useLocations()
  if (!viewer) return null
  const isLeadership = Boolean(viewer.orgRole)

  // A crew leader or installer has no use for a desktop workspace. Their home
  // is the job sheet, so signing in as one lands there.
  if (viewer.role === 'crew_leader' || viewer.role === 'installer') {
    return <Navigate to="/field" replace />
  }

  const locationName = viewer.locationId
    ? locations.find((l) => l.id === viewer.locationId)?.name
    : undefined

  const common = {
    sales: <SalesHome />,
    estimator: <EstimatorHome />,
    pm: <PmHome />,
    crew_leader: <CrewHome />,
    installer: <CrewHome />,
    accounting: <AccountingHome />,
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-surface-sunken">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="text-sm text-muted">{format(TODAY, 'EEEE d MMMM yyyy')}</p>
              <h1 className="font-display text-2xl text-primary">
                {viewer.name.split(' ')[0]}’s workspace
              </h1>
              <p className="mt-0.5 text-base text-muted">
                {viewer.title}
                {locationName && ` · ${locationName}`}
              </p>
            </div>
            {(isLeadership || viewer.role === 'sales') && (
              <Link to="/intake" className="ml-auto">
                <Button size="sm" variant="primary">
                  <Plus size={12} />
                  New lead
                </Button>
              </Link>
            )}
          </div>
        </header>
        {isLeadership ? <LeadershipHome /> : common[viewer.role]}
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
  const locations = useLocations()
  const locationName = locations.find((l) => l.id === o.locationId)?.name
  return (
    <Link
      to={`/opportunities/${o.id}`}
      className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0 hover:bg-surface-inset"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-primary">{o.name}</p>
        <p className="truncate text-sm text-muted">
          {o.code} · {locationName}
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

/* ---------- 1. Leadership --------------------------------------------------- */

function isOpenOpportunity(
  o: Opportunity,
  jobs: { opportunityId: string; status: string }[],
  invoices: { opportunityId: string; amount: number; payments: { amount: number }[] }[],
) {
  if (o.stage === 'lost') return false
  if (STAGE_BY_ID[o.stage]?.phase === 'pre') return false
  if (o.stage === 'awarded') {
    const job = jobs.find((j) => j.opportunityId === o.id)
    const relatedInvoices = invoices.filter((i) => i.opportunityId === o.id)
    const billed = relatedInvoices.reduce((sum, i) => sum + i.amount, 0)
    const received = relatedInvoices.reduce(
      (sum, i) => sum + i.payments.reduce((paid, payment) => paid + payment.amount, 0),
      0,
    )
    return !(
      job
      && jobStatusIndex(normalizeJobStatus(job.status as any)) >= jobStatusIndex('completed')
      && billed > 0
      && received >= billed
    )
  }
  return true
}

/* ---------- 2. Leadership dashboard ------------------------------------- */

function LeadershipHome() {
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
  const open = opps.filter((o) => isOpenOpportunity(o, s.jobs, s.invoices))
  const outstanding = s.invoices
    .filter((i) => opps.some((o) => o.id === i.opportunityId) && i.status !== 'paid')
    .reduce((a, i) => a + (i.amount - i.payments.reduce((p, x) => p + x.amount, 0)), 0)

  const pipelineData = [
    { label: 'Sales', value: open.filter(o => STAGE_BY_ID[o.stage]?.group === 'sales').reduce((a, o) => a + o.value, 0), color: 'var(--status-info)' },
    { label: 'Estimating', value: open.filter(o => STAGE_BY_ID[o.stage]?.group === 'estimating').reduce((a, o) => a + o.value, 0), color: 'var(--status-warning)' },
    { label: 'Awarded', value: open.filter(o => STAGE_BY_ID[o.stage]?.group === 'won').reduce((a, o) => a + o.value, 0), color: 'var(--status-success)' },
  ].filter(d => d.value > 0).map(d => ({ ...d, formattedValue: money(d.value, true) }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open pipeline" value={money(open.reduce((a, o) => a + o.value, 0), true)} sub={`${open.length} opportunities`} to="/sales" />
        <Stat label="Unassigned leads" value={unassigned.length} tone={unassigned.length ? 'warning' : undefined} sub="Need a rep today" to="/sales" />
        <Stat label="Awaiting scheduling" value={needsScheduling.length} tone={needsScheduling.length ? 'warning' : undefined} sub="Signed with no dates" to="/schedule" />
        <Stat label="Outstanding receivables" value={money(outstanding, true)} sub="Across all open invoices" to="/finance" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <HorizontalBarChart
          className="lg:col-span-2"
          title="Active Pipeline Value"
          data={pipelineData}
          totalLabel="Total Open"
          totalValue={money(open.reduce((a, o) => a + o.value, 0), true)}
        />
        <TrendMetric
          label="Revenue Forecast"
          value={money(open.filter(o => STAGE_BY_ID[o.stage]?.group === 'won').reduce((a, o) => a + o.value, 0), true)}
          trend={14.2}
          trendLabel="vs last month"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <List
          title="Leads needing assignment"
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
  const myThreads = s.messageThreads.filter((thread) => mine.some((opp) => opp.id === thread.opportunityId))
  const todayVisits = mine.filter((o) => o.visitAt && isSameDay(new Date(o.visitAt), TODAY))
  const dueReminders = s.reminders.filter(
    (r) => !r.done && r.ownerId === viewer.id && isBefore(new Date(r.dueAt), new Date(TODAY.getTime() + 7 * 86_400_000)),
  )
  const openProposals = mine.filter((o) => ['proposal_sent', 'follow_up'].includes(o.stage))
  const newLeads = s.opportunities.filter((o) => o.stage === 'new_lead' && o.locationId === viewer.locationId)
  const drafts = myThreads.filter((thread) => thread.messages.some((message) => message.status === 'draft'))
  const noResponse = myThreads.filter((thread) => thread.status === 'waiting')

  const winLossData = [
    { label: 'Won', value: mine.filter(o => o.stage === 'awarded').length, color: 'var(--status-success)' },
    { label: 'Open', value: mine.filter(o => o.stage !== 'awarded' && o.stage !== 'lost').length, color: 'var(--status-info)' },
    { label: 'Lost', value: mine.filter(o => o.stage === 'lost').length, color: 'var(--status-danger)' },
  ].filter(d => d.value > 0)
  
  const wonCount = mine.filter(o => o.stage === 'awarded').length
  const closedCount = mine.filter(o => o.stage === 'awarded' || o.stage === 'lost').length
  const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Appointments today" value={todayVisits.length} icon={<CalendarClock size={12} />} tone={todayVisits.length ? 'success' : undefined} to="/field" />
        <Stat label="My open pipeline" value={money(mine.filter((o) => isOpenOpportunity(o, s.jobs, s.invoices)).reduce((a, o) => a + o.value, 0), true)} sub={`${mine.length} records`} to="/sales" />
        <Stat label="Proposals out" value={openProposals.length} sub={money(openProposals.reduce((a, o) => a + o.value, 0), true)} to="/sales" />
        <Stat label="Follow-ups due" value={dueReminders.length} tone={dueReminders.length ? 'warning' : undefined} sub="Next 7 days" icon={<BellRing size={12} />} />
        <Stat label="Drafts waiting" value={drafts.length} sub="Saved in communications" to="/communications" />
        <Stat label="No response" value={noResponse.length} tone={noResponse.length ? 'warning' : undefined} sub="Customer has not replied yet" to="/communications" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <HorizontalBarChart
          className="lg:col-span-2"
          title="My Opportunities"
          data={winLossData}
          totalLabel="Total Assigned"
          totalValue={mine.length.toString()}
        />
        <TrendMetric
          label="Win Rate"
          value={`${winRate}%`}
          trend={2.4}
          trendLabel="trailing 30 days"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
          action={
            <Link to="/intake">
              <Button size="sm">Capture lead</Button>
            </Link>
          }
          items={newLeads.map((o) => <OppRow key={o.id} o={o} />)}
        />

        <List
          title="Proposals awaiting a decision"
          icon={<FileSignature size={14} />}
          empty="No open proposals."
          items={openProposals.map((o) => <OppRow key={o.id} o={o} />)}
        />
        <List
          title="Communication drafts"
          icon={<BellRing size={14} />}
          empty="No drafts waiting."
          action={
            <Link to="/communications">
              <Button size="sm">Open communications</Button>
            </Link>
          }
          items={drafts.map((thread) => {
            const opp = mine.find((candidate) => candidate.id === thread.opportunityId)
            return opp ? <OppRow key={thread.id} o={opp} right={<Badge tone="neutral">Draft</Badge>} /> : null
          })}
        />
        <List
          title="Awaiting customer response"
          icon={<AlertTriangle size={14} />}
          empty="No customer replies outstanding."
          items={noResponse.map((thread) => {
            const opp = mine.find((candidate) => candidate.id === thread.opportunityId)
            return opp ? <OppRow key={thread.id} o={opp} right={<Badge tone="warning">Waiting</Badge>} /> : null
          })}
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
  const scopeExtractions = s.scopeExtractions.filter((t) => t.status === 'ready')

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Waiting to be estimated" value={queue.length} sub="Visit or call complete" tone={queue.length ? 'warning' : undefined} />
        <Stat label="Estimates in progress" value={inProgress.length} />
        <Stat label="Awaiting my approval" value={forApproval.length} tone={forApproval.length ? 'warning' : undefined} icon={<ClipboardCheck size={12} />} />
        <Stat label="Scope extractions to review" value={scopeExtractions.length} icon={<ScanSearch size={12} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
                  {o.estimatedQuantity.toLocaleString()} units{o.secondaryQuantity > 0 && ` · ${o.secondaryQuantity} units secondary quantity`}
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
          title="Scope extractions ready for verification"
          subtitle="Extracted from architectural sets — an estimator must confirm"
          icon={<ScanSearch size={14} />}
          empty="No scope extractions pending."
          items={scopeExtractions.map((t) => {
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
                <Link to={`/estimate/${o.id}#scopeExtraction`}>
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
  const status = jobs.find((j) => j.opportunityId === opportunityId)?.status
  return status ? normalizeJobStatus(status as any) : undefined
}

function PmHome() {
  const s = useStore()
  const userById = useUserDirectory()
  const scoped = useScopedOpportunities()
  const opps = scoped.filter((o) => o.stage === 'awarded')
  const toSchedule = opps.filter((o) => jobStatusOf(o.id, s.jobs) === 'scheduling_required')
  const procurementNeeded = opps.filter((o) => jobStatusOf(o.id, s.jobs) === 'procurement_required')
  const active = opps.filter((o) => jobStatusOf(o.id, s.jobs) === 'in_progress')
  const openIssues = s.issues.filter((i) => i.status === 'open' && scoped.some((o) => o.id === i.opportunityId))
  const pendingCo = s.changeOrders.filter(
    (c) => c.status === 'pending' && scoped.some((o) => o.id === c.opportunityId),
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Needs dates and a crew" value={toSchedule.length} tone={toSchedule.length ? 'warning' : undefined} icon={<CalendarClock size={12} />} to="/schedule" />
        <Stat label="Purchasing required" value={procurementNeeded.length} icon={<Boxes size={12} />} to="/jobs" />
        <Stat label="Active installations" value={active.length} icon={<HardHat size={12} />} to="/jobs" />
        <Stat label="Open issues" value={openIssues.length} tone={openIssues.length ? 'warning' : undefined} icon={<AlertTriangle size={12} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <List
          title="Sold / awarded, not yet scheduled"
          subtitle="Signed work with no dates against it"
          icon={<CalendarClock size={14} />}
          empty="Everything sold is scheduled."
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
          title="Purchase orders to raise"
          subtitle="Requirements are derived from the sold quote"
          icon={<Boxes size={14} />}
          empty="No purchasing outstanding."
          items={procurementNeeded.map((o) => (
            <div key={o.id} className="flex items-center gap-3 border-b border-subtle px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium text-primary">{o.name}</p>
                <p className="text-sm text-muted">{o.estimatedQuantity.toLocaleString()} units</p>
              </div>
              <Link to={`/opportunities/${o.id}/procurement`}>
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
                    {o?.name} · raised by {userById[i.raisedById]?.name}
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

/* ---------- 6. Crew leader / installer ----------------------------------- */

function CrewHome() {
  const s = useStore()
  const viewer = useViewer()!
  const myJobs = s.jobs.filter((j) => assignedTo(j, viewer.id))
  const today = myJobs.filter(
    (j) => new Date(j.start) <= TODAY && new Date(j.end) >= TODAY,
  )

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Today on site" icon={<HardHat size={14} />} />
        {today.length === 0 ? (
          <EmptyState title="Nothing scheduled today" description="Your next job will appear here the moment it is assigned." />
        ) : (
          today.map((j) => {
            const o = s.opportunities.find((x) => x.id === j.opportunityId)!
            const progress = deriveJobProgress(j, s.artifacts, s.checklists, s.checklistTemplates)
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
                    {progress}% complete
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
    </div>
  )
}

/* ---------- 7. Accounting ------------------------------------------------ */

function AccountingHome() {
  const s = useStore()
  const scoped = useScopedOpportunities()
  const opps = scoped.filter((o) => o.stage === 'awarded')
  const mineInv = s.invoices.filter((i) => scoped.some((o) => o.id === i.opportunityId))
  const readyToInvoice = opps.filter((o) => {
    if (jobStatusOf(o.id, s.jobs) !== 'completed') return false
    return !mineInv.some((i) => i.opportunityId === o.id && i.kind === 'final')
  })
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
        <Stat label="Ready for final invoice" value={readyToInvoice.length} tone={readyToInvoice.length ? 'warning' : undefined} icon={<Receipt size={12} />} to="/finance" />
        <Stat label="In completion review" value={inCompletion.length} sub="Sign-off and change orders pending" />
        <Stat label="Outstanding balance" value={money(outstanding, true)} sub={`${mineInv.filter((i) => i.status !== 'paid').length} open invoices`} to="/finance" />
        <Stat label="Change orders to confirm" value={pendingCo.length} tone={pendingCo.length ? 'warning' : undefined} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <List
          title="Ready for final invoice"
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
    </div>
  )
}

export type { StageId }
