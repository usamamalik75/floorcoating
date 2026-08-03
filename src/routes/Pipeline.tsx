import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, LayoutGrid, Plus, Rows3, Search } from 'lucide-react'
import { BOARD_STAGES, STAGE_BY_ID, stageLabel } from '@/domain/stages'
import type { Category, Opportunity, Phase, StageId } from '@/domain/types'
import { ACCOUNT_BY_ID, LOCATIONS, USERS, USER_BY_ID } from '@/data/seed'
import { money, useStore } from '@/store/useStore'
import { AccountCard, OpportunityCard } from '@/components/domain/OpportunityCard'
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

/**
 * Legacy sales board. `/pipeline` redirects to `/sales`; kept for reference.
 * Operations work lives on Jobs (`Job.status`), not opportunity stages.
 */
const SCOPES: { value: Phase | 'all'; label: string }[] = [
  { value: 'sales', label: 'Sales' },
  { value: 'all', label: 'Everything' },
]

export function Pipeline() {
  const [params, setParams] = useSearchParams()
  const view = (params.get('view') as 'board' | 'table') ?? 'board'
  const scope = (params.get('scope') as Phase | 'all') ?? 'sales'

  const opportunities = useStore((s) => s.opportunities)
  const accounts = useStore((s) => s.accounts)
  const locationFilter = useStore((s) => s.locationFilter)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [rep, setRep] = useState<string>('all')
  const [dragId, setDragId] = useState<string | null>(null)
  const [gate, setGate] = useState<{ opp: Opportunity; to: StageId } | null>(null)

  const inScope = <T extends { locationId: string }>(rows: T[]) =>
    locationFilter === 'all' ? rows : rows.filter((r) => r.locationId === locationFilter)

  const visibleOpps = useMemo(() => {
    let rows = inScope(opportunities)
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
  }, [opportunities, locationFilter, category, rep, query])

  const visibleAccounts = useMemo(() => {
    let rows = inScope(accounts)
    if (query.trim()) {
      const q = query.toLowerCase()
      rows = rows.filter((a) => a.name.toLowerCase().includes(q))
    }
    return rows
  }, [accounts, locationFilter, query])

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
    .filter((o) => o.stage !== 'lost')
    .reduce((s, o) => s + o.value, 0)

  return (
    <div className="flex h-full flex-col">
      {/* ---- Toolbar ---- */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-subtle bg-surface-raised px-3 py-2">
        <h1 className="font-display text-lg text-primary">Pipeline</h1>
        <Badge tone="brand">{money(totalOpen, true)} open</Badge>
        <Badge tone="neutral">{visibleOpps.length} opportunities</Badge>

        <SegmentedControl
          value={scope}
          onChange={(v) => setParams({ view, scope: v })}
          options={SCOPES.map((s) => ({ value: s.value, label: s.label }))}
        />

        <Link to="/intake">
          <Button size="sm">
            <Plus size={12} />
            New lead
          </Button>
        </Link>

        <div className="flex-1" />

        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-muted"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, accounts, codes…"
            className="w-56 pl-7"
          />
        </div>

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
          onChange={(v) => setParams({ view: v, scope })}
          options={[
            { value: 'board', label: <LayoutGrid size={12} /> },
            { value: 'table', label: <Rows3 size={12} /> },
          ]}
        />
      </div>

      {view === 'board' ? (
        <BoardView
          scope={scope}
          opportunities={visibleOpps}
          accounts={visibleAccounts}
          dragId={dragId}
          setDragId={setDragId}
          onDrop={onDrop}
        />
      ) : (
        <TableView opportunities={visibleOpps} />
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

/* ========================================================================== */

function BoardView({
  scope,
  opportunities,
  accounts,
  dragId,
  setDragId,
  onDrop,
}: {
  scope: Phase | 'all'
  opportunities: Opportunity[]
  accounts: ReturnType<typeof useStore.getState>['accounts']
  dragId: string | null
  setDragId: (id: string | null) => void
  onDrop: (stage: StageId) => void
}) {
  const [over, setOver] = useState<StageId | null>(null)

  // Pre-pipeline anchors ride along with the sales phase, since prospects and
  // accounts are where sales work begins.
  const columns = BOARD_STAGES.filter((id) => {
    const phase = STAGE_BY_ID[id].phase
    if (scope === 'all') return true
    return phase === 'pre' || phase === 'sales'
  })

  return (
    <div className="min-h-0 flex-1 overflow-x-auto scrollbar-thin">
      <div className="flex h-full min-w-max gap-2 p-3">
        {columns.map((stageId) => {
          const def = STAGE_BY_ID[stageId]
          const isAnchor = Boolean(def.isAnchor)

          const cards = isAnchor
            ? accounts.filter((a) => a.anchorStage === stageId)
            : opportunities.filter((o) => o.stage === stageId)

          const value = isAnchor
            ? 0
            : (cards as Opportunity[]).reduce((s, o) => s + o.value, 0)

          return (
            <section
              key={stageId}
              onDragOver={(e) => {
                if (isAnchor) return
                e.preventDefault()
                setOver(stageId)
              }}
              onDragLeave={() => setOver((o) => (o === stageId ? null : o))}
              onDrop={() => {
                setOver(null)
                if (!isAnchor) onDrop(stageId)
              }}
              className={cn(
                'flex w-[15rem] shrink-0 flex-col rounded-lg border bg-surface-base',
                over === stageId
                  ? 'border-(--action-primary) bg-action-soft'
                  : 'border-subtle',
              )}
            >
              {/* Colour identity comes straight from the layer-3 stage tokens. */}
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
                <p className="mt-0.5 font-mono text-2xs tabular text-muted">
                  {isAnchor ? 'anchor stage' : money(value, true)}
                </p>
              </header>

              <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5 scrollbar-thin">
                {cards.length === 0 && (
                  <p className="px-1 py-3 text-center text-2xs text-muted">Nothing here</p>
                )}

                {isAnchor
                  ? (cards as typeof accounts).map((a) => (
                      <AccountCard key={a.id} account={a} onCreateOpportunity={() => {}} />
                    ))
                  : (cards as Opportunity[]).map((o) => (
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
  )
}

/* ========================================================================== */

function TableView({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto scrollbar-thin bg-surface-raised">
      <Table>
        <thead>
          <tr>
            <Th width={110}>Code</Th>
            <Th>Project</Th>
            <Th>Account</Th>
            <Th width={150}>Stage</Th>
            <Th width={110}>Territory</Th>
            <Th width={140}>Owner</Th>
            <Th width={90} align="right">
              Sq Ft
            </Th>
            <Th width={100} align="right">
              Value
            </Th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((o) => (
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
                <StageChip
                  group={STAGE_BY_ID[o.stage].group}
                  label={stageLabel(o.stage, o.category)}
                />
              </Td>
              <Td className="text-secondary">
                {LOCATIONS.find((l) => l.id === o.locationId)?.name}
              </Td>
              <Td>
                <span className="flex items-center gap-1.5">
                  <Avatar name={USER_BY_ID[o.ownerId]?.name ?? '?'} size={18} />
                  <span className="truncate text-secondary">{USER_BY_ID[o.ownerId]?.name}</span>
                </span>
              </Td>
              <Td align="right" mono>
                {o.sqft.toLocaleString()}
              </Td>
              <Td align="right" mono className="font-medium">
                {money(o.value)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {opportunities.length === 0 && (
        <p className="flex items-center justify-center gap-2 py-12 text-base text-muted">
          <Filter size={14} /> No opportunities match these filters.
        </p>
      )}
    </div>
  )
}
