import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowRight, Boxes, Package, Send, Truck } from 'lucide-react'
import type { ProcurementLine, ProcurementOrder as PO } from '@/domain/types'
import { deriveMaterial } from '@/data/priceBook'
import { iso } from '@/data/seed'
import { money, useStore } from '@/store/useStore'
import { usePriceBookItems } from '@/store/selectors'
import { Badge, Button, Card, EmptyState, Input } from '@/components/ui'
import { cn } from '@/lib/cn'

const FLOW: PO['status'][] = ['draft', 'submitted', 'approved', 'shipped', 'delivered']

export const PROCUREMENT_STATUS_LABEL: Record<PO['status'], string> = {
  draft: 'Draft',
  submitted: 'Submitted to purchasing',
  approved: 'Approved',
  shipped: 'Shipped',
  delivered: 'Delivered',
}

let n = 0
const uid = (p: string) => `${p}_${Date.now()}_${++n}`

function statusTone(status: PO['status'] | null): 'success' | 'attention' | 'warning' | 'info' {
  if (!status) return 'warning'
  if (status === 'delivered') return 'success'
  if (status === 'draft') return 'info'
  return 'attention'
}

/**
 * Procurement order on the job hub: see status and run create / submit / advance
 * without leaving the opportunity. Full line editing stays on the procurement page.
 */
