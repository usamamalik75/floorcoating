import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  FileSignature,
  FileText,
  Layers,
  Loader2,
  Package,
  Plus,
  ScanSearch,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react'
import type { Estimate, EstimateOption, LineItem } from '@/domain/types'
import { ACCOUNT_BY_ID, USER_BY_ID } from '@/data/seed'
import { estimateTotal, money, optionTotal, useStore } from '@/store/useStore'
import { useChecks, useViewer } from '@/store/selectors'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  SectionTitle,
  Select,
  Textarea,
} from '@/components/ui'
import { ProposalDocument } from '@/components/domain/ProposalDocument'
import { cn } from '@/lib/cn'

let n = 0
const uid = (p: string) => `${p}_${Date.now()}_${++n}`

/* ==========================================================================
   Estimate builder
   ==========================================================================
   Replaces the split between a Google Sheet and Housecall Pro. Selecting a
   catalogue item pulls its description, unit, price, spec sheet, material
   requirement, install checklist, load list and exclusions in one action.

   Supports both shapes the client needs at once: multiple AREAS within a
   facility (which add up), and multiple ALTERNATIVES for the same scope
   (where the customer picks one, so only the chosen one counts).
   ========================================================================== */

export function EstimateBuilder() {
  const { id = '' } = useParams<{ id: string }>()
  const viewer = useViewer()
  const opportunities = useStore((s) => s.opportunities)
  const estimates = useStore((s) => s.estimates)
  const scopeExtractions = useStore((s) => s.scopeExtractions)
  const priceBookItems = useStore((s) => s.priceBookItems)
  const proposalTemplates = useStore((s) => s.proposalTemplates)
  const upsertEstimate = useStore((s) => s.upsertEstimate)
  const updateEstimate = useStore((s) => s.updateEstimate)
  const approveEstimate = useStore((s) => s.approveEstimate)
  const rejectEstimate = useStore((s) => s.rejectEstimate)
  const moveStage = useStore((s) => s.moveStage)
  const sendMessage = useStore((s) => s.sendMessage)

  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sendChannel, setSendChannel] = useState<'email' | 'sms'>('email')
  const [sendSubject, setSendSubject] = useState('Your proposal is ready')
  const [sendBody, setSendBody] = useState('')

  const opp = opportunities.find((o) => o.id === id)
  const est = estimates.find((e) => e.opportunityId === id)
  const scopeExtraction = scopeExtractions.find((t) => t.opportunityId === id)
  const account = opp ? ACCOUNT_BY_ID[opp.accountId] : undefined
  const checks = useChecks(id, 'estimate_ready')
  const priceBookById = useMemo(
    () => Object.fromEntries(priceBookItems.map((item) => [item.id, item])) as Record<string, typeof priceBookItems[number]>,
    [priceBookItems],
  )
  const templateById = useMemo(
    () => Object.fromEntries(proposalTemplates.map((template) => [template.id, template])) as Record<string, typeof proposalTemplates[number]>,
    [proposalTemplates],
  )

  const grand = useMemo(() => (est ? estimateTotal(est) : 0), [est])

  if (!opp) return <EmptyState title="Opportunity not found" className="h-full" />

  const canApprove = viewer?.role === 'estimator' || viewer?.role === 'owner' || viewer?.role === 'admin'
  const readyForApproval = checks.every((c) => c.ok)

  const createEstimate = () =>
    upsertEstimate({
      id: uid('est'),
      opportunityId: opp.id,
      options: [{ id: uid('eo'), label: 'Scope 1', kind: 'scope', recommended: true, lineItems: [] }],
      templateId: opp.category === 'residential' ? 'pt_residential' : 'pt_standard',
      internalNotes: '',
      status: 'draft',
      approvedById: null,
      approvedAt: null,
      rejectionNote: null,
      sentAt: null,
      signedAt: null,
      signedBy: null,
      token: Math.random().toString(36).slice(2, 8),
      depositPct: opp.category === 'residential' ? 25 : 40,
    })

  const patch = (next: Partial<Estimate>) => est && updateEstimate(est.id, next)
  const setOptions = (options: EstimateOption[]) => patch({ options })

  const addOption = (kind: EstimateOption['kind']) => {
    if (!est) return
    setOptions([
      ...est.options,
      {
        id: uid('eo'),
        label:
          kind === 'scope'
            ? `Scope ${est.options.filter((o) => o.kind === 'scope').length + 1}`
            : `Alternative ${est.options.filter((o) => o.kind === 'alternative').length + 1}`,
        kind,
        recommended: false,
        lineItems: [],
      },
    ])
  }

  const addLine = (optionId: string, priceBookId: string) => {
    if (!est) return
    const pb = priceBookById[priceBookId]
    if (!pb) return
    const line: LineItem = {
      id: uid('li'),
      priceBookId: pb.id,
      name: pb.name,
      description: pb.description,
      qty: ['visit', 'unit', 'day', 'each'].includes(pb.unit) ? 1 : pb.id === 'svc_access_equipment' ? opp.secondaryQuantity || 1 : opp.estimatedQuantity,
      unit: pb.unit,
      unitPrice: pb.unitPrice,
    }
    setOptions(est.options.map((o) => (o.id === optionId ? { ...o, lineItems: [...o.lineItems, line] } : o)))
    setPickerFor(null)
  }

  const patchLine = (optionId: string, lineId: string, next: Partial<LineItem>) => {
    if (!est) return
    setOptions(
      est.options.map((o) =>
        o.id === optionId
          ? { ...o, lineItems: o.lineItems.map((l) => (l.id === lineId ? { ...l, ...next } : l)) }
          : o,
      ),
    )
  }

  const removeLine = (optionId: string, lineId: string) => {
    if (!est) return
    setOptions(
      est.options.map((o) =>
        o.id === optionId ? { ...o, lineItems: o.lineItems.filter((l) => l.id !== lineId) } : o,
      ),
    )
  }

  /** Every distinct catalogue item on the quote, for the auto-populated panels. */
  const selectedCatalogueItems = est
    ? [...new Set(est.options.flatMap((o) => o.lineItems.map((l) => l.priceBookId)))]
        .map((pid) => priceBookById[pid])
        .filter(Boolean)
    : []

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-subtle bg-surface-raised px-4 py-2.5">
        <Link to={`/opportunities/${opp.id}`} className="text-muted hover:text-primary">
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg leading-tight text-primary">{opp.name}</h1>
          <p className="text-sm text-muted">
            {account?.name} · <span className="font-mono">{opp.code}</span> ·{' '}
            {opp.estimatedQuantity.toLocaleString()} units
            {opp.secondaryQuantity > 0 && ` · ${opp.secondaryQuantity} additional units`}
          </p>
        </div>

        <div className="flex-1" />

        {est && (
          <>
            <span className="mr-1 font-mono text-lg font-semibold text-primary tabular">
              {money(grand)}
            </span>
            <Button onClick={() => setPreview(true)}>
              <FileSignature size={13} />
              Preview proposal
            </Button>

            {est.status === 'draft' && (
              <Button
                variant="primary"
                disabled={grand === 0}
                onClick={() => {
                  patch({ status: 'pending_approval' })
                  if (opp.stage === 'estimate_in_progress') moveStage(opp.id, 'estimate_ready')
                }}
              >
                <ShieldCheck size={13} />
                Request approval
              </Button>
            )}

            {est.status === 'pending_approval' && canApprove && (
              <>
                <Button variant="ghost" onClick={() => setRejecting(true)}>
                  <XCircle size={13} />
                  Send back
                </Button>
                <Button
                  variant="primary"
                  disabled={!readyForApproval}
                  onClick={() => approveEstimate(est.id, viewer!.id)}
                >
                  <ShieldCheck size={13} />
                  Approve estimate
                </Button>
              </>
            )}

            {est.status === 'approved' && (
              <Button
                variant="primary"
                onClick={() => {
                  setSendChannel('email')
                  setSendSubject('Your proposal is ready')
                  setSendBody(
                    `Hi ${account?.contactName ?? 'there'},\n\nYour proposal is ready to review. You can open the secure link, compare options, and sign electronically when you are ready.\n\nThanks,\n${viewer?.name ?? 'Your service team'}`,
                  )
                  setSending(true)
                }}
              >
                <Send size={13} />
                Send to customer
              </Button>
            )}

            {(est.status === 'sent' || est.status === 'signed') && (
              <Link to={`/proposal/${est.token}`} target="_blank">
                <Button>
                  <FileText size={13} />
                  Open customer link
                </Button>
              </Link>
            )}
          </>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-5xl space-y-3 p-4">
          {!est ? (
            <Card>
              <EmptyState
                icon={<Layers size={28} />}
                title="No estimate yet"
                description="Start one and the catalogue will populate the description, unit, price, service document, resource requirement, and job checklist."
                action={
                  <Button variant="primary" onClick={createEstimate}>
                    <Plus size={13} />
                    Start estimate
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              {est.rejectionNote && (
                <Card className="border-(--status-danger) bg-danger-soft px-4 py-3">
                  <p className="text-base font-medium text-primary">Sent back for revision</p>
                  <p className="mt-0.5 text-base text-secondary">{est.rejectionNote}</p>
                </Card>
              )}

              {est.status === 'approved' && (
                <Card className="border-(--status-success) bg-success-soft px-4 py-3">
                  <p className="flex items-center gap-2 text-base font-medium text-primary">
                    <CheckCircle2 size={14} className="text-success-text" />
                    Approved by {USER_BY_ID[est.approvedById ?? '']?.name}. Ready to send to the
                    customer.
                  </p>
                </Card>
              )}

              {scopeExtraction && <ScopeExtractionPanel scopeExtractionId={scopeExtraction.id} onApplyScope={(label, estimatedQuantity, secondaryQuantity) => {
                setOptions([
                  ...est.options,
                  {
                    id: uid('eo'),
                    label,
                    kind: 'scope',
                    recommended: true,
                    lineItems: [
                      {
                        id: uid('li'),
                        priceBookId: scopeExtraction.recommendedCatalogItemId,
                        name: priceBookById[scopeExtraction.recommendedCatalogItemId].name,
                        description: priceBookById[scopeExtraction.recommendedCatalogItemId].description,
                        qty: estimatedQuantity,
                        unit: priceBookById[scopeExtraction.recommendedCatalogItemId].unit,
                        unitPrice: priceBookById[scopeExtraction.recommendedCatalogItemId].unitPrice,
                      },
                      ...(secondaryQuantity > 0
                        ? [
                            {
                              id: uid('li'),
                              priceBookId: 'svc_access_equipment',
                              name: priceBookById.svc_access_equipment.name,
                              description: priceBookById.svc_access_equipment.description,
                              qty: secondaryQuantity,
                              unit: priceBookById.svc_access_equipment.unit,
                              unitPrice: priceBookById.svc_access_equipment.unitPrice,
                            },
                          ]
                        : []),
                    ],
                  },
                ])
              }} />}

              {est.status === 'pending_approval' && (
                <Card>
                  <CardHeader
                    title="Approval readiness"
                    subtitle="Verified against the record. A proposal cannot be sent while anything here is missing."
                    icon={<ShieldCheck size={14} />}
                    actions={
                      <Badge tone={readyForApproval ? 'success' : 'warning'}>
                        {checks.filter((c) => c.ok).length} of {checks.length} complete
                      </Badge>
                    }
                  />
                  <div className="grid gap-1 p-3 sm:grid-cols-2">
                    {checks.map((c) => (
                      <div key={c.id} className="flex items-start gap-2 rounded-sm px-2 py-1.5">
                        {c.ok ? (
                          <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success-text" />
                        ) : (
                          <XCircle size={13} className="mt-0.5 shrink-0 text-danger-text" />
                        )}
                        <div className="min-w-0">
                          <p className={cn('text-sm', c.ok ? 'text-secondary' : 'font-medium text-primary')}>
                            {c.label}
                          </p>
                          <p className="text-2xs text-muted">{c.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {est.options.map((opt) => (
                <Card key={opt.id}>
                  <CardHeader
                    icon={<Layers size={14} />}
                    title={
                      <input
                        value={opt.label}
                        onChange={(e) =>
                          setOptions(
                            est.options.map((o) => (o.id === opt.id ? { ...o, label: e.target.value } : o)),
                          )
                        }
                        className="w-full max-w-xs border-b border-transparent bg-transparent text-md font-semibold text-primary hover:border-(--border-strong) focus:border-(--action-primary) focus:outline-none"
                      />
                    }
                    subtitle={
                      opt.kind === 'scope'
                        ? 'A distinct section of work — adds to the contract total'
                        : 'A price or quality alternative — the customer picks one, so it does not add to the total'
                    }
                    actions={
                      <>
                        <Badge tone={opt.kind === 'scope' ? 'info' : 'attention'}>
                          {opt.kind === 'scope' ? 'Scope' : 'Alternative'}
                        </Badge>
                        <Button
                          size="sm"
                          variant={opt.recommended ? 'primary' : 'ghost'}
                          onClick={() =>
                            setOptions(
                              est.options.map((o) =>
                                o.id === opt.id ? { ...o, recommended: !o.recommended } : o,
                              ),
                            )
                          }
                        >
                          {opt.recommended ? 'Recommended' : 'Mark recommended'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setOptions(est.options.filter((o) => o.id !== opt.id))}
                          aria-label="Remove option"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </>
                    }
                  />

                  <div className="divide-y divide-(--border-subtle)">
                    {opt.lineItems.map((li) => (
                      <div key={li.id} className="grid grid-cols-12 items-start gap-2 px-4 py-2.5">
                        <div className="col-span-12 sm:col-span-5">
                          <p className="text-base font-medium text-primary">{li.name}</p>
                          <textarea
                            value={li.description}
                            onChange={(e) => patchLine(opt.id, li.id, { description: e.target.value })}
                            rows={2}
                            className="mt-1 w-full resize-none rounded-sm border border-transparent bg-transparent text-sm leading-snug text-secondary hover:border-(--border-subtle) focus:border-(--action-primary) focus:outline-none"
                          />
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <label className="mb-0.5 block text-2xs text-muted uppercase">Qty</label>
                          <Input
                            type="number"
                            value={li.qty}
                            onChange={(e) => patchLine(opt.id, li.id, { qty: Number(e.target.value) })}
                            className="text-right"
                          />
                          <p className="mt-0.5 text-right text-2xs text-muted">{li.unit}</p>
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <label className="mb-0.5 block text-2xs text-muted uppercase">Unit</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={li.unitPrice}
                            onChange={(e) => patchLine(opt.id, li.id, { unitPrice: Number(e.target.value) })}
                            className="text-right"
                          />
                        </div>
                        <div className="col-span-3 text-right sm:col-span-2">
                          <label className="mb-0.5 block text-2xs text-muted uppercase">Total</label>
                          <p className="pt-1.5 font-mono text-base font-medium text-primary tabular">
                            {money(li.qty * li.unitPrice)}
                          </p>
                        </div>
                        <div className="col-span-1 flex justify-end pt-5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeLine(opt.id, li.id)}
                            aria-label="Remove line"
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-subtle bg-surface-inset px-4 py-2">
                    <Button size="sm" onClick={() => setPickerFor(opt.id)}>
                      <Plus size={12} />
                      Add from price book
                    </Button>
                    <span className="font-mono text-base font-semibold text-primary tabular">
                      {money(optionTotal(opt.lineItems))}
                    </span>
                  </div>
                </Card>
              ))}

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => addOption('scope')}>
                  <Plus size={13} />
                  Add scope section
                </Button>
                <Button onClick={() => addOption('alternative')}>
                  <Plus size={13} />
                  Add a pricing alternative
                </Button>
              </div>

              {/* ---- What the price book brought with it ---- */}
              {selectedCatalogueItems.length > 0 && (
                <>
                  <SectionTitle className="mt-5">
                    Automatically attached by the price book
                  </SectionTitle>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Card>
                      <CardHeader title="Service documentation" icon={<FileText size={14} />} />
                      <ul className="space-y-1.5 p-4">
                        {selectedCatalogueItems.map((pb) => (
                          <li key={pb.id} className="flex items-start gap-2 text-sm">
                            <span
                              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-xs"
                              style={{ background: pb.swatch }}
                            />
                            <span>
                              <span className="text-primary">{pb.serviceDocument}</span>
                              <span className="block text-muted">
                                {pb.resourceMultiplier} resource factor{pb.resourceMultiplier === 1 ? '' : 's'} · {pb.materialRate}{' '}
                                {pb.materialUnit}/{pb.unit} · {Math.round(pb.contingencyAllowance * 100)}% waste
                                allowance
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card>
                      <CardHeader title="Required resources" icon={<Truck size={14} />} />
                      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 p-4 text-sm text-secondary">
                        {[...new Set(selectedCatalogueItems.flatMap((pb) => pb.requiredResources))].map((item) => (
                          <li key={item} className="flex items-center gap-1.5">
                            <span className="h-1 w-1 shrink-0 rounded-full bg-(--color-steel-400)" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card>
                      <CardHeader title="Exclusions carried onto the proposal" icon={<XCircle size={14} />} />
                      <ul className="space-y-1 p-4 text-sm text-secondary">
                        {[...new Set(selectedCatalogueItems.flatMap((pb) => pb.exclusions))].map((e) => (
                          <li key={e} className="flex items-start gap-1.5">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-(--color-steel-400)" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card>
                      <CardHeader title="Estimated resource requirement" icon={<Package size={14} />} />
                      <ul className="space-y-1 p-4 text-sm">
                        {selectedCatalogueItems
                          .filter((pb) => pb.materialRate > 0)
                          .map((pb) => {
                            const qty = ['visit', 'unit', 'day', 'each'].includes(pb.unit) ? 1 : pb.id === 'svc_access_equipment' ? opp.secondaryQuantity || 1 : opp.estimatedQuantity
                            const total = Math.ceil(
                              qty * pb.materialRate * Math.max(1, pb.resourceMultiplier) * (1 + pb.contingencyAllowance),
                            )
                            return (
                              <li key={pb.id} className="flex items-center justify-between gap-2">
                                <span className="truncate text-secondary">{pb.name}</span>
                                <span className="shrink-0 font-mono text-primary tabular">
                                  {total} {pb.materialUnit}
                                </span>
                              </li>
                            )
                          })}
                      </ul>
                      <p className="border-t border-subtle px-4 py-2 text-2xs text-muted">
                        Becomes a purchasing requirement once the job is sold and scheduled.
                      </p>
                    </Card>
                  </div>
                </>
              )}

              {/* ---- Terms and internal notes ---- */}
              <SectionTitle className="mt-5">Proposal setup</SectionTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                <Card className="p-4">
                  <label className="mb-1 block text-xs font-medium tracking-wide text-secondary uppercase">
                    Proposal template
                  </label>
                  <Select value={est.templateId} onChange={(e) => patch({ templateId: e.target.value })}>
                    {proposalTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.managedByCompany ? ' (company standard)' : ''}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-2 text-sm text-muted">
                    {templateById[est.templateId]?.depositPct}% deposit · valid{' '}
                    {templateById[est.templateId]?.validDays} days
                  </p>
                </Card>

                <Card className="p-4">
                  <label className="mb-1 block text-xs font-medium tracking-wide text-secondary uppercase">
                    Internal notes and job requirements
                  </label>
                  <Textarea
                    rows={3}
                    value={est.internalNotes}
                    onChange={(e) => patch({ internalNotes: e.target.value })}
                    placeholder="Crew instructions, risks, things that must not be value-engineered out…"
                  />
                  <p className="mt-1.5 text-sm text-muted">
                    Never shown to the customer. Carries through to the crew’s job sheet.
                  </p>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---- Price book picker ---- */}
      <Modal
        open={Boolean(pickerFor)}
        onClose={() => setPickerFor(null)}
        size="lg"
        icon={<Layers size={17} />}
        title="Price book"
        subtitle="Selecting a catalogue item brings its description, pricing, service document, resource requirement, job checklist, required resources and exclusions with it."
      >
        <div className="space-y-1.5">
          {priceBookItems.filter((pb) => pb.categories.includes(opp.category)).map((pb) => (
            <button
              key={pb.id}
              onClick={() => pickerFor && addLine(pickerFor, pb.id)}
              className="flex w-full items-start gap-3 rounded-md border border-subtle bg-surface-raised px-3 py-2.5 text-left transition-colors duration-(--duration-fast) hover:border-strong hover:bg-surface-inset"
            >
              <span
                className="mt-1 h-8 w-8 shrink-0 rounded-sm border border-subtle"
                style={{ background: pb.swatch }}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-base font-medium text-primary">{pb.name}</span>
                  {pb.managedByCompany && (
                    <Badge tone="neutral" className="shrink-0">
                      Company standard
                    </Badge>
                  )}
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-muted">{pb.description}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-base font-medium text-primary tabular">
                  {money(pb.unitPrice)}
                </span>
                <span className="block text-2xs text-muted">per {pb.unit}</span>
              </span>
            </button>
          ))}
        </div>
      </Modal>

      {/* ---- Proposal preview ---- */}
      <Modal
        open={preview}
        onClose={() => setPreview(false)}
        size="xl"
        icon={<FileSignature size={17} />}
        title="Proposal preview"
        subtitle="Exactly what the customer sees. Internal notes, crew instructions and checklists are stripped out."
        footer={
          <>
            <span className="mr-auto text-sm text-muted">
              Customer link: <span className="font-mono">/proposal/{est?.token}</span>
            </span>
            <Button variant="ghost" onClick={() => setPreview(false)}>
              Close
            </Button>
          </>
        }
      >
        {est && <ProposalDocument estimate={est} opportunity={opp} />}
      </Modal>

      {/* ---- Send to customer ---- */}
      <Modal
        open={sending}
        onClose={() => setSending(false)}
        icon={<Send size={17} />}
        title="Send proposal to customer"
        subtitle="Preview the delivery channel, message, and customer timeline before the proposal moves out."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSending(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!est || !sendBody.trim()) return
                sendMessage(opp.id, {
                  channel: sendChannel,
                  subject: sendChannel === 'email' ? sendSubject : undefined,
                  body: sendBody,
                  contactName: account?.contactName ?? 'Customer',
                  contactEmail: account?.email,
                  contactPhone: account?.phone,
                  status: 'draft',
                })
              }}
            >
              Save draft
            </Button>
            <Button
              variant="primary"
              disabled={!sendBody.trim()}
              onClick={() => {
                if (!est) return
                sendMessage(opp.id, {
                  channel: sendChannel,
                  subject: sendChannel === 'email' ? sendSubject : undefined,
                  body: sendBody,
                  contactName: account?.contactName ?? 'Customer',
                  contactEmail: account?.email,
                  contactPhone: account?.phone,
                  status: 'sent',
                })
                patch({ status: 'sent', sentAt: new Date().toISOString() })
                moveStage(opp.id, 'proposal_sent')
                setSending(false)
              }}
            >
              Send proposal
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-md border border-subtle bg-surface-inset px-3 py-2.5 text-sm text-muted">
            Customer link: <span className="font-mono text-primary">/proposal/{est?.token}</span>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium tracking-wide text-secondary uppercase">
              Delivery channel
            </label>
            <Select value={sendChannel} onChange={(e) => setSendChannel(e.target.value as 'email' | 'sms')}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </Select>
          </div>
          {sendChannel === 'email' && (
            <div>
              <label className="mb-1 block text-xs font-medium tracking-wide text-secondary uppercase">
                Subject
              </label>
              <Input value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium tracking-wide text-secondary uppercase">
              Message
            </label>
            <Textarea rows={6} value={sendBody} onChange={(e) => setSendBody(e.target.value)} />
          </div>
        </div>
      </Modal>

      {/* ---- Send back ---- */}
      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        icon={<XCircle size={17} className="text-danger-text" />}
        title="Send back for revision"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!rejectNote}
              onClick={() => {
                if (est) rejectEstimate(est.id, rejectNote)
                setRejectNote('')
                setRejecting(false)
              }}
            >
              Send back
            </Button>
          </>
        }
      >
        <Textarea
          rows={4}
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="What needs to change before this can go to the customer?"
        />
      </Modal>
    </div>
  )
}

/* ==========================================================================
   Document-assisted scope extraction
   ==========================================================================
   Deliberately scoped as one panel rather than the centre of the prototype.
   The point the client made is that this reduces the specialist training
   burden across many locations — but an estimator must still verify it, so
   nothing here writes to the record without a human pressing accept.
   ========================================================================== */

function ScopeExtractionPanel({
  scopeExtractionId,
  onApplyScope,
}: {
  scopeExtractionId: string
  onApplyScope: (label: string, estimatedQuantity: number, secondaryQuantity: number) => void
}) {
  const scopeExtraction = useStore((s) => s.scopeExtractions.find((t) => t.id === scopeExtractionId))!
  const accept = useStore((s) => s.acceptScopeExtraction)
  const [analysing, setAnalysing] = useState(false)

  const totalEstimatedQuantity = scopeExtraction.sections.reduce((s, a) => s + a.estimatedQuantity, 0)
  const totalSecondaryQuantity = scopeExtraction.sections.reduce((s, a) => s + a.secondaryQuantity, 0)
  const priceBookItems = useStore((s) => s.priceBookItems)
  const priceBookById = useMemo(
    () => Object.fromEntries(priceBookItems.map((item) => [item.id, item])) as Record<string, typeof priceBookItems[number]>,
    [priceBookItems],
  )
  const recommended = priceBookById[scopeExtraction.recommendedCatalogItemId]

  return (
    <Card id="scopeExtraction" className="border-(--accent-attention)">
      <CardHeader
        icon={<ScanSearch size={14} className="text-attention" />}
        title="Document-assisted scope extraction"
        subtitle={`${scopeExtraction.fileName} · ${scopeExtraction.pageCount} pages · ${scopeExtraction.relevantPages.length} identified as relevant`}
        actions={
          <>
            <Badge tone="attention">{Math.round(scopeExtraction.confidence * 100)}% confidence</Badge>
            {scopeExtraction.status === 'accepted' ? (
              <Badge tone="success" icon={<CheckCircle2 size={9} />}>
                Verified
              </Badge>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    setAnalysing(true)
                    setTimeout(() => setAnalysing(false), 1200)
                  }}
                  disabled={analysing}
                >
                  {analysing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Re-run
                </Button>
                <Button size="sm" variant="primary" onClick={() => accept(scopeExtraction.id)}>
                  <CheckCircle2 size={12} />
                  Accept scope
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
            Relevant source sections
          </p>
          <ul className="space-y-1.5">
            {scopeExtraction.relevantPages.map((p) => (
              <li key={p.page} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 rounded-xs bg-surface-inset px-1.5 py-0.5 font-mono text-2xs text-secondary">
                  p{p.page}
                </span>
                <span className="min-w-0">
                  <span className="font-medium text-primary">{p.sheet}</span>
                  <span className="block leading-snug text-muted">{p.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
            Extracted scope
          </p>
          <div className="space-y-1.5">
            {scopeExtraction.sections.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-sm border border-subtle bg-surface-inset px-2.5 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">{a.name}</p>
                  <p className="text-2xs text-muted">
                    {a.estimatedQuantity.toLocaleString()} units · {a.secondaryQuantity} additional units · {a.specification}
                  </p>
                </div>
                <Button size="sm" onClick={() => onApplyScope(a.name, a.estimatedQuantity, a.secondaryQuantity)}>
                  Add to quote
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-sm text-primary tabular">
            {totalEstimatedQuantity.toLocaleString()} units · {totalSecondaryQuantity} additional units total
          </p>
        </div>
      </div>

      <div className="border-t border-subtle bg-surface-inset px-4 py-3">
        <p className="text-sm text-secondary">
          <span className="font-medium text-primary">Recommended catalogue item: {recommended?.name}.</span>{' '}
          {scopeExtraction.notes}
        </p>
        <p className="mt-1.5 text-2xs text-muted">
          Findings are passed to the estimator for verification. Nothing is written to the estimate
          until a person accepts it.
        </p>
      </div>
    </Card>
  )
}
