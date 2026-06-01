import { useState, useEffect } from 'react'

export function useIsTouch() {
  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined') return false
    // ?touch=1 in URL = force touch mode for testing
    if (new URLSearchParams(window.location.search).get('touch') === '1') return true
    return navigator.maxTouchPoints > 0 || ('ontouchstart' in window)
  })

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get('touch') === '1'
    if (!forced) {
      setIsTouch(navigator.maxTouchPoints > 0 || ('ontouchstart' in window))
    }
  }, [])

  return isTouch
}
