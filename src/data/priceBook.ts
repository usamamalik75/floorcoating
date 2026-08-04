import type { PriceBookItem, ProposalTemplate, Vertical } from '@/domain/types'

type CatalogueInput = Pick<PriceBookItem, 'id' | 'name' | 'catalogueGroup' | 'unit' | 'unitPrice' | 'description'> & Partial<PriceBookItem>

function catalogueItem(input: CatalogueInput): PriceBookItem {
  return {
    categories: ['residential', 'commercial', 'industrial'],
    swatch: '#64748b',
    resourceMultiplier: 1,
    materialRate: 0,
    materialUnit: 'n/a',
    materialCost: 0,
    contingencyAllowance: 0,
    laborHoursPerUnit: 1,
    serviceDocument: 'Standard service scope',
    jobChecklistId: 'cl_install',
    requiredResources: [],
    exclusions: [],
    managedByCompany: true,
    ...input,
  }
}

/** A configurable catalogue demonstrating several service trades. */
export const PRICE_BOOK: PriceBookItem[] = [
  catalogueItem({
    id: 'svc_hvac_tuneup', name: 'HVAC preventive maintenance visit', catalogueGroup: 'HVAC', unit: 'visit', unitPrice: 289,
    description: 'Inspection, cleaning, performance testing, and a written condition report for one system.',
    categories: ['residential', 'commercial'], materialRate: 1, materialUnit: 'service kit', materialCost: 32,
    laborHoursPerUnit: 2.5, requiredResources: ['Diagnostic meter', 'Cleaning tools', 'PPE'],
    exclusions: ['Replacement parts', 'Refrigerant'],
  }),
  catalogueItem({
    id: 'svc_filter_package', name: 'Air filter replacement package', catalogueGroup: 'HVAC', unit: 'unit', unitPrice: 84,
    description: 'Supply and replace a standard filter, record size, and document completion.',
    categories: ['residential', 'commercial'], materialRate: 1, materialUnit: 'filter', materialCost: 22,
    contingencyAllowance: 0.05, laborHoursPerUnit: 0.25,
  }),
  catalogueItem({
    id: 'svc_commercial_cleaning', name: 'Commercial deep-clean service', catalogueGroup: 'Cleaning', unit: 'service unit', unitPrice: 12.75,
    description: 'Planned deep-clean service with a configurable checklist, quality inspection, and completion evidence.',
    categories: ['commercial', 'industrial'], materialRate: 0.018, materialUnit: 'supply kit', materialCost: 48,
    contingencyAllowance: 0.08, laborHoursPerUnit: 0.028, requiredResources: ['Cleaning equipment', 'PPE', 'Warning signs'],
    exclusions: ['Hazardous-material remediation', 'Equipment relocation'],
  }),
  catalogueItem({
    id: 'svc_electrical_upgrade', name: 'Electrical equipment upgrade', catalogueGroup: 'Electrical', unit: 'unit', unitPrice: 1450,
    description: 'Replace specified electrical equipment, test operation, label, and document commissioning.',
    categories: ['commercial', 'industrial'], materialRate: 1, materialUnit: 'equipment set', materialCost: 620,
    contingencyAllowance: 0.03, laborHoursPerUnit: 8, requiredResources: ['Lockout kit', 'Test equipment', 'Installation tools'],
    exclusions: ['Utility-side work', 'Permit fees', 'Hidden feeder damage'],
  }),
  catalogueItem({
    id: 'svc_plumbing_repair', name: 'Commercial plumbing repair', catalogueGroup: 'Plumbing', unit: 'service unit', unitPrice: 680,
    description: 'Diagnose and repair an accessible plumbing issue with testing and completion documentation.',
    categories: ['commercial', 'industrial'], materialRate: 0.01, materialUnit: 'parts allowance', materialCost: 95,
    contingencyAllowance: 0.1, laborHoursPerUnit: 3, requiredResources: ['Diagnostic tools', 'Repair fittings', 'PPE'],
    exclusions: ['Concealed conditions', 'Structural access'],
  }),
  catalogueItem({
    id: 'svc_equipment_install', name: 'Equipment installation and commissioning', catalogueGroup: 'Installation', unit: 'unit', unitPrice: 925,
    description: 'Receive, position, connect, test, and commission customer-approved equipment.',
    categories: ['commercial', 'industrial'], materialRate: 1, materialUnit: 'install kit', materialCost: 140,
    contingencyAllowance: 0.05, laborHoursPerUnit: 5, requiredResources: ['Handling equipment', 'Connection kit', 'Test instruments'],
  }),
  catalogueItem({
    id: 'svc_site_protection', name: 'Site protection and containment', catalogueGroup: 'Site services', unit: 'service unit', unitPrice: 325,
    description: 'Protect occupied areas and maintain safe customer access during work.',
    materialRate: 0.02, materialUnit: 'protection kit', materialCost: 54, contingencyAllowance: 0.1,
    requiredResources: ['Barriers', 'Protection film', 'Signage'],
  }),
  catalogueItem({
    id: 'svc_pressure_washing', name: 'Exterior pressure-washing service', catalogueGroup: 'Exterior services', unit: 'service unit', unitPrice: 5.4,
    description: 'Clean approved exterior areas and document pre-existing and completed conditions.',
    categories: ['residential', 'commercial'], materialRate: 0.005, materialUnit: 'supply unit', materialCost: 28,
    contingencyAllowance: 0.05, laborHoursPerUnit: 0.02, requiredResources: ['Pressure washer', 'Hoses', 'PPE'],
  }),
  catalogueItem({
    id: 'svc_site_preparation', name: 'Work-area preparation', catalogueGroup: 'Site services', unit: 'hour', unitPrice: 95,
    description: 'Prepare the service area, establish access controls, and protect adjacent property.',
    laborHoursPerUnit: 1, requiredResources: ['PPE', 'Barriers', 'Protection materials'],
  }),
  catalogueItem({
    id: 'svc_access_equipment', name: 'Access equipment allowance', catalogueGroup: 'Equipment', unit: 'day', unitPrice: 280,
    description: 'Standard access equipment and setup for elevated or restricted work areas.',
    categories: ['commercial', 'industrial'], materialRate: 1, materialUnit: 'rental day', materialCost: 150,
    laborHoursPerUnit: 0.5, requiredResources: ['Access equipment', 'Inspection tags', 'Barricades'],
  }),
  catalogueItem({
    id: 'svc_mobilization', name: 'Mobilization and after-hours premium', catalogueGroup: 'Other', unit: 'each', unitPrice: 1850,
    description: 'Team mobilization, equipment transport, and approved after-hours labor premium.',
    categories: ['commercial', 'industrial'], laborHoursPerUnit: 8, managedByCompany: false,
  }),
  catalogueItem({
    id: 'fs_residential_flake',
    name: 'Residential flake floor system',
    catalogueGroup: 'Floor systems',
    unit: 'sq ft',
    unitPrice: 8.5,
    description: 'Decorative flake broadcast system for garages and residential floors — prep, base, flake, and clear topcoat.',
    categories: ['residential'],
    swatch: '#c45c26',
    materialRate: 0.012,
    materialUnit: 'kit',
    materialCost: 95,
    contingencyAllowance: 0.08,
    laborHoursPerUnit: 0.045,
    serviceDocument: 'Residential Flake System — TDS',
    requiredResources: ['Diamond grinder', 'Flake chips', 'Clear topcoat', 'PPE'],
    exclusions: ['Structural repairs', 'Moisture mitigation unless listed'],
  }),
  catalogueItem({
    id: 'fs_commercial_epoxy',
    name: 'Commercial epoxy floor system',
    catalogueGroup: 'Floor systems',
    unit: 'sq ft',
    unitPrice: 11.25,
    description: 'High-build epoxy system for retail, hospitality, and light commercial traffic with optional cove.',
    categories: ['commercial'],
    swatch: '#1f4e79',
    materialRate: 0.015,
    materialUnit: 'kit',
    materialCost: 120,
    contingencyAllowance: 0.1,
    laborHoursPerUnit: 0.05,
    serviceDocument: 'Commercial Epoxy System — TDS',
    requiredResources: ['Shot blaster / grinder', 'Epoxy kit', 'Cove tool', 'PPE'],
    exclusions: ['After-hours premium', 'Furniture moving'],
  }),
  catalogueItem({
    id: 'fs_industrial_mortar',
    name: 'Industrial USDA mortar floor system',
    catalogueGroup: 'Floor systems',
    unit: 'sq ft',
    unitPrice: 18.75,
    description: 'USDA-compliant commercial service mortar for washdown process areas — thermal shock and chemical resistant.',
    categories: ['industrial'],
    swatch: '#5b2c6f',
    materialRate: 0.022,
    materialUnit: 'kit',
    materialCost: 185,
    contingencyAllowance: 0.12,
    laborHoursPerUnit: 0.07,
    serviceDocument: 'Industrial Mortar System 3/16" — TDS rev 6.0',
    requiredResources: ['Shot blaster', 'Mortar kit', 'Drain detailing kit', 'Hot-work permit', 'PPE'],
    exclusions: ['Production downtime beyond agreed window', 'Hazardous-material remediation'],
  }),
  catalogueItem({
    id: 'fs_industrial_quartz',
    name: 'Industrial quartz broadcast system',
    catalogueGroup: 'Floor systems',
    unit: 'sq ft',
    unitPrice: 16.4,
    description: 'Heavy-duty quartz broadcast for wash bays and high-abuse industrial zones.',
    categories: ['industrial', 'commercial'],
    swatch: '#7d6608',
    materialRate: 0.02,
    materialUnit: 'kit',
    materialCost: 160,
    contingencyAllowance: 0.1,
    laborHoursPerUnit: 0.06,
    serviceDocument: 'Quartz Broadcast System — TDS',
    requiredResources: ['Shot blaster', 'Quartz media', 'Topcoat', 'PPE'],
    exclusions: ['Equipment relocation'],
  }),
]

