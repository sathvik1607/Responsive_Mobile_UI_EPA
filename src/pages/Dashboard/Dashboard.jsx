import { useState, useEffect, useContext, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getEvents } from '../../services/calendarService'
import { checkHealth } from '../../services/userService'
import { useUser } from '../../context/UserContext'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import { ToastContext } from '../../context/ToastContext'
import styles from './Dashboard.module.css'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayStr() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

// Returns urgency tier based on minutes until event starts
function getUrgency(startStr) {
  const mins = (new Date(startStr) - Date.now()) / 60_000
  if (mins < -5)  return 'past'      // already over (or >5 min passed)
  if (mins <= 15) return 'now'       // starting right now / in 15 min
  if (mins <= 30) return 'urgent'    // 15–30 min  → orange
  if (mins <= 60) return 'soon'      // 30–60 min  → amber highlight
  return 'upcoming'                  // > 1 hr     → normal
}

function urgencyLabel(u) {
  if (u === 'now')    return { text: 'Starting now',   color: '#ef4444' }
  if (u === 'urgent') return { text: 'In < 30 min',    color: '#f97316' }
  if (u === 'soon')   return { text: 'Within the hour', color: '#c9a227' }
  return null
}

function fmtTime(str) {
  if (!str) return ''
  try { return new Date(str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  catch { return str }
}

function getCountdown(dateStr) {
  const diff = new Date(dateStr) - Date.now()
  if (diff <= 0) return 'Starting now'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0)  return `${h}h ${m}m`
  return `${m}m`
}

export default function Dashboard() {
  const [events, setEvents]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [apiOnline, setApiOnline] = useState(null)
  const [now, setNow]           = useState(new Date())
  const { addToast } = useContext(ToastContext)
  const { userId } = useUser()

  const fetchEvents = useCallback(() => {
    getEvents(userId).then(setEvents).catch(() => {})
  }, [userId])

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    Promise.allSettled([
      getEvents(userId).then(setEvents),
      checkHealth().then(() => setApiOnline(true)).catch(() => setApiOnline(false)),
    ]).finally(() => setLoading(false))
  }, [userId])

  // Re-fetch when chat creates/updates/cancels anything
  useEffect(() => {
    window.addEventListener('pa:refresh-schedule', fetchEvents)
    return () => window.removeEventListener('pa:refresh-schedule', fetchEvents)
  }, [fetchEvents])

  // Live-tick every 30 s so urgency badges + countdown stay fresh
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const todayStr2 = now.toDateString()
  const todaysEvents = events
    .filter((e) => {
      const d = new Date(e.start_time || e.start)
      return !isNaN(d) && d.toDateString() === todayStr2
    })
    .sort((a, b) => new Date(a.start_time || a.start) - new Date(b.start_time || b.start))

  const upcomingEvents = events
    .filter((e) => new Date(e.start_time || e.start) > now)
    .sort((a, b) => new Date(a.start_time || a.start) - new Date(b.start_time || b.start))
    .slice(0, 3)

  const nextEvent = upcomingEvents[0]

  // Events that need dashboard-level attention (within 1 hour)
  const alertEvents = todaysEvents.filter((e) => {
    const u = getUrgency(e.start_time || e.start)
    return u === 'now' || u === 'urgent' || u === 'soon'
  })

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className={styles.date}>{todayStr()}</p>
          <h1 className={styles.greeting}>{getGreeting()} 👋</h1>
          <p className={styles.subtitle}>Here's your day at a glance.</p>
        </div>
        <div className={`${styles.statusBadge} ${apiOnline === false ? styles.offline : styles.online}`}>
          <span className={styles.dot} />
          {apiOnline === null ? 'Checking…' : apiOnline ? 'Assistant Online' : 'Assistant Offline'}
        </div>
      </div>

      {/* Quick stats */}
      <div className={styles.statsGrid}>
        <StatCard icon="📅" label="Today's Events" value={loading ? '—' : todaysEvents.length} color="accent" />
        <StatCard icon="⏭️" label="Upcoming"       value={loading ? '—' : upcomingEvents.length} color="success" />
        <StatCard icon="📋" label="Total Events"   value={loading ? '—' : events.length}        color="warning" />
        <StatCard
          icon="🤖" label="AI Status"
          value={apiOnline === null ? '…' : apiOnline ? 'Ready' : 'Offline'}
          color={apiOnline ? 'success' : 'error'}
        />
      </div>

      {/* Urgent / soon alert strip */}
      {!loading && alertEvents.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>⚠️ Needs Attention</h2>
          <div className={styles.alertStrip}>
            {alertEvents.map((e, i) => {
              const urgency = getUrgency(e.start_time || e.start)
              const badge   = urgencyLabel(urgency)
              const start   = fmtTime(e.start_time || e.start)
              return (
                <div key={e.id || i} className={`${styles.alertCard} ${styles[`alert_${urgency}`]}`}>
                  <div className={styles.alertPulse} />
                  <div className={styles.alertMeta}>
                    {badge && (
                      <span className={styles.alertBadge} style={{ color: badge.color }}>
                        {badge.text}
                      </span>
                    )}
                    <span className={styles.alertTime}>{start}</span>
                  </div>
                  <p className={styles.alertTitle}>{e.title || e.summary || 'Untitled'}</p>
                  {e.location && <p className={styles.alertLocation}>📍 {e.location}</p>}
                  <div className={styles.alertCountdown}>
                    {urgency !== 'past' ? getCountdown(e.start_time || e.start) : 'In progress'}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Timeline — Today's Schedule */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Today's Schedule</h2>
          <Link to="/calendar" className={styles.seeAll}>See all →</Link>
        </div>

        {loading ? (
          <div className={styles.loadingCenter}><LoadingSpinner size={28} /></div>
        ) : todaysEvents.length === 0 ? (
          <div className={styles.emptyDay}>
            <span>🌿</span>
            <p>No events today. A calm day ahead.</p>
            <Link to="/schedule" className={styles.scheduleBtn}>Schedule something →</Link>
          </div>
        ) : (
          <Timeline events={todaysEvents} now={now} />
        )}
      </section>

      {/* Quick actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <Link to="/assistant"  className={styles.actionCard}><span className={styles.actionIcon}>💬</span><span className={styles.actionLabel}>Chat with PA</span><span className={styles.actionArrow}>→</span></Link>
          <Link to="/schedule"   className={styles.actionCard}><span className={styles.actionIcon}>📆</span><span className={styles.actionLabel}>Schedule Meeting</span><span className={styles.actionArrow}>→</span></Link>
          <Link to="/free-slots" className={styles.actionCard}><span className={styles.actionIcon}>🕐</span><span className={styles.actionLabel}>Find Free Slots</span><span className={styles.actionArrow}>→</span></Link>
          <Link to="/calendar"   className={styles.actionCard}><span className={styles.actionIcon}>📋</span><span className={styles.actionLabel}>View Calendar</span><span className={styles.actionArrow}>→</span></Link>
        </div>
      </section>
    </div>
  )
}

// ── Timeline component ────────────────────────────────────────────────────────

function Timeline({ events, now }) {
  // Find where "now" sits between events for the NOW marker
  const nowTime = now.getTime()

  return (
    <div className={styles.timeline}>
      {/* Vertical track */}
      <div className={styles.timelineTrack} />

      {events.map((e, i) => {
        const startStr = e.start_time || e.start
        const endStr   = e.end_time   || e.end
        const urgency  = getUrgency(startStr)
        const badge    = urgencyLabel(urgency)
        const start    = fmtTime(startStr)
        const end      = fmtTime(endStr)
        const isPast   = urgency === 'past'

        // Insert NOW marker before the first future event
        const showNowMarker = i > 0 &&
          new Date(events[i - 1].start_time || events[i - 1].start).getTime() < nowTime &&
          new Date(startStr).getTime() > nowTime

        return (
          <div key={e.id || i}>
            {showNowMarker && <NowMarker time={now} />}
            <div className={`${styles.timelineItem} ${isPast ? styles.pastItem : ''}`}>
              {/* Dot on track */}
              <div className={`${styles.timelineDot} ${styles[`dot_${urgency}`]}`} />

              {/* Time label */}
              <div className={styles.timelineTime}>{start}</div>

              {/* Event card */}
              <div className={`${styles.timelineCard} ${styles[`card_${urgency}`]}`}>
                {badge && (
                  <span className={styles.timelineBadge} style={{ color: badge.color, borderColor: badge.color }}>
                    {badge.text}
                  </span>
                )}
                <div className={styles.timelineCardTitle}>
                  {e.title || e.summary || 'Untitled'}
                </div>
                <div className={styles.timelineCardMeta}>
                  <span>🕐 {start}{end ? ` – ${end}` : ''}</span>
                  {e.location && <span>📍 {e.location}</span>}
                </div>
                {e.attendees?.length > 0 && (
                  <div className={styles.timelineAttendees}>
                    {e.attendees.slice(0, 4).map((a, j) => (
                      <div key={j} className={styles.timelineAvatar}>
                        {(a.name || a.email || a)[0]?.toUpperCase()}
                      </div>
                    ))}
                    {e.attendees.length > 4 && (
                      <span className={styles.moreAvatars}>+{e.attendees.length - 4}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NowMarker({ time }) {
  return (
    <div className={styles.nowMarker}>
      <div className={styles.nowDot} />
      <div className={styles.nowLine} />
      <span className={styles.nowLabel}>
        NOW · {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`${styles.statCard} ${styles[`color_${color}`]}`}>
      <span className={styles.statIcon}>{icon}</span>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  )
}
