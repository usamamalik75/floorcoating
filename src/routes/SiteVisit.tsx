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
  FileUp,
  Plus,
  Save,
  Send,
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
  const ready = checklistOk && formOk && requestsOk

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

  const photos = artifacts.filter((a) => a.kind === 'photo')
  const plans = artifacts.filter((a) => a.kind === 'plan')
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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg text-primary">Scope requests</h2>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <FieldRow label="Template" className="min-w-64">
                    <Select
                      value={stored?.serviceTemplateId ?? ''}
                      onChange={(e) => applyServiceTemplate(e.target.value)}
                    >
                      <option value="" disabled>
                        Select service template…
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
                    onClick={() =>
                      setRequests((prev) => [...prev, emptyScopeRequest(`req_${Date.now()}`)])
                    }
                  >
                    <Plus size={12} />
                    Add request
                  </Button>
                </div>
              </div>
              <p className="mb-4 text-sm text-muted">
                Pick a company service template, then edit each surface — area, quantity, and unit.
              </p>
              <div className="space-y-4">
                {requests.map((req, index) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-subtle/50 bg-surface-sunken p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-primary">Request {index + 1}</p>
                      <div className="flex items-center gap-2">
                        {requestIsComplete(req) ? (
                          <Badge tone="success">Complete</Badge>
                        ) : (
                          <Badge tone="warning">Needs detail</Badge>
                        )}
                        {requests.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRequests((prev) => prev.filter((r) => r.id !== req.id))}
                          >
                            <Trash2 size={12} />
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
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
                                className="mt-2"
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
                            onChange={(e) => updateRequest(req.id, { serviceType: e.target.value })}
                            placeholder="e.g. Garage floor coating"
                          />
                        )}
                      </FieldRow>
                      <FieldRow label="Area / equipment / surface" required>
                        <Input
                          value={req.areaOrEquipment}
                          onChange={(e) =>
                            updateRequest(req.id, { areaOrEquipment: e.target.value })
                          }
                          placeholder="e.g. 3-car garage, Wash bay 308"
                        />
                      </FieldRow>
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
                        className="sm:col-span-2"
                      >
                        <Textarea
                          rows={2}
                          value={req.concernOrOutcome}
                          onChange={(e) =>
                            updateRequest(req.id, { concernOrOutcome: e.target.value })
                          }
                        />
                      </FieldRow>
                      <FieldRow label="Estimated quantity" required>
                        <Input
                          type="number"
                          value={req.quantity || ''}
                          onChange={(e) =>
                            updateRequest(req.id, { quantity: Number(e.target.value) || 0 })
                          }
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
                      <FieldRow label="Notes" className="sm:col-span-2">
                        <Input
                          value={req.notes ?? ''}
                          onChange={(e) => updateRequest(req.id, { notes: e.target.value })}
                          placeholder="Optional"
                        />
                      </FieldRow>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {currentSection && (
            <section className="mb-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg text-primary">{currentSection.title}</h2>
                {currentSection.allowCustomQuestions && (
                  <Button size="sm" onClick={() => addCustomQuestion(currentSection.id)}>
                    <Plus size={12} />
                    Add question
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {currentSection.fields.map((f) => (
                  <Field key={f.id} field={f} value={values[f.id]} onChange={(v) => set(f.id, v)} />
                ))}
              </div>
              {currentSection.allowCustomQuestions && (
                <div className="mt-4 space-y-3">
                  {sectionCustomQuestions(currentSection.id).length === 0 ? (
                    <p className="text-sm text-muted">
                      Add any extra questions you asked — capture the question and the answer.
                    </p>
                  ) : (
                    sectionCustomQuestions(currentSection.id).map((qa, index) => (
                      <div
                        key={qa.id}
                        className="rounded-xl border border-subtle/50 bg-surface-sunken p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
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
                        <div className="grid gap-3">
                          <FieldRow label="Question" required>
                            <Input
                              value={qa.question}
                              onChange={(e) =>
                                updateCustomQuestion(qa.id, { question: e.target.value })
                              }
                              placeholder="What did you ask?"
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
                            />
                          </FieldRow>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          {panel === 'media' && allowsPhotos && (
            <div className="mt-1 rounded-xl border border-subtle/50 bg-surface-sunken p-4">
              <h2 className="mb-1 font-display text-lg text-primary">Photos and documents</h2>
              <p className="mb-4 text-sm text-muted">
                Capture condition photos while you walk each request surface. Logged under what you
                gathered at this site visit.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
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
                  <Camera size={14} />
                  Capture photo
                </Button>
                <Button
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
                  <FileUp size={14} />
                  Upload plans
                </Button>
              </div>
              {(photos.length > 0 || plans.length > 0) && (
                <div className="mt-4 space-y-2">
                  {[...photos, ...plans].map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 rounded border border-subtle bg-surface-base p-2 text-sm font-medium text-secondary"
                    >
                      <CheckCircle2 size={14} className="shrink-0 text-success-text" />
                      <span className="truncate">{a.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {panel === 'gathered' && (
            <section className="space-y-4">
              <div>
                <h2 className="font-display text-lg text-primary">
                  What we gathered at this {vocab.singular}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Checklist, scope requests, answers
                  {allowsPhotos ? ', and photos' : ''} — one log for estimating.
                </p>
              </div>

              <GatheredBlock
                title="Checklist"
                empty="No checklist selected yet"
                count={`${checklistDone}/${checklistTotal} done`}
                isEmpty={checklistItems.length === 0}
              >
                <ul className="space-y-1.5">
                  {checklistItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        size={14}
                        className={cn(
                          'mt-0.5 shrink-0',
                          checklistInstance?.done.includes(item.id)
                            ? 'text-success-text'
                            : 'text-muted opacity-40',
                        )}
                      />
                      <span
                        className={
                          checklistInstance?.done.includes(item.id)
                            ? 'text-primary'
                            : 'text-muted'
                        }
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </GatheredBlock>

              <GatheredBlock
                title="Scope requests"
                empty="No scope requests yet"
                count={`${completeRequests.length} complete`}
                isEmpty={requests.length === 0}
              >
                <ul className="divide-y divide-subtle">
                  {requests.map((req, i) => (
                    <li key={req.id} className="py-2 first:pt-0 last:pb-0">
                      <p className="text-sm font-medium text-primary">
                        {i + 1}. {req.serviceType || 'Untitled'}
                      </p>
                      <p className="text-sm text-secondary">
                        {req.areaOrEquipment || '—'} · {req.quantity || 0} {req.unit}
                      </p>
                      {req.concernOrOutcome && (
                        <p className="mt-0.5 text-sm text-muted">{req.concernOrOutcome}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </GatheredBlock>

              <GatheredBlock
                title="Answers & questions"
                empty="No answers yet"
                count={`${answeredEntries.length + customQuestions.filter((q) => q.question.trim()).length} fields`}
                isEmpty={
                  answeredEntries.length === 0 &&
                  customQuestions.every((q) => !q.question.trim())
                }
              >
                <dl className="grid gap-2 sm:grid-cols-2">
                  {answeredEntries.map(([key, raw]) => {
                    const field = form.sections.flatMap((s) => s.fields).find((f) => f.id === key)
                    const value = typeof raw === 'boolean' ? (raw ? 'Yes' : 'No') : String(raw)
                    return (
                      <div key={key}>
                        <dt className="text-2xs font-semibold tracking-wider text-muted uppercase">
                          {field?.label ?? key}
                        </dt>
                        <dd className="text-sm text-primary">{value}</dd>
                      </div>
                    )
                  })}
                  {customQuestions
                    .filter((q) => q.question.trim())
                    .map((qa) => {
                      const sectionTitle =
                        form.sections.find((s) => s.id === qa.sectionId)?.title ?? 'Extra'
                      return (
                        <div key={qa.id} className="sm:col-span-2">
                          <dt className="text-2xs font-semibold tracking-wider text-muted uppercase">
                            {sectionTitle} · {qa.question}
                          </dt>
                          <dd className="text-sm text-primary">{qa.answer || '—'}</dd>
                        </div>
                      )
                    })}
                </dl>
              </GatheredBlock>

              {allowsPhotos && (
                <GatheredBlock
                  title="Photos & documents"
                  empty="No photos or plans yet"
                  count={`${photos.length + plans.length}`}
                  isEmpty={photos.length + plans.length === 0}
                >
                  <ul className="space-y-1.5">
                    {[...photos, ...plans].map((a) => (
                      <li key={a.id} className="flex items-center gap-2 text-sm text-secondary">
                        <CheckCircle2 size={14} className="text-success-text" />
                        {a.name}
                      </li>
                    ))}
                  </ul>
                </GatheredBlock>
              )}

              {!allowsPhotos && (
                <p className="rounded-lg border border-subtle bg-surface-sunken px-3 py-2 text-sm text-muted">
                  Sales calls do not collect photos — answers and scope requests are the record.
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

function GatheredBlock({
  title,
  count,
  empty,
  children,
  isEmpty,
}: {
  title: string
  count: string
  empty: string
  children: ReactNode
  isEmpty?: boolean
}) {
  return (
    <div className="rounded-xl border border-subtle/50 bg-surface-sunken p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        <Badge tone="neutral">{count}</Badge>
      </div>
      {isEmpty ? <p className="text-sm text-muted">{empty}</p> : children}
    </div>
  )
}

function Field({
  field,
  value,
  onChange,
}: {
  field: SiteVisitField
  value: string | number | boolean | undefined
  onChange: (v: string | number | boolean) => void
}) {
  const label = (
    <span className="flex items-center gap-1.5">
      {field.label}
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
    </span>
  )

  if (field.type === 'boolean') {
    return (
      <div className={cn(field.helper && 'sm:col-span-2')}>
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
      required={field.required}
      hint={field.helper}
      className={field.type === 'longtext' ? 'sm:col-span-2' : undefined}
    >
      {field.type === 'select' ? (
        <Select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      ) : field.type === 'longtext' ? (
        <Textarea rows={3} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(value ?? '')}
          onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
        />
      )}
    </FieldRow>
  )
}
