import { useState, useEffect } from 'react'

export function useIsTouch() {
  const [isTouch, setIsTouch] = useState(
    () => typeof window !== 'undefined' && navigator.maxTouchPoints > 0
  )
  useEffect(() => {
    // maxTouchPoints is static — no listener needed
    setIsTouch(navigator.maxTouchPoints > 0)
  }, [])
  return isTouch
}
