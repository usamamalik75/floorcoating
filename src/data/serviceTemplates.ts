import type { Category, ScopeRequest, ScopeServiceTemplate } from '@/domain/types'

/* ==========================================================================
   Service (scope) templates for site visits / sales calls
   ==========================================================================
   Parallel to checklist templates: pick a company template to seed the
   service / scope request lines, then edit quantities and areas per visit.
   ========================================================================== */

export const SERVICE_TEMPLATES: ScopeServiceTemplate[] = [
  {
    id: 'svc_tpl_residential',
    name: 'Residential Sales Call Services',
    category: 'residential',
    managedByCompany: true,
    lines: [
      {
        serviceType: 'Garage floor coating',
        concernOrOutcome: 'Decorative durable floor finish for vehicle and foot traffic',
        unit: 'sq ft',
        areaOrEquipment: 'Garage',
        quantity: 0,
      },
      {
        serviceType: 'Basement / recreation floor',
        concernOrOutcome: 'Cleanable sealed surface for living space',
        unit: 'sq ft',
        areaOrEquipment: 'Basement',
        quantity: 0,
      },
      {
        serviceType: 'Patio / exterior coating',
        concernOrOutcome: 'Weather-resistant exterior floor finish',
        unit: 'sq ft',
        areaOrEquipment: 'Patio',
        quantity: 0,
      },
    ],
  },
  {
    id: 'svc_tpl_commercial',
    name: 'Commercial Site Visit Services',
    category: 'commercial',
    managedByCompany: true,
    lines: [
      {
        serviceType: 'Lobby / common area flooring',
        concernOrOutcome: 'High-traffic commercial floor system',
        unit: 'sq ft',
        areaOrEquipment: 'Lobby',
        quantity: 0,
      },
      {
        serviceType: 'Restroom / wet-area flooring',
        concernOrOutcome: 'Slip-resistant, cleanable wet-area system',
        unit: 'sq ft',
        areaOrEquipment: 'Restrooms',
        quantity: 0,
      },
      {
        serviceType: 'Back-of-house / storage flooring',
        concernOrOutcome: 'Durable service-area floor finish',
        unit: 'sq ft',
        areaOrEquipment: 'Back of house',
        quantity: 0,
      },
      {
        serviceType: 'Warehouse aisle coating',
        concernOrOutcome: 'Abrasion-resistant traffic lane system',
        unit: 'sq ft',
        areaOrEquipment: 'Main aisles',
        quantity: 0,
      },
    ],
  },
  {
    id: 'svc_tpl_industrial',
    name: 'Industrial Site Visit Services',
    category: 'industrial',
    managedByCompany: true,
    lines: [
      {
        serviceType: 'Process area floor system',
        concernOrOutcome: 'Chemical / thermal resistant process floor',
        unit: 'sq ft',
        areaOrEquipment: 'Process area',
        quantity: 0,
      },
      {
        serviceType: 'Wash bay / washdown flooring',
        concernOrOutcome: 'USDA-capable washdown system with slope to drain',
        unit: 'sq ft',
        areaOrEquipment: 'Wash bay',
        quantity: 0,
      },
      {
        serviceType: 'Packaging room flooring',
        concernOrOutcome: 'Cleanable packaging-zone floor system',
        unit: 'sq ft',
        areaOrEquipment: 'Packaging',
        quantity: 0,
      },
      {
        serviceType: 'Loading dock / traffic lane',
        concernOrOutcome: 'Impact and abrasion resistant traffic surface',
        unit: 'sq ft',
        areaOrEquipment: 'Dock lanes',
        quantity: 0,
      },
    ],
  },
]

export const SERVICE_TEMPLATE_BY_ID = Object.fromEntries(
  SERVICE_TEMPLATES.map((t) => [t.id, t]),
)

/** Templates available on site visits / sales calls. */
export function visitServiceTemplates(templates: ScopeServiceTemplate[]): ScopeServiceTemplate[] {
  return templates
}

export function preferredServiceTemplate(
  templates: ScopeServiceTemplate[],
  category: Category,
): ScopeServiceTemplate | undefined {
  return templates.find((t) => t.category === category) ?? templates[0]
}

export function requestsFromServiceTemplate(
  template: ScopeServiceTemplate,
  idFactory: () => string = () => `req_${Math.random().toString(36).slice(2, 9)}`,
): ScopeRequest[] {
  return template.lines.map((line) => ({
    id: idFactory(),
    serviceType: line.serviceType,
    concernOrOutcome: line.concernOrOutcome,
    quantity: line.quantity ?? 0,
    unit: line.unit,
    areaOrEquipment: line.areaOrEquipment,
    notes: line.notes,
  }))
}
