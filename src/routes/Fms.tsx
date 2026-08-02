import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  GraduationCap,
  Megaphone,
  Package,
  Percent,
  Truck,
} from 'lucide-react'
import { useStore, money, ROYALTY_RATE } from '@/store/useStore'
import { useViewer } from '@/store/selectors'
import { LOCATIONS, LOCATION_BY_ID, USER_BY_ID } from '@/data/seed'
import { PRICE_BOOK } from '@/data/priceBook'
import type { MaterialOrder } from '@/domain/types'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  SectionTitle,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import { cn } from '@/lib/cn'

/* ==========================================================================
   Franchise Management System
   ==========================================================================
   The second product. It shares authentication, branding, navigation and
   data with the Operations Platform, but it is a different job: agreements,
   royalties, the product catalogue and material fulfilment.

   The seam that matters is the material order — raised inside a project in
   the Operations Platform, fulfilled here. A user should feel one ecosystem
   without either product trying to be the other.
   ========================================================================== */

function FmsFrame({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-[80rem] px-5 py-5">
        <div className="mb-4 flex items-center gap-2">
          <Badge tone="info" icon={<Building2 size={9} />}>
            Franchise Management System
          </Badge>
          <span className="text-sm text-muted">
            Shares sign-in and data with the Operations Platform
          </span>
        </div>
        <header className="mb-5">
          <h1 className="font-display text-2xl text-primary">{title}</h1>
          <p className="mt-0.5 text-base text-muted">{subtitle}</p>
        </header>
        {children}
      </div>
    </div>
  )
}

/* ---------- Product catalogue -------------------------------------------- */

