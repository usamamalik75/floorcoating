import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Inbox, Mail, MessageSquare, Reply, Send, Sparkles } from 'lucide-react'
import { ACCOUNT_BY_ID } from '@/data/seed'
import { useStore } from '@/store/useStore'
import { useMessageThreads, useScopedOpportunities } from '@/store/selectors'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  FieldRow,
  Input,
  SectionTitle,
  Select,
  Textarea,
} from '@/components/ui'

export function Communications() {
  const opportunities = useScopedOpportunities()
  const allThreads = useMessageThreads()
  const templates = useStore((s) => s.communicationTemplates)
  const sendMessage = useStore((s) => s.sendMessage)
  const addInboundMessage = useStore((s) => s.addInboundMessage)
  const markThreadStatus = useStore((s) => s.markThreadStatus)

  const threads = useMemo(
    () => allThreads.filter((thread) => opportunities.some((opp) => opp.id === thread.opportunityId)),
    [allThreads, opportunities],
  )

  const [selectedId, setSelectedId] = useState<string | null>(threads[0]?.id ?? null)
  const [channel, setChannel] = useState<'email' | 'sms'>('email')
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const selected = threads.find((thread) => thread.id === selectedId) ?? threads[0]
  const selectedOpp = opportunities.find((opp) => opp.id === selected?.opportunityId)
  const selectedAccount = selectedOpp ? ACCOUNT_BY_ID[selectedOpp.accountId] : undefined
  const channelTemplates = templates.filter((template) => template.channel === channel)

  const applyTemplate = (id: string) => {
    setTemplateId(id)
    const template = templates.find((candidate) => candidate.id === id)
    if (!template) return
    setSubject(template.subject ?? '')
    setBody(
      template.body
        .replaceAll('{{contactName}}', selected?.contactName ?? selectedAccount?.contactName ?? 'Customer')
        .replaceAll('{{ownerName}}', 'Your service team'),
    )
  }

  const send = (status: 'draft' | 'sent') => {
    if (!selected || !selectedOpp || !body.trim()) return
    sendMessage(selectedOpp.id, {
      channel,
      body,
      subject: channel === 'email' ? subject : undefined,
      contactName: selected.contactName,
      contactEmail: selected.contactEmail,
      contactPhone: selected.contactPhone,
      status,
    })
    if (status === 'sent') markThreadStatus(selected.id, 'waiting')
    setBody('')
    setSubject('')
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-[88rem] px-5 py-5">
        <header className="mb-5">
          <h1 className="font-display text-2xl text-primary">Communications</h1>
          <p className="mt-0.5 text-base text-muted">
            Shared email and SMS workflows for follow-ups, proposals, and payment requests.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <CardHeader
              title="Inbox"
              subtitle="Open customer conversations"
              icon={<Inbox size={14} />}
              actions={<Badge tone="neutral">{threads.length}</Badge>}
            />
            {threads.length === 0 ? (
              <EmptyState title="No active conversations" description="Drafting or sending a proposal follow-up will create one." />
            ) : (
              <div className="divide-y divide-(--border-subtle)">
                {threads.map((thread) => {
                  const opp = opportunities.find((candidate) => candidate.id === thread.opportunityId)
                  const last = thread.messages.at(-1)
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(thread.id)
                        setChannel(thread.lastChannel)
                      }}
                      className="block w-full px-4 py-3 text-left hover:bg-surface-inset"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium text-primary">{thread.contactName}</p>
                          <p className="truncate text-sm text-muted">{opp?.name}</p>
                        </div>
                        <Badge tone={thread.status === 'waiting' ? 'warning' : thread.status === 'closed' ? 'neutral' : 'success'}>
                          {thread.status}
                        </Badge>
                      </div>
                      {last && (
                        <>
                          <p className="mt-1 truncate text-sm text-secondary">{last.body}</p>
                          <p className="mt-1 text-xs text-muted">
                            {last.channel.toUpperCase()} · {format(new Date(last.at), 'd MMM · HH:mm')}
                          </p>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </Card>

          {!selected || !selectedOpp ? (
            <Card>
              <EmptyState title="Select a conversation" description="Choose a thread to review its timeline and draft the next message." />
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader
                  title={selected.contactName}
                  subtitle={`${selectedOpp.name} · ${selected.contactEmail ?? selected.contactPhone ?? 'No recipient set'}`}
                  icon={selected.lastChannel === 'email' ? <Mail size={14} /> : <MessageSquare size={14} />}
                  actions={
                    <div className="flex items-center gap-1.5">
                      <Link to={`/opportunities/${selectedOpp.id}?tab=messages`}>
                        <Button size="sm">Open opportunity</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markThreadStatus(selected.id, selected.status === 'closed' ? 'open' : 'closed')}
                      >
                        {selected.status === 'closed' ? 'Reopen' : 'Close'}
                      </Button>
                    </div>
                  }
                />
                <div className="space-y-3 p-4">
                  {selected.messages.map((message) => (
                    <div
                      key={message.id}
                      className={
                        message.direction === 'outbound'
                          ? 'ml-auto max-w-[85%] rounded-md bg-action-soft px-3 py-2'
                          : 'max-w-[85%] rounded-md border border-subtle bg-surface-inset px-3 py-2'
                      }
                    >
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span>{message.channel.toUpperCase()}</span>
                        <span>·</span>
                        <span>{message.status}</span>
                        <span>·</span>
                        <span>{format(new Date(message.at), 'd MMM · HH:mm')}</span>
                      </div>
                      {message.subject && <p className="mt-1 text-sm font-medium text-primary">{message.subject}</p>}
                      <p className="mt-1 whitespace-pre-wrap text-sm text-secondary">{message.body}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Compose next touch"
                  subtitle="Draft a proposal follow-up, payment reminder, or schedule confirmation."
                  icon={<Reply size={14} />}
                  actions={
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        addInboundMessage(selected.id, {
                          channel: selected.lastChannel,
                          body: 'This is the customer replying in the prototype so the team can see the thread reopen.',
                        })
                      }
                    >
                      Simulate reply
                    </Button>
                  }
                />
                <div className="grid gap-3 p-4 md:grid-cols-2">
                  <FieldRow label="Channel">
                    <Select
                      value={channel}
                      onChange={(e) => {
                        const next = e.target.value as 'email' | 'sms'
                        setChannel(next)
                        const first = templates.find((template) => template.channel === next)
                        if (first) applyTemplate(first.id)
                      }}
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                    </Select>
                  </FieldRow>
                  <FieldRow label="Template">
                    <Select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                      <option value="">Choose a template…</option>
                      {channelTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </Select>
                  </FieldRow>
                  {channel === 'email' && (
                    <FieldRow label="Subject" className="md:col-span-2">
                      <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
                    </FieldRow>
                  )}
                  <FieldRow label="Message" className="md:col-span-2">
                    <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the next customer touch..." />
                  </FieldRow>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-subtle px-4 py-3">
                  <Button onClick={() => send('draft')} icon={<Sparkles size={13} />}>
                    Save draft
                  </Button>
                  <Button variant="primary" onClick={() => send('sent')} icon={<Send size={13} />}>
                    Send now
                  </Button>
                </div>
              </Card>

              {selectedOpp && (
                <Card className="p-4">
                  <SectionTitle>Suggested next actions</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/estimate/${selectedOpp.id}`}>
                      <Button size="sm">Open proposal</Button>
                    </Link>
                    <Link to={`/opportunities/${selectedOpp.id}?tab=job`}>
                      <Button size="sm">Open delivery record</Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() =>
                        sendMessage(selectedOpp.id, {
                          channel: 'email',
                          body: 'Your payment link is ready in the prototype.',
                          subject: 'Payment link ready',
                          contactName: selected.contactName,
                          contactEmail: selected.contactEmail,
                          contactPhone: selected.contactPhone,
                          status: 'sent',
                        })
                      }
                    >
                      Send payment reminder
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
