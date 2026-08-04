import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, FileSpreadsheet, Upload } from 'lucide-react'
import type { Vertical } from '@/domain/types'
import { useStore } from '@/store/useStore'
import { useViewer } from '@/store/selectors'
import { Badge, Button, Card, CardHeader, EmptyState, FieldRow, Modal, Select, Table, Td, Th, Tr } from '@/components/ui'

type SheetProspect = {
  name: string
  vertical: Vertical
  contactName: string
  contactTitle: string
  email: string
  phone: string
  city: string
  state: string
  zip: string
}

/** Mock sheet rows — stands in for a Google Sheet / CRM export import. */
const SHEET_PROSPECTS: SheetProspect[] = [
  {
    name: 'Northline Packaging Co.',
    vertical: 'Industrial',
    contactName: 'Elena Marsh',
    contactTitle: 'Plant Manager',
    email: 'elena.marsh@northline.example',
    phone: '(312) 555-0142',
    city: 'Chicago',
    state: 'IL',
    zip: '60622',
  },
  {
    name: 'Harborview Foods',
    vertical: 'Food & Beverage',
    contactName: 'Marcus Chen',
    contactTitle: 'Facilities Director',
    email: 'mchen@harborview.example',
    phone: '(404) 555-0198',
    city: 'Atlanta',
    state: 'GA',
    zip: '30318',
  },
  {
    name: 'Summit Retail Group',
    vertical: 'Retail',
    contactName: 'Priya Shah',
    contactTitle: 'Operations Lead',
    email: 'priya.shah@summitretail.example',
    phone: '(720) 555-0117',
    city: 'Denver',
    state: 'CO',
    zip: '80202',
  },
  {
    name: 'Clearpath Logistics',
    vertical: 'Warehouse',
    contactName: 'Jordan Blake',
    contactTitle: 'Site Supervisor',
    email: 'jblake@clearpath.example',
    phone: '(815) 555-0164',
    city: 'Joliet',
    state: 'IL',
    zip: '60431',
  },
  {
    name: 'Lakeside Hospitality',
    vertical: 'Hospitality',
    contactName: 'Ava Reynolds',
    contactTitle: 'General Manager',
    email: 'ava.reynolds@lakeside.example',
    phone: '(303) 555-0129',
    city: 'Denver',
    state: 'CO',
    zip: '80205',
  },
  {
    name: 'Peachtree Clinics',
    vertical: 'Institutional',
    contactName: 'Devon Price',
    contactTitle: 'Facilities Coordinator',
    email: 'dprice@peachtree.example',
    phone: '(678) 555-0183',
    city: 'Atlanta',
    state: 'GA',
    zip: '30309',
  },
]

function routeLocationId(
  zip: string,
  locations: { id: string; zips: string[] }[],
  fallbackId: string,
) {
  const prefix = zip.slice(0, 3)
  return locations.find((location) => location.zips.includes(prefix))?.id ?? fallbackId
}

