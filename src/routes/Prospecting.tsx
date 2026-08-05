import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, FileSpreadsheet, Upload } from 'lucide-react'
import type { Vertical } from '@/domain/types'
import { useStore } from '@/store/useStore'
import { useViewer } from '@/store/selectors'
import { Badge, Button, Card, CardHeader, EmptyState, FieldRow, Modal, Select, Table, Td, Th, Tr } from '@/components/ui'

/** Static system fields every import must map into. */
type TargetField =
  | 'name'
  | 'vertical'
  | 'contactName'
  | 'contactTitle'
  | 'email'
  | 'phone'
  | 'city'
  | 'state'
  | 'zip'

const TARGET_FIELDS: { key: TargetField; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Company name', required: true },
  { key: 'vertical', label: 'Vertical / industry' },
  { key: 'contactName', label: 'Contact name' },
  { key: 'contactTitle', label: 'Contact title' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP', required: true },
]

const SKIP = ''

type ColumnMapping = Record<TargetField, string>

type ParsedSheet = {
  fileName: string
  headers: string[]
  rows: Record<string, string>[]
}

/** Demo export with deliberately different headers so mapping is visible. */
const SAMPLE_CSV = `Company Name,Industry,Primary Contact,Job Title,Work Email,Mobile,Town,ST,Postal Code
Northline Packaging Co.,Industrial,Elena Marsh,Plant Manager,elena.marsh@northline.example,(312) 555-0142,Chicago,IL,60622
Harborview Foods,Food & Beverage,Marcus Chen,Facilities Director,mchen@harborview.example,(404) 555-0198,Atlanta,GA,30318
Summit Retail Group,Retail,Priya Shah,Operations Lead,priya.shah@summitretail.example,(720) 555-0117,Denver,CO,80202
Clearpath Logistics,Warehouse,Jordan Blake,Site Supervisor,jblake@clearpath.example,(815) 555-0164,Joliet,IL,60431
Lakeside Hospitality,Hospitality,Ava Reynolds,General Manager,ava.reynolds@lakeside.example,(303) 555-0129,Denver,CO,80205
Peachtree Clinics,Institutional,Devon Price,Facilities Coordinator,dprice@peachtree.example,(678) 555-0183,Atlanta,GA,30309`

const VERTICALS: Vertical[] = [
  'Food & Beverage',
  'Industrial',
  'Hospitality',
  'Retail',
  'Aerospace',
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

const GUESS_ALIASES: Record<TargetField, string[]> = {
  name: ['company name', 'company', 'business name', 'account', 'organization', 'org', 'name'],
  vertical: ['vertical', 'industry', 'sector', 'market', 'category'],
  contactName: ['primary contact', 'contact name', 'contact', 'full name', 'person', 'owner'],
  contactTitle: ['job title', 'contact title', 'title', 'role', 'position'],
  email: ['work email', 'email', 'e-mail', 'email address'],
  phone: ['mobile', 'phone', 'telephone', 'phone number', 'cell'],
  city: ['city', 'town', 'municipality'],
  state: ['state', 'st', 'province', 'region'],
  zip: ['postal code', 'zip', 'zip code', 'zipcode', 'postcode'],
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim()).filter(Boolean)
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header] = (cells[i] ?? '').trim()
    })
    return row
  })

  return { headers, rows }
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }
    current += char
  }
  cells.push(current)
  return cells
}

function guessMapping(headers: string[]): ColumnMapping {
  const used = new Set<string>()
  const mapping = {} as ColumnMapping

  for (const field of TARGET_FIELDS) {
    const aliases = GUESS_ALIASES[field.key]
    const match = headers.find((header) => {
      if (used.has(header)) return false
      const normalized = header.toLowerCase().trim()
      return aliases.some((alias) => normalized === alias || normalized.includes(alias))
    })
    mapping[field.key] = match ?? SKIP
    if (match) used.add(match)
  }

  return mapping
}

function normalizeVertical(value: string): Vertical {
  const trimmed = value.trim()
  const exact = VERTICALS.find((v) => v.toLowerCase() === trimmed.toLowerCase())
  if (exact) return exact
  const partial = VERTICALS.find((v) => trimmed.toLowerCase().includes(v.toLowerCase()))
  return partial ?? 'Commercial'
}

