import type { Role, User } from './types'
import { canAccessAdmin } from './org'

/**
 * Navigation access by org + ops role.
 *
 * Org admins (platform / regional / franchise) share the same *modules*.
 * What differs is data scope (franchise switcher / branch filter), not the menu.
 * They need ops pages to oversee a franchise after switching into it —
 * Admin-only menus made the switcher useless.
 *
 * Field execution stays crew-only (crew leader / installer).
 */

export type NavKey =
  | 'dashboard'
  | 'admin'
  | 'settings'
  | 'reports'
  | 'prospecting'
  | 'sales'
  | 'site_visits'
  | 'estimates'
  | 'proposals'
  | 'jobs'
  | 'schedule'
  | 'purchasing'
  | 'catalog'
  | 'customers'
  | 'field'
  | 'communications'
  | 'finance'

const PATH_TO_KEY: Record<string, NavKey> = {
  '/': 'dashboard',
  '/admin': 'admin',
  '/settings': 'settings',
  '/reports': 'reports',
  '/prospecting': 'prospecting',
  '/sales': 'sales',
  '/site-visits': 'site_visits',
  '/estimates': 'estimates',
  '/proposals': 'proposals',
  '/jobs': 'jobs',
  '/schedule': 'schedule',
  '/purchasing': 'purchasing',
  '/catalog': 'catalog',
  '/customers': 'customers',
  '/field': 'field',
  '/communications': 'communications',
  '/finance': 'finance',
  '/intake': 'prospecting',
}

/** Full office suite used by franchise leadership and org admins. */
const OFFICE_SUITE: NavKey[] = [
  'dashboard',
  'prospecting',
  'sales',
  'site_visits',
  'estimates',
  'proposals',
  'jobs',
  'schedule',
  'purchasing',
  'catalog',
  'customers',
  'communications',
  'finance',
  'reports',
]

/**
 * Platform / Regional / Franchise Admin
 * — org tools + full office oversight (no crew Field app).
 */
const ORG_ADMIN_PAGES: NavKey[] = ['admin', 'settings', ...OFFICE_SUITE]

/**
 * Branch Manager — run one branch day-to-day.
 * No franchise Admin / Settings (those stay franchise+).
 */
const MANAGER_PAGES: NavKey[] = [...OFFICE_SUITE]

/** Ops specialists — only modules for their job. */
const OPS_PAGES: Record<Role, NavKey[]> = {
  sales: [
    'dashboard',
    'prospecting',
    'sales',
    'site_visits',
    'estimates',
    'proposals',
    'jobs', // follow won work after award
    'catalog', // pricing reference while selling
    'customers',
    'communications',
    'schedule',
  ],
  estimator: [
    'dashboard',
    'sales', // pipeline context for estimates
    'site_visits',
    'estimates',
    'proposals',
    'jobs',
    'schedule', // visit / measure scheduling
    'catalog',
    'customers',
    'communications',
  ],
  pm: [
    'dashboard',
    'sales',
    'site_visits',
    'estimates',
    'proposals', // signed scope / contract reference
    'jobs',
    'schedule',
    'purchasing',
    'catalog',
    'customers',
    'communications',
    'finance',
    'reports',
  ],
  crew_leader: [
    'dashboard',
    'field',
    'jobs',
    'schedule',
    'site_visits',
    'communications',
    'customers', // job site / contact lookup
  ],
  installer: [
    'field',
    'jobs',
    'schedule',
    'communications',
  ],
  accounting: [
    'dashboard',
    'jobs',
    'finance',
    'customers',
    'purchasing',
    'catalog', // price book / invoice lines
    'communications',
    'reports',
    'proposals', // deposit / signed contract amounts
  ],
}

export function navKeysForUser(user: User | null | undefined): Set<NavKey> {
  if (!user) return new Set()

  // Org elevation wins over ops role
  if (
    user.orgRole === 'platform_admin'
    || user.orgRole === 'regional_admin'
    || user.orgRole === 'franchise_admin'
  ) {
    return new Set(ORG_ADMIN_PAGES)
  }
  if (user.orgRole === 'manager') {
    return new Set(MANAGER_PAGES)
  }

  return new Set(OPS_PAGES[user.role] ?? ['dashboard'])
}

export function canAccessNavKey(user: User | null | undefined, key: NavKey): boolean {
  return navKeysForUser(user).has(key)
}

export function navKeyForPath(pathname: string): NavKey | null {
  if (PATH_TO_KEY[pathname]) return PATH_TO_KEY[pathname]
  const match = Object.keys(PATH_TO_KEY)
    .filter((p) => p !== '/' && pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0]
  return match ? PATH_TO_KEY[match] : null
}

export function canAccessPath(user: User | null | undefined, pathname: string): boolean {
  if (!user) return false

  if (pathname.startsWith('/opportunities/') && pathname.endsWith('/visit')) {
    return canAccessNavKey(user, 'site_visits')
  }

  if (pathname.startsWith('/opportunities/')) {
    return canAccessNavKey(user, 'sales')
      || canAccessNavKey(user, 'jobs')
      || canAccessNavKey(user, 'estimates')
      || canAccessNavKey(user, 'site_visits')
      || canAccessNavKey(user, 'proposals')
      || canAccessNavKey(user, 'customers')
  }
  if (pathname.startsWith('/estimate/')) return canAccessNavKey(user, 'estimates')
  if (pathname.startsWith('/field/')) return canAccessNavKey(user, 'field')
  // Material ordering — purchasing owners only (not everyone with Jobs)
  if (pathname.includes('/procurement')) {
    return canAccessNavKey(user, 'purchasing')
  }

  const key = navKeyForPath(pathname)
  if (!key) return true
  return canAccessNavKey(user, key)
}

export function homePathForUser(user: User | null | undefined): string {
  if (!user) return '/'
  if (canAccessAdmin(user)) return '/admin'
  if (user.orgRole === 'manager') return '/'
  if (canAccessNavKey(user, 'field') && (user.role === 'installer' || user.role === 'crew_leader')) return '/field'
  if (canAccessNavKey(user, 'finance') && user.role === 'accounting') return '/finance'
  if (canAccessNavKey(user, 'estimates') && user.role === 'estimator') return '/estimates'
  if (canAccessNavKey(user, 'jobs') && user.role === 'pm') return '/jobs'
  if (canAccessNavKey(user, 'sales') && user.role === 'sales') return '/sales'
  if (canAccessNavKey(user, 'dashboard')) return '/'

  const reverse: Partial<Record<NavKey, string>> = {
    dashboard: '/',
    admin: '/admin',
    settings: '/settings',
    reports: '/reports',
    prospecting: '/prospecting',
    sales: '/sales',
    site_visits: '/site-visits',
    estimates: '/estimates',
    proposals: '/proposals',
    jobs: '/jobs',
    schedule: '/schedule',
    purchasing: '/purchasing',
    catalog: '/catalog',
    customers: '/customers',
    field: '/field',
    communications: '/communications',
    finance: '/finance',
  }
  const first = [...navKeysForUser(user)][0]
  return (first && reverse[first]) || '/'
}
