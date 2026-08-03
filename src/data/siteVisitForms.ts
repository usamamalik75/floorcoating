import type { SiteVisitForm } from '@/domain/types'

/** Configurable assessment templates. They demonstrate customer segments,
 * not a required trade or industry. */
export const SITE_VISIT_FORMS: SiteVisitForm[] = [
  {
    id: 'svf_residential',
    name: 'Residential Service Assessment',
    category: 'residential',
    sections: [
      {
        id: 'r_scope', title: 'Request and scope', fields: [
          { id: 'service_type', label: 'Requested service', type: 'text', required: true, feedsEstimate: true },
          { id: 'issue_summary', label: 'Customer concern or desired outcome', type: 'longtext', required: true },
          { id: 'estimatedQuantity', label: 'Estimated service quantity', type: 'number', unit: 'units', required: true, feedsEstimate: true },
          { id: 'asset_details', label: 'Asset, equipment, or area details', type: 'longtext', required: true, feedsEstimate: true },
        ],
      },
      {
        id: 'r_site', title: 'Site conditions', fields: [
          { id: 'access', label: 'Access instructions', type: 'longtext', required: true },
          { id: 'utilities', label: 'Required utilities available', type: 'boolean', required: true },
          { id: 'hazards', label: 'Known hazards or restrictions', type: 'longtext', required: true },
          { id: 'condition_photo', label: 'Condition photo', type: 'photo', required: true },
        ],
      },
      {
        id: 'r_customer', title: 'Customer expectations', fields: [
          { id: 'timeline', label: 'Preferred timeline', type: 'text', required: true, feedsEstimate: true },
          { id: 'decision_maker', label: 'Decision maker', type: 'text', required: true },
          { id: 'notes', label: 'Additional notes', type: 'longtext', required: false },
        ],
      },
    ],
  },
  {
    id: 'svf_industrial',
    name: 'Facility Service Assessment',
    category: 'industrial',
    sections: [
      {
        id: 'i_scope', title: 'Service scope', fields: [
          { id: 'area_name', label: 'Asset or service area', type: 'text', required: true },
          { id: 'service_type', label: 'Requested service', type: 'text', required: true, feedsEstimate: true },
          { id: 'estimatedQuantity', label: 'Primary service quantity', type: 'number', unit: 'units', required: true, feedsEstimate: true },
          { id: 'secondary_quantity', label: 'Secondary quantity', type: 'number', unit: 'units', required: false, feedsEstimate: true },
          { id: 'existing_condition', label: 'Existing condition', type: 'longtext', required: true, feedsEstimate: true },
        ],
      },
      {
        id: 'i_asset', title: 'Assets and technical requirements', fields: [
          { id: 'asset_inventory', label: 'Asset identifiers and quantities', type: 'longtext', required: true, feedsEstimate: true },
          { id: 'customer_spec', label: 'Customer specification or performance requirement', type: 'longtext', required: false, feedsEstimate: true },
          { id: 'utilities', label: 'Utility and connection requirements', type: 'longtext', required: true },
          { id: 'condition_photo', label: 'Condition photos', type: 'photo', required: true },
        ],
      },
      {
        id: 'i_operations', title: 'Operations and safety', fields: [
          { id: 'shutdown', label: 'Available service window', type: 'longtext', required: true, feedsEstimate: true },
          { id: 'night_work', label: 'Night or weekend work required', type: 'boolean', required: true, feedsEstimate: true },
          { id: 'operating_hours', label: 'Facility operating hours', type: 'text', required: true },
          { id: 'safety', label: 'Safety, badging, and permit requirements', type: 'longtext', required: true },
          { id: 'access', label: 'Access and equipment restrictions', type: 'longtext', required: true },
        ],
      },
      {
        id: 'i_customer', title: 'Commercial requirements', fields: [
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
  name: 'Commercial Service Assessment',
  category: 'commercial',
})

export const FORM_BY_ID = Object.fromEntries(SITE_VISIT_FORMS.map((f) => [f.id, f]))

export function formForCategory(category: string): SiteVisitForm | undefined {
  return SITE_VISIT_FORMS.find((f) => f.category === category)
}

export function requiredFields(form: SiteVisitForm) {
  return form.sections.flatMap((s) => s.fields).filter((f) => f.required)
}
