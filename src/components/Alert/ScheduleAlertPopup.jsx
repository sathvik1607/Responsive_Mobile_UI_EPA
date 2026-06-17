import { useState, useEffect } from 'react'
import { useScheduleAlerts } from '../../hooks/useScheduleAlerts'
import styles from './ScheduleAlertPopup.module.css'

// Schedule times (due_at, scheduled_at) are stored as server local time — NOT UTC.
// Never use parseServerDate here; that appends Z and shifts times 5.5 h forward.
const parseScheduleTime = (str) => {
  if (!str) return new Date(NaN)
  return new Date(String(str).replace(' ', 'T'))
}

export default function ScheduleAlertPopup() {
  const { queue, dismiss, complete } = useScheduleAlerts()
  const [busy, setBusy] = useState(false)
  const item = queue[0] ?? null

  // Reset busy whenever the queue advances to a new item (must be before any early return)
  useEffect(() => { if (item) setBusy(false) }, [item?._alertKey])

  if (!item) return null

  const isMeeting = item._type === 'meeting'

  const handleComplete = async () => {
    setBusy(true)
    await complete(item)
    setBusy(false)
  }

  const handleDismiss = () => dismiss(item._alertKey)

  // ── Determine label / question based on context ───────────────────────
  let icon      = isMeeting ? '📅' : '✅'
  let typeLabel = isMeeting ? 'Meeting' : 'Task'
  let subtitle  = null
  let question  = isMeeting ? 'Did you attend this meeting?' : 'Did you complete this task?'
  let yesLabel  = isMeeting ? 'Yes, attended!' : 'Yes, done!'
  const isUpcomingMeeting = isMeeting && !item._isPast

  if (isUpcomingMeeting) {
    const mins = Math.max(1, Math.round((parseScheduleTime(item.scheduled_at) - Date.now()) / 60_000))
    question = `Starting in ${mins} minute${mins !== 1 ? 's' : ''}`
    yesLabel = 'Got it'
  } else if (item._assigned_by_owner) {
    subtitle = `Assigned to you by ${item._owner_name}`
    question = 'Have you completed this task?'
    yesLabel = 'Yes, done!'
  } else if (item._assigned_to_member) {
    subtitle = `Assigned to ${item._member_name}`
    question = `Has ${item._member_name} completed this?`
    yesLabel = 'Mark done'
    icon     = '📋'
  }

  return (
    <div className={styles.popup} role="alertdialog" aria-live="assertive">
      <div className={styles.topRow}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.type}>{typeLabel}</span>
        {queue.length > 1 && (
          <span className={styles.more}>+{queue.length - 1} more</span>
        )}
      </div>

      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}

      <p className={styles.question}>{question}</p>
      <p className={styles.title}>{item.title}</p>

      {(item.scheduled_at || item.due_at) && (
        <p className={styles.time}>
          {fmtTime(item.scheduled_at || item.due_at)}
        </p>
      )}

      <div className={styles.actions}>
        <button
          className={styles.yesBtn}
          onClick={isUpcomingMeeting ? handleDismiss : handleComplete}
          disabled={busy}
        >
          {busy ? 'Marking…' : yesLabel}
        </button>
        <button
          className={styles.noBtn}
          onClick={handleDismiss}
          disabled={busy}
        >
          {isUpcomingMeeting ? 'Dismiss' : 'Not yet'}
        </button>
      </div>
    </div>
  )
}

function fmtTime(iso) {
  try {
    return parseScheduleTime(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', weekday: 'short',
    })
  } catch { return '' }
}
