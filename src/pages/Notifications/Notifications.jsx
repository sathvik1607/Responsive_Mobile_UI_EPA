import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import { parseServerDate } from '../../utils/parseServerDate'
import styles from './Notifications.module.css'

function fmtRelative(str) {
  if (!str) return ''
  const diff = Date.now() - parseServerDate(str).getTime()
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

const TYPE_LABELS = {
  update_request:  'Update Requested',
  update_response: 'Response Received',
  task_completed:  'Task Completed',
  task_assigned:   'Task Assigned',
  task_reminder:   'Task Reminder',
}

export default function Notifications() {
  const { notifications, unreadCount, refresh, markRead, markAll } = useNotifications()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
        {unreadCount > 0 && (
          <button className={styles.markAllBtn} onClick={markAll}>
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <p className={styles.muted}>Loading…</p>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔔</span>
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map(n => (
            <div
              key={n.id}
              className={`${styles.card} ${!n.is_read ? styles.unread : ''}`}
              onClick={() => { if (!n.is_read) markRead(n.id) }}
            >
              <div className={styles.cardLeft}>
                <span className={`${styles.typeBadge} ${styles[`type_${n.type}`]}`}>
                  {TYPE_LABELS[n.type] || n.type}
                </span>
                <p className={styles.message}>{n.message}</p>
                {n.type === 'update_request' && (
                  <Link
                    to="/requests"
                    className={styles.respondLink}
                    onClick={e => { e.stopPropagation(); if (!n.is_read) markRead(n.id) }}
                  >
                    Respond →
                  </Link>
                )}
              </div>
              <div className={styles.cardRight}>
                <span className={styles.time}>{fmtRelative(n.created_at)}</span>
                {!n.is_read && <span className={styles.dot} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
