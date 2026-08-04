import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Map as MapIcon,
  MapPin,
  Navigation,
  Package,
  Phone,
  Plus,
  Ruler,
  ShieldAlert,
  StickyNote,
  WifiOff,
} from 'lucide-react'
import { CHECKLIST_BY_ID } from '@/data/checklists'
import { ACCOUNT_BY_ID, TODAY } from '@/data/seed'
import { PRICE_BOOK_BY_ID } from '@/data/priceBook'
import { STAGE_BY_ID, stageLabel } from '@/domain/stages'
import { money, useStore } from '@/store/useStore'
import { assignedTo } from '@/domain/jobs'
import { useArtifactsFor, useIssuesFor, useViewer } from '@/store/selectors'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FieldRow,
  Input,
  Meter,
  Modal,
  Select,
  StageChip,
  Textarea,
} from '@/components/ui'
import { cn } from '@/lib/cn'

const MATERIAL_LABEL: Record<string, string> = {
  draft: 'Order drafted',
  submitted: 'Ordered',
  approved: 'Approved',
  shipped: 'In transit',
  delivered: 'On site',
}

/**
 * The field shell. Not a second application — the same components rendered
 * inside `data-density="field"`, which swaps rows to 48px and controls to a
 * 44px touch target. A tech wearing gloves on a job site and an estimator at
 * a desk are using one codebase.
 */
function FieldFrame({
  children,
  title,
  back,
}: {
  children: ReactNode
  title: string
  back?: string
}) {
  return (
    <div data-density="field" className="flex h-full flex-col bg-surface-base overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-subtle/50 bg-surface-chrome px-5 py-4 text-white">
        {back && (
          <Link to={back} className="text-white/70 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
        )}
        <h1 className="font-display text-xl">{title}</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</div>
    </div>
  )
}

