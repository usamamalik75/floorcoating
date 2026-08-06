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
  UserPlus,
  XCircle,
} from 'lucide-react'
import type { Estimate, EstimateOption, LineItem } from '@/domain/types'
import { CATEGORY_LABEL } from '@/domain/types'
import { ACCOUNT_BY_ID } from '@/data/seed'
import { estimatePackFor, suggestFloorSystem } from '@/data/estimating'
import { estimateTotal, money, optionTotal, proposalTokenFor, useStore } from '@/store/useStore'
import { useChecks, useEstimatePacks, useUserDirectory, useUsers, useViewer } from '@/store/selectors'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
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
   catalogue item pulls its description, unit, price, spec sheet, resource
   requirement, install checklist, load list and exclusions in one action.

   Supports both shapes the client needs at once: multiple AREAS within a
   facility (which add up), and multiple ALTERNATIVES for the same scope
   (where the customer picks one, so only the chosen one counts).
   ========================================================================== */

export function EstimateBuilder() {
  const { id = '' } = useParams<{ id: string }>()
  const viewer = useViewer()
  const userById = useUserDirectory()
  const users = useUsers()
  const opportunities = useStore((s) => s.opportunities)
  const estimates = useStore((s) => s.estimates)
  const scopeExtractions = useStore((s) => s.scopeExtractions)
  const priceBookItems = useStore((s) => s.priceBookItems)
  const proposalTemplates = useStore((s) => s.proposalTemplates)
  const estimatePacks = useEstimatePacks()
  const upsertEstimate = useStore((s) => s.upsertEstimate)
  const updateEstimate = useStore((s) => s.updateEstimate)
  const approveEstimate = useStore((s) => s.approveEstimate)
  const rejectEstimate = useStore((s) => s.rejectEstimate)
  const moveStage = useStore((s) => s.moveStage)
  const patchOpportunity = useStore((s) => s.patchOpportunity)
  const logActivity = useStore((s) => s.logActivity)
  const sendMessage = useStore((s) => s.sendMessage)

  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [overridePicker, setOverridePicker] = useState(false)
  const [preview, setPreview] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sendChannel, setSendChannel] = useState<'email' | 'sms'>('email')
  const [sendSubject, setSendSubject] = useState('Your proposal is ready')
  const [sendBody, setSendBody] = useState('')

  const opp = opportunities.find((o) => o.id === id)
  const est = estimates.find((e) => e.opportunityId === id)
  const siteVisit = useStore((s) => s.siteVisits.find((v) => v.opportunityId === id))
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
  const pack = opp ? estimatePackFor(opp.category, estimatePacks) : null
  const suggestion = useMemo(() => {
    if (!opp) return null
    return suggestFloorSystem(opp.category, siteVisit?.requests ?? [], siteVisit?.values ?? {}, estimatePacks)
  }, [opp, siteVisit?.requests, siteVisit?.values, estimatePacks])
  const categoryPriceBook = useMemo(
    () => (opp ? priceBookItems.filter((pb) => pb.categories.includes(opp.category)) : []),
    [priceBookItems, opp],
  )

  if (!opp) return <EmptyState title="Opportunity not found" className="h-full" />

  const estimators = users.filter((u) => u.role === 'estimator')
  const estimatorMissing = !opp.estimatorId
  const canApprove = viewer?.role === 'estimator' || Boolean(viewer?.orgRole)
  /** Approve only needs estimate completeness — visit gaps stay visible as advisory. */
  const requiredApprovalIds = new Set(['estimate', 'margin', 'terms', 'estimator', 'estimation_request'])
  const requiredChecks = checks.filter((c) => requiredApprovalIds.has(c.id))
  const readyForApproval = requiredChecks.every((c) => c.ok)
  const approvalBlockers = requiredChecks.filter((c) => !c.ok)
  const canSendEstimationRequest = grand > 0 && !estimatorMissing

  const assignEstimator = (estimatorId: string) => {
    patchOpportunity(opp.id, { estimatorId: estimatorId || null })
    if (estimatorId) {
      logActivity(
        opp.id,
        'system',
        `Estimator assigned: ${userById[estimatorId]?.name ?? estimatorId}.`,
      )
    }
  }

  const sendEstimationRequest = () => {
    if (!est || !canSendEstimationRequest) return
    patch({ status: 'pending_approval' })
    if (opp.stage === 'estimate_in_progress' || opp.stage === 'site_visit_completed') {
      moveStage(opp.id, 'estimate_ready')
    }
    const name = userById[opp.estimatorId!]?.name ?? 'assigned estimator'
    logActivity(
      opp.id,
      'system',
      `Estimation request sent — approval pending with ${name}.`,
    )
  }

  const createEstimate = () => {
    const nextPack = estimatePackFor(opp.category, estimatePacks)
    const nextSuggestion = suggestFloorSystem(
      opp.category,
      siteVisit?.requests ?? [],
      siteVisit?.values ?? {},
      estimatePacks,
    )
    upsertEstimate({
      id: uid('est'),
      opportunityId: opp.id,
      options: [{ id: uid('eo'), label: 'Scope 1', kind: 'scope', recommended: true, lineItems: [] }],
      templateId: nextPack.templateId,
      internalNotes: '',
      status: 'draft',
      approvedById: null,
      approvedAt: null,
      rejectionNote: null,
      sentAt: null,
      signedAt: null,
      signedBy: null,
      token: proposalTokenFor(opp.id),
      depositPct: nextPack.depositPct,
      estimateRemindersDone: [],
      suggestedPriceBookId: nextSuggestion.priceBookId,
      suggestionDecision: 'pending',
    })
  }

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

  const lineFromPriceBook = (priceBookId: string, qtyOverride?: number): LineItem | null => {
    const pb = priceBookById[priceBookId]
    if (!pb) return null
    const qty =
      qtyOverride ??
      (['visit', 'unit', 'day', 'each'].includes(pb.unit)
        ? 1
        : pb.id === 'svc_access_equipment'
          ? opp.secondaryQuantity || 1
          : opp.estimatedQuantity || 1)
    return {
      id: uid('li'),
      priceBookId: pb.id,
      name: pb.name,
      description: pb.description,
      qty,
      unit: pb.unit,
      unitPrice: pb.unitPrice,
    }
  }

  const addLine = (optionId: string, priceBookId: string) => {
    if (!est) return
    const line = lineFromPriceBook(priceBookId)
    if (!line) return
    setOptions(est.options.map((o) => (o.id === optionId ? { ...o, lineItems: [...o.lineItems, line] } : o)))
    setPickerFor(null)
    setOverridePicker(false)
  }

  const acceptSuggestedSystem = () => {
    if (!est || !suggestion) return
    const requests = siteVisit?.requests?.filter((r) => r.quantity > 0) ?? []
    const targetId = est.options[0]?.id ?? uid('eo')
    let options = est.options
    if (options.length === 0) {
      options = [{ id: targetId, label: 'Scope 1', kind: 'scope', recommended: true, lineItems: [] }]
    }
    const lines: LineItem[] =
      requests.length > 0
        ? requests
            .map((r) => lineFromPriceBook(suggestion.priceBookId, r.quantity))
            .filter((l): l is LineItem => Boolean(l))
            .map((l, i) => ({
              ...l,
              id: uid('li'),
              name: `${l.name} — ${requests[i].areaOrEquipment || `Area ${i + 1}`}`,
              description: requests[i].concernOrOutcome
                ? `${l.description}\n\nScope: ${requests[i].concernOrOutcome}`
                : l.description,
              unit: requests[i].unit || l.unit,
            }))
        : (() => {
            const line = lineFromPriceBook(suggestion.priceBookId)
            return line ? [line] : []
          })()

    const nextOptions = options.map((o, idx) =>
      idx === 0 ? { ...o, lineItems: [...o.lineItems, ...lines] } : o,
    )
    updateEstimate(est.id, {
      options: nextOptions,
      suggestedPriceBookId: suggestion.priceBookId,
      suggestionDecision: 'accepted',
      templateId: pack?.templateId ?? est.templateId,
      depositPct: pack?.depositPct ?? est.depositPct,
    })
  }

  const overrideSuggestedSystem = (priceBookId: string) => {
    if (!est) return
    const line = lineFromPriceBook(priceBookId)
    if (!line) return
    const options =
      est.options.length > 0
        ? est.options.map((o, idx) =>
            idx === 0 ? { ...o, lineItems: [...o.lineItems, line] } : o,
          )
        : [{ id: uid('eo'), label: 'Scope 1', kind: 'scope' as const, recommended: true, lineItems: [line] }]
    updateEstimate(est.id, {
      options,
      suggestedPriceBookId: priceBookId,
      suggestionDecision: 'overridden',
    })
    setOverridePicker(false)
    setPickerFor(null)
  }

  const toggleReminder = (reminderId: string) => {
    if (!est) return
    const done = est.estimateRemindersDone ?? []
    patch({
      estimateRemindersDone: done.includes(reminderId)
        ? done.filter((id) => id !== reminderId)
        : [...done, reminderId],
    })
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
    <div className="flex h-full flex-col bg-surface-sunken">
      <header className="shrink-0 border-b border-strong bg-surface-raised px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/opportunities/${opp.id}?tab=estimates`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-strong text-secondary hover:bg-surface-inset hover:text-primary"
            aria-label="Back to opportunity"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-xl leading-tight text-primary">{opp.name}</h1>
              {est && (
                <Badge
                  tone={
                    est.status === 'signed'
                      ? 'success'
                      : est.status === 'pending_approval'
                        ? 'attention'
                        : est.status === 'approved' || est.status === 'sent'
                          ? 'info'
                          : 'neutral'
                  }
                >
                  {est.status.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {account?.name} · <span className="font-mono">{opp.code}</span> · Estimate
              {opp.estimatedQuantity > 0 && ` · ${opp.estimatedQuantity.toLocaleString()} units`}
            </p>
          </div>

          {est && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-md border border-strong bg-burgundy-50 px-3 py-1.5 text-right">
                <p className="text-2xs font-semibold tracking-wider text-burgundy-700 uppercase">
                  Contract total
                </p>
                <p className="font-mono text-lg font-semibold text-burgundy-700 tabular">
                  {money(grand)}
                </p>
              </div>
              <Button onClick={() => setPreview(true)}>
                <FileSignature size={13} />
                Preview
              </Button>

              {est.status === 'draft' && (
                <Button
                  variant="primary"
                  disabled={!canSendEstimationRequest}
                  title={
                    estimatorMissing
                      ? 'Assign an estimator before sending the estimation request'
                      : grand === 0
                        ? 'Add line items before sending'
                        : undefined
                  }
                  onClick={sendEstimationRequest}
                >
                  <Send size={13} />
                  Send for approval
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
                    title={
                      readyForApproval
                        ? undefined
                        : `Complete before approving: ${approvalBlockers.map((c) => c.label).join(', ')}`
                    }
                    onClick={() => approveEstimate(est.id, viewer!.id)}
                  >
                    <ShieldCheck size={13} />
                    Approve
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
                <Link to={`/proposal/${proposalTokenFor(opp.id)}`} target="_blank">
                  <Button variant="primary">
                    <FileText size={13} />
                    Customer link
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="w-full space-y-4 p-4 md:p-5">
          {!est ? (
            <Card className="border-strong">
              <EmptyState
                icon={<Layers size={28} />}
                title="No estimate yet"
                description="Start from the estimating pack for this opportunity type. Reminders, price book, and a suggested floor system help you build the first draft."
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

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 space-y-4">
              {est.status === 'pending_approval' && (
                <Card className="border-(--accent-attention) bg-attention-soft/40 px-4 py-3">
                  <p className="flex items-center gap-2 text-base font-medium text-primary">
                    <ShieldCheck size={14} className="text-attention-text" />
                    Estimation request sent — approval pending
                    {opp.estimatorId && (
                      <span className="font-normal text-secondary">
                        with {userById[opp.estimatorId]?.name}
                      </span>
                    )}
                  </p>
                </Card>
              )}

              {est.status === 'approved' && (
                <Card className="border-(--status-success) bg-success-soft px-4 py-3">
                  <p className="flex items-center gap-2 text-base font-medium text-primary">
                    <CheckCircle2 size={14} className="text-success-text" />
                    Approved by {userById[est.approvedById ?? '']?.name}. Ready to send to the
                    customer.
                  </p>
                </Card>
              )}

              {suggestion && (est.suggestionDecision ?? 'pending') === 'pending' && (
                <Card className="border-(--accent-attention) border-strong bg-attention-soft/30">
                  <CardHeader
                    title="Suggested floor system"
                    subtitle="Based on opportunity type and what was gathered at the visit / call. Accept to build lines from scope requests, or override."
                    icon={<Sparkles size={14} />}
                    actions={
                      <Badge tone="attention">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </Badge>
                    }
                  />
                  <div className="space-y-3 p-4">
                    {(() => {
                      const pb = priceBookById[suggestion.priceBookId]
                      if (!pb) return <p className="text-sm text-muted">Suggested system not in price book.</p>
                      return (
                        <div className="flex items-start gap-3 rounded-md border border-strong bg-surface-raised px-3 py-2.5">
                          <span
                            className="mt-0.5 h-8 w-8 shrink-0 rounded-sm border border-strong"
                            style={{ background: pb.swatch }}
                          />
                          <div className="min-w-0">
                            <p className="text-base font-medium text-primary">{pb.name}</p>
                            <p className="text-sm text-muted">
                              {pb.catalogueGroup} · {money(pb.unitPrice)} / {pb.unit}
                            </p>
                            <p className="mt-1.5 text-sm text-secondary">{suggestion.rationale}</p>
                          </div>
                        </div>
                      )
                    })()}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="primary" onClick={acceptSuggestedSystem}>
                        <CheckCircle2 size={13} />
                        Accept suggestion
                      </Button>
                      <Button onClick={() => setOverridePicker(true)}>
                        Override — pick from price book
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => patch({ suggestionDecision: 'dismissed' })}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {suggestion && est.suggestionDecision && est.suggestionDecision !== 'pending' && (
                <Card className="px-4 py-3">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-secondary">
                    <Sparkles size={13} className="text-attention-text" />
                    Floor system{' '}
                    {est.suggestionDecision === 'accepted'
                      ? 'accepted'
                      : est.suggestionDecision === 'overridden'
                        ? 'manually overridden'
                        : 'dismissed'}
                    {est.suggestedPriceBookId && priceBookById[est.suggestedPriceBookId] && (
                      <>
                        :{' '}
                        <span className="font-medium text-primary">
                          {priceBookById[est.suggestedPriceBookId].name}
                        </span>
                      </>
                    )}
                    {est.suggestionDecision !== 'accepted' && (
                      <Button size="sm" variant="ghost" onClick={() => patch({ suggestionDecision: 'pending' })}>
                        Revisit suggestion
                      </Button>
                    )}
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

              {est.options.map((opt) => (
                <Card key={opt.id} className="overflow-hidden border-strong">
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
                        className="w-full max-w-md border-b border-transparent bg-transparent font-display text-lg font-semibold text-primary hover:border-strong focus:border-action focus:outline-none"
                      />
                    }
                    subtitle={
                      opt.kind === 'scope'
                        ? 'Distinct section of work — adds to the contract total'
                        : 'Pricing alternative — customer picks one; does not stack into the total'
                    }
                    actions={
                      <>
                        <Badge tone={opt.kind === 'scope' ? 'info' : 'attention'}>
                          {opt.kind === 'scope' ? 'Scope' : 'Alternative'}
                        </Badge>
                        <Button
                          size="sm"
                          variant={opt.recommended ? 'primary' : 'secondary'}
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

                  {opt.lineItems.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-muted">No line items yet.</p>
                      <Button
                        size="sm"
                        variant="primary"
                        className="mt-3"
                        onClick={() => setPickerFor(opt.id)}
                      >
                        <Plus size={12} />
                        Add from price book
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="hidden border-b border-subtle bg-surface-inset px-4 py-2 sm:grid sm:grid-cols-12 sm:gap-2">
                        <p className="col-span-5 text-2xs font-semibold tracking-wider text-muted uppercase">
                          Item
                        </p>
                        <p className="col-span-2 text-right text-2xs font-semibold tracking-wider text-muted uppercase">
                          Qty
                        </p>
                        <p className="col-span-2 text-right text-2xs font-semibold tracking-wider text-muted uppercase">
                          Unit price
                        </p>
                        <p className="col-span-2 text-right text-2xs font-semibold tracking-wider text-muted uppercase">
                          Line total
                        </p>
                        <p className="col-span-1" />
                      </div>
                      <div className="divide-y divide-(--border-subtle)">
                        {opt.lineItems.map((li) => (
                          <div
                            key={li.id}
                            className="bg-surface-raised px-4 py-3 hover:bg-burgundy-50/40"
                          >
                            <div className="grid grid-cols-12 items-center gap-2">
                              <div className="col-span-12 min-w-0 sm:col-span-5">
                                <p className="truncate text-base font-semibold text-primary">
                                  {li.name}
                                </p>
                              </div>
                              <div className="col-span-4 sm:col-span-2">
                                <label className="mb-1 block text-2xs font-semibold text-muted uppercase sm:sr-only">
                                  Qty
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    type="number"
                                    value={li.qty}
                                    onChange={(e) =>
                                      patchLine(opt.id, li.id, { qty: Number(e.target.value) })
                                    }
                                    className="border-strong bg-surface-inset text-right font-medium"
                                  />
                                  <span className="shrink-0 text-2xs font-medium text-secondary">
                                    {li.unit}
                                  </span>
                                </div>
                              </div>
                              <div className="col-span-4 sm:col-span-2">
                                <label className="mb-1 block text-2xs font-semibold text-muted uppercase sm:sr-only">
                                  Unit price
                                </label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={li.unitPrice}
                                  onChange={(e) =>
                                    patchLine(opt.id, li.id, {
                                      unitPrice: Number(e.target.value),
                                    })
                                  }
                                  className="border-strong bg-surface-inset text-right font-medium"
                                />
                              </div>
                              <div className="col-span-3 text-right sm:col-span-2">
                                <label className="mb-1 block text-2xs font-semibold text-muted uppercase sm:sr-only">
                                  Total
                                </label>
                                <p className="font-mono text-base font-semibold text-primary tabular">
                                  {money(li.qty * li.unitPrice)}
                                </p>
                              </div>
                              <div className="col-span-1 flex justify-end">
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
                            <div className="mt-2 grid grid-cols-12 gap-2">
                              <div className="col-span-12">
                                <label className="mb-1 block text-2xs font-semibold tracking-wider text-muted uppercase">
                                  Description
                                </label>
                                <textarea
                                  value={li.description}
                                  onChange={(e) =>
                                    patchLine(opt.id, li.id, { description: e.target.value })
                                  }
                                  rows={2}
                                  className="w-full resize-none rounded-md border border-strong bg-surface-inset px-2 py-1.5 text-sm leading-snug text-secondary focus:border-action focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between gap-2 border-t border-strong bg-surface-inset px-4 py-2.5">
                    <Button size="sm" variant="primary" onClick={() => setPickerFor(opt.id)}>
                      <Plus size={12} />
                      Add from price book
                    </Button>
                    <div className="text-right">
                      <p className="text-2xs font-semibold tracking-wider text-muted uppercase">
                        Section total
                      </p>
                      <p className="font-mono text-md font-semibold text-primary tabular">
                        {money(optionTotal(opt.lineItems))}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}

              <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-strong bg-surface-raised px-3 py-3">
                <Button variant="secondary" onClick={() => addOption('scope')}>
                  <Plus size={13} />
                  Add scope section
                </Button>
                <Button variant="secondary" onClick={() => addOption('alternative')}>
                  <Plus size={13} />
                  Add pricing alternative
                </Button>
              </div>

              {/* ---- What the price book brought with it ---- */}
              {selectedCatalogueItems.length > 0 && (
                <>
                  <SectionTitle className="mt-2">
                    Automatically attached by the price book
                  </SectionTitle>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Card className="overflow-hidden border-strong">
                      <CardHeader title="Service documentation" icon={<FileText size={14} />} />
                      <ul className="space-y-1.5 p-4">
                        {selectedCatalogueItems.map((pb) => (
                          <li key={pb.id} className="flex items-start gap-2 text-sm">
                            <span
                              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-xs border border-strong"
                              style={{ background: pb.swatch }}
                            />
                            <span>
                              <span className="font-medium text-primary">{pb.serviceDocument}</span>
                              <span className="block text-muted">
                                {pb.resourceMultiplier} resource factor
                                {pb.resourceMultiplier === 1 ? '' : 's'} · {pb.materialRate}{' '}
                                {pb.materialUnit}/{pb.unit} ·{' '}
                                {Math.round(pb.contingencyAllowance * 100)}% waste allowance
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Card>

                    <Card className="overflow-hidden border-strong">
                      <CardHeader title="Required resources" icon={<Truck size={14} />} />
                      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 p-4 text-sm text-secondary">
                        {[...new Set(selectedCatalogueItems.flatMap((pb) => pb.requiredResources))].map(
                          (item) => (
                            <li key={item} className="flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-burgundy-500" />
                              {item}
                            </li>
                          ),
                        )}
                      </ul>
                    </Card>

                    <Card className="overflow-hidden border-strong">
                      <CardHeader
                        title="Exclusions carried onto the proposal"
                        icon={<XCircle size={14} />}
                      />
                      <ul className="space-y-1 p-4 text-sm text-secondary">
                        {[...new Set(selectedCatalogueItems.flatMap((pb) => pb.exclusions))].map(
                          (e) => (
                            <li key={e} className="flex items-start gap-1.5">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-burgundy-500" />
                              {e}
                            </li>
                          ),
                        )}
                      </ul>
                    </Card>

                    <Card className="overflow-hidden border-strong">
                      <CardHeader title="Estimated resource requirement" icon={<Package size={14} />} />
                      <ul className="space-y-1 p-4 text-sm">
                        {selectedCatalogueItems
                          .filter((pb) => pb.materialRate > 0)
                          .map((pb) => {
                            const qty = ['visit', 'unit', 'day', 'each'].includes(pb.unit)
                              ? 1
                              : pb.id === 'svc_access_equipment'
                                ? opp.secondaryQuantity || 1
                                : opp.estimatedQuantity
                            const total = Math.ceil(
                              qty *
                                pb.materialRate *
                                Math.max(1, pb.resourceMultiplier) *
                                (1 + pb.contingencyAllowance),
                            )
                            return (
                              <li key={pb.id} className="flex items-center justify-between gap-2">
                                <span className="truncate text-secondary">{pb.name}</span>
                                <span className="shrink-0 font-mono font-medium text-primary tabular">
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
              <SectionTitle className="mt-2">Proposal setup</SectionTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                <Card className="border-strong p-4">
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

                <Card className="border-strong p-4">
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
                </div>

                <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
                  <Card
                    className={cn(
                      'overflow-hidden border-strong',
                      estimatorMissing && 'border-(--status-warning) bg-warning-soft/40',
                    )}
                  >
                    <CardHeader
                      title="Estimator"
                      subtitle={
                        estimatorMissing
                          ? 'Required before sending for approval'
                          : 'Owns this estimate'
                      }
                      icon={<UserPlus size={14} />}
                      actions={
                        estimatorMissing ? (
                          <Badge tone="warning">Missing</Badge>
                        ) : (
                          <Badge tone="success">Assigned</Badge>
                        )
                      }
                    />
                    <div className="p-3">
                      <Select
                        value={opp.estimatorId ?? ''}
                        onChange={(e) => assignEstimator(e.target.value)}
                      >
                        <option value="">Select estimator…</option>
                        {estimators.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                            {u.role !== 'estimator' ? ` (${u.role})` : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </Card>

                  {pack && (
                    <Card className="overflow-hidden border-strong">
                      <CardHeader
                        title={pack.label}
                        subtitle={CATEGORY_LABEL[opp.category]}
                        icon={<FileText size={14} />}
                        actions={<Badge tone="info">{CATEGORY_LABEL[opp.category]}</Badge>}
                      />
                      <div className="space-y-3 p-3">
                        <div>
                          <p className="mb-2 text-2xs font-semibold tracking-wider text-muted uppercase">
                            Reminders ({(est.estimateRemindersDone ?? []).length}/
                            {pack.reminders.length})
                          </p>
                          <div className="space-y-2">
                            {pack.reminders.map((r) => (
                              <Checkbox
                                key={r.id}
                                checked={(est.estimateRemindersDone ?? []).includes(r.id)}
                                onChange={() => toggleReminder(r.id)}
                                label={r.label}
                                description={r.helper}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="rounded-md border border-subtle bg-surface-inset px-2.5 py-2">
                          <p className="text-2xs font-semibold tracking-wider text-muted uppercase">
                            Price book
                          </p>
                          <p className="mt-1 text-sm text-secondary">
                            {categoryPriceBook.length} items ·{' '}
                            {templateById[pack.templateId]?.name ?? pack.templateId}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {est.status === 'pending_approval' && (
                    <Card className="overflow-hidden border-strong">
                      <CardHeader
                        title="Approval checks"
                        subtitle="Required items must pass"
                        icon={<ShieldCheck size={14} />}
                        actions={
                          <Badge tone={readyForApproval ? 'success' : 'warning'}>
                            {requiredChecks.filter((c) => c.ok).length}/{requiredChecks.length}
                          </Badge>
                        }
                      />
                      <div className="space-y-1 p-2">
                        {requiredChecks.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-start gap-2 rounded-md px-2 py-1.5"
                          >
                            {c.ok ? (
                              <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success-text" />
                            ) : (
                              <XCircle size={13} className="mt-0.5 shrink-0 text-danger-text" />
                            )}
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  'text-sm',
                                  c.ok ? 'text-secondary' : 'font-medium text-primary',
                                )}
                              >
                                {c.label}
                              </p>
                              <p className="text-2xs text-muted">{c.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </aside>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---- Price book picker (add line or override suggestion) ---- */}
      <Modal
        open={Boolean(pickerFor) || overridePicker}
        onClose={() => {
          setPickerFor(null)
          setOverridePicker(false)
        }}
        size="lg"
        icon={<Layers size={17} />}
        title={overridePicker ? 'Override floor system' : 'Price book'}
        subtitle={
          overridePicker
            ? `Manual pick from the ${CATEGORY_LABEL[opp.category].toLowerCase()} price book. Spec, resources, and exclusions still attach automatically.`
            : `Showing ${CATEGORY_LABEL[opp.category].toLowerCase()}-eligible catalogue items. Selecting one pulls description, pricing, service document, resources and exclusions.`
        }
      >
        <div className="space-y-1.5">
          {categoryPriceBook.map((pb) => (
            <button
              key={pb.id}
              type="button"
              onClick={() => {
                if (overridePicker) overrideSuggestedSystem(pb.id)
                else if (pickerFor) addLine(pickerFor, pb.id)
              }}
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
        subtitle="Confirm who receives this proposal, then choose the channel and message."
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
                patch({
                  status: 'sent',
                  sentAt: new Date().toISOString(),
                  token: proposalTokenFor(opp.id),
                })
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
          <div className="sm:col-span-2 overflow-hidden rounded-md border border-strong bg-surface-raised">
            <div className="border-b border-subtle bg-surface-inset px-3 py-2">
              <p className="text-2xs font-semibold tracking-wider text-muted uppercase">
                Sending to
              </p>
            </div>
            <div className="grid gap-3 p-3 sm:grid-cols-2">
              <div className="min-w-0">
                <p className="text-2xs font-semibold tracking-wider text-muted uppercase">
                  Company
                </p>
                <p className="mt-0.5 truncate text-base font-semibold text-primary">
                  {account?.name ?? '—'}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-2xs font-semibold tracking-wider text-muted uppercase">
                  Contact
                </p>
                <p className="mt-0.5 truncate text-base font-semibold text-primary">
                  {account?.contactName ?? '—'}
                </p>
                {account?.contactTitle && (
                  <p className="truncate text-sm text-muted">{account.contactTitle}</p>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-2xs font-semibold tracking-wider text-muted uppercase">
                  Email
                </p>
                <p className="mt-0.5 truncate text-base font-medium text-primary">
                  {account?.email || 'No email on file'}
                </p>
                {sendChannel === 'email' && account?.email && (
                  <p className="mt-0.5 text-sm text-success-text">
                    Proposal will be emailed here
                  </p>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-2xs font-semibold tracking-wider text-muted uppercase">
                  Phone
                </p>
                <p className="mt-0.5 truncate text-base font-medium text-primary">
                  {account?.phone || 'No phone on file'}
                </p>
                {sendChannel === 'sms' && account?.phone && (
                  <p className="mt-0.5 text-sm text-success-text">
                    Proposal link will be texted here
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 rounded-md border border-subtle bg-surface-inset px-3 py-2.5 text-sm text-muted">
            Customer link:{' '}
            <span className="font-mono text-primary">/proposal/{est?.token}</span>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium tracking-wide text-secondary uppercase">
              Delivery channel
            </label>
            <Select
              value={sendChannel}
              onChange={(e) => setSendChannel(e.target.value as 'email' | 'sms')}
            >
              <option value="email">Email{account?.email ? ` · ${account.email}` : ''}</option>
              <option value="sms">SMS{account?.phone ? ` · ${account.phone}` : ''}</option>
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
