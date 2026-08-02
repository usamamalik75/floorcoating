import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  FileCheck2,
  Plus,
  Receipt,
  RefreshCw,
} from 'lucide-react'
import { useStore, money, ROYALTY_RATE, estimateTotal } from '@/store/useStore'
import { useScopedOpportunities, useViewer } from '@/store/selectors'
import { ACCOUNT_BY_ID, LOCATION_BY_ID, iso } from '@/data/seed'
import type { Invoice, InvoiceKind, Opportunity } from '@/domain/types'
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
  const recordPayment = useStore((st) => st.recordPayment)
  const moveStage = useStore((st) => st.moveStage)

  const [raising, setRaising] = useState<Opportunity | null>(null)
  const [paying, setPaying] = useState<Invoice | null>(null)

  const mine = s.invoices.filter((i) => opps.some((o) => o.id === i.opportunityId))
  const readyToInvoice = opps.filter((o) => o.stage === 'ready_invoice')
  const inReview = opps.filter((o) => o.stage === 'completion_review')

  const billed = mine.reduce((a, i) => a + i.amount, 0)
  const received = mine.reduce((a, i) => a + i.payments.reduce((p, x) => p + x.amount, 0), 0)

  const paid = (i: Invoice) => i.payments.reduce((a, p) => a + p.amount, 0)

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-[80rem] px-5 py-5">
        <header className="mb-5">
          <h1 className="font-display text-2xl text-primary">Accounting</h1>
          <p className="mt-0.5 text-base text-muted">
            Invoicing, QuickBooks synchronisation and payment status across{' '}
            {viewer?.role === 'franchisor' ? 'the network' : 'this location'}.
          </p>
        </header>

        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total billed', value: money(billed, true) },
            { label: 'Received', value: money(received, true) },
            { label: 'Outstanding', value: money(billed - received, true), warn: billed - received > 0 },
            { label: 'Royalty accrued', value: money(billed * ROYALTY_RATE, true), sub: '5% of gross invoiced' },
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
                          {LOCATION_BY_ID[o.locationId]?.name} · {o.code}
                        </span>
                      </Td>
                      <Td>
                        {o.stage === 'ready_invoice' ? (
                          <Badge tone="success">Ready to invoice</Badge>
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
                        {o.stage === 'ready_invoice' ? (
                          <Button size="sm" variant="primary" onClick={() => moveStage(o.id, 'invoiced')}>
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
                      </Td>
                      <Td align="right">
                        {i.status !== 'paid' && (
                          <Button size="sm" onClick={() => setPaying(i)}>
                            <Banknote size={12} />
                            Record payment
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
      </div>

      <RaiseInvoice opportunity={raising} onClose={() => setRaising(null)} />
      <RecordPayment
        invoice={paying}
        onClose={() => setPaying(null)}
        onSubmit={(amount, method) => {
          if (!paying) return
          recordPayment(paying.id, amount, method)
          const inv = s.invoices.find((x) => x.id === paying.id)
          const opp = s.opportunities.find((o) => o.id === paying.opportunityId)
          // Settling the last balance closes the project without anyone
          // marking it by hand.
          if (inv && opp?.stage === 'invoiced' && paid(inv) + amount >= inv.amount) {
            moveStage(opp.id, 'paid')
          }
          setPaying(null)
        }}
      />
    </div>
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
                number: `FCG-INV-${2100 + count}`,
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
