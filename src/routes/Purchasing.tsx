import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowRight, Boxes, Truck } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useViewer } from '@/store/selectors'
import { LOCATION_BY_ID } from '@/data/seed'
import type { MaterialOrder } from '@/domain/types'
import { Badge, Button, Card, EmptyState, Table, Td, Th, Tr } from '@/components/ui'
import { cn } from '@/lib/cn'

const FLOW: MaterialOrder['status'][] = ['draft', 'submitted', 'approved', 'shipped', 'delivered']

export function PurchasingOrders() {
  const orders = useStore((state) => state.materialOrders)
  const opportunities = useStore((state) => state.opportunities)
  const advance = useStore((state) => state.advanceMaterialOrder)
  const locationFilter = useStore((state) => state.locationFilter)
  const viewer = useViewer()

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
                    <Td>{opportunity ? LOCATION_BY_ID[opportunity.locationId]?.name : '—'}</Td>
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
                      {viewer?.role === 'admin' && order.status !== 'delivered' && (
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
  return (
    <div className='h-full overflow-y-auto scrollbar-thin'>
      <div className='mx-auto max-w-[80rem] px-5 py-5'>
        <header className='mb-4'>
          <h1 className='font-display text-2xl text-primary'>Purchasing</h1>
          <p className='mt-0.5 text-base text-muted'>
            Job-specific resources and supplies moving from request through fulfilment.
          </p>
        </header>
        <PurchasingOrders />
      </div>
    </div>
  )
}
