import type { PriceBookItem, ProposalTemplate, Vertical } from '@/domain/types'

/* ==========================================================================
   Price book
   ==========================================================================
   FCG's actual published service lines. Selecting a system is what
   auto-populates the estimate line, the spec sheet, the material
   requirement, the labour assumption, the installation checklist, the
   trailer load list and the exclusions — replacing the Google Sheet that
   currently lives outside every system.

   `managedByFranchisor` items are network standards: locations can apply
   their own price multiplier but cannot edit the specification.
   ========================================================================== */

export const PRICE_BOOK: PriceBookItem[] = [
  {
    id: 'pb_polyaspartic_garage',
    name: 'Polyaspartic Garage Floor Coating',
    system: 'Polyaspartic',
    unit: 'sq ft',
    unitPrice: 7.5,
    description:
      'Full-broadcast polyaspartic garage system. Diamond-grind prep, base coat, decorative flake broadcast, clear polyaspartic topcoat. One-day install, next-day return to service.',
    categories: ['residential'],
    swatch: '#8a8f94',
    coats: 3,
    coveragePerUnit: 0.0085,
    materialUnit: 'gal',
    materialCost: 78,
    wasteAllowance: 0.1,
    labourHoursPerUnit: 0.012,
    specSheet: 'Polyaspartic Garage System — TDS rev 4.2',
    installChecklistId: 'cl_install',
    loadList: ['Planetary grinder + 30 grit', 'HEPA vacuum', 'Base coat kit', 'Flake blend', 'Topcoat kit', 'Spike shoes', 'Squeegees and rollers'],
    exclusions: ['Vehicle removal', 'Structural crack repair', 'Drain re-pitching'],
    managedByFranchisor: true,
  },
  {
    id: 'pb_flake_broadcast',
    name: 'Flake Broadcast System',
    system: 'Polyaspartic',
    unit: 'sq ft',
    unitPrice: 8.25,
    description:
      'Decorative full-flake broadcast with UV-stable topcoat. Standard colour blends included; custom blends quoted separately.',
    categories: ['residential', 'commercial'],
    swatch: '#9c8f80',
    coats: 3,
    coveragePerUnit: 0.009,
    materialUnit: 'gal',
    materialCost: 74,
    wasteAllowance: 0.1,
    labourHoursPerUnit: 0.013,
    specSheet: 'Flake Broadcast System — TDS rev 3.1',
    installChecklistId: 'cl_install',
    loadList: ['Planetary grinder', 'HEPA vacuum', 'Base coat kit', 'Flake blend', 'Topcoat kit', 'Flake blowers'],
    exclusions: ['Custom colour blends', 'Existing coating removal'],
    managedByFranchisor: true,
  },
  {
    id: 'pb_urethane_cement',
    name: 'Urethane Cement',
    system: 'Urethane Cement',
    unit: 'sq ft',
    unitPrice: 12.75,
    description:
      'Heavy-duty urethane cement for commercial kitchens and food & beverage processing. Thermal-shock resistant, withstands steam cleaning and caustic washdown. USDA compliant.',
    categories: ['commercial', 'industrial'],
    swatch: '#a8563f',
    coats: 1,
    coveragePerUnit: 0.018,
    materialUnit: 'kit',
    materialCost: 210,
    wasteAllowance: 0.12,
    labourHoursPerUnit: 0.028,
    specSheet: 'Urethane Cement 3/16" — TDS rev 6.0',
    installChecklistId: 'cl_install',
    loadList: ['Shot blaster', 'Diamond grinder', 'Forced-action mixers', 'Gauge rakes', 'Spiked rollers', 'Urethane cement kits', 'Cove tooling', 'Spike shoes'],
    exclusions: ['Drain re-pitching', 'Equipment disconnection', 'Slab replacement'],
    managedByFranchisor: true,
  },
  {
    id: 'pb_mma',
    name: 'MMA High Performance Flooring',
    system: 'MMA',
    unit: 'sq ft',
    unitPrice: 14.5,
    description:
      'Methyl methacrylate system with one-hour cure. Installs at temperatures down to -20°F, which makes it the only option for freezers, coolers and overnight retail shutdowns.',
    categories: ['commercial', 'industrial'],
    swatch: '#5c6f8a',
    coats: 2,
    coveragePerUnit: 0.0125,
    materialUnit: 'kit',
    materialCost: 240,
    wasteAllowance: 0.15,
    labourHoursPerUnit: 0.025,
    specSheet: 'MMA Rapid Cure — TDS rev 2.8',
    installChecklistId: 'cl_install',
    loadList: ['Shot blaster', 'MMA resin kits', 'Catalyst (BPO)', 'Aggregate', 'Respirators + fresh air', 'Notched squeegees', 'Cove tooling'],
    exclusions: ['Odour mitigation beyond standard ventilation', 'Freezer defrost cycle management'],
    managedByFranchisor: true,
  },
  {
    id: 'pb_industrial_epoxy',
    name: 'Industrial Epoxy System',
    system: 'Epoxy',
    unit: 'sq ft',
    unitPrice: 6.8,
    description:
      '100% solids industrial epoxy build coat. Chemical and abrasion resistant, suited to manufacturing floors, warehouses and maintenance bays.',
    categories: ['commercial', 'industrial'],
    swatch: '#4a6b8a',
    coats: 2,
    coveragePerUnit: 0.0092,
    materialUnit: 'gal',
    materialCost: 62,
    wasteAllowance: 0.1,
    labourHoursPerUnit: 0.014,
    specSheet: 'Industrial Epoxy 100% Solids — TDS rev 5.3',
    installChecklistId: 'cl_install',
    loadList: ['Diamond grinder', 'HEPA vacuum', 'Epoxy kits', 'Notched squeegees', 'Back rollers', 'Spike shoes'],
    exclusions: ['Thermal shock service', 'UV exposure without topcoat'],
    managedByFranchisor: true,
  },
  {
    id: 'pb_polyurea',
    name: 'Polyaspartics & Polyureas',
    system: 'Polyurea',
    unit: 'sq ft',
    unitPrice: 9.25,
    description:
      'Fast-cure polyurea base with polyaspartic topcoat. Rapid return to service for facilities that cannot take extended downtime.',
    categories: ['commercial', 'industrial'],
    swatch: '#6b7f6a',
    coats: 3,
    coveragePerUnit: 0.0075,
    materialUnit: 'gal',
    materialCost: 88,
    wasteAllowance: 0.1,
    labourHoursPerUnit: 0.015,
    specSheet: 'Polyurea / Polyaspartic — TDS rev 4.0',
    installChecklistId: 'cl_install',
    loadList: ['Planetary grinder', 'HEPA vacuum', 'Polyurea base kits', 'Polyaspartic topcoat', 'Flake blend', 'Spike shoes'],
    exclusions: ['Existing coating removal', 'Moisture mitigation'],
    managedByFranchisor: true,
  },
  {
    id: 'pb_moisture_mitigation',
    name: 'Moisture Mitigation System',
    system: 'Moisture Mitigation',
    unit: 'sq ft',
    unitPrice: 3.25,
    description:
      'Single-coat epoxy moisture vapour barrier applied over slabs testing high on RH or calcium chloride. Required before any resinous system on slab-on-grade with elevated readings.',
    categories: ['commercial', 'industrial', 'residential'],
    swatch: '#7d7f86',
    coats: 1,
    coveragePerUnit: 0.00625,
    materialUnit: 'gal',
    materialCost: 92,
    wasteAllowance: 0.08,
    labourHoursPerUnit: 0.008,
    specSheet: 'MVB Epoxy — TDS rev 3.0',
    installChecklistId: 'cl_install',
    loadList: ['MVB epoxy kits', 'Notched squeegees', 'Back rollers'],
    exclusions: ['Hydrostatic pressure remediation', 'Sub-slab vapour barrier installation'],
    managedByFranchisor: true,
  },
  {
    id: 'pb_polished_concrete',
    name: 'Polished Concrete',
    system: 'Polished Concrete',
    unit: 'sq ft',
    unitPrice: 5.4,
    description: 'Mechanically polished concrete with densifier and guard. Grit level and gloss specified per area.',
    categories: ['commercial', 'industrial'],
    swatch: '#9ea2a6',
    coats: 2,
    coveragePerUnit: 0.0045,
    materialUnit: 'gal',
    materialCost: 46,
    wasteAllowance: 0.05,
    labourHoursPerUnit: 0.02,
    specSheet: 'Polished Concrete — Process Guide rev 2.2',
    installChecklistId: 'cl_install',
    loadList: ['Planetary grinder', 'Metal + resin bond tooling 30–3000 grit', 'Densifier', 'Guard', 'Burnisher'],
    exclusions: ['Colour consistency in existing slabs', 'Aggregate exposure guarantees'],
    managedByFranchisor: true,
  },
  {
    id: 'pb_concrete_prep',
    name: 'Concrete Surface Preparation',
    system: 'Prep',
    unit: 'sq ft',
    unitPrice: 2.1,
    description:
      'Diamond grinding or shot blasting to CSP 2–3, including joint and crack repair. Priced separately where existing coating removal is required.',
    categories: ['commercial', 'industrial', 'residential'],
    swatch: '#8d9195',
    coats: 0,
    coveragePerUnit: 0,
    materialUnit: 'n/a',
    materialCost: 0,
    wasteAllowance: 0,
    labourHoursPerUnit: 0.01,
    specSheet: 'Surface Preparation Standard — CSP 2–3',
    installChecklistId: 'cl_install',
    loadList: ['Shot blaster', 'Diamond grinder', 'HEPA vacuum', 'Joint filler', 'Crack repair resin'],
    exclusions: ['Structural repair', 'Slab levelling beyond 1/4 inch'],
    managedByFranchisor: true,
  },
  {
    id: 'pb_cove_base',
    name: 'Integral Cove Base',
    system: 'Cove',
    unit: 'lin ft',
    unitPrice: 28.0,
    description: '4" or 6" integral coved base formed in matching resin. Required for sanitary washdown environments.',
    categories: ['commercial', 'industrial'],
    swatch: '#a8563f',
    coats: 1,
    coveragePerUnit: 0.028,
    materialUnit: 'kit',
    materialCost: 210,
    wasteAllowance: 0.15,
    labourHoursPerUnit: 0.14,
    specSheet: 'Integral Cove Detail — Drawing CD-06',
    installChecklistId: 'cl_install',
    loadList: ['Cove trowels', 'Cove tooling', 'Termination strip', 'Resin kits'],
    exclusions: ['Wall repair or resurfacing', 'Stainless termination trim'],
    managedByFranchisor: true,
  },
  {
    id: 'pb_mobilization',
    name: 'Mobilization & Night Work Premium',
    system: 'Other',
    unit: 'ea',
    unitPrice: 1850.0,
    description:
      'Crew mobilization, equipment transport and off-hours labour premium for overnight or weekend installations.',
    categories: ['commercial', 'industrial'],
    swatch: '#7c898d',
    coats: 0,
    coveragePerUnit: 0,
    materialUnit: 'n/a',
    materialCost: 0,
    wasteAllowance: 0,
    labourHoursPerUnit: 8,
    specSheet: 'n/a',
    installChecklistId: 'cl_install',
    loadList: [],
    exclusions: [],
    managedByFranchisor: false,
  },
]

