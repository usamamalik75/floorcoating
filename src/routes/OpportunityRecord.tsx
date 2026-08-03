import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Boxes,
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
  Ruler,
  StickyNote,
  User as UserIcon,
  XCircle,
} from 'lucide-react'
import type { ArtifactKind, JobStatus, StageId } from '@/domain/types'
import { STAGE_BY_ID, jobStatusIndex, stageLabel } from '@/domain/stages'
import { CHECKLIST_BY_ID } from '@/data/checklists'
import { formForCategory } from '@/data/siteVisitForms'
import { ACCOUNT_BY_ID, LOCATION_BY_ID, USER_BY_ID } from '@/data/seed'
import { PRICE_BOOK_BY_ID } from '@/data/priceBook'
import { estimateTotal, money, optionTotal, useStore } from '@/store/useStore'
import { useChangeOrdersFor, useChecks, useIssuesFor, useMessageThreads, usePaymentRequests } from '@/store/selectors'
import { StageGate } from '@/components/domain/StageGate'
import { StageStepper } from '@/components/domain/StageStepper'
import { NextActionPanel } from '@/components/domain/NextActionPanel'
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
  StageChip,
  Textarea,
} from '@/components/ui'
import { cn } from '@/lib/cn'

const TABS = [
  { id: 'overview', label: 'Overview', icon: ClipboardList },
  { id: 'visits', label: 'Site Visits', icon: MapPin },
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

  const [gateTo, setGateTo] = useState<StageId | null>(null)
  const [showNext, setShowNext] = useState(true)
  const [messageChannel, setMessageChannel] = useState<'email' | 'sms'>('email')
  const [messageSubject, setMessageSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const tab = params.get('tab') ?? 'overview'

  const opp = s.opportunities.find((o) => o.id === id)

  const est = useMemo(() => s.estimates.find((e) => e.opportunityId === id), [s.estimates, id])
  const job = s.jobs.find((j) => j.opportunityId === id)
  const materialOrder = s.materialOrders.find((m) => m.opportunityId === id)
  const invoices = s.invoices.filter((i) => i.opportunityId === id)
  const reminder = s.reminders.find((r) => r.opportunityId === id && !r.done)
  const threads = useMessageThreads(id)
  const paymentRequests = usePaymentRequests(id)
  const mine = s.artifacts.filter((a) => a.opportunityId === id)
  const visit = s.siteVisits.find((v) => v.opportunityId === id)
  const log = s.activity.filter((a) => a.opportunityId === id).slice().reverse()

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

  const setTab = (id: string) => setParams({ tab: id })
  const visibleTabs = TABS.filter((t) => !('awardedOnly' in t && t.awardedOnly) || opp.stage === 'awarded')

  const account = ACCOUNT_BY_ID[opp.accountId]
  const location = LOCATION_BY_ID[opp.locationId]
  const def = STAGE_BY_ID[opp.stage]
  const thread = threads[0]
  const jobReached = (status: JobStatus) =>
    Boolean(job && jobStatusIndex(job.status) >= jobStatusIndex(status))

  return (
    <div className="flex h-full flex-col">
      {/* ---- Header ---- */}
      <header className="shrink-0 border-b border-subtle bg-surface-raised px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/sales" className="text-muted hover:text-primary">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg leading-tight text-primary">{opp.name}</h1>
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <span className="font-mono">{opp.code}</span>
              <span>·</span>
              <Link to="/customers" className="hover:text-primary hover:underline">
                {account?.name}
              </Link>
              <span>·</span>
              <span>{location?.name}</span>
              <span>·</span>
              <Badge
                tone={
                  opp.temperature === 'hot' ? 'danger' : opp.temperature === 'warm' ? 'attention' : 'neutral'
                }
              >
                {TEMPERATURE_LABEL[opp.temperature]}
              </Badge>
            </p>
          </div>

          <div className="flex-1" />

          <StageChip group={def.group} label={stageLabel(opp.stage, opp.category)} />
          <span className="font-mono text-lg font-semibold text-primary tabular">
            {money(est ? estimateTotal(est) : opp.value)}
          </span>
        </div>

        <div className="mt-2.5">
          <StageStepper opportunity={opp} onPick={setGateTo} />
        </div>

        <div className="mt-2.5 flex gap-0.5 overflow-x-auto scrollbar-thin">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium',
                tab === t.id ? 'bg-action-soft text-brand' : 'text-muted hover:text-primary',
              )}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-4xl space-y-6 p-5">
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
                  <KeyValue label="Category">
                    <span className="capitalize">{opp.category}</span>
                  </KeyValue>
                  <KeyValue label="Estimated quantity">{opp.estimatedQuantity.toLocaleString()} units</KeyValue>
                  <KeyValue label="Secondary quantity">{opp.secondaryQuantity > 0 ? `${opp.secondaryQuantity} units` : '—'}</KeyValue>
                  <KeyValue label="Source">{opp.source}</KeyValue>
                  <KeyValue label="Sales rep">{USER_BY_ID[opp.ownerId]?.name ?? 'Unassigned'}</KeyValue>
                  <KeyValue label="Estimator">
                    {opp.estimatorId ? USER_BY_ID[opp.estimatorId]?.name : '—'}
                  </KeyValue>
                  <KeyValue label="Project manager">
                    {opp.pmId ? USER_BY_ID[opp.pmId]?.name : '—'}
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
            </div>

            {/* == Site Visits tab == */}
            <div className={tab === 'visits' ? 'space-y-6' : 'hidden'}>
            <Section
              id="sitevisit"
              title="Site visit"
              action={
                <Link to={`/opportunities/${opp.id}/visit`}>
                  <Button size="sm">
                    <Ruler size={12} />
                    {visit?.completedAt ? 'Review form' : 'Open guided form'}
                  </Button>
                </Link>
              }
            >
              <SiteVisitSummary opportunityId={opp.id} />
            </Section>
            </div>

            {/* == Estimates tab == */}
            <div className={tab === 'estimates' ? 'space-y-6' : 'hidden'}>
            <Section
              id="estimate"
              title="Estimate"
              action={
                <Link to={`/estimate/${opp.id}`}>
                  <Button size="sm">
                    <FileText size={12} />
                    {est ? 'Open estimate' : 'Start estimate'}
                  </Button>
                </Link>
              }
            >
              {!est ? (
                <Card>
                  <EmptyState
                    title="No estimate yet"
                    description="The estimator works from the site visit data above — nothing gets re-keyed."
                  />
                </Card>
              ) : (
                <Card>
                  <CardHeader
                    title={`${est.options.length} option${est.options.length === 1 ? '' : 's'}`}
                    subtitle={
                      est.approvedById
                        ? `Approved by ${USER_BY_ID[est.approvedById]?.name}`
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
              {!est || est.status === 'draft' ? (
                <Card>
                  <EmptyState title="No proposal sent" description="The estimate must be approved first." />
                </Card>
              ) : (
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <KeyValue label="Sent">
                      {est.sentAt ? format(new Date(est.sentAt), 'd MMM yyyy') : '—'}
                    </KeyValue>
                    <KeyValue label="Signed">
                      {est.signedAt ? format(new Date(est.signedAt), 'd MMM yyyy') : 'Awaiting'}
                    </KeyValue>
                    <KeyValue label="Signed by">{est.signedBy ?? '—'}</KeyValue>
                    <KeyValue label="Deposit">{est.depositPct}%</KeyValue>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-subtle pt-3">
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
                  </div>
                </Card>
              )}
            </Section>
            </div>

            {/* == Documents tab == */}
            <div className={tab === 'documents' ? 'space-y-6' : 'hidden'}>
            <Section
              id="material"
              title="Purchasing"
              action={
                <Link to={`/opportunities/${opp.id}/purchasing`}>
                  <Button size="sm">
                    <Boxes size={12} />
                    {materialOrder ? 'Open order' : 'Prepare order'}
                  </Button>
                </Link>
              }
            >
              {!materialOrder ? (
                <Card>
                  <EmptyState
                    title="No purchase order yet"
                    description="Requirements are derived from the sold scope and configured resource rules."
                  />
                </Card>
              ) : (
                <Card>
                  <CardHeader
                    title={materialOrder.purchaseOrderId ?? 'Draft order'}
                    subtitle={`Needed by ${format(new Date(materialOrder.neededBy), 'd MMM yyyy')}`}
                    icon={<Boxes size={14} />}
                    actions={
                      <Badge tone={materialOrder.status === 'delivered' ? 'success' : 'attention'}>
                        {materialOrder.status}
                      </Badge>
                    }
                  />
                  <div className="divide-y divide-(--border-subtle)">
                    {materialOrder.lines.map((l) => (
                      <div key={l.id} className="flex items-center gap-3 px-4 py-2">
                        <span
                          className="h-5 w-5 shrink-0 rounded-xs border border-subtle"
                          style={{ background: PRICE_BOOK_BY_ID[l.priceBookId]?.swatch }}
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
            <Section id="job" title="Job and crew">
              {!job ? (
                <Card>
                  <EmptyState title="Not scheduled" description="Awarded work appears on the schedule board." />
                </Card>
              ) : (
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <KeyValue label="Start">{format(new Date(job.start), 'd MMM')}</KeyValue>
                    <KeyValue label="Finish">{format(new Date(job.end), 'd MMM')}</KeyValue>
                    <KeyValue label="Project manager">
                      {job.pmId ? USER_BY_ID[job.pmId]?.name : '—'}
                    </KeyValue>
                    <KeyValue label="Crew leader">
                      {job.crewLeaderId ? USER_BY_ID[job.crewLeaderId]?.name : '—'}
                    </KeyValue>
                  </div>

                  {job.crewIds.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 border-t border-subtle pt-3">
                      <span className="text-sm text-muted">Crew</span>
                      {job.crewIds.map((cid) => (
                        <span key={cid} className="flex items-center gap-1.5">
                          <Avatar name={USER_BY_ID[cid]?.name ?? ''} size={20} />
                          <span className="text-sm text-secondary">{USER_BY_ID[cid]?.name}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 border-t border-subtle pt-3">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-muted">Progress</span>
                      <span className="font-mono text-primary tabular">{job.progress}%</span>
                    </div>
                    <Meter value={job.progress} max={100} tone={job.progress === 100 ? 'success' : 'action'} />
                  </div>

                  {job.dailyLogs.length > 0 && (
                    <div className="mt-3 border-t border-subtle pt-3">
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
                            <span className="text-muted"> — {USER_BY_ID[d.byId]?.name}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </Section>

            <Section id="changes" title="Change orders and issues">
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
                      <Avatar name={USER_BY_ID[a.actorId]?.name ?? 'System'} size={22} />
                      <div className="min-w-0 flex-1">
                        <p className="text-base leading-snug text-secondary">{a.text}</p>
                        <p className="mt-0.5 text-sm text-muted">
                          {USER_BY_ID[a.actorId]?.name ?? 'System'} ·{' '}
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

function Section({
  id,
  title,
  action,
  children,
}: {
  id: string
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-4">
      <SectionTitle actions={action}>{title}</SectionTitle>
      {children}
    </section>
  )
}

function ArtifactRow({ artifact, category }: { artifact: ReturnType<typeof Object> & any; category: string }) {
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
          {USER_BY_ID[artifact.addedById]?.name ?? 'the customer'}
          {artifact.meta && ` · ${artifact.meta}`}
        </p>
      </div>
    </div>
  )
}

/* ---- Site visit summary ------------------------------------------------- */

function SiteVisitSummary({ opportunityId }: { opportunityId: string }) {
  const opp = useStore((s) => s.opportunities.find((o) => o.id === opportunityId))!
  const visit = useStore((s) => s.siteVisits.find((v) => v.opportunityId === opportunityId))
  const checks = useChecks(opportunityId, 'site_visit_completed')
  const form = formForCategory(opp.category)

  if (!visit || !form) {
    return (
      <Card>
        <EmptyState
          title="Site visit not started"
          description="The guided form is generated automatically when the visit is scheduled."
        />
      </Card>
    )
  }

  const answered = Object.entries(visit.values).filter(([, v]) => v !== '' && v !== undefined)

  return (
    <Card>
      <CardHeader
        title={form.name}
        subtitle={
          visit.completedAt
            ? `Completed on site by ${USER_BY_ID[visit.completedById ?? '']?.name} on ${format(new Date(visit.completedAt), 'd MMM yyyy')}`
            : 'In progress'
        }
        icon={<ClipboardList size={14} />}
        actions={
          <Badge tone={visit.completedAt ? 'success' : 'warning'}>
            {checks.filter((c) => c.ok).length}/{checks.length} checks
          </Badge>
        }
      />
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 p-4 sm:grid-cols-2">
        {form.sections.flatMap((sec) =>
          sec.fields
            .filter((f) => answered.some(([k]) => k === f.id))
            .map((f) => {
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
            }),
        )}
      </dl>
    </Card>
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
  const tpl = CHECKLIST_BY_ID[templateId]
  const instance = useStore((s) =>
    s.checklists.find((c) => c.opportunityId === opportunityId && c.templateId === templateId),
  )
  const toggle = useStore((s) => s.toggleChecklistItem)
  if (!tpl) return null

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
            <Badge tone={done === tpl.items.length ? 'success' : 'neutral'}>
              {done}/{tpl.items.length}
            </Badge>
          </>
        }
      />
      <div className="space-y-2 p-4">
        {tpl.items.map((item) => (
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
                    {c.qty} {c.unit} · raised by {USER_BY_ID[c.raisedById]?.name} on{' '}
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
              {USER_BY_ID[i.raisedById]?.name} · {format(new Date(i.raisedAt), 'd MMM yyyy')}
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
