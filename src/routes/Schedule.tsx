import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfWeek,
} from 'date-fns'
import { AlertTriangle, BellRing, ChevronLeft, ChevronRight, Clock3, HardHat, Package, UserPlus } from 'lucide-react'
import { TODAY, iso } from '@/data/seed'
import { money, useStore } from '@/store/useStore'
import { STAGE_BY_ID } from '@/domain/stages'
import { JOB_ROLE_LABEL, type JobRole } from '@/domain/types'
import { jobTeam, membersWithRole, primaryFieldLead } from '@/domain/jobs'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Sheet } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useLocations, useUserDirectory, useUsers } from '@/store/selectors'

const WEEKS = 3
const JOB_ROLES = Object.keys(JOB_ROLE_LABEL) as JobRole[]

/** Small status glyph on the calendar bar, so procurement risk is visible at a glance. */
function ProcurementGlyph({ opportunityId }: { opportunityId: string }) {
  const order = useStore((s) => s.procurementOrders.find((m) => m.opportunityId === opportunityId))
  if (!order) return null
  return (
    <Package
      size={10}
      className={cn('shrink-0', order.status === 'delivered' ? 'opacity-80' : 'opacity-40')}
    />
  )
}

/** Procurement state inside the crew assignment sheet, with a link into the order. */
function ProcurementPanel({ opportunityId }: { opportunityId: string }) {
  const order = useStore((s) => s.procurementOrders.find((m) => m.opportunityId === opportunityId))
  return (
    <div className="rounded-md border border-subtle bg-surface-inset p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-base text-primary">
          <Package size={13} /> Procurement order
        </span>
        <Badge tone={order?.status === 'delivered' ? 'success' : order ? 'attention' : 'warning'}>
          {order ? order.status : 'not ordered'}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        Requirements come from the sold quote and move to
        the purchasing queue for fulfilment.
      </p>
      <Link to={`/opportunities/${opportunityId}/procurement`}>
        <Button size="sm" className="mt-2">
          {order ? 'Open order' : 'Prepare order'}
        </Button>
      </Link>
    </div>
  )
}

