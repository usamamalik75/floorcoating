import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  Factory,
  FileSpreadsheet,
  HardHat,
  KanbanSquare,
  LayoutDashboard,
  Palette,
  Receipt,
  Search,
  Settings2,
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
  /** Omitted means every role sees it. */
  roles?: Role[]
}

/**
 * Two products, one ecosystem. The brief is explicit that this should read
 * as one platform without becoming one enormous interface, so the shell
 * shares authentication, branding and navigation patterns across both and
 * lets a project hand off to the Franchise Management System mid-flow.
 */
const OFFICE: Role[] = ['franchisor', 'owner', 'sales', 'estimator', 'pm', 'accounting']

const OPERATIONS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: KanbanSquare, roles: OFFICE },
  { to: '/accounts', label: 'Accounts & Prospects', icon: Building2, roles: OFFICE },
  { to: '/prospecting', label: 'Prospecting', icon: Search, roles: ['franchisor', 'owner', 'sales'] },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays, roles: [...OFFICE, 'crew_leader'] },
  { to: '/projects', label: 'Projects', icon: ClipboardList, roles: ['franchisor', 'owner', 'pm', 'estimator', 'crew_leader'] },
  { to: '/accounting', label: 'Accounting', icon: Receipt, roles: ['franchisor', 'owner', 'accounting', 'pm'] },
  { to: '/field', label: 'Field', icon: HardHat },
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
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
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
