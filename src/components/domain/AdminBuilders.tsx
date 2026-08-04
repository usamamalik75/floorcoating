import { useMemo, useState } from 'react'
import { BookOpen, Building2, ClipboardCheck, FileSignature, KanbanSquare, ListChecks, SlidersHorizontal } from 'lucide-react'
import type { ChecklistTemplate, Location, SiteVisitForm, StageDef } from '@/domain/types'
import type { ConfigField } from '@/config/workspace'
import { useStore } from '@/store/useStore'
import { Badge, Button, Card, CardHeader, FieldRow, Input, SectionTitle, Select, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

export function AdminBuilders() {
  const [tab, setTab] = useState<'workspace' | 'locations' | 'forms' | 'catalogue' | 'templates' | 'checklists' | 'stages'>('workspace')

  return (
    <section className="pb-8">
      <SectionTitle>Configuration builders</SectionTitle>
      <div className="mb-3 flex flex-wrap gap-1">
        {(
          [
            ['workspace', 'Workspace', SlidersHorizontal],
            ['locations', 'Locations', Building2],
            ['forms', 'Forms', ListChecks],
            ['catalogue', 'Products & Services', BookOpen],
            ['templates', 'Proposal templates', FileSignature],
            ['checklists', 'Checklists', ClipboardCheck],
            ['stages', 'Stages', KanbanSquare],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-base font-medium',
              tab === id
                ? 'border-action bg-action text-action-fg'
                : 'border-subtle bg-surface-raised text-secondary hover:border-strong',
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'workspace' && <WorkspaceBuilder />}
      {tab === 'locations' && <LocationsBuilder />}
      {tab === 'forms' && <FormsBuilder />}
      {tab === 'catalogue' && <CatalogueBuilder />}
      {tab === 'templates' && <ProposalTemplateBuilder />}
      {tab === 'checklists' && <ChecklistBuilder />}
      {tab === 'stages' && <StageBuilder />}
    </section>
  )
}

function WorkspaceBuilder() {
  const template = useStore((s) => s.workspaceTemplate)
  const update = useStore((s) => s.updateWorkspaceTemplate)

  const patchField = (kind: 'opportunityFields' | 'jobFields', fieldId: string, next: Partial<ConfigField>) => {
    update({
      ...template,
      [kind]: template[kind].map((field) => (field.id === fieldId ? { ...field, ...next } : field)),
    })
  }

  const addField = (kind: 'opportunityFields' | 'jobFields') => {
    update({
      ...template,
      [kind]: [
        ...template[kind],
        { id: uid('cfg'), label: 'New field', type: 'text' },
      ],
    })
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <FieldRow label="Workspace name">
            <Input value={template.name} onChange={(e) => update({ ...template, name: e.target.value })} />
          </FieldRow>
          <FieldRow label="Description">
            <Input value={template.description} onChange={(e) => update({ ...template, description: e.target.value })} />
          </FieldRow>
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">Terminology</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(template.terminology).map(([key, value]) => (
            <FieldRow key={key} label={key}>
              <Input
                value={value}
                onChange={(e) =>
                  update({
                    ...template,
                    terminology: { ...template.terminology, [key]: e.target.value },
                  })
                }
              />
            </FieldRow>
          ))}
        </div>
      </Card>

      <FieldListCard title="Opportunity fields" fields={template.opportunityFields} onPatch={(id, next) => patchField('opportunityFields', id, next)} onAdd={() => addField('opportunityFields')} />
      <FieldListCard title="Job fields" fields={template.jobFields} onPatch={(id, next) => patchField('jobFields', id, next)} onAdd={() => addField('jobFields')} />
    </div>
  )
}

