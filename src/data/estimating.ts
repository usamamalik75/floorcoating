import type { Category, ScopeRequest } from '@/domain/types'
import { CATEGORY_LABEL } from '@/domain/types'

export interface EstimateReminder {
  id: string
  label: string
  helper?: string
}

export interface EstimateCategoryPack {
  category: Category
  label: string
  /** Proposal / estimating form template id from the price book. */
  templateId: string
  depositPct: number
  /** Default floor-system price book id suggested for this category. */
  defaultSystemId: string
  /** Alternate systems the estimator can pick when overriding. */
  alternateSystemIds: string[]
  reminders: EstimateReminder[]
  formHints: string[]
}

export const ESTIMATE_PACKS: Record<Category, EstimateCategoryPack> = {
  residential: {
    category: 'residential',
    label: 'Residential estimating pack',
    templateId: 'pt_residential',
    depositPct: 25,
    defaultSystemId: 'fs_residential_flake',
    alternateSystemIds: ['fs_residential_flake', 'svc_pressure_washing', 'svc_hvac_tuneup'],
    reminders: [
      { id: 'er_r1', label: 'Confirm colour / flake blend with homeowner' },
      { id: 'er_r2', label: 'Verify garage vs interior moisture conditions' },
      { id: 'er_r3', label: 'Include access / parking notes for the crew' },
      { id: 'er_r4', label: 'Price each scope request as its own area' },
      { id: 'er_r5', label: 'Deposit and timeline match the residential proposal template' },
    ],
    formHints: [
      'Use residential proposal terms (21-day validity, 25% deposit default).',
      'Pull quantities from sales-call scope requests — do not re-key from memory.',
      'Floor system suggestion defaults to decorative flake; override from the price book if needed.',
    ],
  },
  commercial: {
    category: 'commercial',
    label: 'Commercial estimating pack',
    templateId: 'pt_standard',
    depositPct: 30,
    defaultSystemId: 'fs_commercial_epoxy',
    alternateSystemIds: ['fs_commercial_epoxy', 'fs_industrial_quartz', 'svc_commercial_cleaning', 'svc_site_protection'],
    reminders: [
      { id: 'er_c1', label: 'Confirm operating hours and occupied-space constraints' },
      { id: 'er_c2', label: 'Include site protection / containment if public areas stay open' },
      { id: 'er_c3', label: 'Match each scope request area to a price-book line' },
      { id: 'er_c4', label: 'Verify decision maker and PO path before sending proposal' },
      { id: 'er_c5', label: 'Carry exclusions from the selected floor system onto the proposal' },
    ],
    formHints: [
      'Use standard commercial proposal template.',
      'Price book is filtered to commercial-eligible catalogue items.',
      'AI suggests a commercial epoxy system from visit conditions — accept or override.',
    ],
  },
  industrial: {
    category: 'industrial',
    label: 'Industrial estimating pack',
    templateId: 'pt_industrial_ns',
    depositPct: 40,
    defaultSystemId: 'fs_industrial_mortar',
    alternateSystemIds: [
      'fs_industrial_mortar',
      'fs_industrial_quartz',
      'svc_commercial_cleaning',
      'svc_access_equipment',
      'svc_site_protection',
      'svc_mobilization',
    ],
    reminders: [
      { id: 'er_i1', label: 'Confirm shutdown / night-work window in the estimate notes' },
      { id: 'er_i2', label: 'Include mobilization / after-hours if outside day shift' },
      { id: 'er_i3', label: 'Detail drains, coves, and equipment that stays in place' },
      { id: 'er_i4', label: 'Apply USDA / washdown-capable system where chemicals are present' },
      { id: 'er_i5', label: 'Separate wash-bay / high-abuse zones onto their own scope lines' },
      { id: 'er_i6', label: 'Resource requirement must flow to purchasing after award' },
    ],
    formHints: [
      'After-hours facility proposal template and 40% deposit are the industrial defaults.',
      'Price book includes industrial floor systems and facility adders.',
      'Suggestion uses visit chemistry / washdown cues to recommend mortar vs quartz.',
    ],
  },
}

export function estimatePackFor(category: Category): EstimateCategoryPack {
  return ESTIMATE_PACKS[category]
}

export interface SystemSuggestion {
  priceBookId: string
  confidence: number
  rationale: string
  source: 'visit' | 'category_default'
}

/**
 * Lightweight “trained” suggestion: category default, nudged by visit scope text.
 * Prototype stand-in for a real model — still accept / override in the UI.
 */
export function suggestFloorSystem(
  category: Category,
  requests: ScopeRequest[] = [],
  visitValues: Record<string, string | number | boolean> = {},
): SystemSuggestion {
  const pack = estimatePackFor(category)
  const blob = [
    ...requests.map((r) => `${r.serviceType} ${r.concernOrOutcome} ${r.areaOrEquipment} ${r.notes ?? ''}`),
    ...Object.values(visitValues).map(String),
  ]
    .join(' ')
    .toLowerCase()

  if (category === 'industrial') {
    if (/wash\s*bay|quartz|abuse|heavy/.test(blob)) {
      return {
        priceBookId: 'fs_industrial_quartz',
        confidence: 0.86,
        rationale:
          'Visit mentions wash-bay / high-abuse conditions. Suggesting industrial quartz broadcast; override if process rooms need mortar instead.',
        source: 'visit',
      }
    }
    if (/usda|washdown|chemical|caustic|thermal|food/.test(blob)) {
      return {
        priceBookId: 'fs_industrial_mortar',
        confidence: 0.91,
        rationale:
          'Industrial visit cues (washdown / chemical / USDA-style conditions) match the trained industrial mortar system.',
        source: 'visit',
      }
    }
  }

  if (category === 'commercial' && /brew|hospitality|retail|public/.test(blob)) {
    return {
      priceBookId: 'fs_commercial_epoxy',
      confidence: 0.84,
      rationale: 'Commercial occupancy cues suggest a high-build epoxy system suitable for open-hours work.',
      source: 'visit',
    }
  }

  if (category === 'residential' && /garage|flake|basement|patio/.test(blob)) {
    return {
      priceBookId: 'fs_residential_flake',
      confidence: 0.88,
      rationale: 'Residential sales-call scope points at a decorative flake system for the measured area(s).',
      source: 'visit',
    }
  }

  return {
    priceBookId: pack.defaultSystemId,
    confidence: 0.72,
    rationale: `Default ${CATEGORY_LABEL[category]} floor system for this opportunity type. Accept to auto-build lines from scope requests, or override and pick manually from the price book.`,
    source: 'category_default',
  }
}
