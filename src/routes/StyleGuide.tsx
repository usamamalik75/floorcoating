import { AlertTriangle, Check, Plus } from 'lucide-react'
import { STAGES } from '@/domain/stages'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Input,
  KeyValue,
  Meter,
  SectionTitle,
  Select,
  StageChip,
} from '@/components/ui'
import { Logo } from '@/components/layout/Logo'
import { useState } from 'react'

const RAMP = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

export function StyleGuide() {
  const [checked, setChecked] = useState(true)

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <header>
          <h1 className="font-display text-2xl text-primary">Design System</h1>
          <p className="mt-1 max-w-2xl text-base text-secondary">
            A neutral, configurable service-operations design system. Every colour below is a
            token reference — no component in this codebase contains a hex value.
          </p>
        </header>

        {/* ---- Brand ---- */}
        <section>
          <SectionTitle>Brand</SectionTitle>
          <Card className="p-4">
            <div className="flex flex-wrap items-start gap-6">
              <div className="space-y-3">
                <div className="rounded-lg border border-subtle bg-white px-3 py-3">
                  <Logo size={40} />
                </div>
                <div className="rounded-lg bg-surface-chrome px-3 py-3">
                  <Logo size={40} variant="white" />
                </div>
                <p className="font-mono text-sm text-primary">#7E2F3F</p>
                <p className="text-2xs text-muted">Official lockup · red / white</p>
              </div>
              <div className="max-w-md text-base leading-relaxed text-secondary">
                <p>
                  Burgundy is dark and red-adjacent, which collides with two things a pipeline tool
                  needs: <strong className="text-primary">danger</strong> and{' '}
                  <strong className="text-primary">emphasis</strong>. So the palette splits those
                  into three visually separable jobs.
                </p>
                <ul className="mt-3 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-xs bg-action" />
                    Burgundy — identity and commitment
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-xs bg-attention" />
                    Copper — attention, the next action
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-xs bg-danger" />
                    Scarlet — failure, always with an icon
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </section>

        {/* ---- Ramps ---- */}
        <section>
          <SectionTitle>Layer 1 — primitive ramps</SectionTitle>
          <div className="space-y-3">
            <Ramp name="burgundy" steps={RAMP} />
            <Ramp name="copper" steps={RAMP} />
            <Ramp name="steel" steps={RAMP} />
          </div>
        </section>

        {/* ---- Semantic ---- */}
        <section>
          <SectionTitle>Layer 2 — semantic</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['surface-base', '--surface-base'],
              ['surface-raised', '--surface-raised'],
              ['surface-sunken', '--surface-sunken'],
              ['surface-chrome', '--surface-chrome'],
              ['action-primary', '--action-primary'],
              ['accent-attention', '--accent-attention'],
              ['status-success', '--status-success'],
              ['status-warning', '--status-warning'],
              ['status-danger', '--status-danger'],
              ['status-info', '--status-info'],
              ['border-subtle', '--border-subtle'],
              ['border-strong', '--border-strong'],
            ].map(([label, v]) => (
              <div key={v} className="rounded-md border border-subtle p-2">
                <div
                  className="h-8 w-full rounded-sm border border-subtle"
                  style={{ backgroundColor: `var(${v})` }}
                />
                <p className="mt-1.5 font-mono text-2xs text-secondary">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Stage identity ---- */}
        <section>
          <SectionTitle>Layer 3 — stage identity</SectionTitle>
          <Card className="p-4">
            <p className="mb-3 max-w-2xl text-base text-secondary">
              One triad per stage group, reused verbatim by the board column, the card, the badge,
              the timeline and the calendar. A colour always means the same thing.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((s) => (
                <StageChip key={s.id} group={s.group} label={s.label} />
              ))}
            </div>
          </Card>
        </section>

        {/* ---- Primitives ---- */}
        <section>
          <SectionTitle>Components</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2">
            <Card>
              <CardHeader title="Buttons" />
              <div className="flex flex-wrap items-center gap-2 p-4">
                <Button variant="primary" icon={<Plus size={13} />}>
                  Primary
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="attention">Attention</Button>
                <Button variant="danger" icon={<AlertTriangle size={13} />}>
                  Danger
                </Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
              </div>
            </Card>

            <Card>
              <CardHeader title="Badges" />
              <div className="flex flex-wrap items-center gap-2 p-4">
                <Badge tone="neutral">Neutral</Badge>
                <Badge tone="brand">Brand</Badge>
                <Badge tone="attention">Attention</Badge>
                <Badge tone="success" icon={<Check size={9} />}>
                  Success
                </Badge>
                <Badge tone="warning">Warning</Badge>
                <Badge tone="danger" icon={<AlertTriangle size={9} />}>
                  Danger
                </Badge>
                <Badge tone="info">Info</Badge>
              </div>
            </Card>

            <Card>
              <CardHeader title="Inputs" />
              <div className="space-y-3 p-4">
                <Input placeholder="Search projects…" />
                <Select defaultValue="">
                  <option value="">Select a catalogue item…</option>
                  <option>Commercial Cleaning</option>
                  <option>electrical service High Performance</option>
                </Select>
                <Checkbox
                  checked={checked}
                  onChange={setChecked}
                  label="Site condition test the surface"
                  description="Calcium chloride or RH probe."
                />
              </div>
            </Card>

            <Card>
              <CardHeader title="Data display" />
              <div className="space-y-3 p-4">
                <dl className="grid grid-cols-3 gap-3">
                  <KeyValue label="Value">$48,600</KeyValue>
                  <KeyValue label="Quantity">2,850 units</KeyValue>
                  <KeyValue label="Code" mono>
                    JOB-CHI-1042
                  </KeyValue>
                </dl>
                <div>
                  <p className="mb-1.5 text-sm text-muted">Job progress</p>
                  <Meter value={35} tone="attention" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Avatar name="BJ Marsh" />
                  <Avatar name="Keith Alvarez" />
                  <Avatar name="Marcus Webb" />
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ---- Density ---- */}
        <section>
          <SectionTitle>Density</SectionTitle>
          <Card className="p-4">
            <p className="max-w-2xl text-base text-secondary">
              One switch, two ergonomics. Toggle{' '}
              <strong className="text-primary">Desktop / Field</strong> in the bar above — rows go
              from 32px to 48px and controls from 30px to a 44px touch target, without a second
              component library. Field views on a job site are the same components at a different
              density.
            </p>
          </Card>
        </section>
      </div>
    </div>
  )
}

function Ramp({ name, steps }: { name: string; steps: string[] }) {
  return (
    <div>
      <p className="mb-1 font-mono text-2xs text-muted">--{name}-*</p>
      <div className="flex overflow-hidden rounded-md border border-subtle">
        {steps.map((s) => (
          <div key={s} className="flex-1" title={`--${name}-${s}`}>
            <div className="h-9" style={{ backgroundColor: `var(--${name}-${s})` }} />
            <p className="bg-surface-raised py-0.5 text-center font-mono text-2xs text-muted">{s}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
