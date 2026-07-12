export async function registerPublicPwa() {
  if (typeof window === 'undefined') return

  const { registerSW } = await import('virtual:pwa-register')
  return registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      // Wire registration to startPeriodicServiceWorkerUpdateChecks from @labs/pwa/client.
      console.info('Public PWA registered', registration)
    },
    onRegisterError(error) {
      console.error('Public PWA registration failed', error)
    },
  })
}
