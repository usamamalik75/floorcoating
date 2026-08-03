import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Boxes, Camera, HardHat } from 'lucide-react'
import { useStore, money } from '@/store/useStore'
import { useScopedOpportunities } from '@/store/selectors'
import { ACCOUNT_BY_ID, LOCATION_BY_ID, USER_BY_ID } from '@/data/seed'
import {
  JOB_STATUSES,
  jobStatusLabel,
  jobStatusVar,
  nextJobStatus,
} from '@/domain/stages'
import type { JobStatus, Opportunity } from '@/domain/types'
import { jobTeam, primaryFieldLead } from '@/domain/jobs'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Meter,
  SectionTitle,
} from '@/components/ui'
import { cn } from '@/lib/cn'

export function Jobs() {
  const s = useStore()
  const setJobStatus = useStore((st) => st.setJobStatus)
  const opps = useScopedOpportunities().filter((o) => o.stage === 'awarded')
  const [filter, setFilter] = useState<JobStatus | 'all'>('all')

  const rows = useMemo(() => {
    return opps
      .map((o) => ({
        opp: o,
        job: s.jobs.find((j) => j.opportunityId === o.id),
      }))
      .filter((r) => r.job)
      .filter((r) => filter === 'all' || r.job!.status === filter)
  }, [opps, s.jobs, filter])

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-subtle bg-surface-raised px-5 py-3">
        <h1 className="font-display text-2xl text-primary">Jobs</h1>
        <p className="mt-0.5 text-base text-muted">
          Awarded work managed on the job pipeline — not the sales board.
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
          {JOB_STATUSES.map((st) => (
            <FilterChip
              key={st}
              active={filter === st}
              onClick={() => setFilter(st)}
              label={jobStatusLabel(st)}
              count={s.jobs.filter((j) => j.status === st && opps.some((o) => o.id === j.opportunityId)).length}
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto scrollbar-thin">
        <div className="flex h-full min-w-max gap-2 p-3">
          {JOB_STATUSES.filter((st) => filter === 'all' || filter === st).map((status) => {
            const items = rows.filter((r) => r.job!.status === status)
            return (
              <section
                key={status}
                className="flex w-[16.5rem] shrink-0 flex-col rounded-lg border border-subtle bg-surface-base"
              >
                <div
                  className="h-[3px] shrink-0 rounded-t-lg"
                  style={{ backgroundColor: jobStatusVar(status, 'solid') }}
                />
                <header className="border-b border-subtle px-2.5 py-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-primary">{jobStatusLabel(status)}</h2>
                    <span className="rounded-full bg-surface-sunken px-1.5 text-2xs text-muted">
                      {items.length}
                    </span>
                  </div>
                </header>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-1.5 scrollbar-thin">
                  {items.length === 0 && (
                    <p className="px-1 py-4 text-center text-2xs text-muted">Nothing here</p>
                  )}
                  {items.map(({ opp, job }) => (
                    <JobCard
                      key={opp.id}
                      opp={opp}
                      status={job!.status}
                      progress={job!.progress}
                      onAdvance={() => {
                        const next = nextJobStatus(job!.status)
                        if (next) setJobStatus(opp.id, next)
                      }}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {opps.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <Card className="max-w-md">
            <EmptyState
              icon={<HardHat size={28} />}
              title="No jobs yet"
              description="A job is created automatically when a proposal is accepted."
            />
          </Card>
        </div>
      )}
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string
  active: boolean
  onClick: () => void
  count?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-2 py-1 text-2xs font-medium',
        active ? 'bg-action-soft text-brand' : 'text-muted hover:bg-surface-sunken',
      )}
    >
      {label}
      {count !== undefined && count > 0 ? ` · ${count}` : ''}
    </button>
  )
}

function JobCard({
  opp,
  status,
  progress,
  onAdvance,
}: {
  opp: Opportunity
  status: JobStatus
  progress: number
  onAdvance: () => void
}) {
  const s = useStore()
  const job = s.jobs.find((j) => j.opportunityId === opp.id)
  const material = s.materialOrders.find((m) => m.opportunityId === opp.id)
  const issues = s.issues.filter((i) => i.opportunityId === opp.id && i.status === 'open')
  const photos = s.artifacts.filter((a) => a.opportunityId === opp.id && a.kind === 'photo')
  const next = nextJobStatus(status)

  return (
    <div className="rounded-md border border-subtle bg-surface-raised p-2.5">
      <Link to={`/opportunities/${opp.id}?tab=job`} className="block">
        <p className="text-base font-medium text-primary leading-tight">{opp.name}</p>
        <p className="mt-0.5 text-sm text-muted">{ACCOUNT_BY_ID[opp.accountId]?.name}</p>
        <div className="mt-2 flex items-center justify-between text-2xs text-muted">
          <span>{LOCATION_BY_ID[opp.locationId]?.name}</span>
          <span className="font-mono">{money(opp.value, true)}</span>
        </div>
        {job && jobTeam(job).length > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <Avatar name={USER_BY_ID[primaryFieldLead(job) ?? jobTeam(job)[0].userId]?.name ?? '?'} size={16} />
            <span className="text-2xs text-muted">{jobTeam(job).length} team members</span>
          </div>
        )}
        {progress > 0 && (
          <div className="mt-2">
            <Meter value={progress} />
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {job?.dispatchState && (
            <Badge tone={job.dispatchState === 'ready' ? 'success' : job.dispatchState === 'at_risk' ? 'warning' : 'neutral'}>
              {job.dispatchState.replace('_', ' ')}
            </Badge>
          )}
          {job?.syncStatus === 'pending' && <Badge tone="warning">Pending sync</Badge>}
          {material && (
            <Badge tone="info" icon={<Boxes size={9} />}>
              {material.status}
            </Badge>
          )}
          {issues.length > 0 && (
            <Badge tone="warning" icon={<AlertTriangle size={9} />}>
              {issues.length} issue{issues.length === 1 ? '' : 's'}
            </Badge>
          )}
          {photos.length > 0 && (
            <Badge tone="neutral" icon={<Camera size={9} />}>
              {photos.length}
            </Badge>
          )}
        </div>
      </Link>
      {next && (
        <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={onAdvance}>
          Advance to {jobStatusLabel(next)}
        </Button>
      )}
    </div>
  )
}

/** List view used by the projects redirect. */
export function JobsList() {
  return (
    <div className="h-full overflow-y-auto p-5 scrollbar-thin">
      <SectionTitle>Jobs</SectionTitle>
      <Jobs />
    </div>
  )
}
