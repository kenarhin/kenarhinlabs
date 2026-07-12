export interface UpdateSafetyInput {
  unsavedDrafts?: number
  activeUploads?: number
  pendingAutomaticRetries?: number
  pendingManualRetries?: number
  criticalOperationInProgress?: boolean
}

export type UpdateBlockReason =
  | 'unsaved-drafts'
  | 'active-uploads'
  | 'pending-automatic-retries'
  | 'pending-manual-retries'
  | 'critical-operation'

export interface UpdateSafetyDecision {
  canUpdateImmediately: boolean
  reasons: UpdateBlockReason[]
}

export function evaluateUpdateSafety(input: UpdateSafetyInput): UpdateSafetyDecision {
  const reasons: UpdateBlockReason[] = []

  if ((input.unsavedDrafts ?? 0) > 0) reasons.push('unsaved-drafts')
  if ((input.activeUploads ?? 0) > 0) reasons.push('active-uploads')
  if ((input.pendingAutomaticRetries ?? 0) > 0) reasons.push('pending-automatic-retries')
  if ((input.pendingManualRetries ?? 0) > 0) reasons.push('pending-manual-retries')
  if (input.criticalOperationInProgress) reasons.push('critical-operation')

  return {
    canUpdateImmediately: reasons.length === 0,
    reasons,
  }
}

export interface PeriodicUpdateOptions {
  intervalMs?: number
  updateWhenHidden?: boolean
  updateWhenOffline?: boolean
}

export function startPeriodicServiceWorkerUpdateChecks(
  registration: ServiceWorkerRegistration,
  options: PeriodicUpdateOptions = {},
): () => void {
  if (typeof window === 'undefined') return () => undefined

  const intervalMs = Math.max(options.intervalMs ?? 60 * 60 * 1000, 60 * 1000)

  const check = async () => {
    if (!options.updateWhenHidden && document.visibilityState !== 'visible') return
    if (!options.updateWhenOffline && !navigator.onLine) return

    try {
      await registration.update()
    } catch {
      // Registration update failures are non-fatal and should be surfaced by the app's observability layer.
    }
  }

  const intervalId = window.setInterval(() => void check(), intervalMs)
  const onVisible = () => {
    if (document.visibilityState === 'visible') void check()
  }
  const onOnline = () => void check()

  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)

  return () => {
    window.clearInterval(intervalId)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onOnline)
  }
}
