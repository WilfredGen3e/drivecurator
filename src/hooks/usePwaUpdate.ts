import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export interface PwaUpdate {
  /** Er staat een nieuwe versie klaar om toe te passen. */
  needRefresh: boolean
  /** Er wordt op dit moment actief gezocht naar een nieuwe versie. */
  checking: boolean
  /** Past de wachtende update toe en herlaadt op de nieuwe versie. */
  applyUpdate: () => void
  /** Vraagt de service worker actief om naar een nieuwe versie te zoeken. */
  checkForUpdate: () => void
}

// Beheert PWA-updates: detecteert een wachtende nieuwe versie, checkt bij het
// heropenen van de (geïnstalleerde) app, en past de update op verzoek toe. Zo
// blijft een geïnstalleerde PWA niet op een oude buildversie hangen.
export function usePwaUpdate(): PwaUpdate {
  const [checking, setChecking] = useState(false)
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration ?? undefined
      // Periodiek (elk uur) checken op een nieuwe versie zolang de app open is.
      if (registration) {
        setInterval(() => { registration.update().catch(() => {}) }, 60 * 60 * 1000)
      }
    },
  })

  // Zodra een update klaarstaat, stopt de "checken"-indicatie.
  useEffect(() => { if (needRefresh) setChecking(false) }, [needRefresh])

  // Bij terugkeer naar de app (PWA heropend of tab weer zichtbaar) opnieuw checken.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') registrationRef.current?.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const applyUpdate = () => { void updateServiceWorker(true) }

  const checkForUpdate = () => {
    setChecking(true)
    void registrationRef.current?.update().catch(() => {})
    // Vindt hij niets, dan zou de spinner anders blijven hangen; stop 'm zelf.
    setTimeout(() => setChecking(false), 2500)
  }

  return { needRefresh, checking, applyUpdate, checkForUpdate }
}
