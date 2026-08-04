import type { SiteVisitForm } from '@/domain/types'

/**
 * Guided form templates for site visits / sales calls.
 * Scope requests (service, quantity, unit, area) are captured as a separate
 * multi-request list on the visit — not as single fields in these sections.
 */
export const SITE_VISIT_FORMS: SiteVisitForm[] = [
  {
    id: 'svf_residential',
    name: 'Residential Sales Call',
    category: 'residential',
    sections: [
      {
        id: 'r_site',
        title: 'Site conditions',
        fields: [
          { id: 'access', label: 'Access instructions', type: 'longtext', required: true },
          { id: 'utilities', label: 'Required utilities available', type: 'boolean', required: true },
          { id: 'hazards', label: 'Known hazards or restrictions', type: 'longtext', required: true },
        ],
      },
      {
        id: 'r_customer',
        title: 'Customer expectations',
        allowCustomQuestions: true,
        fields: [
          { id: 'timeline', label: 'Preferred timeline', type: 'text', required: true, feedsEstimate: true },
          { id: 'decision_maker', label: 'Decision maker', type: 'text', required: true },
          { id: 'notes', label: 'Additional notes', type: 'longtext', required: false },
        ],
      },
    ],
  },
  {
    id: 'svf_industrial',
    name: 'Facility Site Visit',
    category: 'industrial',
    sections: [
      {
        id: 'i_asset',
        title: 'Assets and technical requirements',
        fields: [
          { id: 'existing_condition', label: 'Existing condition summary', type: 'longtext', required: true, feedsEstimate: true },
          { id: 'customer_spec', label: 'Customer specification or performance requirement', type: 'longtext', required: false, feedsEstimate: true },
          { id: 'utilities', label: 'Utility and connection requirements', type: 'longtext', required: true },
          { id: 'condition_photo', label: 'Condition photos captured', type: 'boolean', required: true },
        ],
      },
      {
        id: 'i_operations',
        title: 'Operations and safety',
        fields: [
          { id: 'shutdown', label: 'Available service window', type: 'longtext', required: true, feedsEstimate: true },
          { id: 'night_work', label: 'Night or weekend work required', type: 'boolean', required: true, feedsEstimate: true },
          { id: 'operating_hours', label: 'Facility operating hours', type: 'text', required: true },
          { id: 'safety', label: 'Safety, badging, and permit requirements', type: 'longtext', required: true },
          { id: 'access', label: 'Access and equipment restrictions', type: 'longtext', required: true },
        ],
      },
      {
        id: 'i_customer',
        title: 'Commercial requirements',
        allowCustomQuestions: true,
        fields: [
          { id: 'plans_available', label: 'Plans or asset documents available', type: 'boolean', required: true },
          { id: 'decision_maker', label: 'Decision maker and budget authority', type: 'text', required: true },
          { id: 'timeline', label: 'Target timeline', type: 'text', required: true },
          { id: 'billing_requirements', label: 'PO, billing, or compliance requirements', type: 'longtext', required: false },
        ],
      },
    ],
  },
]

SITE_VISIT_FORMS.push({
  ...SITE_VISIT_FORMS[1],
  id: 'svf_commercial',
  name: 'Commercial Site Visit',
  category: 'commercial',
})

export const FORM_BY_ID = Object.fromEntries(SITE_VISIT_FORMS.map((f) => [f.id, f]))

export function formForCategory(category: string): SiteVisitForm | undefined {
  return SITE_VISIT_FORMS.find((f) => f.category === category)
}

export function requiredFields(form: SiteVisitForm) {
  return form.sections.flatMap((s) => s.fields).filter((f) => f.required)
}

export function emptyScopeRequest(id: string) {
  return {
    id,
    serviceType: '',
    concernOrOutcome: '',
    quantity: 0,
    unit: 'sq ft',
    areaOrEquipment: '',
    notes: '',
  }
}

export function requestIsComplete(r: {
  serviceType: string
  concernOrOutcome: string
  quantity: number
  unit: string
  areaOrEquipment: string
}) {
  return (
    r.serviceType.trim() !== '' &&
    r.concernOrOutcome.trim() !== '' &&
    r.areaOrEquipment.trim() !== '' &&
    r.unit.trim() !== '' &&
    Number.isFinite(r.quantity) &&
    r.quantity > 0
  )
}
