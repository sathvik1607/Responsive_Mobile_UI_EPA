import { useState, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { useSchedule } from '../../context/ScheduleContext'
import { useNotifications } from '../../context/NotificationContext'
import { parseServerDate } from '../../utils/parseServerDate'
import styles from './Sidebar.module.css'

// ── Today's Summary panel ─────────────────────────────────────────────────────

function TodayPanel() {
  const { todayMeetings, meetings, tasks, loaded } = useSchedule()
  const { userId } = useUser()

  const meetingCount = todayMeetings.length
  const taskCount    = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length

  const parts = []
  if (meetingCount > 0) parts.push(`${meetingCount} Meeting${meetingCount !== 1 ? 's' : ''}`)
  if (taskCount > 0)    parts.push(`${taskCount} Task${taskCount !== 1 ? 's' : ''}`)

  // Fallback: next soonest non-today meeting
  const nextMeeting = parts.length === 0
    ? [...meetings]
        .filter(m => !m.is_today && m.scheduled_at && parseServerDate(m.scheduled_at) > Date.now())
        .sort((a, b) => parseServerDate(a.scheduled_at) - parseServerDate(b.scheduled_at))[0]
    : null

  // Apply display title rule: member sees "Meeting with {owner_name}" for invited meetings
  const nextMeetingTitle = nextMeeting
    ? (nextMeeting.assigned_to_user_id === userId && nextMeeting.owner_name
        ? `Meeting with ${nextMeeting.owner_name}`
        : nextMeeting.title)
    : null

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <CalIcon />
        <span>Today</span>
      </div>

      {!loaded ? (
        <div className={styles.skeleton}>
          <div className={styles.skRow} />
          <div className={styles.skRow} style={{ width: '65%' }} />
        </div>
      ) : parts.length > 0 ? (
        <p className={styles.summaryLine}>{parts.join(' · ')}</p>
      ) : nextMeeting ? (
        <p className={styles.emptyMsg}>
          Next: {nextMeeting.time || ''} {nextMeetingTitle}
        </p>
      ) : (
        <p className={styles.emptyMsg}>No events today</p>
      )}
    </section>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────

const NAV = [
  { to: '/assistant',     label: 'Assistant',     icon: <ChatIcon /> },
  { to: '/schedule',      label: 'Schedule',      icon: <CalPlusIcon /> },
  { to: '/tasks',         label: 'Tasks',         icon: <TasksIcon /> },
  { to: '/requests',      label: 'Requests',      icon: <RequestsIcon /> },
  { to: '/notifications', label: 'Notifications', icon: <BellIcon /> },
  { to: '/context',       label: 'Memory',        icon: <BrainIcon /> },
]

// ── Delete Session confirmation ───────────────────────────────────────────────

function DeleteSessionButton() {
  const [confirming, setConfirming] = useState(false)

  const handleDelete = useCallback(() => {
    window.dispatchEvent(new CustomEvent('pa:delete-session'))
    setConfirming(false)
  }, [])

  if (confirming) {
    return (
      <div className={styles.deleteConfirm}>
        <p className={styles.deleteQuestion}>Delete this session?</p>
        <p className={styles.deleteHint}>All messages will be cleared.</p>
        <div className={styles.deleteActions}>
          <button className={styles.deleteCancelBtn} onClick={() => setConfirming(false)}>
            Cancel
          </button>
          <button className={styles.deleteConfirmBtn} onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      className={styles.deleteBtn}
      onClick={() => setConfirming(true)}
      title="Delete this chat session"
    >
      <TrashIcon />
      <span>Delete Session</span>
    </button>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export default function Sidebar() {
  const { user, logout } = useUser()
  const { unreadCount }  = useNotifications()
  const displayName = user?.name ?? 'User'
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <PaLogoSvg size={34} />
        <div className={styles.brandText}>
          <span className={styles.brandName}>Personal Assistant</span>
          <div className={styles.brandAIRow}>
            <span className={styles.brandAILine} />
            <span className={styles.brandAI}>AI · MEETINGS · TASKS</span>
            <span className={styles.brandAILine} />
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className={styles.content}>
        <TodayPanel />

        <div className={styles.divider} />
        <nav className={styles.nav}>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
              {item.to === '/notifications' && unreadCount > 0 && (
                <span className={styles.navBadge}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Delete Session */}
      <div className={styles.deleteZone}>
        <DeleteSessionButton />
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{initials}</div>
          <span className={styles.userName}>{displayName}</span>
        </div>
        <button className={styles.logoutBtn} onClick={logout} title="Sign out">
          <LogoutIcon />
        </button>
      </div>
    </aside>
  )
}

// ── PA brand SVG ──────────────────────────────────────────────────────────────

function PaLogoSvg({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="paGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2E3020"/>
          <stop offset="100%" stopColor="#3A3C26"/>
        </linearGradient>
      </defs>
      <rect width="200" height="200" rx="46" fill="url(#paGrad)"/>
      <rect x="7" y="7" width="186" height="186" rx="40" fill="none" stroke="rgba(201,162,39,0.28)" strokeWidth="1.5"/>
      <text x="44" y="134"
        fontFamily="'Helvetica Neue', Arial Black, Arial, sans-serif"
        fontSize="102" fontWeight="900"
        fill="#F0C84A"
        letterSpacing="-3">P</text>
      <text x="106" y="134"
        fontFamily="'Helvetica Neue', Arial Black, Arial, sans-serif"
        fontSize="102" fontWeight="900"
        fill="#C9A227"
        letterSpacing="-3">A</text>
      <circle cx="166" cy="40" r="7" fill="rgba(201,162,39,0.35)"/>
      <circle cx="166" cy="40" r="3.5" fill="#F0C84A"/>
      <circle cx="150" cy="30" r="2.5" fill="rgba(201,162,39,0.22)"/>
      <circle cx="176" cy="54" r="1.8" fill="rgba(201,162,39,0.22)"/>
    </svg>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CalIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
}
function ChatIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}
function CalPlusIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
}
function TasksIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><polyline points="4 6 5 7 7 5"/><polyline points="4 12 5 13 7 11"/><polyline points="4 18 5 19 7 17"/></svg>
}
function BrainIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}
function RequestsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="12" y1="7" x2="12" y2="13"/></svg>
}
function BellIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function LogoutIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
}
