import { Moon, RotateCcw, Sun } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { LOCATIONS, USERS } from '@/data/seed'
import { Avatar, Button, SegmentedControl, Tooltip } from '@/components/ui'
import { DemoPath } from './DemoPath'
import { ROLE_LABEL } from '@/domain/types'

/**
 * Not a production control — this is the demo's most valuable affordance.
 * The same seeded dataset viewed as the franchisor, an owner, a rep and a
 * crew leader is what makes the multi-tenant story land in a live meeting.
 */
export function DemoBar() {
  const viewerId = useStore((s) => s.viewerId)
  const setViewer = useStore((s) => s.setViewer)
  const locationFilter = useStore((s) => s.locationFilter)
  const setLocationFilter = useStore((s) => s.setLocationFilter)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const reset = useStore((s) => s.reset)

  const viewer = USERS.find((u) => u.id === viewerId)!
  const isFranchisor = viewer.role === 'franchisor'

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-subtle bg-surface-raised px-3">
      <span className="hidden text-2xs font-semibold tracking-[0.14em] text-muted uppercase lg:block">
        Viewing as
      </span>

      <label className="flex items-center gap-2">
        <Avatar name={viewer.name} size={22} />
        <select
          aria-label="Viewing as"
          value={viewerId}
          onChange={(e) => setViewer(e.target.value)}
          className="h-7 max-w-[15rem] rounded-md border border-strong bg-surface-raised px-2 text-base text-primary"
        >
          {USERS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {ROLE_LABEL[u.role]}
            </option>
          ))}
        </select>
      </label>

      <div className="h-5 w-px bg-(--border-subtle)" />

      <label className="flex items-center gap-2">
        <span className="hidden text-2xs font-semibold tracking-[0.14em] text-muted uppercase lg:block">
          Territory
        </span>
        <select
          aria-label="Territory"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          disabled={!isFranchisor}
          title={
            isFranchisor
              ? 'The franchisor sees every territory'
              : 'Franchise users are scoped to their own territory'
          }
          className="h-7 rounded-md border border-strong bg-surface-raised px-2 text-base text-primary disabled:opacity-50"
        >
          {isFranchisor && <option value="all">All territories</option>}
          {LOCATIONS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex-1" />

      <DemoPath />

      <DensityToggle />

      <Tooltip label={theme === 'light' ? 'Dark mode' : 'Light mode'}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
        </Button>
      </Tooltip>

      <Tooltip label="Reset demo data">
        <Button variant="ghost" size="sm" onClick={reset} aria-label="Reset demo">
          <RotateCcw size={13} />
        </Button>
      </Tooltip>
    </div>
  )
}

function DensityToggle() {
  const density = useStore((s) => s.density)
  const setDensity = useStore((s) => s.setDensity)
  return (
    <SegmentedControl
      value={density}
      onChange={setDensity}
      options={[
        { value: 'comfortable', label: 'Desktop' },
        { value: 'field', label: 'Field' },
      ]}
    />
  )
}