function FieldListCard({
  title,
  fields,
  onPatch,
  onAdd,
}: {
  title: string
  fields: ConfigField[]
  onPatch: (fieldId: string, next: Partial<ConfigField>) => void
  onAdd: () => void
}) {
  return (
    <Card>
      <CardHeader title={title} actions={<Button size="sm" onClick={onAdd}>Add field</Button>} />
      <div className="space-y-3 p-4">
        {fields.map((field) => (
          <div key={field.id} className="grid gap-3 rounded-md border border-subtle p-3 md:grid-cols-4">
            <FieldRow label="Label">
              <Input value={field.label} onChange={(e) => onPatch(field.id, { label: e.target.value })} />
            </FieldRow>
            <FieldRow label="Type">
              <Select value={field.type} onChange={(e) => onPatch(field.id, { type: e.target.value as ConfigField['type'] })}>
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="select">Select</option>
              </Select>
            </FieldRow>
            <FieldRow label="Unit">
              <Input value={field.unit ?? ''} onChange={(e) => onPatch(field.id, { unit: e.target.value || undefined })} />
            </FieldRow>
            <FieldRow label="Options">
              <Input
                value={field.options?.join(', ') ?? ''}
                onChange={(e) => onPatch(field.id, { options: e.target.value ? e.target.value.split(',').map((value) => value.trim()) : undefined })}
                placeholder="comma separated"
              />
            </FieldRow>
          </div>
        ))}
      </div>
    </Card>
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

function CatalogueBuilder() {
  const items = useStore((s) => s.priceBookItems)
  const upsert = useStore((s) => s.upsertPriceBookItem)
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? '')
  const item = items.find((candidate) => candidate.id === selectedId) ?? items[0]

  if (!item) return null

  return (
    <Card>
      <CardHeader
        title="Products & Services builder"
        subtitle="Adjust the pricing and packaged description the estimator pulls into proposals."
        actions={
          <Select value={item.id} onChange={(e) => setSelectedId(e.target.value)} className="min-w-48">
            {items.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </Select>
        }
      />
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <FieldRow label="Name">
          <Input value={item.name} onChange={(e) => upsert({ ...item, name: e.target.value })} />
        </FieldRow>
        <FieldRow label="Unit price">
          <Input type="number" value={item.unitPrice} onChange={(e) => upsert({ ...item, unitPrice: Number(e.target.value) })} />
        </FieldRow>
        <FieldRow label="Description" className="lg:col-span-2">
          <Textarea rows={3} value={item.description} onChange={(e) => upsert({ ...item, description: e.target.value })} />
        </FieldRow>
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

function LocationsBuilder() {
  const locations = useStore((s) => s.locations)
  const upsert = useStore((s) => s.upsertLocation)
  const users = useStore((s) => s.users)
  const [selectedId, setSelectedId] = useState(locations[0]?.id ?? '')
  const location = locations.find((candidate) => candidate.id === selectedId) ?? locations[0]
  const owners = users.filter((user) => user.role === 'owner' || user.role === 'admin')

  const addLocation = () => {
    const created: Location = {
      id: uid('loc'),
      name: 'New territory',
      city: 'New city',
      state: 'ST',
      zips: ['000'],
      ownerId: owners[0]?.id ?? 'u_nic',
      openedAt: new Date().toISOString().slice(0, 10),
      isCorporate: false,
      priceMultiplier: 1,
    }
    upsert(created)
    setSelectedId(created.id)
  }

  if (!location) return null

  const updateLocation = (next: Location) => upsert(next)

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Card>
        <CardHeader
          title="Territories"
          subtitle="UI-only network setup for adding branches, ZIP ownership, and pricing."
          actions={
            <Button size="sm" onClick={addLocation}>
              Add location
            </Button>
          }
        />
        <div className="space-y-2 p-4">
          {locations.map((candidate) => (
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
          title="Location builder"
          subtitle="Design the territory, routing coverage, and commercial defaults shown in the admin workspace."
        />
        <div className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-2">
            <FieldRow label="Location name">
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
  )
}

function StageBuilder() {
  const stages = useStore((s) => s.stageDefinitions)
  const upsert = useStore((s) => s.upsertStageDefinition)
  const [selectedId, setSelectedId] = useState<string>(stages[0]?.id ?? '')
  const stage = useMemo(() => stages.find((candidate) => candidate.id === selectedId) ?? stages[0], [stages, selectedId])

  if (!stage) return null

  const updateStage = (next: StageDef) => upsert(next)

  return (
    <Card>
      <CardHeader
        title="Stage builder"
        subtitle="Refine stage purpose, probability, and the visible gate language used by the pipeline."
        actions={
          <Select value={stage.id} onChange={(e) => setSelectedId(e.target.value)} className="min-w-48">
            {stages.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.label}
              </option>
            ))}
          </Select>
        }
      />
      <div className="space-y-3 p-4">
        <div className="grid gap-3 lg:grid-cols-3">
          <FieldRow label="Label">
            <Input value={stage.label} onChange={(e) => updateStage({ ...stage, label: e.target.value })} />
          </FieldRow>
          <FieldRow label="Probability">
            <Input type="number" value={stage.probability} onChange={(e) => updateStage({ ...stage, probability: Number(e.target.value) })} />
          </FieldRow>
          <FieldRow label="Group">
            <Input value={stage.group} readOnly />
          </FieldRow>
        </div>
        <FieldRow label="Purpose">
          <Textarea rows={3} value={stage.purpose} onChange={(e) => updateStage({ ...stage, purpose: e.target.value })} />
        </FieldRow>

        <div>
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Gate copy</p>
          <div className="space-y-2">
            {stage.gates.map((gate, index) => (
              <div key={`${gate.kind}-${index}`} className="rounded-md border border-subtle p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="neutral">{gate.kind}</Badge>
                  <Badge tone={gate.blocking ? 'warning' : 'success'}>{gate.blocking ? 'blocking' : 'advisory'}</Badge>
                </div>
                <Input
                  value={gate.label}
                  onChange={(e) =>
                    updateStage({
                      ...stage,
                      gates: stage.gates.map((candidate, candidateIndex) =>
                        candidateIndex === index ? { ...candidate, label: e.target.value } : candidate,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
