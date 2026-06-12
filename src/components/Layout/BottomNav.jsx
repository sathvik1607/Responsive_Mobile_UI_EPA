import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import MoreSheet from './MoreSheet'
import styles from './BottomNav.module.css'

// Order: Assistant, Tasks, Schedule, Notifications, More
const NAV_LINKS = [
  { to: '/assistant',     label: 'Assistant', icon: <ChatIcon /> },
  { to: '/tasks',         label: 'Tasks',     icon: <TasksIcon /> },
  { to: '/schedule',      label: 'Schedule',  icon: <CalIcon /> },
  { to: '/notifications', label: 'Alerts',    icon: <BellIcon />, badge: true },
]

export default function BottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const { unreadCount } = useNotifications()

  return (
    <>
      <nav className={styles.nav}>
        {NAV_LINKS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.iconWrap}>
              <span className={styles.icon}>{item.icon}</span>
              {item.badge && unreadCount > 0 && (
                <span className={styles.badge}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <span className={styles.label}>{item.label}</span>
          </NavLink>
        ))}

        {/* More button */}
        <button
          className={`${styles.link} ${sheetOpen ? styles.active : ''}`}
          onClick={() => setSheetOpen(true)}
          aria-label="More options"
        >
          <span className={styles.iconWrap}>
            <span className={styles.icon}><MoreIcon /></span>
          </span>
          <span className={styles.label}>More</span>
        </button>
      </nav>

      <MoreSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChatIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function TasksIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><polyline points="4 6 5 7 7 5"/><polyline points="4 12 5 13 7 11"/><polyline points="4 18 5 19 7 17"/></svg>
}
function CalIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function BellIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function MoreIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
}
