import type { Artifact, ChecklistInstance, ChecklistTemplate, Job, JobAssignment, JobRole } from './types'

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

function checklistRatio(
  templateId: string,
  checklists: ChecklistInstance[],
  templates: ChecklistTemplate[],
  opportunityId: string,
) {
  const instance = checklists.find((c) => c.opportunityId === opportunityId && c.templateId === templateId)
  const template = templates.find((t) => t.id === templateId)
  const total = instance?.items?.length ?? template?.items.length ?? 0
  if (total <= 0) return 0
  return Math.min(1, (instance?.done.length ?? 0) / total)
}

/**
 * Delivery progress is derived from live execution evidence, not the saved
 * `job.progress` number. This keeps every surface consistent with what the
 * crew has actually logged.
 *
 * Status remains a separate gate: evidence can be fully logged while the job
 * is still in Completion Review. Progress stays independent from whether the
 * workflow has been manually marked Completed.
 */
export function deriveJobProgress(
  job: Job,
  artifacts: Artifact[],
  checklists: ChecklistInstance[],
  templates: ChecklistTemplate[],
) {
  const installRatio = checklistRatio('cl_install', checklists, templates, job.opportunityId)
  const closeoutRatio = checklistRatio('cl_closeout', checklists, templates, job.opportunityId)
  const hasAfterPhoto = artifacts.some(
    (artifact) => artifact.opportunityId === job.opportunityId && artifact.kind === 'photo' && artifact.photoPhase === 'after',
  )
  const hasSignoff = artifacts.some(
    (artifact) => artifact.opportunityId === job.opportunityId && artifact.kind === 'signature',
  )
  const wrapped = Boolean(job.checkOutAt) || job.clockStatus === 'wrapped'

  const progress =
    installRatio * 55
    + (hasAfterPhoto ? 15 : 0)
    + (wrapped ? 10 : 0)
    + closeoutRatio * 10
    + (hasSignoff ? 10 : 0)

  return Math.max(0, Math.min(100, Math.round(progress)))
}