function routeLocationId(
  zip: string,
  locations: { id: string; zips: string[] }[],
  fallbackId: string,
) {
  const prefix = zip.slice(0, 3)
  return locations.find((location) => location.zips.includes(prefix))?.id ?? fallbackId
}

function emptyMapping(): ColumnMapping {
  return {
    name: SKIP,
    vertical: SKIP,
    contactName: SKIP,
    contactTitle: SKIP,
    email: SKIP,
    phone: SKIP,
    city: SKIP,
    state: SKIP,
    zip: SKIP,
  }
}

export function Prospecting() {
  const navigate = useNavigate()
  const viewer = useViewer()
  const locations = useStore((s) => s.locations)
  const accounts = useStore((s) => s.accounts)
  const locationFilter = useStore((s) => s.locationFilter)
  const upsertAccount = useStore((s) => s.upsertAccount)
  const createOpportunity = useStore((s) => s.createOpportunity)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState<'upload' | 'map'>('upload')
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping)
  const [parseError, setParseError] = useState<string | null>(null)
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

  const previewRows = useMemo(() => {
    if (!sheet) return []
    return sheet.rows.slice(0, 3).map((row) => {
      const mapped: Partial<Record<TargetField, string>> = {}
      for (const field of TARGET_FIELDS) {
        const source = mapping[field.key]
        mapped[field.key] = source ? row[source] ?? '' : ''
      }
      return mapped
    })
  }, [sheet, mapping])

  const canImport =
    Boolean(targetLocationId) &&
    Boolean(sheet?.rows.length) &&
    Boolean(mapping.name) &&
    Boolean(mapping.zip)

  const resetImport = () => {
    setStep('upload')
    setSheet(null)
    setMapping(emptyMapping())
    setParseError(null)
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const closeModal = () => {
    setOpen(false)
    resetImport()
  }

  const loadParsed = (fileName: string, text: string) => {
    const { headers, rows } = parseCsv(text)
    if (headers.length === 0) {
      setParseError('No columns found in that file. Upload a CSV with a header row.')
      return
    }
    if (rows.length === 0) {
      setParseError('The sheet has headers but no data rows.')
      return
    }
    setParseError(null)
    setSheet({ fileName, headers, rows })
    setMapping(guessMapping(headers))
    setStep('map')
  }

  const onFileSelected = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await file.text()
      loadParsed(file.name, text)
    } catch {
      setParseError('Could not read that file. Try a CSV export from your spreadsheet.')
    }
  }

  const loadSampleSheet = () => {
    loadParsed('sample-prospects.csv', SAMPLE_CSV)
  }

  const importMapped = () => {
    if (!sheet || !canImport) return
    setImporting(true)
    const batchId = `sheet_${Date.now().toString(36)}`
    const stamp = new Date().toISOString()

    sheet.rows.forEach((row, index) => {
      const value = (field: TargetField) => {
        const source = mapping[field]
        return source ? (row[source] ?? '').trim() : ''
      }

      const name = value('name')
      if (!name) return

      const zip = value('zip')
      const locationId = routeLocationId(zip, locations, targetLocationId)

      upsertAccount({
        id: `prospect_${batchId}_${index}`,
        name,
        vertical: normalizeVertical(value('vertical') || 'Commercial'),
        locationId,
        contactName: value('contactName'),
        contactTitle: value('contactTitle'),
        email: value('email'),
        phone: value('phone'),
        city: value('city'),
        state: value('state'),
        zip,
        isNational: false,
        source: 'External provider',
        createdAt: stamp,
        anchorStage: 'prospect',
        importBatchId: batchId,
        lastActivityAt: stamp,
      })
    })

    setImporting(false)
    closeModal()
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
          <Button
            variant="primary"
            onClick={() => {
              resetImport()
              setOpen(true)
            }}
          >
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
              description="Click Import prospects to upload a sample sheet, map columns, and import companies."
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
        onClose={closeModal}
        size="lg"
        title="Import prospects"
        subtitle={
          step === 'upload'
            ? 'Upload a sample sheet. No sheet link or reference needed.'
            : 'Match each sheet column to a system field, then choose a default location.'
        }
        footer={
          step === 'map' ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setStep('upload')}>
                <ArrowLeft size={12} />
                Back
              </Button>
              <Button size="sm" variant="ghost" onClick={closeModal}>
                Close
              </Button>
              <Button size="sm" variant="primary" disabled={!canImport || importing} onClick={importMapped}>
                <Upload size={12} />
                {importing ? 'Importing…' : `Import ${sheet?.rows.length ?? 0} prospects`}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={closeModal}>
              Close
            </Button>
          )
        }
      >
        {step === 'upload' ? (
          <div className="grid gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void onFileSelected(e.target.files?.[0])}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-strong bg-surface-inset px-4 py-8 text-center transition-colors hover:border-(--color-steel-400) hover:bg-surface-raised"
            >
              <FileSpreadsheet size={28} className="text-muted" />
              <p className="text-base font-medium text-primary">Upload sample sheet</p>
              <p className="max-w-sm text-sm text-muted">
                Drop in a CSV export. Column names can differ — you will map them to our fixed prospect fields next.
              </p>
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted">Or try the built-in sample with mismatched headers.</p>
              <Button size="sm" onClick={loadSampleSheet}>
                <FileSpreadsheet size={12} />
                Use sample sheet
              </Button>
            </div>

            {parseError && <p className="text-sm text-danger-text">{parseError}</p>}
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex items-start gap-3 rounded-md border border-subtle bg-surface-inset px-3 py-3">
              <FileSpreadsheet size={18} className="mt-0.5 shrink-0 text-muted" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">{sheet?.fileName}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {sheet?.rows.length} rows · {sheet?.headers.length} columns detected. System fields stay fixed;
                  change the dropdowns if a guess is wrong.
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-secondary uppercase">Column mapping</p>
              <div className="overflow-hidden rounded-md border border-subtle">
                <Table>
                  <thead>
                    <Tr>
                      <Th>System field</Th>
                      <Th>Sheet column</Th>
                      <Th>Sample value</Th>
                    </Tr>
                  </thead>
                  <tbody>
                    {TARGET_FIELDS.map((field) => {
                      const source = mapping[field.key]
                      const sample = source && sheet?.rows[0] ? sheet.rows[0][source] : '—'
                      return (
                        <Tr key={field.key}>
                          <Td>
                            <span className="font-medium text-primary">{field.label}</span>
                            {field.required && <span className="ml-1 text-danger">*</span>}
                          </Td>
                          <Td>
                            <Select
                              value={source}
                              onChange={(e) =>
                                setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                              }
                            >
                              <option value={SKIP}>— Skip —</option>
                              {sheet?.headers.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </Select>
                          </Td>
                          <Td>
                            <span className="text-sm text-muted">{sample || '—'}</span>
                          </Td>
                        </Tr>
                      )
                    })}
                  </tbody>
                </Table>
              </div>
            </div>

            <FieldRow label="Default location" hint="Used when a row’s ZIP does not match a territory.">
              <Select value={targetLocationId} onChange={(e) => setTargetLocationId(e.target.value)}>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            </FieldRow>

            {previewRows.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-secondary uppercase">
                  Mapping overview
                </p>
                <div className="overflow-x-auto rounded-md border border-subtle">
                  <Table>
                    <thead>
                      <Tr>
                        {TARGET_FIELDS.filter((f) => mapping[f.key]).map((field) => (
                          <Th key={field.key}>{field.label}</Th>
                        ))}
                      </Tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, index) => (
                        <Tr key={index}>
                          {TARGET_FIELDS.filter((f) => mapping[f.key]).map((field) => (
                            <Td key={field.key}>
                              <span className="text-sm text-primary">{row[field.key] || '—'}</span>
                            </Td>
                          ))}
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <p className="mt-1 text-sm text-muted">Showing first {previewRows.length} mapped rows.</p>
              </div>
            )}

            {(!mapping.name || !mapping.zip) && (
              <p className="text-sm text-danger-text">
                Map at least Company name and ZIP before importing.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
