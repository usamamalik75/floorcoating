import { useMemo, useState } from 'react'
import { BookOpen, Search, Wrench } from 'lucide-react'
import { PRICE_BOOK } from '@/data/priceBook'
import { money } from '@/store/useStore'
import { Badge, Card, Input, Select, Table, Td, Th, Tr } from '@/components/ui'

export function Catalogue() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')

  const groups = useMemo(
    () => [...new Set(PRICE_BOOK.map((item) => item.catalogueGroup))].sort(),
    [],
  )
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return PRICE_BOOK.filter(
      (item) =>
        (group === 'all' || item.catalogueGroup === group) &&
        (!needle ||
          item.name.toLowerCase().includes(needle) ||
          item.description.toLowerCase().includes(needle) ||
          item.catalogueGroup.toLowerCase().includes(needle)),
    )
  }, [group, query])

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
          <Badge tone='info' icon={<BookOpen size={10} />}>
            {PRICE_BOOK.length} active items
          </Badge>
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
            <Select value={group} onChange={(event) => setGroup(event.target.value)} aria-label='Catalogue group'>
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
      </div>
    </div>
  )
}
