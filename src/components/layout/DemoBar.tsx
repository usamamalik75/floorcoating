import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Moon, Sun } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Avatar, Button, Tooltip } from '@/components/ui'
import { ORG_ROLE_LABEL, ROLE_LABEL, type User } from '@/domain/types'
import { canManageFranchises, displayOrgLabel, franchiseHost, visibleFranchises } from '@/domain/org'
import { useUsers, useViewer } from '@/store/selectors'
import { cn } from '@/lib/cn'

function personaLabel(user: User): string {
  if (user.orgRole) return ORG_ROLE_LABEL[user.orgRole]
  return ROLE_LABEL[user.role]
}

/** Always show admin role groups in the header, even if a group is briefly empty. */
const PERSONA_GROUPS: { label: string; match: (u: User) => boolean }[] = [
  { label: 'Platform Admin', match: (u) => u.orgRole === 'platform_admin' },
  { label: 'Regional Admin', match: (u) => u.orgRole === 'regional_admin' },
  { label: 'Franchise Admin', match: (u) => u.orgRole === 'franchise_admin' },
  { label: 'Manager', match: (u) => u.orgRole === 'manager' },
  { label: 'Team Members', match: (u) => !u.orgRole },
]

/**
 * Admin org bar: franchise/branch scope on the left; signed-in user menu on the right.
 */
