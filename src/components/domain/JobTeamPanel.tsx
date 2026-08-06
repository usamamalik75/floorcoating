import { UserPlus, X } from 'lucide-react'
import { JOB_ROLE_LABEL, type Job, type JobRole, type Role } from '@/domain/types'
import { jobTeam, membersWithRole } from '@/domain/jobs'
import { useStore } from '@/store/useStore'
import { useUserDirectory, useUsers } from '@/store/selectors'
import { Avatar, Badge, Button, EmptyState } from '@/components/ui'
import { cn } from '@/lib/cn'

const JOB_ROLES: JobRole[] = [
  'project_manager',
  'crew_lead',
  'technician',
]

const USER_ROLE_BY_JOB_ROLE: Record<JobRole, Role> = {
  sales_owner: 'sales',
  estimator: 'estimator',
  project_manager: 'pm',
  scheduler: 'pm',
  field_supervisor: 'pm',
  crew_lead: 'crew_leader',
  technician: 'installer',
  quality_reviewer: 'pm',
  billing_owner: 'accounting',
}

/**
 * Read-only list of people already assigned to the job, grouped by responsibility.
 */
export function JobTeamSummary({
  job,
  onAssign,
}: {
  job: Job
  onAssign?: () => void
}) {
  const updateJob = useStore((s) => s.updateJob)
  const userById = useUserDirectory()
  const team = jobTeam(job)
  const byRole = JOB_ROLES.map((role) => ({
    role,
    members: membersWithRole(job, role),
  })).filter((row) => row.members.length > 0)

  if (byRole.length === 0) {
    return (
      <EmptyState
        title="No team assigned yet"
        description="Open Assign team to add the core delivery roles for this job."
        action={
          onAssign ? (
            <Button size="sm" variant="primary" onClick={onAssign}>
              <UserPlus size={12} />
              Assign team
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      {byRole.map(({ role, members }) => (
        <div key={role} className="rounded-md border border-subtle bg-surface-raised p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-primary">{JOB_ROLE_LABEL[role]}</span>
            <Badge tone="brand">{members.length} assigned</Badge>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {members.map((assignment) => {
              const name = userById[assignment.userId]?.name ?? 'Unknown'
              return (
                <li
                  key={`${assignment.userId}-${assignment.role}`}
                  className="flex items-center gap-1 rounded-full border border-(--action-primary) bg-action-soft pl-2 pr-1 py-1 text-sm text-brand"
                >
                  <Avatar name={name} size={16} />
                  {name}
                  <button
                    type="button"
                    onClick={() =>
                      updateJob(job.id, {
                        team: team.filter((a) => !(a.userId === assignment.userId && a.role === assignment.role)),
                      })
                    }
                    className="rounded-full p-0.5 text-brand/80 hover:bg-white/70 hover:text-brand"
                    aria-label={`Remove ${name} from ${JOB_ROLE_LABEL[role]}`}
                    title={`Remove ${name}`}
                  >
                    <X size={12} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

/**
 * Assign people to job responsibilities. Same control used on Schedule and the Job hub drawer.
 */
export function JobTeamPanel({
  job,
  locationId,
  showIntro = true,
}: {
  job: Job
  locationId: string
  /** When false, only the role chips render (section title lives elsewhere). */
  showIntro?: boolean
}) {
  const updateJob = useStore((s) => s.updateJob)
  const users = useUsers()
  const pool = users.filter((u) => !u.locationId || u.locationId === locationId)

  return (
    <div>
      {showIntro && (
        <>
          <p className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
            <UserPlus size={11} /> Job team and responsibilities
          </p>
          <p className="mb-3 text-sm text-muted">
            Assign the core delivery roles for this job.
          </p>
        </>
      )}
      <div className="space-y-3">
        {JOB_ROLES.map((role) => {
          const assigned = membersWithRole(job, role)
          const eligibleUsers = pool.filter((u) => u.role === USER_ROLE_BY_JOB_ROLE[role])
          return (
            <div key={role} className="rounded-md border border-subtle bg-surface-raised p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-primary">{JOB_ROLE_LABEL[role]}</span>
                <Badge tone={assigned.length ? 'brand' : 'neutral'}>
                  {assigned.length} assigned
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {eligibleUsers.map((u) => {
                  const on = assigned.some((a) => a.userId === u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        const team = jobTeam(job)
                        updateJob(job.id, {
                          team: on
                            ? team.filter((a) => !(a.userId === u.id && a.role === role))
                            : [...team, { userId: u.id, role }],
                        })
                      }}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-2 py-1 text-sm',
                        on
                          ? 'border-(--action-primary) bg-action-soft text-brand'
                          : 'border-subtle text-secondary',
                      )}
                    >
                      <Avatar name={u.name} size={16} /> {u.name}
                    </button>
                  )
                })}
                {eligibleUsers.length === 0 && (
                  <span className="text-sm text-muted">No matching users at this location.</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
