import { format } from 'date-fns'
import { CheckCircle2 } from 'lucide-react'
import type { Estimate, Opportunity } from '@/domain/types'
import { ACCOUNT_BY_ID } from '@/data/seed'
import { estimateTotal, money, optionTotal, useStore } from '@/store/useStore'
import { Logo } from '@/components/layout/Logo'
import { cn } from '@/lib/cn'

/* ==========================================================================
   Proposal document
   ==========================================================================
   Rendered identically in the estimator's preview and on the customer's
   secure link, so nobody has to wonder what the customer is actually
   looking at. Internal notes, crew instructions and checklists are absent by
   construction — this component simply never receives them.
   ========================================================================== */

/** Drops entries that another entry already says, keeping the longer wording. */
function dedupe(list: string[]) {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, '')
  return list
    .filter((a, i) => list.findIndex((b) => norm(b) === norm(a)) === i)
    .filter((a, _, all) => !all.some((b) => b !== a && norm(b).includes(norm(a))))
}

export function ProposalDocument({
  estimate,
  opportunity,
  selectedAlternative,
  onSelectAlternative,
}: {
  estimate: Estimate
  opportunity: Opportunity
  selectedAlternative?: string
  onSelectAlternative?: (optionId: string) => void
}) {
  const account = ACCOUNT_BY_ID[opportunity.accountId]
  const locations = useStore((s) => s.locations)
  const location = locations.find((l) => l.id === opportunity.locationId)
  const priceBookItems = useStore((s) => s.priceBookItems)
  const proposalTemplates = useStore((s) => s.proposalTemplates)
  const priceBookById = Object.fromEntries(priceBookItems.map((item) => [item.id, item])) as Record<string, typeof priceBookItems[number]>
  const template = proposalTemplates.find((candidate) => candidate.id === estimate.templateId)
  const scopes = estimate.options.filter((o) => o.kind === 'scope')
  const alternatives = estimate.options.filter((o) => o.kind === 'alternative')

  const chosen =
    alternatives.find((o) => o.id === selectedAlternative) ??
    alternatives.find((o) => o.selectedByCustomer) ??
    alternatives.find((o) => o.recommended)

  const total =
    optionTotal(scopes.flatMap((o) => o.lineItems)) + (chosen ? optionTotal(chosen.lineItems) : 0)

  const catalogueItems = [
    ...new Set(estimate.options.flatMap((o) => o.lineItems.map((l) => l.priceBookId))),
  ]
    .map((id) => priceBookById[id])
    .filter(Boolean)

  // The template and each catalogue item carry their own exclusions and they overlap.
  // The customer should read one clean list, keeping the fuller wording.
  const exclusions = dedupe([
    ...(template?.exclusions ?? []),
    ...catalogueItems.flatMap((s) => s.exclusions),
  ])

  return (
    <div className="bg-white text-[#1a1a1a]">
      {/* Letterhead */}
      <div className="flex items-start justify-between gap-6 border-b-2 border-[#7E2F3F] px-8 py-6">
        <div>
          <Logo size={40} />
          <p className="mt-2 text-sm text-[#5a5a5a]">
            {location?.name} · {location?.city}, {location?.state}
          </p>
        </div>
        <div className="text-right text-sm text-[#5a5a5a]">
          <p className="font-mono text-base font-semibold text-[#1a1a1a]">{opportunity.code}</p>
          <p>{format(new Date(), 'd MMMM yyyy')}</p>
          <p>Valid for {template?.validDays ?? 30} days</p>
        </div>
      </div>

      <div className="px-8 py-6">
        <h1 className="font-display text-2xl">Proposal for {account?.name}</h1>
        <p className="mt-1 text-base text-[#5a5a5a]">{opportunity.name}</p>

        <div className="mt-5 grid grid-cols-2 gap-6 border-y border-[#e5e5e5] py-4 text-sm sm:grid-cols-4">
          {[
            ['Prepared for', account?.contactName ?? ''],
            ['Site address', opportunity.address],
            ['Area', `${opportunity.estimatedQuantity.toLocaleString()} units`],
            ['Project type', opportunity.category],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs tracking-wide text-[#8a8a8a] uppercase">{label}</p>
              <p className="mt-0.5 capitalize">{value}</p>
            </div>
          ))}
        </div>

        {/* Scope */}
        <h2 className="mt-6 mb-2 font-display text-lg">Scope of work</h2>
        {scopes.map((opt) => (
          <div key={opt.id} className="mb-4">
            <div className="flex items-baseline justify-between gap-4 border-b border-[#e5e5e5] pb-1">
              <h3 className="font-semibold">{opt.label}</h3>
              <span className="font-mono text-base tabular">{money(optionTotal(opt.lineItems))}</span>
            </div>
            <ul className="mt-2 space-y-2">
              {opt.lineItems.map((li) => (
                <li key={li.id} className="flex gap-4 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{li.name}</p>
                    <p className="mt-0.5 leading-relaxed text-[#5a5a5a]">{li.description}</p>
                  </div>
                  <div className="w-28 shrink-0 text-right text-[#5a5a5a]">
                    {li.qty.toLocaleString()} {li.unit}
                  </div>
                  <div className="w-24 shrink-0 text-right font-mono tabular">
                    {money(li.qty * li.unitPrice)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Alternatives the customer chooses between */}
        {alternatives.length > 0 && (
          <>
            <h2 className="mt-6 mb-1 font-display text-lg">Choose your option</h2>
            <p className="mb-3 text-sm text-[#5a5a5a]">
              Select one. Only the option you choose is included in the contract total.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {alternatives.map((opt) => {
                const active = chosen?.id === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={!onSelectAlternative}
                    onClick={() => onSelectAlternative?.(opt.id)}
                    className={cn(
                      'rounded-lg border-2 p-4 text-left transition-colors',
                      active ? 'border-[#7E2F3F] bg-[#7E2F3F]/4' : 'border-[#e5e5e5]',
                      onSelectAlternative && 'cursor-pointer hover:border-[#7E2F3F]/60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{opt.label}</p>
                        {opt.recommended && (
                          <p className="mt-0.5 text-xs font-medium tracking-wide text-[#7E2F3F] uppercase">
                            Recommended
                          </p>
                        )}
                      </div>
                      {active && <CheckCircle2 size={18} className="shrink-0 text-[#7E2F3F]" />}
                    </div>
                    <ul className="mt-2 space-y-1.5 text-sm text-[#5a5a5a]">
                      {opt.lineItems.map((li) => (
                        <li key={li.id}>
                          <span className="font-medium text-[#1a1a1a]">{li.name}</span> —{' '}
                          {li.qty.toLocaleString()} {li.unit}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 font-mono text-lg font-semibold tabular">
                      {money(optionTotal(opt.lineItems))}
                    </p>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Totals */}
        <div className="mt-6 border-t-2 border-[#1a1a1a] pt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-lg">Contract total</span>
            <span className="font-mono text-2xl font-semibold tabular">{money(total)}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between text-sm text-[#5a5a5a]">
            <span>Deposit required to schedule ({estimate.depositPct}%)</span>
            <span className="font-mono tabular">{money(total * (estimate.depositPct / 100))}</span>
          </div>
        </div>

        {/* Catalogue items */}
        {catalogueItems.length > 0 && (
          <>
            <h2 className="mt-6 mb-2 font-display text-lg">Products and services included</h2>
            <div className="space-y-2">
              {catalogueItems.map((s) => (
                <div key={s.id} className="flex gap-3">
                  <span
                    className="mt-0.5 h-12 w-12 shrink-0 rounded border border-[#e5e5e5]"
                    style={{ background: s.swatch }}
                  />
                  <div className="text-sm">
                    <p className="font-medium">{s.name}</p>
                    <p className="leading-relaxed text-[#5a5a5a]">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="mt-6 mb-2 font-display text-lg">Exclusions</h2>
        <ul className="grid gap-1 text-sm text-[#5a5a5a] sm:grid-cols-2">
          {exclusions.map((e) => (
            <li key={e} className="flex gap-1.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#b0b0b0]" />
              {e}
            </li>
          ))}
        </ul>

        <h2 className="mt-6 mb-2 font-display text-lg">Terms and conditions</h2>
        <p className="text-sm leading-relaxed text-[#5a5a5a]">{template?.terms}</p>
      </div>
    </div>
  )
}

export { estimateTotal }
