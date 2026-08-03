import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { AlertTriangle, CheckCircle2, CreditCard, Lock, ShieldCheck } from 'lucide-react'
import { ACCOUNT_BY_ID } from '@/data/seed'
import { money, useStore } from '@/store/useStore'
import { Button, Card, EmptyState } from '@/components/ui'

export function CustomerPayment() {
  const { token = '' } = useParams()
  const request = useStore((s) => s.paymentRequests.find((candidate) => candidate.token === token))
  const updateStatus = useStore((s) => s.updatePaymentRequestStatus)
  const opportunity = useStore((s) => s.opportunities.find((candidate) => candidate.id === request?.opportunityId))
  const invoice = useStore((s) => s.invoices.find((candidate) => candidate.id === request?.invoiceId))

  const account = opportunity ? ACCOUNT_BY_ID[opportunity.accountId] : undefined

  useMemo(() => {
    if (request && request.status === 'sent') {
      updateStatus(request.id, 'viewed', 'Customer opened the payment page.', { recordInvoicePayment: false })
    }
  }, [request, updateStatus])

  if (!request || !opportunity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f4f5]">
        <EmptyState
          icon={<Lock size={28} />}
          title="This payment link is not valid"
          description="Ask your service representative to send a fresh payment request."
        />
      </div>
    )
  }

  const paid = request.status === 'paid'
  const failed = request.status === 'failed'

  return (
    <div className="min-h-screen bg-[#f4f4f5] py-6">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md bg-[#323A45] px-4 py-2.5 text-white">
          <span className="flex items-center gap-2 text-sm">
            <ShieldCheck size={14} />
            Secure payment link for {account?.contactName}
          </span>
          <span className="font-mono text-xs text-white/60">/pay/{request.token}</span>
        </div>

        <Card className="overflow-hidden border border-[#e0e0e2] bg-white shadow-sm">
          <div className="border-b-2 border-[#7E2F3F] px-6 py-5">
            <h1 className="font-display text-2xl text-[#1a1a1a]">
              {request.kind === 'deposit' ? 'Project deposit' : 'Invoice payment'}
            </h1>
            <p className="mt-1 text-sm text-[#5a5a5a]">
              {account?.name} · {opportunity.name}
            </p>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-[#e0e0e2] bg-[#fafafa] p-4">
                <p className="text-xs font-semibold tracking-wider text-[#8a8a8a] uppercase">Amount due</p>
                <p className="mt-1 font-mono text-3xl font-semibold text-[#1a1a1a]">{money(request.amount)}</p>
                <p className="mt-1 text-sm text-[#5a5a5a]">
                  {request.kind === 'deposit'
                    ? 'Deposit confirms your project can move into scheduling.'
                    : 'Payment applies to the invoice currently on your project.'}
                </p>
              </div>
              <div className="rounded-md border border-[#e0e0e2] bg-[#fafafa] p-4">
                <p className="text-xs font-semibold tracking-wider text-[#8a8a8a] uppercase">Status</p>
                <p className="mt-1 text-lg font-medium text-[#1a1a1a] capitalize">{request.status}</p>
                <p className="mt-1 text-sm text-[#5a5a5a]">
                  {invoice ? `Invoice ${invoice.number}` : 'Prototype payment request'}
                  {request.sentAt && ` · sent ${format(new Date(request.sentAt), 'd MMM yyyy')}`}
                </p>
              </div>
            </div>

            {paid ? (
              <div className="flex items-start gap-3 rounded-md border border-[#2f7d4f] bg-[#2f7d4f]/8 px-4 py-4">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-[#2f7d4f]" />
                <div>
                  <p className="font-display text-lg text-[#1a1a1a]">Payment received</p>
                  <p className="mt-0.5 text-sm text-[#5a5a5a]">
                    Paid {request.paidAt ? format(new Date(request.paidAt), 'd MMMM yyyy') : 'today'}.
                    Your project team can now continue the next step.
                  </p>
                </div>
              </div>
            ) : failed ? (
              <div className="flex items-start gap-3 rounded-md border border-[#d9534f] bg-[#d9534f]/8 px-4 py-4">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[#d9534f]" />
                <div>
                  <p className="font-display text-lg text-[#1a1a1a]">Payment failed</p>
                  <p className="mt-0.5 text-sm text-[#5a5a5a]">
                    Try again below or contact your service representative for a fresh link.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-[#e0e0e2] bg-[#fafafa] p-4">
                <p className="text-sm text-[#5a5a5a]">
                  This prototype simulates card and ACH flows without charging a real payment method.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => updateStatus(request.id, 'processing', 'Customer submitted card details.', { recordInvoicePayment: false })}>
                    <CreditCard size={14} />
                    Start card payment
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => updateStatus(request.id, 'paid', 'Customer paid through the hosted payment page.', { method: 'Card' })}
                  >
                    <CheckCircle2 size={14} />
                    Mark paid
                  </Button>
                  <Button onClick={() => updateStatus(request.id, 'failed', 'Processor declined the attempt.', { recordInvoicePayment: false })}>
                    Simulate failure
                  </Button>
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-[#8a8a8a] uppercase">Timeline</p>
              <div className="space-y-2">
                {request.events.map((eventItem) => (
                  <div key={eventItem.id} className="rounded-md border border-[#e0e0e2] px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <p className="font-medium text-[#1a1a1a]">{eventItem.label}</p>
                      <span className="text-[#8a8a8a]">{format(new Date(eventItem.at), 'd MMM · HH:mm')}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-[#5a5a5a]">{eventItem.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-[#8a8a8a]">
          Service Operations · Prototype payment experience only
          {opportunity && (
            <>
              {' '}
              · <Link to={`/proposal/${token}`} className="underline">proposal</Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
