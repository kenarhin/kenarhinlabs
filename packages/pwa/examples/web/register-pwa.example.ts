/// <reference types="vite-plugin-pwa/client" />

/**
 * Registers the public service worker once from the consuming app shell.
 *
 * @returns The Vite PWA update callback, or undefined during server rendering.
 */
export async function registerPublicPwa() {
  if (typeof window === 'undefined') return

  const { registerSW } = await import('virtual:pwa-register')
  return registerSW({
    immediate: true,
    onRegisterError(error) {
      console.error('Public PWA registration failed', error)
    },
  })
}
