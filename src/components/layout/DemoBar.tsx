import { Moon, RotateCcw, Sun } from 'lucide-react'
import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { Avatar, Button, Tooltip } from '@/components/ui'
import { ORG_ROLE_LABEL, ROLE_LABEL } from '@/domain/types'
import { canManageFranchises, displayOrgLabel, franchiseHost, visibleFranchises } from '@/domain/org'
import { useUsers, useViewer } from '@/store/selectors'

/**
 * Admin org bar: persona, franchise switcher, and branch scope.
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
  const reset = useStore((s) => s.reset)
  const locations = useStore((s) => s.locations)
  const franchises = useStore((s) => s.franchises)
  const users = useUsers()
  const viewer = useViewer()

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

  const adminUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const rank = (u: typeof a) => {
          if (u.orgRole === 'platform_admin') return 0
          if (u.orgRole === 'regional_admin') return 1
          if (u.orgRole === 'franchise_admin') return 2
          if (u.orgRole === 'manager') return 3
          return 4
        }
        return rank(a) - rank(b) || a.name.localeCompare(b.name)
      }),
    [users],
  )

  if (!viewer) return null

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-burgundy-800 bg-action px-3 text-action-fg">
      <span className="hidden text-2xs font-semibold tracking-[0.14em] text-white/70 uppercase lg:block">
        Signed in as
      </span>

      <label className="flex items-center gap-2">
        <Avatar name={viewer.name} size={22} />
        <select
          aria-label="Signed in as"
          value={viewerId}
          onChange={(e) => setViewer(e.target.value)}
          className="h-7 max-w-[16rem] rounded-md border border-white/25 bg-white/15 px-2 text-base text-white"
        >
          {adminUsers.map((u) => (
            <option key={u.id} value={u.id} className="text-primary">
              {u.name} — {u.orgRole ? ORG_ROLE_LABEL[u.orgRole] : ROLE_LABEL[u.role]}
            </option>
          ))}
        </select>
      </label>

      <span className="hidden rounded-md bg-white/15 px-2 py-0.5 text-2xs font-medium text-white/90 lg:inline">
        {displayOrgLabel(viewer)}
      </span>

      {showFranchiseSwitcher && (
        <>
          <div className="h-5 w-px bg-white/25" />
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
        </>
      )}

      <div className="h-5 w-px bg-white/25" />

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

      <Tooltip label="Reset data">
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/15 hover:text-white"
          onClick={reset}
          aria-label="Reset data"
        >
          <RotateCcw size={13} />
        </Button>
      </Tooltip>
    </div>
  )
}
