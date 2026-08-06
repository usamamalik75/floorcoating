import { type ReactNode, useMemo, useState } from 'react'
import { Building2, MapPin, Network, Settings2, Users } from 'lucide-react'
import type { Franchise, OrgRole, Role } from '@/domain/types'
import { ORG_ROLE_LABEL, ROLE_LABEL } from '@/domain/types'
import { canManageFranchises, canManageBranches, franchiseHost } from '@/domain/org'
import { useStore } from '@/store/useStore'
import { useViewer } from '@/store/selectors'
import { AdminBuilders, LocationsBuilder } from '@/components/domain/AdminBuilders'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  Modal,
  Select,
} from '@/components/ui'
import { cn } from '@/lib/cn'

type AdminSection = 'franchises' | 'team' | 'locations' | 'setup'

/**
 * Admin: franchises (white-label), people, branches, and franchise standards.
 */
export function Admin() {
  const locations = useStore((s) => s.locations)
  const franchises = useStore((s) => s.franchises)
  const users = useStore((s) => s.users)
  const activeFranchiseId = useStore((s) => s.activeFranchiseId)
  const upsertUser = useStore((s) => s.upsertUser)
  const upsertFranchise = useStore((s) => s.upsertFranchise)
  const viewer = useViewer()
  const showFranchises = canManageFranchises(viewer)
  const [section, setSection] = useState<AdminSection>(showFranchises ? 'franchises' : 'team')
  const [testZip, setTestZip] = useState('60540')
  const [teamOpen, setTeamOpen] = useState(false)
  const [franchiseOpen, setFranchiseOpen] = useState(false)
  const [memberDraft, setMemberDraft] = useState({
    name: '',
    title: 'Sales Representative',
    role: 'sales' as Role,
    orgRole: '' as OrgRole | '',
    locationId: locations.find((l) => l.franchiseId === activeFranchiseId)?.id ?? '',
    franchiseId: activeFranchiseId,
  })
  const [franchiseDraft, setFranchiseDraft] = useState({
    name: '',
    subdomain: '',
    isMasterFranchise: false,
    adminName: '',
    adminTitle: 'Franchise Admin',
    adminEmail: '',
  })

  const franchiseBranches = useMemo(
    () => locations.filter((l) => l.franchiseId === activeFranchiseId),
    [locations, activeFranchiseId],
  )

  const routed = useMemo(
    () => franchiseBranches.find((l) => l.zips.some((z) => testZip.startsWith(z))),
    [franchiseBranches, testZip],
  )

  const activeFranchise = franchises.find((f) => f.id === activeFranchiseId)
  const franchiseUsers = users.filter((u) => u.franchiseId === activeFranchiseId)
  const franchiseWideUsers = franchiseUsers.filter((user) => !user.locationId)

  const tabs = (
    [
      ...(showFranchises ? [['franchises', 'Franchises', Network] as const] : []),
      ['team', 'Team', Users] as const,
      ['locations', 'Branches', MapPin] as const,
      ['setup', 'Setup', Settings2] as const,
    ]
  )

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="w-full space-y-5 px-5 py-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-primary">Admin</h1>
            <p className="mt-0.5 text-base text-muted">
              Manage franchises, team, branches, and setup
              {activeFranchise ? ` · ${activeFranchise.name}` : ''}.
            </p>
          </div>
          <div className="flex gap-2">
            {section === 'franchises' && showFranchises && (
              <Button size="sm" variant="primary" onClick={() => setFranchiseOpen(true)}>
                New franchise
              </Button>
            )}
            {section === 'team' && (
              <Button size="sm" variant="primary" onClick={() => setTeamOpen(true)}>
                New team member
              </Button>
            )}
          </div>
        </header>

        <div className="flex flex-wrap gap-1 rounded-lg border border-subtle bg-surface-raised p-1">
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium min-w-[7rem]',
                section === id
                  ? 'bg-action text-action-fg'
                  : 'text-secondary hover:bg-surface-inset hover:text-primary',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {section === 'franchises' && showFranchises && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {franchises
              .filter((f) => {
                if (!viewer) return false
                if (viewer.orgRole === 'platform_admin') return true
                return f.id === viewer.franchiseId || f.parentFranchiseId === viewer.franchiseId
              })
              .map((franchise) => {
                const branchCount = locations.filter((l) => l.franchiseId === franchise.id).length
                const parent = franchises.find((p) => p.id === franchise.parentFranchiseId)
                const admin = users.find(
                  (u) =>
                    u.franchiseId === franchise.id
                    && (u.orgRole === 'franchise_admin' || u.orgRole === 'regional_admin'),
                )
                return (
                  <Card key={franchise.id}>
                    <CardHeader
                      title={franchise.name}
                      subtitle={franchiseHost(franchise.subdomain)}
                      icon={<Building2 size={14} />}
                    />
                    <div className="space-y-2 px-4 pb-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {franchise.isPlatformOwner && <Badge tone="brand">Platform</Badge>}
                        {franchise.isMasterRegion && <Badge tone="info">Master Franchise</Badge>}
                        {franchise.parentFranchiseId && <Badge tone="neutral">Franchise</Badge>}
                        {!franchise.isPlatformOwner && !franchise.isMasterRegion && !franchise.parentFranchiseId && (
                          <Badge tone="neutral">Franchise</Badge>
                        )}
                        <Badge tone={franchise.status === 'active' ? 'success' : 'warning'}>{franchise.status}</Badge>
                      </div>
                      {parent && <p className="text-muted">Region: {parent.name}</p>}
                      {admin && <p className="text-muted">Admin: {admin.name}</p>}
                      <p className="text-muted">{branchCount} branch{branchCount === 1 ? '' : 'es'}</p>
                      {canManageBranches(viewer) && franchise.status === 'active' && (
                        <Button
                          size="sm"
                          variant={activeFranchiseId === franchise.id ? 'primary' : 'secondary'}
                          onClick={() => useStore.getState().setActiveFranchiseId(franchise.id)}
                        >
                          {activeFranchiseId === franchise.id ? 'Active franchise' : 'Open franchise'}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
          </div>
        )}

        {section === 'team' && (
          <div className="space-y-4">
            {franchiseWideUsers.length > 0 && (
              <Card>
                <CardHeader title="Franchise-wide" subtitle="Users not tied to one branch." />
                <div className="divide-y divide-(--border-subtle)">
                  {franchiseWideUsers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="font-medium text-primary">{member.name}</p>
                        <p className="text-sm text-muted">{member.title}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge tone="brand">{member.orgRole ? ORG_ROLE_LABEL[member.orgRole] : 'Team Member'}</Badge>
                        <Badge tone="neutral">{ROLE_LABEL[member.role]}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {franchiseBranches.map((location) => {
                const members = franchiseUsers.filter((member) => member.locationId === location.id)
                return (
                  <Card key={location.id}>
                    <CardHeader
                      title={location.name}
                      subtitle={`${members.length} team member${members.length === 1 ? '' : 's'}`}
                      icon={<Building2 size={14} />}
                    />
                    {members.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-muted">No one assigned yet.</p>
                    ) : (
                      <div className="divide-y divide-(--border-subtle)">
                        {members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-primary">{member.name}</p>
                              <p className="truncate text-sm text-muted">{member.title}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge tone="brand">{member.orgRole ? ORG_ROLE_LABEL[member.orgRole] : 'Team Member'}</Badge>
                              <Badge tone="neutral">{ROLE_LABEL[member.role]}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {section === 'locations' && (
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Test lead routing"
                subtitle="Enter a ZIP to see which branch receives the lead."
              />
              <div className="flex flex-wrap items-end gap-3 p-4">
                <label className="grid gap-1">
                  <span className="text-sm font-medium text-primary">ZIP code</span>
                  <Input
                    value={testZip}
                    onChange={(e) => setTestZip(e.target.value)}
                    className="w-36 font-mono"
                    maxLength={5}
                    placeholder="60540"
                  />
                </label>
                <div className="pb-1">
                  {routed ? (
                    <Badge tone="success" icon={<MapPin size={9} />}>
                      Routes to {routed.name}
                    </Badge>
                  ) : (
                    <Badge tone="warning">No branch match</Badge>
                  )}
                </div>
              </div>
            </Card>

            <LocationsBuilder />
          </div>
        )}

        {section === 'setup' && <AdminBuilders />}
      </div>

      <Modal
        open={franchiseOpen}
        onClose={() => setFranchiseOpen(false)}
        size="lg"
        title="New franchise"
        subtitle={
          viewer?.orgRole === 'regional_admin'
            ? 'Creates a white-label franchise under your region.'
            : 'Create a franchise under Floorcoating (subdomain.floorcoating.com).'
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Franchise name">
              <Input
                value={franchiseDraft.name}
                onChange={(e) => setFranchiseDraft({ ...franchiseDraft, name: e.target.value })}
                placeholder="ABC Coatings"
              />
            </Field>
            <Field label="Subdomain">
              <Input
                value={franchiseDraft.subdomain}
                onChange={(e) => setFranchiseDraft({
                  ...franchiseDraft,
                  subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                })}
                placeholder="abc"
              />
              {franchiseDraft.subdomain ? (
                <p className="text-sm text-muted">{franchiseHost(franchiseDraft.subdomain)}</p>
              ) : null}
            </Field>
          </div>

          {viewer?.orgRole === 'platform_admin' && (
            <label className="flex items-center gap-2 text-sm text-primary">
              <input
                type="checkbox"
                checked={franchiseDraft.isMasterFranchise}
                onChange={(e) => setFranchiseDraft({
                  ...franchiseDraft,
                  isMasterFranchise: e.target.checked,
                  adminTitle: e.target.checked ? 'Regional Admin' : 'Franchise Admin',
                })}
              />
              Is Master Franchise?
            </label>
          )}

          <div className="rounded-lg border border-subtle bg-surface-inset p-3 space-y-3">
            <div>
              <p className="text-sm font-medium text-primary">
                {franchiseDraft.isMasterFranchise ? 'Master franchise admin' : 'Franchise admin'}
              </p>
              <p className="text-sm text-muted">
                {franchiseDraft.isMasterFranchise
                  ? 'They will manage this master franchise and its child franchises.'
                  : 'They will manage this franchise and its branches.'}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Admin name">
                <Input
                  value={franchiseDraft.adminName}
                  onChange={(e) => setFranchiseDraft({ ...franchiseDraft, adminName: e.target.value })}
                  placeholder="Jordan Blake"
                />
              </Field>
              <Field label="Admin title">
                <Input
                  value={franchiseDraft.adminTitle}
                  onChange={(e) => setFranchiseDraft({ ...franchiseDraft, adminTitle: e.target.value })}
                  placeholder={franchiseDraft.isMasterFranchise ? 'Regional Admin' : 'Franchise Admin'}
                />
              </Field>
            </div>
            <Field label="Admin email (optional)">
              <Input
                type="email"
                value={franchiseDraft.adminEmail}
                onChange={(e) => setFranchiseDraft({ ...franchiseDraft, adminEmail: e.target.value })}
                placeholder="admin@abc.floorcoating.com"
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setFranchiseOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              variant="primary"
              disabled={
                !franchiseDraft.name.trim()
                || !franchiseDraft.subdomain.trim()
                || !franchiseDraft.adminName.trim()
              }
              onClick={() => {
                const isMaster = viewer?.orgRole === 'platform_admin' && franchiseDraft.isMasterFranchise
                const created: Franchise = {
                  id: `co_${Date.now().toString(36)}`,
                  name: franchiseDraft.name.trim(),
                  subdomain: franchiseDraft.subdomain.trim(),
                  status: 'active',
                  isPlatformOwner: false,
                  isMasterRegion: isMaster,
                  parentFranchiseId: viewer?.orgRole === 'regional_admin' ? viewer.franchiseId : null,
                }
                upsertFranchise(created)

                const emailNote = franchiseDraft.adminEmail.trim()
                  ? ` · ${franchiseDraft.adminEmail.trim()}`
                  : ''
                upsertUser({
                  id: `u_${Date.now().toString(36)}`,
                  name: franchiseDraft.adminName.trim(),
                  title: `${franchiseDraft.adminTitle.trim() || (isMaster ? 'Regional Admin' : 'Franchise Admin')}${emailNote}`,
                  role: 'pm',
                  orgRole: isMaster ? 'regional_admin' : 'franchise_admin',
                  franchiseId: created.id,
                  locationId: null,
                })

                useStore.getState().setActiveFranchiseId(created.id)
                setFranchiseOpen(false)
                setFranchiseDraft({
                  name: '',
                  subdomain: '',
                  isMasterFranchise: false,
                  adminName: '',
                  adminTitle: 'Franchise Admin',
                  adminEmail: '',
                })
                if (!isMaster) setSection('locations')
              }}
            >
              Create franchise
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
        title="New team member"
        subtitle="Assign org access and an operations role."
      >
        <div className="grid gap-3">
          <Field label="Name">
            <Input
              value={memberDraft.name}
              onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })}
              placeholder="Full name"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Org access">
              <Select
                value={memberDraft.orgRole}
                onChange={(e) => setMemberDraft({ ...memberDraft, orgRole: e.target.value as OrgRole | '' })}
              >
                <option value="">Team Member (ops only)</option>
                {(Object.keys(ORG_ROLE_LABEL) as OrgRole[])
                  .filter((r) => {
                    if (viewer?.orgRole === 'platform_admin') return true
                    if (viewer?.orgRole === 'regional_admin') return r !== 'platform_admin'
                    if (viewer?.orgRole === 'franchise_admin') return r === 'franchise_admin' || r === 'manager'
                    return r === 'manager'
                  })
                  .map((role) => (
                    <option key={role} value={role}>{ORG_ROLE_LABEL[role]}</option>
                  ))}
              </Select>
            </Field>
            <Field label="Operations role">
              <Select
                value={memberDraft.role}
                onChange={(e) => setMemberDraft({ ...memberDraft, role: e.target.value as Role })}
              >
                {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                  <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Branch">
            <Select
              value={memberDraft.locationId}
              onChange={(e) => setMemberDraft({ ...memberDraft, locationId: e.target.value })}
            >
              <option value="">Franchise-wide (no branch)</option>
              {franchiseBranches.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Title">
            <Input
              value={memberDraft.title}
              onChange={(e) => setMemberDraft({ ...memberDraft, title: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setTeamOpen(false)}>Close</Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!memberDraft.name.trim()}
              onClick={() => {
                if (!memberDraft.name.trim()) return
                upsertUser({
                  id: `u_${Date.now().toString(36)}`,
                  name: memberDraft.name.trim(),
                  title: memberDraft.title,
                  role: memberDraft.role,
                  orgRole: memberDraft.orgRole || null,
                  franchiseId: activeFranchiseId,
                  locationId: memberDraft.locationId || null,
                  branchIds: memberDraft.locationId ? [memberDraft.locationId] : undefined,
                })
                setTeamOpen(false)
                setMemberDraft({
                  name: '',
                  title: 'Sales Representative',
                  role: 'sales',
                  orgRole: '',
                  locationId: memberDraft.locationId,
                  franchiseId: activeFranchiseId,
                })
              }}
            >
              Add team member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium text-primary">{label}</span>
      {children}
    </label>
  )
}
