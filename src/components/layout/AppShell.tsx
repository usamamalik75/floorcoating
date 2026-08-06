import { useEffect } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  HardHat,
  KanbanSquare,
  LayoutDashboard,
  MapPin,
  Receipt,
  Ruler,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  BarChart3,
  MessagesSquare,
  Search,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useStore } from '@/store/useStore'
import { useViewer } from '@/store/selectors'
import { DemoBar } from './DemoBar'
import { Logo } from './Logo'
import { canAccessAdmin } from '@/domain/org'
import { canAccessNavKey, canAccessPath, homePathForUser, type NavKey } from '@/domain/navAccess'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  key: NavKey
}

const ADMIN: NavItem[] = [
  { to: '/admin', label: 'Admin', icon: ShieldCheck, key: 'admin' },
  { to: '/settings', label: 'Settings', icon: Settings2, key: 'settings' },
]

const PRIMARY: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/prospecting', label: 'Prospecting', icon: Search, key: 'prospecting' },
  { to: '/sales', label: 'Sales', icon: KanbanSquare, key: 'sales' },
  { to: '/site-visits', label: 'Visits & Calls', icon: MapPin, key: 'site_visits' },
  { to: '/estimates', label: 'Estimates', icon: Ruler, key: 'estimates' },
  { to: '/proposals', label: 'Proposals', icon: FileText, key: 'proposals' },
  { to: '/jobs', label: 'Jobs', icon: ClipboardList, key: 'jobs' },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays, key: 'schedule' },
  { to: '/purchasing', label: 'Purchasing', icon: ShoppingCart, key: 'purchasing' },
  { to: '/catalog', label: 'Products & Services', icon: BookOpen, key: 'catalog' },
  { to: '/customers', label: 'Customers', icon: Building2, key: 'customers' },
]

const SECONDARY: NavItem[] = [
  { to: '/field', label: 'Field execution', icon: HardHat, key: 'field' },
  { to: '/communications', label: 'Communications', icon: MessagesSquare, key: 'communications' },
  { to: '/finance', label: 'Finance', icon: Receipt, key: 'finance' },
  { to: '/reports', label: 'Reports', icon: BarChart3, key: 'reports' },
]

export function AppShell() {
  const theme = useStore((s) => s.theme)
  const viewer = useViewer()
  const { pathname } = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.dataset.density = 'comfortable'
  }, [theme])

  const visible = (items: NavItem[]) =>
    items.filter((i) => canAccessNavKey(viewer, i.key))

  const showAdminNav = canAccessAdmin(viewer)
  const primary = visible(PRIMARY)
  const secondary = visible(SECONDARY)
  const adminItems = visible(ADMIN)

  if (viewer && !canAccessPath(viewer, pathname)) {
    return <Navigate to={homePathForUser(viewer)} replace />
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-subtle bg-white text-primary md:flex scrollbar-thin z-10">
        <div className="border-b border-subtle px-3 py-4">
          <Logo size={52} variant="red" />
        </div>

        <div className="flex flex-1 flex-col py-3">
          {showAdminNav && adminItems.length > 0 && (
            <NavGroup title="Administration" items={adminItems} pathname={pathname} />
          )}
          <NavGroup
            title={showAdminNav ? 'Operations' : undefined}
            items={primary}
            pathname={pathname}
          />
          <NavGroup title="More" items={secondary} pathname={pathname} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DemoBar />
        <main className="min-h-0 flex-1 overflow-hidden bg-surface-sunken">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function NavGroup({
  title,
  items,
  pathname,
}: {
  title?: string
  items: NavItem[]
  pathname: string
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-3">
      {title && (
        <p className="px-4 pt-1 pb-1.5 text-xs font-semibold tracking-widest text-muted uppercase">
          {title}
        </p>
      )}
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(to + '/')
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                'transition-colors duration-(--duration-fast)',
                active
                  ? 'bg-action text-action-fg shadow-sm'
                  : 'text-secondary hover:bg-burgundy-50 hover:text-burgundy-700',
              )}
            >
              <Icon
                size={16}
                className={cn(
                  'shrink-0',
                  active ? 'text-action-fg' : 'text-muted',
                )}
              />
              {label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