export const PRICE_BOOK_BY_ID = Object.fromEntries(PRICE_BOOK.map((p) => [p.id, p]))

/* ========================================================================== */

export const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: 'pt_standard',
    name: 'FCG Standard Commercial',
    managedByFranchisor: true,
    depositPct: 40,
    validDays: 30,
    terms:
      "Pricing valid for 30 days from the date of this proposal. Pricing assumes the areas identified are clear of equipment, product and racking at the time of installation, and that the customer provides unobstructed access, adequate lighting, 110V power and water. Moisture testing results are as recorded at the time of the site visit; slabs testing above 85% RH require the moisture mitigation system quoted as a separate line. Concrete repair beyond hairline crack fill is not included and will be quoted as a change order. FCG carries general liability and workers' compensation coverage; certificates available on request.",
    exclusions: [
      'Equipment disconnection, removal and reinstallation',
      'Structural concrete repair or slab replacement',
      'Drain re-pitching or plumbing modification',
      'Permits and after-hours facility supervision',
      'Removal of hazardous materials',
    ],
  },
  {
    id: 'pt_residential',
    name: 'FCG Residential',
    managedByFranchisor: true,
    depositPct: 25,
    validDays: 21,
    terms:
      'Pricing valid for 21 days. The homeowner agrees to clear all vehicles and stored items from the work area prior to the scheduled installation date. FCG will protect adjacent surfaces but is not responsible for pre-existing damage. Cure and return-to-service times are provided at the time of installation and must be observed. A deposit is required to schedule.',
    exclusions: [
      'Vehicle and stored item removal',
      'Structural crack or slab repair',
      'Drywall, trim or paint repair',
      'Removal of existing coatings unless quoted',
    ],
  },
  {
    id: 'pt_industrial_ns',
    name: 'FCG Industrial — Night Shift',
    managedByFranchisor: false,
    depositPct: 50,
    validDays: 30,
    terms:
      'Pricing assumes continuous access to the work area during the agreed overnight shutdown window. Delays to the shutdown window caused by facility operations will be billed at the standby rate. All other standard FCG terms apply.',
    exclusions: [
      'Production downtime beyond the agreed window',
      'Facility escort and security costs',
      'Equipment disconnection',
    ],
  },
]

