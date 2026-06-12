import { useState, useCallback } from 'react'

export function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  // Use setStored's functional-updater form so React's state queue always
  // provides the latest value — never a stale closure snapshot.
  // localStorage.setItem runs inside the updater so it stays in sync with
  // whatever React ultimately commits.
  const setValue = useCallback((value) => {
    setStored(prev => {
      const next = value instanceof Function ? value(prev) : value
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch (err) {
        console.error('useLocalStorage write error:', err)
      }
      return next
    })
  }, [key])

  return [stored, setValue]
}
