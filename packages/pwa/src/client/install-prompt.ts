export type InstallPromptOutcome = 'accepted' | 'dismissed' | 'unavailable'

export interface BeforeInstallPromptEventLike extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

export interface InstallPromptState {
  available: boolean
  installed: boolean
  dismissed: boolean
}

export interface InstallPromptController {
  start(): void
  stop(): void
  getState(): InstallPromptState
  subscribe(listener: (state: InstallPromptState) => void): () => void
  prompt(): Promise<InstallPromptOutcome>
}

function readStandaloneState(): boolean {
  if (typeof window === 'undefined') return false

  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const fullscreenMedia = window.matchMedia?.('(display-mode: fullscreen)').matches ?? false
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)

  return standaloneMedia || fullscreenMedia || iosStandalone
}

export function createInstallPromptController(): InstallPromptController {
  let deferredPrompt: BeforeInstallPromptEventLike | null = null
  let started = false
  let state: InstallPromptState = {
    available: false,
    installed: readStandaloneState(),
    dismissed: false,
  }
  const listeners = new Set<(state: InstallPromptState) => void>()

  const emit = () => {
    const snapshot = { ...state }
    for (const listener of listeners) listener(snapshot)
  }

  const onBeforeInstallPrompt = (event: Event) => {
    const promptEvent = event as BeforeInstallPromptEventLike
    promptEvent.preventDefault()
    deferredPrompt = promptEvent
    state = { available: true, installed: false, dismissed: false }
    emit()
  }

  const onInstalled = () => {
    deferredPrompt = null
    state = { available: false, installed: true, dismissed: false }
    emit()
  }

  return {
    start() {
      if (started || typeof window === 'undefined') return
      started = true
      window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.addEventListener('appinstalled', onInstalled)
      state = { ...state, installed: readStandaloneState() }
      emit()
    },

    stop() {
      if (!started || typeof window === 'undefined') return
      started = false
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      deferredPrompt = null
    },

    getState() {
      return { ...state }
    },

    subscribe(listener) {
      listeners.add(listener)
      listener({ ...state })
      return () => listeners.delete(listener)
    },

    async prompt() {
      if (!deferredPrompt) return 'unavailable'

      const currentPrompt = deferredPrompt
      deferredPrompt = null
      await currentPrompt.prompt()
      const choice = await currentPrompt.userChoice

      state = {
        available: false,
        installed: choice.outcome === 'accepted' || readStandaloneState(),
        dismissed: choice.outcome === 'dismissed',
      }
      emit()
      return choice.outcome
    },
  }
}

export function isRunningStandalone(): boolean {
  return readStandaloneState()
}
