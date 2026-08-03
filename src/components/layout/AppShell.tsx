import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  Factory,
  FileSpreadsheet,
  FileText,
  HardHat,
  KanbanSquare,
  LayoutDashboard,
  MapPin,
  Palette,
  Receipt,
  Ruler,
  Search,
  Settings2,
  BarChart3,
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

const OFFICE: Role[] = ['franchisor', 'owner', 'sales', 'estimator', 'pm', 'accounting']

/** Modules = types of work. Pipeline stages are not menu items. */
const OPERATIONS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sales', label: 'Sales', icon: KanbanSquare, roles: OFFICE },
  { to: '/site-visits', label: 'Site Visits', icon: MapPin, roles: [...OFFICE, 'crew_leader'] },
  { to: '/estimates', label: 'Estimates', icon: Ruler, roles: ['franchisor', 'owner', 'sales', 'estimator', 'pm'] },
  { to: '/proposals', label: 'Proposals', icon: FileText, roles: ['franchisor', 'owner', 'sales', 'estimator'] },
  { to: '/jobs', label: 'Jobs', icon: ClipboardList, roles: ['franchisor', 'owner', 'pm', 'estimator', 'crew_leader', 'accounting'] },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays, roles: [...OFFICE, 'crew_leader'] },
  { to: '/materials', label: 'Materials', icon: Boxes, roles: [...OFFICE, 'crew_leader'] },
  { to: '/customers', label: 'Customers', icon: Building2, roles: OFFICE },
  { to: '/finance', label: 'Finance', icon: Receipt, roles: ['franchisor', 'owner', 'accounting', 'pm'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['franchisor', 'owner'] },
  { to: '/settings', label: 'Settings', icon: Settings2, roles: ['franchisor', 'owner'] },
  { to: '/field', label: 'Field', icon: HardHat },
  { to: '/prospecting', label: 'Prospecting', icon: Search, roles: ['franchisor', 'owner', 'sales'] },
]

const FRANCHISE: NavItem[] = [
  { to: '/admin', label: 'Network Overview', icon: Settings2, roles: ['franchisor'] },
  { to: '/fms/catalogue', label: 'Product Catalogue', icon: FileSpreadsheet },
  { to: '/fms/orders', label: 'Material Orders', icon: Boxes, roles: [...OFFICE, 'crew_leader'] },
  { to: '/fms/locations', label: 'Locations & Agreements', icon: Factory, roles: ['franchisor'] },
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
      <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto bg-surface-chrome text-white md:flex scrollbar-thin">
        <div className="px-3 py-4">
          <Logo size={40} variant="white" />
        </div>

        <NavGroup title="Operations Platform" items={visible(OPERATIONS)} pathname={pathname} />
        <NavGroup title="Franchise Management" items={visible(FRANCHISE)} pathname={pathname} />

        <div className="mt-auto border-t border-white/10 px-2 py-2">
          <NavGroup items={[{ to: '/styleguide', label: 'Design System', icon: Palette }]} pathname={pathname} />
          <p className="px-2.5 pt-2 text-2xs leading-relaxed text-white/45">
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
    <div className="mb-2">
      {title && (
        <p className="px-4 pt-2 pb-1.5 text-2xs font-semibold tracking-[0.14em] text-white/35 uppercase">
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
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-base font-medium',
                'transition-colors duration-(--duration-fast)',
                active ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/6 hover:text-white/90',
              )}
            >
              <Icon size={15} className="shrink-0" />
              {label}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