export const TEMPLATE_BY_ID = Object.fromEntries(PROPOSAL_TEMPLATES.map((t) => [t.id, t]))

/** FCG's published industries served — doubles as the prospecting filter. */
export const VERTICALS: Vertical[] = [
  'Food & Beverage',
  'Industrial',
  'Hospitality',
  'Retail',
  'Aerospace',
  'Warehouse',
  'Institutional',
  'Traffic & Parking',
  'Showrooms',
  'Education',
  'Pharmaceutical',
  'Office Space',
  'Commercial',
  'Residential',
]

/**
 * Material derivation. This is the calculation the client described:
 * system + area + cove + coats + waste → an orderable list. The project
 * manager can adjust it, but nobody starts from a blank page.
 */
export function deriveMaterial(priceBookId: string, qty: number) {
  const pb = PRICE_BOOK_BY_ID[priceBookId]
  if (!pb || pb.coveragePerUnit === 0) return null
  const coats = Math.max(1, pb.coats)
  const withWaste = qty * pb.coveragePerUnit * coats * (1 + pb.wasteAllowance)
  const spread = Math.round(1 / pb.coveragePerUnit)
  return {
    product: pb.name,
    unit: pb.materialUnit,
    qty: Math.ceil(withWaste),
    unitCost: pb.materialCost,
    derivation:
      `${qty.toLocaleString()} ${pb.unit} ÷ ${spread} ${pb.unit}/${pb.materialUnit} ` +
      `× ${coats} coat${coats === 1 ? '' : 's'} + ${Math.round(pb.wasteAllowance * 100)}% waste`,
  }
}
