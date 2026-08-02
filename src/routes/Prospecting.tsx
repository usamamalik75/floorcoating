import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Building2,
  CheckCircle2,
  Database,
  DownloadCloud,
  Loader2,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useViewer } from '@/store/selectors'
import { LOCATIONS, LOCATION_BY_ID, USER_BY_ID } from '@/data/seed'
import { VERTICALS } from '@/data/priceBook'
import type { ProspectRequest, Vertical } from '@/domain/types'
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
   Prospecting workspace
   ==========================================================================
   "Find all food and beverage manufacturing facilities within 100 miles of
   the Atlanta location."

   The client does not expect Apollo to be rebuilt — they expect to operate
   from one platform. So the request is composed here, the franchisor governs
   the spend, the provider call is represented as a step rather than
   simulated in depth, and the results land as Prospect-stage accounts on the
   location's own board.
   ========================================================================== */

const STATUS_TONE: Record<ProspectRequest['status'], 'neutral' | 'warning' | 'success' | 'danger'> = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'success',
  importing: 'warning',
  imported: 'success',
  rejected: 'danger',
}

const STATUS_LABEL: Record<ProspectRequest['status'], string> = {
  draft: 'Draft',
  pending_approval: 'Awaiting franchisor approval',
  approved: 'Approved — ready to import',
  importing: 'Importing',
  imported: 'Imported',
  rejected: 'Rejected',
}

