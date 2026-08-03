import { Link } from 'react-router-dom'
import { BellRing, Building2, GripVertical, Ruler } from 'lucide-react'
import type { Account, Opportunity } from '@/domain/types'
import { TEMPERATURE_LABEL } from '@/domain/types'
import { ACCOUNT_BY_ID } from '@/data/seed'
import { money } from '@/store/useStore'
import { useUserDirectory } from '@/store/selectors'
import { Avatar, Badge } from '@/components/ui'
import { cn } from '@/lib/cn'

const CATEGORY_VAR = {
  residential: 'var(--category-residential)',
  commercial: 'var(--category-commercial)',
  industrial: 'var(--category-industrial)',
}

function daysIn(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

export function OpportunityCard({
  opp,
  onDragStart,
  dragging,
}: {
  opp: Opportunity
  onDragStart: () => void
  dragging?: boolean
}) {
  const userById = useUserDirectory()
  const account = ACCOUNT_BY_ID[opp.accountId]
  const owner = userById[opp.ownerId]
  const age = daysIn(opp.stageEnteredAt)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        'group relative rounded-md border border-subtle bg-surface-raised',
        'cursor-grab active:cursor-grabbing',
        'transition-[border-color,box-shadow] duration-(--duration-fast)',
        'hover:border-strong hover:shadow-[0_2px_8px_-2px_rgba(19,24,32,0.12)]',
        dragging && 'opacity-40',
      )}
    >
      {/* Category is a 2px spine, not a badge — it reads at a glance without
          stealing space from the record itself. */}
      <span
        className="absolute inset-y-0 left-0 w-[2px] rounded-l-md"
        style={{ backgroundColor: CATEGORY_VAR[opp.category] }}
        title={opp.category}
      />

      <Link to={`/opportunities/${opp.id}`} className="block px-2.5 py-2 pl-3">
        <div className="flex items-start justify-between gap-1.5">
          <p className="min-w-0 flex-1 text-base leading-tight font-medium text-primary">
            {opp.name}
          </p>
          <GripVertical
            size={13}
            className="mt-0.5 shrink-0 text-(--color-steel-300) opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>

        <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted">
          <Building2 size={11} className="shrink-0" />
          {account?.name}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-medium tabular text-primary">
            {money(opp.value, true)}
          </span>
          <span className="flex items-center gap-1.5">
            <Badge
              tone={
                opp.temperature === 'hot' ? 'danger' : opp.temperature === 'warm' ? 'attention' : 'neutral'
              }
            >
              {TEMPERATURE_LABEL[opp.temperature]}
            </Badge>
            <span className="flex items-center gap-1 font-mono text-2xs tabular text-muted">
              <Ruler size={10} />
              {opp.estimatedQuantity.toLocaleString()}
            </span>
          </span>
        </div>

        <p className="mt-1.5 truncate text-2xs capitalize text-muted">
          {opp.category}
          {opp.visitAt
            ? ` · Visit ${new Date(opp.visitAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : ''}
        </p>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-subtle pt-1.5">
          <span className="flex items-center gap-1.5">
            {owner && <Avatar name={owner.name} size={17} />}
            <span className="truncate text-2xs text-muted">{owner?.name}</span>
          </span>

          <span className="flex items-center gap-1">
            {opp.reminderAt && (
              <Badge tone="warning" icon={<BellRing size={9} />}>
                {new Date(opp.reminderAt).toLocaleDateString('en-US', {
                  month: 'short',
                  year: '2-digit',
                })}
              </Badge>
            )}
            <span
              className={cn(
                'font-mono text-2xs tabular',
                age > 14 ? 'text-danger-text' : age > 7 ? 'text-warning-text' : 'text-muted',
              )}
              title={`${age} days in this stage`}
            >
              {age}d
            </span>
          </span>
        </div>
      </Link>
    </div>
  )
}

/**
 * Accounts render in the two anchor columns. Visually lighter than an
 * opportunity card because they are not yet a project — pulling one forward
 * creates an Opportunity and leaves the Account where it is.
 */
export function AccountCard({
  account,
  onCreateOpportunity,
}: {
  account: Account
  onCreateOpportunity: () => void
}) {
  return (
    <div className="group rounded-md border border-dashed border-strong bg-surface-inset px-2.5 py-2">
      <p className="text-base leading-tight font-medium text-primary">{account.name}</p>
      <p className="mt-0.5 truncate text-sm text-muted">
        {account.contactName} · {account.contactTitle}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <Badge tone="neutral">{account.vertical}</Badge>
        <span className="text-2xs text-muted">{account.source}</span>
      </div>
      <button
        onClick={onCreateOpportunity}
        className={cn(
          'mt-2 w-full rounded-sm border border-transparent bg-surface-raised py-1',
          'text-2xs font-medium text-brand',
          'opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100',
          'hover:border-(--action-primary)',
        )}
      >
        Create opportunity
      </button>
    </div>
  )
}
