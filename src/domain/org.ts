import type { Franchise, OrgRole, User } from './types'

export function franchiseHost(subdomain: string): string {
  return `${subdomain}.floorcoating.com`
}

export function displayOrgLabel(user: User): string {
  if (!user.orgRole) return 'Team Member'
  if (user.orgRole === 'platform_admin') return 'Platform Admin'
  if (user.orgRole === 'regional_admin') return 'Regional Admin'
  if (user.orgRole === 'franchise_admin') return 'Franchise Admin'
  return 'Manager'
}

export function canManageFranchises(user: User | null | undefined): boolean {
  return !!user && (user.orgRole === 'platform_admin' || user.orgRole === 'regional_admin')
}

export function canManageBranches(user: User | null | undefined): boolean {
  return !!user && (
    user.orgRole === 'platform_admin'
    || user.orgRole === 'regional_admin'
    || user.orgRole === 'franchise_admin'
  )
}

/** Full Admin area (franchises, team, branches, setup). Managers stay in operations. */
export function canAccessAdmin(user: User | null | undefined): boolean {
  if (!user) return false
  return user.orgRole === 'platform_admin'
    || user.orgRole === 'regional_admin'
    || user.orgRole === 'franchise_admin'
}

/** Franchises the viewer may open in the franchise switcher. */
export function visibleFranchises(user: User, franchises: Franchise[]): Franchise[] {
  if (user.orgRole === 'platform_admin') {
    return franchises.filter((f) => f.status === 'active')
  }
  if (user.orgRole === 'regional_admin') {
    return franchises.filter(
      (f) => f.status === 'active' && (f.id === user.franchiseId || f.parentFranchiseId === user.franchiseId),
    )
  }
  return franchises.filter((f) => f.id === user.franchiseId && f.status === 'active')
}

export function branchesForFranchise(
  franchiseId: string,
  locations: { id: string; franchiseId: string }[],
) {
  return locations.filter((l) => l.franchiseId === franchiseId)
}

export function userBranchIds(user: User): string[] {
  if (user.branchIds && user.branchIds.length > 0) return user.branchIds
  if (user.locationId) return [user.locationId]
  return []
}

/** Map ops role → default org access when seeding / migrating. */
export function defaultOrgRoleFromRole(role: string): OrgRole | null {
  if (role === 'admin') return 'platform_admin'
  if (role === 'owner') return 'manager'
  return null
}

/** Normalize persisted / legacy org roles into the four-role model. */
export function normalizeOrgRole(value: string | null | undefined): OrgRole | null {
  if (!value || value === 'member') return null
  if (value === 'branch_admin') return 'manager'
  if (value === 'company_admin' || value === 'partner_admin') return 'franchise_admin'
  if (
    value === 'platform_admin'
    || value === 'regional_admin'
    || value === 'franchise_admin'
    || value === 'manager'
  ) {
    return value
  }
  return null
}
