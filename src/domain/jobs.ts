import type { Job, JobAssignment, JobRole } from './types'

/**
 * Reads the flexible job team and transparently upgrades legacy prototype jobs.
 * This keeps persisted demo sessions compatible while the product moves away
 * from hard-coded project-manager / crew-leader / installer slots.
 */
export function jobTeam(job: Job): JobAssignment[] {
  if (job.team) return job.team
  return [
    ...(job.pmId ? [{ userId: job.pmId, role: 'project_manager' as const }] : []),
    ...(job.crewLeaderId ? [{ userId: job.crewLeaderId, role: 'crew_lead' as const }] : []),
    ...job.crewIds.map((userId) => ({ userId, role: 'technician' as const })),
  ]
}

export function assignedTo(job: Job, userId: string) {
  return jobTeam(job).some((assignment) => assignment.userId === userId)
}

export function membersWithRole(job: Job, role: JobRole) {
  return jobTeam(job).filter((assignment) => assignment.role === role)
}

export function primaryFieldLead(job: Job) {
  return membersWithRole(job, 'field_supervisor')[0]?.userId
    ?? membersWithRole(job, 'crew_lead')[0]?.userId
    ?? job.crewLeaderId
}
