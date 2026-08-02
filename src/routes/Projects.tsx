import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { AlertTriangle, Boxes, Camera, HardHat, Receipt, Users } from 'lucide-react'
import { useStore, money } from '@/store/useStore'
import { useScopedOpportunities } from '@/store/selectors'
import { LOCATION_BY_ID, USER_BY_ID } from '@/data/seed'
import { STAGE_BY_ID, stageLabel, stagesInPhase } from '@/domain/stages'
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  Meter,
  SectionTitle,
  StageChip,
} from '@/components/ui'
import { cn } from '@/lib/cn'

/* ==========================================================================
   Project execution overview
   ==========================================================================
   Everything past the signature, in one place. This is the screen a project
   manager or owner keeps open: what is sold, what is scheduled, what is
   waiting on material, what is on site right now and what is stuck.
   ========================================================================== */

export function Projects() {
  const s = useStore()
  const opps = useScopedOpportunities()
  const opsStages = stagesInPhase('operations')
  const projects = opps.filter((o) => opsStages.includes(o.stage))

  const byStage = opsStages.map((stage) => ({
    stage,
    items: projects.filter((p) => p.stage === stage),
  }))

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-[80rem] px-5 py-5">
        <header className="mb-5">
          <h1 className="font-display text-2xl text-primary">Projects</h1>
          <p className="mt-0.5 text-base text-muted">
            {projects.length} projects in the operations pipeline ·{' '}
            {money(projects.reduce((a, p) => a + p.value, 0), true)} of sold work
          </p>
        </header>

        {projects.length === 0 ? (
          <Card>
            <EmptyState
              icon={<HardHat size={28} />}
              title="No live projects"
              description="Signed work appears here the moment a proposal is accepted."
            />
          </Card>
        ) : (
          byStage
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.stage} className="mb-5">
                <SectionTitle>
                  <span className="flex items-center gap-2">
                    {STAGE_BY_ID[group.stage].label}
                    <span className="font-normal normal-case text-muted">
                      {group.items.length} ·{' '}
                      {money(group.items.reduce((a, p) => a + p.value, 0), true)}
                    </span>
                  </span>
                </SectionTitle>

                <div className="grid gap-3 lg:grid-cols-2">
                  {group.items.map((p) => {
                    const job = s.jobs.find((j) => j.opportunityId === p.id)
                    const material = s.materialOrders.find((m) => m.opportunityId === p.id)
                    const issues = s.issues.filter((i) => i.opportunityId === p.id && i.status === 'open')
                    const cos = s.changeOrders.filter(
                      (c) => c.opportunityId === p.id && c.status === 'pending',
                    )
                    const photos = s.artifacts.filter((a) => a.opportunityId === p.id && a.kind === 'photo')

                    return (
                      <Card key={p.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/opportunities/${p.id}`}
                              className="truncate text-md font-semibold text-primary hover:underline"
                            >
                              {p.name}
                            </Link>
                            <p className="truncate text-sm text-muted">
                              {LOCATION_BY_ID[p.locationId]?.name} · {p.code} ·{' '}
                              {p.sqft.toLocaleString()} sq ft
                            </p>
                          </div>
                          <StageChip
                            group={STAGE_BY_ID[p.stage].group}
                            label={stageLabel(p.stage, p.category)}
                          />
                        </div>

                        {job && (
                          <>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                              <span className="text-muted">
                                {format(new Date(job.start), 'd MMM')} –{' '}
                                {format(new Date(job.end), 'd MMM')}
                              </span>
                              {job.pmId && (
                                <span className="flex items-center gap-1.5 text-secondary">
                                  <Users size={11} className="text-muted" />
                                  {USER_BY_ID[job.pmId]?.name}
                                </span>
                              )}
                              {job.crewLeaderId && (
                                <span className="flex items-center gap-1.5">
                                  <Avatar name={USER_BY_ID[job.crewLeaderId]?.name ?? ''} size={18} />
                                  <span className="text-secondary">
                                    {USER_BY_ID[job.crewLeaderId]?.name}
                                  </span>
                                </span>
                              )}
                            </div>
                            {job.progress > 0 && (
                              <div className="mt-2">
                                <Meter
                                  value={job.progress}
                                  max={100}
                                  tone={job.progress === 100 ? 'success' : 'action'}
                                />
                              </div>
                            )}
                          </>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-subtle pt-2.5">
                          <Badge tone={material?.status === 'delivered' ? 'success' : material ? 'attention' : 'neutral'} icon={<Boxes size={9} />}>
                            {material ? material.status : 'no material order'}
                          </Badge>
                          <Badge tone="neutral" icon={<Camera size={9} />}>
                            {photos.length} photos
                          </Badge>
                          {issues.length > 0 && (
                            <Badge tone="danger" icon={<AlertTriangle size={9} />}>
                              {issues.length} open {issues.length === 1 ? 'issue' : 'issues'}
                            </Badge>
                          )}
                          {cos.length > 0 && (
                            <Badge tone="warning" icon={<Receipt size={9} />}>
                              {cos.length} change {cos.length === 1 ? 'order' : 'orders'} pending
                            </Badge>
                          )}
                          <span
                            className={cn(
                              'ml-auto font-mono text-base font-medium text-primary tabular',
                            )}
                          >
                            {money(p.value)}
                          </span>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
