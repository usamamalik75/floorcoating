import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileUp,
  HardHat,
  Plus,
  Ruler,
  Save,
  Send,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useArtifactsFor, useFormForCategory } from '@/store/selectors'
import { emptyScopeRequest, requestIsComplete, requiredFields } from '@/data/siteVisitForms'
import { resolveChecklistItems, visitChecklistTemplates } from '@/data/checklists'
import {
  preferredServiceTemplate,
  requestsFromServiceTemplate,
  visitServiceTemplates,
} from '@/data/serviceTemplates'
import { ACCOUNT_BY_ID } from '@/data/seed'
import type { ScopeRequest, SiteVisitCustomQA, SiteVisitField } from '@/domain/types'
import { SCOPE_UNITS, visitVocab } from '@/domain/types'
import { isVisitFormAvailable } from '@/domain/stages'
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  FieldRow,
  Input,
  Meter,
  Select,
  Textarea,
} from '@/components/ui'
import { cn } from '@/lib/cn'

type Panel = 'checklist' | 'requests' | `section:${number}` | 'media' | 'gathered'

/**
 * Guided site visit / sales call.
 * Everything captured here is logged under "What we gathered".
 * Sales calls do not collect photos.
 */
export function SiteVisit() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const opportunity = useStore((s) => s.opportunities.find((o) => o.id === id))
  const stored = useStore((s) => s.siteVisits.find((v) => v.opportunityId === id))
  const save = useStore((s) => s.saveSiteVisit)
  const toggleChecklistItem = useStore((s) => s.toggleChecklistItem)
  const assignVisitChecklist = useStore((s) => s.assignVisitChecklist)
  const assignVisitServiceTemplate = useStore((s) => s.assignVisitServiceTemplate)
  const addChecklistInstanceItem = useStore((s) => s.addChecklistInstanceItem)
  const removeChecklistInstanceItem = useStore((s) => s.removeChecklistInstanceItem)
  const addArtifact = useStore((s) => s.addArtifact)
  const viewerId = useStore((s) => s.viewerId)
  const artifacts = useArtifactsFor(id)
  const checklists = useStore((s) => s.checklists)
  const checklistTemplates = useStore((s) => s.checklistTemplates)
  const serviceTemplates = useStore((s) => s.serviceTemplates)

  const form = useFormForCategory(opportunity?.category)
  const allowsPhotos = opportunity?.category !== 'residential'
  const visitTemplates = useMemo(
    () => visitChecklistTemplates(checklistTemplates),
    [checklistTemplates],
  )
  const serviceVisitTemplates = useMemo(
    () => visitServiceTemplates(serviceTemplates),
    [serviceTemplates],
  )

  const checklistInstance = useMemo(() => {
    if (!opportunity) return undefined
    return checklists.find((c) => {
      if (c.opportunityId !== opportunity.id) return false
      return visitTemplates.some((t) => t.id === c.templateId)
    })
  }, [checklists, opportunity, visitTemplates])

  const checklistTemplate = visitTemplates.find((t) => t.id === checklistInstance?.templateId)
  const checklistItems = resolveChecklistItems(checklistInstance, checklistTemplate)

  const [values, setValues] = useState<Record<string, string | number | boolean>>({})
  const [requests, setRequests] = useState<ScopeRequest[]>([])
  const [customQuestions, setCustomQuestions] = useState<SiteVisitCustomQA[]>([])
  const [panel, setPanel] = useState<Panel>('checklist')
  const [newItemLabel, setNewItemLabel] = useState('')

  useEffect(() => {
    setValues(stored?.values ?? {})
    setRequests(stored?.requests?.length ? stored.requests : [emptyScopeRequest(`req_${Date.now()}`)])
    setCustomQuestions(stored?.customQuestions ?? [])
  }, [stored?.opportunityId])

  useEffect(() => {
    if (!opportunity || checklistInstance || visitTemplates.length === 0) return
    const preferred =
      visitTemplates.find((t) => t.category === opportunity.category) ?? visitTemplates[0]
    assignVisitChecklist(opportunity.id, preferred.id)
    // Only auto-assign once when this visit has no checklist yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot bootstrap
  }, [opportunity?.id])

  useEffect(() => {
    if (!opportunity || stored?.serviceTemplateId || serviceVisitTemplates.length === 0) return
    if (stored?.requests?.some((r) => r.serviceType.trim())) return
    const preferred = preferredServiceTemplate(serviceVisitTemplates, opportunity.category)
    if (!preferred) return
    assignVisitServiceTemplate(opportunity.id, preferred.id)
    const next = useStore.getState().siteVisits.find((v) => v.opportunityId === opportunity.id)
    if (next?.requests.length) setRequests(next.requests)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot bootstrap
  }, [opportunity?.id])

  const applyServiceTemplate = (templateId: string) => {
    if (!opportunity) return
    assignVisitServiceTemplate(opportunity.id, templateId)
    const next = useStore.getState().siteVisits.find((v) => v.opportunityId === opportunity.id)
    if (next) setRequests(next.requests)
    else {
      const tpl = serviceVisitTemplates.find((t) => t.id === templateId)
      if (tpl) setRequests(requestsFromServiceTemplate(tpl))
    }
  }

  const serviceOptions = useMemo(() => {
    const tpl = serviceVisitTemplates.find((t) => t.id === stored?.serviceTemplateId)
    return tpl?.lines.map((l) => l.serviceType) ?? []
  }, [serviceVisitTemplates, stored?.serviceTemplateId])

  const panels = useMemo(() => {
    if (!form) return [] as { id: Panel; label: string }[]
    const list: { id: Panel; label: string }[] = [
      { id: 'checklist', label: 'Checklist' },
      { id: 'requests', label: 'Scope requests' },
      ...form.sections.map((s, i) => ({ id: `section:${i}` as Panel, label: s.title })),
    ]
    if (allowsPhotos) list.push({ id: 'media', label: 'Photos' })
    list.push({ id: 'gathered', label: 'What we gathered' })
    return list
  }, [form, allowsPhotos])

  if (!opportunity || !form) {
    return <EmptyState title="Opportunity not found" className="h-full" />
  }

  const vocab = visitVocab(opportunity.category)

  if (!isVisitFormAvailable(opportunity.stage)) {
    return (
      <EmptyState
        className="h-full"
        title={`No ${vocab.singular} yet.`}
        description={`Schedule the ${vocab.singular} first. The form opens after the appointment is booked.`}
        action={
          <Link to={`/opportunities/${opportunity.id}?tab=overview`}>
            <Button variant="primary">
              <ArrowLeft size={14} />
              Back to opportunity
            </Button>
          </Link>
        }
      />
    )
  }

  const account = ACCOUNT_BY_ID[opportunity.accountId]
  const required = requiredFields(form)
  const answered = required.filter((f) => {
    const v = values[f.id]
    return v !== undefined && v !== '' && v !== null
  })
  const completeRequests = requests.filter(requestIsComplete)
  const checklistDone = checklistInstance?.done.length ?? 0
  const checklistTotal = checklistItems.length
  const checklistOk = checklistTotal === 0 || checklistDone === checklistTotal
  const formOk = required.length === 0 || answered.length === required.length
  const requestsOk = completeRequests.length > 0
  const photos = artifacts.filter((a) => a.kind === 'photo')
  const plans = artifacts.filter((a) => a.kind === 'plan')
  const mediaOk = !allowsPhotos || photos.length > 0 || plans.length > 0
  const ready = checklistOk && formOk && requestsOk && mediaOk

  const panelIndex = panels.findIndex((p) => p.id === panel)
  const set = (fieldId: string, v: string | number | boolean) =>
    setValues((prev) => ({ ...prev, [fieldId]: v }))

  const persist = (finish: boolean) => {
    save(opportunity.id, form.id, values, requests, finish, customQuestions)
    if (finish) navigate(`/opportunities/${opportunity.id}?tab=visits`)
  }

  const sectionCustomQuestions = (sectionId: string) =>
    customQuestions.filter((q) => q.sectionId === sectionId)

  const addCustomQuestion = (sectionId: string) => {
    setCustomQuestions((prev) => [
      ...prev,
      {
        id: `qa_${Date.now().toString(36)}`,
        sectionId,
        question: '',
        answer: '',
      },
    ])
  }

  const updateCustomQuestion = (id: string, patch: Partial<SiteVisitCustomQA>) => {
    setCustomQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const removeCustomQuestion = (id: string) => {
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const updateRequest = (reqId: string, patch: Partial<ScopeRequest>) => {
    setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, ...patch } : r)))
  }

  const sectionMatch = /^section:(\d+)$/.exec(panel)
  const currentSection = sectionMatch ? form.sections[Number(sectionMatch[1])] : null
  const answeredEntries = Object.entries(values).filter(([, v]) => v !== '' && v !== undefined)

  return (
    <div className="flex h-full overflow-hidden bg-surface-sunken">
      <div className="flex h-full w-full flex-col overflow-hidden bg-surface-base">
        <header className="flex shrink-0 flex-col gap-1 border-b border-subtle/50 bg-surface-chrome px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <Link
              to={`/opportunities/${opportunity.id}?tab=visits`}
              className="text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-display text-xl">{form.name}</h1>
          </div>
          <p className="ml-8 text-sm text-white/70">
            {account?.name} · {opportunity.address}
          </p>
          <p className="ml-8 text-xs text-white/50">
            Capture here — results show on the opportunity Visits tab.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-6 pb-8 scrollbar-thin">
          <div className="mb-5 rounded-xl border border-subtle/50 bg-surface-sunken p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-secondary">
                Checklist {checklistDone}/{checklistTotal}
                {' · '}
                {completeRequests.length} request{completeRequests.length === 1 ? '' : 's'}
                {' · '}
                Answers {answered.length}/{required.length}
                {allowsPhotos ? ` · ${photos.length} photos` : ''}
              </span>
              {ready ? (
                <Badge tone="success" icon={<CheckCircle2 size={12} />}>
                  Ready to submit
                </Badge>
              ) : (
                <Badge tone="warning">Incomplete</Badge>
              )}
            </div>
            <Meter
              value={checklistDone + completeRequests.length + answered.length}
              max={checklistTotal + Math.max(requests.length, 1) + required.length}
              tone={ready ? 'success' : 'attention'}
            />
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {panels.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPanel(p.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium',
                  'transition-colors duration-(--duration-fast)',
                  panel === p.id
                    ? 'border-action bg-action text-action-fg shadow-sm'
                    : 'border-subtle bg-surface-sunken text-secondary hover:border-strong hover:bg-surface-raised',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {panel === 'checklist' && (
            <section className="mb-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={18} className="text-brand" />
                  <h2 className="font-display text-lg text-primary">Checklist</h2>
                </div>
                <FieldRow label="Template" className="min-w-64">
                  <Select
                    value={checklistInstance?.templateId ?? ''}
                    onChange={(e) => assignVisitChecklist(opportunity.id, e.target.value)}
                  >
                    <option value="" disabled>
                      Select checklist template…
                    </option>
                    {visitTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.category ? ` (${t.category})` : ''}
                      </option>
                    ))}
                  </Select>
                </FieldRow>
              </div>
              <p className="mb-4 text-sm text-muted">
                Pick a company template, then add or remove items for this {vocab.singular}. Ticked
                items are logged under what you gathered.
              </p>
              {!checklistInstance ? (
                <EmptyState title="Select a checklist template to begin" />
              ) : (
                <div className="space-y-3 rounded-xl border border-subtle/50 bg-surface-sunken p-4">
                  {checklistItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Checkbox
                          checked={checklistInstance.done.includes(item.id)}
                          onChange={() =>
                            toggleChecklistItem(opportunity.id, checklistInstance.templateId, item.id)
                          }
                          label={item.label}
                          description={item.helper}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          removeChecklistInstanceItem(
                            opportunity.id,
                            checklistInstance.templateId,
                            item.id,
                          )
                        }
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-end gap-2 border-t border-subtle pt-3">
                    <FieldRow label="Add checklist item" className="min-w-56 flex-1">
                      <Input
                        value={newItemLabel}
                        onChange={(e) => setNewItemLabel(e.target.value)}
                        placeholder="e.g. Confirm HOA colour rules"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addChecklistInstanceItem(
                              opportunity.id,
                              checklistInstance.templateId,
                              newItemLabel,
                            )
                            setNewItemLabel('')
                          }
                        }}
                      />
                    </FieldRow>
                    <Button
                      size="sm"
                      onClick={() => {
                        addChecklistInstanceItem(
                          opportunity.id,
                          checklistInstance.templateId,
                          newItemLabel,
                        )
                        setNewItemLabel('')
                      }}
                    >
                      <Plus size={12} />
                      Add item
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {panel === 'requests' && (
            <section className="mb-5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3 rounded-md border border-strong bg-surface-raised px-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Ruler size={16} className="shrink-0 text-brand" />
                    <h2 className="font-display text-lg text-primary">Scope requests</h2>
                    <Badge tone={completeRequests.length > 0 ? 'success' : 'warning'}>
                      {completeRequests.length}/{requests.length} ready
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    One row per surface or area — service, quantity, and unit feed the estimate.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <FieldRow label="Service template" className="min-w-56">
                    <Select
                      value={stored?.serviceTemplateId ?? ''}
                      onChange={(e) => applyServiceTemplate(e.target.value)}
                    >
                      <option value="" disabled>
                        Select template…
                      </option>
                      {serviceVisitTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.category ? ` (${t.category})` : ''}
                        </option>
                      ))}
                    </Select>
                  </FieldRow>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      setRequests((prev) => [...prev, emptyScopeRequest(`req_${Date.now()}`)])
                    }
                  >
                    <Plus size={12} />
                    Add request
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                {requests.map((req, index) => {
                  const complete = requestIsComplete(req)
                  return (
                    <div
                      key={req.id}
                      className={cn(
                        'overflow-hidden rounded-md border bg-surface-raised',
                        complete
                          ? 'border-(--status-success)/40'
                          : 'border-strong',
                      )}
                    >
                      <div
                        className={cn(
                          'flex items-center justify-between gap-2 border-b px-3 py-2',
                          complete
                            ? 'border-(--status-success)/25 bg-success-soft/40'
                            : 'border-subtle bg-surface-inset',
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-xs font-semibold',
                              complete
                                ? 'bg-success-soft text-success-text'
                                : 'bg-action text-action-fg',
                            )}
                          >
                            {index + 1}
                          </span>
                          <p className="truncate text-sm font-semibold text-primary">
                            {req.serviceType.trim() || `Request ${index + 1}`}
                          </p>
                          <Badge tone={complete ? 'success' : 'warning'}>
                            {complete ? 'Complete' : 'Needs detail'}
                          </Badge>
                        </div>
                        {requests.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setRequests((prev) => prev.filter((r) => r.id !== req.id))
                            }
                          >
                            <Trash2 size={12} />
                            Remove
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3 p-3">
                        <div className="grid items-end gap-2.5 sm:grid-cols-[minmax(0,2.2fr)_minmax(0,2fr)_5.75rem_7.5rem]">
                          <FieldRow label="Service required" required>
                            {serviceOptions.length > 0 ? (
                              <>
                                <Select
                                  value={
                                    serviceOptions.includes(req.serviceType)
                                      ? req.serviceType
                                      : req.serviceType
                                        ? '__custom__'
                                        : ''
                                  }
                                  onChange={(e) => {
                                    if (e.target.value === '__custom__') {
                                      updateRequest(req.id, { serviceType: '' })
                                      return
                                    }
                                    const line = serviceVisitTemplates
                                      .find((t) => t.id === stored?.serviceTemplateId)
                                      ?.lines.find((l) => l.serviceType === e.target.value)
                                    updateRequest(req.id, {
                                      serviceType: e.target.value,
                                      ...(line
                                        ? {
                                            concernOrOutcome:
                                              line.concernOrOutcome || req.concernOrOutcome,
                                            unit: line.unit || req.unit,
                                            areaOrEquipment:
                                              line.areaOrEquipment || req.areaOrEquipment,
                                          }
                                        : {}),
                                    })
                                  }}
                                >
                                  <option value="" disabled>
                                    Select service…
                                  </option>
                                  {serviceOptions.map((name) => (
                                    <option key={name} value={name}>
                                      {name}
                                    </option>
                                  ))}
                                  <option value="__custom__">Other / custom…</option>
                                </Select>
                                {!serviceOptions.includes(req.serviceType) && (
                                  <Input
                                    className="mt-1.5"
                                    value={req.serviceType}
                                    onChange={(e) =>
                                      updateRequest(req.id, { serviceType: e.target.value })
                                    }
                                    placeholder="Custom service name"
                                  />
                                )}
                              </>
                            ) : (
                              <Input
                                value={req.serviceType}
                                onChange={(e) =>
                                  updateRequest(req.id, { serviceType: e.target.value })
                                }
                                placeholder="e.g. Garage floor coating"
                              />
                            )}
                          </FieldRow>
                          <FieldRow label="Area / surface" required>
                            <Input
                              value={req.areaOrEquipment}
                              onChange={(e) =>
                                updateRequest(req.id, { areaOrEquipment: e.target.value })
                              }
                              placeholder="e.g. 3-car garage"
                            />
                          </FieldRow>
                          <FieldRow label="Qty" required>
                            <Input
                              type="number"
                              value={req.quantity || ''}
                              onChange={(e) =>
                                updateRequest(req.id, { quantity: Number(e.target.value) || 0 })
                              }
                              className="text-right"
                            />
                          </FieldRow>
                          <FieldRow label="Unit" required>
                            <Select
                              value={req.unit}
                              onChange={(e) => updateRequest(req.id, { unit: e.target.value })}
                            >
                              {SCOPE_UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </Select>
                          </FieldRow>
                        </div>

                        <div className="grid items-start gap-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                          <FieldRow
                            label={
                              <span className="flex items-center gap-1.5">
                                Concern or desired outcome
                                <span className="inline-flex items-center gap-0.5 rounded-xs bg-attention-soft px-1 text-2xs font-medium text-attention-text normal-case">
                                  <Calculator size={8} />
                                  estimate
                                </span>
                              </span>
                            }
                            required
                          >
                            <Textarea
                              rows={2}
                              value={req.concernOrOutcome}
                              onChange={(e) =>
                                updateRequest(req.id, { concernOrOutcome: e.target.value })
                              }
                              placeholder="What needs fixing or what result they want"
                            />
                          </FieldRow>
                          <FieldRow label="Notes">
                            <Textarea
                              rows={2}
                              value={req.notes ?? ''}
                              onChange={(e) => updateRequest(req.id, { notes: e.target.value })}
                              placeholder="Optional"
                            />
                          </FieldRow>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {currentSection && (
            <section className="mb-4 space-y-2">
              {(() => {
                const sectionRequired = currentSection.fields.filter((f) => f.required)
                const sectionAnswered = sectionRequired.filter((f) => {
                  const v = values[f.id]
                  return v !== undefined && v !== '' && v !== null
                })
                const sectionDone =
                  sectionRequired.length === 0 || sectionAnswered.length === sectionRequired.length
                const SectionIcon =
                  currentSection.id.includes('operations') ||
                  currentSection.title.toLowerCase().includes('safety')
                    ? ShieldAlert
                    : currentSection.id.includes('customer') ||
                        currentSection.title.toLowerCase().includes('commercial')
                      ? HardHat
                      : ClipboardList

                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-strong bg-surface-raised px-3 py-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <SectionIcon size={15} className="shrink-0 text-brand" />
                        <h2 className="font-display text-lg text-primary">
                          {currentSection.title}
                        </h2>
                        <Badge tone={sectionDone ? 'success' : 'warning'}>
                          {sectionAnswered.length}/{sectionRequired.length || sectionAnswered.length}{' '}
                          required
                        </Badge>
                      </div>
                      {currentSection.allowCustomQuestions && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => addCustomQuestion(currentSection.id)}
                        >
                          <Plus size={12} />
                          Add question
                        </Button>
                      )}
                    </div>

                    <div className="overflow-hidden rounded-md border border-strong bg-surface-raised">
                      <div className="divide-y divide-(--border-subtle)">
                        {groupSectionFields(currentSection.fields).map((row, rowIndex) => (
                          <div
                            key={row.map((f) => f.id).join('-') || rowIndex}
                            className={cn(
                              'bg-surface-raised px-3 py-2',
                              row.length > 1 && 'grid gap-3 sm:grid-cols-2',
                            )}
                          >
                            {row.map((f) => {
                              const answered =
                                values[f.id] !== undefined &&
                                values[f.id] !== '' &&
                                values[f.id] !== null
                              return (
                                <div
                                  key={f.id}
                                  className={cn(
                                    f.type === 'boolean' && 'flex items-center',
                                    f.id === 'operating_hours' && 'max-w-xs',
                                  )}
                                >
                                  <Field
                                    field={f}
                                    value={values[f.id]}
                                    onChange={(v) => set(f.id, v)}
                                    compact
                                    status={
                                      f.required
                                        ? answered
                                          ? 'answered'
                                          : 'required'
                                        : undefined
                                    }
                                  />
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {currentSection.allowCustomQuestions && (
                      <div className="space-y-2.5">
                        <p className="text-xs font-semibold tracking-wider text-muted uppercase">
                          Extra questions asked on site
                        </p>
                        {sectionCustomQuestions(currentSection.id).length === 0 ? (
                          <div className="rounded-md border border-dashed border-strong bg-surface-inset px-3 py-4 text-center">
                            <p className="text-sm text-muted">
                              No extra questions yet. Add any Q&amp;A that is not in the standard form.
                            </p>
                          </div>
                        ) : (
                          sectionCustomQuestions(currentSection.id).map((qa, index) => (
                            <div
                              key={qa.id}
                              className="overflow-hidden rounded-md border border-strong bg-surface-raised"
                            >
                              <div className="flex items-center justify-between gap-2 border-b border-subtle bg-surface-inset px-3 py-2">
                                <p className="text-sm font-semibold text-primary">
                                  Extra question {index + 1}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeCustomQuestion(qa.id)}
                                >
                                  <Trash2 size={12} />
                                  Remove
                                </Button>
                              </div>
                              <div className="grid gap-2.5 p-3 sm:grid-cols-2">
                                <FieldRow label="Question" required>
                                  <Input
                                    value={qa.question}
                                    onChange={(e) =>
                                      updateCustomQuestion(qa.id, { question: e.target.value })
                                    }
                                    placeholder="What did you ask?"
                                    className="border-strong bg-surface-inset"
                                  />
                                </FieldRow>
                                <FieldRow label="Answer" required>
                                  <Textarea
                                    rows={2}
                                    value={qa.answer}
                                    onChange={(e) =>
                                      updateCustomQuestion(qa.id, { answer: e.target.value })
                                    }
                                    placeholder="What was the answer?"
                                    className="border-strong bg-surface-inset"
                                  />
                                </FieldRow>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )
              })()}
            </section>
          )}

          {panel === 'media' && allowsPhotos && (
            <section className="mb-5 space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-strong bg-surface-raised px-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Camera size={16} className="shrink-0 text-brand" />
                    <h2 className="font-display text-lg text-primary">Photos and documents</h2>
                    <Badge tone={photos.length + plans.length > 0 ? 'success' : 'warning'}>
                      {photos.length + plans.length} attached
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    Capture condition photos while you walk each surface. Plans help estimating
                    when the building is new or unfinished.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      addArtifact({
                        opportunityId: opportunity.id,
                        kind: 'photo',
                        name: `Site photo ${photos.length + 1}`,
                        stageAdded: opportunity.stage,
                        addedById: viewerId,
                        addedAt: new Date().toISOString(),
                        meta: 'Captured on visit',
                        photoPhase: 'before',
                      })
                    }
                  >
                    <Camera size={12} />
                    Capture photo
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      addArtifact({
                        opportunityId: opportunity.id,
                        kind: 'plan',
                        name: `Architectural set ${plans.length + 1}.pdf`,
                        stageAdded: opportunity.stage,
                        addedById: viewerId,
                        addedAt: new Date().toISOString(),
                        meta: 'Uploaded from the field',
                      })
                    }
                  >
                    <FileUp size={12} />
                    Upload plans
                  </Button>
                </div>
              </div>

              {photos.length + plans.length === 0 ? (
                <div className="rounded-md border border-dashed border-strong bg-surface-inset px-4 py-10 text-center">
                  <Camera size={28} className="mx-auto text-muted" />
                  <p className="mt-3 font-medium text-primary">No photos or plans yet</p>
                  <p className="mt-1 text-sm text-muted">
                    Add at least one photo or plan set for commercial and industrial visits.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-strong bg-surface-raised">
                  <div className="grid gap-0 sm:grid-cols-2">
                    <div className="border-b border-subtle sm:border-r sm:border-b-0">
                      <div className="flex items-center justify-between border-b border-subtle bg-surface-inset px-3 py-2">
                        <p className="text-sm font-semibold text-primary">Site photos</p>
                        <Badge tone="neutral">{photos.length}</Badge>
                      </div>
                      {photos.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-muted">No photos captured yet.</p>
                      ) : (
                        <ul className="divide-y divide-(--border-subtle)">
                          {photos.map((a) => (
                            <li
                              key={a.id}
                              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-primary"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-burgundy-50 text-burgundy-600">
                                <Camera size={14} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{a.name}</p>
                                <p className="text-2xs text-muted">{a.meta ?? 'Captured on visit'}</p>
                              </div>
                              <Badge tone="success">Photo</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between border-b border-subtle bg-surface-inset px-3 py-2">
                        <p className="text-sm font-semibold text-primary">Plans &amp; documents</p>
                        <Badge tone="neutral">{plans.length}</Badge>
                      </div>
                      {plans.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-muted">No plans uploaded yet.</p>
                      ) : (
                        <ul className="divide-y divide-(--border-subtle)">
                          {plans.map((a) => (
                            <li
                              key={a.id}
                              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-primary"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-burgundy-50 text-burgundy-600">
                                <FileUp size={14} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{a.name}</p>
                                <p className="text-2xs text-muted">{a.meta ?? 'Uploaded'}</p>
                              </div>
                              <Badge tone="info">Plan</Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {panel === 'gathered' && (
            <section className="space-y-3">
              <div className="rounded-md border border-strong bg-surface-raised px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg text-primary">
                      What we gathered
                    </h2>
                    <p className="mt-0.5 text-sm text-muted">
                      Review everything captured on this {vocab.singular} before you submit.
                      Estimating uses this log — nothing is re-keyed.
                    </p>
                  </div>
                  <Badge
                    tone={ready ? 'success' : 'warning'}
                    icon={ready ? <CheckCircle2 size={12} /> : undefined}
                  >
                    {ready ? 'Ready to submit' : 'Still incomplete'}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <GatheredStat
                    label="Checklist"
                    value={`${checklistDone}/${checklistTotal || '—'}`}
                    ok={checklistOk}
                  />
                  <GatheredStat
                    label="Scope requests"
                    value={`${completeRequests.length} complete`}
                    ok={requestsOk}
                  />
                  <GatheredStat
                    label="Required answers"
                    value={`${answered.length}/${required.length || '—'}`}
                    ok={formOk}
                  />
                </div>
              </div>

              <GatheredBlock
                title="Checklist"
                icon={<ClipboardCheck size={14} />}
                count={`${checklistDone} of ${checklistTotal} done`}
                empty="No checklist selected yet — go back to Checklist to pick a template."
                isEmpty={checklistItems.length === 0}
              >
                <ul className="divide-y divide-(--border-subtle)">
                  {checklistItems.map((item) => {
                    const done = checklistInstance?.done.includes(item.id) ?? false
                    return (
                      <li key={item.id} className="flex items-start gap-2.5 px-3 py-2">
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
                          {item.helper && (
                            <p className="mt-0.5 text-2xs text-muted">{item.helper}</p>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </GatheredBlock>

              <GatheredBlock
                title="Scope requests"
                icon={<Ruler size={14} />}
                count={`${completeRequests.length} of ${requests.length} ready for estimate`}
                empty="No scope requests yet — add at least one complete request."
                isEmpty={requests.length === 0}
              >
                <div className="space-y-2 p-3">
                  {requests.map((req, i) => {
                    const complete = requestIsComplete(req)
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
                          <GatheredField label="Area / surface" value={req.areaOrEquipment || '—'} />
                          <GatheredField
                            label="Quantity"
                            value={
                              req.quantity > 0 ? `${req.quantity} ${req.unit}` : 'Not set'
                            }
                          />
                          <GatheredField
                            label="Concern / outcome"
                            value={req.concernOrOutcome || '—'}
                            className="sm:col-span-3"
                          />
                          {req.notes?.trim() ? (
                            <GatheredField
                              label="Notes"
                              value={req.notes}
                              className="sm:col-span-3"
                            />
                          ) : null}
                        </dl>
                      </div>
                    )
                  })}
                </div>
              </GatheredBlock>

              <GatheredBlock
                title="Form answers"
                icon={<ClipboardList size={14} />}
                count={`${answeredEntries.length + customQuestions.filter((q) => q.question.trim()).length} captured`}
                empty="No answers yet — complete the form sections first."
                isEmpty={
                  answeredEntries.length === 0 &&
                  customQuestions.every((q) => !q.question.trim())
                }
              >
                <div className="space-y-3 p-3">
                  {form.sections.map((sec) => {
                    const fields = sec.fields.filter((f) =>
                      answeredEntries.some(([k]) => k === f.id),
                    )
                    const sectionQs = customQuestions.filter(
                      (q) => q.sectionId === sec.id && q.question.trim(),
                    )
                    if (fields.length === 0 && sectionQs.length === 0) return null
                    return (
                      <div key={sec.id}>
                        <p className="mb-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
                          {sec.title}
                        </p>
                        <dl className="grid gap-2 rounded-md border border-subtle bg-surface-inset p-2.5 sm:grid-cols-2">
                          {fields.map((f) => {
                            const raw = values[f.id]
                            const value =
                              typeof raw === 'boolean' ? (raw ? 'Yes' : 'No') : String(raw)
                            return (
                              <GatheredField
                                key={f.id}
                                label={f.label}
                                value={`${value}${f.unit ? ` ${f.unit}` : ''}`}
                                className={f.type === 'longtext' ? 'sm:col-span-2' : undefined}
                              />
                            )
                          })}
                          {sectionQs.map((qa) => (
                            <GatheredField
                              key={qa.id}
                              label={qa.question}
                              value={qa.answer || '—'}
                              className="sm:col-span-2"
                            />
                          ))}
                        </dl>
                      </div>
                    )
                  })}
                </div>
              </GatheredBlock>

              {allowsPhotos ? (
                <GatheredBlock
                  title="Photos & documents"
                  icon={<Camera size={14} />}
                  count={`${photos.length + plans.length} attached`}
                  empty="No photos or plans yet — add them on the Photos step."
                  isEmpty={photos.length + plans.length === 0}
                >
                  <ul className="divide-y divide-(--border-subtle)">
                    {[...photos, ...plans].map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-primary"
                      >
                        {a.kind === 'plan' ? (
                          <FileUp size={14} className="shrink-0 text-muted" />
                        ) : (
                          <Camera size={14} className="shrink-0 text-muted" />
                        )}
                        <span className="min-w-0 truncate font-medium">{a.name}</span>
                        <Badge tone="neutral" className="ml-auto shrink-0">
                          {a.kind === 'plan' ? 'Plan' : 'Photo'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </GatheredBlock>
              ) : (
                <p className="rounded-md border border-subtle bg-surface-inset px-3 py-2.5 text-sm text-muted">
                  Sales calls do not collect photos. Checklist, scope, and answers are the full
                  record for estimating.
                </p>
              )}
            </section>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-subtle/50 bg-surface-base p-4">
          <Button
            disabled={panelIndex <= 0}
            onClick={() => setPanel(panels[Math.max(0, panelIndex - 1)].id)}
          >
            <ChevronLeft size={16} />
            Back
          </Button>
          {panelIndex < panels.length - 1 ? (
            <Button
              variant="primary"
              className="ml-auto"
              onClick={() => setPanel(panels[panelIndex + 1].id)}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          ) : (
            <>
              <Button className="ml-auto" onClick={() => persist(false)}>
                <Save size={16} />
                Save draft
              </Button>
              <Button variant="primary" disabled={!ready} onClick={() => persist(true)}>
                <Send size={16} />
                Submit {vocab.singular}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function GatheredStat({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-md border px-2.5 py-2',
        ok ? 'border-(--status-success)/30 bg-success-soft/35' : 'border-subtle bg-surface-inset',
      )}
    >
      <p className="text-2xs font-semibold tracking-wider text-muted uppercase">{label}</p>
      <p className={cn('mt-0.5 text-sm font-semibold', ok ? 'text-success-text' : 'text-primary')}>
        {value}
      </p>
    </div>
  )
}

function GatheredField({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-2xs font-semibold tracking-wider text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm leading-snug whitespace-normal text-primary">{value}</dd>
    </div>
  )
}

function GatheredBlock({
  title,
  icon,
  count,
  empty,
  children,
  isEmpty,
}: {
  title: string
  icon?: ReactNode
  count: string
  empty: string
  children: ReactNode
  isEmpty?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-md border border-strong bg-surface-raised">
      <div className="flex items-center justify-between gap-2 border-b border-subtle bg-surface-inset px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon && <span className="shrink-0 text-brand">{icon}</span>}
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
        </div>
        <Badge tone="neutral">{count}</Badge>
      </div>
      {isEmpty ? <p className="px-3 py-4 text-sm text-muted">{empty}</p> : children}
    </div>
  )
}

function groupSectionFields(fields: SiteVisitField[]): SiteVisitField[][] {
  const rows: SiteVisitField[][] = []
  let i = 0
  while (i < fields.length) {
    const field = fields[i]
    if (field.type === 'longtext') {
      rows.push([field])
      i += 1
      continue
    }
    // Pair short fields (checkbox / text / number / select) on one row.
    const row = [field]
    i += 1
    if (i < fields.length && fields[i].type !== 'longtext') {
      row.push(fields[i])
      i += 1
    }
    rows.push(row)
  }
  return rows
}

function Field({
  field,
  value,
  onChange,
  status,
  compact = false,
}: {
  field: SiteVisitField
  value: string | number | boolean | undefined
  onChange: (v: string | number | boolean) => void
  status?: 'required' | 'answered'
  compact?: boolean
}) {
  const label = (
    <span className="flex w-full flex-wrap items-center gap-1.5">
      <span className="min-w-0">{field.label}</span>
      {field.unit && <span className="text-muted normal-case">({field.unit})</span>}
      {field.feedsEstimate && (
        <span
          title="This answer writes straight onto the estimate"
          className="inline-flex items-center gap-0.5 rounded-xs bg-attention-soft px-1 text-2xs font-medium text-attention-text normal-case"
        >
          <Calculator size={8} />
          estimate
        </span>
      )}
      {status && (
        <Badge tone={status === 'answered' ? 'success' : 'warning'}>
          {status === 'answered' ? 'Answered' : 'Required'}
        </Badge>
      )}
    </span>
  )

  if (field.type === 'boolean') {
    return (
      <div
        className={cn(
          compact
            ? 'rounded-sm border border-strong bg-surface-inset px-2.5 py-1.5'
            : 'rounded-md border border-strong bg-surface-inset px-3 py-2.5',
        )}
      >
        <Checkbox
          checked={Boolean(value)}
          onChange={onChange}
          label={label}
          description={field.helper}
        />
      </div>
    )
  }

  return (
    <FieldRow
      label={label}
      required={field.required && !status}
      hint={compact ? undefined : field.helper}
      className={field.type === 'longtext' ? 'sm:col-span-2' : undefined}
    >
      {field.type === 'select' ? (
        <Select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="border-strong bg-surface-inset"
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      ) : field.type === 'longtext' ? (
        <Textarea
          rows={compact ? 2 : 3}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className="border-strong bg-surface-inset"
          placeholder="Enter details…"
        />
      ) : (
        <Input
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(value ?? '')}
          onChange={(e) =>
            onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)
          }
          className="border-strong bg-surface-inset"
          placeholder="Enter answer…"
        />
      )}
    </FieldRow>
  )
}
