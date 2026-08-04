import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Plus, Search, Wrench } from 'lucide-react'
import { money, useStore } from '@/store/useStore'
import type { Category } from '@/domain/types'
import { Badge, Button, Card, Input, Modal, Select, Table, Td, Th, Tr } from '@/components/ui'

export function Catalogue() {
  const priceBookItems = useStore((s) => s.priceBookItems)
  const upsertPriceBookItem = useStore((s) => s.upsertPriceBookItem)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({
    name: '',
    catalogueGroup: 'Coatings',
    unit: 'sq ft',
    unitPrice: '0',
    description: '',
    category: 'commercial' as Category,
  })

  const groups = useMemo(
    () => [...new Set(priceBookItems.map((item) => item.catalogueGroup))].sort(),
    [priceBookItems],
  )
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return priceBookItems.filter(
      (item) =>
        (group === 'all' || item.catalogueGroup === group) &&
        (!needle ||
          item.name.toLowerCase().includes(needle) ||
          item.description.toLowerCase().includes(needle) ||
          item.catalogueGroup.toLowerCase().includes(needle)),
    )
  }, [group, priceBookItems, query])

  const createItem = () => {
    const name = draft.name.trim()
    if (!name) return
    const itemId = `catalog_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`
    upsertPriceBookItem({
      id: itemId,
      name,
      catalogueGroup: draft.catalogueGroup.trim() || 'General',
      unit: draft.unit.trim() || 'unit',
      unitPrice: Number(draft.unitPrice) || 0,
      description: draft.description.trim(),
      categories: [draft.category],
      swatch: '#8b5cf6',
      resourceMultiplier: 1,
      materialRate: 0,
      materialUnit: 'unit',
      materialCost: 0,
      contingencyAllowance: 0,
      laborHoursPerUnit: 0,
      serviceDocument: '',
      jobChecklistId: 'job_general',
      requiredResources: [],
      exclusions: [],
      managedByCompany: true,
    })
    setCreating(false)
    setDraft({
      name: '',
      catalogueGroup: draft.catalogueGroup,
      unit: draft.unit,
      unitPrice: '0',
      description: '',
      category: draft.category,
    })
  }

  return (
    <div className='h-full overflow-y-auto scrollbar-thin'>
      <div className='mx-auto max-w-[80rem] px-5 py-5'>
        <header className='mb-5 flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h1 className='font-display text-2xl text-primary'>Products &amp; Services</h1>
            <p className='mt-0.5 text-base text-muted'>
              The configurable catalogue used by quotes, proposals, job scopes, and resource planning.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone='info' icon={<BookOpen size={10} />}>
              {priceBookItems.length} active items
            </Badge>
            <Link to="/admin">
              <Button size="sm" variant="secondary">Open builder</Button>
            </Link>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus size={12} />
              New product / service
            </Button>
          </div>
        </header>

        <Card className='mb-4 p-3'>
          <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_15rem]'>
            <label className='relative'>
              <Search size={14} className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted' />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder='Search products and services'
                className='pl-9'
                aria-label='Search products and services'
              />
            </label>
            <Select value={group} onChange={(event) => setGroup(event.target.value)} aria-label='Product group'>
              <option value='all'>All categories</option>
              {groups.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          </div>
        </Card>

        <Card className='overflow-hidden'>
          <Table>
            <thead>
              <Tr>
                <Th>Product or service</Th>
                <Th>Category</Th>
                <Th>Unit</Th>
                <Th align='right'>Sell price</Th>
                <Th>Job planning</Th>
                <Th>Status</Th>
              </Tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <p className='font-medium text-primary'>{item.name}</p>
                    <p className='max-w-xl text-sm text-muted'>{item.description}</p>
                  </Td>
                  <Td><Badge tone='neutral'>{item.catalogueGroup}</Badge></Td>
                  <Td>{item.unit}</Td>
                  <Td align='right' mono>{money(item.unitPrice)}</Td>
                  <Td>
                    <span className='flex items-center gap-1.5 text-sm text-secondary'>
                      <Wrench size={11} />
                      {item.requiredResources.length > 0
                        ? `${item.requiredResources.length} configured resources`
                        : 'No purchasing requirement'}
                    </span>
                  </Td>
                  <Td><Badge tone='success'>Active</Badge></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {rows.length === 0 && (
            <p className='px-4 py-10 text-center text-sm text-muted'>No catalogue items match these filters.</p>
          )}
        </Card>
        <Modal
          open={creating}
          onClose={() => setCreating(false)}
          title="Create catalogue item"
          subtitle="Add a product or service here, then refine the full setup in the catalogue builder."
        >
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-primary">Name</span>
              <Input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Metallic epoxy system"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-primary">Category</span>
                <Select
                  value={draft.catalogueGroup}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, catalogueGroup: event.target.value }))
                  }
                >
                  {[...groups, 'General'].filter((value, index, array) => array.indexOf(value) === index).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-primary">Unit</span>
                <Input
                  value={draft.unit}
                  onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
                  placeholder="sq ft"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-primary">Sell price</span>
                <Input
                  type="number"
                  value={draft.unitPrice}
                  onChange={(event) => setDraft((current) => ({ ...current, unitPrice: event.target.value }))}
                  placeholder="0"
                />
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-primary">Primary market</span>
              <Select
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, category: event.target.value as Category }))
                }
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-primary">Description</span>
              <textarea
                rows={4}
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-md border border-strong bg-surface-raised px-3 py-2 text-base text-primary outline-none ring-0 placeholder:text-muted/70 focus:border-brand"
                placeholder="Short packaged scope used by estimators and proposals."
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={createItem} disabled={!draft.name.trim()}>
                Create item
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
