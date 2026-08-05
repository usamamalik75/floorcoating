import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ClipboardCheck,
  FileSignature,
  ListChecks,
  Package,
} from 'lucide-react'
import type { Category, ChecklistTemplate, Location, SiteVisitForm } from '@/domain/types'
import { CATEGORY_LABEL } from '@/domain/types'
import type { EstimateCategoryPack } from '@/data/estimating'
import { franchiseHost, visibleFranchises } from '@/domain/org'
import { useStore } from '@/store/useStore'
import { useViewer } from '@/store/selectors'
import { Badge, Button, Card, CardHeader, FieldRow, Input, Modal, Select, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

type SetupArea = 'forms' | 'templates' | 'packs' | 'checklists'

const SETUP_AREAS: {
  id: SetupArea
  label: string
  description: string
  icon: typeof FileSignature
}[] = [
  {
    id: 'templates',
    label: 'Proposal templates',
    description: 'Deposit, validity, terms, and exclusions.',
    icon: FileSignature,
  },
  {
    id: 'packs',
    label: 'Estimating packs',
    description: 'Reminders and defaults by job type.',
    icon: Package,
  },
  {
    id: 'forms',
    label: 'Assessment forms',
    description: 'Fields captured during site visits.',
    icon: ListChecks,
  },
  {
    id: 'checklists',
    label: 'Checklists',
    description: 'Operational checklists for jobs and visits.',
    icon: ClipboardCheck,
  },
]

export function AdminBuilders() {
  const [area, setArea] = useState<SetupArea | null>(null)
  const active = SETUP_AREAS.find((item) => item.id === area)

  if (!area || !active) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-lg text-primary">Franchise setup</h2>
          <p className="mt-0.5 text-sm text-muted">Choose one area to configure. Keep changes simple and focused.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SETUP_AREAS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setArea(item.id)}
                className="rounded-lg border border-subtle bg-surface-raised p-4 text-left transition-colors hover:border-strong hover:bg-surface-inset"
              >
                <span className="mb-2 inline-flex rounded-md bg-surface-inset p-2 text-secondary">
                  <Icon size={16} />
                </span>
                <p className="font-medium text-primary">{item.label}</p>
                <p className="mt-0.5 text-sm text-muted">{item.description}</p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => setArea(null)}>
          <ArrowLeft size={13} />
          All setup
        </Button>
        <span className="text-sm text-muted">/</span>
        <span className="text-sm font-medium text-primary">{active.label}</span>
      </div>
      {area === 'forms' && <FormsBuilder />}
      {area === 'templates' && <ProposalTemplateBuilder />}
      {area === 'packs' && <EstimatingPackBuilder />}
      {area === 'checklists' && <ChecklistBuilder />}
    </div>
  )
}

