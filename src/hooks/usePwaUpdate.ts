import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export interface PwaUpdate {
  /** Er wordt op dit moment actief gezocht naar een nieuwe versie. */
  checking: boolean
  /** Vraagt de service worker actief om naar een nieuwe versie te zoeken. */
  checkForUpdate: () => void
}

// Beheert PWA-updates in 'autoUpdate'-modus (zie vite.config.ts). Een nieuwe
// versie wordt automatisch geïnstalleerd en toegepast: de service worker
// activeert direct (skipWaiting) en vite-plugin-pwa herlaadt de pagina op de
// nieuwe versie. We hoeven dus niets handmatig toe te passen — we checken alleen
// op het juiste moment: bij het (her)openen van de app en op verzoek via de
// app-naam in de header. Zo blijft een geïnstalleerde PWA niet op een oude build
// hangen, zónder mid-sessie te herladen.
export function usePwaUpdate(): PwaUpdate {
  const [checking, setChecking] = useState(false)
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined)

  useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration ?? undefined
    },
  })

  // Bij terugkeer naar de app (PWA heropend of tab weer zichtbaar) checken op een
  // nieuwe versie. Wordt er een gevonden, dan past autoUpdate 'm toe en herlaadt.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') registrationRef.current?.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const checkForUpdate = () => {
    setChecking(true)
    void registrationRef.current?.update().catch(() => {})
    // Vindt hij niets, dan zou de spinner anders blijven hangen; stop 'm zelf.
    // (Vindt hij wél een nieuwe versie, dan herlaadt de pagina vanzelf.)
    setTimeout(() => setChecking(false), 2500)
  }

  return { checking, checkForUpdate }
}
