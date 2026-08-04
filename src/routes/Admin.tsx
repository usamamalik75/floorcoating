import { type ReactNode, useMemo, useState } from 'react'
import { Building2, MapPin, Settings2, Users } from 'lucide-react'
import type { Role } from '@/domain/types'
import { ROLE_LABEL } from '@/domain/types'
import { useStore } from '@/store/useStore'
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

type AdminSection = 'team' | 'locations' | 'setup'

/**
 * Admin stays focused on three jobs: people, territories, and company standards.
 * Performance metrics belong on Reports / Dashboard — not here.
 */
export function Admin() {
  const locations = useStore((s) => s.locations)
  const users = useStore((s) => s.users)
  const upsertUser = useStore((s) => s.upsertUser)
  const [section, setSection] = useState<AdminSection>('team')
  const [testZip, setTestZip] = useState('60540')
  const [teamOpen, setTeamOpen] = useState(false)
  const [memberDraft, setMemberDraft] = useState({
    name: '',
    title: 'Sales Representative',
    role: 'sales' as Role,
    locationId: locations[0]?.id ?? '',
  })

  const routed = useMemo(
    () => locations.find((l) => l.zips.some((z) => testZip.startsWith(z))),
    [locations, testZip],
  )

  const platformUsers = users.filter((user) => !user.locationId)

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="w-full space-y-5 px-5 py-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-primary">Admin</h1>
            <p className="mt-0.5 text-base text-muted">
              Manage your team, territories, and company setup.
            </p>
          </div>
          {section === 'team' && (
            <Button size="sm" variant="primary" onClick={() => setTeamOpen(true)}>
              New team member
            </Button>
          )}
        </header>

        <div className="flex flex-wrap gap-1 rounded-lg border border-subtle bg-surface-raised p-1">
          {(
            [
              ['team', 'Team', Users],
              ['locations', 'Locations', MapPin],
              ['setup', 'Setup', Settings2],
            ] as const
          ).map(([id, label, Icon]) => (
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

        {section === 'team' && (
          <div className="space-y-4">
            {platformUsers.length > 0 && (
              <Card>
                <CardHeader title="Platform" subtitle="Users not tied to one territory." />
                <div className="divide-y divide-(--border-subtle)">
                  {platformUsers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="font-medium text-primary">{member.name}</p>
                        <p className="text-sm text-muted">{member.title}</p>
                      </div>
                      <Badge tone="neutral">{ROLE_LABEL[member.role]}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {locations.map((location) => {
                const members = users.filter((member) => member.locationId === location.id)
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
                            <Badge tone="neutral">{ROLE_LABEL[member.role]}</Badge>
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
                subtitle="Enter a ZIP to see which territory receives the lead."
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
                    <Badge tone="warning">No territory match</Badge>
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
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
        title="New team member"
        subtitle="Add someone to a territory roster."
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
            <Field label="Role">
              <Select
                value={memberDraft.role}
                onChange={(e) => setMemberDraft({ ...memberDraft, role: e.target.value as Role })}
              >
                {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Location">
              <Select
                value={memberDraft.locationId}
                onChange={(e) => setMemberDraft({ ...memberDraft, locationId: e.target.value })}
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Title">
            <Input
              value={memberDraft.title}
              onChange={(e) => setMemberDraft({ ...memberDraft, title: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setTeamOpen(false)}>
              Close
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!memberDraft.name.trim()}
              onClick={() => {
                if (!memberDraft.name.trim()) return
                upsertUser({ id: `u_${Date.now().toString(36)}`, ...memberDraft })
                setTeamOpen(false)
                setMemberDraft({
                  name: '',
                  title: 'Sales Representative',
                  role: 'sales',
                  locationId: memberDraft.locationId,
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