export function Schedule() {
  const jobs = useStore((s) => s.jobs)
  const opportunities = useStore((s) => s.opportunities)
  const locationFilter = useStore((s) => s.locationFilter)
  const updateJob = useStore((s) => s.updateJob)
  const scheduleJob = useStore((s) => s.scheduleJob)
  const locations = useLocations()
  const users = useUsers()
  const userById = useUserDirectory()

  const [anchor, setAnchor] = useState(startOfWeek(TODAY, { weekStartsOn: 1 }))
  const [openJob, setOpenJob] = useState<string | null>(null)
  const [pendingOpportunityId, setPendingOpportunityId] = useState<string | null>(null)

  const days = useMemo(
    () => eachDayOfInterval({ start: anchor, end: addDays(anchor, WEEKS * 7 - 1) }),
    [anchor],
  )

  const rows = useMemo(() => {
    return jobs
      .map((j) => {
        const overlapCount = jobs.filter(
          (other) =>
            other.id !== j.id &&
            other.crewLeaderId &&
            other.crewLeaderId === j.crewLeaderId &&
            new Date(other.start) <= new Date(j.end) &&
            new Date(other.end) >= new Date(j.start),
        ).length
        return { job: j, opp: opportunities.find((o) => o.id === j.opportunityId), overlapCount }
      })
      .filter((r) => r.opp)
      .filter((r) => locationFilter === 'all' || r.opp!.locationId === locationFilter)
      .sort((a, b) => new Date(a.job.start).getTime() - new Date(b.job.start).getTime())
  }, [jobs, opportunities, locationFilter])

  const selected = rows.find((r) => r.job.id === openJob)

  const unscheduled = opportunities.filter((o) => {
    if (o.stage !== 'awarded') return false
    if (locationFilter !== 'all' && o.locationId !== locationFilter) return false
    const job = jobs.find((j) => j.opportunityId === o.id)
    // Needs scheduling when no job yet, or job still at scheduling_required.
    return !job || job.status === 'scheduling_required'
  })

  useEffect(() => {
    if (!pendingOpportunityId) return
    const created = rows.find((row) => row.opp?.id === pendingOpportunityId)?.job
    if (!created) return
    setOpenJob(created.id)
    setPendingOpportunityId(null)
  }, [pendingOpportunityId, rows])

  const openScheduling = (opportunityId: string) => {
    const existing = jobs.find((job) => job.opportunityId === opportunityId)
    if (existing) {
      setOpenJob(existing.id)
      return
    }
    const opp = opportunities.find((candidate) => candidate.id === opportunityId)
    if (!opp) return
    scheduleJob({
      opportunityId,
      status: 'scheduling_required',
      start: iso(1),
      end: iso(2),
      crewLeaderId: null,
      pmId: opp.pmId,
      crewIds: [],
      team: [],
      progress: 0,
      dispatchState: 'unassigned',
      syncStatus: 'synced',
      clockStatus: 'not_started',
      travelMinutes: 30,
      checkInAt: null,
      checkOutAt: null,
      customerNotifiedAt: null,
      lastDispatchNote: '',
      dailyLogs: [],
    })
    setPendingOpportunityId(opportunityId)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-subtle bg-surface-raised px-3 py-2">
        <h1 className="font-display text-lg text-primary">Schedule</h1>
        <Badge tone="neutral">{rows.length} jobs</Badge>
        {unscheduled.length > 0 && (
          <Badge tone="warning">{unscheduled.length} awarded, not scheduled</Badge>
        )}
        <div className="flex-1" />
        {unscheduled[0] && (
          <Button size="sm" variant="primary" onClick={() => openScheduling(unscheduled[0].id)}>
            Schedule next job
          </Button>
        )}
        <span className="text-base font-medium text-secondary">
          {format(days[0], 'MMM d')} – {format(days[days.length - 1], 'MMM d, yyyy')}
        </span>
        <Button size="sm" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Previous week">
          <ChevronLeft size={13} />
        </Button>
        <Button size="sm" onClick={() => setAnchor(startOfWeek(TODAY, { weekStartsOn: 1 }))}>
          Today
        </Button>
        <Button size="sm" onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Next week">
          <ChevronRight size={13} />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-3">
        {unscheduled.length > 0 && (
          <Card className="mb-3 border-(--status-warning)">
            <CardHeader
              title="Awarded work not yet on the schedule"
              subtitle="Signed jobs sitting unscheduled is the most common failure point in the current process"
              icon={<HardHat size={14} className="text-warning-text" />}
            />
            <div className="flex flex-wrap gap-2 p-3">
              {unscheduled.map((o) => (
                <div
                  key={o.id}
                  className="rounded-md border border-subtle bg-surface-inset px-2.5 py-1.5"
                >
                  <p className="text-base font-medium text-primary">{o.name}</p>
                  <p className="font-mono text-sm tabular text-muted">{money(o.value)}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => openScheduling(o.id)}>
                      Schedule
                    </Button>
                    <Link to={`/opportunities/${o.id}`}>
                      <Button size="sm" variant="ghost">Open record</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          {/* ---- Day header ---- */}
          <div
            className="grid border-b border-subtle bg-surface-inset"
            style={{ gridTemplateColumns: `14rem repeat(${days.length}, minmax(2.1rem, 1fr))` }}
          >
            <div className="border-r border-subtle px-3 py-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
              Project
            </div>
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className={cn(
                  'border-r border-subtle py-1 text-center',
                  isSameDay(d, TODAY) && 'bg-action-soft',
                  [0, 6].includes(d.getDay()) && 'bg-surface-sunken',
                )}
              >
                <p className="text-2xs text-muted">{format(d, 'EEEEE')}</p>
                <p
                  className={cn(
                    'font-mono text-sm tabular',
                    isSameDay(d, TODAY) ? 'font-bold text-brand' : 'text-secondary',
                  )}
                >
                  {format(d, 'd')}
                </p>
              </div>
            ))}
          </div>

          {/* ---- Job rows ---- */}
          {rows.length === 0 ? (
            <EmptyState title="Nothing scheduled in this window" />
          ) : (
            rows.map(({ job, opp, overlapCount }) => {
              const startIdx = differenceInCalendarDays(new Date(job.start), days[0])
              const span = differenceInCalendarDays(new Date(job.end), new Date(job.start)) + 1
              const visible = startIdx < days.length && startIdx + span > 0
              const clampedStart = Math.max(0, startIdx)
              const clampedSpan = Math.min(days.length - clampedStart, span + Math.min(0, startIdx))

              return (
                <div
                  key={job.id}
                  className="grid border-b border-subtle last:border-b-0"
                  style={{
                    gridTemplateColumns: `14rem repeat(${days.length}, minmax(2.1rem, 1fr))`,
                  }}
                >
                  <div className="border-r border-subtle px-3 py-2">
                    <Link
                      to={`/opportunities/${opp!.id}`}
                      className="block truncate text-base font-medium text-primary hover:underline"
                    >
                      {opp!.name}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                      {primaryFieldLead(job) ? (
                        <>
                          <Avatar name={userById[primaryFieldLead(job)!]?.name ?? '?'} size={15} />
                          {userById[primaryFieldLead(job)!]?.name}
                        </>
                      ) : (
                        <span className="text-warning-text">No crew leader</span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {job.dispatchState && (
                        <Badge tone={job.dispatchState === 'ready' ? 'success' : job.dispatchState === 'at_risk' ? 'warning' : 'neutral'}>
                          {job.dispatchState.replace('_', ' ')}
                        </Badge>
                      )}
                      {overlapCount > 0 && (
                        <Badge tone="warning" icon={<AlertTriangle size={9} />}>
                          {overlapCount} conflict{overlapCount === 1 ? '' : 's'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div
                    className="relative col-start-2 flex items-center py-1.5"
                    style={{ gridColumn: `2 / span ${days.length}` }}
                  >
                    <div
                      className="grid w-full"
                      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
                    >
                      {visible && (
                        <button
                          onClick={() => setOpenJob(job.id)}
                          className="flex items-center gap-1.5 overflow-hidden rounded-sm px-2 py-1 text-left text-white transition-[filter] hover:brightness-110"
                          style={{
                            gridColumn: `${clampedStart + 1} / span ${Math.max(1, clampedSpan)}`,
                            backgroundColor: `var(--stage-${STAGE_BY_ID[opp!.stage].group}-solid)`,
                          }}
                        >
                          <span className="truncate text-2xs font-medium">
                            {opp!.code}
                          </span>
                          <ProcurementGlyph opportunityId={opp!.id} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </Card>
      </div>

      {/* ---- Crew assignment ---- */}
      <Sheet
        open={Boolean(selected)}
        onClose={() => setOpenJob(null)}
        title={selected?.opp?.name ?? ''}
        subtitle={
          selected
            ? `${format(new Date(selected.job.start), 'MMM d')} – ${format(new Date(selected.job.end), 'MMM d, yyyy')}`
            : ''
        }
      >
        {selected && (
          <div className='space-y-4'>
            <div>
              <p className='mb-1.5 flex items-center gap-1.5 text-2xs font-semibold tracking-wider text-muted uppercase'>
                <UserPlus size={11} /> Job team and responsibilities
              </p>
              <p className='mb-3 text-sm text-muted'>
                Assign several people to a responsibility, or give one person several roles.
              </p>
              <div className='space-y-3'>
                {JOB_ROLES.map((role) => {
                  const assigned = membersWithRole(selected.job, role)
                  return (
                    <div key={role} className='rounded-md border border-subtle bg-surface-raised p-2.5'>
                      <div className='mb-2 flex items-center justify-between gap-2'>
                        <span className='text-sm font-semibold text-primary'>{JOB_ROLE_LABEL[role]}</span>
                        <Badge tone={assigned.length ? 'brand' : 'neutral'}>{assigned.length} assigned</Badge>
                      </div>
                      <div className='flex flex-wrap gap-1.5'>
                        {users.filter((u) => !u.locationId || u.locationId === selected.opp!.locationId).map((u) => {
                          const on = assigned.some((a) => a.userId === u.id)
                          return (
                            <button
                              key={u.id}
                              type='button'
                              onClick={() => {
                                const team = jobTeam(selected.job)
                                updateJob(selected.job.id, {
                                  team: on
                                    ? team.filter((a) => !(a.userId === u.id && a.role === role))
                                    : [...team, { userId: u.id, role }],
                                })
                              }}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full border px-2 py-1 text-sm',
                                on ? 'border-(--action-primary) bg-action-soft text-brand' : 'border-subtle text-secondary',
                              )}
                            >
                              <Avatar name={u.name} size={16} /> {u.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className='hidden'>

            <div>
              <p className="mb-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
                Crew leader
              </p>
              <select
                value={selected.job.crewLeaderId ?? ''}
                onChange={(e) => updateJob(selected.job.id, { crewLeaderId: e.target.value || null })}
                className="h-(--control-h) w-full rounded-md border border-strong bg-surface-raised px-2 text-base"
              >
                <option value="">Unassigned</option>
                {users.filter(
                  (u) => u.role === 'crew_leader' && u.locationId === selected.opp!.locationId,
                ).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
                Project manager
              </p>
              <select
                value={selected.job.pmId ?? ''}
                onChange={(e) => updateJob(selected.job.id, { pmId: e.target.value || null })}
                className="h-(--control-h) w-full rounded-md border border-strong bg-surface-raised px-2 text-base"
              >
                <option value="">Unassigned</option>
                {users.filter(
                  (u) => u.role === 'pm' && u.locationId === selected.opp!.locationId,
                ).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
                <UserPlus size={11} /> Installers
              </p>
              <div className="space-y-1.5">
                {users.filter(
                  (u) => u.role === 'tech' && u.locationId === selected.opp!.locationId,
                ).map((u) => {
                  const on = selected.job.crewIds.includes(u.id)
                  return (
                    <button
                      key={u.id}
                      onClick={() =>
                        updateJob(selected.job.id, {
                          crewIds: on
                            ? selected.job.crewIds.filter((c) => c !== u.id)
                            : [...selected.job.crewIds, u.id],
                        })
                      }
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left',
                        on
                          ? 'border-(--action-primary) bg-action-soft'
                          : 'border-subtle bg-surface-raised hover:border-strong',
                      )}
                    >
                      <Avatar name={u.name} size={20} />
                      <span className="flex-1 text-base text-primary">{u.name}</span>
                      {on && <Badge tone="brand">Assigned</Badge>}
                    </button>
                  )
                })}
              </div>
            </div>
            </div>

            <ProcurementPanel opportunityId={selected.opp!.id} />

            <div className="rounded-md border border-subtle bg-surface-inset p-3">
              <p className="mb-2 text-2xs font-semibold tracking-wider text-muted uppercase">
                Dispatch controls
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm text-secondary">Dispatch health</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(['unassigned', 'ready', 'at_risk'] as const).map((state) => (
                      <button
                        key={state}
                        type="button"
                        onClick={() => updateJob(selected.job.id, { dispatchState: state })}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-sm',
                          selected.job.dispatchState === state
                            ? 'border-(--action-primary) bg-action-soft text-brand'
                            : 'border-subtle text-secondary',
                        )}
                      >
                        {state.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-sm text-secondary">Travel buffer</p>
                  <div className="flex items-center gap-2">
                    <Clock3 size={14} className="text-muted" />
                    <input
                      type="number"
                      value={selected.job.travelMinutes ?? 30}
                      onChange={(e) => updateJob(selected.job.id, { travelMinutes: Number(e.target.value) })}
                      className="h-(--control-h) w-24 rounded-md border border-strong bg-surface-raised px-2 text-base"
                    />
                    <span className="text-sm text-muted">minutes</span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <p className="mb-1 text-sm text-secondary">Reschedule window</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        updateJob(selected.job.id, {
                          start: addDays(new Date(selected.job.start), -1).toISOString(),
                          end: addDays(new Date(selected.job.end), -1).toISOString(),
                        })
                      }
                    >
                      Move earlier
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        updateJob(selected.job.id, {
                          start: addDays(new Date(selected.job.start), 1).toISOString(),
                          end: addDays(new Date(selected.job.end), 1).toISOString(),
                        })
                      }
                    >
                      Move later
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateJob(selected.job.id, { customerNotifiedAt: new Date().toISOString() })}
                    >
                      <BellRing size={12} />
                      Mark customer notified
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted">
              Location: {locations.find((l) => l.id === selected.opp!.locationId)?.name}
              {selected.job.customerNotifiedAt && ` · customer notified ${format(new Date(selected.job.customerNotifiedAt), 'd MMM')}`}
              {selected.job.travelMinutes && ` · ${selected.job.travelMinutes} min travel buffer`}
            </p>
          </div>
        )}
      </Sheet>
    </div>
  )
}