export function DemoBar() {
  const viewerId = useStore((s) => s.viewerId)
  const setViewer = useStore((s) => s.setViewer)
  const activeFranchiseId = useStore((s) => s.activeFranchiseId)
  const setActiveFranchiseId = useStore((s) => s.setActiveFranchiseId)
  const locationFilter = useStore((s) => s.locationFilter)
  const setLocationFilter = useStore((s) => s.setLocationFilter)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const locations = useStore((s) => s.locations)
  const franchises = useStore((s) => s.franchises)
  const users = useUsers()
  const viewer = useViewer()

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const switchableFranchises = useMemo(
    () => (viewer ? visibleFranchises(viewer, franchises) : []),
    [viewer, franchises],
  )
  const showFranchiseSwitcher = canManageFranchises(viewer) && switchableFranchises.length > 1

  const branchOptions = useMemo(
    () => locations.filter((l) => l.franchiseId === activeFranchiseId),
    [locations, activeFranchiseId],
  )

  const canFilterAllBranches =
    viewer?.orgRole === 'platform_admin'
    || viewer?.orgRole === 'regional_admin'
    || viewer?.orgRole === 'franchise_admin'
    || viewer?.role === 'admin'

  const personaGroups = useMemo(() => {
    const byName = (a: User, b: User) => a.name.localeCompare(b.name)
    return PERSONA_GROUPS.map((group) => ({
      label: group.label,
      users: users.filter(group.match).sort(byName),
    })).filter((group) => group.users.length > 0)
  }, [users])

  useEffect(() => {
    if (!userMenuOpen) return
    const onPointer = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [userMenuOpen])

  if (!viewer) return null

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-burgundy-800 bg-action px-3 text-action-fg">
      {showFranchiseSwitcher && (
        <label className="flex items-center gap-2">
          <span className="hidden text-2xs font-semibold tracking-[0.14em] text-white/70 uppercase lg:block">
            Franchise
          </span>
          <select
            aria-label="Franchise"
            value={activeFranchiseId}
            onChange={(e) => setActiveFranchiseId(e.target.value)}
            className="h-7 max-w-[14rem] rounded-md border border-white/25 bg-white/15 px-2 text-base text-white"
          >
            {switchableFranchises.map((f) => (
              <option key={f.id} value={f.id} className="text-primary">
                {f.name}
                {f.isPlatformOwner ? ' (Platform)' : f.isMasterRegion ? ' (Master Franchise)' : ` · ${franchiseHost(f.subdomain)}`}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex items-center gap-2">
        <span className="hidden text-2xs font-semibold tracking-[0.14em] text-white/70 uppercase lg:block">
          Branch
        </span>
        <select
          aria-label="Branch"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          disabled={!canFilterAllBranches}
          title={
            canFilterAllBranches
              ? 'Admins can see every branch in this franchise'
              : 'Team members are scoped to their branch'
          }
          className="h-7 rounded-md border border-white/25 bg-white/15 px-2 text-base text-white disabled:opacity-50"
        >
          {canFilterAllBranches && (
            <option value="all" className="text-primary">
              All branches
            </option>
          )}
          {branchOptions.map((l) => (
            <option key={l.id} value={l.id} className="text-primary">
              {l.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex-1" />

      <Tooltip label={theme === 'light' ? 'Dark mode' : 'Light mode'}>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/15 hover:text-white"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
        </Button>
      </Tooltip>

      <div className="relative" ref={userMenuRef}>
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={userMenuOpen}
          aria-label={`Signed in as ${viewer.name}`}
          onClick={() => setUserMenuOpen((open) => !open)}
          className={cn(
            'flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 py-0.5 pr-1.5 pl-0.5',
            'text-white transition-colors hover:bg-white/25',
            userMenuOpen && 'bg-white/25',
          )}
        >
          <Avatar name={viewer.name} size={28} className="ring-1 ring-white/40" />
          <ChevronDown size={14} className={cn('opacity-80 transition-transform', userMenuOpen && 'rotate-180')} />
        </button>

        {userMenuOpen && (
          <div
            role="menu"
            className="absolute top-[calc(100%+0.4rem)] right-0 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-strong bg-surface-raised text-primary shadow-lg"
          >
            <div className="border-b border-subtle bg-surface-inset px-3.5 py-3">
              <div className="flex items-center gap-3">
                <Avatar name={viewer.name} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-primary">{viewer.name}</p>
                  <p className="truncate text-sm text-secondary">{personaLabel(viewer)}</p>
                  <p className="truncate text-2xs text-muted">{displayOrgLabel(viewer)}</p>
                </div>
              </div>
            </div>

            <div className="border-b border-subtle px-3.5 py-2">
              <p className="text-2xs font-semibold tracking-wider text-muted uppercase">
                Current role
              </p>
              <p className="mt-0.5 text-sm text-primary">{personaLabel(viewer)}</p>
              {viewer.title && (
                <p className="text-sm text-muted">{viewer.title}</p>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              <p className="sticky top-0 z-10 bg-surface-raised px-3.5 py-2 text-2xs font-semibold tracking-wider text-muted uppercase">
                Sign in as
              </p>
              {personaGroups.map((group) => (
                <div key={group.label} className="pb-1">
                  <p className="px-3.5 py-1 text-2xs font-medium text-muted">{group.label}</p>
                  <ul>
                    {group.users.map((u) => {
                      const franchiseName = franchises.find((f) => f.id === u.franchiseId)?.name
                      const showFranchise =
                        !!franchiseName
                        && (u.orgRole === 'regional_admin'
                          || u.orgRole === 'franchise_admin'
                          || u.orgRole === 'manager'
                          || !u.orgRole)
                      const active = u.id === viewerId
                      return (
                        <li key={u.id}>
                          <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={active}
                            onClick={() => {
                              setViewer(u.id)
                              setUserMenuOpen(false)
                            }}
                            className={cn(
                              'flex w-full items-center gap-2.5 px-3.5 py-2 text-left hover:bg-surface-inset',
                              active && 'bg-action-soft',
                            )}
                          >
                            <Avatar name={u.name} size={28} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-primary">
                                {u.name}
                              </span>
                              <span className="block truncate text-2xs text-muted">
                                {personaLabel(u)}
                                {showFranchise ? ` · ${franchiseName}` : ''}
                              </span>
                            </span>
                            {active && <Check size={14} className="shrink-0 text-brand" />}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
