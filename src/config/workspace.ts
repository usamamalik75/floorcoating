export type ConfigField = {
  id: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select'
  unit?: string
  options?: string[]
}

export type WorkspaceTemplate = {
  name: string
  description: string
  terminology: {
    opportunity: string
    quote: string
    job: string
    technician: string
  }
  opportunityFields: ConfigField[]
  jobFields: ConfigField[]
}

/**
 * The default workspace demonstrates shared fields that apply across service
 * trades. Customers can add trade-specific fields without changing the core.
 */
export const WORKSPACE_TEMPLATE: WorkspaceTemplate = {
  name: 'General service operations',
  description: 'Trade-neutral CRM, quoting, scheduling, field work, and billing.',
  terminology: {
    opportunity: 'Opportunity',
    quote: 'Quote',
    job: 'Job',
    technician: 'Technician',
  },
  opportunityFields: [
    { id: 'service_type', label: 'Requested service', type: 'text' },
    { id: 'quantity', label: 'Estimated quantity', type: 'number', unit: 'units' },
    { id: 'asset_type', label: 'Asset or service area', type: 'text' },
  ],
  jobFields: [
    { id: 'service_window', label: 'Service window', type: 'text' },
    { id: 'site_ready', label: 'Site ready', type: 'boolean' },
  ],
}
