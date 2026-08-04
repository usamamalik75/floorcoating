import { useMemo, useState } from 'react'
import { BookOpen, Plus, Search, Wrench } from 'lucide-react'
import { money, useStore } from '@/store/useStore'
import type { Category, PriceBookItem } from '@/domain/types'
import { Badge, Button, Card, FieldRow, Input, Modal, Select, Table, Td, Textarea, Th, Tr } from '@/components/ui'

type CreateDraft = {
  name: string
  catalogueGroup: string
  unit: string
  unitPrice: string
  description: string
  category: Category
}

const emptyCreateDraft = (): CreateDraft => ({
  name: '',
  catalogueGroup: 'Coatings',
  unit: 'sq ft',
  unitPrice: '0',
  description: '',
  category: 'commercial',
})

function linesToList(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * Products & Services is the source of truth for estimate auto-attach panels:
 * service docs, resources, exclusions, and resource rates.
 */
export function Catalogue() {
  const priceBookItems = useStore((s) => s.priceBookItems)
  const upsertPriceBookItem = useStore((s) => s.upsertPriceBookItem)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<CreateDraft>(emptyCreateDraft)
  const [editingId, setEditingId] = useState<string | null>(null)

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
          item.catalogueGroup.toLowerCase().includes(needle) ||
          item.serviceDocument.toLowerCase().includes(needle)),
    )
  }, [group, priceBookItems, query])

  const editing = priceBookItems.find((item) => item.id === editingId) ?? null

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
      serviceDocument: 'Standard service scope',
      jobChecklistId: 'job_general',
      requiredResources: [],
      exclusions: [],
      managedByCompany: true,
    })
    setCreating(false)
    setDraft({ ...emptyCreateDraft(), catalogueGroup: draft.catalogueGroup, unit: draft.unit, category: draft.category })
    setEditingId(itemId)
  }

  const saveItem = (next: PriceBookItem) => {
    upsertPriceBookItem(next)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="w-full px-5 py-5">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-primary">Products &amp; Services</h1>
            <p className="mt-0.5 text-base text-muted">
              Catalogue items that auto-attach service docs, resources, exclusions, and rates onto estimates.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info" icon={<BookOpen size={10} />}>
              {priceBookItems.length} active items
            </Badge>
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus size={12} />
              New product / service
            </Button>
          </div>
        </header>

        <Card className="mb-4 p-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_15rem]">
            <label className="relative">
              <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products and services"
                className="pl-9"
                aria-label="Search products and services"
              />
            </label>
            <Select value={group} onChange={(event) => setGroup(event.target.value)} aria-label="Product group">
              <option value="all">All categories</option>
              {groups.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <thead>
              <Tr>
                <Th>Product or service</Th>
                <Th>Category</Th>
                <Th>Unit</Th>
                <Th align="right">Sell price</Th>
                <Th>Estimate attach</Th>
                <Th>Status</Th>
              </Tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <Tr
                  key={item.id}
                  className="cursor-pointer hover:bg-surface-inset"
                  onClick={() => setEditingId(item.id)}
                >
                  <Td>
                    <p className="font-medium text-primary">{item.name}</p>
                    <p className="max-w-xl text-sm text-muted">{item.description}</p>
                    {item.serviceDocument && (
                      <p className="mt-1 text-2xs text-muted">Doc: {item.serviceDocument}</p>
                    )}
                  </Td>
                  <Td>
                    <Badge tone="neutral">{item.catalogueGroup}</Badge>
                  </Td>
                  <Td>{item.unit}</Td>
                  <Td align="right" mono>
                    {money(item.unitPrice)}
                  </Td>
                  <Td>
                    <span className="flex flex-col gap-0.5 text-sm text-secondary">
                      <span className="flex items-center gap-1.5">
                        <Wrench size={11} />
                        {item.requiredResources.length > 0
                          ? `${item.requiredResources.length} resources`
                          : 'No resources'}
                        {item.exclusions.length > 0 ? ` · ${item.exclusions.length} exclusions` : ''}
                      </span>
                      {item.materialRate > 0 && (
                        <span className="font-mono text-2xs text-muted">
                          {item.materialRate} {item.materialUnit}/{item.unit}
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone="success">Active</Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {rows.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted">No catalogue items match these filters.</p>
          )}
        </Card>

        <Modal
          open={creating}
          onClose={() => setCreating(false)}
          title="Create catalogue item"
          subtitle="Add a product or service, then open it to set the fields that attach onto estimates."
        >
          <div className="grid gap-3">
            <FieldRow label="Name" required>
              <Input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Metallic epoxy system"
              />
            </FieldRow>
            <div className="grid gap-3 sm:grid-cols-3">
              <FieldRow label="Category">
                <Select
                  value={draft.catalogueGroup}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, catalogueGroup: event.target.value }))
                  }
                >
                  {[...groups, 'General']
                    .filter((value, index, array) => array.indexOf(value) === index)
                    .map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                </Select>
              </FieldRow>
              <FieldRow label="Unit">
                <Input
                  value={draft.unit}
                  onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
                  placeholder="sq ft"
                />
              </FieldRow>
              <FieldRow label="Sell price">
                <Input
                  type="number"
                  value={draft.unitPrice}
                  onChange={(event) => setDraft((current) => ({ ...current, unitPrice: event.target.value }))}
                  placeholder="0"
                />
              </FieldRow>
            </div>
            <FieldRow label="Primary market">
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
            </FieldRow>
            <FieldRow label="Description">
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short packaged scope used by estimators and proposals."
              />
            </FieldRow>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={createItem} disabled={!draft.name.trim()}>
                Create &amp; edit details
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={Boolean(editing)}
          onClose={() => setEditingId(null)}
          title={editing?.name ?? 'Catalogue item'}
          subtitle="These fields auto-attach when this item is added to an estimate."
          size="xl"
        >
          {editing && (
            <CatalogueEditor
              item={editing}
              onChange={saveItem}
              onClose={() => setEditingId(null)}
            />
          )}
        </Modal>
      </div>
    </div>
  )
}

