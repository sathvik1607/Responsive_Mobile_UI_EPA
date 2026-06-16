import { useContext, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ToastContainer from '../Common/Toast'
import ScheduleAlertPopup from '../Alert/ScheduleAlertPopup'
import { ToastContext } from '../../context/ToastContext'
import { useUser } from '../../context/UserContext'
import api from '../../services/api'
import { playNotificationSound } from '../../utils/notificationSound'
import styles from './Layout.module.css'

const PROACTIVE_POLL = 2_000
const NOTIF_POLL = 5_000

export default function Layout() {
  const { toasts, removeToast } = useContext(ToastContext)
  const { userId } = useUser()

  // Global proactive message polling — runs on every page.
  // After delivering live messages, immediately marks all current unread DB
  // notification IDs as "shown" so the 5 s injector below doesn't re-show them.
  useEffect(() => {
    if (!userId) return
    const shownKey = `pa_shown_notifications_${userId}`

    const markCurrentNotificationsShown = async () => {
      try {
        const { data } = await api.get(`/notifications/${userId}?unread_only=true`)
        const notifications = Array.isArray(data) ? data : []
        if (!notifications.length) return
        const shown = new Set(JSON.parse(localStorage.getItem(shownKey) || '[]'))
        notifications.forEach(n => shown.add(n.id))
        localStorage.setItem(shownKey, JSON.stringify([...shown]))
      } catch { /* ignore */ }
    }

    const bufferKey = `pa_pending_chat_${userId}`
    const bufferMessages = (msgs) => {
      try {
        const existing = JSON.parse(localStorage.getItem(bufferKey) || '[]')
        localStorage.setItem(bufferKey, JSON.stringify([...existing, ...msgs]))
      } catch { /* ignore */ }
    }

    const fetchProactive = async () => {
      try {
        const { data } = await api.get(`/proactive-chat/${userId}`)
        if (data.messages?.length) {
          playNotificationSound()
          window.dispatchEvent(new CustomEvent('pa:refresh-schedule'))
          // Buffer first so the event handler (if on chat page) can clear it;
          // if user is on another page the buffer persists until chat mounts.
          bufferMessages(data.messages)
          window.dispatchEvent(new CustomEvent('pa:proactive-messages', { detail: data.messages }))
          // Pre-mark DB notifications as shown so the injector doesn't duplicate them
          await markCurrentNotificationsShown()
        }
      } catch { /* ignore */ }
    }
    fetchProactive()
    const id = setInterval(fetchProactive, PROACTIVE_POLL)
    return () => clearInterval(id)
  }, [userId])

  // Unread DB notification injection — fallback for missed proactive messages
  // (server restart, user offline). Runs every 5 s on every page.
  // Skips any notification whose ID was already marked shown by the proactive poller.
  useEffect(() => {
    if (!userId) return
    const shownKey = `pa_shown_notifications_${userId}`

    const SCHEDULE_TYPES = new Set(['meeting_update', 'task_assigned', 'task_completed'])

    const injectUnread = async () => {
      try {
        const { data } = await api.get(`/notifications/${userId}?unread_only=true`)
        const notifications = Array.isArray(data) ? data : []
        const shown = new Set(JSON.parse(localStorage.getItem(shownKey) || '[]'))
        const toShow = notifications.filter(n => !shown.has(n.id))
        if (toShow.length === 0) return
        const messages = toShow.map(n => n.message)
        playNotificationSound()
        // Refresh schedule if any notification affects meetings or assigned tasks
        if (toShow.some(n => SCHEDULE_TYPES.has(n.type))) {
          window.dispatchEvent(new CustomEvent('pa:refresh-schedule'))
        }
        // Buffer before dispatching so the chat page can drain on mount if needed
        try {
          const chatBufKey = `pa_pending_chat_${userId}`
          const existing = JSON.parse(localStorage.getItem(chatBufKey) || '[]')
          localStorage.setItem(chatBufKey, JSON.stringify([...existing, ...messages]))
        } catch { /* ignore */ }
        window.dispatchEvent(new CustomEvent('pa:proactive-messages', { detail: messages }))
        toShow.forEach(n => shown.add(n.id))
        localStorage.setItem(shownKey, JSON.stringify([...shown]))
      } catch { /* ignore */ }
    }
    injectUnread()
    const id = setInterval(injectUnread, NOTIF_POLL)
    return () => clearInterval(id)
  }, [userId])

  return (
    <div className={styles.root}>
      <div className={styles.sidebar}>
        <Sidebar />
      </div>

      <main className={styles.main}>
        <Outlet />
      </main>

      <div className={styles.bottomNav}>
        <BottomNav />
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ScheduleAlertPopup />
    </div>
  )
}
