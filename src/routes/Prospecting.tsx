import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Search } from 'lucide-react'
import type { Vertical } from '@/domain/types'
import { useStore } from '@/store/useStore'
import { useViewer } from '@/store/selectors'
import { Badge, Button, Card, CardHeader, EmptyState, FieldRow, Input, Modal, Select, Table, Td, Th, Tr } from '@/components/ui'

const VERTICALS: Vertical[] = [
  'Food & Beverage',
  'Industrial',
  'Hospitality',
  'Retail',
  'Warehouse',
  'Institutional',
  'Traffic & Parking',
  'Showrooms',
  'Education',
  'Pharmaceutical',
  'Office Space',
  'Commercial',
  'Residential',
]

export function Prospecting() {
  const navigate = useNavigate()
  const viewer = useViewer()
  const locations = useStore((s) => s.locations)
  const accounts = useStore((s) => s.accounts)
  const users = useStore((s) => s.users)
  const locationFilter = useStore((s) => s.locationFilter)
  const requests = useStore((s) => s.prospectRequests)
  const upsertProspectRequest = useStore((s) => s.upsertProspectRequest)
  const upsertAccount = useStore((s) => s.upsertAccount)
  const createOpportunity = useStore((s) => s.createOpportunity)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({
    locationId: locationFilter === 'all' ? locations[0]?.id ?? '' : locationFilter,
    vertical: 'Food & Beverage' as Vertical,
    originCity: locations[0]?.city ?? '',
    radiusMiles: 100,
    minEmployees: 50,
  })

  const visible = useMemo(
    () => requests.filter((request) => locationFilter === 'all' || request.locationId === locationFilter),
    [locationFilter, requests],
  )
  const importedProspects = accounts.filter(
    (account) => account.anchorStage === 'prospect' && (locationFilter === 'all' || account.locationId === locationFilter),
  )

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-[78rem] px-5 py-5">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-primary">Prospecting</h1>
            <p className="mt-0.5 text-base text-muted">
              Request target lists, review imported companies, and move pre-lead outreach into the same workspace.
            </p>
          </div>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus size={14} />
            New prospecting request
          </Button>
        </header>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-2xs font-semibold tracking-wider text-muted uppercase">Requests</p>
            <p className="mt-1 font-display text-2xl text-primary">{visible.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xs font-semibold tracking-wider text-muted uppercase">Imported prospects</p>
            <p className="mt-1 font-display text-2xl text-primary">{importedProspects.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xs font-semibold tracking-wider text-muted uppercase">Owner</p>
            <p className="mt-1 text-base text-primary">{viewer?.name ?? 'Platform owner'}</p>
          </Card>
        </div>

        <Card className="mb-6 overflow-hidden">
          <CardHeader
            title="Prospecting requests"
            subtitle="Platform owner or branch sales leader defines the target list before import."
            icon={<Search size={14} />}
          />
          {visible.length === 0 ? (
            <EmptyState title="No prospecting requests" description="Start a request to design the pre-lead outreach journey." />
          ) : (
            <Table>
              <thead>
                <Tr>
                  <Th>Request</Th>
                  <Th>Location</Th>
                  <Th align="right">Companies</Th>
                  <Th>Status</Th>
                  <Th align="right">Action</Th>
                </Tr>
              </thead>
              <tbody>
                {visible.map((request) => (
                  <Tr key={request.id}>
                    <Td>
                      <p className="font-medium text-primary">
                        {request.vertical} within {request.radiusMiles} miles of {request.originCity}
                      </p>
                      <p className="text-sm text-muted">
                        {request.minEmployees}+ employees · requested by{' '}
                        {users.find((user) => user.id === request.requestedById)?.name ?? 'Platform team'}
                      </p>
                    </Td>
                    <Td>{locations.find((location) => location.id === request.locationId)?.name ?? 'Unassigned'}</Td>
                    <Td align="right" mono>{request.estimatedCount}</Td>
                    <Td>
                      <Badge tone={request.status === 'approved' || request.status === 'imported' ? 'success' : request.status === 'pending_approval' ? 'warning' : 'neutral'}>
                        {request.status.replace('_', ' ')}
                      </Badge>
                    </Td>
                    <Td align="right">
                      {request.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const location = locations.find((candidate) => candidate.id === request.locationId)
                            Array.from({ length: 3 }).forEach((_, index) => {
                              upsertAccount({
                                id: `prospect_${request.id}_${index}`,
                                name: `${request.vertical} Prospect ${index + 1}`,
                                vertical: request.vertical,
                                locationId: request.locationId,
                                contactName: `Decision Maker ${index + 1}`,
                                contactTitle: 'Target buyer',
                                email: `prospect${index + 1}@example.com`,
                                phone: '(555) 555-0100',
                                city: location?.city ?? request.originCity,
                                state: location?.state ?? 'IL',
                                zip: `${location?.zips[0] ?? '000'}10`,
                                isNational: false,
                                source: 'External provider',
                                createdAt: new Date().toISOString(),
                                anchorStage: 'prospect',
                                lastActivityAt: new Date().toISOString(),
                              })
                            })
                            upsertProspectRequest({ ...request, status: 'imported' })
                          }}
                        >
                          Import prospects
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader
            title="Imported prospects"
            subtitle="Companies can stay in a prospect stage before they become real leads."
            icon={<Building2 size={14} />}
          />
          {importedProspects.length === 0 ? (
            <EmptyState title="No imported prospects yet" description="Approved requests would land new companies here for outreach." />
          ) : (
            <Table>
              <thead>
                <Tr>
                  <Th>Company</Th>
                  <Th>Contact</Th>
                  <Th>Location</Th>
                  <Th align="right">Action</Th>
                </Tr>
              </thead>
              <tbody>
                {importedProspects.map((account) => (
                  <Tr key={account.id}>
                    <Td>{account.name}</Td>
                    <Td>{account.contactName}</Td>
                    <Td>{locations.find((location) => location.id === account.locationId)?.name ?? account.locationId}</Td>
                    <Td align="right">
                      <Button
                        size="sm"
                        onClick={() => {
                          upsertAccount({ ...account, anchorStage: 'contact', lastActivityAt: new Date().toISOString() })
                          const createdId = createOpportunity({
                            code: `JOB-${account.locationId.replace('loc_', '').toUpperCase()}-${1100 + accounts.length}`,
                            name: `${account.name} — outbound opportunity`,
                            accountId: account.id,
                            locationId: account.locationId,
                            category: 'commercial',
                            stage: 'new_lead',
                            temperature: 'warm',
                            ownerId: '',
                            estimatorId: null,
                            pmId: null,
                            value: 0,
                            estimatedQuantity: 0,
                            secondaryQuantity: 0,
                            address: `${account.city}, ${account.state}`,
                            zip: account.zip,
                            createdAt: new Date().toISOString(),
                            stageEnteredAt: new Date().toISOString(),
                            catalogItemIds: [],
                            reminderAt: null,
                            source: 'External provider',
                            visitAt: null,
                          })
                          navigate(`/opportunities/${createdId}`)
                        }}
                      >
                        Create lead
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New prospecting request"
        subtitle="Design a pre-lead sourcing request for a branch or territory."
      >
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldRow label="Location">
              <Select value={draft.locationId} onChange={(e) => setDraft({ ...draft, locationId: e.target.value })}>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            </FieldRow>
            <FieldRow label="Industry vertical">
              <Select value={draft.vertical} onChange={(e) => setDraft({ ...draft, vertical: e.target.value as Vertical })}>
                {VERTICALS.map((vertical) => (
                  <option key={vertical} value={vertical}>
                    {vertical}
                  </option>
                ))}
              </Select>
            </FieldRow>
            <FieldRow label="Origin city">
              <Input value={draft.originCity} onChange={(e) => setDraft({ ...draft, originCity: e.target.value })} />
            </FieldRow>
            <FieldRow label="Search radius">
              <Input type="number" value={draft.radiusMiles} onChange={(e) => setDraft({ ...draft, radiusMiles: Number(e.target.value) || 0 })} />
            </FieldRow>
            <FieldRow label="Minimum employees" className="sm:col-span-2">
              <Input type="number" value={draft.minEmployees} onChange={(e) => setDraft({ ...draft, minEmployees: Number(e.target.value) || 0 })} />
            </FieldRow>
          </div>
          <div className="rounded-md border border-subtle bg-surface-inset px-3 py-2 text-sm text-muted">
            Requests now persist in the shared demo workspace. Provider sync is still mocked and would later call Apollo or another data source.
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                upsertProspectRequest({
                  id: `pr_${Date.now().toString(36)}`,
                  requestedById: viewer?.id ?? 'u_nic',
                  estimatedCount: Math.max(25, draft.radiusMiles + draft.minEmployees),
                  status: 'pending_approval',
                  ...draft,
                });
                setOpen(false);
              }}
            >
              Create request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