function CatalogueEditor({
  item,
  onChange,
  onClose,
}: {
  item: PriceBookItem
  onChange: (next: PriceBookItem) => void
  onClose: () => void
}) {
  const patch = (partial: Partial<PriceBookItem>) => onChange({ ...item, ...partial })

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label="Name" required>
          <Input value={item.name} onChange={(e) => patch({ name: e.target.value })} />
        </FieldRow>
        <FieldRow label="Catalogue group">
          <Input value={item.catalogueGroup} onChange={(e) => patch({ catalogueGroup: e.target.value })} />
        </FieldRow>
        <FieldRow label="Unit">
          <Input value={item.unit} onChange={(e) => patch({ unit: e.target.value })} />
        </FieldRow>
        <FieldRow label="Sell price">
          <Input
            type="number"
            value={item.unitPrice}
            onChange={(e) => patch({ unitPrice: Number(e.target.value) || 0 })}
          />
        </FieldRow>
      </div>

      <FieldRow label="Description">
        <Textarea
          rows={2}
          value={item.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </FieldRow>

      <div className="rounded-md border border-subtle bg-surface-inset p-3">
        <p className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">
          Auto-attached on estimates
        </p>
        <div className="grid gap-3">
          <FieldRow label="Service documentation" hint="Shown as the service scope line on the estimate.">
            <Input
              value={item.serviceDocument}
              onChange={(e) => patch({ serviceDocument: e.target.value })}
              placeholder="Standard service scope"
            />
          </FieldRow>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FieldRow label="Resource factor">
              <Input
                type="number"
                step="0.1"
                value={item.resourceMultiplier}
                onChange={(e) => patch({ resourceMultiplier: Number(e.target.value) || 0 })}
              />
            </FieldRow>
            <FieldRow label="Resource rate">
              <Input
                type="number"
                step="0.01"
                value={item.materialRate}
                onChange={(e) => patch({ materialRate: Number(e.target.value) || 0 })}
              />
            </FieldRow>
            <FieldRow label="Resource unit">
              <Input
                value={item.materialUnit}
                onChange={(e) => patch({ materialUnit: e.target.value })}
                placeholder="service kit"
              />
            </FieldRow>
            <FieldRow label="Waste allowance">
              <Input
                type="number"
                step="0.01"
                value={item.contingencyAllowance}
                onChange={(e) => patch({ contingencyAllowance: Number(e.target.value) || 0 })}
              />
            </FieldRow>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldRow label="Resource unit cost">
              <Input
                type="number"
                step="0.01"
                value={item.materialCost}
                onChange={(e) => patch({ materialCost: Number(e.target.value) || 0 })}
              />
            </FieldRow>
            <FieldRow label="Labor hours / unit">
              <Input
                type="number"
                step="0.1"
                value={item.laborHoursPerUnit}
                onChange={(e) => patch({ laborHoursPerUnit: Number(e.target.value) || 0 })}
              />
            </FieldRow>
          </div>

          <FieldRow
            label="Required resources"
            hint="One per line. Shown on the estimate and used for purchasing planning."
          >
            <Textarea
              rows={4}
              value={item.requiredResources.join('\n')}
              onChange={(e) => patch({ requiredResources: linesToList(e.target.value) })}
              placeholder={'Diagnostic meter\nPPE\nCleaning tools'}
            />
          </FieldRow>

          <FieldRow
            label="Exclusions"
            hint="One per line. Carried onto the customer proposal."
          >
            <Textarea
              rows={3}
              value={item.exclusions.join('\n')}
              onChange={(e) => patch({ exclusions: linesToList(e.target.value) })}
              placeholder={'Replacement parts\nRefrigerant'}
            />
          </FieldRow>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}
