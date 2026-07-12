/// <reference types="vite-plugin-pwa/react" />

import { evaluateUpdateSafety } from '@labs/pwa/client'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function AdminPwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  const safety = evaluateUpdateSafety({
    // Replace with real editor/upload/retry state.
    unsavedDrafts: 0,
    activeUploads: 0,
    pendingAutomaticRetries: 0,
    pendingManualRetries: 0,
  })

  if (!needRefresh && !offlineReady) return null

  return (
    <div role="status" aria-live="polite">
      <p>{needRefresh ? 'An update is ready.' : 'The admin shell is available offline.'}</p>
      {needRefresh && (
        <button
          type="button"
          disabled={!safety.canUpdateImmediately}
          onClick={() => void updateServiceWorker(true)}
        >
          Update now
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setNeedRefresh(false)
          setOfflineReady(false)
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
