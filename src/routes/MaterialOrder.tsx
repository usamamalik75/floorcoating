import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Calculator,
  CheckCircle2,
  Package,
  RotateCcw,
  Send,
  Truck,
} from 'lucide-react'
import { useStore, money } from '@/store/useStore'
import { PRICE_BOOK_BY_ID, deriveMaterial } from '@/data/priceBook'
import { ACCOUNT_BY_ID, iso } from '@/data/seed'
import type { MaterialLine, MaterialOrder as MO } from '@/domain/types'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import { cn } from '@/lib/cn'

/* ==========================================================================
   Material planning and ordering
   ==========================================================================
   The client's calculation, made explicit:

     selected system + square footage + cove + coats + waste allowance
       → an orderable quantity

   The project manager never starts from a blank page, but every line stays
   editable because the floor always has a surprise in it. Submitting hands
   the order to the Franchise Management System, which is where fulfilment
   lives — the two products overlap exactly here.
   ========================================================================== */

const FLOW: MO['status'][] = ['draft', 'submitted', 'approved', 'shipped', 'delivered']

const STATUS_LABEL: Record<MO['status'], string> = {
  draft: 'Draft',
  submitted: 'Submitted to franchisor',
  approved: 'Approved',
  shipped: 'Shipped',
  delivered: 'Delivered',
}

let n = 0
const uid = (p: string) => `${p}_${Date.now()}_${++n}`