export function JobProcurementPanel({ opportunityId }: { opportunityId: string }) {
  const estimate = useStore((s) => s.estimates.find((e) => e.opportunityId === opportunityId))
  const order = useStore((s) => s.procurementOrders.find((m) => m.opportunityId === opportunityId))
  const job = useStore((s) => s.jobs.find((j) => j.opportunityId === opportunityId))
  const upsert = useStore((s) => s.upsertProcurementOrder)
  const submit = useStore((s) => s.submitProcurementOrder)
  const advance = useStore((s) => s.advanceProcurementOrder)
  const setJobStatus = useStore((s) => s.setJobStatus)
  const priceBookItems = usePriceBookItems()
  const [neededBy, setNeededBy] = useState(iso(7).slice(0, 10))

  const derived = useMemo<ProcurementLine[]>(() => {
    if (!estimate) return []
    const byProduct = new Map<string, number>()
    estimate.options
      .filter((o) => o.kind === 'scope' || o.selectedByCustomer || o.recommended)
      .flatMap((o) => o.lineItems)
      .forEach((li) => byProduct.set(li.priceBookId, (byProduct.get(li.priceBookId) ?? 0) + li.qty))

    return [...byProduct.entries()]
      .map(([priceBookId, qty]) => {
        const d = deriveMaterial(priceBookId, qty, priceBookItems)
        if (!d) return null
        return {
          id: `ml_${priceBookId}`,
          priceBookId,
          product: d.product,
          qty: d.qty,
          unit: d.unit,
          derivation: d.derivation,
          adjusted: false,
        }
      })
      .filter(Boolean) as ProcurementLine[]
  }, [estimate, priceBookItems])

  const lines = order?.lines ?? derived
  const stepIndex = order ? FLOW.indexOf(order.status) : -1
  const estCost = lines.reduce(
    (sum, l) =>
      sum + l.qty * (priceBookItems.find((item) => item.id === l.priceBookId)?.materialCost ?? 0),
    0,
  )

  const create = () => {
    if (derived.length === 0) return
    upsert({
      id: uid('mo'),
      opportunityId,
      lines: derived.map((l) => ({ ...l, id: uid('ml') })),
      status: 'draft',
      submittedAt: null,
      neededBy: new Date(neededBy).toISOString(),
      purchaseOrderId: null,
      trackingRef: null,
    })
  }

  const submitOrder = () => {
    if (!order) return
    submit(order.id)
    if (job?.status === 'procurement_required' || job?.status === 'scheduled') {
      setJobStatus(opportunityId, 'procurement_ordered')
    }
  }

  const advanceOrder = () => {
    if (!order) return
    advance(order.id)
    const next = FLOW[Math.min(FLOW.length - 1, FLOW.indexOf(order.status) + 1)]
    if (next === 'delivered' && job && jobStatusBeforeReady(job.status)) {
      setJobStatus(opportunityId, 'ready_to_start')
    }
  }

  return (
    <Card className="overflow-hidden border-strong">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle bg-surface-inset px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Package size={14} className="text-muted" />
          <p className="text-sm font-semibold text-primary">Procurement order</p>
          <Badge tone={statusTone(order?.status ?? null)}>
            {order ? PROCUREMENT_STATUS_LABEL[order.status] : 'Not started'}
          </Badge>
          {order?.purchaseOrderId && (
            <Link to="/purchasing">
              <Badge tone="info" icon={<Boxes size={9} />}>
                {order.purchaseOrderId}
              </Badge>
            </Link>
          )}
        </div>
        <Link to={`/opportunities/${opportunityId}/procurement`}>
          <Button size="sm">
            {order ? 'Open full order' : 'Open order page'}
            <ArrowRight size={12} />
          </Button>
        </Link>
      </div>

      {order && (
        <div className="border-b border-subtle px-4 py-3">
          <div className="flex items-center gap-1">
            {FLOW.map((s, i) => (
              <div key={s} className="flex min-w-0 flex-1 items-center gap-1">
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      'h-1 rounded-full',
                      i <= stepIndex ? 'bg-(--status-success)' : 'bg-surface-inset',
                    )}
                  />
                  <p
                    className={cn(
                      'mt-1.5 truncate text-2xs',
                      i <= stepIndex ? 'font-medium text-primary' : 'text-muted',
                    )}
                  >
                    {PROCUREMENT_STATUS_LABEL[s]}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>Needed by {format(new Date(order.neededBy), 'd MMM yyyy')}</span>
            {order.trackingRef && (
              <span className="flex items-center gap-1.5">
                <Truck size={12} />
                <span className="font-mono">{order.trackingRef}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {!order && lines.length === 0 ? (
        <EmptyState
          title="Nothing to order yet"
          description="Resources are derived from the sold quote. Finish the estimate, then create a procurement order here."
        />
      ) : !order ? (
        <div className="space-y-3 p-4">
          <p className="text-sm text-secondary">
            {lines.length} resource line{lines.length === 1 ? '' : 's'} ready from the sold scope
            {estCost > 0 ? ` · est. ${money(estCost)}` : ''}. Create a draft order to send to purchasing.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-sm">
              <span className="mb-1 block text-2xs font-semibold tracking-wider text-muted uppercase">
                Needed by
              </span>
              <Input
                type="date"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
                className="h-8 max-w-[10rem]"
              />
            </label>
            <Button variant="primary" onClick={create}>
              <Package size={13} />
              Create draft order
            </Button>
          </div>
          <LinePreview lines={lines.slice(0, 4)} more={Math.max(0, lines.length - 4)} />
        </div>
      ) : (
        <div className="space-y-3 p-4">
          <LinePreview lines={order.lines.slice(0, 5)} more={Math.max(0, order.lines.length - 5)} />
          {estCost > 0 && (
            <p className="text-sm text-muted">
              Est. materials <span className="font-mono text-primary tabular">{money(estCost)}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {order.status === 'draft' && (
              <Button variant="primary" onClick={submitOrder}>
                <Send size={13} />
                Submit to purchasing
              </Button>
            )}
            {order.status !== 'draft' && order.status !== 'delivered' && (
              <Button variant="primary" onClick={advanceOrder}>
                <ArrowRight size={13} />
                Advance fulfilment
              </Button>
            )}
            {order.status === 'delivered' && (
              <Badge tone="success">Materials delivered — ready for prep / install</Badge>
            )}
            <Link to={`/opportunities/${opportunityId}/procurement`}>
              <Button size="sm">Edit quantities</Button>
            </Link>
            <Link to="/purchasing">
              <Button size="sm">Purchasing board</Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  )
}

function LinePreview({ lines, more }: { lines: ProcurementLine[]; more: number }) {
  const priceBookItems = usePriceBookItems()
  if (lines.length === 0) return null
  return (
    <ul className="divide-y divide-(--border-subtle) rounded-md border border-subtle">
      {lines.map((l) => (
        <li key={l.id} className="flex items-center gap-3 px-3 py-2">
          <span
            className="h-4 w-4 shrink-0 rounded-xs border border-subtle"
            style={{
              background: priceBookItems.find((item) => item.id === l.priceBookId)?.swatch,
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-primary">{l.product}</p>
            <p className="truncate text-2xs text-muted">{l.derivation}</p>
          </div>
          <span className="shrink-0 font-mono text-sm text-primary tabular">
            {l.qty} {l.unit}
          </span>
        </li>
      ))}
      {more > 0 && (
        <li className="px-3 py-1.5 text-2xs text-muted">+{more} more line{more === 1 ? '' : 's'}</li>
      )}
    </ul>
  )
}

function jobStatusBeforeReady(
  status: string,
): boolean {
  return (
    status === 'scheduling_required' ||
    status === 'scheduled' ||
    status === 'procurement_required' ||
    status === 'procurement_ordered'
  )
}
