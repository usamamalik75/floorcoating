import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BellRing,
  Boxes,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileSignature,
  FileText,
  HardHat,
  Image as ImageIcon,
  Lock,
  Mail,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  PenLine,
  Phone,
  Plus,
  Receipt,
  Ruler,
  Sparkles,
  StickyNote,
  User as UserIcon,
  UserPlus,
  XCircle,
} from 'lucide-react'
import type { ArtifactKind, Job, JobStatus, StageId } from '@/domain/types'
import {
  ACCOUNT_RELATIONSHIP_LABEL,
  CATEGORY_LABEL,
  JOB_STATUS_LABEL,
  SALES_PIPELINE_LABEL,
  salesPipelineOf,
  visitVocab,
} from '@/domain/types'
import {
  JOB_STATUSES,
  STAGE_BY_ID,
  defaultHubTabForStage,
  isVisitFormAvailable,
  jobStatusLabel,
  jobStatusIndex,
  normalizeJobStatus,
  stageLabel,
} from '@/domain/stages'
import {
  resolveChecklistItems,
  visitChecklistTemplates,
} from '@/data/checklists'
import { ACCOUNT_BY_ID } from '@/data/seed'
import { estimateTotal, money, optionTotal, useStore } from '@/store/useStore'
import {
  useArtifactsFor,
  useChangeOrdersFor,
  useChecks,
  useFormForCategory,
  useIssuesFor,
  useMessageThreads,
  usePaymentRequests,
  usePriceBookItems,
  useUserDirectory,
} from '@/store/selectors'
import { StageGate } from '@/components/domain/StageGate'
import { StageStepper } from '@/components/domain/StageStepper'
import { NextActionPanel } from '@/components/domain/NextActionPanel'
import { JobTeamPanel, JobTeamSummary } from '@/components/domain/JobTeamPanel'
import { JobProcurementPanel } from '@/components/domain/JobProcurementPanel'
import { primaryFieldLead } from '@/domain/jobs'
import { TEMPERATURE_LABEL } from '@/domain/types'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  EmptyState,
  FieldRow,
  Input,
  KeyValue,
  Meter,
  Modal,
  SectionTitle,
  Select,
  Sheet,
  StageChip,
  Textarea,
} from '@/components/ui'
import { cn } from '@/lib/cn'

const BASE_TABS = [
  { id: 'overview', label: 'Overview', icon: ClipboardList },
  { id: 'visits', label: 'Visits', icon: MapPin },
  { id: 'estimates', label: 'Estimates', icon: FileText },
  { id: 'proposals', label: 'Proposals', icon: FileSignature },
  { id: 'documents', label: 'Documents', icon: ClipboardCheck },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'history', label: 'History', icon: StickyNote },
  { id: 'job', label: 'Job', icon: HardHat, awardedOnly: true },
] as const

const ARTIFACT_ICON: Record<ArtifactKind, typeof FileText> = {
  photo: ImageIcon,
  doc: FileText,
  plan: FileText,
  note: StickyNote,
  form: ClipboardList,
  signature: PenLine,
  map: MapIcon,
}

/**
 * Opportunity is the hub: tabs surface Site Visits, Estimates, Proposals and
 * Job without forcing menu redirects. Module list pages deep-link here too.
 */
