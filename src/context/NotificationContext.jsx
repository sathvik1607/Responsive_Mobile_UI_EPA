// NotificationContext — polls for unread notifications on a 15 s interval.
// Key design decisions:
//   - seenIdsRef: tracks IDs across polls so sound/toasts only fire for genuinely new items.
//   - initializedRef: silently seeds seenIdsRef on the first poll so existing notifications
//     at login time don't trigger a burst of sounds and toasts.
//   - Idle detection: polling pauses when the tab is hidden or the user hasn't interacted
//     for 60 s to avoid unnecessary backend load.

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getNotifications, markNotificationRead, markAllRead } from '../services/notificationService'
import { useUser } from './UserContext'
import { ToastContext } from './ToastContext'
import { playNotificationSound } from '../utils/notificationSound'

const NotificationContext = createContext(null)

export function useNotifications() {
  return useContext(NotificationContext)
}

const POLL_INTERVAL  = 15_000  // ms between polls when active
const IDLE_THRESHOLD = 60_000  // ms without mouse/keyboard = idle

// Only these notification types get a toast popup; others only update the badge count
const TOAST_TYPES = new Set(['task_completed', 'update_response', 'task_assigned', 'task_reminder'])

export function NotificationProvider({ children }) {
  const { userId } = useUser()
  const { addToast } = useContext(ToastContext)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const lastActivity   = useRef(Date.now())
  const seenIdsRef     = useRef(new Set())
  const initializedRef = useRef(false) // true after the first poll seeds seenIdsRef

  // Track last user interaction to detect idle state
  useEffect(() => {
    const touch = () => { lastActivity.current = Date.now() }
    window.addEventListener('mousemove', touch)
    window.addEventListener('keypress', touch)
    return () => {
      window.removeEventListener('mousemove', touch)
      window.removeEventListener('keypress', touch)
    }
  }, [])

  const pollUnread = useCallback(async () => {
    if (!userId) return
    try {
      const all    = await getNotifications(userId, false)
      const unread = all.filter(n => !n.is_read)

      if (!initializedRef.current) {
        // First poll: silently seed seenIdsRef — no sound, no toasts for pre-existing items
        unread.forEach(n => seenIdsRef.current.add(n.id))
        initializedRef.current = true
      } else {
        // Subsequent polls: only react to IDs we haven't seen before
        const fresh = unread.filter(n => !seenIdsRef.current.has(n.id))
        if (fresh.length > 0) {
          let soundPlayed = false
          fresh.forEach(n => {
            // Play sound once per batch regardless of how many new notifications arrived
            if (!soundPlayed) { playNotificationSound(); soundPlayed = true }
            if (TOAST_TYPES.has(n.type)) addToast(n.message, 'info', 6000)
          })
          fresh.forEach(n => seenIdsRef.current.add(n.id))
        }
      }

      setUnreadCount(unread.length)
      setNotifications(all)
    } catch { /* network blip — ignore, badge stays at last known value */ }
  }, [userId, addToast])

  // refresh() is an alias for pollUnread so the Notifications page can call it directly
  const refresh = pollUnread

  // Start polling on login; stop and clear state on logout
  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      seenIdsRef.current     = new Set()
      initializedRef.current = false
      return
    }

    pollUnread() // immediate fetch on login

    const id = setInterval(() => {
      const idle   = Date.now() - lastActivity.current > IDLE_THRESHOLD
      const hidden = document.visibilityState === 'hidden'
      // Skip poll when tab is hidden or user has been idle — reduces unnecessary requests
      if (!idle && !hidden) pollUnread()
    }, POLL_INTERVAL)

    return () => clearInterval(id)
  }, [userId, pollUnread])

  const markRead = useCallback(async (notifId) => {
    if (!userId) return
    try {
      await markNotificationRead(notifId, userId)
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, is_read: 1 } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }, [userId])

  const markAll = useCallback(async () => {
    if (!userId) return
    try {
      await markAllRead(userId)
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }, [userId])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      refresh,
      markRead,
      markAll,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}
