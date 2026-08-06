import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowRight, Boxes, Plus, Truck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useLocations, useViewer } from '@/store/selectors'
import type { ProcurementOrder } from '@/domain/types'
import { Badge, Button, Card, EmptyState, Modal, Table, Td, Th, Tr } from '@/components/ui'
import { cn } from '@/lib/cn'

const FLOW: ProcurementOrder['status'][] = ['draft', 'submitted', 'approved', 'shipped', 'delivered']

export function PurchasingOrders() {
  const orders = useStore((state) => state.procurementOrders)
  const opportunities = useStore((state) => state.opportunities)
  const locations = useLocations()
  const advance = useStore((state) => state.advanceProcurementOrder)
  const locationFilter = useStore((state) => state.locationFilter)
  const viewer = useViewer()
  const canAdvanceOrders = viewer?.orgRole === 'platform_admin'
    || viewer?.orgRole === 'regional_admin'
    || viewer?.orgRole === 'franchise_admin'

  const visible = orders.filter((order) => {
    const opportunity = opportunities.find((item) => item.id === order.opportunityId)
    return locationFilter === 'all' || opportunity?.locationId === locationFilter
  })

  return (
    <div>
      <div className='mb-4'>
        <Badge tone='info' icon={<Boxes size={10} />}>Purchasing and fulfilment</Badge>
        <p className='mt-1 text-sm text-muted'>
          Resource requirements created from sold work move through purchasing without re-entry.
        </p>
      </div>
      <Card className='overflow-hidden'>
        {visible.length === 0 ? (
          <EmptyState icon={<Boxes size={26} />} title='No purchasing orders' />
        ) : (
          <Table>
            <thead>
              <Tr>
                <Th>Order</Th><Th>Job</Th><Th>Location</Th><Th>Requirements</Th><Th>Needed by</Th><Th>Fulfilment</Th><Th align='right'>Action</Th>
              </Tr>
            </thead>
            <tbody>
              {visible.map((order) => {
                const opportunity = opportunities.find((item) => item.id === order.opportunityId)
                const currentStep = FLOW.indexOf(order.status)
                return (
                  <Tr key={order.id}>
                    <Td mono>{order.purchaseOrderId ?? 'Draft'}</Td>
                    <Td>
                      <Link to={`/opportunities/${order.opportunityId}`} className='font-medium text-primary hover:underline'>
                        {opportunity?.name}
                      </Link>
                      <span className='flex items-center gap-1 text-sm text-muted'>Open job record <ArrowRight size={10} /></span>
                    </Td>
                    <Td>{opportunity ? locations.find((l) => l.id === opportunity.locationId)?.name : '—'}</Td>
                    <Td>
                      {order.lines.map((line) => (
                        <span key={line.id} className='block text-sm text-secondary'>{line.qty} {line.unit} · {line.product}</span>
                      ))}
                    </Td>
                    <Td>{format(new Date(order.neededBy), 'd MMM yyyy')}</Td>
                    <Td>
                      <div className='flex items-center gap-1'>
                        {FLOW.map((step, index) => (
                          <span key={step} className={cn('h-1.5 w-5 rounded-full', index <= currentStep ? 'bg-(--status-success)' : 'bg-surface-inset')} />
                        ))}
                      </div>
                      <span className='mt-0.5 block text-sm text-muted capitalize'>{order.status}</span>
                      {order.trackingRef && <span className='flex items-center gap-1 font-mono text-2xs text-muted'><Truck size={9} />{order.trackingRef}</span>}
                    </Td>
                    <Td align='right'>
                      {canAdvanceOrders && order.status !== 'delivered' && (
                        <Button size='sm' onClick={() => advance(order.id)}>Advance</Button>
                      )}
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}

export function Purchasing() {
  const [creating, setCreating] = useState(false)
  const orders = useStore((state) => state.procurementOrders)
  const opportunities = useStore((state) => state.opportunities)
  const jobs = useStore((state) => state.jobs)
  const locations = useLocations()
  const locationFilter = useStore((state) => state.locationFilter)
  const candidates = opportunities.filter((opportunity) => {
    if (opportunity.stage !== 'awarded') return false
    if (locationFilter !== 'all' && opportunity.locationId !== locationFilter) return false
    if (orders.some((order) => order.opportunityId === opportunity.id)) return false
    const job = jobs.find((candidate) => candidate.opportunityId === opportunity.id)
    return job?.status === 'procurement_required'
  })

  return (
    <div className='h-full overflow-y-auto scrollbar-thin'>
      <div className='w-full px-5 py-5'>
        <header className='mb-4 flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='font-display text-2xl text-primary'>Purchasing</h1>
            <p className='mt-0.5 text-base text-muted'>
              Job-specific resources and supplies moving from request through fulfilment.
            </p>
          </div>
          <Button size='sm' variant='primary' onClick={() => setCreating(true)}>
            <Plus size={12} />
            Prepare order
          </Button>
        </header>
        <PurchasingOrders />
        <Modal
          open={creating}
          onClose={() => setCreating(false)}
          title="Prepare order"
          subtitle="Open a job that needs procurement and create its order."
        >
          <div className="space-y-2">
            {candidates.length === 0 ? (
              <EmptyState title="No jobs need ordering" description="Jobs move here when the workflow marks procurement as required." />
            ) : (
              candidates.map((opportunity) => (
                <Link
                  key={opportunity.id}
                  to={`/opportunities/${opportunity.id}/procurement`}
                  onClick={() => setCreating(false)}
                  className="flex items-start justify-between gap-3 rounded-md border border-subtle bg-surface-raised px-3 py-2.5 hover:border-strong"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-primary">{opportunity.name}</p>
                    <p className="text-sm text-muted">{locations.find((l) => l.id === opportunity.locationId)?.name}</p>
                  </div>
                  <Badge tone="warning">Procurement required</Badge>
                </Link>
              ))
            )}
          </div>
        </Modal>
      </div>
    </div>
  )
}
