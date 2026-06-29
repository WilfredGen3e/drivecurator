import { useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export interface PwaUpdate {
  /** Er wordt op dit moment actief gezocht naar een nieuwe versie. */
  checking: boolean
  /** Vraagt de service worker actief om naar een nieuwe versie te zoeken. */
  checkForUpdate: () => void
  /**
   * Stil checken op een nieuwe versie zonder spinner. Bedoeld voor natuurlijke
   * grenzen (zoals net na inloggen) waar een eventueel herladen niemand stoort.
   */
  checkSilently: () => void
}

// Beheert PWA-updates in 'autoUpdate'-modus (zie vite.config.ts). Een nieuwe
// versie wordt automatisch geïnstalleerd en toegepast: de service worker
// activeert direct (skipWaiting) en vite-plugin-pwa herlaadt de pagina op de
// nieuwe versie. We checken bewust níét tijdens een actieve sessie (dat zou
// midden in de triage kunnen herladen), maar alleen op rustige momenten: bij
// een page-load checkt de SW al vanzelf, net na inloggen checken we expliciet
// (zie App.handleLogin), en op verzoek via de app-naam in de header. Zo blijft
// een geïnstalleerde PWA niet op een oude build hangen, zónder mid-sessie te
// herladen.
export function usePwaUpdate(): PwaUpdate {
  const [checking, setChecking] = useState(false)
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined)

  useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration ?? undefined
    },
  })

  const checkSilently = () => {
    void registrationRef.current?.update().catch(() => {})
  }

  const checkForUpdate = () => {
    setChecking(true)
    void registrationRef.current?.update().catch(() => {})
    // Vindt hij niets, dan zou de spinner anders blijven hangen; stop 'm zelf.
    // (Vindt hij wél een nieuwe versie, dan herlaadt de pagina vanzelf.)
    setTimeout(() => setChecking(false), 2500)
  }

  return { checking, checkForUpdate, checkSilently }
}
