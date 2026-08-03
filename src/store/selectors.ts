import { useMemo } from 'react'
import { useStore } from './useStore'
import { checksForStage, type ReadinessInput } from '@/domain/readiness'
import type { StageId } from '@/domain/types'
import { USER_BY_ID, LOCATION_BY_ID } from '@/data/seed'

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
      materialOrder: s.materialOrders.find((m) => m.opportunityId === opportunityId),
      job: s.jobs.find((j) => j.opportunityId === opportunityId),
      invoices: s.invoices.filter((i) => i.opportunityId === opportunityId),
      changeOrders: s.changeOrders.filter((c) => c.opportunityId === opportunityId),
    } as ReadinessInput
  }, [
    opportunityId,
    s.opportunities,
    s.siteVisits,
    s.artifacts,
    s.estimates,
    s.checklists,
    s.materialOrders,
    s.jobs,
    s.invoices,
    s.changeOrders,
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
  return USER_BY_ID[viewerId]
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
export function routeZip(zip: string) {
  const prefix = zip.slice(0, 3)
  return Object.values(LOCATION_BY_ID).find((l) => l.zips.includes(prefix)) ?? null
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
