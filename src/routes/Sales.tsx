import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, LayoutGrid, Plus, Rows3, Search } from 'lucide-react'
import { SALES_BOARD_STAGES, STAGE_BY_ID, stageLabel } from '@/domain/stages'
import type { Category, LeadTemperature, Opportunity, StageId } from '@/domain/types'
import { TEMPERATURE_LABEL } from '@/domain/types'
import { ACCOUNT_BY_ID, USERS, USER_BY_ID } from '@/data/seed'
import { money, useStore } from '@/store/useStore'
import { OpportunityCard } from '@/components/domain/OpportunityCard'
import { StageGate } from '@/components/domain/StageGate'
import {
  Avatar,
  Badge,
  Button,
  Input,
  SegmentedControl,
  StageChip,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import { cn } from '@/lib/cn'

const LEAD_TABS = [
  { value: 'all', label: 'All' },
  { value: 'new_lead', label: 'New' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'awarded', label: 'Awarded' },
  { value: 'lost', label: 'Lost' },
] as const

export function Sales() {
  const [params, setParams] = useSearchParams()
  const view = (params.get('view') as 'board' | 'table') ?? 'board'
  const tab = params.get('tab') ?? 'all'
  const temp = (params.get('temp') as LeadTemperature | 'all') ?? 'all'

  const opportunities = useStore((s) => s.opportunities)
  const locationFilter = useStore((s) => s.locationFilter)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [rep, setRep] = useState('all')
  const [dragId, setDragId] = useState<string | null>(null)
  const [gate, setGate] = useState<{ opp: Opportunity; to: StageId } | null>(null)

  const visibleOpps = useMemo(() => {
    let rows = opportunities.filter((o) => STAGE_BY_ID[o.stage]?.phase === 'sales')
    if (locationFilter !== 'all') rows = rows.filter((o) => o.locationId === locationFilter)
    if (tab !== 'all') rows = rows.filter((o) => o.stage === tab)
    if (temp !== 'all') rows = rows.filter((o) => o.temperature === temp)
    if (category !== 'all') rows = rows.filter((o) => o.category === category)
    if (rep !== 'all') rows = rows.filter((o) => o.ownerId === rep)
    if (query.trim()) {
      const q = query.toLowerCase()
      rows = rows.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q) ||
          ACCOUNT_BY_ID[o.accountId]?.name.toLowerCase().includes(q),
      )
    }
    return rows
  }, [opportunities, locationFilter, tab, temp, category, rep, query])

  const reps = USERS.filter(
    (u) =>
      (u.role === 'sales' || u.role === 'owner') &&
      (locationFilter === 'all' || u.locationId === locationFilter),
  )

  const onDrop = (to: StageId) => {
    const opp = opportunities.find((o) => o.id === dragId)
    setDragId(null)
    if (!opp || opp.stage === to) return
    setGate({ opp, to })
  }

  const totalOpen = visibleOpps
    .filter((o) => !['awarded', 'lost'].includes(o.stage))
    .reduce((s, o) => s + o.value, 0)

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-subtle bg-surface-raised px-3 py-2">
        <h1 className="font-display text-lg text-primary">Sales</h1>
        <Badge tone="brand">{money(totalOpen, true)} open</Badge>
        <Badge tone="neutral">{visibleOpps.length} opportunities</Badge>

        <Link to="/intake">
          <Button size="sm">
            <Plus size={12} />
            New lead
          </Button>
        </Link>

        <div className="flex-1" />

        <div className="relative">
          <Search size={13} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-48 pl-7"
          />
        </div>

        <select
          aria-label="Temperature"
          value={temp}
          onChange={(e) => setParams({ view, tab, temp: e.target.value })}
          className="h-(--control-h) rounded-md border border-strong bg-surface-raised px-2 text-base"
        >
          <option value="all">All temperatures</option>
          {(Object.keys(TEMPERATURE_LABEL) as LeadTemperature[]).map((t) => (
            <option key={t} value={t}>
              {TEMPERATURE_LABEL[t]}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | 'all')}
          className="h-(--control-h) rounded-md border border-strong bg-surface-raised px-2 text-base"
        >
          <option value="all">All categories</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="industrial">Industrial</option>
        </select>

        <select
          value={rep}
          onChange={(e) => setRep(e.target.value)}
          className="h-(--control-h) rounded-md border border-strong bg-surface-raised px-2 text-base"
        >
          <option value="all">All reps</option>
          {reps.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <SegmentedControl
          value={view}
          onChange={(v) => setParams({ view: v, tab, temp })}
          options={[
            { value: 'board', label: <LayoutGrid size={12} /> },
            { value: 'table', label: <Rows3 size={12} /> },
          ]}
        />
      </div>

      <div className="flex shrink-0 gap-1 border-b border-subtle bg-surface-base px-3 py-1.5">
        {LEAD_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setParams({ view, tab: t.value, temp })}
            className={cn(
              'rounded-md px-2.5 py-1 text-sm font-medium transition-colors',
              tab === t.value ? 'bg-action-soft text-brand' : 'text-muted hover:text-primary',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'board' ? (
        <div className="min-h-0 flex-1 overflow-x-auto scrollbar-thin">
          <div className="flex h-full min-w-max gap-2 p-3">
            {SALES_BOARD_STAGES.map((stageId) => {
              const def = STAGE_BY_ID[stageId]
              const cards = visibleOpps.filter((o) => o.stage === stageId)
              const value = cards.reduce((s, o) => s + o.value, 0)
              return (
                <section
                  key={stageId}
                  onDragOver={(e) => {
                    e.preventDefault()
                  }}
                  onDrop={() => onDrop(stageId)}
                  className="flex w-[15rem] shrink-0 flex-col rounded-lg border border-subtle bg-surface-base"
                >
                  <div
                    className="h-[3px] shrink-0 rounded-t-lg"
                    style={{ backgroundColor: `var(--stage-${def.group}-solid)` }}
                  />
                  <header className="shrink-0 border-b border-subtle px-2.5 py-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <h2 className="truncate text-sm font-semibold text-primary">{def.label}</h2>
                      <span className="shrink-0 rounded-full bg-surface-sunken px-1.5 text-2xs font-medium tabular text-muted">
                        {cards.length}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-2xs tabular text-muted">{money(value, true)}</p>
                  </header>
                  <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5 scrollbar-thin">
                    {cards.length === 0 && (
                      <p className="px-1 py-3 text-center text-2xs text-muted">Nothing here</p>
                    )}
                    {cards.map((o) => (
                      <OpportunityCard
                        key={o.id}
                        opp={o}
                        dragging={dragId === o.id}
                        onDragStart={() => setDragId(o.id)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto scrollbar-thin bg-surface-raised">
          <Table>
            <thead>
              <tr>
                <Th width={110}>Code</Th>
                <Th>Project</Th>
                <Th>Account</Th>
                <Th width={130}>Stage</Th>
                <Th width={80}>Temp</Th>
                <Th width={140}>Owner</Th>
                <Th width={100} align="right">
                  Value
                </Th>
              </tr>
            </thead>
            <tbody>
              {visibleOpps.map((o) => (
                <Tr key={o.id}>
                  <Td mono>
                    <Link to={`/opportunities/${o.id}`} className="text-brand hover:underline">
                      {o.code}
                    </Link>
                  </Td>
                  <Td>
                    <Link to={`/opportunities/${o.id}`} className="font-medium hover:underline">
                      {o.name}
                    </Link>
                  </Td>
                  <Td className="text-secondary">{ACCOUNT_BY_ID[o.accountId]?.name}</Td>
                  <Td>
                    <StageChip group={STAGE_BY_ID[o.stage].group} label={stageLabel(o.stage, o.category)} />
                  </Td>
                  <Td>
                    <Badge
                      tone={o.temperature === 'hot' ? 'danger' : o.temperature === 'warm' ? 'attention' : 'neutral'}
                    >
                      {TEMPERATURE_LABEL[o.temperature]}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-1.5">
                      <Avatar name={USER_BY_ID[o.ownerId]?.name ?? '?'} size={18} />
                      <span className="truncate text-secondary">{USER_BY_ID[o.ownerId]?.name}</span>
                    </span>
                  </Td>
                  <Td align="right" mono className="font-medium">
                    {money(o.value)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {visibleOpps.length === 0 && (
            <p className="flex items-center justify-center gap-2 py-12 text-base text-muted">
              <Filter size={14} /> No opportunities match these filters.
            </p>
          )}
        </div>
      )}

      <StageGate
        open={Boolean(gate)}
        opportunity={gate?.opp ?? null}
        targetStage={gate?.to ?? null}
        onClose={() => setGate(null)}
      />
    </div>
  )
}
