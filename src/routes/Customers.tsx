import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useStore, money } from '@/store/useStore'
import { STAGE_BY_ID } from '@/domain/stages'
import { Badge, Button, Card, CardHeader } from '@/components/ui'

export function Customers() {
  const accounts = useStore((state) => state.accounts)
  const opportunities = useStore((state) => state.opportunities)
  const locationFilter = useStore((state) => state.locationFilter)
  const rows = accounts.filter((account) => locationFilter === 'all' || account.locationId === locationFilter)

  return (
    <div className='h-full overflow-y-auto scrollbar-thin'>
      <div className='mx-auto max-w-5xl space-y-3 p-4'>
        <header>
          <h1 className='font-display text-xl text-primary'>Customers</h1>
          <p className='mt-0.5 max-w-2xl text-base text-muted'>
            Companies, contacts, service locations, opportunities, and jobs stay connected in one workspace.
          </p>
        </header>
        {rows.map((account) => {
          const work = opportunities.filter((opportunity) => opportunity.accountId === account.id)
          const value = work.reduce((sum, opportunity) => sum + opportunity.value, 0)
          return (
            <Card key={account.id}>
              <CardHeader icon={<Building2 size={14} />} title={account.name}
                subtitle={`${account.contactName} · ${account.contactTitle} · ${account.city}, ${account.state}`}
                actions={<><Badge tone='neutral'>{account.vertical}</Badge>{account.isNational && <Badge tone='brand'>National</Badge>}</>}
              />
              <dl className='grid grid-cols-2 gap-4 border-b border-subtle px-4 py-2.5 sm:grid-cols-4'>
                <Metric label='Opportunities'>{work.length}</Metric><Metric label='Total value'>{money(value)}</Metric>
                <Metric label='Source'>{account.source}</Metric><Metric label='Postal code' mono>{account.zip}</Metric>
              </dl>
              {work.length > 0 ? <div className='divide-y divide-(--border-subtle)'>
                {work.map((opportunity) => <Link key={opportunity.id} to={`/opportunities/${opportunity.id}`} className='flex items-center gap-3 px-4 py-2 hover:bg-surface-inset'>
                  <span className='h-2 w-2 shrink-0 rounded-full' style={{ backgroundColor: `var(--stage-${STAGE_BY_ID[opportunity.stage].group}-solid)` }} />
                  <span className='min-w-0 flex-1 truncate text-base text-primary'>{opportunity.name}</span>
                  <span className='shrink-0 font-mono text-sm text-muted'>{opportunity.code}</span>
                  <span className='w-20 shrink-0 text-right font-mono text-base tabular text-primary'>{money(opportunity.value, true)}</span>
                </Link>)}
              </div> : <div className='px-4 py-3'><Button size='sm'>Create first opportunity</Button></div>}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Metric({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return <div><dt className='text-2xs tracking-wide text-muted uppercase'>{label}</dt><dd className={mono ? 'font-mono text-base text-primary' : 'text-base text-primary'}>{children}</dd></div>
}