export function Prospecting() {
  const viewer = useViewer()
  const requests = useStore((s) => s.prospectRequests)
  const accounts = useStore((s) => s.accounts)
  const locationFilter = useStore((s) => s.locationFilter)
  const decide = useStore((s) => s.decideProspectRequest)
  const importProspects = useStore((s) => s.importProspects)
  const [composing, setComposing] = useState(false)

  const isFranchisor = viewer?.role === 'franchisor'
  const visible = requests.filter((r) => isFranchisor || r.locationId === locationFilter || locationFilter === 'all')
  const prospects = accounts.filter(
    (a) => a.anchorStage === 'prospect' && (locationFilter === 'all' || a.locationId === locationFilter),
  )

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-[78rem] px-5 py-5">
        <header className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-primary">Prospecting</h1>
            <p className="mt-0.5 text-base text-muted">
              Request a target list from the data provider, import the companies, and work them from
              the same board as everything else.
            </p>
          </div>
          {!isFranchisor && (
            <Button variant="primary" onClick={() => setComposing(true)}>
              <Plus size={14} />
              New prospecting request
            </Button>
          )}
        </header>

        <SectionTitle>
          {isFranchisor ? 'Requests across the network' : 'Your requests'}
        </SectionTitle>
        <Card className="mb-6 overflow-hidden">
          {visible.length === 0 ? (
            <EmptyState
              icon={<Search size={26} />}
              title="No prospecting requests yet"
              description="Describe the companies you want to reach and the platform will source them."
            />
          ) : (
            <Table>
              <thead>
                <Tr>
                  <Th>Request</Th>
                  <Th>Location</Th>
                  <Th>Requested by</Th>
                  <Th align="right">Companies</Th>
                  <Th>Status</Th>
                  <Th align="right">Action</Th>
                </Tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      <p className="font-medium text-primary">
                        {r.vertical} within {r.radiusMiles} miles of {r.originCity}
                      </p>
                      <p className="text-sm text-muted">
                        {r.minEmployees}+ employees · {r.targetTitles.join(', ')}
                      </p>
                    </Td>
                    <Td>{LOCATION_BY_ID[r.locationId]?.name}</Td>
                    <Td>
                      <span className="text-secondary">{USER_BY_ID[r.requestedById]?.name}</span>
                      <span className="block text-sm text-muted">
                        {format(new Date(r.requestedAt), 'd MMM yyyy')}
                      </span>
                    </Td>
                    <Td align="right" mono>
                      {r.status === 'imported' ? r.importedCount : `~${r.estimatedCount}`}
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </Td>
                    <Td align="right">
                      {isFranchisor && r.status === 'pending_approval' ? (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => decide(r.id, false, viewer!.id)}>
                            <XCircle size={12} />
                            Reject
                          </Button>
                          <Button size="sm" variant="primary" onClick={() => decide(r.id, true, viewer!.id)}>
                            <ShieldCheck size={12} />
                            Approve
                          </Button>
                        </div>
                      ) : r.status === 'approved' ? (
                        <Button size="sm" variant="primary" onClick={() => importProspects(r.id)}>
                          <DownloadCloud size={12} />
                          Import
                        </Button>
                      ) : r.status === 'imported' ? (
                        <span className="flex items-center justify-end gap-1 text-sm text-success-text">
                          <CheckCircle2 size={12} />
                          {r.importedCount} imported
                        </span>
                      ) : (
                        <span className="text-sm text-muted">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <SectionTitle>Prospect companies · nobody has been contacted yet</SectionTitle>
        <Card className="overflow-hidden">
          {prospects.length === 0 ? (
            <EmptyState icon={<Building2 size={26} />} title="No prospects" />
          ) : (
            <Table>
              <thead>
                <Tr>
                  <Th>Company</Th>
                  <Th>Decision maker</Th>
                  <Th>Location</Th>
                  <Th>Vertical</Th>
                  <Th>Source</Th>
                  <Th align="right">Action</Th>
                </Tr>
              </thead>
              <tbody>
                {prospects.map((a) => (
                  <Tr key={a.id}>
                    <Td>
                      <Link to="/accounts" className="font-medium text-primary hover:underline">
                        {a.name}
                      </Link>
                    </Td>
                    <Td>
                      {a.contactName}
                      <span className="block text-sm text-muted">{a.contactTitle}</span>
                    </Td>
                    <Td>
                      {a.city}, {a.state}
                    </Td>
                    <Td>{a.vertical}</Td>
                    <Td>
                      <Badge tone="neutral" icon={<Database size={9} />}>
                        {a.source}
                      </Badge>
                    </Td>
                    <Td align="right">
                      <Button size="sm">
                        <Phone size={12} />
                        Log outreach
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <RequestComposer open={composing} onClose={() => setComposing(false)} />
    </div>
  )
}

/* ------------------------------------------------------------------------ */

function RequestComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const viewer = useViewer()
  const submit = useStore((s) => s.submitProspectRequest)
  const [vertical, setVertical] = useState<Vertical>('Food & Beverage')
  const [radius, setRadius] = useState(100)
  const [origin, setOrigin] = useState('Atlanta, GA')
  const [minEmployees, setMinEmployees] = useState(50)
  const [titles, setTitles] = useState('Facilities Manager, Plant Manager, Maintenance Director')
  const [searching, setSearching] = useState(false)
  const [estimate, setEstimate] = useState<number | null>(null)

  const runSearch = () => {
    setSearching(true)
    setEstimate(null)
    // Represents the provider round-trip rather than simulating it in depth.
    setTimeout(() => {
      setSearching(false)
      setEstimate(60 + Math.round(radius * 1.2 + Math.random() * 40))
    }, 900)
  }

  const send = () => {
    if (!viewer || estimate === null) return
    submit({
      locationId: viewer.locationId ?? LOCATIONS[0].id,
      requestedById: viewer.id,
      requestedAt: new Date().toISOString(),
      vertical,
      radiusMiles: radius,
      originCity: origin,
      minEmployees,
      targetTitles: titles.split(',').map((t) => t.trim()).filter(Boolean),
      estimatedCount: estimate,
      status: 'pending_approval',
      approvedById: null,
      approvedAt: null,
      importedCount: 0,
      creditCost: estimate,
    })
    setEstimate(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<Search size={17} className="text-attention" />}
      title="New prospecting request"
      subtitle="Describe who you want to reach. The platform queries the data provider and returns companies with decision makers attached."
      footer={
        <>
          <span className="mr-auto flex items-center gap-1.5 text-sm text-muted">
            <ShieldCheck size={12} />
            Requests over 50 companies route to the franchisor for approval.
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={estimate === null} onClick={send}>
            Submit for approval
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label="Industry vertical">
          <Select value={vertical} onChange={(e) => setVertical(e.target.value as Vertical)}>
            {VERTICALS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </FieldRow>
        <FieldRow label="Search radius" hint="Miles from the origin city">
          <Input type="number" value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
        </FieldRow>
        <FieldRow label="Origin">
          <Input value={origin} onChange={(e) => setOrigin(e.target.value)} />
        </FieldRow>
        <FieldRow label="Minimum employees">
          <Input
            type="number"
            value={minEmployees}
            onChange={(e) => setMinEmployees(Number(e.target.value))}
          />
        </FieldRow>
        <FieldRow
          label="Target job titles"
          className="sm:col-span-2"
          hint="Comma separated. These are the people who own the floor."
        >
          <Input value={titles} onChange={(e) => setTitles(e.target.value)} />
        </FieldRow>
      </div>

      <div className="mt-4 rounded-md border border-subtle bg-surface-inset px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-muted" />
            <p className="text-base text-secondary">
              Query Apollo for matching companies and decision makers
            </p>
          </div>
          <Button size="sm" onClick={runSearch} disabled={searching}>
            {searching ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {searching ? 'Searching…' : 'Run search'}
          </Button>
        </div>

        {estimate !== null && (
          <div
            className={cn(
              'mt-3 flex items-center gap-2 rounded-sm border border-(--status-success) bg-success-soft px-3 py-2',
            )}
          >
            <CheckCircle2 size={14} className="shrink-0 text-success-text" />
            <p className="text-base text-primary">
              <span className="font-semibold">{estimate} companies</span> matched, with named
              decision makers. They will land in your Prospects column once the request is approved
              and imported.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
