import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
  Palette,
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
import type { Role } from '@/domain/types'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles?: Role[]
}

const OFFICE: Role[] = ['admin', 'owner', 'sales', 'estimator', 'pm', 'accounting']

/** Core journey — top of the left menu, in process order. */
const PRIMARY: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/prospecting', label: 'Prospecting', icon: Search, roles: ['admin', 'owner', 'sales'] },
  { to: '/sales', label: 'Sales', icon: KanbanSquare, roles: OFFICE },
  { to: '/site-visits', label: 'Visits & Calls', icon: MapPin, roles: [...OFFICE, 'crew_leader'] },
  { to: '/estimates', label: 'Estimates', icon: Ruler, roles: ['admin', 'owner', 'sales', 'estimator', 'pm'] },
  { to: '/proposals', label: 'Proposals', icon: FileText, roles: ['admin', 'owner', 'sales', 'estimator'] },
  { to: '/jobs', label: 'Jobs', icon: ClipboardList, roles: ['admin', 'owner', 'pm', 'estimator', 'crew_leader', 'accounting'] },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays, roles: [...OFFICE, 'crew_leader'] },
  { to: '/purchasing', label: 'Purchasing', icon: ShoppingCart, roles: ['admin', 'owner', 'pm', 'accounting'] },
  { to: '/catalog', label: 'Products & Services', icon: BookOpen, roles: OFFICE },
  { to: '/customers', label: 'Customers', icon: Building2, roles: OFFICE },
]

/** Supporting modules — shown below the core journey. */
const SECONDARY: NavItem[] = [
  { to: '/field', label: 'Field execution', icon: HardHat },
  { to: '/communications', label: 'Communications', icon: MessagesSquare, roles: OFFICE },
  { to: '/finance', label: 'Finance', icon: Receipt, roles: ['admin', 'owner', 'accounting', 'pm'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'owner'] },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, roles: ['admin', 'owner'] },
  { to: '/settings', label: 'Settings', icon: Settings2, roles: ['admin', 'owner'] },
]

export function AppShell() {
  const theme = useStore((s) => s.theme)
  const density = useStore((s) => s.density)
  const viewer = useViewer()
  const { pathname } = useLocation()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.dataset.density = density
  }, [theme, density])

  const visible = (items: NavItem[]) =>
    items.filter((i) => !i.roles || (viewer && i.roles.includes(viewer.role)))

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-subtle bg-white text-primary md:flex scrollbar-thin z-10">
        <div className="border-b border-subtle px-3 py-4">
          <Logo size={52} variant="red" />
        </div>

        <div className="flex flex-1 flex-col py-3">
          <NavGroup items={visible(PRIMARY)} pathname={pathname} />
          <NavGroup title="More" items={visible(SECONDARY)} pathname={pathname} />
        </div>

        <div className="mt-auto border-t border-subtle px-2 py-2">
          <NavGroup items={[{ to: '/styleguide', label: 'Design System', icon: Palette }]} pathname={pathname} />
          <p className="px-2.5 pt-2 text-2xs leading-relaxed text-muted">
            Prototype · mock data
            <br />
            Not connected to production systems
          </p>
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
