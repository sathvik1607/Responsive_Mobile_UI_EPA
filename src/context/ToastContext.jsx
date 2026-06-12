import { createContext } from 'react'
import { useToast } from '../hooks/useToast'

export const ToastContext = createContext({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
})

export function ToastProvider({ children }) {
  const { toasts, addToast, removeToast } = useToast()

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}
