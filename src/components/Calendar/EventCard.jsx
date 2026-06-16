import { parseServerDate } from '../../utils/parseServerDate'
import styles from './EventCard.module.css'

function formatTime(str) {
  if (!str) return ''
  try {
    return parseServerDate(str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return str
  }
}

function getDateParts(str) {
  if (!str) return { day: '--', month: '---' }
  try {
    const d = parseServerDate(str)
    return {
      day: d.getDate(),
      month: d.toLocaleString('default', { month: 'short' }).toUpperCase(),
    }
  } catch {
    return { day: '--', month: '---' }
  }
}

export default function EventCard({ event }) {
  const { day, month } = getDateParts(event.start_time || event.start)
  const start = formatTime(event.start_time || event.start)
  const end = formatTime(event.end_time || event.end)

  return (
    <div className={styles.card}>
      <div className={styles.dateBadge}>
        <span className={styles.month}>{month}</span>
        <span className={styles.day}>{day}</span>
      </div>

      <div className={styles.body}>
        <h4 className={styles.title}>{event.title || event.summary || 'Untitled Event'}</h4>
        <div className={styles.meta}>
          {start && (
            <span className={styles.time}>
              <ClockIcon />
              {start}{end ? ` – ${end}` : ''}
            </span>
          )}
          {event.location && (
            <span className={styles.location}>
              <LocationIcon />
              {event.location}
            </span>
          )}
        </div>
        {event.description && (
          <p className={styles.description}>{event.description}</p>
        )}
      </div>

      {event.attendees?.length > 0 && (
        <div className={styles.attendees}>
          {event.attendees.slice(0, 3).map((a, i) => (
            <div key={i} className={styles.attendeeChip}>
              {(a.name || a.email || a)[0]?.toUpperCase()}
            </div>
          ))}
          {event.attendees.length > 3 && (
            <span className={styles.moreAttendees}>+{event.attendees.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}
