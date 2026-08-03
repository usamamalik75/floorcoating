import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calculator,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Save,
  Send,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useArtifactsFor, useFormForCategory } from '@/store/selectors'
import { requiredFields } from '@/data/siteVisitForms'
import { ACCOUNT_BY_ID } from '@/data/seed'
import type { SiteVisitField } from '@/domain/types'
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

/* ==========================================================================
   Guided site visit
   ==========================================================================
   Completed on a phone or tablet, standing on the service area being quoted. The
   form is section-paged rather than one long scroll because reps fill this in
   while walking a plant.

   Fields marked "feeds estimate" write onto the opportunity as they are
   answered, which is the mechanism that removes the re-keying step between
   the site visit and the estimate.
   ========================================================================== */

export function SiteVisit() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const opportunity = useStore((s) => s.opportunities.find((o) => o.id === id))
  const stored = useStore((s) => s.siteVisits.find((v) => v.opportunityId === id))
  const save = useStore((s) => s.saveSiteVisit)
  const addArtifact = useStore((s) => s.addArtifact)
  const viewerId = useStore((s) => s.viewerId)
  const artifacts = useArtifactsFor(id)

  const form = useFormForCategory(opportunity?.category)

  const [values, setValues] = useState<Record<string, string | number | boolean>>({})
  const [section, setSection] = useState(0)

  useEffect(() => {
    setValues(stored?.values ?? {})
  }, [stored?.opportunityId])

  if (!opportunity || !form) {
    return <EmptyState title="Opportunity not found" className="h-full" />
  }

  const account = ACCOUNT_BY_ID[opportunity.accountId]
  const required = requiredFields(form)
  const answered = required.filter((f) => {
    const v = values[f.id]
    return v !== undefined && v !== '' && v !== null
  })
  const complete = answered.length === required.length
  const current = form.sections[section]

  const set = (fieldId: string, v: string | number | boolean) =>
    setValues((prev) => ({ ...prev, [fieldId]: v }))

  const persist = (finish: boolean) => {
    save(opportunity.id, form.id, values, finish)
    if (finish) navigate(`/opportunities/${opportunity.id}`)
  }

  const photos = artifacts.filter((a) => a.kind === 'photo')
  const plans = artifacts.filter((a) => a.kind === 'plan')

  return (
    <div className="flex h-full bg-surface-sunken overflow-hidden">
      <div className="flex h-full w-full flex-col bg-surface-base overflow-hidden">
        
        {/* Header */}
        <header className="flex shrink-0 flex-col gap-1 border-b border-subtle/50 bg-surface-chrome px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <Link
              to={`/opportunities/${opportunity.id}`}
              className="text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-display text-xl">{form.name}</h1>
          </div>
          <p className="text-sm text-white/70 ml-8">
            {account?.name} · {opportunity.address}
          </p>
        </header>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 pb-8 scrollbar-thin">
          {/* Progress Indicator */}
          <div className="mb-5 rounded-xl border border-subtle/50 bg-surface-sunken p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-secondary">
                {answered.length} of {required.length} required fields
              </span>
              {complete ? (
                <Badge tone="success" icon={<CheckCircle2 size={12} />}>
                  Ready to submit
                </Badge>
              ) : (
                <Badge tone="warning">Incomplete</Badge>
              )}
            </div>
            <Meter value={answered.length} max={required.length} tone={complete ? 'success' : 'attention'} />
          </div>

          {/* Section tabs */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {form.sections.map((s, i) => {
              const req = s.fields.filter((f) => f.required)
              const done = req.filter((f) => values[f.id] !== undefined && values[f.id] !== '').length
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(i)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium',
                    'transition-colors duration-(--duration-fast)',
                    i === section
                      ? 'border-action bg-action text-action-fg shadow-sm'
                      : 'border-subtle bg-surface-sunken text-secondary hover:border-strong hover:bg-surface-raised',
                  )}
                >
                  {s.title}
                  {req.length > 0 && (
                    <span className={cn('text-xs', i === section ? 'text-action-fg/70' : 'text-muted')}>
                      {done}/{req.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Form Fields */}
          <div className="mb-5">
            <h2 className="mb-3 font-display text-lg text-primary">{current.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {current.fields.map((f) => (
                <Field key={f.id} field={f} value={values[f.id]} onChange={(v) => set(f.id, v)} />
              ))}
            </div>
          </div>

          {/* Photos and docs section */}
          {section === form.sections.length - 1 && (
            <div className="rounded-xl border border-subtle/50 bg-surface-sunken p-4 mt-6">
              <h2 className="mb-1 font-display text-lg text-primary">Photos and documents</h2>
              <p className="mb-4 text-sm text-muted">
                Photos attach to this project for its whole life, from site condition through to the finished service area.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    addArtifact({
                      opportunityId: opportunity.id,
                      kind: 'photo',
                      name: `Site photo ${photos.length + 1} — ${current.title}`,
                      stageAdded: opportunity.stage,
                      addedById: viewerId,
                      addedAt: new Date().toISOString(),
                      meta: 'CompanyCam · auto-matched by GPS',
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
                    <div key={a.id} className="flex items-center gap-2 text-sm font-medium text-secondary bg-surface-base p-2 rounded border border-subtle">
                      <CheckCircle2 size={14} className="shrink-0 text-success-text" />
                      <span className="truncate">{a.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 border-t border-subtle/50 bg-surface-base p-4 flex items-center gap-3">
          <Button
            disabled={section === 0}
            onClick={() => setSection((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft size={16} />
            Back
          </Button>
          {section < form.sections.length - 1 ? (
            <Button variant="primary" className="ml-auto" onClick={() => setSection((s) => s + 1)}>
              Next
              <ChevronRight size={16} />
            </Button>
          ) : (
            <>
              <Button className="ml-auto" onClick={() => persist(false)}>
                <Save size={16} />
                Save draft
              </Button>
              <Button variant="primary" disabled={!complete} onClick={() => persist(true)}>
                <Send size={16} />
                Submit visit
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

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