export function FmsCatalogue() {
  return (
    <FmsFrame
      title="Product catalogue"
      subtitle="What the franchisor supplies to locations. The same records back the Operations Platform price book, so a spec change propagates everywhere at once."
    >
      <Card className="overflow-hidden">
        <Table>
          <thead>
            <Tr>
              <Th>Product</Th>
              <Th>System</Th>
              <Th align="right">Coverage</Th>
              <Th align="right">Coats</Th>
              <Th align="right">Waste</Th>
              <Th align="right">Base price</Th>
              <Th>Control</Th>
            </Tr>
          </thead>
          <tbody>
            {PRICE_BOOK.map((pb) => (
              <Tr key={pb.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 shrink-0 rounded-xs border border-subtle"
                      style={{ background: pb.swatch }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-primary">{pb.name}</p>
                      <p className="truncate text-sm text-muted">{pb.specSheet}</p>
                    </div>
                  </div>
                </Td>
                <Td>{pb.system}</Td>
                <Td align="right" mono>
                  {pb.coveragePerUnit > 0 ? `${pb.coveragePerUnit} ${pb.materialUnit}/${pb.unit}` : '—'}
                </Td>
                <Td align="right" mono>
                  {pb.coats || '—'}
                </Td>
                <Td align="right" mono>
                  {pb.wasteAllowance > 0 ? `${Math.round(pb.wasteAllowance * 100)}%` : '—'}
                </Td>
                <Td align="right" mono>
                  {money(pb.unitPrice)} / {pb.unit}
                </Td>
                <Td>
                  <Badge tone={pb.managedByFranchisor ? 'info' : 'neutral'}>
                    {pb.managedByFranchisor ? 'Network standard' : 'Location editable'}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </FmsFrame>
  )
}

/* ---------- Material orders ---------------------------------------------- */

const FLOW: MaterialOrder['status'][] = ['draft', 'submitted', 'approved', 'shipped', 'delivered']

export function FmsOrders() {
  const orders = useStore((s) => s.materialOrders)
  const opportunities = useStore((s) => s.opportunities)
  const advance = useStore((s) => s.advanceMaterialOrder)
  const viewer = useViewer()
  const locationFilter = useStore((s) => s.locationFilter)

  const visible = orders.filter((o) => {
    const opp = opportunities.find((x) => x.id === o.opportunityId)
    return locationFilter === 'all' || opp?.locationId === locationFilter
  })

  return (
    <FmsFrame
      title="Material orders"
      subtitle="Orders raised from Operations Platform projects. Fulfilment lives here; the project sees the status without anyone re-entering anything."
    >
      <Card className="overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState icon={<Boxes size={26} />} title="No material orders" />
        ) : (
          <Table>
            <thead>
              <Tr>
                <Th>Order</Th>
                <Th>Project</Th>
                <Th>Location</Th>
                <Th>Lines</Th>
                <Th>Needed by</Th>
                <Th>Fulfilment</Th>
                <Th align="right">Action</Th>
              </Tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const opp = opportunities.find((x) => x.id === o.opportunityId)
                const step = FLOW.indexOf(o.status)
                return (
                  <Tr key={o.id}>
                    <Td mono>{o.fmsOrderId ?? 'Draft'}</Td>
                    <Td>
                      <Link
                        to={`/opportunities/${o.opportunityId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {opp?.name}
                      </Link>
                      <span className="flex items-center gap-1 text-sm text-muted">
                        Open in Operations Platform
                        <ArrowRight size={10} />
                      </span>
                    </Td>
                    <Td>{opp ? LOCATION_BY_ID[opp.locationId]?.name : '—'}</Td>
                    <Td>
                      {o.lines.map((l) => (
                        <span key={l.id} className="block text-sm text-secondary">
                          {l.qty} {l.unit} · {l.product}
                        </span>
                      ))}
                    </Td>
                    <Td>{format(new Date(o.neededBy), 'd MMM yyyy')}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        {FLOW.map((f, i) => (
                          <span
                            key={f}
                            title={f}
                            className={cn(
                              'h-1.5 w-5 rounded-full',
                              i <= step ? 'bg-(--status-success)' : 'bg-surface-inset',
                            )}
                          />
                        ))}
                      </div>
                      <span className="mt-0.5 block text-sm text-muted capitalize">{o.status}</span>
                      {o.trackingRef && (
                        <span className="flex items-center gap-1 font-mono text-2xs text-muted">
                          <Truck size={9} />
                          {o.trackingRef}
                        </span>
                      )}
                    </Td>
                    <Td align="right">
                      {viewer?.role === 'franchisor' && o.status !== 'delivered' && (
                        <Button size="sm" onClick={() => advance(o.id)}>
                          Advance
                        </Button>
                      )}
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </FmsFrame>
  )
}

/* ---------- Locations, agreements and royalties -------------------------- */

export function FmsLocations() {
  const s = useStore()
  const [tab, setTab] = useState<'agreements' | 'royalties' | 'compliance'>('agreements')

  return (
    <FmsFrame
      title="Locations and agreements"
      subtitle="Franchise agreements, fees and royalties, training and compliance. Deliberately separate from the Operations Platform — a location admin never needs this screen to run a job."
    >
      <div className="mb-4 flex gap-1">
        {(
          [
            ['agreements', 'Agreements', Building2],
            ['royalties', 'Fees and royalties', Percent],
            ['compliance', 'Training and compliance', GraduationCap],
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

      {tab === 'agreements' && (
        <Card className="overflow-hidden">
          <Table>
            <thead>
              <Tr>
                <Th>Location</Th>
                <Th>Owner</Th>
                <Th>Territory</Th>
                <Th>Opened</Th>
                <Th align="right">Price multiplier</Th>
                <Th>Type</Th>
              </Tr>
            </thead>
            <tbody>
              {LOCATIONS.map((l) => (
                <Tr key={l.id}>
                  <Td>
                    <p className="font-medium text-primary">{l.name}</p>
                    <p className="text-sm text-muted">
                      {l.city}, {l.state}
                    </p>
                  </Td>
                  <Td>{USER_BY_ID[l.ownerId]?.name}</Td>
                  <Td>
                    <span className="font-mono text-sm text-muted">{l.zips.join(' · ')}</span>
                  </Td>
                  <Td>{format(new Date(l.openedAt), 'MMM yyyy')}</Td>
                  <Td align="right" mono>
                    ×{l.priceMultiplier.toFixed(2)}
                  </Td>
                  <Td>
                    <Badge tone={l.isCorporate ? 'info' : 'neutral'}>
                      {l.isCorporate ? 'Corporate' : 'Franchise'}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'royalties' && (
        <Card className="overflow-hidden">
          <CardHeader
            title="Royalty accrual"
            subtitle="5% of gross invoiced revenue, calculated from Operations Platform invoices"
            icon={<Percent size={14} />}
          />
          <Table>
            <thead>
              <Tr>
                <Th>Location</Th>
                <Th align="right">Invoiced</Th>
                <Th align="right">Collected</Th>
                <Th align="right">Royalty accrued</Th>
                <Th align="right">Royalty on collected</Th>
              </Tr>
            </thead>
            <tbody>
              {LOCATIONS.map((l) => {
                const opps = s.opportunities.filter((o) => o.locationId === l.id)
                const inv = s.invoices.filter((i) => opps.some((o) => o.id === i.opportunityId))
                const billed = inv.reduce((a, i) => a + i.amount, 0)
                const collected = inv.reduce(
                  (a, i) => a + i.payments.reduce((p, x) => p + x.amount, 0),
                  0,
                )
                return (
                  <Tr key={l.id}>
                    <Td>{l.name}</Td>
                    <Td align="right" mono>
                      {money(billed)}
                    </Td>
                    <Td align="right" mono>
                      {money(collected)}
                    </Td>
                    <Td align="right" mono>
                      {money(billed * ROYALTY_RATE)}
                    </Td>
                    <Td align="right" mono>
                      {money(collected * ROYALTY_RATE)}
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {tab === 'compliance' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Training and certification" icon={<GraduationCap size={14} />} />
            <div className="p-1">
              {[
                ['Urethane cement installation', 'Chicago, Atlanta', 'Denver outstanding'],
                ['MMA rapid-cure certification', 'Chicago, Denver', 'Atlanta outstanding'],
                ['Moisture testing and mitigation', 'All locations', null],
                ['USDA / GMP site protocol', 'Chicago, Atlanta', 'Denver outstanding'],
              ].map(([course, done, outstanding]) => (
                <div key={course} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium text-primary">{course}</p>
                    <p className="text-sm text-muted">Certified: {done}</p>
                  </div>
                  {outstanding ? (
                    <Badge tone="warning">{outstanding}</Badge>
                  ) : (
                    <Badge tone="success" icon={<CheckCircle2 size={9} />}>
                      Complete
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Franchisor communication" icon={<Megaphone size={14} />} />
            <div className="p-1">
              {[
                ['Urethane cement price adjustment', 'Effective 1 September across the network'],
                ['New MMA supplier onboarded', 'Lead times drop from 12 to 6 days'],
                ['Q4 national campaign assets', 'Landing pages route by zip to your territory'],
              ].map(([title, detail]) => (
                <div key={title} className="px-3 py-2">
                  <p className="text-base font-medium text-primary">{title}</p>
                  <p className="text-sm text-muted">{detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </FmsFrame>
  )
}

export { Package, FileSpreadsheet, SectionTitle }