export function MaterialOrder() {
  const { id = '' } = useParams()
  const opportunity = useStore((s) => s.opportunities.find((o) => o.id === id))
  const estimate = useStore((s) => s.estimates.find((e) => e.opportunityId === id))
  const order = useStore((s) => s.materialOrders.find((m) => m.opportunityId === id))
  const upsert = useStore((s) => s.upsertMaterialOrder)
  const submit = useStore((s) => s.submitMaterialOrder)
  const advance = useStore((s) => s.advanceMaterialOrder)
  const moveStage = useStore((s) => s.moveStage)
  const [neededBy, setNeededBy] = useState(iso(7).slice(0, 10))

  /**
   * Everything sold on the estimate, collapsed to one quantity per system,
   * then run through the coverage / coats / waste calculation.
   */
  const derived = useMemo<MaterialLine[]>(() => {
    if (!estimate) return []
    const byProduct = new Map<string, number>()
    estimate.options
      .filter((o) => o.kind === 'area' || o.selectedByCustomer || o.recommended)
      .flatMap((o) => o.lineItems)
      .forEach((li) => byProduct.set(li.priceBookId, (byProduct.get(li.priceBookId) ?? 0) + li.qty))

    return [...byProduct.entries()]
      .map(([priceBookId, qty]) => {
        const d = deriveMaterial(priceBookId, qty)
        if (!d) return null
        return {
          id: uid('ml'),
          priceBookId,
          product: d.product,
          qty: d.qty,
          unit: d.unit,
          derivation: d.derivation,
          adjusted: false,
        }
      })
      .filter(Boolean) as MaterialLine[]
  }, [estimate])

  if (!opportunity) return <EmptyState title="Opportunity not found" className="h-full" />

  const account = ACCOUNT_BY_ID[opportunity.accountId]
  const lines = order?.lines ?? derived
  const stepIndex = order ? FLOW.indexOf(order.status) : -1

  const create = () => {
    upsert({
      id: uid('mo'),
      opportunityId: opportunity.id,
      lines: derived,
      status: 'draft',
      submittedAt: null,
      neededBy: new Date(neededBy).toISOString(),
      fmsOrderId: null,
      trackingRef: null,
    })
  }

  const patchLine = (lineId: string, qty: number) => {
    if (!order) return
    upsert({
      ...order,
      lines: order.lines.map((l) => (l.id === lineId ? { ...l, qty, adjusted: true } : l)),
    })
  }

  const resetLine = (lineId: string) => {
    if (!order) return
    const original = derived.find((d) => d.priceBookId === order.lines.find((l) => l.id === lineId)?.priceBookId)
    if (!original) return
    upsert({
      ...order,
      lines: order.lines.map((l) => (l.id === lineId ? { ...l, qty: original.qty, adjusted: false } : l)),
    })
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-[62rem] px-5 py-5">
        <Link
          to={`/opportunities/${opportunity.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
        >
          <ArrowLeft size={13} />
          Back to record
        </Link>

        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-primary">Material order</h1>
            <p className="mt-0.5 text-base text-muted">
              {account?.name} · {opportunity.name}
            </p>
          </div>
          {order && (
            <div className="flex items-center gap-2">
              {order.fmsOrderId && (
                <Link to="/fms/orders">
                  <Badge tone="info" icon={<Boxes size={9} />}>
                    {order.fmsOrderId}
                  </Badge>
                </Link>
              )}
              <Badge tone={order.status === 'delivered' ? 'success' : 'attention'}>
                {STATUS_LABEL[order.status]}
              </Badge>
            </div>
          )}
        </header>

        {/* Fulfilment tracker */}
        {order && (
          <Card className="mb-4 px-4 py-3">
            <div className="flex items-center gap-1">
              {FLOW.map((s, i) => (
                <div key={s} className="flex flex-1 items-center gap-1">
                  <div className="flex-1">
                    <div
                      className={cn(
                        'h-1 rounded-full',
                        i <= stepIndex ? 'bg-(--status-success)' : 'bg-surface-inset',
                      )}
                    />
                    <p
                      className={cn(
                        'mt-1.5 text-2xs',
                        i <= stepIndex ? 'font-medium text-primary' : 'text-muted',
                      )}
                    >
                      {STATUS_LABEL[s]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-subtle pt-3 text-sm text-muted">
              <span>Needed by {format(new Date(order.neededBy), 'd MMM yyyy')}</span>
              {order.trackingRef && (
                <span className="flex items-center gap-1.5">
                  <Truck size={12} />
                  <span className="font-mono">{order.trackingRef}</span>
                </span>
              )}
              <div className="ml-auto flex gap-2">
                {order.status === 'draft' && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      submit(order.id)
                      if (opportunity.stage === 'material_required') moveStage(opportunity.id, 'ready_install')
                    }}
                  >
                    <Send size={13} />
                    Submit to franchisor
                  </Button>
                )}
                {order.status !== 'draft' && order.status !== 'delivered' && (
                  <Button onClick={() => advance(order.id)}>
                    <ArrowRight size={13} />
                    Advance fulfilment
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {lines.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Package size={28} />}
              title="Nothing to order yet"
              description="Material quantities are derived from the sold estimate. Build the estimate first and this list will fill itself in."
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader
              title="Derived material requirement"
              subtitle="Calculated from the sold system, area, coats and waste allowance"
              icon={<Calculator size={14} />}
              actions={
                !order && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={neededBy}
                      onChange={(e) => setNeededBy(e.target.value)}
                      className="h-7 max-w-[9.5rem]"
                    />
                    <Button size="sm" variant="primary" onClick={create}>
                      Create order
                    </Button>
                  </div>
                )
              }
            />
            <Table>
              <thead>
                <Tr>
                  <Th>Product</Th>
                  <Th>How this was calculated</Th>
                  <Th align="right">Quantity</Th>
                  <Th align="right">Est. cost</Th>
                </Tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const pb = PRICE_BOOK_BY_ID[l.priceBookId]
                  return (
                    <Tr key={l.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-5 w-5 shrink-0 rounded-xs border border-subtle"
                            style={{ background: pb?.swatch }}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-primary">{l.product}</p>
                            {l.adjusted && (
                              <span className="text-2xs text-attention-text">Adjusted by the PM</span>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-sm text-muted">{l.derivation}</span>
                      </Td>
                      <Td align="right">
                        {order && order.status === 'draft' ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              value={l.qty}
                              onChange={(e) => patchLine(l.id, Number(e.target.value))}
                              className="h-7 w-20 text-right"
                            />
                            <span className="w-8 text-left text-sm text-muted">{l.unit}</span>
                            {l.adjusted && (
                              <Button size="sm" variant="ghost" onClick={() => resetLine(l.id)} aria-label="Reset">
                                <RotateCcw size={11} />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono tabular">
                            {l.qty} {l.unit}
                          </span>
                        )}
                      </Td>
                      <Td align="right" mono>
                        {money(l.qty * (pb?.materialCost ?? 0))}
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
            <div className="flex items-center justify-between gap-3 border-t border-subtle bg-surface-inset px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <CheckCircle2 size={12} />
                Fulfilment is handled in the Franchise Management System. The order is initiated here
                so the project manager never leaves the job.
              </p>
              <span className="font-mono text-base font-semibold text-primary tabular">
                {money(
                  lines.reduce(
                    (s, l) => s + l.qty * (PRICE_BOOK_BY_ID[l.priceBookId]?.materialCost ?? 0),
                    0,
                  ),
                )}
              </span>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
