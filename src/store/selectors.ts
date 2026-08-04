import { useMemo } from 'react'
import { useStore } from './useStore'
import { checksForStage, type ReadinessInput } from '@/domain/readiness'
import type { StageId } from '@/domain/types'

/** Assembles the readiness input for one opportunity from live store state. */
export function useReadinessInput(opportunityId: string): ReadinessInput | null {
  const s = useStore()
  return useMemo(() => {
    const opportunity = s.opportunities.find((o) => o.id === opportunityId)
    if (!opportunity) return null
    return {
      opportunity,
      siteVisit: s.siteVisits.find((v) => v.opportunityId === opportunityId),
      artifacts: s.artifacts.filter((a) => a.opportunityId === opportunityId),
      estimate: s.estimates.find((e) => e.opportunityId === opportunityId),
      checklists: s.checklists.filter((c) => c.opportunityId === opportunityId),
      procurementOrder: s.procurementOrders.find((m) => m.opportunityId === opportunityId),
      job: s.jobs.find((j) => j.opportunityId === opportunityId),
      invoices: s.invoices.filter((i) => i.opportunityId === opportunityId),
      changeOrders: s.changeOrders.filter((c) => c.opportunityId === opportunityId),
      siteVisitForms: s.siteVisitForms,
      checklistTemplates: s.checklistTemplates,
    } as ReadinessInput
  }, [
    opportunityId,
    s.opportunities,
    s.siteVisits,
    s.artifacts,
    s.estimates,
    s.checklists,
    s.procurementOrders,
    s.jobs,
    s.invoices,
    s.changeOrders,
    s.siteVisitForms,
    s.checklistTemplates,
  ])
}

/**
 * Filtering inside a store selector would return a fresh array on every
 * snapshot read and loop forever, so the slice is selected first and the
 * filter is memoised.
 */
export function useArtifactsFor(opportunityId: string) {
  const all = useStore((s) => s.artifacts)
  return useMemo(() => all.filter((r) => r.opportunityId === opportunityId), [all, opportunityId])
}

export function useChangeOrdersFor(opportunityId: string) {
  const all = useStore((s) => s.changeOrders)
  return useMemo(() => all.filter((r) => r.opportunityId === opportunityId), [all, opportunityId])
}

export function useIssuesFor(opportunityId: string) {
  const all = useStore((s) => s.issues)
  return useMemo(() => all.filter((r) => r.opportunityId === opportunityId), [all, opportunityId])
}

export function useChecks(opportunityId: string, stage: StageId) {
  const input = useReadinessInput(opportunityId)
  return useMemo(() => (input ? checksForStage(stage, input) : []), [input, stage])
}

export function useViewer() {
  const viewerId = useStore((s) => s.viewerId)
  const users = useStore((s) => s.users)
  return useMemo(() => users.find((user) => user.id === viewerId) ?? null, [users, viewerId])
}

export function useUsers() {
  return useStore((s) => s.users)
}

export function useUserDirectory() {
  const users = useUsers()
  return useMemo(
    () => Object.fromEntries(users.map((user) => [user.id, user])),
    [users],
  )
}

/** Everything the current viewer is allowed to see, after the territory filter. */
export function useScopedOpportunities() {
  const opportunities = useStore((s) => s.opportunities)
  const locationFilter = useStore((s) => s.locationFilter)
  const viewer = useViewer()
  return useMemo(() => {
    let list = opportunities
    if (locationFilter !== 'all') list = list.filter((o) => o.locationId === locationFilter)
    if (viewer?.role === 'sales') list = list.filter((o) => o.ownerId === viewer.id || o.stage === 'new_lead')
    return list
  }, [opportunities, locationFilter, viewer])
}

export function useScopedAccounts() {
  const accounts = useStore((s) => s.accounts)
  const locationFilter = useStore((s) => s.locationFilter)
  return useMemo(
    () => (locationFilter === 'all' ? accounts : accounts.filter((a) => a.locationId === locationFilter)),
    [accounts, locationFilter],
  )
}

/** Inbound routing: match the lead's zip prefix to a territory. */
export function routeZip<T extends { zips: string[] }>(zip: string, locations: T[] = []) {
  const prefix = zip.slice(0, 3)
  return locations.find((location) => location.zips.includes(prefix)) ?? null
}

export function useLocations() {
  return useStore((s) => s.locations)
}

export function useRouteZip(zip: string) {
  const locations = useLocations()
  return useMemo(() => routeZip(zip, locations), [locations, zip])
}

export function useWorkspaceTemplate() {
  return useStore((s) => s.workspaceTemplate)
}

export function useSiteVisitForms() {
  return useStore((s) => s.siteVisitForms)
}

export function useFormForCategory(category?: string) {
  const forms = useSiteVisitForms()
  return useMemo(() => forms.find((form) => form.category === category), [forms, category])
}

export function useChecklistTemplates() {
  return useStore((s) => s.checklistTemplates)
}

export function usePriceBookItems() {
  return useStore((s) => s.priceBookItems)
}

export function useProposalTemplates() {
  return useStore((s) => s.proposalTemplates)
}

export function useEstimatePacks() {
  return useStore((s) => s.estimatePacks)
}

export function useEstimatePack(category?: string) {
  const packs = useEstimatePacks()
  return useMemo(
    () => (category ? packs.find((pack) => pack.category === category) ?? null : null),
    [packs, category],
  )
}

export function useStageDefinitions() {
  return useStore((s) => s.stageDefinitions)
}

export function useMessageThreads(opportunityId?: string) {
  const threads = useStore((s) => s.messageThreads)
  return useMemo(
    () => (opportunityId ? threads.filter((thread) => thread.opportunityId === opportunityId) : threads),
    [threads, opportunityId],
  )
}

export function usePaymentRequests(opportunityId?: string) {
  const requests = useStore((s) => s.paymentRequests)
  return useMemo(
    () => (opportunityId ? requests.filter((request) => request.opportunityId === opportunityId) : requests),
    [requests, opportunityId],
  )
}
