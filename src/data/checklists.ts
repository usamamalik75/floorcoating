import type { ChecklistItem, ChecklistTemplate } from '@/domain/types'

/* ==========================================================================
   Checklist templates
   ==========================================================================
   These are what a stage transition FIRES. Company administrator-managed templates are
   network operating standards — a location can see them but cannot weaken
   them, which is how the company administrator enforces process across territories.
   ========================================================================== */

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'cl_sales_call_residential',
    name: 'Residential Sales Call Checklist',
    category: 'residential',
    stage: 'site_visit_scheduled',
    managedByCompany: true,
    items: [
      { id: 'rsc1', label: 'Confirm appointment time with homeowner' },
      { id: 'rsc2', label: 'Bring colour samples / finish boards' },
      { id: 'rsc3', label: 'Measure each area separately (garage, basement, patio…)' },
      { id: 'rsc4', label: 'Note access, parking, and pets' },
      { id: 'rsc5', label: 'Ask colour / finish preference questions' },
      { id: 'rsc6', label: 'Capture decision maker and timeline expectations' },
      { id: 'rsc7', label: 'Walk every requested area before leaving' },
    ],
  },
  {
    id: 'cl_site_visit_commercial',
    name: 'Commercial Site Visit Checklist',
    category: 'commercial',
    stage: 'site_visit_scheduled',
    managedByCompany: true,
    items: [
      { id: 'csc1', label: 'Confirm site contact and badging / escort needs' },
      { id: 'csc2', label: 'Walk every service area on the request list' },
      { id: 'csc3', label: 'Photograph existing condition of each area' },
      { id: 'csc4', label: 'Measure quantity and note unit per area' },
      { id: 'csc5', label: 'Record operating hours and service window constraints' },
      { id: 'csc6', label: 'Note safety, PPE, and adjacent-work restrictions' },
      { id: 'csc7', label: 'Confirm decision maker and budget path' },
      { id: 'csc8', label: 'Collect plans or asset docs if available' },
    ],
  },
  {
    id: 'cl_site_visit_industrial',
    name: 'Industrial Site Visit Checklist',
    category: 'industrial',
    stage: 'site_visit_scheduled',
    managedByCompany: true,
    items: [
      { id: 'isc1', label: 'Confirm plant contact, escort, and safety briefing' },
      { id: 'isc2', label: 'Walk every process / packaging / wash area in scope' },
      { id: 'isc3', label: 'Photograph condition and problem spots per area' },
      { id: 'isc4', label: 'Measure quantity and unit for each request surface' },
      { id: 'isc5', label: 'Document chemicals, washdown, and thermal conditions' },
      { id: 'isc6', label: 'Record shutdown / night-work windows' },
      { id: 'isc7', label: 'Note utilities, drains, and equipment that stays in place' },
      { id: 'isc8', label: 'Confirm decision maker, PO, and compliance requirements' },
      { id: 'isc9', label: 'Collect drawings or asset lists if available' },
    ],
  },
  {
    id: 'cl_client_expectation',
    name: 'Client Expectation Checklist',
    stage: 'awarded',
    managedByCompany: true,
    items: [
      { id: 'e1', label: 'Confirm signed scope matches the proposal' },
      { id: 'e2', label: 'Confirm start and completion dates in writing' },
      { id: 'e3', label: 'Confirm site access, keys, badges and escort requirements' },
      { id: 'e4', label: 'Confirm the area will be cleared before crew arrival' },
      { id: 'e5', label: 'Set expectations on odour, noise and cure time' },
      { id: 'e6', label: 'Confirm deposit terms and payment schedule' },
    ],
  },
  {
    id: 'cl_prep',
    name: 'Project Preparation Checklist',
    stage: 'ready_to_start',
    managedByCompany: true,
    items: [
      { id: 'p1', label: 'Required resources ordered through purchasing' },
      { id: 'p2', label: 'Required resources received and verified against the job scope' },
      { id: 'p3', label: 'Crew leader and installers assigned' },
      { id: 'p4', label: 'Product specifications attached to the job' },
      { id: 'p5', label: 'Installation checklist available on mobile' },
      { id: 'p6', label: 'Site visit photos visible to the crew' },
      { id: 'p7', label: 'Architectural plans and install map available' },
      { id: 'p8', label: 'Customer expectations documented' },
      { id: 'p9', label: 'Required equipment reserved and loaded' },
    ],
  },
  {
    id: 'cl_install',
    name: 'Installation Checklist',
    stage: 'in_progress',
    managedByCompany: true,
    items: [
      { id: 'n1', label: 'Verify delivered resources match the job scope' },
      { id: 'n2', label: 'Photograph the service area before any prep begins' },
      { id: 'n3', label: 'Confirm safety requirements and site restrictions' },
      { id: 'n4', label: 'Prep to the specified CSP profile and photograph' },
      { id: 'n5', label: 'Mask and protect adjacent surfaces' },
      { id: 'n6', label: 'Record ambient and surface temperature before mixing' },
      { id: 'n7', label: 'Photograph each service pass after application' },
      { id: 'n8', label: 'Install secondary work base where specified' },
      { id: 'n9', label: 'Photograph the completed service area from the before-shot angles' },
    ],
  },
  {
    id: 'cl_closeout',
    name: 'Project Closeout Checklist',
    stage: 'completion_review',
    managedByCompany: true,
    items: [
      { id: 'x1', label: 'Final photos uploaded' },
      { id: 'x2', label: 'Installation checklist completed' },
      { id: 'x3', label: 'Walk the service area with the customer' },
      { id: 'x4', label: 'Customer sign-off received' },
      {
        id: 'x5',
        label: 'Change orders confirmed',
        helper: 'Asked every time. This is the scope that currently gets invoiced wrong because someone has to remember it.',
      },
      { id: 'x6', label: 'Additional scope reviewed and priced' },
      { id: 'x7', label: 'Final quantities confirmed' },
      { id: 'x8', label: 'Outstanding issues recorded' },
      { id: 'x9', label: 'Warranty documentation prepared' },
      { id: 'x10', label: 'Care and maintenance instructions issued' },
    ],
  },
]

export const CHECKLIST_BY_ID = Object.fromEntries(CHECKLIST_TEMPLATES.map((t) => [t.id, t]))

export function templateForStage(stage: string, category?: string): ChecklistTemplate | undefined {
  return (
    CHECKLIST_TEMPLATES.find((t) => t.stage === stage && t.category === category) ??
    CHECKLIST_TEMPLATES.find((t) => t.stage === stage && !t.category)
  )
}

/** Templates available for site visits / sales calls (selectable on the visit). */
export function visitChecklistTemplates(templates: ChecklistTemplate[]): ChecklistTemplate[] {
  return templates.filter((t) => t.stage === 'site_visit_scheduled')
}

export function resolveChecklistItems(
  instance: { items?: ChecklistItem[]; templateId: string } | undefined,
  template: ChecklistTemplate | undefined,
): ChecklistItem[] {
  if (instance?.items?.length) return instance.items
  return template?.items ?? []
}
