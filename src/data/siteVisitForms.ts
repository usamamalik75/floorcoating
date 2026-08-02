import type { SiteVisitForm } from '@/domain/types'

/* ==========================================================================
   Guided site visit forms
   ==========================================================================
   Generated when the visit is SCHEDULED, so the correct form is already
   waiting on the rep's phone when they arrive. Fields marked `feedsEstimate`
   flow straight into the estimate builder — which is the whole point. There
   is no paper checklist that someone later has to interpret and re-key.
   ========================================================================== */

export const SITE_VISIT_FORMS: SiteVisitForm[] = [
  /* ---------------------------- RESIDENTIAL ---------------------------- */
  {
    id: 'svf_residential',
    name: 'Residential Sales Call Form',
    category: 'residential',
    sections: [
      {
        id: 's1',
        title: 'Dimensions',
        fields: [
          { id: 'bays', label: 'Number of bays', type: 'select', options: ['1', '2', '3', '4+'], required: true },
          { id: 'length', label: 'Length', type: 'number', unit: 'ft', required: true },
          { id: 'width', label: 'Width', type: 'number', unit: 'ft', required: true },
          { id: 'sqft', label: 'Total area', type: 'number', unit: 'sq ft', required: true, feedsEstimate: true },
        ],
      },
      {
        id: 's2',
        title: 'Existing floor condition',
        fields: [
          {
            id: 'condition',
            label: 'Slab condition',
            type: 'select',
            options: ['Good — minor wear', 'Fair — cracking present', 'Poor — spalling or pitting'],
            required: true,
            feedsEstimate: true,
          },
          { id: 'existing_coating', label: 'Existing sealer or coating present', type: 'boolean', required: true, feedsEstimate: true, helper: 'Removal is priced separately.' },
          { id: 'cracks', label: 'Crack repair required', type: 'boolean', required: true, feedsEstimate: true },
          { id: 'oil', label: 'Oil or contamination staining', type: 'boolean', required: true },
        ],
      },
      {
        id: 's3',
        title: 'Moisture',
        fields: [
          { id: 'slab_on_grade', label: 'Slab on grade', type: 'boolean', required: true },
          { id: 'moisture_test', label: 'Moisture test performed', type: 'boolean', required: true },
          { id: 'rh', label: 'Relative humidity reading', type: 'number', unit: '%', required: false, feedsEstimate: true, helper: 'Above 85% requires a moisture mitigation system.' },
        ],
      },
      {
        id: 's4',
        title: 'Finish selection',
        fields: [
          { id: 'finish', label: 'Desired finish', type: 'select', options: ['Full flake broadcast', 'Partial flake', 'Solid colour', 'Metallic'], required: true, feedsEstimate: true },
          { id: 'colour', label: 'Colour blend preference', type: 'select', options: ['Domino', 'Tuxedo', 'Cabin Fever', 'Coyote', 'Sandstone', 'Custom'], required: true },
          { id: 'gloss', label: 'Gloss level', type: 'select', options: ['Satin', 'Semi-gloss', 'High gloss'], required: false },
        ],
      },
      {
        id: 's5',
        title: 'Access and expectations',
        fields: [
          { id: 'access', label: 'Access constraints', type: 'longtext', required: false, helper: 'Gate codes, low clearance, driveway slope, pets.' },
          { id: 'vehicles_cleared', label: 'Customer will clear vehicles and stored items', type: 'boolean', required: true },
          { id: 'power', label: 'Power available on site', type: 'boolean', required: true },
          { id: 'expectations', label: 'Customer expectations', type: 'longtext', required: true, helper: 'Cure time, return to service, odour, what they have been told by competitors.' },
        ],
      },
    ],
  },

  /* ------------------------ COMMERCIAL / INDUSTRIAL -------------------- */
  {
    id: 'svf_industrial',
    name: 'Industrial Site Visit Form',
    category: 'industrial',
    sections: [
      {
        id: 'i1',
        title: 'Facility and area',
        fields: [
          { id: 'facility_type', label: 'Facility type', type: 'select', options: ['Food processing', 'Beverage / bottling', 'Cold storage', 'Manufacturing', 'Warehouse', 'Aerospace', 'Pharmaceutical'], required: true },
          { id: 'area_name', label: 'Area to be coated', type: 'text', required: true, helper: 'e.g. Plant 2 process floor, Bottling hall, Freezer Bay 3.' },
          { id: 'sqft', label: 'Floor area', type: 'number', unit: 'sq ft', required: true, feedsEstimate: true },
          { id: 'cove_lf', label: 'Linear feet of cove', type: 'number', unit: 'lin ft', required: true, feedsEstimate: true },
          { id: 'cove_height', label: 'Cove height', type: 'select', options: ['4 inch', '6 inch', 'None'], required: true, feedsEstimate: true },
          { id: 'drains', label: 'Number of drains and trenches', type: 'number', unit: 'ea', required: true, feedsEstimate: true },
        ],
      },
      {
        id: 'i2',
        title: 'Existing substrate',
        fields: [
          { id: 'substrate', label: 'Existing substrate', type: 'select', options: ['Bare concrete', 'Quarry tile', 'Existing epoxy', 'Existing urethane', 'Sealed concrete'], required: true, feedsEstimate: true },
          { id: 'removal', label: 'Removal required', type: 'boolean', required: true, feedsEstimate: true, helper: 'Tile and thinset removal is a separate prep line.' },
          { id: 'slab_condition', label: 'Slab condition', type: 'select', options: ['Sound', 'Minor spalling', 'Significant repair required'], required: true, feedsEstimate: true },
          { id: 'flatness', label: 'Slope and drainage adequate', type: 'boolean', required: true, helper: 'Re-pitching to drains is a change in scope.' },
        ],
      },
      {
        id: 'i3',
        title: 'Service conditions',
        fields: [
          { id: 'chemical', label: 'Chemical exposure', type: 'longtext', required: true, feedsEstimate: true, helper: 'Caustics, acids, sanitisers, solvents, fats and oils.' },
          { id: 'temp_min', label: 'Minimum service temperature', type: 'number', unit: '°F', required: true, feedsEstimate: true },
          { id: 'temp_max', label: 'Maximum service temperature', type: 'number', unit: '°F', required: true, feedsEstimate: true },
          { id: 'thermal_shock', label: 'Steam cleaning or thermal shock', type: 'boolean', required: true, feedsEstimate: true, helper: 'Drives urethane cement over epoxy.' },
          { id: 'traffic', label: 'Traffic type', type: 'select', options: ['Foot traffic', 'Pallet jack', 'Forklift', 'Heavy forklift and steel wheel'], required: true, feedsEstimate: true },
        ],
      },
      {
        id: 'i4',
        title: 'Testing',
        fields: [
          { id: 'moisture_test', label: 'Moisture test performed', type: 'boolean', required: true },
          { id: 'rh', label: 'Relative humidity reading', type: 'number', unit: '%', required: true, feedsEstimate: true, helper: 'Above 85% requires moisture mitigation.' },
          { id: 'ph', label: 'Surface pH', type: 'number', required: false },
          { id: 'bond_test', label: 'Bond / pull test performed', type: 'boolean', required: false },
        ],
      },
      {
        id: 'i5',
        title: 'Access and restrictions',
        fields: [
          { id: 'shutdown', label: 'Available shutdown window', type: 'longtext', required: true, feedsEstimate: true, helper: 'This is what decides whether MMA is the only viable system.' },
          { id: 'night_work', label: 'Night or weekend work required', type: 'boolean', required: true, feedsEstimate: true },
          { id: 'operating_hours', label: 'Facility operating hours', type: 'text', required: true },
          { id: 'safety', label: 'Safety and site restrictions', type: 'longtext', required: true, helper: 'Badging, escorts, hot work permits, confined space, GMP or USDA protocol.' },
          { id: 'equipment_moved', label: 'Equipment that must be moved or worked around', type: 'longtext', required: true },
          { id: 'ventilation', label: 'Ventilation available', type: 'boolean', required: true },
        ],
      },
      {
        id: 'i6',
        title: 'Documentation',
        fields: [
          { id: 'plans_available', label: 'Architectural plans available', type: 'boolean', required: true },
          { id: 'spec_finish', label: 'Specified floor finish, if any', type: 'text', required: false, feedsEstimate: true },
          { id: 'decision_maker', label: 'Decision maker and budget authority', type: 'text', required: true },
          { id: 'timeline', label: 'Customer target timeline', type: 'text', required: true },
        ],
      },
    ],
  },
]

/** Commercial reuses the industrial form with lighter facility framing. */
SITE_VISIT_FORMS.push({
  ...SITE_VISIT_FORMS[1],
  id: 'svf_commercial',
  name: 'Commercial Site Visit Form',
  category: 'commercial',
})

export const FORM_BY_ID = Object.fromEntries(SITE_VISIT_FORMS.map((f) => [f.id, f]))

export function formForCategory(category: string): SiteVisitForm | undefined {
  return SITE_VISIT_FORMS.find((f) => f.category === category)
}

export function requiredFields(form: SiteVisitForm) {
  return form.sections.flatMap((s) => s.fields).filter((f) => f.required)
}
