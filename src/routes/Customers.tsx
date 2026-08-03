import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useStore, money } from '@/store/useStore'
import { STAGE_BY_ID } from '@/domain/stages'
import type { Account } from '@/domain/types'
import { Badge, Button, Card, CardHeader, FieldRow, Input, Modal, Select } from '@/components/ui'

export function Customers() {
  const accounts = useStore((state) => state.accounts)
  const opportunities = useStore((state) => state.opportunities)
  const locationFilter = useStore((state) => state.locationFilter)
  const locations = useStore((state) => state.locations)
  const upsertAccount = useStore((state) => state.upsertAccount)
  const rows = accounts.filter((account) => locationFilter === 'all' || account.locationId === locationFilter)
  const [editing, setEditing] = useState<Account | null>(null)
  const [draft, setDraft] = useState<Account | null>(null)

  const openCreate = () => {
    const defaultLocation = locationFilter === 'all' ? locations[0]?.id ?? '' : locationFilter
    setEditing(null)
    setDraft({
      id: `ac_${Date.now().toString(36)}`,
      name: '',
      vertical: 'Commercial',
      locationId: defaultLocation,
      contactName: '',
      contactTitle: 'Primary contact',
      email: '',
      phone: '',
      city: '',
      state: '',
      zip: '',
      isNational: false,
      source: 'Manual Entry',
      createdAt: new Date().toISOString(),
      anchorStage: 'contact',
      lastActivityAt: new Date().toISOString(),
    })
  }

  const openEdit = (account: Account) => {
    setEditing(account)
    setDraft({ ...account })
  }

  const saveAccount = () => {
    if (!draft || !draft.name.trim()) return
    upsertAccount({ ...draft, lastActivityAt: new Date().toISOString() })
    setDraft(null)
    setEditing(null)
  }

  return (
    <div className='h-full overflow-y-auto scrollbar-thin bg-surface-sunken'>
      <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6'>
        <header>
          <h1 className='font-display text-xl text-primary'>Customers</h1>
          <p className='mt-0.5 max-w-2xl text-base text-muted'>
            Companies, contacts, service locations, opportunities, and jobs stay connected in one workspace.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={openCreate}>New customer</Button>
            <Link to="/intake">
              <Button size="sm">New lead / customer</Button>
            </Link>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {rows.map((account) => {
            const work = opportunities.filter((opportunity) => opportunity.accountId === account.id)
            const value = work.reduce((sum, opportunity) => sum + opportunity.value, 0)
            return (
              <Card key={account.id} className="flex flex-col">
                <CardHeader icon={<Building2 size={14} />} title={account.name}
                  subtitle={`${account.contactName} · ${account.contactTitle} · ${account.city}, ${account.state}`}
                  actions={<div className="flex items-center gap-2"><Button size="sm" variant="ghost" onClick={() => openEdit(account)}>Edit</Button><Badge tone='neutral'>{account.vertical}</Badge>{account.isNational && <Badge tone='brand'>National</Badge>}</div>}
                />
                <dl className='grid grid-cols-2 gap-4 border-b border-subtle/50 px-4 py-3 sm:grid-cols-2'>
                  <Metric label='Opportunities'>{work.length}</Metric><Metric label='Total value'>{money(value)}</Metric>
                  <Metric label='Source'>{account.source}</Metric><Metric label='Postal code' mono>{account.zip}</Metric>
                </dl>
                {work.length > 0 ? <div className='divide-y divide-subtle/50 flex-1 overflow-y-auto'>
                  {work.map((opportunity) => <Link key={opportunity.id} to={`/opportunities/${opportunity.id}`} className='flex items-center gap-3 px-4 py-3 hover:bg-surface-inset transition-colors'>
                    <span className='h-2.5 w-2.5 shrink-0 rounded-full' style={{ backgroundColor: `var(--stage-${STAGE_BY_ID[opportunity.stage].group}-solid)` }} />
                    <span className='min-w-0 flex-1 truncate text-base font-medium text-primary'>{opportunity.name}</span>
                    <span className='w-20 shrink-0 text-right font-mono text-base tabular text-primary'>{money(opportunity.value, true)}</span>
                  </Link>)}
                </div> : <div className='px-4 py-4 flex-1 flex flex-col justify-center'><Link to="/intake"><Button size='sm' className="w-full">Create first opportunity</Button></Link></div>}
              </Card>
            )
          })}
        </div>
        <Modal
          open={Boolean(draft)}
          onClose={() => {
            setDraft(null)
            setEditing(null)
          }}
          title={editing ? 'Edit customer' : 'New customer'}
          subtitle="Create or update the customer account before work is attached."
        >
          {draft && (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldRow label="Company / customer name">
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </FieldRow>
                <FieldRow label="Location">
                  <Select value={draft.locationId} onChange={(e) => setDraft({ ...draft, locationId: e.target.value })}>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>{location.name}</option>
                    ))}
                  </Select>
                </FieldRow>
                <FieldRow label="Contact name">
                  <Input value={draft.contactName} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} />
                </FieldRow>
                <FieldRow label="Contact title">
                  <Input value={draft.contactTitle} onChange={(e) => setDraft({ ...draft, contactTitle: e.target.value })} />
                </FieldRow>
                <FieldRow label="Email">
                  <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                </FieldRow>
                <FieldRow label="Phone">
                  <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                </FieldRow>
                <FieldRow label="City">
                  <Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
                </FieldRow>
                <FieldRow label="State">
                  <Input value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} />
                </FieldRow>
                <FieldRow label="ZIP">
                  <Input value={draft.zip} onChange={(e) => setDraft({ ...draft, zip: e.target.value })} />
                </FieldRow>
                <FieldRow label="Type">
                  <Select value={draft.vertical} onChange={(e) => setDraft({ ...draft, vertical: e.target.value as Account['vertical'] })}>
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Retail">Retail</option>
                    <option value="Hospitality">Hospitality</option>
                    <option value="Institutional">Institutional</option>
                  </Select>
                </FieldRow>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setDraft(null); setEditing(null) }}>Close</Button>
                <Button size="sm" onClick={saveAccount} disabled={!draft.name.trim()}>{editing ? 'Update customer' : 'Create customer'}</Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}

function Metric({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return <div><dt className='text-2xs tracking-wide text-muted uppercase'>{label}</dt><dd className={mono ? 'font-mono text-base text-primary' : 'text-base text-primary'}>{children}</dd></div>
}
