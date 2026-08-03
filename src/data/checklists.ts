import type { ChecklistTemplate } from '@/domain/types'

/* ==========================================================================
   Checklist templates
   ==========================================================================
   These are what a stage transition FIRES. Franchisor-managed templates are
   network operating standards — a location can see them but cannot weaken
   them, which is how the franchisor enforces process across territories.
   ========================================================================== */

export const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'cl_client_expectation',
    name: 'Client Expectation Checklist',
    stage: 'awarded',
    managedByFranchisor: true,
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
    managedByFranchisor: true,
    items: [
      { id: 'p1', label: 'Material ordered from the franchisor' },
      { id: 'p2', label: 'Material received and verified against the spec sheet' },
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
    managedByFranchisor: true,
    items: [
      { id: 'n1', label: 'Verify delivered material matches the spec sheet' },
      { id: 'n2', label: 'Photograph the floor before any prep begins' },
      { id: 'n3', label: 'Confirm safety requirements and site restrictions' },
      { id: 'n4', label: 'Prep to the specified CSP profile and photograph' },
      { id: 'n5', label: 'Mask and protect adjacent surfaces' },
      { id: 'n6', label: 'Record ambient and slab temperature before mixing' },
      { id: 'n7', label: 'Photograph each coat after application' },
      { id: 'n8', label: 'Install cove base where specified' },
      { id: 'n9', label: 'Photograph the completed floor from the before-shot angles' },
    ],
  },
  {
    id: 'cl_closeout',
    name: 'Project Closeout Checklist',
    stage: 'completion_review',
    managedByFranchisor: true,
    items: [
      { id: 'x1', label: 'Final photos uploaded' },
      { id: 'x2', label: 'Installation checklist completed' },
      { id: 'x3', label: 'Walk the floor with the customer' },
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