export function Prospecting() {
  const navigate = useNavigate()
  const viewer = useViewer()
  const locations = useStore((s) => s.locations)
  const accounts = useStore((s) => s.accounts)
  const locationFilter = useStore((s) => s.locationFilter)
  const upsertAccount = useStore((s) => s.upsertAccount)
  const createOpportunity = useStore((s) => s.createOpportunity)
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [targetLocationId, setTargetLocationId] = useState(
    locationFilter === 'all' ? locations[0]?.id ?? '' : locationFilter,
  )

  const importedProspects = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.anchorStage === 'prospect' &&
          (locationFilter === 'all' || account.locationId === locationFilter),
      ),
    [accounts, locationFilter],
  )

  const importFromSheet = () => {
    if (!targetLocationId) return
    setImporting(true)
    const batchId = `sheet_${Date.now().toString(36)}`
    const stamp = new Date().toISOString()

    SHEET_PROSPECTS.forEach((row, index) => {
      const locationId = routeLocationId(row.zip, locations, targetLocationId)
      upsertAccount({
        id: `prospect_${batchId}_${index}`,
        name: row.name,
        vertical: row.vertical,
        locationId,
        contactName: row.contactName,
        contactTitle: row.contactTitle,
        email: row.email,
        phone: row.phone,
        city: row.city,
        state: row.state,
        zip: row.zip,
        isNational: false,
        source: 'External provider',
        createdAt: stamp,
        anchorStage: 'prospect',
        importBatchId: batchId,
        lastActivityAt: stamp,
      })
    })

    setImporting(false)
    setOpen(false)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="w-full px-5 py-5">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-primary">Prospecting</h1>
            <p className="mt-0.5 text-base text-muted">
              Import companies from a sheet, review them as prospects, and convert outreach into leads.
            </p>
          </div>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Upload size={14} />
            Import prospects
          </Button>
        </header>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <p className="text-2xs font-semibold tracking-wider text-muted uppercase">Imported prospects</p>
            <p className="mt-1 font-display text-2xl text-primary">{importedProspects.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xs font-semibold tracking-wider text-muted uppercase">Owner</p>
            <p className="mt-1 text-base text-primary">{viewer?.name ?? 'Platform owner'}</p>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader
            title="Imported prospects"
            subtitle="Companies stay in prospect stage until you create a lead for outreach."
            icon={<Building2 size={14} />}
          />
          {importedProspects.length === 0 ? (
            <EmptyState
              title="No imported prospects yet"
              description="Click Import prospects to pull companies from the sheet into this workspace."
            />
          ) : (
            <Table>
              <thead>
                <Tr>
                  <Th>Company</Th>
                  <Th>Contact</Th>
                  <Th>Vertical</Th>
                  <Th>Location</Th>
                  <Th align="right">Action</Th>
                </Tr>
              </thead>
              <tbody>
                {importedProspects.map((account) => (
                  <Tr key={account.id}>
                    <Td>
                      <p className="font-medium text-primary">{account.name}</p>
                      <p className="text-sm text-muted">
                        {account.city}, {account.state}
                      </p>
                    </Td>
                    <Td>
                      <p className="text-primary">{account.contactName}</p>
                      <p className="text-sm text-muted">{account.contactTitle}</p>
                    </Td>
                    <Td>
                      <Badge tone="neutral">{account.vertical}</Badge>
                    </Td>
                    <Td>
                      {locations.find((location) => location.id === account.locationId)?.name ?? account.locationId}
                    </Td>
                    <Td align="right">
                      <Button
                        size="sm"
                        onClick={() => {
                          upsertAccount({
                            ...account,
                            anchorStage: 'contact',
                            lastActivityAt: new Date().toISOString(),
                          })
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
        title="Import prospects"
        subtitle="Pull companies from the connected sheet into this workspace."
      >
        <div className="grid gap-3">
          <div className="flex items-start gap-3 rounded-md border border-subtle bg-surface-inset px-3 py-3">
            <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-muted" />
            <div>
              <p className="text-sm font-medium text-primary">Sheet source</p>
              <p className="mt-0.5 text-sm text-muted">
                This import reads {SHEET_PROSPECTS.length} companies from the demo prospect sheet and
                creates them as prospect accounts. ZIP routing assigns each row to the matching territory when possible.
              </p>
            </div>
          </div>

          <FieldRow label="Default location">
            <Select value={targetLocationId} onChange={(e) => setTargetLocationId(e.target.value)}>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </FieldRow>

          <div className="rounded-md border border-subtle px-3 py-2 text-sm text-muted">
            Preview: {SHEET_PROSPECTS.map((row) => row.name).join(', ')}
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button size="sm" variant="primary" disabled={!targetLocationId || importing} onClick={importFromSheet}>
              <Upload size={12} />
              {importing ? 'Importing…' : 'Import from sheet'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