function FormsBuilder() {
  const forms = useStore((s) => s.siteVisitForms)
  const upsert = useStore((s) => s.upsertSiteVisitForm)
  const [selectedId, setSelectedId] = useState(forms[0]?.id ?? '')
  const form = forms.find((candidate) => candidate.id === selectedId) ?? forms[0]

  if (!form) return null

  const updateForm = (next: SiteVisitForm) => upsert(next)

  return (
    <Card>
      <CardHeader
        title="Site visit form builder"
        subtitle="Edit the guided form labels and section structure used by the field and sales workflows."
        actions={
          <Select value={form.id} onChange={(e) => setSelectedId(e.target.value)} className="min-w-48">
            {forms.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </Select>
        }
      />
      <div className="space-y-3 p-4">
        <FieldRow label="Form name">
          <Input value={form.name} onChange={(e) => updateForm({ ...form, name: e.target.value })} />
        </FieldRow>
        {form.sections.map((section) => (
          <div key={section.id} className="rounded-md border border-subtle p-3">
            <FieldRow label="Section title">
              <Input
                value={section.title}
                onChange={(e) =>
                  updateForm({
                    ...form,
                    sections: form.sections.map((candidate) =>
                      candidate.id === section.id ? { ...candidate, title: e.target.value } : candidate,
                    ),
                  })
                }
              />
            </FieldRow>
            <div className="mt-3 space-y-2">
              {section.fields.map((field) => (
                <div key={field.id} className="grid gap-2 md:grid-cols-[1.2fr_0.8fr]">
                  <Input
                    value={field.label}
                    onChange={(e) =>
                      updateForm({
                        ...form,
                        sections: form.sections.map((candidate) =>
                          candidate.id === section.id
                            ? {
                                ...candidate,
                                fields: candidate.fields.map((candidateField) =>
                                  candidateField.id === field.id ? { ...candidateField, label: e.target.value } : candidateField,
                                ),
                              }
                            : candidate,
                        ),
                      })
                    }
                  />
                  <Input
                    value={field.helper ?? ''}
                    onChange={(e) =>
                      updateForm({
                        ...form,
                        sections: form.sections.map((candidate) =>
                          candidate.id === section.id
                            ? {
                                ...candidate,
                                fields: candidate.fields.map((candidateField) =>
                                  candidateField.id === field.id ? { ...candidateField, helper: e.target.value || undefined } : candidateField,
                                ),
                              }
                            : candidate,
                        ),
                      })
                    }
                    placeholder="Field help text"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ProposalTemplateBuilder() {
  const templates = useStore((s) => s.proposalTemplates)
  const upsert = useStore((s) => s.upsertProposalTemplate)
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? '')
  const template = templates.find((candidate) => candidate.id === selectedId) ?? templates[0]

  if (!template) return null

  return (
    <Card>
      <CardHeader
        title="Proposal template builder"
        subtitle="Control deposit requirements, validity, and customer-facing terms."
        actions={
          <Select value={template.id} onChange={(e) => setSelectedId(e.target.value)} className="min-w-48">
            {templates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </Select>
        }
      />
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <FieldRow label="Name">
          <Input value={template.name} onChange={(e) => upsert({ ...template, name: e.target.value })} />
        </FieldRow>
        <FieldRow label="Deposit %">
          <Input type="number" value={template.depositPct} onChange={(e) => upsert({ ...template, depositPct: Number(e.target.value) })} />
        </FieldRow>
        <FieldRow label="Valid days">
          <Input type="number" value={template.validDays} onChange={(e) => upsert({ ...template, validDays: Number(e.target.value) })} />
        </FieldRow>
        <FieldRow label="Exclusions" className="lg:col-span-2">
          <Textarea
            rows={3}
            value={template.exclusions.join('\n')}
            onChange={(e) => upsert({ ...template, exclusions: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })}
          />
        </FieldRow>
        <FieldRow label="Terms" className="lg:col-span-2">
          <Textarea rows={6} value={template.terms} onChange={(e) => upsert({ ...template, terms: e.target.value })} />
        </FieldRow>
      </div>
    </Card>
  )
}

function EstimatingPackBuilder() {
  const packs = useStore((s) => s.estimatePacks)
  const upsert = useStore((s) => s.upsertEstimatePack)
  const proposalTemplates = useStore((s) => s.proposalTemplates)
  const priceBookItems = useStore((s) => s.priceBookItems)
  const [selectedCategory, setSelectedCategory] = useState<Category>(packs[0]?.category ?? 'residential')
  const pack = packs.find((candidate) => candidate.category === selectedCategory) ?? packs[0]

  if (!pack) return null

  const categoryItems = useMemo(
    () => priceBookItems.filter((item) => item.categories.includes(pack.category)),
    [priceBookItems, pack.category],
  )

  const updatePack = (next: EstimateCategoryPack) => upsert(next)

  return (
    <Card>
      <CardHeader
        title="Estimating pack builder"
        subtitle="Configure reminders, deposit defaults, proposal templates, and suggested catalogue systems by opportunity type."
        actions={
          <Select
            value={pack.category}
            onChange={(e) => setSelectedCategory(e.target.value as Category)}
            className="min-w-48"
          >
            {packs.map((candidate) => (
              <option key={candidate.category} value={candidate.category}>
                {CATEGORY_LABEL[candidate.category]}
              </option>
            ))}
          </Select>
        }
      />
      <div className="space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <FieldRow label="Pack name">
            <Input value={pack.label} onChange={(e) => updatePack({ ...pack, label: e.target.value })} />
          </FieldRow>
          <FieldRow label="Deposit %">
            <Input
              type="number"
              value={pack.depositPct}
              onChange={(e) => updatePack({ ...pack, depositPct: Number(e.target.value) || 0 })}
            />
          </FieldRow>
          <FieldRow label="Proposal template">
            <Select
              value={pack.templateId}
              onChange={(e) => updatePack({ ...pack, templateId: e.target.value })}
            >
              {proposalTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </Select>
          </FieldRow>
          <FieldRow label="Default suggested system">
            <Select
              value={pack.defaultSystemId}
              onChange={(e) => updatePack({ ...pack, defaultSystemId: e.target.value })}
            >
              {categoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FieldRow>
        </div>

        <FieldRow
          label="Alternate systems"
          hint="Catalogue items the estimator can pick when overriding the suggestion. One id per line."
        >
          <Textarea
            rows={4}
            value={pack.alternateSystemIds.join('\n')}
            onChange={(e) =>
              updatePack({
                ...pack,
                alternateSystemIds: e.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
          />
        </FieldRow>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">Estimating reminders</p>
            <Button
              size="sm"
              onClick={() =>
                updatePack({
                  ...pack,
                  reminders: [
                    ...pack.reminders,
                    { id: uid('er'), label: 'New reminder', helper: '' },
                  ],
                })
              }
            >
              Add reminder
            </Button>
          </div>
          <div className="space-y-2">
            {pack.reminders.map((reminder) => (
              <div key={reminder.id} className="grid gap-2 rounded-md border border-subtle p-3 md:grid-cols-[1fr_1fr_auto]">
                <Input
                  value={reminder.label}
                  onChange={(e) =>
                    updatePack({
                      ...pack,
                      reminders: pack.reminders.map((candidate) =>
                        candidate.id === reminder.id ? { ...candidate, label: e.target.value } : candidate,
                      ),
                    })
                  }
                  placeholder="Reminder label"
                />
                <Input
                  value={reminder.helper ?? ''}
                  onChange={(e) =>
                    updatePack({
                      ...pack,
                      reminders: pack.reminders.map((candidate) =>
                        candidate.id === reminder.id ? { ...candidate, helper: e.target.value } : candidate,
                      ),
                    })
                  }
                  placeholder="Optional helper"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updatePack({
                      ...pack,
                      reminders: pack.reminders.filter((candidate) => candidate.id !== reminder.id),
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        <FieldRow label="Form & price book hints" hint="One hint per line. Shown beside reminders on the estimate.">
          <Textarea
            rows={5}
            value={pack.formHints.join('\n')}
            onChange={(e) =>
              updatePack({
                ...pack,
                formHints: e.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
          />
        </FieldRow>
      </div>
    </Card>
  )
}

function ChecklistBuilder() {
  const templates = useStore((s) => s.checklistTemplates)
  const upsert = useStore((s) => s.upsertChecklistTemplate)
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? '')
  const template = templates.find((candidate) => candidate.id === selectedId) ?? templates[0]

  if (!template) return null

  const updateTemplate = (next: ChecklistTemplate) => upsert(next)

  return (
    <Card>
      <CardHeader
        title="Checklist builder"
        subtitle="Edit the operational standards that appear as jobs move forward."
        actions={
          <Select value={template.id} onChange={(e) => setSelectedId(e.target.value)} className="min-w-48">
            {templates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </Select>
        }
      />
      <div className="space-y-3 p-4">
        <FieldRow label="Checklist name">
          <Input value={template.name} onChange={(e) => updateTemplate({ ...template, name: e.target.value })} />
        </FieldRow>
        {template.items.map((item) => (
          <div key={item.id} className="grid gap-2 rounded-md border border-subtle p-3 md:grid-cols-[1fr_1fr]">
            <Input
              value={item.label}
              onChange={(e) =>
                updateTemplate({
                  ...template,
                  items: template.items.map((candidate) => candidate.id === item.id ? { ...candidate, label: e.target.value } : candidate),
                })
              }
            />
            <Input
              value={item.helper ?? ''}
              onChange={(e) =>
                updateTemplate({
                  ...template,
                  items: template.items.map((candidate) => candidate.id === item.id ? { ...candidate, helper: e.target.value || undefined } : candidate),
                })
              }
              placeholder="helper text"
            />
          </div>
        ))}
        <Button
          size="sm"
          onClick={() =>
            updateTemplate({
              ...template,
              items: [...template.items, { id: uid('cli'), label: 'New checklist item' }],
            })
          }
        >
          Add checklist item
        </Button>
      </div>
    </Card>
  )
}


export function LocationsBuilder() {
  const locations = useStore((s) => s.locations)
  const franchises = useStore((s) => s.franchises)
  const activeFranchiseId = useStore((s) => s.activeFranchiseId)
  const setActiveFranchiseId = useStore((s) => s.setActiveFranchiseId)
  const upsert = useStore((s) => s.upsertLocation)
  const upsertUser = useStore((s) => s.upsertUser)
  const users = useStore((s) => s.users)
  const viewer = useViewer()

  const selectableFranchises = useMemo(() => {
    const operating = franchises.filter(
      (f) => f.status === 'active' && !f.isPlatformOwner && !f.isMasterRegion,
    )
    if (!viewer) return operating
    return visibleFranchises(viewer, operating)
  }, [franchises, viewer])

  const franchiseBranches = useMemo(
    () => locations.filter((l) => l.franchiseId === activeFranchiseId),
    [locations, activeFranchiseId],
  )
  const [selectedId, setSelectedId] = useState(franchiseBranches[0]?.id ?? '')
  const [branchOpen, setBranchOpen] = useState(false)
  const [branchDraft, setBranchDraft] = useState({
    franchiseId: activeFranchiseId,
    name: '',
    city: '',
    state: '',
    zips: '',
    managerName: '',
    isCorporate: false,
  })

  useEffect(() => {
    if (!franchiseBranches.some((b) => b.id === selectedId)) {
      setSelectedId(franchiseBranches[0]?.id ?? '')
    }
  }, [franchiseBranches, selectedId])

  const location = franchiseBranches.find((candidate) => candidate.id === selectedId) ?? franchiseBranches[0]
  const owners = users.filter(
    (user) =>
      user.franchiseId === activeFranchiseId
      && (user.role === 'owner' || user.role === 'admin' || user.orgRole === 'manager' || user.orgRole === 'franchise_admin'),
  )
  const activeFranchise = franchises.find((f) => f.id === activeFranchiseId)

  const openAddBranch = () => {
    const defaultFranchiseId =
      selectableFranchises.some((f) => f.id === activeFranchiseId)
        ? activeFranchiseId
        : (selectableFranchises[0]?.id ?? activeFranchiseId)
    setBranchDraft({
      franchiseId: defaultFranchiseId,
      name: '',
      city: '',
      state: '',
      zips: '',
      managerName: '',
      isCorporate: false,
    })
    setBranchOpen(true)
  }

  const createBranch = () => {
    if (!branchDraft.name.trim() || !branchDraft.franchiseId) return
    const franchiseId = branchDraft.franchiseId
    const zips = branchDraft.zips
      .split(/[\n,]+/)
      .map((line) => line.trim())
      .filter(Boolean)
    const created: Location = {
      id: uid('loc'),
      name: branchDraft.name.trim(),
      city: branchDraft.city.trim() || 'City',
      state: branchDraft.state.trim().toUpperCase().slice(0, 2) || 'ST',
      zips: zips.length > 0 ? zips : ['000'],
      ownerId: 'u_nic',
      openedAt: new Date().toISOString().slice(0, 10),
      isCorporate: branchDraft.isCorporate,
      priceMultiplier: 1,
      franchiseId,
    }

    if (branchDraft.managerName.trim()) {
      const managerId = uid('u')
      upsertUser({
        id: managerId,
        name: branchDraft.managerName.trim(),
        title: `Manager — ${created.name}`,
        role: 'owner',
        orgRole: 'manager',
        franchiseId,
        locationId: created.id,
        branchIds: [created.id],
      })
      created.ownerId = managerId
    } else {
      const fallback = users.find(
        (u) => u.franchiseId === franchiseId && (u.orgRole === 'franchise_admin' || u.orgRole === 'manager'),
      )
      created.ownerId = fallback?.id ?? viewer?.id ?? 'u_nic'
    }

    upsert(created)
    setActiveFranchiseId(franchiseId)
    setSelectedId(created.id)
    setBranchOpen(false)
  }

  const branchModal = (
    <Modal
      open={branchOpen}
      onClose={() => setBranchOpen(false)}
      size="lg"
      title="New branch"
      subtitle="Choose the franchise, then enter branch details."
    >
      <div className="grid gap-4">
        <Field label="Franchise">
          <Select
            value={branchDraft.franchiseId}
            onChange={(e) => setBranchDraft({ ...branchDraft, franchiseId: e.target.value })}
          >
            {selectableFranchises.length === 0 && <option value="">No franchises available</option>}
            {selectableFranchises.map((franchise) => (
              <option key={franchise.id} value={franchise.id}>
                {franchise.name} · {franchiseHost(franchise.subdomain)}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Branch name">
            <Input
              value={branchDraft.name}
              onChange={(e) => setBranchDraft({ ...branchDraft, name: e.target.value })}
              placeholder="Chicago — Corporate"
            />
          </Field>
          <Field label="City">
            <Input
              value={branchDraft.city}
              onChange={(e) => setBranchDraft({ ...branchDraft, city: e.target.value })}
              placeholder="Chicago"
            />
          </Field>
          <Field label="State">
            <Input
              value={branchDraft.state}
              onChange={(e) => setBranchDraft({ ...branchDraft, state: e.target.value })}
              placeholder="IL"
              maxLength={2}
            />
          </Field>
          <Field label="Branch manager (optional)">
            <Input
              value={branchDraft.managerName}
              onChange={(e) => setBranchDraft({ ...branchDraft, managerName: e.target.value })}
              placeholder="Dennis Frost"
            />
          </Field>
        </div>

        <Field label="ZIP prefixes">
          <Textarea
            rows={3}
            value={branchDraft.zips}
            onChange={(e) => setBranchDraft({ ...branchDraft, zips: e.target.value })}
            placeholder={'604\n605\n606'}
          />
          <p className="text-sm text-muted">One per line or comma-separated. Used for lead routing.</p>
        </Field>

        <label className="flex items-center gap-2 text-sm text-primary">
          <input
            type="checkbox"
            checked={branchDraft.isCorporate}
            onChange={(e) => setBranchDraft({ ...branchDraft, isCorporate: e.target.checked })}
          />
          Corporate / headquarters branch
        </label>

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setBranchOpen(false)}>Cancel</Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!branchDraft.name.trim() || !branchDraft.franchiseId}
            onClick={createBranch}
          >
            Create branch
          </Button>
        </div>
      </div>
    </Modal>
  )

  if (!location) {
    return (
      <>
        <Card>
          <CardHeader
            title="Branches"
            subtitle={`No branches yet for ${activeFranchise?.name ?? 'this franchise'}.`}
          />
          <div className="p-4">
            <Button size="sm" onClick={openAddBranch}>Add branch</Button>
          </div>
        </Card>
        {branchModal}
      </>
    )
  }

  const updateLocation = (next: Location) => upsert(next)

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Branches"
            subtitle={`Branches for ${activeFranchise?.name ?? 'franchise'} — ZIP ownership and pricing.`}
            actions={
              <Button size="sm" onClick={openAddBranch}>
                Add branch
              </Button>
            }
          />
          <div className="space-y-2 p-4">
            {franchiseBranches.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setSelectedId(candidate.id)}
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-left',
                  candidate.id === location.id
                    ? 'border-action bg-action-soft'
                    : 'border-subtle bg-surface-raised hover:border-strong',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-primary">{candidate.name}</p>
                  {candidate.isCorporate && <Badge tone="brand">Corporate</Badge>}
                </div>
                <p className="text-sm text-muted">
                  {candidate.city}, {candidate.state}
                </p>
                <p className="mt-1 text-2xs uppercase tracking-wide text-muted">
                  {candidate.zips.length} ZIP ranges
                </p>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Branch builder"
            subtitle="Branch details, ZIP ownership, and commercial defaults."
          />
          <div className="space-y-4 p-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <FieldRow label="Franchise">
                <Select
                  value={location.franchiseId}
                  onChange={(e) => {
                    const franchiseId = e.target.value
                    updateLocation({ ...location, franchiseId })
                    setActiveFranchiseId(franchiseId)
                  }}
                >
                  {selectableFranchises.map((franchise) => (
                    <option key={franchise.id} value={franchise.id}>
                      {franchise.name} · {franchiseHost(franchise.subdomain)}
                    </option>
                  ))}
                </Select>
              </FieldRow>
              <FieldRow label="Branch name">
                <Input value={location.name} onChange={(e) => updateLocation({ ...location, name: e.target.value })} />
              </FieldRow>
              <FieldRow label="Owner">
                <Select value={location.ownerId} onChange={(e) => updateLocation({ ...location, ownerId: e.target.value })}>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name} — {owner.title}
                    </option>
                  ))}
                </Select>
              </FieldRow>
              <FieldRow label="City">
                <Input value={location.city} onChange={(e) => updateLocation({ ...location, city: e.target.value })} />
              </FieldRow>
              <FieldRow label="State">
                <Input value={location.state} onChange={(e) => updateLocation({ ...location, state: e.target.value })} />
              </FieldRow>
              <FieldRow label="Opened on">
                <Input value={location.openedAt} onChange={(e) => updateLocation({ ...location, openedAt: e.target.value })} />
              </FieldRow>
              <FieldRow label="Price multiplier">
                <Input
                  type="number"
                  step="0.01"
                  value={location.priceMultiplier}
                  onChange={(e) => updateLocation({ ...location, priceMultiplier: Number(e.target.value) || 1 })}
                />
              </FieldRow>
            </div>

            <FieldRow label="ZIP prefixes" hint="One per line. These drive the territory routing preview.">
              <Textarea
                rows={4}
                value={location.zips.join('\n')}
                onChange={(e) =>
                  updateLocation({
                    ...location,
                    zips: e.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
              />
            </FieldRow>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={location.isCorporate ? 'primary' : 'secondary'}
                onClick={() => updateLocation({ ...location, isCorporate: !location.isCorporate })}
              >
                {location.isCorporate ? 'Corporate territory' : 'Mark as corporate'}
              </Button>
              <Badge tone="neutral">{location.zips.join(', ') || 'No ZIP prefixes yet'}</Badge>
            </div>
          </div>
        </Card>
      </div>
      {branchModal}
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium text-primary">{label}</span>
      {children}
    </label>
  )
}