export function FieldToday() {
  const viewerId = useStore((s) => s.viewerId)
  const jobs = useStore((s) => s.jobs)
  const opportunities = useStore((s) => s.opportunities)
  const procurementOrders = useStore((s) => s.procurementOrders)
  const viewer = useViewer()

  const isField = viewer?.role === 'tech' || viewer?.role === 'crew_leader'
  const myJobs = jobs.filter((j) => (isField ? assignedTo(j, viewerId) : true))

  // A rep's day is appointments; a crew's day is jobs. Both land here.
  const visits = opportunities.filter(
    (o) =>
      ['site_visit_scheduled', 'site_visit_completed'].includes(o.stage) &&
      (viewer?.role === 'sales' ? o.ownerId === viewerId : true),
  )

  return (
    <FieldFrame title="Field execution">
      <div className="space-y-6 p-5">
        <p className="text-sm font-medium text-muted">
          {format(TODAY, 'EEEE, MMMM d')} · {viewer?.name}
        </p>

        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">
            Site visits and sales calls
          </h2>
          {visits.length === 0 ? (
            <EmptyState title="None scheduled" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {visits.map((o) => (
                <Link key={o.id} to={`/field/visit/${o.id}`}>
                  <Card className="p-4 transition-colors hover:border-strong hover:shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-semibold text-primary">{o.name}</p>
                      <StageChip
                        group={STAGE_BY_ID[o.stage].group}
                        label={stageLabel(o.stage, o.category)}
                        dot={false}
                      />
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                      <MapPin size={13} /> {o.address}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <Ruler size={13} /> {o.estimatedQuantity.toLocaleString()} units · {money(o.value, true)}
                    </p>
                    {o.visitAt && (
                      <p className="mt-2 text-base font-semibold text-primary">
                        {format(new Date(o.visitAt), 'HH:mm')}
                      </p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Jobs</h2>
          {myJobs.length === 0 ? (
            <EmptyState title="No jobs assigned" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myJobs.map((j) => {
                const opp = opportunities.find((o) => o.id === j.opportunityId)
                if (!opp) return null
                const mo = procurementOrders.find((m) => m.opportunityId === opp.id)
                return (
                  <Link key={j.id} to={`/field/job/${opp.id}`}>
                    <Card className="p-4 transition-colors hover:border-strong hover:shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base font-semibold text-primary">{opp.name}</p>
                        <Badge
                          tone={
                            mo?.status === 'delivered'
                              ? 'success'
                              : mo
                                ? 'attention'
                                : 'warning'
                          }
                          icon={<Package size={10} />}
                        >
                          {mo ? MATERIAL_LABEL[mo.status] : 'Not ordered'}
                        </Badge>
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                        <MapPin size={13} /> {opp.address}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {format(new Date(j.start), 'MMM d')} – {format(new Date(j.end), 'MMM d')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {j.dispatchState && (
                          <Badge tone={j.dispatchState === 'ready' ? 'success' : j.dispatchState === 'at_risk' ? 'warning' : 'neutral'}>
                            {j.dispatchState.replace('_', ' ')}
                          </Badge>
                        )}
                        {j.syncStatus === 'pending' && <Badge tone="warning">Pending sync</Badge>}
                      </div>
                      <Meter value={j.progress} tone="attention" className="mt-3" />
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </FieldFrame>
  )
}

export function FieldVisit() {
  const { id } = useParams<{ id: string }>()
  const opp = useStore((s) => s.opportunities.find((o) => o.id === id))
  const visit = useStore((s) => s.siteVisits.find((v) => v.opportunityId === id))
  const artifacts = useArtifactsFor(id ?? '')
  const addArtifact = useStore((s) => s.addArtifact)
  const viewerId = useStore((s) => s.viewerId)

  if (!opp)
    return (
      <FieldFrame title="Not found" back="/field">
        {null}
      </FieldFrame>
    )

  const account = ACCOUNT_BY_ID[opp.accountId]
  const photos = artifacts.filter((a) => a.kind === 'photo')

  return (
    <FieldFrame title={opp.category === 'residential' ? 'Sales Call' : 'Site Visit'} back="/field">
      <div className="space-y-3 p-3">
        <Card className="p-3">
          <p className="text-md font-medium text-primary">{opp.name}</p>
          <p className="mt-0.5 text-base text-muted">{account?.name}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-base text-secondary">
            <MapPin size={13} /> {opp.address}
          </p>
          <Button className="mt-2 w-full" size="lg">
            <Navigation size={15} />
            Navigate
          </Button>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-md font-semibold text-primary">
              <ClipboardList size={15} /> Checklist & form
            </span>
            <Badge tone={visit?.completedAt ? 'success' : 'warning'}>
              {visit?.completedAt ? 'Submitted' : 'Not submitted'}
            </Badge>
          </div>
          <p className="mt-1.5 text-base text-muted">
            {opp.category === 'residential'
              ? 'Checklist, scope requests, and answers — sales calls do not collect photos.'
              : 'Checklist, scope requests, answers, and photos — all logged under what you gathered.'}
          </p>
          <Link to={`/opportunities/${opp.id}/visit`}>
            <Button variant="primary" size="lg" className="mt-2 w-full">
              {visit?.completedAt ? 'Review answers' : 'Open checklist & form'}
            </Button>
          </Link>
        </Card>

        <Button
          variant="attention"
          size="lg"
          className="w-full"
          onClick={() =>
            addArtifact({
              opportunityId: opp.id,
              kind: 'photo',
              name: `Site photo ${photos.length + 1}`,
              stageAdded: opp.stage,
              addedById: viewerId,
              addedAt: new Date().toISOString(),
              meta: 'Captured in the field · auto-matched by GPS',
              photoPhase: 'before',
            })
          }
        >
          <Camera size={16} />
          Capture photo
        </Button>

        {photos.length > 0 && (
          <PhotoGrid photos={photos} />
        )}

        {visit?.completedAt && (
          <div className="flex items-center gap-2 rounded-md border border-(--status-success) bg-success-soft px-3 py-3">
            <CheckCircle2 size={18} className="shrink-0 text-success-text" />
            <p className="text-base text-primary">
              Everything you captured is on the record. The estimator has it already.
            </p>
          </div>
        )}
      </div>
    </FieldFrame>
  )
}

export function FieldJob() {
  const { id } = useParams<{ id: string }>()
  const opp = useStore((s) => s.opportunities.find((o) => o.id === id))
  const job = useStore((s) => s.jobs.find((j) => j.opportunityId === id))
  const est = useStore((s) => s.estimates.find((e) => e.opportunityId === id))
  const artifacts = useArtifactsFor(id ?? '')
  const issues = useIssuesFor(id ?? '')
  const checklists = useStore((s) => s.checklists)
  const toggle = useStore((s) => s.toggleChecklistItem)
  const addArtifact = useStore((s) => s.addArtifact)
  const updateJob = useStore((s) => s.updateJob)
  const addDailyLog = useStore((s) => s.addDailyLog)
  const viewerId = useStore((s) => s.viewerId)

  const [reporting, setReporting] = useState<'issue' | 'change' | null>(null)
  const [logNote, setLogNote] = useState('')

  if (!opp || !job)
    return (
      <FieldFrame title="Not found" back="/field">
        {null}
      </FieldFrame>
    )

  const template = CHECKLIST_BY_ID['cl_install']
  const instance = checklists.find((c) => c.opportunityId === opp.id && c.templateId === 'cl_install')
  const notes = artifacts.filter((a) => a.kind === 'note')
  const plans = artifacts.filter((a) => a.kind === 'plan' || a.kind === 'map')
  const photos = artifacts.filter((a) => a.kind === 'photo')
  const account = ACCOUNT_BY_ID[opp.accountId]
  const procurementOrder = useStore((s) => s.procurementOrders.find((m) => m.opportunityId === id))

  const scope = est?.options
    .filter((o) => o.kind === 'scope' || o.selectedByCustomer || o.recommended)
    .flatMap((o) => o.lineItems)

  const catalogueItems = [...new Set(scope?.map((l) => l.priceBookId) ?? [])]
    .map((pid) => PRICE_BOOK_BY_ID[pid])
    .filter(Boolean)

  return (
    <FieldFrame title="Job Sheet" back="/field">
      <div className="space-y-3 p-3">
        <Card className="p-3">
          <p className="text-md font-medium text-primary">{opp.name}</p>
          <p className="mt-0.5 text-base text-muted">{account?.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-base text-muted">
            <MapPin size={13} /> {opp.address}
          </p>
          <p className="mt-1 text-base text-muted">
            {format(new Date(job.start), 'MMM d')} – {format(new Date(job.end), 'MMM d')} ·{' '}
            {opp.estimatedQuantity.toLocaleString()} units
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={job.dispatchState === 'ready' ? 'success' : job.dispatchState === 'at_risk' ? 'warning' : 'neutral'}>
              {job.dispatchState ?? 'unassigned'}
            </Badge>
            <Badge tone={job.syncStatus === 'pending' ? 'warning' : 'success'}>
              {job.syncStatus === 'pending' ? 'Offline pending sync' : 'Synced'}
            </Badge>
            <Badge tone="neutral">{job.clockStatus ?? 'not_started'}</Badge>
          </div>
          <Button className="mt-2 w-full" size="lg">
            <Navigation size={15} />
            Navigate
          </Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => updateJob(job.id, { clockStatus: 'traveling', syncStatus: 'pending' })}>
              Start travel
            </Button>
            <Button size="sm" onClick={() => updateJob(job.id, { clockStatus: 'on_site', checkInAt: new Date().toISOString(), syncStatus: 'pending' })}>
              Check in
            </Button>
            <Button size="sm" onClick={() => updateJob(job.id, { clockStatus: 'wrapped', checkOutAt: new Date().toISOString(), syncStatus: 'pending' })}>
              Wrap day
            </Button>
            <Button size="sm" variant="ghost" onClick={() => updateJob(job.id, { syncStatus: job.syncStatus === 'pending' ? 'synced' : 'pending' })}>
              <WifiOff size={12} />
              {job.syncStatus === 'pending' ? 'Mark synced' : 'Go offline'}
            </Button>
          </div>
          <Meter value={job.progress} tone="attention" className="mt-2" />
        </Card>

        <Card className="p-3">
          <p className="text-md font-semibold text-primary">Customer contact and appointment</p>
          <p className="mt-1 flex items-center gap-1.5 text-base text-secondary">
            <Phone size={13} /> {account?.phone}
          </p>
          <p className="mt-1 text-base text-muted">{account?.contactName} · {account?.email}</p>
          <p className="mt-2 text-sm text-muted">
            Travel buffer {job.travelMinutes ?? 30} min
            {job.customerNotifiedAt ? ` · customer notified ${format(new Date(job.customerNotifiedAt), 'd MMM · HH:mm')}` : ''}
          </p>
          <Button
            className="mt-2 w-full"
            size="sm"
            onClick={() => updateJob(job.id, { customerNotifiedAt: new Date().toISOString(), syncStatus: 'pending' })}
          >
            Confirm arrival with customer
          </Button>
        </Card>

        {/* What we sold — the thing crews currently have to go find elsewhere. */}
        <Card>
          <div className="border-b border-subtle px-3 py-2.5 text-md font-semibold text-primary">
            Scope — what we sold
          </div>
          <div className="divide-y divide-(--border-subtle)">
            {scope?.map((li) => (
              <div key={li.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-base font-medium text-primary">{li.name}</p>
                  <span className="shrink-0 font-mono text-base text-secondary tabular">
                    {li.qty.toLocaleString()} {li.unit}
                  </span>
                </div>
                <p className="mt-1 text-base leading-snug text-muted">{li.description}</p>
              </div>
            ))}
            {!scope?.length && <p className="px-3 py-3 text-base text-muted">No estimate attached.</p>}
          </div>
        </Card>

        {catalogueItems.length > 0 && (
          <Card>
            <div className="border-b border-subtle px-3 py-2.5 text-md font-semibold text-primary">
              Product specifications
            </div>
            {catalogueItems.map((s) => (
              <div key={s.id} className="flex items-start gap-2 px-3 py-2.5">
                <span
                  className="mt-0.5 h-6 w-6 shrink-0 rounded-sm border border-subtle"
                  style={{ background: s.swatch }}
                />
                <div className="min-w-0">
                  <p className="text-base font-medium text-primary">{s.serviceDocument}</p>
                  <p className="text-base text-muted">
                    {s.resourceMultiplier === 0
                      ? 'No orderable resources'
                      : `${s.resourceMultiplier} resource factor${s.resourceMultiplier === 1 ? '' : 's'} · ${Math.round(s.contingencyAllowance * 100)}% contingency allowance`}
                  </p>
                </div>
              </div>
            ))}
          </Card>
        )}

        <Card className="p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-md font-semibold text-primary">Equipment and resources</p>
            <Badge tone={procurementOrder?.status === 'delivered' ? 'success' : procurementOrder ? 'attention' : 'warning'}>
              {procurementOrder ? procurementOrder.status : 'not ordered'}
            </Badge>
          </div>
          <p className="mt-1 text-base text-muted">
            Confirm the trailer load, resource drop, and any missing items before work starts.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              onClick={() => updateJob(job.id, { dispatchState: 'ready', syncStatus: 'pending' })}
            >
              Crew fully ready
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateJob(job.id, { dispatchState: 'at_risk', lastDispatchNote: 'Material or equipment issue reported from field.', syncStatus: 'pending' })}
            >
              Mark at risk
            </Button>
          </div>
          {job.lastDispatchNote && (
            <p className="mt-2 text-sm text-muted">{job.lastDispatchNote}</p>
          )}
        </Card>

        {plans.length > 0 && (
          <Card>
            <div className="border-b border-subtle px-3 py-2.5 text-md font-semibold text-primary">
              Plans and installation map
            </div>
            {plans.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2.5">
                {p.kind === 'map' ? (
                  <MapIcon size={15} className="shrink-0 text-muted" />
                ) : (
                  <FileText size={15} className="shrink-0 text-muted" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-base text-primary">{p.name}</p>
                  {p.meta && <p className="truncate text-base text-muted">{p.meta}</p>}
                </div>
              </div>
            ))}
          </Card>
        )}

        {notes.length > 0 && (
          <Card>
            <div className="border-b border-subtle px-3 py-2.5 text-md font-semibold text-primary">
              Notes from the site visit
            </div>
            {notes.map((n) => (
              <div key={n.id} className="flex gap-2 px-3 py-2.5">
                <StickyNote size={14} className="mt-0.5 shrink-0 text-muted" />
                <p className="text-base leading-snug text-secondary">{n.body}</p>
              </div>
            ))}
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between border-b border-subtle px-3 py-2.5">
            <span className="text-md font-semibold text-primary">Installation checklist</span>
            <Badge tone={(instance?.done.length ?? 0) >= template.items.length ? 'success' : 'warning'}>
              {instance?.done.length ?? 0} / {template.items.length}
            </Badge>
          </div>
          <div className="space-y-3 p-3">
            {template.items.map((item) => (
              <Checkbox
                key={item.id}
                checked={instance?.done.includes(item.id) ?? false}
                onChange={() => toggle(opp.id, 'cl_install', item.id)}
                label={item.label}
              />
            ))}
          </div>
        </Card>

        {issues.length > 0 && (
          <Card>
            <div className="border-b border-subtle px-3 py-2.5 text-md font-semibold text-primary">
              Reported issues
            </div>
            {issues.map((i) => (
              <div key={i.id} className="flex gap-2 px-3 py-2.5">
                <AlertTriangle
                  size={15}
                  className={cn(
                    'mt-0.5 shrink-0',
                    i.severity === 'high' ? 'text-danger-text' : 'text-warning-text',
                  )}
                />
                <div className="min-w-0">
                  <p className="text-base font-medium text-primary">{i.title}</p>
                  <p className="text-base leading-snug text-muted">{i.detail}</p>
                </div>
              </div>
            ))}
          </Card>
        )}

        <PhotoGrid photos={photos} />

        <Card className="p-3">
          <p className="text-md font-semibold text-primary">Daily log and sync queue</p>
          <div className="mt-2 flex gap-2">
            <Input value={logNote} onChange={(e) => setLogNote(e.target.value)} placeholder="What changed on site?" />
            <Button
              size="sm"
              onClick={() => {
                if (!logNote.trim()) return
                addDailyLog(job.id, logNote)
                updateJob(job.id, { syncStatus: 'pending' })
                setLogNote('')
              }}
            >
              Add
            </Button>
          </div>
          {job.dailyLogs.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {job.dailyLogs.slice().reverse().slice(0, 3).map((entry) => (
                <div key={entry.id} className="rounded-md border border-subtle px-2.5 py-2 text-sm text-secondary">
                  <p>{entry.note}</p>
                  <p className="mt-0.5 text-xs text-muted">{format(new Date(entry.date), 'd MMM · HH:mm')}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="attention"
            size="lg"
            onClick={() =>
              addArtifact({
                opportunityId: opp.id,
                kind: 'photo',
                name: `Progress photo ${photos.length + 1}`,
                stageAdded: 'awarded',
                addedById: viewerId,
                addedAt: new Date().toISOString(),
                meta: 'Captured in the field · auto-matched by GPS',
                photoPhase: 'progress',
              })
            }
          >
            <Camera size={16} />
            Progress
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() =>
              addArtifact({
                opportunityId: opp.id,
                kind: 'photo',
                name: `Completion photo ${photos.filter((p) => p.photoPhase === 'after').length + 1}`,
                stageAdded: 'awarded',
                addedById: viewerId,
                addedAt: new Date().toISOString(),
                meta: 'Same angle as the before shot',
                photoPhase: 'after',
              })
            }
          >
            <Camera size={16} />
            After
          </Button>
          <Button size="lg" onClick={() => setReporting('issue')}>
            <ShieldAlert size={16} />
            Report issue
          </Button>
          <Button size="lg" onClick={() => setReporting('change')}>
            <Plus size={16} />
            Change order
          </Button>
        </div>
      </div>

      <FieldReport kind={reporting} opportunityId={opp.id} onClose={() => setReporting(null)} />
    </FieldFrame>
  )
}

/* ------------------------------------------------------------------------ */

function PhotoGrid({ photos }: { photos: { id: string; name: string; photoPhase?: string }[] }) {
  if (photos.length === 0) return null
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-subtle px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-md font-semibold text-primary">
          <ImageIcon size={15} /> Photo log
        </span>
        <Badge tone="neutral">{photos.length}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-3">
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative flex aspect-square items-center justify-center rounded-sm border border-subtle bg-surface-inset p-1 text-center"
            title={p.name}
          >
            <span className="text-2xs leading-tight text-muted">{p.name}</span>
            {p.photoPhase && (
              <span className="absolute top-1 left-1 rounded-xs bg-surface-chrome px-1 text-[9px] text-white uppercase">
                {p.photoPhase}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function FieldReport({
  kind,
  opportunityId,
  onClose,
}: {
  kind: 'issue' | 'change' | null
  opportunityId: string
  onClose: () => void
}) {
  const addIssue = useStore((s) => s.addIssue)
  const addChangeOrder = useStore((s) => s.addChangeOrder)
  const viewerId = useStore((s) => s.viewerId)
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium')
  const [qty, setQty] = useState(0)
  const [amount, setAmount] = useState(0)

  if (!kind) return null

  const reset = () => {
    setTitle('')
    setDetail('')
    setQty(0)
    setAmount(0)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={kind === 'issue' ? <ShieldAlert size={17} /> : <Plus size={17} />}
      title={kind === 'issue' ? 'Report an issue' : 'Raise a change order'}
      subtitle={
        kind === 'issue'
          ? 'Goes straight to the project manager with the job attached.'
          : 'Approved changes are added to the final invoice automatically.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!title}
            onClick={() => {
              if (kind === 'issue') {
                addIssue({
                  opportunityId,
                  title,
                  detail,
                  severity,
                  raisedById: viewerId,
                  raisedAt: new Date().toISOString(),
                  status: 'open',
                })
              } else {
                addChangeOrder({
                  opportunityId,
                  description: title,
                  qty,
                  unit: 'units',
                  amount,
                  raisedById: viewerId,
                  raisedAt: new Date().toISOString(),
                  status: 'pending',
                  scheduleImpactDays: 0,
                  internalNote: detail,
                  photoIds: [],
                })
              }
              reset()
            }}
          >
            Submit
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FieldRow label={kind === 'issue' ? 'What happened' : 'Description of the additional work'}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </FieldRow>
        <FieldRow label="Detail">
          <Textarea rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} />
        </FieldRow>
        {kind === 'issue' ? (
          <FieldRow label="Severity">
            <Select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High — blocking work</option>
            </Select>
          </FieldRow>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Additional quantity (units)">
              <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </FieldRow>
            <FieldRow label="Additional price">
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </FieldRow>
          </div>
        )}
      </div>
    </Modal>
  )
}
