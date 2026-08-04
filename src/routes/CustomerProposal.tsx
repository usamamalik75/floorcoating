import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, CheckCircle2, CreditCard, Lock, PenLine, ShieldCheck } from 'lucide-react'
import { useStore, money, estimateTotal } from '@/store/useStore'
import { useArtifactsFor, useChangeOrdersFor } from '@/store/selectors'
import { ACCOUNT_BY_ID } from '@/data/seed'
import { ProposalDocument } from '@/components/domain/ProposalDocument'
import { Logo } from '@/components/layout/Logo'
import { Button, EmptyState, Input } from '@/components/ui'

/* ==========================================================================
   Customer-facing proposal
   ==========================================================================
   The only external experience the client wants for now: review options,
   pick one, accept, sign. No account, no app, no login — just a secure link.
   Rendered outside the app shell so it is obvious this is not an internal
   screen.
   ========================================================================== */

export function CustomerProposal() {
  const { token = '' } = useParams()
  const estimate = useStore((s) => s.estimates.find((e) => e.token === token || e.id === token))
  const opportunity = useStore((s) =>
    s.opportunities.find((o) => o.id === estimate?.opportunityId),
  )
  const sign = useStore((s) => s.signEstimate)
  const createInvoice = useStore((s) => s.createInvoice)
  const createPaymentRequest = useStore((s) => s.createPaymentRequest)
  const paymentRequests = useStore((s) => s.paymentRequests)

  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [name, setName] = useState('')
  const [signing, setSigning] = useState(false)

  if (!estimate || !opportunity) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f5]">
        <EmptyState
          icon={<Lock size={28} />}
          title="This proposal link is not valid"
          description="Ask your service representative to resend it."
        />
      </div>
    )
  }

  const account = ACCOUNT_BY_ID[opportunity.accountId]
  const alternatives = estimate.options.filter((o) => o.kind === 'alternative')
  const chosen =
    selected ??
    alternatives.find((o) => o.selectedByCustomer)?.id ??
    alternatives.find((o) => o.recommended)?.id

  const accept = () => {
    // Signing is the only thing this page does; the award and the handoff to
    // operations belong to the store so every signature path behaves alike.
    sign(estimate.id, name, chosen)
    const depositAmount = estimateTotal(estimate) * (estimate.depositPct / 100)
    const depositNumber = `DEP-${estimate.id.replace('est_', '').toUpperCase()}`
    const hasDepositInvoice = useStore
      .getState()
      .invoices.some((invoice) => invoice.opportunityId === estimate.opportunityId && invoice.kind === 'deposit')
    let invoiceId = useStore
      .getState()
      .invoices.find((invoice) => invoice.opportunityId === estimate.opportunityId && invoice.kind === 'deposit')?.id
    if (!hasDepositInvoice) {
      createInvoice({
        opportunityId: estimate.opportunityId,
        number: depositNumber,
        kind: 'deposit',
        amount: depositAmount,
        status: 'sent',
        issuedAt: new Date().toISOString(),
        dueAt: new Date().toISOString(),
        quickbooksId: `QB-${depositNumber}`,
        payments: [],
      })
      invoiceId = useStore
        .getState()
        .invoices.find((invoice) => invoice.opportunityId === estimate.opportunityId && invoice.kind === 'deposit')?.id
    }
    const hasRequest = useStore
      .getState()
      .paymentRequests.some((request) => request.estimateId === estimate.id && request.kind === 'deposit')
    if (!hasRequest) {
      createPaymentRequest({
        opportunityId: estimate.opportunityId,
        invoiceId: invoiceId ?? null,
        estimateId: estimate.id,
        kind: 'deposit',
        amount: depositAmount,
        channel: 'link',
        recipientName: account?.contactName ?? name,
        recipientEmail: account?.email,
        recipientPhone: account?.phone,
        note: 'Deposit required before scheduling can be confirmed.',
        status: 'sent',
        processorStatus: 'pending',
        sentAt: new Date().toISOString(),
        viewedAt: null,
        paidAt: null,
      })
    }
    setSigning(false)
  }

  const signed = estimate.status === 'signed'
  const paymentRequest = paymentRequests.find((request) => request.estimateId === estimate.id && request.kind === 'deposit')

  return (
    <div className="min-h-screen bg-[#f4f4f5] py-6">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Link
            to={`/opportunities/${opportunity.id}?tab=proposals`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#d0d0d4] bg-white px-3 py-1.5 text-sm font-medium text-[#323A45] shadow-sm hover:bg-[#fafafa]"
          >
            <ArrowLeft size={14} />
            Back to lead
          </Link>
          <span className="text-xs text-[#8a8a8a]">Prototype preview — returns to the opportunity record</span>
        </div>
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md bg-[#323A45] px-4 py-2.5 text-white">
          <span className="flex items-center gap-2 text-sm">
            <ShieldCheck size={14} />
            Secure proposal link for {account?.contactName}
          </span>
          <span className="font-mono text-xs text-white/60">/proposal/{estimate.token}</span>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#e0e0e2] shadow-sm">
          <ProposalDocument
            estimate={estimate}
            opportunity={opportunity}
            selectedAlternative={chosen}
            onSelectAlternative={signed ? undefined : setSelected}
          />

          {/* Acceptance */}
          <div className="border-t-2 border-[#7E2F3F] bg-white px-8 py-6">
            {signed ? (
              <div className="flex items-start gap-3 rounded-md border border-[#2f7d4f] bg-[#2f7d4f]/8 px-4 py-4">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#2f7d4f]" />
                <div>
                  <p className="font-display text-lg text-[#1a1a1a]">Proposal acceptance recorded</p>
                  <p className="mt-0.5 text-sm text-[#5a5a5a]">
                    Signed by {estimate.signedBy} on{' '}
                    {format(new Date(estimate.signedAt!), 'd MMMM yyyy')}. Your project team has been
                    notified and will contact you to confirm installation dates.
                  </p>
                  {paymentRequest && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link to={`/pay/${paymentRequest.token}`}>
                        <Button variant="primary">
                          <CreditCard size={14} />
                          Pay deposit
                        </Button>
                      </Link>
                      <p className="self-center text-sm text-[#5a5a5a]">
                        Deposit status: <span className="font-medium capitalize">{paymentRequest.status}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-display text-lg text-[#1a1a1a]">Accept this proposal</h2>
                <p className="mt-1 text-sm text-[#5a5a5a]">
                  Signing electronically confirms the scope, pricing and terms above. A{' '}
                  {estimate.depositPct}% deposit of{' '}
                  {money(estimateTotal(estimate) * (estimate.depositPct / 100))} is required to
                  schedule your installation.
                </p>

                {!signing ? (
                  <Button variant="primary" size="lg" className="mt-4" onClick={() => setSigning(true)}>
                    <PenLine size={15} />
                    Review and sign
                  </Button>
                ) : (
                  <div className="mt-4 max-w-md rounded-md border border-[#e0e0e2] bg-[#fafafa] p-4">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium tracking-wide text-[#5a5a5a] uppercase">
                        Type your full legal name to sign
                      </span>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={account?.contactName}
                        className="border-[#d4d4d6] bg-white text-[#1a1a1a]"
                      />
                    </label>
                    {name && (
                      <p className="mt-3 border-b border-[#1a1a1a] pb-1 font-display text-2xl text-[#1a1a1a] italic">
                        {name}
                      </p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Button variant="ghost" onClick={() => setSigning(false)}>
                        Cancel
                      </Button>
                      <Button variant="primary" disabled={!name.trim()} onClick={accept}>
                        <CheckCircle2 size={14} />
                        Accept and sign
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[#8a8a8a]">
          Service Operations · This is a prototype. No agreement is created.
        </p>
      </div>
    </div>
  )
}

/* ==========================================================================
   Completion sign-off
   ==========================================================================
   The second half of the lightweight external experience: the customer
   confirms the work is complete, which is what unblocks invoicing.
   ========================================================================== */

export function CustomerSignoff() {
  const { id = '' } = useParams()
  const opportunity = useStore((s) => s.opportunities.find((o) => o.id === id))
  const artifacts = useArtifactsFor(id)
  const changeOrders = useChangeOrdersFor(id)
  const addArtifact = useStore((s) => s.addArtifact)
  const setChangeOrderStatus = useStore((s) => s.setChangeOrderStatus)
  const [name, setName] = useState('')

  if (!opportunity) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f4f5]">
        <EmptyState icon={<Lock size={28} />} title="This link is not valid" />
      </div>
    )
  }

  const account = ACCOUNT_BY_ID[opportunity.accountId]
  const signed = artifacts.some((a) => a.kind === 'signature')
  const after = artifacts.filter((a) => a.photoPhase === 'after')
  const pending = changeOrders.filter((c) => c.status === 'pending')

  const submit = () => {
    addArtifact({
      opportunityId: opportunity.id,
      kind: 'signature',
      name: `Customer completion sign-off — ${name}`,
      stageAdded: opportunity.stage,
      addedById: 'customer',
      addedAt: new Date().toISOString(),
      meta: 'Signed electronically by the customer',
    })
    pending.forEach((c) => setChangeOrderStatus(c.id, 'customer_approved'))
  }

  return (
    <div className="min-h-screen bg-[#f4f4f5] py-6">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Link
            to={`/opportunities/${opportunity.id}?tab=job`}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#d0d0d4] bg-white px-3 py-1.5 text-sm font-medium text-[#323A45] shadow-sm hover:bg-[#fafafa]"
          >
            <ArrowLeft size={14} />
            Back to lead
          </Link>
          <span className="text-xs text-[#8a8a8a]">Prototype preview — returns to the opportunity record</span>
        </div>
        <div className="overflow-hidden rounded-lg border border-[#e0e0e2] bg-white shadow-sm">
          <div className="border-b-2 border-[#7E2F3F] px-6 py-5">
            <Logo size={36} />
            <h1 className="mt-3 font-display text-2xl text-[#1a1a1a]">Project completion sign-off</h1>
            <p className="mt-1 text-sm text-[#5a5a5a]">
              {account?.name} · {opportunity.name}
            </p>
          </div>

          <div className="px-6 py-5">
            <h2 className="mb-2 font-display text-lg">Completed work</h2>
            <ul className="space-y-1 text-sm text-[#5a5a5a]">
              <li>{opportunity.estimatedQuantity.toLocaleString()} units installed at {opportunity.address}</li>
              {after.map((a) => (
                <li key={a.id} className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-[#2f7d4f]" />
                  {a.name}
                </li>
              ))}
            </ul>

            {pending.length > 0 && (
              <>
                <h2 className="mt-5 mb-2 font-display text-lg">Additional work performed</h2>
                <p className="mb-2 text-sm text-[#5a5a5a]">
                  Please confirm the additional work below. Signing approves these charges.
                </p>
                {pending.map((c) => (
                  <div key={c.id} className="mb-2 rounded-md border border-[#e0e0e2] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm">{c.description}</p>
                      <span className="shrink-0 font-mono text-sm tabular">{money(c.amount)}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#8a8a8a]">
                      {c.qty} {c.unit}
                    </p>
                  </div>
                ))}
              </>
            )}

            {signed ? (
              <div className="mt-5 flex items-start gap-3 rounded-md border border-[#2f7d4f] bg-[#2f7d4f]/8 px-4 py-4">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#2f7d4f]" />
                <div>
                  <p className="font-display text-lg text-[#1a1a1a]">Thank you</p>
                  <p className="mt-0.5 text-sm text-[#5a5a5a]">
                    Your sign-off has been recorded and your warranty documentation will follow by
                    email.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-[#e0e0e2] bg-[#fafafa] p-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium tracking-wide text-[#5a5a5a] uppercase">
                    Type your full name to confirm the work is complete
                  </span>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={account?.contactName}
                    className="border-[#d4d4d6] bg-white text-[#1a1a1a]"
                  />
                </label>
                <Button variant="primary" className="mt-3" disabled={!name.trim()} onClick={submit}>
                  <PenLine size={14} />
                  Sign off
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
