import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfWeek,
} from 'date-fns'
import { ChevronLeft, ChevronRight, HardHat, Package, UserPlus } from 'lucide-react'
import { LOCATIONS, TODAY, USERS, USER_BY_ID } from '@/data/seed'
import { money, useStore } from '@/store/useStore'
import { STAGE_BY_ID } from '@/domain/stages'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Sheet } from '@/components/ui'
import { cn } from '@/lib/cn'

const WEEKS = 3

/** Small status glyph on the calendar bar, so material risk is visible at a glance. */
function MaterialGlyph({ opportunityId }: { opportunityId: string }) {
  const order = useStore((s) => s.materialOrders.find((m) => m.opportunityId === opportunityId))
  if (!order) return null
  return (
    <Package
      size={10}
      className={cn('shrink-0', order.status === 'delivered' ? 'opacity-80' : 'opacity-40')}
    />
  )
}

/** Material state inside the crew assignment sheet, with a link into the order. */
function MaterialPanel({ opportunityId }: { opportunityId: string }) {
  const order = useStore((s) => s.materialOrders.find((m) => m.opportunityId === opportunityId))
  return (
    <div className="rounded-md border border-subtle bg-surface-inset p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-base text-primary">
          <Package size={13} /> Material
        </span>
        <Badge tone={order?.status === 'delivered' ? 'success' : order ? 'attention' : 'warning'}>
          {order ? order.status : 'not ordered'}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        Quantities derive from the sold system, area, cove, coats and waste allowance, then route to
        the Franchise Management System for fulfilment.
      </p>
      <Link to={`/opportunities/${opportunityId}/material`}>
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

  const [anchor, setAnchor] = useState(startOfWeek(TODAY, { weekStartsOn: 1 }))
  const [openJob, setOpenJob] = useState<string | null>(null)

  const days = useMemo(
    () => eachDayOfInterval({ start: anchor, end: addDays(anchor, WEEKS * 7 - 1) }),
    [anchor],
  )

  const rows = useMemo(() => {
    return jobs
      .map((j) => ({ job: j, opp: opportunities.find((o) => o.id === j.opportunityId) }))
      .filter((r) => r.opp)
      .filter((r) => locationFilter === 'all' || r.opp!.locationId === locationFilter)
      .sort((a, b) => new Date(a.job.start).getTime() - new Date(b.job.start).getTime())
  }, [jobs, opportunities, locationFilter])

  const selected = rows.find((r) => r.job.id === openJob)

  const unscheduled = opportunities.filter(
    (o) =>
      (o.stage === 'awarded' || o.stage === 'scheduling_required') &&
      !jobs.some((j) => j.opportunityId === o.id) &&
      (locationFilter === 'all' || o.locationId === locationFilter),
  )

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-subtle bg-surface-raised px-3 py-2">
        <h1 className="font-display text-lg text-primary">Schedule</h1>
        <Badge tone="neutral">{rows.length} jobs</Badge>
        {unscheduled.length > 0 && (
          <Badge tone="warning">{unscheduled.length} awarded, not scheduled</Badge>
        )}
        <div className="flex-1" />
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
                <Link
                  key={o.id}
                  to={`/opportunities/${o.id}`}
                  className="rounded-md border border-subtle bg-surface-inset px-2.5 py-1.5 hover:border-strong"
                >
                  <p className="text-base font-medium text-primary">{o.name}</p>
                  <p className="font-mono text-sm tabular text-muted">{money(o.value)}</p>
                </Link>
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
            rows.map(({ job, opp }) => {
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
                      {job.crewLeaderId ? (
                        <>
                          <Avatar name={USER_BY_ID[job.crewLeaderId]?.name ?? '?'} size={15} />
                          {USER_BY_ID[job.crewLeaderId]?.name}
                        </>
                      ) : (
                        <span className="text-warning-text">No crew leader</span>
                      )}
                    </p>
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
                            {opp!.sqft.toLocaleString()} sq ft
                          </span>
                          <MaterialGlyph opportunityId={opp!.id} />
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
          <div className="space-y-4">
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
                {USERS.filter(
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
                {USERS.filter(
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
                {USERS.filter(
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

            <MaterialPanel opportunityId={selected.opp!.id} />

            <p className="text-sm text-muted">
              Territory: {LOCATIONS.find((l) => l.id === selected.opp!.locationId)?.name}
            </p>
          </div>
        )}
      </Sheet>
    </div>
  )
}
