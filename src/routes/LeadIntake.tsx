import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe,
  MapPin,
  Radio,
  UserPlus,
  Workflow,
  XCircle,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useRouteZip, useUsers } from '@/store/selectors'
import type { Category, LeadSource } from '@/domain/types'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  FieldRow,
  Input,
  Select,
  Textarea,
} from '@/components/ui'
import { Logo } from '@/components/layout/Logo'
import { cn } from '@/lib/cn'

/* ==========================================================================
   Lead capture and routing
   ==========================================================================
   Today this is Zapier → HubSpot → re-keyed into Housecall Pro. Here the
   form writes once: it creates the Account and the Opportunity, routes on
   zip, and drops the record into the right territory's Unqualified Lead
   column with the customer's own words attached.
   ========================================================================== */

const SOURCES: LeadSource[] = [
  'National Website',
  'Location Website',
  'Ad Campaign',
  'Phone-in',
  'Email',
  'Referral',
  'Manual Entry',
]

export function LeadIntake() {
  const navigate = useNavigate()
  const createLead = useStore((s) => s.createLead)
  const patch = useStore((s) => s.patchOpportunity)
  const logActivity = useStore((s) => s.logActivity)
  const locations = useStore((s) => s.locations)
  const users = useUsers()

  const [company, setCompany] = useState('Cascade Provisions')
  const [contactName, setContactName] = useState('Dale Munro')
  const [email, setEmail] = useState('dmunro@cascadeprovisions.com')
  const [phone, setPhone] = useState('(815) 555-0143')
  const [zip, setZip] = useState('60431')
  const [city, setCity] = useState('Joliet')
  const [state, setState] = useState('IL')
  const [category, setCategory] = useState<Category>('industrial')
  const [source, setSource] = useState<LeadSource>('National Website')
  const [estimatedQuantity, setEstimatedQuantity] = useState(7500)
  const [message, setMessage] = useState(
    'We need preventive maintenance and several equipment repairs at our production facility. Work must happen during a weekend shutdown and requires safety coordination.',
  )

  const [created, setCreated] = useState<string | null>(null)
  const [assignee, setAssignee] = useState('')

  const routed = useRouteZip(zip)
  const reps = users.filter((u) => u.role === 'sales' && u.locationId === routed?.id)

  const submit = () => {
    if (!routed) return
    const id = createLead({
      company,
      contactName,
      email,
      phone,
      zip,
      city,
      state,
      category,
      source,
      message,
      locationId: routed.id,
      estimatedQuantity,
    })
    setCreated(id)
  }

  const assign = () => {
    if (!created || !assignee) return
    patch(created, { ownerId: assignee })
    logActivity(
      created,
      'system',
      `Assigned to ${users.find((u) => u.id === assignee)?.name}. Follow-up workflow started — first contact due within 24 hours.`,
    )
    navigate(`/opportunities/${created}`)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto grid max-w-[74rem] gap-5 px-5 py-5 lg:grid-cols-[1fr_22rem]">
        <div>
          <h1 className="font-display text-2xl text-primary">Lead capture</h1>
          <p className="mt-0.5 mb-4 text-base text-muted">
            This is the public form, rendered inside the platform so you can watch what happens to a
            submission. One entry — no re-keying downstream.
          </p>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-subtle bg-surface-inset px-4 py-2.5">
              <Logo size={22} />
              <span className="text-base font-medium text-primary">
                yourcompany.com · Request service
              </span>
              <Badge tone="neutral" className="ml-auto" icon={<Globe size={9} />}>
                Public form
              </Badge>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <FieldRow label="Company or name" required>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </FieldRow>
              <FieldRow label="Contact name" required>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </FieldRow>
              <FieldRow label="Email" required>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </FieldRow>
              <FieldRow label="Phone" required>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FieldRow>
              <FieldRow label="City">
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </FieldRow>
              <FieldRow label="State">
                <Input value={state} onChange={(e) => setState(e.target.value)} />
              </FieldRow>
              <FieldRow label="Zip code" required hint="This is what decides the territory.">
                <Input value={zip} onChange={(e) => setZip(e.target.value)} />
              </FieldRow>
              <FieldRow label="Estimated quantity" hint="Units, assets, hours, or another configured measure">
                <Input type="number" value={estimatedQuantity} onChange={(e) => setEstimatedQuantity(Number(e.target.value))} />
              </FieldRow>
              <FieldRow label="Project type">
                <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                </Select>
              </FieldRow>
              <FieldRow label="Source" hint="Set automatically in production">
                <Select value={source} onChange={(e) => setSource(e.target.value as LeadSource)}>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </FieldRow>
              <FieldRow label="Tell us about the project" className="sm:col-span-2">
                <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
              </FieldRow>
            </div>

            <div className="flex items-center gap-3 border-t border-subtle bg-surface-inset px-4 py-3">
              {routed ? (
                <span className="flex items-center gap-1.5 text-base text-success-text">
                  <MapPin size={13} />
                  Routes to <span className="font-semibold">{routed.name}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-base text-danger-text">
                  <XCircle size={13} />
                  No location serves zip {zip} — this becomes an administrator-held lead.
                </span>
              )}
              <Button
                variant="primary"
                className="ml-auto"
                disabled={!routed || Boolean(created)}
                onClick={submit}
              >
                Submit request
              </Button>
            </div>
          </Card>

          {created && (
            <Card className="mt-4 border-(--status-success)">
              <CardHeader
                title="Lead created and routed"
                subtitle="No Zapier, no HubSpot, no re-entry."
                icon={<CheckCircle2 size={15} className="text-success-text" />}
              />
              <div className="space-y-3 p-4">
                <p className="text-base text-secondary">
                  Assign a sales representative to start the follow-up workflow. Until someone owns
                  it, this record sits in the territory’s Unqualified Lead column and shows on the
                  owner’s dashboard as unassigned.
                </p>
                <div className="flex items-end gap-2">
                  <FieldRow label="Sales representative" className="flex-1">
                    <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                      <option value="">Select a rep…</option>
                      {reps.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} — {r.title}
                        </option>
                      ))}
                    </Select>
                  </FieldRow>
                  <Button variant="primary" disabled={!assignee} onClick={assign}>
                    <UserPlus size={14} />
                    Assign and open record
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ---- Routing explainer ---- */}
        <aside className="space-y-4">
          <Card>
            <CardHeader title="What happens next" icon={<Workflow size={14} />} />
            <ol className="space-y-0 p-1">
              {[
                { label: 'Unqualified Lead created', detail: 'Account and opportunity in one write.' },
                { label: 'Category identified', detail: `${category} — decides the checklist and vocabulary.` },
                { label: 'Location resolved by zip', detail: routed ? routed.name : 'No coverage' },
                { label: 'Assigned to a representative', detail: 'Owner sees it as unassigned until then.' },
                { label: 'Follow-up workflow starts', detail: 'First contact due within 24 hours.' },
              ].map((step, i, arr) => (
                <li key={step.label} className="flex gap-2.5 px-3 py-2">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-2xs font-semibold',
                        created ? 'bg-(--status-success) text-white' : 'bg-surface-inset text-muted',
                      )}
                    >
                      {i + 1}
                    </span>
                    {i < arr.length - 1 && <span className="mt-1 w-px flex-1 bg-(--border-subtle)" />}
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="text-base font-medium text-primary">{step.label}</p>
                    <p className="text-sm text-muted">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader title="Location coverage" subtitle="Zip prefixes by location" icon={<Building2 size={14} />} />
            <div className="p-1">
              {locations.map((l) => (
                <div
                  key={l.id}
                  className={cn(
                    'rounded-md px-3 py-2',
                    routed?.id === l.id && 'bg-success-soft',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-primary">{l.name}</p>
                    {routed?.id === l.id && (
                      <Badge tone="success" icon={<ArrowRight size={9} />}>
                        Match
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-sm text-muted">{l.zips.join(' · ')}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Other inbound channels" icon={<Radio size={14} />} />
            <ul className="space-y-1.5 p-4 text-sm text-muted">
              {[
                'National website form',
                'Location microsite form',
                'Paid campaign landing pages',
                'Phone calls logged by the office',
                'Inbound email parsing',
                'Referral submissions',
                'Partner and marketplace referrals',
                'Manual entry by a rep',
              ].map((c) => (
                <li key={c} className="flex items-center gap-2">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-(--color-steel-400)" />
                  {c}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  )
}
