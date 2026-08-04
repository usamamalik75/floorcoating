import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  CircleAlert,
  Lock,
  MessageSquareWarning,
  Paperclip,
  ScanSearch,
  ShieldCheck,
  UserPlus,
  XCircle,
} from 'lucide-react'
import type { CommunicationChannel, Gate, Opportunity, StageId } from '@/domain/types'
import { ROLE_LABEL, withVisitVocab } from '@/domain/types'
import { STAGE_BY_ID, stageLabel } from '@/domain/stages'
import { templateForStage } from '@/data/checklists'
import { useStore } from '@/store/useStore'
import { useChecks, useChecklistTemplates, useUsers } from '@/store/selectors'
import { Badge, Button, Checkbox, Input, Modal, Select, StageChip, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'

const GATE_ICON = {
  checklist: ClipboardCheck,
  approval: ShieldCheck,
  reminder: BellRing,
  assign: UserPlus,
  attach: Paperclip,
  confirm: CheckCircle2,
  readiness: ScanSearch,
  reason: MessageSquareWarning,
} as const

const DELAY_REASONS = [
  'Budget cycle — deferred to a future capital plan',
  'Ownership or management change',
  'Scope change under review',
  'Permitting or construction delay',
  'Competitor under consideration',
  'Facility shutdown window unavailable',
]

const LOST_REASONS = [
  'Price — lost to a competitor',
  'Timing — customer deferred indefinitely',
  'Scope — we could not meet the specification',
  'No decision — went silent',
  'Went with an in-house solution',
]

/**
 * Fired on every stage transition. Everything it renders comes from
 * STAGES[].gates — no stage is special-cased in this component.
 *
 * Two gate kinds carry the weight of the brief:
 *
 *   `reminder` is blocking on Delayed and Follow-up. A rep cannot land a
 *   record in Delayed without committing to a date to chase it, which is the
 *   difference between a nurture list and twenty forgotten six-figure bids.
 *
 *   `readiness` is computed from the record itself, so it cannot be ticked
 *   away. "The proposal should not be sent while required information is
 *   missing" is enforced rather than requested.
 */
export function StageGate({
  opportunity,
  targetStage,
  open,
  onClose,
}: {
  opportunity: Opportunity | null
  targetStage: StageId | null
  open: boolean
  onClose: () => void
}) {
  const moveStage = useStore((s) => s.moveStage)
  const checklists = useStore((s) => s.checklists)
  const toggleChecklistItem = useStore((s) => s.toggleChecklistItem)
  const checklistTemplates = useChecklistTemplates()
  const users = useUsers()

  const [satisfied, setSatisfied] = useState<Record<number, boolean>>({})
  const [reminderDate, setReminderDate] = useState('')
  const [reminderNote, setReminderNote] = useState('')
  const [followUpChannel, setFollowUpChannel] = useState<CommunicationChannel>('email')
  const [reason, setReason] = useState('')
  const [expectedPeriod, setExpectedPeriod] = useState('')
  const [assignee, setAssignee] = useState('')

  const def = targetStage ? STAGE_BY_ID[targetStage] : null
  const checks = useChecks(opportunity?.id ?? '', targetStage ?? 'prospect')

  useEffect(() => {
    if (!open) return
    setSatisfied({})
    setReminderDate('')
    setReminderNote('')
    setFollowUpChannel('email')
    setReason('')
    setExpectedPeriod('')
    setAssignee('')
  }, [open, opportunity?.id, targetStage])

  const checklistTemplate = useMemo(() => {
    if (!def || !opportunity) return undefined
    const gate = def.gates.find((g) => g.kind === 'checklist')
    if (!gate) return undefined
    const gateTemplateId = (gate as Extract<Gate, { kind: 'checklist' }>).templateId
    return (
      templateForStage(def.id, opportunity.category, checklistTemplates) ??
      checklistTemplates.find((t) => t.id === gateTemplateId)
    )
  }, [checklistTemplates, def, opportunity])

  const instance = checklists.find(
    (c) => c.opportunityId === opportunity?.id && c.templateId === checklistTemplate?.id,
  )

  if (!open || !opportunity || !def || !targetStage) return null

  /** Readiness gates map onto the computed checks by label order. */
  const readinessGates = def.gates.filter((g) => g.kind === 'readiness')
  const readinessOk = checks.length === 0 || checks.every((c) => c.ok)

  const isGateMet = (gate: Gate, index: number): boolean => {
    switch (gate.kind) {
      case 'reminder':
        return Boolean(reminderDate)
      case 'assign':
        return Boolean(assignee)
      case 'reason':
        return Boolean(reason)
      case 'readiness':
        return readinessOk
      case 'checklist':
        return checklistTemplate ? (instance?.done.length ?? 0) >= checklistTemplate.items.length : true
      default:
        return Boolean(satisfied[index])
    }
  }

  const blockers = def.gates.filter((g, i) => g.blocking && !isGateMet(g, i))
  const canAdvance = blockers.length === 0
  const hasBlockingReminder = def.gates.some((g) => g.kind === 'reminder' && g.blocking)

  const confirm = () => {
    moveStage(opportunity.id, targetStage, {
      reminderAt: reminderDate ? new Date(reminderDate).toISOString() : undefined,
      reminderNote,
      followUpChannel,
      reminderReason: reason || undefined,
      expectedPeriod: expectedPeriod || undefined,
      assigneeId: assignee || undefined,
      reason: reason || undefined,
    })
    onClose()
  }

  const reasonOptions = targetStage === 'lost' ? LOST_REASONS : DELAY_REASONS

  return (
    <Modal
      open={open}
      onClose={onClose}
      blocking={hasBlockingReminder}
      size="lg"
      icon={<ArrowRight size={17} className="text-attention" />}
      title={<span className="flex items-center gap-2">Moving to {stageLabel(targetStage, opportunity.category)}</span>}
      subtitle={withVisitVocab(def.purpose, opportunity.category)}
      footer={
        <>
          {hasBlockingReminder ? (
            <span className="mr-auto flex items-center gap-1.5 text-sm text-warning-text">
              <Lock size={12} />
              This stage cannot be entered without a follow-up date.
            </span>
          ) : blockers.length > 0 ? (
            <span className="mr-auto flex items-center gap-1.5 text-sm text-muted">
              <AlertTriangle size={12} />
              {blockers.length} required {blockers.length === 1 ? 'step' : 'steps'} remaining
            </span>
          ) : (
            <span className="mr-auto flex items-center gap-1.5 text-sm text-success-text">
              <CheckCircle2 size={12} />
              All requirements met
            </span>
          )}
          <Button variant="ghost" onClick={onClose}>
            {hasBlockingReminder ? `Keep in ${stageLabel(opportunity.stage, opportunity.category)}` : 'Cancel'}
          </Button>
          <Button variant="primary" disabled={!canAdvance} onClick={confirm}>
            Confirm move
          </Button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-2 rounded-md border border-subtle bg-surface-inset px-3 py-2">
        <StageChip
          group={STAGE_BY_ID[opportunity.stage].group}
          label={stageLabel(opportunity.stage, opportunity.category)}
        />
        <ArrowRight size={13} className="text-muted" />
        <StageChip group={def.group} label={stageLabel(targetStage, opportunity.category)} />
        <span className="ml-auto font-mono text-sm text-muted">{opportunity.code}</span>
      </div>

      {def.gates.length === 0 ? (
        <p className="py-2 text-base text-muted">
          No requirements on this stage. The record will move immediately.
        </p>
      ) : (
        <div className="space-y-2.5">
          {def.gates.map((gate, i) => {
            const Icon = GATE_ICON[gate.kind]
            const met = isGateMet(gate, i)
            return (
              <div
                key={i}
                className={cn(
                  'rounded-md border px-3 py-2.5 transition-colors duration-(--duration-fast)',
                  met
                    ? 'border-(--status-success) bg-success-soft'
                    : gate.blocking
                      ? 'border-(--status-warning) bg-warning-soft'
                      : 'border-subtle bg-surface-raised',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Icon
                    size={15}
                    className={cn(
                      'mt-0.5 shrink-0',
                      met ? 'text-success-text' : gate.blocking ? 'text-warning-text' : 'text-muted',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-medium text-primary">
                        {withVisitVocab(gate.label, opportunity.category)}
                      </p>
                      {gate.blocking && !met && (
                        <Badge tone="warning" icon={<Lock size={9} />}>
                          Required
                        </Badge>
                      )}
                      {met && (
                        <Badge tone="success" icon={<CheckCircle2 size={9} />}>
                          Done
                        </Badge>
                      )}
                    </div>

                    {'helper' in gate && gate.helper && (
                      <p className="mt-0.5 text-sm leading-snug text-muted">
                        {withVisitVocab(gate.helper, opportunity.category)}
                      </p>
                    )}

                    {/* ---- Gate bodies ---- */}

                    {gate.kind === 'readiness' && readinessGates[0] === gate && (
                      <div className="mt-2.5 space-y-1 rounded-sm border border-subtle bg-surface-base p-2.5">
                        {checks.map((c) => (
                          <div key={c.id} className="flex items-start gap-2 py-0.5">
                            {c.ok ? (
                              <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-success-text" />
                            ) : (
                              <XCircle size={13} className="mt-0.5 shrink-0 text-danger-text" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className={cn('text-sm', c.ok ? 'text-secondary' : 'font-medium text-primary')}>
                                {c.label}
                              </p>
                              <p className="text-2xs text-muted">{c.detail}</p>
                            </div>
                            {!c.ok && c.href && (
                              <Link
                                to={c.href}
                                onClick={onClose}
                                className="shrink-0 text-2xs font-medium text-accent underline underline-offset-2"
                              >
                                Fix this
                              </Link>
                            )}
                          </div>
                        ))}
                        <p className="mt-2 flex items-start gap-1.5 border-t border-subtle pt-2 text-2xs text-muted">
                          <CircleAlert size={11} className="mt-px shrink-0" />
                          Verified against the record. These cannot be ticked off by hand.
                        </p>
                      </div>
                    )}

                    {gate.kind === 'checklist' && checklistTemplate && (
                      <div className="mt-2.5 space-y-1.5 rounded-sm border border-subtle bg-surface-base p-2.5">
                        <p className="mb-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
                          {checklistTemplate.name}
                          {checklistTemplate.managedByCompany && ' · company standard'}
                        </p>
                        {checklistTemplate.items.map((item) => (
                          <Checkbox
                            key={item.id}
                            checked={instance?.done.includes(item.id) ?? false}
                            onChange={() => toggleChecklistItem(opportunity.id, checklistTemplate.id, item.id)}
                            label={item.label}
                            description={item.helper}
                          />
                        ))}
                      </div>
                    )}

                    {gate.kind === 'reason' && (
                      <div className="mt-2.5">
                        <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                          <option value="">Select a reason…</option>
                          {reasonOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}

                    {gate.kind === 'confirm' && targetStage === 'delayed' && (
                      <div className="mt-2.5">
                        <Input
                          value={expectedPeriod}
                          onChange={(e) => {
                            setExpectedPeriod(e.target.value)
                            setSatisfied((s) => ({ ...s, [i]: Boolean(e.target.value) }))
                          }}
                          placeholder="e.g. Q1 2028 capital cycle"
                          className="max-w-sm"
                        />
                      </div>
                    )}

                    {gate.kind === 'reminder' && (
                      <div className="mt-2.5 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="date"
                            value={reminderDate}
                            onChange={(e) => setReminderDate(e.target.value)}
                            className="max-w-[11rem]"
                          />
                          <div className="flex gap-1">
                            {[
                              { label: '+30d', days: 30 },
                              { label: '+90d', days: 90 },
                              { label: '+6mo', days: 182 },
                              { label: '+1yr', days: 365 },
                              { label: '+2yr', days: 730 },
                            ].map((p) => (
                              <Button
                                key={p.label}
                                size="sm"
                                onClick={() => {
                                  const d = new Date()
                                  d.setDate(d.getDate() + p.days)
                                  setReminderDate(d.toISOString().slice(0, 10))
                                }}
                              >
                                {p.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <Textarea
                          rows={2}
                          value={reminderNote}
                          onChange={(e) => setReminderNote(e.target.value)}
                          placeholder="What did the customer say? e.g. budget pushed to the 2028 capital cycle — re-engage mid-2027."
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-muted">Create follow-up draft in</span>
                          <Select
                            value={followUpChannel}
                            onChange={(e) => setFollowUpChannel(e.target.value as CommunicationChannel)}
                            className="max-w-[10rem]"
                          >
                            <option value="email">Email</option>
                            <option value="sms">SMS</option>
                          </Select>
                        </div>
                      </div>
                    )}

                    {gate.kind === 'assign' && (
                      <Select
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        className="mt-2.5 max-w-sm"
                      >
                        <option value="">Select a person…</option>
                        {users.filter(
                          (u) => u.locationId === opportunity.locationId && u.role === gate.role,
                        ).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} — {u.title}
                          </option>
                        ))}
                      </Select>
                    )}

                    {(gate.kind === 'attach' || gate.kind === 'approval') && (
                      <div className="mt-2">
                        <Checkbox
                          checked={Boolean(satisfied[i])}
                          onChange={(v) => setSatisfied((s) => ({ ...s, [i]: v }))}
                          label={gate.kind === 'approval' ? `Approved by ${ROLE_LABEL[gate.role]}` : 'Attached'}
                        />
                      </div>
                    )}

                    {gate.kind === 'confirm' && targetStage !== 'delayed' && (
                      <div className="mt-2">
                        <Checkbox
                          checked={Boolean(satisfied[i])}
                          onChange={(v) => setSatisfied((s) => ({ ...s, [i]: v }))}
                          label="Confirmed"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {def.notify.length > 0 && (
        <div className="mt-4 rounded-md border border-subtle bg-surface-inset px-3 py-2.5">
          <p className="mb-1.5 text-2xs font-semibold tracking-wider text-muted uppercase">
            This move will notify
          </p>
          <ul className="space-y-1">
            {def.notify.map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-secondary">
                <BellRing size={12} className="mt-0.5 shrink-0 text-attention" />
                <span>
                  <span className="font-medium text-primary">{ROLE_LABEL[n.role]}</span> — {n.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
