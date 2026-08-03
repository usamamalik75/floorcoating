import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Building2,
  ClipboardCheck,
  FileText,
  MapPin,
  Percent,
  Route,
  TrendingUp,
} from 'lucide-react'
import { LOCATIONS, USER_BY_ID } from '@/data/seed'
import { PRICE_BOOK, PROPOSAL_TEMPLATES } from '@/data/priceBook'
import { CHECKLIST_TEMPLATES } from '@/data/checklists'
import { STAGE_BY_ID } from '@/domain/stages'
import { money, useStore } from '@/store/useStore'
import { AdminBuilders } from '@/components/domain/AdminBuilders'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  KeyValue,
  Meter,
  SectionTitle,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import { cn } from '@/lib/cn'

/**
 * The company administrator lens. Everything here is scoped ACROSS territories, which
 * is the one view a branch owner never gets — and the reason lead routing
 * and serviceFee accrual have to live in the same system as the pipeline.
 */
export function Admin() {
  const opportunities = useStore((s) => s.opportunities)
  const jobs = useStore((s) => s.jobs)
  const invoices = useStore((s) => s.invoices)
  const [testZip, setTestZip] = useState('60540')

  const routed = LOCATIONS.find((l) => l.zips.some((z) => testZip.startsWith(z)))

  const byLocation = useMemo(
    () =>
      LOCATIONS.map((loc) => {
        const opps = opportunities.filter((o) => o.locationId === loc.id)
        const open = opps.filter((o) => {
          if (o.stage === 'lost') return false
          if (o.stage === 'awarded') {
            const job = jobs.find((j) => j.opportunityId === o.id)
            return job?.status !== 'paid'
          }
          return STAGE_BY_ID[o.stage]?.phase !== 'pre'
        })
        const won = opps.filter((o) => o.stage === 'awarded')
        const lost = opps.filter((o) => o.stage === 'lost')
        const revenue = invoices
          .filter((i) => opps.some((o) => o.id === i.opportunityId))
          .reduce((s, i) => s + i.amount, 0)
        return {
          loc,
          count: opps.length,
          openValue: open.reduce((s, o) => s + o.value, 0),
          wonValue: won.reduce((s, o) => s + o.value, 0),
          winRate: won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : 0,
          revenue,
          serviceFee: revenue * 0,
        }
      }),
    [opportunities, jobs, invoices],
  )

  const totals = byLocation.reduce(
    (acc, r) => ({
      openValue: acc.openValue + r.openValue,
      revenue: acc.revenue + r.revenue,
      serviceFee: acc.serviceFee + r.serviceFee,
    }),
    { openValue: 0, revenue: 0, serviceFee: 0 },
  )

  const maxOpen = Math.max(...byLocation.map((b) => b.openValue), 1)

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-5xl space-y-5 p-4">
        <header>
          <h1 className="font-display text-xl text-primary">Company administrator</h1>
          <p className="mt-0.5 text-base text-muted">
            Network-wide view across every territory. Branch users see only their own.
          </p>
        </header>

        {/* ---- Rollup ---- */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-2xs font-semibold tracking-wider text-muted uppercase">Open pipeline</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular text-primary">
              {money(totals.openValue)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted">
              <TrendingUp size={11} /> across {LOCATIONS.length} territories
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-2xs font-semibold tracking-wider text-muted uppercase">
              Invoiced revenue
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular text-primary">
              {money(totals.revenue)}
            </p>
            <p className="mt-1 text-sm text-muted">synced from QuickBooks</p>
          </Card>
          <Card className="border-(--action-primary) p-4">
            <p className="text-2xs font-semibold tracking-wider text-muted uppercase">
              Service fee accrued
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular text-brand">
              {money(totals.serviceFee)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted">
              <Percent size={11} /> 5% of gross sales
            </p>
          </Card>
        </div>

        {/* ---- Lead routing ---- */}
        <section>
          <SectionTitle>Inbound lead routing</SectionTitle>
          <Card>
            <CardHeader
              title="Zip code territory rules"
              subtitle="Website and local ad form fills route to a territory automatically — replacing the manual Zapier hop into a separate CRM"
              icon={<Route size={14} />}
            />
            <div className="p-4">
              <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-subtle bg-surface-inset p-3">
                <div>
                  <label className="mb-1 block text-2xs font-semibold tracking-wider text-muted uppercase">
                    Test a zip code
                  </label>
                  <Input
                    value={testZip}
                    onChange={(e) => setTestZip(e.target.value)}
                    className="w-32 font-mono"
                    maxLength={5}
                  />
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <span className="text-base text-muted">routes to</span>
                  {routed ? (
                    <Badge tone="success" icon={<MapPin size={9} />}>
                      {routed.name}
                    </Badge>
                  ) : (
                    <Badge tone="warning">Unassigned — falls back to corporate</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {LOCATIONS.map((loc) => (
                  <div
                    key={loc.id}
                    className={cn(
                      'flex flex-wrap items-center gap-2 rounded-md border px-3 py-2.5',
                      routed?.id === loc.id
                        ? 'border-(--action-primary) bg-action-soft'
                        : 'border-subtle',
                    )}
                  >
                    <div className="min-w-[10rem]">
                      <p className="text-base font-medium text-primary">{loc.name}</p>
                      <p className="text-sm text-muted">
                        {loc.city}, {loc.state} · {USER_BY_ID[loc.ownerId]?.name}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {loc.zips.map((z) => (
                        <span
                          key={z}
                          className={cn(
                            'rounded-sm border px-1.5 py-0.5 font-mono text-2xs tabular',
                            testZip.startsWith(z)
                              ? 'border-(--action-primary) bg-action text-white'
                              : 'border-subtle bg-surface-inset text-muted',
                          )}
                        >
                          {z}xx
                        </span>
                      ))}
                    </div>
                    {loc.isCorporate && (
                      <Badge tone="brand" className="ml-auto">
                        Corporate
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* ---- Per-territory performance ---- */}
        <section>
          <SectionTitle>Territory performance</SectionTitle>
          <Card>
            <Table>
              <thead>
                <tr>
                  <Th>Territory</Th>
                  <Th width={70} align="right">
                    Opps
                  </Th>
                  <Th width={180}>Open pipeline</Th>
                  <Th width={110} align="right">
                    Won value
                  </Th>
                  <Th width={90} align="right">
                    Win rate
                  </Th>
                  <Th width={110} align="right">
                    Service fee
                  </Th>
                </tr>
              </thead>
              <tbody>
                {byLocation.map((r) => (
                  <Tr key={r.loc.id}>
                    <Td>
                      <span className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-muted" />
                        <span className="font-medium">{r.loc.name}</span>
                      </span>
                    </Td>
                    <Td align="right" mono>
                      {r.count}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Meter value={r.openValue} max={maxOpen} className="w-24" />
                        <span className="font-mono text-sm tabular text-secondary">
                          {money(r.openValue, true)}
                        </span>
                      </div>
                    </Td>
                    <Td align="right" mono>
                      {money(r.wonValue, true)}
                    </Td>
                    <Td align="right" mono>
                      {r.winRate.toFixed(0)}%
                    </Td>
                    <Td align="right" mono className="font-medium text-brand">
                      {money(r.serviceFee)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </section>

        {/* ---- Operating standards the company administrator controls ---- */}
        <NetworkStandards />
        <AdminBuilders />

        {/* ---- Stage distribution across the company ---- */}
        <section className="pb-8">
          <SectionTitle>Where the company's work is sitting</SectionTitle>
          <Card className="p-4">
            <div className="space-y-1.5">
              {Object.values(STAGE_BY_ID)
                .filter((s) => !s.isAnchor)
                .map((s) => {
                  const rows = opportunities.filter((o) => o.stage === s.id)
                  const value = rows.reduce((sum, o) => sum + o.value, 0)
                  if (rows.length === 0) return null
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-base text-secondary">
                        {s.label}
                      </span>
                      <div className="h-4 flex-1 overflow-hidden rounded-sm bg-surface-sunken">
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.max(2, (value / Math.max(...Object.values(STAGE_BY_ID).map((x) => opportunities.filter((o) => o.stage === x.id).reduce((sm, o) => sm + o.value, 0)), 1)) * 100)}%`,
                            backgroundColor: `var(--stage-${s.group}-solid)`,
                          }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right font-mono text-sm tabular text-muted">
                        {money(value, true)}
                      </span>
                      <span className="w-8 shrink-0 text-right font-mono text-sm tabular text-muted">
                        {rows.length}
                      </span>
                    </div>
                  )
                })}
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}

/* ==========================================================================
   Network operating standards
   ==========================================================================
   The company administrator's actual product: one price book, one set of proposal
   templates, one set of checklists. Locations apply their own price
   multiplier but cannot weaken a specification or drop a checklist item,
   which is what makes the process consistent across territories.
   ========================================================================== */

function NetworkStandards() {
  const [tab, setTab] = useState<'pricebook' | 'templates' | 'checklists'>('pricebook')

  return (
    <section>
      <SectionTitle>Network operating standards</SectionTitle>

      <div className="mb-3 flex gap-1">
        {(
          [
            ['pricebook', 'Price book', BookOpen],
            ['templates', 'Proposal templates', FileText],
            ['checklists', 'Checklists', ClipboardCheck],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-base font-medium',
              'transition-colors duration-(--duration-fast)',
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

      {tab === 'pricebook' && (
        <Card>
          <CardHeader
            title="Service Area systems"
            subtitle="Selecting one of these in an estimate pulls its spec sheet, material requirement, labour assumption, install checklist, load list and exclusions automatically."
            icon={<BookOpen size={14} />}
          />
          <div className="divide-y divide-(--border-subtle)">
            {PRICE_BOOK.map((pb) => (
              <details key={pb.id} className="group">
                <summary className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-surface-inset">
                  <span
                    className="h-7 w-7 shrink-0 rounded-sm border border-subtle"
                    style={{ background: pb.swatch }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-primary">{pb.name}</span>
                    <span className="block truncate text-sm text-muted">{pb.serviceDocument}</span>
                  </span>
                  <Badge tone={pb.managedByCompany ? 'info' : 'neutral'}>
                    {pb.managedByCompany ? 'Locked' : 'Location editable'}
                  </Badge>
                  <span className="w-24 shrink-0 text-right font-mono text-base text-primary tabular">
                    {money(pb.unitPrice)}
                    <span className="block text-2xs text-muted">per {pb.unit}</span>
                  </span>
                </summary>
                <div className="grid gap-4 border-t border-subtle bg-surface-inset px-4 py-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-2xs font-semibold tracking-wider text-muted uppercase">
                      Material and labour assumptions
                    </p>
                    <ul className="space-y-0.5 text-sm text-secondary">
                      <li>
                        {pb.resourceMultiplier} resource factor{pb.resourceMultiplier === 1 ? '' : 's'} · {pb.materialRate}{' '}
                        {pb.materialUnit} per {pb.unit}
                      </li>
                      <li>{Math.round(pb.contingencyAllowance * 100)}% waste allowance</li>
                      <li>{pb.laborHoursPerUnit} labour hours per {pb.unit}</li>
                    </ul>
                    <p className="mt-2 mb-1 text-2xs font-semibold tracking-wider text-muted uppercase">
                      Exclusions
                    </p>
                    <ul className="space-y-0.5 text-sm text-secondary">
                      {pb.exclusions.map((e) => (
                        <li key={e}>· {e}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 text-2xs font-semibold tracking-wider text-muted uppercase">
                      Trailer load list
                    </p>
                    <ul className="space-y-0.5 text-sm text-secondary">
                      {pb.requiredResources.map((l) => (
                        <li key={l}>· {l}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </Card>
      )}

      {tab === 'templates' && (
        <div className="grid gap-3 lg:grid-cols-2">
          {PROPOSAL_TEMPLATES.map((t) => (
            <Card key={t.id}>
              <CardHeader
                title={t.name}
                subtitle={`${t.depositPct}% deposit · valid ${t.validDays} days`}
                icon={<FileText size={14} />}
                actions={
                  <Badge tone={t.managedByCompany ? 'info' : 'neutral'}>
                    {t.managedByCompany ? 'Company standard' : 'Location'}
                  </Badge>
                }
              />
              <div className="p-4">
                <p className="text-sm leading-relaxed text-secondary">{t.terms}</p>
                <p className="mt-3 mb-1 text-2xs font-semibold tracking-wider text-muted uppercase">
                  Standard exclusions
                </p>
                <ul className="space-y-0.5 text-sm text-secondary">
                  {t.exclusions.map((e) => (
                    <li key={e}>· {e}</li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'checklists' && (
        <div className="grid gap-3 lg:grid-cols-2">
          {CHECKLIST_TEMPLATES.map((c) => (
            <Card key={c.id}>
              <CardHeader
                title={c.name}
                subtitle={`Fires at ${STAGE_BY_ID[c.stage as keyof typeof STAGE_BY_ID]?.label ?? String(c.stage).replace(/_/g, ' ')}`}
                icon={<ClipboardCheck size={14} />}
                actions={
                  <Badge tone={c.managedByCompany ? 'info' : 'neutral'}>
                    {c.managedByCompany ? 'Locked' : 'Location'}
                  </Badge>
                }
              />
              <ul className="space-y-1 p-4 text-sm text-secondary">
                {c.items.map((i) => (
                  <li key={i.id} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-(--color-steel-400)" />
                    <span>
                      {i.label}
                      {i.helper && <span className="block text-2xs text-muted">{i.helper}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

export function Accounts() {
  const accounts = useStore((s) => s.accounts)
  const opportunities = useStore((s) => s.opportunities)
  const locationFilter = useStore((s) => s.locationFilter)

  const rows = accounts.filter((a) => locationFilter === 'all' || a.locationId === locationFilter)

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-5xl space-y-3 p-4">
        <header>
          <h1 className="font-display text-xl text-primary">Accounts</h1>
          <p className="mt-0.5 max-w-2xl text-base text-muted">
            One account, many projects. Searching here shows the work — not just a contact card
            with nothing attached to it.
          </p>
        </header>

        {rows.map((a) => {
          const projects = opportunities.filter((o) => o.accountId === a.id)
          const value = projects.reduce((s, o) => s + o.value, 0)
          return (
            <Card key={a.id}>
              <CardHeader
                icon={<Building2 size={14} />}
                title={a.name}
                subtitle={`${a.contactName} · ${a.contactTitle} · ${a.city}, ${a.state}`}
                actions={
                  <>
                    <Badge tone="neutral">{a.vertical}</Badge>
                    {a.isNational && <Badge tone="brand">National</Badge>}
                    <Badge tone={a.anchorStage === 'contact' ? 'info' : 'neutral'}>
                      {a.anchorStage}
                    </Badge>
                  </>
                }
              />
              <dl className="grid grid-cols-2 gap-4 border-b border-subtle px-4 py-2.5 sm:grid-cols-4">
                <KeyValue label="Projects">{projects.length}</KeyValue>
                <KeyValue label="Total value">{money(value)}</KeyValue>
                <KeyValue label="Source">{a.source}</KeyValue>
                <KeyValue label="Zip" mono>
                  {a.zip}
                </KeyValue>
              </dl>
              {projects.length > 0 ? (
                <div className="divide-y divide-(--border-subtle)">
                  {projects.map((o) => (
                    <Link
                      key={o.id}
                      to={`/opportunities/${o.id}`}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-surface-inset"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: `var(--stage-${STAGE_BY_ID[o.stage].group}-solid)` }}
                      />
                      <span className="min-w-0 flex-1 truncate text-base text-primary">
                        {o.name}
                      </span>
                      <span className="shrink-0 font-mono text-sm text-muted">{o.code}</span>
                      <span className="w-20 shrink-0 text-right font-mono text-base tabular text-primary">
                        {money(o.value, true)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3">
                  <Button size="sm">Create first opportunity</Button>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