export const PRICE_BOOK_BY_ID = Object.fromEntries(PRICE_BOOK.map((item) => [item.id, item]))

export const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: 'pt_standard', name: 'Standard commercial service', managedByCompany: true, depositPct: 30, validDays: 30,
    terms: 'Pricing is valid for 30 days. The customer will provide safe access to the agreed service location. Conditions outside the documented scope require an approved change order.',
    exclusions: ['Undocumented concealed conditions', 'Permits unless listed', 'Hazardous-material remediation', 'Work outside the signed scope'],
  },
  {
    id: 'pt_residential', name: 'Standard residential service', managedByCompany: true, depositPct: 20, validDays: 21,
    terms: 'Pricing is valid for 21 days. The customer will provide clear and safe access. Additional work requires approval before it is performed.',
    exclusions: ['Customer property relocation', 'Concealed damage', 'Permit fees unless listed'],
  },
  {
    id: 'pt_industrial_ns', name: 'After-hours facility service', managedByCompany: false, depositPct: 40, validDays: 30,
    terms: 'Pricing assumes continuous access during the agreed service window. Customer-caused standby time and scope changes require written approval.',
    exclusions: ['Production downtime beyond the agreed window', 'Facility escort costs', 'Utility shutdowns'],
  },
]

export const TEMPLATE_BY_ID = Object.fromEntries(PROPOSAL_TEMPLATES.map((template) => [template.id, template]))

export const VERTICALS: Vertical[] = [
  'Food & Beverage', 'Industrial', 'Hospitality', 'Retail', 'Aerospace', 'Warehouse',
  'Institutional', 'Traffic & Parking', 'Showrooms', 'Education', 'Pharmaceutical',
  'Office Space', 'Commercial', 'Residential',
]

export function deriveMaterial(
  priceBookId: string,
  quantity: number,
  items: PriceBookItem[] = PRICE_BOOK,
) {
  const item = items.find((candidate) => candidate.id === priceBookId)
  if (!item || item.materialRate === 0) return null
  const multiplier = Math.max(1, item.resourceMultiplier)
  const required = quantity * item.materialRate * multiplier * (1 + item.contingencyAllowance)
  return {
    product: item.name,
    unit: item.materialUnit,
    qty: Math.ceil(required),
    unitCost: item.materialCost,
    derivation: `${quantity.toLocaleString()} ${item.unit} x resource rate ${item.materialRate} x ${multiplier} + ${Math.round(item.contingencyAllowance * 100)}% allowance`,
  }
}