export function OpportunityRecord() {
  const { id = '' } = useParams<{ id: string }>()
  const [params, setParams] = useSearchParams()
  const s = useStore()
  const setJobStatus = useStore((state) => state.setJobStatus)
  const userById = useUserDirectory()

  const [gateTo, setGateTo] = useState<StageId | null>(null)
  const [showNext, setShowNext] = useState(true)
  const [messageChannel, setMessageChannel] = useState<'email' | 'sms'>('email')
  const [messageSubject, setMessageSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [teamSheetOpen, setTeamSheetOpen] = useState(false)

  const opp = s.opportunities.find((o) => o.id === id)

  const est = useMemo(() => s.estimates.find((e) => e.opportunityId === id), [s.estimates, id])
  const job = s.jobs.find((j) => j.opportunityId === id)
  const procurementOrder = s.procurementOrders.find((m) => m.opportunityId === id)
  const invoices = s.invoices.filter((i) => i.opportunityId === id)
  const reminder = s.reminders.find((r) => r.opportunityId === id && !r.done)
  const threads = useMessageThreads(id)
  const paymentRequests = usePaymentRequests(id)
  const priceBookItems = usePriceBookItems()
  const priceBookById = useMemo(
    () => Object.fromEntries(priceBookItems.map((item) => [item.id, item])),
    [priceBookItems],
  )
  const mine = s.artifacts.filter((a) => a.opportunityId === id)
  const visit = s.siteVisits.find((v) => v.opportunityId === id)
  const log = s.activity.filter((a) => a.opportunityId === id).slice().reverse()

  const prevOppIdRef = useRef<string | null>(null)
  const prevStageRef = useRef<StageId | null>(null)

  useEffect(() => {
    if (!opp) return
    const stageDefault = defaultHubTabForStage(opp.stage)
    const explicitTab = params.get('tab')

    // Opened a different opportunity — default tab from stage unless URL already set one.
    if (prevOppIdRef.current !== opp.id) {
      prevOppIdRef.current = opp.id
      prevStageRef.current = opp.stage
      if (!explicitTab) {
        setParams({ tab: stageDefault }, { replace: true })
      }
      return
    }

    // Same opportunity advanced stages — follow the workflow tab.
    if (prevStageRef.current !== opp.stage) {
      prevStageRef.current = opp.stage
      setParams({ tab: stageDefault }, { replace: true })
    }
  }, [opp?.id, opp?.stage, setParams])

  if (!opp) {
    return (
      <EmptyState
        className="h-full"
        title="Opportunity not found"
        description="It may have been reset with the demo data."
        action={
          <Link to="/sales">
            <Button variant="primary">Back to Sales</Button>
          </Link>
        }
      />
    )
  }

  const tab = params.get('tab') ?? defaultHubTabForStage(opp.stage)
  const setTab = (next: string) => setParams({ tab: next })
  const vocab = visitVocab(opp.category)
  const visitFormOpen = isVisitFormAvailable(opp.stage)
  const visibleTabs = BASE_TABS.filter((t) => !('awardedOnly' in t && t.awardedOnly) || opp.stage === 'awarded').map(
    (t) => (t.id === 'visits' ? { ...t, label: vocab.Plural } : t),
  )

  const account = s.accounts.find((a) => a.id === opp.accountId) ?? ACCOUNT_BY_ID[opp.accountId]
  const location = s.locations.find((l) => l.id === opp.locationId)
  const relationship = account?.anchorStage
  const relationshipTone =
    relationship === 'customer' ? 'success' : relationship === 'contact' ? 'info' : 'neutral'
  const def = STAGE_BY_ID[opp.stage]
  const thread = threads[0]
  const jobReached = (status: JobStatus) =>
    Boolean(job && jobStatusIndex(job.status) >= jobStatusIndex(status))

  return (
    <div className="flex h-full flex-col">
      {/* ---- Header ---- */}
      <header className="shrink-0 border-b border-subtle/50 bg-surface-chrome text-white px-5 pt-4 pb-0">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <Link to="/sales" className="text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl leading-tight text-white">{opp.name}</h1>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-white/60 mt-0.5">
              <span className="font-mono text-white/50">{opp.code}</span>
              <span className="text-white/30">·</span>
              <Link to="/customers" className="hover:text-white hover:underline transition-colors">
                {account?.name}
              </Link>
              <span className="text-white/30">·</span>
              <span>{location?.name}</span>
              <span className="text-white/30">·</span>
              <Badge
                tone={
                  opp.temperature === 'hot' ? 'danger' : opp.temperature === 'warm' ? 'attention' : 'neutral'
                }
              >
                {TEMPERATURE_LABEL[opp.temperature]}
              </Badge>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StageChip group={def.group} label={stageLabel(opp.stage, opp.category)} />
            <span className="font-mono text-xl font-bold text-white tabular">
              {money(est ? estimateTotal(est) : opp.value)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-0.5 border-t border-white/10">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-white text-white'
                  : 'border-transparent text-white/50 hover:text-white/80',
              )}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-surface-sunken lg:flex-row">
        <aside className="hidden w-72 shrink-0 border-r border-subtle bg-surface-raised lg:block">
          <div className="h-full overflow-y-auto p-4 scrollbar-thin">
            <p className="mb-1 text-2xs font-semibold tracking-wider text-muted uppercase">
              Sales pipeline
            </p>
            <p className="mb-3 text-sm text-secondary">
              Move left to right through the full sales process.
            </p>
            <StageStepper opportunity={opp} onPick={setGateTo} orientation="vertical" />
          </div>
        </aside>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-5xl space-y-5 p-5">
          {showNext && (
            <NextActionPanel
              opportunity={opp}
              onDismiss={() => setShowNext(false)}
              onMove={setGateTo}
            />
          )}

            {/* == Overview == */}
            <div className={tab === 'overview' ? 'space-y-6' : 'hidden'}>
            <Section id="summary" title="Overview">
              {reminder && (
                <Card className="mb-3 border-(--status-warning) bg-warning-soft px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <BellRing size={15} className="mt-0.5 shrink-0 text-warning-text" />
                    <div className="min-w-0">
                      <p className="text-base font-medium text-primary">
                        Follow-up scheduled for {format(new Date(reminder.dueAt), 'd MMMM yyyy')}
                        {reminder.expectedPeriod && ` · customer expects ${reminder.expectedPeriod}`}
                      </p>
                      {reminder.reason && (
                        <p className="mt-0.5 text-sm text-secondary">Reason: {reminder.reason}</p>
                      )}
                      {reminder.note && <p className="mt-0.5 text-sm text-secondary">{reminder.note}</p>}
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-4">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <KeyValue label="Relationship">
                    {relationship ? (
                      <Badge tone={relationshipTone}>
                        {ACCOUNT_RELATIONSHIP_LABEL[relationship]}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </KeyValue>
                  <KeyValue label="Pipeline">
                    {SALES_PIPELINE_LABEL[salesPipelineOf(opp.category)]}
                  </KeyValue>
                  <KeyValue label="Project type">{CATEGORY_LABEL[opp.category]}</KeyValue>
                  <KeyValue label="Estimated quantity">{opp.estimatedQuantity.toLocaleString()} units</KeyValue>
                  <KeyValue label="Secondary quantity">{opp.secondaryQuantity > 0 ? `${opp.secondaryQuantity} units` : '—'}</KeyValue>
                  <KeyValue label="Source">{opp.source}</KeyValue>
                  <KeyValue label="Sales rep">{userById[opp.ownerId]?.name ?? 'Unassigned'}</KeyValue>
                  <KeyValue label="Estimator">
                    {opp.estimatorId ? userById[opp.estimatorId]?.name : '—'}
                  </KeyValue>
                  <KeyValue label="Project manager">
                    {opp.pmId ? userById[opp.pmId]?.name : '—'}
                  </KeyValue>
                  <KeyValue label="Probability">{def.probability}%</KeyValue>
                </dl>

                <div className="mt-4 grid gap-3 border-t border-subtle pt-4 sm:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <UserIcon size={14} className="mt-0.5 shrink-0 text-muted" />
                    <div className="min-w-0 text-base">
                      <p className="text-primary">{account?.contactName}</p>
                      <p className="text-sm text-muted">{account?.contactTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-muted" />
                    <p className="min-w-0 text-base text-primary">{opp.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="shrink-0 text-muted" />
                    <p className="truncate text-base text-primary">{account?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="shrink-0 text-muted" />
                    <p className="text-base text-primary">{account?.phone}</p>
                  </div>
                </div>
              </Card>
            </Section>

            <Section id="overview-visit" title={vocab.Singular}>
              <Card>
                {visitFormOpen && visit ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-base font-medium text-primary">
                        {visit.completedAt ? `${vocab.Singular} completed` : `${vocab.Singular} in progress`}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {opp.visitAt
                          ? `Scheduled ${format(new Date(opp.visitAt), 'd MMM yyyy · HH:mm')}`
                          : 'Open the form to capture checklist and answers.'}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setTab('visits')}>
                      View {vocab.singular}
                    </Button>
                  </div>
                ) : (
                  <EmptyState title={`No ${vocab.singular} yet.`} />
                )}
              </Card>
            </Section>

            <Section id="overview-estimate" title="Estimate">
              <Card>
                {est ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-base font-medium text-primary">
                        Estimate {est.status.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {est.options.length} option{est.options.length === 1 ? '' : 's'} · {money(estimateTotal(est))}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setTab('estimates')}>
                      View estimate
                    </Button>
                  </div>
                ) : (
                  <EmptyState title="No estimate yet." />
                )}
              </Card>
            </Section>

            <Section id="overview-proposal" title="Proposal">
              <Card>
                {est?.signedAt ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-base font-medium text-primary">Proposal signed</p>
                      <p className="mt-0.5 text-sm text-muted">
                        Signed by {est.signedBy ?? 'customer'} on{' '}
                        {format(new Date(est.signedAt), 'd MMM yyyy')}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setTab('proposals')}>
                      View proposal
                    </Button>
                  </div>
                ) : (
                  <EmptyState title="No proposal signed yet." />
                )}
              </Card>
            </Section>
            </div>

            {/* == Site visit / sales call tab == */}
            <div className={tab === 'visits' ? 'space-y-6' : 'hidden'}>
            <Section
              id="sitevisit"
              title={vocab.Singular}
              action={
                visitFormOpen ? (
                  <Link to={`/opportunities/${opp.id}/visit`}>
                    <Button size="sm">
                      <Ruler size={12} />
                      {!visit
                        ? 'Open form'
                        : visit.completedAt
                          ? 'Review / edit form'
                          : 'Open form'}
                    </Button>
                  </Link>
                ) : undefined
              }
            >
              {visitFormOpen ? (
                <GatheredAtVisit opportunityId={opp.id} />
              ) : (
                <Card>
                  <EmptyState title={`No ${vocab.singular} yet.`} />
                </Card>
              )}
            </Section>
            </div>

            {/* == Estimates tab == */}
            <div className={tab === 'estimates' ? 'space-y-6' : 'hidden'}>
            <Section
              id="estimate"
              title="Estimate"
              action={
                est ? (
                  <Link to={`/estimate/${opp.id}`}>
                    <Button size="sm">
                      <FileText size={12} />
                      Open estimate
                    </Button>
                  </Link>
                ) : undefined
              }
            >
              {!est ? (
                <Card>
                  <EmptyState title="No estimate yet." />
                </Card>
              ) : (
                <Card>
                  <CardHeader
                    title={`${est.options.length} option${est.options.length === 1 ? '' : 's'}`}
                    subtitle={
                      est.approvedById
                        ? `Approved by ${userById[est.approvedById]?.name}`
                        : 'Not yet approved'
                    }
                    actions={
                      <Badge
                        tone={
                          est.status === 'signed'
                            ? 'success'
                            : est.status === 'pending_approval'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {est.status.replace('_', ' ')}
                      </Badge>
                    }
                  />
                  <div className="divide-y divide-(--border-subtle)">
                    {est.options.map((o) => (
                      <div key={o.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Badge tone={o.kind === 'scope' ? 'info' : 'attention'}>
                          {o.kind === 'scope' ? 'Area' : 'Alternative'}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-medium text-primary">{o.label}</p>
                          <p className="truncate text-sm text-muted">
                            {o.lineItems.map((l) => l.name).join(' · ')}
                          </p>
                        </div>
                        {o.selectedByCustomer && (
                          <Badge tone="success" icon={<CheckCircle2 size={9} />}>
                            Chosen
                          </Badge>
                        )}
                        <span className="font-mono text-base text-primary tabular">
                          {money(optionTotal(o.lineItems))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-subtle bg-surface-inset px-4 py-2">
                    <span className="text-base font-medium text-secondary">Contract total</span>
                    <span className="font-mono text-md font-semibold text-primary tabular">
                      {money(estimateTotal(est))}
                    </span>
                  </div>
                  {est.internalNotes && (
                    <div className="border-t border-subtle px-4 py-2.5">
                      <p className="mb-1 flex items-center gap-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
                        <Lock size={9} />
                        Internal notes — never shown to the customer
                      </p>
                      <p className="text-sm leading-relaxed text-secondary">{est.internalNotes}</p>
                    </div>
                  )}
                </Card>
              )}
            </Section>

            </div>

            {/* == Proposals tab == */}
            <div className={tab === 'proposals' ? 'space-y-6' : 'hidden'}>
            <Section id="proposal" title="Proposal">
              {!est?.signedAt ? (
                <Card>
                  <EmptyState title="No proposal signed yet." />
                </Card>
              ) : (
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <KeyValue label="Sent">
                      {est.sentAt ? format(new Date(est.sentAt), 'd MMM yyyy') : '—'}
                    </KeyValue>
                    <KeyValue label="Signed">
                      {format(new Date(est.signedAt), 'd MMM yyyy')}
                    </KeyValue>
                    <KeyValue label="Signed by">{est.signedBy ?? '—'}</KeyValue>
                    <KeyValue label="Deposit">{est.depositPct}%</KeyValue>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-subtle pt-3">
                    <Link to={`/proposal/${est.token}`} target="_blank">
                      <Button size="sm">
                        <FileSignature size={12} />
                        Open the customer’s view
                      </Button>
                    </Link>
                    <Link to={`/signoff/${opp.id}`} target="_blank">
                      <Button size="sm">
                        <PenLine size={12} />
                        Completion sign-off link
                      </Button>
                    </Link>
                    {(est.status === 'signed' || opp.stage === 'awarded') && (
                      <Link to="/jobs">
                        <Button size="sm">
                          <HardHat size={12} />
                          Open Job
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              )}
            </Section>
            </div>

            {/* == Documents tab == */}
            <div className={tab === 'documents' ? 'space-y-6' : 'hidden'}>
            <Section
              id="procurement"
              title="Purchasing"
              action={
                <Link to={`/opportunities/${opp.id}/procurement`}>
                  <Button size="sm">
                    <Boxes size={12} />
                    {procurementOrder ? 'Open order' : 'Prepare order'}
                  </Button>
                </Link>
              }
            >
              {!procurementOrder ? (
                <Card>
                  <EmptyState
                    title="No purchase order yet"
                    description="Requirements are derived from the sold scope and configured resource rules."
                  />
                </Card>
              ) : (
                <Card>
                  <CardHeader
                    title={procurementOrder.purchaseOrderId ?? 'Draft order'}
                    subtitle={`Needed by ${format(new Date(procurementOrder.neededBy), 'd MMM yyyy')}`}
                    icon={<Boxes size={14} />}
                    actions={
                      <Badge tone={procurementOrder.status === 'delivered' ? 'success' : 'attention'}>
                        {procurementOrder.status}
                      </Badge>
                    }
                  />
                  <div className="divide-y divide-(--border-subtle)">
                    {procurementOrder.lines.map((l) => (
                      <div key={l.id} className="flex items-center gap-3 px-4 py-2">
                        <span
                          className="h-5 w-5 shrink-0 rounded-xs border border-subtle"
                          style={{ background: priceBookById[l.priceBookId]?.swatch }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base text-primary">{l.product}</p>
                          <p className="truncate text-sm text-muted">{l.derivation}</p>
                        </div>
                        <span className="font-mono text-sm text-primary tabular">
                          {l.qty} {l.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </Section>

            {/* == Preparation == */}
            <Section id="prep" title="Project preparation">
              <ChecklistCard
                opportunityId={opp.id}
                templateId="cl_prep"
                subtitle="Everything the crew needs, verified before they leave the yard."
              />
            </Section>

            </div>

            {/* == Job tab == */}
            <div className={tab === 'job' ? 'space-y-6' : 'hidden'}>
            <JobWhatsNext
              job={job}
              opportunityId={opp.id}
              contactName={account?.contactName}
            />

            <Section
              id="job"
              title="Job status"
              action={
                <div className="flex flex-wrap gap-2">
                  {job?.status === 'ready_to_start' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setJobStatus(opp.id, 'in_progress')}
                    >
                      <ArrowRight size={12} />
                      Start job
                    </Button>
                  )}
                  <Link to="/schedule">
                    <Button size="sm">
                      <CalendarDays size={12} />
                      Schedule
                    </Button>
                  </Link>
                  <Link to="/jobs">
                    <Button size="sm">
                      <HardHat size={12} />
                      Jobs board
                    </Button>
                  </Link>
                </div>
              }
            >
              {!job ? (
                <Card>
                  <EmptyState
                    title="No job yet"
                    description="When this opportunity is awarded, a job is created at Scheduling Required."
                    action={
                      <Link to="/jobs">
                        <Button size="sm" variant="primary">
                          Go to Jobs
                        </Button>
                      </Link>
                    }
                  />
                </Card>
              ) : (
                <Card className="overflow-hidden border-strong">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle bg-surface-inset px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-primary">Job status</p>
                      <Badge tone="brand">{jobStatusLabel(job.status)}</Badge>
                    </div>
                    <p className="text-sm text-muted">
                      Progress <span className="font-mono text-primary">{job.progress}%</span>
                    </p>
                  </div>

                  <div className="grid gap-0 border-b border-subtle lg:grid-cols-[15rem_minmax(0,1fr)]">
                    <div className="border-b border-subtle bg-surface-raised px-4 py-3 lg:border-r lg:border-b-0">
                      <p className="mb-2 text-2xs font-semibold tracking-wider text-muted uppercase">
                        Job workflow
                      </p>
                      <ol className="space-y-1.5">
                        {JOB_STATUSES.filter((status) => status !== 'on_hold').map((status, index, all) => {
                          const idx = jobStatusIndex(status)
                          const current = jobStatusIndex(normalizeJobStatus(job.status))
                          const done = current > idx
                          const active = normalizeJobStatus(job.status) === status
                          const next = current + 1 === idx
                          const last = index === all.length - 1
                          return (
                            <li key={status} className="flex gap-2">
                              <div className="flex w-5 shrink-0 flex-col items-center">
                                <span
                                  className={cn(
                                    'flex h-5 w-5 items-center justify-center rounded-full text-2xs font-bold',
                                    active && 'bg-action text-action-fg',
                                    done && 'bg-success-soft text-success-text',
                                    next && 'border border-(--accent-attention) bg-attention-soft text-attention-text',
                                    !active && !done && !next && 'bg-surface-inset text-muted',
                                  )}
                                >
                                  {index + 1}
                                </span>
                                {!last && (
                                  <span
                                    className={cn(
                                      'mt-1 h-4 w-px',
                                      done ? 'bg-success-soft' : 'bg-(--border-subtle)',
                                    )}
                                  />
                                )}
                              </div>
                              <div className="min-w-0 pb-1.5">
                                <p
                                  className={cn(
                                    'text-sm leading-snug',
                                    active && 'font-semibold text-primary',
                                    done && 'text-secondary',
                                    next && 'text-attention-text',
                                    !active && !done && !next && 'text-muted',
                                  )}
                                >
                                  {jobStatusLabel(status)}
                                </p>
                                {active && (
                                  <p className="text-2xs text-muted">Current step</p>
                                )}
                                {next && (
                                  <p className="text-2xs text-attention-text">Up next</p>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                      {job.status === 'on_hold' && (
                        <div className="mt-2 rounded-md border border-warning bg-warning-soft px-2.5 py-2">
                          <p className="text-sm font-medium text-warning-text">On hold</p>
                          <p className="text-2xs text-warning-text/90">
                            Work is paused and will resume from In progress.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
                    <KeyValue label="Start">{format(new Date(job.start), 'd MMM yyyy')}</KeyValue>
                    <KeyValue label="Finish">{format(new Date(job.end), 'd MMM yyyy')}</KeyValue>
                    <KeyValue label="Project manager">
                      {job.pmId ? userById[job.pmId]?.name : '—'}
                    </KeyValue>
                    <KeyValue label="Crew lead">
                      {(() => {
                        const leadId = primaryFieldLead(job)
                        return leadId ? userById[leadId]?.name ?? '—' : 'Not assigned'
                      })()}
                    </KeyValue>
                    </div>
                  </div>

                  <div className="border-t border-subtle px-4 py-3">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-muted">Progress</span>
                      <span className="font-mono text-primary tabular">{job.progress}%</span>
                    </div>
                    <Meter
                      value={job.progress}
                      max={100}
                      tone={job.progress === 100 ? 'success' : 'action'}
                    />
                  </div>

                  {job.dailyLogs.length > 0 && (
                    <div className="border-t border-subtle px-4 py-3">
                      <p className="mb-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
                        Daily log
                      </p>
                      {job.dailyLogs.map((d) => (
                        <div key={d.id} className="mb-1.5 flex gap-2 text-sm">
                          <span className="w-14 shrink-0 font-mono text-muted">
                            {format(new Date(d.date), 'd MMM')}
                          </span>
                          <span className="min-w-0 text-secondary">
                            {d.note}
                            <span className="text-muted"> — {userById[d.byId]?.name}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </Section>

            {job && (
              <Section
                id="team"
                title="Job team and responsibilities"
                subtitle="Assigned people only. Use Assign team to add or change responsibilities."
                action={
                  <Button size="sm" variant="primary" onClick={() => setTeamSheetOpen(true)}>
                    <UserPlus size={12} />
                    Assign team
                  </Button>
                }
              >
                <Card className="p-4">
                  <JobTeamSummary
                    job={job}
                    onAssign={() => setTeamSheetOpen(true)}
                  />
                </Card>
                <Sheet
                  open={teamSheetOpen}
                  onClose={() => setTeamSheetOpen(false)}
                  title="Job team and responsibilities"
                  subtitle={`${format(new Date(job.start), 'MMM d')} – ${format(new Date(job.end), 'MMM d, yyyy')}`}
                  footer={
                    <Button variant="primary" onClick={() => setTeamSheetOpen(false)}>
                      Done
                    </Button>
                  }
                >
                  <JobTeamPanel job={job} locationId={opp.locationId} />
                </Sheet>
              </Section>
            )}

            {job && (
              <Section
                id="job-procurement"
                title="Procurement order"
                subtitle="Create, submit, and track material fulfilment for this job without leaving the hub."
                action={
                  <Link to={`/opportunities/${opp.id}/procurement`}>
                    <Button size="sm">
                      <Boxes size={12} />
                      Full order page
                    </Button>
                  </Link>
                }
              >
                <JobProcurementPanel opportunityId={opp.id} />
              </Section>
            )}

            <Section
              id="changes"
              title="Change orders and issues"
              subtitle="Raise during install when scope, price, or schedule changes. Approved COs roll into the final invoice."
            >
              <ChangeOrders opportunityId={opp.id} />
              <div className="mt-3">
                <Issues opportunityId={opp.id} />
              </div>
            </Section>
            <Section id="closeout" title="Completion and closeout">
              <ChecklistCard
                opportunityId={opp.id}
                templateId="cl_closeout"
                subtitle="The workflow asks these questions so the team has a consistent record."
              />
              {jobReached('completion_review') && (
                <Card className="mt-3 p-4">
                  <p className="text-base text-secondary">
                    Customer sign-off is captured on a link sent to {account?.contactName}.
                  </p>
                  <Link to={`/signoff/${opp.id}`} target="_blank">
                    <Button size="sm" className="mt-2">
                      <PenLine size={12} />
                      Open the sign-off link
                    </Button>
                  </Link>
                </Card>
              )}
            </Section>
            <Section id="invoice" title="Invoice and payment">
              {invoices.length === 0 ? (
                <Card>
                  <EmptyState title="Not invoiced" description="Raised after closeout is confirmed." />
                </Card>
              ) : (
                <Card>
                  {invoices.map((inv) => {
                    const paidAmt = inv.payments.reduce((a, p) => a + p.amount, 0)
                    const paymentLink = paymentRequests.find((request) => request.invoiceId === inv.id)
                    return (
                      <div key={inv.id} className="border-b border-subtle p-4 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-base text-primary">{inv.number}</p>
                            <p className="text-sm text-muted capitalize">
                              {inv.kind} · QuickBooks {inv.quickbooksId ?? 'not synced'}
                            </p>
                          </div>
                          <Badge
                            tone={
                              inv.status === 'paid'
                                ? 'success'
                                : inv.status === 'partial'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          >
                            {inv.status}
                          </Badge>
                          <span className="font-mono text-base text-primary tabular">
                            {money(inv.amount)}
                          </span>
                        </div>
                        {paidAmt > 0 && paidAmt < inv.amount && (
                          <p className="mt-1.5 text-sm text-muted">
                            {money(paidAmt)} received · {money(inv.amount - paidAmt)} outstanding
                          </p>
                        )}
                        {paymentLink && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                            <Badge
                              tone={
                                paymentLink.status === 'paid'
                                  ? 'success'
                                  : paymentLink.status === 'failed'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {paymentLink.status}
                            </Badge>
                            <span>Hosted payment link ready</span>
                            <Link
                              to={`/pay/${paymentLink.token}`}
                              target="_blank"
                              className="font-medium text-brand hover:underline"
                            >
                              Open customer page
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </Card>
              )}
            </Section>
            </div>

            {/* == Photos tab == */}
            <div className={tab === 'photos' ? 'space-y-6' : 'hidden'}>
            <Section id="photos" title="Photos and files">
              {mine.length === 0 ? (
                <Card>
                  <EmptyState title="Nothing attached yet" />
                </Card>
              ) : (
                <Card>
                  {(['before', 'progress', 'after'] as const).map((phase) => {
                    const set = mine.filter((a) => a.photoPhase === phase)
                    if (set.length === 0) return null
                    return (
                      <div key={phase} className="border-b border-subtle last:border-0">
                        <p className="bg-surface-inset px-4 py-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
                          {phase} photos · {set.length}
                        </p>
                        {set.map((a) => (
                          <ArtifactRow key={a.id} artifact={a} category={opp.category} />
                        ))}
                      </div>
                    )
                  })}
                  {mine
                    .filter((a) => !a.photoPhase)
                    .map((a) => (
                      <ArtifactRow key={a.id} artifact={a} category={opp.category} />
                    ))}
                </Card>
              )}
            </Section>
            </div>

            {/* == Messages tab == */}
            <div className={tab === 'messages' ? 'space-y-6' : 'hidden'}>
            <Section id="messages" title="Messages">
              <Card>
                <CardHeader
                  title="Customer thread"
                  subtitle={`${account?.contactName} · ${account?.email ?? account?.phone ?? 'No contact method'}`}
                  icon={<MessageSquare size={14} />}
                  actions={
                    <Link to="/communications">
                      <Button size="sm">Open hub</Button>
                    </Link>
                  }
                />
                {thread ? (
                  <div className="space-y-3 p-4">
                    {thread.messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'max-w-[85%] rounded-md px-3 py-2',
                          message.direction === 'outbound'
                            ? 'ml-auto bg-action-soft'
                            : 'border border-subtle bg-surface-inset',
                        )}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span>{message.channel.toUpperCase()}</span>
                          <span>·</span>
                          <span>{message.status}</span>
                          <span>·</span>
                          <span>{format(new Date(message.at), 'd MMM · HH:mm')}</span>
                        </div>
                        {message.subject && <p className="mt-1 text-sm font-medium text-primary">{message.subject}</p>}
                        <p className="mt-1 whitespace-pre-wrap text-sm text-secondary">{message.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No messages yet"
                    description="Proposal sends, follow-ups, and payment reminders can all live on one customer thread."
                  />
                )}
              </Card>

              <Card className="p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldRow label="Channel">
                    <Select value={messageChannel} onChange={(e) => setMessageChannel(e.target.value as 'email' | 'sms')}>
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </Select>
                  </FieldRow>
                  {messageChannel === 'email' && (
                    <FieldRow label="Subject">
                      <Input value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} placeholder="Message subject" />
                    </FieldRow>
                  )}
                  <FieldRow label="Message" className="sm:col-span-2">
                    <Textarea
                      rows={4}
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      placeholder="Draft a follow-up, payment reminder, or scheduling note..."
                    />
                  </FieldRow>
                </div>
                <div className="mt-3 flex gap-2 border-t border-subtle pt-3">
                  <Button
                    onClick={() => {
                      if (!messageBody.trim()) return
                      s.sendMessage(opp.id, {
                        channel: messageChannel,
                        subject: messageChannel === 'email' ? messageSubject : undefined,
                        body: messageBody,
                        contactName: account?.contactName ?? 'Customer',
                        contactEmail: account?.email,
                        contactPhone: account?.phone,
                        status: 'draft',
                      })
                      setMessageBody('')
                      setMessageSubject('')
                    }}
                  >
                    Save draft
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (!messageBody.trim()) return
                      s.sendMessage(opp.id, {
                        channel: messageChannel,
                        subject: messageChannel === 'email' ? messageSubject : undefined,
                        body: messageBody,
                        contactName: account?.contactName ?? 'Customer',
                        contactEmail: account?.email,
                        contactPhone: account?.phone,
                        status: 'sent',
                      })
                      setMessageBody('')
                      setMessageSubject('')
                    }}
                  >
                    Send now
                  </Button>
                </div>
              </Card>
            </Section>
            </div>

            {/* == Notes / History == */}
            <div className={tab === 'notes' || tab === 'history' ? 'space-y-6' : 'hidden'}>
            <Section id="activity" title="Activity">
              <Card className="p-4">
                <ol className="space-y-3">
                  {log.map((a) => (
                    <li key={a.id} className="flex gap-2.5">
                      <Avatar name={userById[a.actorId]?.name ?? 'System'} size={22} />
                      <div className="min-w-0 flex-1">
                        <p className="text-base leading-snug text-secondary">{a.text}</p>
                        <p className="mt-0.5 text-sm text-muted">
                          {userById[a.actorId]?.name ?? 'System'} ·{' '}
                          {format(new Date(a.at), 'd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            </Section>
            </div>
          </div>
        </div>
      </div>

      <StageGate
        opportunity={opp}
        targetStage={gateTo}
        open={Boolean(gateTo)}
        onClose={() => {
          setGateTo(null)
          setShowNext(true)
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------------ */

function JobWhatsNext({
  job,
  opportunityId,
  contactName,
}: {
  job: Job | undefined
  opportunityId: string
  contactName?: string
}) {
  const next = jobWhatsNext(job, opportunityId, contactName)
  if (!next) return null

  return (
    <Card className="border-(--accent-attention) bg-attention-soft/40 p-4">
      <div className="flex items-start gap-3">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-attention-text" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-primary">What&apos;s next</p>
            {job && <Badge tone="brand">{JOB_STATUS_LABEL[job.status]}</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-secondary">{next.body}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {next.buttons.map((b) => (
              <Link key={b.label} to={b.to}>
                <Button size="sm" variant={b.primary ? 'primary' : 'secondary'}>
                  {b.icon}
                  {b.label}
                  <ArrowRight size={12} />
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

function jobWhatsNext(
  job: Job | undefined,
  opportunityId: string,
  contactName?: string,
): {
  body: string
  buttons: { label: string; to: string; primary?: boolean; icon?: ReactNode }[]
} | null {
  const jobTab = (hash?: string) =>
    `/opportunities/${opportunityId}?tab=job${hash ? `#${hash}` : ''}`

  if (!job) {
    return {
      body: 'Award this opportunity to create a job. Work then starts at Scheduling Required.',
      buttons: [
        { label: 'Jobs board', to: '/jobs', primary: true, icon: <HardHat size={12} /> },
      ],
    }
  }

  switch (normalizeJobStatus(job.status)) {
    case 'scheduling_required':
      return {
        body: 'Pick install dates and assign the crew on Schedule. Crew is set there, not only on this tab.',
        buttons: [
          { label: 'Open Schedule', to: '/schedule', primary: true, icon: <CalendarDays size={12} /> },
          { label: 'Jobs board', to: '/jobs', icon: <HardHat size={12} /> },
        ],
      }
    case 'scheduled':
      return {
        body: 'Job is on the calendar. Order materials next so the crew is not waiting on procurement.',
        buttons: [
          {
            label: 'Procurement',
            to: jobTab('job-procurement'),
            primary: true,
            icon: <Boxes size={12} />,
          },
          { label: 'Purchasing', to: '/purchasing', icon: <Boxes size={12} /> },
        ],
      }
    case 'procurement_required':
      return {
        body: 'Build and send the materials order for this job.',
        buttons: [
          {
            label: 'Build order',
            to: jobTab('job-procurement'),
            primary: true,
            icon: <Boxes size={12} />,
          },
          { label: 'Purchasing board', to: '/purchasing' },
        ],
      }
    case 'procurement_ordered':
      return {
        body: 'Materials are on order. Track fulfilment here, then complete prep so the job can move to Ready to start.',
        buttons: [
          {
            label: 'Track order',
            to: jobTab('job-procurement'),
            primary: true,
            icon: <Boxes size={12} />,
          },
          {
            label: 'Prep checklist',
            to: `/opportunities/${opportunityId}?tab=documents`,
            icon: <ClipboardCheck size={12} />,
          },
        ],
      }
    case 'ready_to_start':
      return {
        body: 'Crew and materials are ready. Open Field when install day arrives.',
        buttons: [
          {
            label: 'Field today',
            to: `/field/job/${opportunityId}`,
            primary: true,
            icon: <HardHat size={12} />,
          },
          {
            label: 'Prep checklist',
            to: `/opportunities/${opportunityId}?tab=documents`,
            icon: <ClipboardCheck size={12} />,
          },
        ],
      }
    case 'in_progress':
      return {
        body: 'Install is underway. Log progress in Field; raise change orders here if scope or price shifts.',
        buttons: [
          {
            label: 'Open in Field',
            to: `/field/job/${opportunityId}`,
            primary: true,
            icon: <HardHat size={12} />,
          },
          {
            label: 'Change orders',
            to: jobTab('changes'),
            icon: <AlertTriangle size={12} />,
          },
        ],
      }
    case 'on_hold':
      return {
        body: 'Job is on hold. Resolve the blocker, then resume from Field or the Jobs board.',
        buttons: [
          { label: 'Jobs board', to: '/jobs', primary: true, icon: <HardHat size={12} /> },
          { label: 'Open in Field', to: `/field/job/${opportunityId}` },
        ],
      }
    case 'completion_review':
      return {
        body: `Finish closeout checklist and send customer sign-off${contactName ? ` to ${contactName}` : ''}.`,
        buttons: [
          {
            label: 'Closeout checklist',
            to: jobTab('closeout'),
            primary: true,
            icon: <ClipboardCheck size={12} />,
          },
          {
            label: 'Sign-off link',
            to: `/signoff/${opportunityId}`,
            icon: <PenLine size={12} />,
          },
        ],
      }
    case 'completed':
      return {
        body: 'Work is complete and signed off. This is the end of the job workflow. Finance can now handle invoicing and collection separately.',
        buttons: [
          { label: 'Finance', to: '/finance', primary: true, icon: <Receipt size={12} /> },
          { label: 'Jobs board', to: '/jobs', icon: <HardHat size={12} /> },
        ],
      }
    default:
      return null
  }
}

function Section({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id: string
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-4">
      <SectionTitle actions={action}>{title}</SectionTitle>
      {subtitle && <p className="mb-3 -mt-1 text-sm text-muted">{subtitle}</p>}
      {children}
    </section>
  )
}

function ArtifactRow({ artifact, category }: { artifact: ReturnType<typeof Object> & any; category: string }) {
  const userById = useUserDirectory()
  const Icon = ARTIFACT_ICON[artifact.kind as ArtifactKind] ?? FileText
  return (
    <div className="flex items-start gap-2.5 border-b border-subtle px-4 py-2.5 last:border-0">
      <Icon size={14} className="mt-0.5 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-base text-primary">{artifact.name}</p>
          {artifact.internal && (
            <Badge tone="neutral" icon={<Lock size={9} />}>
              Internal
            </Badge>
          )}
        </div>
        {artifact.body && (
          <p className="mt-1 text-sm leading-relaxed text-secondary">{artifact.body}</p>
        )}
        <p className="mt-0.5 text-sm text-muted">
          Added at {stageLabel(artifact.stageAdded, category as never)} by{' '}
          {userById[artifact.addedById]?.name ?? 'the customer'}
          {artifact.meta && ` · ${artifact.meta}`}
        </p>
      </div>
    </div>
  )
}

/* ---- What we gathered at the visit / call (read-only summary) ----------- */

function GatheredAtVisit({ opportunityId }: { opportunityId: string }) {
  const opp = useStore((s) => s.opportunities.find((o) => o.id === opportunityId))!
  const visit = useStore((s) => s.siteVisits.find((v) => v.opportunityId === opportunityId))
  const artifacts = useArtifactsFor(opportunityId)
  const checklists = useStore((s) => s.checklists)
  const checklistTemplates = useStore((s) => s.checklistTemplates)
  const checks = useChecks(opportunityId, 'site_visit_completed')
  const form = useFormForCategory(opp.category)
  const userById = useUserDirectory()
  const v = visitVocab(opp.category)
  const allowsPhotos = opp.category !== 'residential'

  const visitTemplates = useMemo(
    () => visitChecklistTemplates(checklistTemplates),
    [checklistTemplates],
  )
  const checklistInstance = useMemo(
    () =>
      checklists.find(
        (c) => c.opportunityId === opportunityId && visitTemplates.some((t) => t.id === c.templateId),
      ),
    [checklists, opportunityId, visitTemplates],
  )
  const checklistTemplate = visitTemplates.find((t) => t.id === checklistInstance?.templateId)
  const checklistItems = resolveChecklistItems(checklistInstance, checklistTemplate)
  const checklistDone = checklistInstance?.done.length ?? 0

  if (!visit || !form) {
    return (
      <Card>
        <EmptyState
          title={`No ${v.singular} yet.`}
          action={
            <Link to={`/opportunities/${opportunityId}/visit`}>
              <Button size="sm" variant="primary">
                <Ruler size={12} />
                Open form
              </Button>
            </Link>
          }
        />
      </Card>
    )
  }

  const answered = Object.entries(visit.values).filter(([, val]) => val !== '' && val !== undefined)
  const requests = visit.requests ?? []
  const customQuestions = visit.customQuestions ?? []
  const filledCustomQuestions = customQuestions.filter((q) => q.question.trim())
  const photos = artifacts.filter((a) => a.kind === 'photo' || a.kind === 'plan')
  const completeRequests = requests.filter(
    (r) =>
      r.serviceType.trim() &&
      r.concernOrOutcome.trim() &&
      r.areaOrEquipment.trim() &&
      r.unit.trim() &&
      r.quantity > 0,
  )
  const checklistTotal = checklistItems.length
  const checksOk = checks.filter((c) => c.ok).length

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div className="border-b border-subtle bg-surface-inset px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ClipboardList size={15} className="shrink-0 text-brand" />
                <p className="font-display text-lg text-primary">What we gathered</p>
              </div>
              <p className="mt-0.5 text-sm text-muted">
                {visit.completedAt
                  ? `Submitted by ${userById[visit.completedById ?? '']?.name ?? 'rep'} on ${format(new Date(visit.completedAt), 'd MMM yyyy')}`
                  : `In progress — edit on the guided ${v.singular} form.`}
              </p>
            </div>
            <Badge
              tone={visit.completedAt ? 'success' : 'warning'}
              icon={visit.completedAt ? <CheckCircle2 size={12} /> : undefined}
            >
              {visit.completedAt
                ? 'Submitted'
                : `${checksOk}/${checks.length} checks ready`}
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div
              className={cn(
                'rounded-md border px-2.5 py-2',
                checklistDone === checklistTotal && checklistTotal > 0
                  ? 'border-(--status-success)/30 bg-success-soft/35'
                  : 'border-subtle bg-surface-raised',
              )}
            >
              <p className="text-2xs font-semibold tracking-wider text-muted uppercase">Checklist</p>
              <p className="mt-0.5 text-sm font-semibold text-primary">
                {checklistDone}/{checklistTotal || '—'}
              </p>
            </div>
            <div
              className={cn(
                'rounded-md border px-2.5 py-2',
                completeRequests.length > 0
                  ? 'border-(--status-success)/30 bg-success-soft/35'
                  : 'border-subtle bg-surface-raised',
              )}
            >
              <p className="text-2xs font-semibold tracking-wider text-muted uppercase">
                Scope requests
              </p>
              <p className="mt-0.5 text-sm font-semibold text-primary">
                {completeRequests.length} complete
              </p>
            </div>
            <div
              className={cn(
                'rounded-md border px-2.5 py-2',
                answered.length > 0
                  ? 'border-(--status-success)/30 bg-success-soft/35'
                  : 'border-subtle bg-surface-raised',
              )}
            >
              <p className="text-2xs font-semibold tracking-wider text-muted uppercase">Answers</p>
              <p className="mt-0.5 text-sm font-semibold text-primary">
                {answered.length + filledCustomQuestions.length} captured
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title={checklistTemplate?.name ?? 'Checklist'}
          subtitle={`${checklistDone} of ${checklistTotal} items complete`}
          icon={<ClipboardCheck size={14} />}
        />
        {checklistItems.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">
            No checklist assigned yet. Open the guided form to choose one.
          </p>
        ) : (
          <ul className="divide-y divide-(--border-subtle)">
            {checklistItems.map((item) => {
              const done = checklistInstance?.done.includes(item.id) ?? false
              return (
                <li key={item.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <CheckCircle2
                    size={15}
                    className={cn(
                      'mt-0.5 shrink-0',
                      done ? 'text-success-text' : 'text-muted/35',
                    )}
                  />
                  <div className="min-w-0">
                    <p className={cn('text-sm', done ? 'text-primary' : 'text-muted')}>
                      {item.label}
                    </p>
                    {item.helper && <p className="mt-0.5 text-2xs text-muted">{item.helper}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Scope requests"
          subtitle={`${completeRequests.length} of ${requests.length} ready for estimate`}
          icon={<Ruler size={14} />}
        />
        {requests.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">No scope requests yet.</p>
        ) : (
          <div className="space-y-2 p-3">
            {requests.map((req, i) => {
              const complete =
                req.serviceType.trim() &&
                req.concernOrOutcome.trim() &&
                req.areaOrEquipment.trim() &&
                req.unit.trim() &&
                req.quantity > 0
              return (
                <div
                  key={req.id}
                  className={cn(
                    'rounded-md border px-3 py-2.5',
                    complete
                      ? 'border-(--status-success)/35 bg-success-soft/30'
                      : 'border-strong bg-surface-inset',
                  )}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-sm text-2xs font-semibold',
                        complete
                          ? 'bg-success-soft text-success-text'
                          : 'bg-action text-action-fg',
                      )}
                    >
                      {i + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
                      {req.serviceType.trim() || 'Untitled service'}
                    </p>
                    <Badge tone={complete ? 'success' : 'warning'}>
                      {complete ? 'Complete' : 'Needs detail'}
                    </Badge>
                  </div>
                  <dl className="grid gap-2 sm:grid-cols-3">
                    <div className="min-w-0">
                      <dt className="text-2xs font-semibold tracking-wider text-muted uppercase">
                        Area / surface
                      </dt>
                      <dd className="mt-0.5 text-sm text-primary">{req.areaOrEquipment || '—'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-2xs font-semibold tracking-wider text-muted uppercase">
                        Quantity
                      </dt>
                      <dd className="mt-0.5 text-sm text-primary">
                        {req.quantity > 0 ? `${req.quantity} ${req.unit}` : 'Not set'}
                      </dd>
                    </div>
                    <div className="min-w-0 sm:col-span-3">
                      <dt className="text-2xs font-semibold tracking-wider text-muted uppercase">
                        Concern / outcome
                      </dt>
                      <dd className="mt-0.5 text-sm leading-snug whitespace-normal text-primary">
                        {req.concernOrOutcome || '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Form answers"
          subtitle="Grouped by section from the guided form"
          icon={<ClipboardList size={14} />}
        />
        {answered.length === 0 && filledCustomQuestions.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">No answers yet.</p>
        ) : (
          <div className="space-y-3 p-3">
            {form.sections.map((sec) => {
              const fields = sec.fields.filter((f) => answered.some(([k]) => k === f.id))
              const sectionQs = filledCustomQuestions.filter((q) => q.sectionId === sec.id)
              if (fields.length === 0 && sectionQs.length === 0) return null
              return (
                <div key={sec.id}>
                  <p className="mb-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
                    {sec.title}
                  </p>
                  <dl className="grid gap-2 rounded-md border border-subtle bg-surface-inset p-2.5 sm:grid-cols-2">
                    {fields.map((f) => {
                      const raw = visit.values[f.id]
                      const value = typeof raw === 'boolean' ? (raw ? 'Yes' : 'No') : String(raw)
                      return (
                        <KeyValue
                          key={f.id}
                          label={f.label}
                          className={f.type === 'longtext' ? 'sm:col-span-2' : undefined}
                        >
                          <span className={cn(f.type === 'longtext' && 'whitespace-normal')}>
                            {value}
                            {f.unit && ` ${f.unit}`}
                          </span>
                        </KeyValue>
                      )
                    })}
                    {sectionQs.map((qa) => (
                      <KeyValue key={qa.id} label={qa.question} className="sm:col-span-2">
                        <span className="whitespace-normal">{qa.answer || '—'}</span>
                      </KeyValue>
                    ))}
                  </dl>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {allowsPhotos ? (
        <Card className="overflow-hidden">
          <CardHeader
            title="Photos & documents"
            subtitle={`${photos.length} attached from the ${v.singular}`}
            icon={<Camera size={14} />}
          />
          {photos.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted">No photos or plans yet.</p>
          ) : (
            <ul className="divide-y divide-(--border-subtle)">
              {photos.map((a) => (
                <li key={a.id} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-primary">
                  {a.kind === 'plan' ? (
                    <FileText size={14} className="shrink-0 text-muted" />
                  ) : (
                    <Camera size={14} className="shrink-0 text-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
                  <Badge tone="neutral">{a.kind === 'plan' ? 'Plan' : 'Photo'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <p className="rounded-md border border-subtle bg-surface-inset px-3 py-2.5 text-sm text-muted">
          Sales calls do not collect photos. Checklist, scope, and answers are the full record.
        </p>
      )}
    </div>
  )
}

/* ---- Checklist ---------------------------------------------------------- */

function ChecklistCard({
  opportunityId,
  templateId,
  subtitle,
}: {
  opportunityId: string
  templateId: string
  subtitle: string
}) {
  const templates = useStore((s) => s.checklistTemplates)
  const tpl = templates.find((t) => t.id === templateId)
  const instance = useStore((s) =>
    s.checklists.find((c) => c.opportunityId === opportunityId && c.templateId === templateId),
  )
  const toggle = useStore((s) => s.toggleChecklistItem)
  if (!tpl) return null

  const items = resolveChecklistItems(instance, tpl)
  const done = instance?.done.length ?? 0

  return (
    <Card>
      <CardHeader
        title={tpl.name}
        subtitle={subtitle}
        icon={<ClipboardCheck size={14} />}
        actions={
          <>
            {tpl.managedByCompany && <Badge tone="info">Company standard</Badge>}
            <Badge tone={done === items.length && items.length > 0 ? 'success' : 'neutral'}>
              {done}/{items.length}
            </Badge>
          </>
        }
      />
      <div className="space-y-2 p-4">
        {items.map((item) => (
          <Checkbox
            key={item.id}
            checked={instance?.done.includes(item.id) ?? false}
            onChange={() => toggle(opportunityId, tpl.id, item.id)}
            label={item.label}
            description={item.helper}
          />
        ))}
      </div>
    </Card>
  )
}

/* ---- Change orders ------------------------------------------------------ */

function ChangeOrders({ opportunityId }: { opportunityId: string }) {
  const orders = useChangeOrdersFor(opportunityId)
  const add = useStore((s) => s.addChangeOrder)
  const setStatus = useStore((s) => s.setChangeOrderStatus)
  const userById = useUserDirectory()
  const viewerId = useStore((s) => s.viewerId)
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [qty, setQty] = useState(0)
  const [unit, setUnit] = useState('unit')
  const [amount, setAmount] = useState(0)
  const [days, setDays] = useState(0)
  const [note, setNote] = useState('')

  return (
    <>
      <Card className="mb-3">
        <CardHeader
          title="Change orders"
          subtitle="Approved changes update the final invoice automatically."
          icon={<Plus size={14} />}
          actions={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus size={12} />
              Raise change order
            </Button>
          }
        />
        {orders.length === 0 ? (
          <p className="px-4 py-5 text-center text-base text-muted">No change orders raised.</p>
        ) : (
          orders.map((c) => (
            <div key={c.id} className="border-b border-subtle px-4 py-3 last:border-0">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base text-primary">{c.description}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {c.qty} {c.unit} · raised by {userById[c.raisedById]?.name} on{' '}
                    {format(new Date(c.raisedAt), 'd MMM')}
                    {c.scheduleImpactDays > 0 && ` · +${c.scheduleImpactDays} day to the schedule`}
                  </p>
                  {c.internalNote && (
                    <p className="mt-1 text-sm text-secondary">{c.internalNote}</p>
                  )}
                </div>
                <span className="shrink-0 font-mono text-base text-primary tabular">
                  {money(c.amount)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {c.status === 'pending' ? (
                  <>
                    <Badge tone="warning">Awaiting customer approval</Badge>
                    <Button size="sm" onClick={() => setStatus(c.id, 'customer_approved')}>
                      <CheckCircle2 size={11} />
                      Mark approved
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(c.id, 'rejected')}>
                      <XCircle size={11} />
                      Reject
                    </Button>
                  </>
                ) : c.status === 'customer_approved' ? (
                  <Badge tone="success" icon={<CheckCircle2 size={9} />}>
                    Approved — will be added to the final invoice
                  </Badge>
                ) : (
                  <Badge tone="danger">Rejected</Badge>
                )}
              </div>
            </div>
          ))
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon={<Plus size={17} />}
        title="Raise a change order"
        subtitle="Additional work requested by the customer, or an unexpected condition found on site."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!description || amount <= 0}
              onClick={() => {
                add({
                  opportunityId,
                  description,
                  qty,
                  unit,
                  amount,
                  raisedById: viewerId,
                  raisedAt: new Date().toISOString(),
                  status: 'pending',
                  scheduleImpactDays: days,
                  internalNote: note,
                  photoIds: [],
                })
                setDescription('')
                setAmount(0)
                setQty(0)
                setNote('')
                setOpen(false)
              }}
            >
              Raise change order
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow label="Description" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. additional spall repair at the filler line beyond the contract allowance"
            />
          </FieldRow>
          <FieldRow label="Additional quantity">
            <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </FieldRow>
          <FieldRow label="Unit">
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="unit">unit</option>
              <option value="lin ft">lin ft</option>
              <option value="ea">ea</option>
            </Select>
          </FieldRow>
          <FieldRow label="Additional price">
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </FieldRow>
          <FieldRow label="Schedule impact (days)">
            <Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </FieldRow>
          <FieldRow label="Internal note" className="sm:col-span-2">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </FieldRow>
        </div>
      </Modal>
    </>
  )
}

/* ---- Issues ------------------------------------------------------------- */

function Issues({ opportunityId }: { opportunityId: string }) {
  const issues = useIssuesFor(opportunityId)
  const resolve = useStore((s) => s.resolveIssue)
  const userById = useUserDirectory()

  if (issues.length === 0) return null

  return (
    <Card id="issues">
      <CardHeader title="Issues reported from site" icon={<AlertTriangle size={14} />} />
      {issues.map((i) => (
        <div key={i.id} className="flex items-start gap-3 border-b border-subtle px-4 py-3 last:border-0">
          <AlertTriangle
            size={15}
            className={cn(
              'mt-0.5 shrink-0',
              i.severity === 'high'
                ? 'text-danger-text'
                : i.severity === 'medium'
                  ? 'text-warning-text'
                  : 'text-muted',
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-primary">{i.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-secondary">{i.detail}</p>
            <p className="mt-0.5 text-sm text-muted">
              {userById[i.raisedById]?.name} · {format(new Date(i.raisedAt), 'd MMM yyyy')}
            </p>
          </div>
          {i.status === 'open' ? (
            <Button size="sm" onClick={() => resolve(i.id)}>
              Resolve
            </Button>
          ) : (
            <Badge tone="success" icon={<CheckCircle2 size={9} />}>
              Resolved
            </Badge>
          )}
        </div>
      ))}
    </Card>
  )
}
