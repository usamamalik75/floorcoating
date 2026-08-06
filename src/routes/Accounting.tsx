import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileCheck2,
  Plus,
  Receipt,
  RefreshCw,
  Send,
} from 'lucide-react'
import { useStore, money, estimateTotal } from '@/store/useStore'
import { useScopedOpportunities, useLocations, useViewer } from '@/store/selectors'
import { ACCOUNT_BY_ID, iso } from '@/data/seed'
import type { Invoice, InvoiceKind, Opportunity } from '@/domain/types'
import { normalizeJobStatus } from '@/domain/stages'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FieldRow,
  Input,
  Modal,
  SectionTitle,
  Select,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui'
import { cn } from '@/lib/cn'

/* ==========================================================================
   Accounting workspace
   ==========================================================================
   Accounting's problem today is that they depend on somebody remembering
   whether extra work happened. Here the closeout checklist has already asked
   that question, so this screen opens with a confirmed number rather than a
   phone call.
   ========================================================================== */

const KIND_LABEL: Record<InvoiceKind, string> = {
  deposit: 'Deposit',
  progress: 'Progress',
  final: 'Final',
  change_order: 'Change order',
}

export function Accounting() {
  const s = useStore()
  const viewer = useViewer()
  const opps = useScopedOpportunities()
  const locations = useLocations()
  const createInvoice = useStore((st) => st.createInvoice)
  const recordPayment = useStore((st) => st.recordPayment)
  const paymentRequests = useStore((st) => st.paymentRequests)
  const createPaymentRequest = useStore((st) => st.createPaymentRequest)
  const updatePaymentRequestStatus = useStore((st) => st.updatePaymentRequestStatus)

  const [raising, setRaising] = useState<Opportunity | null>(null)
  const [paying, setPaying] = useState<Invoice | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualOpportunityId, setManualOpportunityId] = useState('')
  const [manualKind, setManualKind] = useState<InvoiceKind>('progress')
  const [manualAmount, setManualAmount] = useState(0)

  const mine = s.invoices.filter((i) => opps.some((o) => o.id === i.opportunityId))
  const awarded = opps.filter((o) => o.stage === 'awarded')
  const jobStatus = (id: string) => {
    const status = s.jobs.find((j) => j.opportunityId === id)?.status
    return status ? normalizeJobStatus(status) : undefined
  }
  const hasFinalInvoice = (id: string) => mine.some((i) => i.opportunityId === id && i.kind === 'final')
  const readyToInvoice = awarded.filter(
    (o) => ['completed', 'ready_to_invoice'].includes(jobStatus(o.id) ?? '') && !hasFinalInvoice(o.id),
  )
  const inReview = awarded.filter((o) => jobStatus(o.id) === 'completion_review')

  const billed = mine.reduce((a, i) => a + i.amount, 0)
  const received = mine.reduce((a, i) => a + i.payments.reduce((p, x) => p + x.amount, 0), 0)
  const activeRequests = paymentRequests.filter((request) => mine.some((invoice) => invoice.id === request.invoiceId))
  const franchiseWideView = viewer?.orgRole === 'platform_admin'
    || viewer?.orgRole === 'regional_admin'
    || viewer?.orgRole === 'franchise_admin'

  const paid = (i: Invoice) => i.payments.reduce((a, p) => a + p.amount, 0)
  const raiseFinalInvoice = (opportunity: Opportunity) => {
    const est = s.estimates.find((e) => e.opportunityId === opportunity.id)
    const contract = est ? estimateTotal(est) : opportunity.value
    const approvedCo = s.changeOrders
      .filter((c) => c.opportunityId === opportunity.id && c.status === 'customer_approved')
      .reduce((sum, c) => sum + c.amount, 0)
    const deposits = s.invoices
      .filter((i) => i.opportunityId === opportunity.id && i.kind === 'deposit')
      .reduce((sum, i) => sum + i.amount, 0)
    const due = contract + approvedCo - deposits

    createInvoice({
      opportunityId: opportunity.id,
      number: `JOB-INV-${2100 + s.invoices.length}`,
      kind: 'final',
      amount: due,
      status: 'sent',
      issuedAt: new Date().toISOString(),
      dueAt: iso(30),
      quickbooksId: `QB-${9000 + s.invoices.length}`,
      payments: [],
    })
    s.logActivity(
      opportunity.id,
      'money',
      `Final invoice synced to QuickBooks — contract plus ${approvedCo > 0 ? 'approved change orders ' : ''}less deposit.`,
    )
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="w-full px-5 py-5">
        <header className="mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="font-display text-2xl text-primary">Accounting</h1>
              <p className="mt-0.5 text-base text-muted">
                Invoicing, QuickBooks synchronisation and payment status across{' '}
                {franchiseWideView ? 'all visible branches' : 'this location'}.
              </p>
            </div>
            <Button
              className="ml-auto"
              size="sm"
              variant="primary"
              disabled={!readyToInvoice[0] && !inReview[0]}
              onClick={() => {
                const target = readyToInvoice[0] ?? inReview[0]
                if (!target) return
                if (jobStatus(target.id) === 'completed') {
                  raiseFinalInvoice(target)
                } else {
                  setRaising(target)
                }
              }}
            >
              <Plus size={12} />
              New invoice
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setManualOpen(true)}>
              Manual invoice
            </Button>
          </div>
        </header>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total billed', value: money(billed, true) },
            { label: 'Received', value: money(received, true) },
            { label: 'Outstanding', value: money(billed - received, true), warn: billed - received > 0 },
            { label: 'Collection rate', value: billed > 0 ? `${Math.round((received / billed) * 100)}%` : '0%', sub: 'Received against billed' },
            { label: 'Payment links', value: activeRequests.length, sub: 'Hosted requests in play' },
          ].map((k) => (
            <Card
              key={k.label}
              className={cn('px-4 py-3', k.warn && 'border-(--status-warning) bg-warning-soft')}
            >
              <p className="text-xs font-medium tracking-wide text-muted uppercase">{k.label}</p>
              <p className="mt-1 font-display text-2xl leading-none text-primary tabular">{k.value}</p>
              {k.sub && <p className="mt-1 text-sm text-muted">{k.sub}</p>}
            </Card>
          ))}
        </div>

        {/* ---- Awaiting accounting action ---- */}
        <SectionTitle>Waiting on accounting</SectionTitle>
        <Card className="mb-5 overflow-hidden">
          {readyToInvoice.length === 0 && inReview.length === 0 ? (
            <EmptyState icon={<CheckCircle2 size={26} />} title="Nothing waiting" />
          ) : (
            <Table>
              <thead>
                <Tr>
                  <Th>Project</Th>
                  <Th>Status</Th>
                  <Th align="right">Contract</Th>
                  <Th align="right">Change orders</Th>
                  <Th align="right">Deposit received</Th>
                  <Th align="right">Action</Th>
                </Tr>
              </thead>
              <tbody>
                {[...readyToInvoice, ...inReview].map((o) => {
                  const est = s.estimates.find((e) => e.opportunityId === o.id)
                  const contract = est ? estimateTotal(est) : o.value
                  const cos = s.changeOrders.filter((c) => c.opportunityId === o.id)
                  const approved = cos.filter((c) => c.status === 'customer_approved')
                  const pending = cos.filter((c) => c.status === 'pending')
                  const deposits = s.invoices
                    .filter((i) => i.opportunityId === o.id && i.kind === 'deposit')
                    .reduce((a, i) => a + a * 0 + i.payments.reduce((p, x) => p + x.amount, 0), 0)
                  return (
                    <Tr key={o.id}>
                      <Td>
                        <Link to={`/opportunities/${o.id}`} className="font-medium text-primary hover:underline">
                          {o.name}
                        </Link>
                        <span className="block text-sm text-muted">
                          {locations.find((l) => l.id === o.locationId)?.name} · {o.code}
                        </span>
                      </Td>
                      <Td>
                        {jobStatus(o.id) === 'completed' ? (
                          <Badge tone="success">Ready for final invoice</Badge>
                        ) : (
                          <Badge tone="warning">In completion review</Badge>
                        )}
                      </Td>
                      <Td align="right" mono>
                        {money(contract)}
                      </Td>
                      <Td align="right">
                        {pending.length > 0 ? (
                          <span className="flex items-center justify-end gap-1 text-sm text-warning-text">
                            <AlertTriangle size={11} />
                            {pending.length} pending
                          </span>
                        ) : approved.length > 0 ? (
                          <span className="font-mono text-sm tabular text-primary">
                            {money(approved.reduce((a, c) => a + c.amount, 0))}
                          </span>
                        ) : (
                          <span className="text-sm text-muted">None</span>
                        )}
                      </Td>
                      <Td align="right" mono>
                        {money(deposits)}
                      </Td>
                      <Td align="right">
                        {jobStatus(o.id) === 'completed' ? (
                          <Button size="sm" variant="primary" onClick={() => raiseFinalInvoice(o)}>
                            <FileCheck2 size={12} />
                            Raise final invoice
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setRaising(o)}>
                            <Plus size={12} />
                            Interim invoice
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card>

        {/* ---- Invoice ledger ---- */}
        <SectionTitle>Invoices</SectionTitle>
        <Card className="overflow-hidden">
          {mine.length === 0 ? (
            <EmptyState icon={<Receipt size={26} />} title="No invoices yet" />
          ) : (
            <Table>
              <thead>
                <Tr>
                  <Th>Invoice</Th>
                  <Th>Project</Th>
                  <Th>Type</Th>
                  <Th>QuickBooks</Th>
                  <Th align="right">Amount</Th>
                  <Th align="right">Received</Th>
                  <Th align="right">Balance</Th>
                  <Th>Status</Th>
                  <Th align="right">Action</Th>
                </Tr>
              </thead>
              <tbody>
                {mine.map((i) => {
                  const o = s.opportunities.find((x) => x.id === i.opportunityId)
                  const acc = o ? ACCOUNT_BY_ID[o.accountId] : undefined
                  const paymentLink = activeRequests.find((request) => request.invoiceId === i.id)
                  return (
                    <Tr key={i.id}>
                      <Td mono>{i.number}</Td>
                      <Td>
                        <Link to={`/opportunities/${i.opportunityId}`} className="text-primary hover:underline">
                          {acc?.name}
                        </Link>
                        <span className="block text-sm text-muted">{o?.name}</span>
                      </Td>
                      <Td>{KIND_LABEL[i.kind]}</Td>
                      <Td>
                        <span className="flex items-center gap-1.5 font-mono text-sm text-muted">
                          <RefreshCw size={10} />
                          {i.quickbooksId ?? 'Not synced'}
                        </span>
                      </Td>
                      <Td align="right" mono>
                        {money(i.amount)}
                      </Td>
                      <Td align="right" mono>
                        {money(paid(i))}
                      </Td>
                      <Td align="right" mono>
                        {money(i.amount - paid(i))}
                      </Td>
                      <Td>
                        <Badge
                          tone={i.status === 'paid' ? 'success' : i.status === 'partial' ? 'warning' : 'neutral'}
                        >
                          {i.status}
                        </Badge>
                        {paymentLink && (
                          <span className="mt-1 block text-xs text-muted">
                            Link {paymentLink.status} · {paymentLink.channel}
                          </span>
                        )}
                      </Td>
                      <Td align="right">
                        <div className="flex justify-end gap-2">
                          {i.status !== 'paid' && (
                            <Button size="sm" onClick={() => setPaying(i)}>
                              <Banknote size={12} />
                              Record payment
                            </Button>
                          )}
                          {!paymentLink && i.status !== 'paid' && (
                            <Button
                              size="sm"
                              onClick={() =>
                                createPaymentRequest({
                                  opportunityId: i.opportunityId,
                                  invoiceId: i.id,
                                  estimateId: null,
                                  kind: i.kind === 'deposit' ? 'deposit' : 'invoice',
                                  amount: i.amount - paid(i),
                                  channel: 'email',
                                  recipientName: acc?.contactName ?? 'Customer',
                                  recipientEmail: acc?.email,
                                  recipientPhone: acc?.phone,
                                  note: 'Hosted payment request sent from accounting.',
                                  status: 'sent',
                                  processorStatus: 'pending',
                                  sentAt: new Date().toISOString(),
                                  viewedAt: null,
                                  paidAt: null,
                                })
                              }
                            >
                              <Send size={12} />
                              Send link
                            </Button>
                          )}
                          {paymentLink && (
                            <>
                              <Link to={`/pay/${paymentLink.token}`} target="_blank">
                                <Button size="sm">
                                  <ExternalLink size={12} />
                                  Open link
                                </Button>
                              </Link>
                              {paymentLink.status !== 'paid' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    updatePaymentRequestStatus(
                                      paymentLink.id,
                                      'paid',
                                      'Accounting marked the hosted payment as settled.',
                                      { method: 'ACH' },
                                    )
                                  }
                                >
                                  <CreditCard size={12} />
                                  Mark hosted paid
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <RaiseInvoice opportunity={raising} onClose={() => setRaising(null)} />
      <ManualInvoiceComposer
        open={manualOpen}
        opportunities={opps}
        count={s.invoices.length}
        selectedOpportunityId={manualOpportunityId}
        setSelectedOpportunityId={setManualOpportunityId}
        kind={manualKind}
        setKind={setManualKind}
        amount={manualAmount}
        setAmount={setManualAmount}
        onClose={() => setManualOpen(false)}
        onCreate={() => {
          if (!manualOpportunityId || manualAmount <= 0) return
          createInvoice({
            opportunityId: manualOpportunityId,
            number: `INV-${5400 + s.invoices.length}`,
            kind: manualKind,
            amount: manualAmount,
            status: 'draft',
            issuedAt: new Date().toISOString(),
            dueAt: iso(14),
            quickbooksId: null,
            payments: [],
          })
          setManualOpen(false)
          setManualOpportunityId('')
          setManualAmount(0)
          setManualKind('progress')
        }}
      />
      <RecordPayment
        invoice={paying}
        onClose={() => setPaying(null)}
        onSubmit={(amount, method) => {
          if (!paying) return
          recordPayment(paying.id, amount, method)
          setPaying(null)
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------------ */

function ManualInvoiceComposer({
  open,
  opportunities,
  count,
  selectedOpportunityId,
  setSelectedOpportunityId,
  kind,
  setKind,
  amount,
  setAmount,
  onClose,
  onCreate,
}: {
  open: boolean
  opportunities: Opportunity[]
  count: number
  selectedOpportunityId: string
  setSelectedOpportunityId: (value: string) => void
  kind: InvoiceKind
  setKind: (value: InvoiceKind) => void
  amount: number
  setAmount: (value: number) => void
  onClose: () => void
  onCreate: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Manual invoice" subtitle={`Create freeform billing outside the closeout queue. Draft number INV-${5400 + count}.`}>
      <div className="grid gap-3">
        <FieldRow label="Opportunity">
          <Select value={selectedOpportunityId} onChange={(e) => setSelectedOpportunityId(e.target.value)}>
            <option value="">Select project…</option>
            {opportunities.map((opp) => (
              <option key={opp.id} value={opp.id}>
                {opp.name}
              </option>
            ))}
          </Select>
        </FieldRow>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow label="Invoice type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as InvoiceKind)}>
              <option value="deposit">Deposit</option>
              <option value="progress">Progress</option>
              <option value="final">Final</option>
              <option value="change_order">Change order</option>
            </Select>
          </FieldRow>
          <FieldRow label="Amount">
            <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
          </FieldRow>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={onCreate} disabled={!selectedOpportunityId || amount <= 0}>Create invoice</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------------ */

function RaiseInvoice({
  opportunity,
  onClose,
}: {
  opportunity: Opportunity | null
  onClose: () => void
}) {
  const createInvoice = useStore((s) => s.createInvoice)
  const count = useStore((s) => s.invoices.length)
  const [kind, setKind] = useState<InvoiceKind>('progress')
  const [amount, setAmount] = useState(0)

  if (!opportunity) return null

  return (
    <Modal
      open
      onClose={onClose}
      icon={<Receipt size={17} />}
      title="Raise an invoice"
      subtitle={opportunity.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={amount <= 0}
            onClick={() => {
              createInvoice({
                opportunityId: opportunity.id,
                number: `JOB-INV-${2100 + count}`,
                kind,
                amount,
                status: 'sent',
                issuedAt: new Date().toISOString(),
                dueAt: iso(30),
                quickbooksId: `QB-${9000 + count}`,
                payments: [],
              })
              onClose()
            }}
          >
            Raise and sync
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label="Invoice type">
          <Select value={kind} onChange={(e) => setKind(e.target.value as InvoiceKind)}>
            <option value="deposit">Deposit</option>
            <option value="progress">Progress</option>
            <option value="final">Final</option>
            <option value="change_order">Change order</option>
          </Select>
        </FieldRow>
        <FieldRow label="Amount">
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </FieldRow>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
        <RefreshCw size={12} />
        Synchronises to QuickBooks on creation. Payment status flows back automatically.
      </p>
    </Modal>
  )
}

function RecordPayment({
  invoice,
  onClose,
  onSubmit,
}: {
  invoice: Invoice | null
  onClose: () => void
  onSubmit: (amount: number, method: 'Check' | 'ACH' | 'Card') => void
}) {
  const [amount, setAmount] = useState(0)
  const [method, setMethod] = useState<'Check' | 'ACH' | 'Card'>('ACH')

  if (!invoice) return null
  const outstanding = invoice.amount - invoice.payments.reduce((a, p) => a + p.amount, 0)

  return (
    <Modal
      open
      onClose={onClose}
      icon={<Banknote size={17} />}
      title={`Record payment · ${invoice.number}`}
      subtitle={`${money(outstanding)} outstanding. Partial payments are supported.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={amount <= 0} onClick={() => onSubmit(amount, method)}>
            Record payment
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label="Amount received">
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </FieldRow>
        <FieldRow label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            <option value="ACH">ACH</option>
            <option value="Check">Check</option>
            <option value="Card">Card</option>
          </Select>
        </FieldRow>
      </div>
      <Button size="sm" className="mt-2" onClick={() => setAmount(outstanding)}>
        Pay full balance ({money(outstanding)})
      </Button>

      {invoice.payments.length > 0 && (
        <div className="mt-4 border-t border-subtle pt-3">
          <p className="mb-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
            Payments received
          </p>
          {invoice.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-0.5 text-sm">
              <span className="text-secondary">
                {p.method} · {format(new Date(p.receivedAt), 'd MMM yyyy')}
              </span>
              <span className="font-mono text-primary tabular">{money(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
