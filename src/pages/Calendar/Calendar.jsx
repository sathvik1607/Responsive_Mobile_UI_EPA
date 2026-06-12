// Calendar page — frontend-only month grid using data already in ScheduleContext.
// No new API calls; meetings and tasks are normalised into a unified list and grouped
// by YYYY-MM-DD key so each day cell can display coloured dot indicators.
// Tapping a day reveals a detail panel that slides in below the grid.

import { useState, useMemo } from 'react'
import { useSchedule } from '../../context/ScheduleContext'
import styles from './Calendar.module.css'

const PRIORITY_LABEL = { low: 'Low', medium: 'Med', high: 'High' }
const STATUS_LABEL   = { pending: 'Pending', in_progress: 'In Progress', completed: 'Done', scheduled: 'Scheduled' }

// ── Helpers ───────────────────────────────────────────────────────────────────

const dedup = (arr) => [...new Map(arr.map(t => [t.id, t])).values()]

// Tries multiple date field names in priority order.
// For tasks, falls back to is_today / is_tomorrow boolean flags when no ISO date exists.
// Returns null (and item is skipped) if no parseable date can be found.
function resolveDate(item, isTask = false) {
  const d = new Date(item.scheduled_at || item.due_date || item.due_at || item.start_time || item.start)
  if (!isNaN(d)) return d
  if (isTask) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (item.is_today)    return today
    if (item.is_tomorrow) { const t = new Date(today); t.setDate(t.getDate() + 1); return t }
  }
  return null
}

function normalizeItems(meetings, tasks, assignedTasks) {
  const items = []
  for (const m of meetings) {
    const d = resolveDate(m)
    if (d) items.push({ id: `m-${m.id}`, title: m.title, date: d, type: 'meeting', raw: m })
  }
  for (const t of dedup([...tasks, ...assignedTasks])) {
    const d = resolveDate(t, true)
    if (d) items.push({ id: `t-${t.id}`, title: t.title, date: d, type: 'task', raw: t })
  }
  return items
}

// Groups items into a map keyed by YYYY-MM-DD.
// en-CA locale produces ISO-format dates (YYYY-MM-DD) without needing manual formatting.
function byDay(items) {
  const map = {}
  for (const item of items) {
    const key = item.date.toLocaleDateString('en-CA')
    ;(map[key] = map[key] || []).push(item)
  }
  return map
}

function dayKey(date) {
  return date.toLocaleDateString('en-CA') // YYYY-MM-DD
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Calendar() {
  const { meetings, tasks, assignedTasks, loaded } = useSchedule()

  const [displayMonth, setDisplayMonth] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
  })
  const [selectedDay, setSelectedDay] = useState(null)

  const allItems = useMemo(
    () => normalizeItems(meetings, tasks, assignedTasks),
    [meetings, tasks, assignedTasks]
  )
  const dayMap = useMemo(() => byDay(allItems), [allItems])

  const year  = displayMonth.getFullYear()
  const month = displayMonth.getMonth()
  const monthKey     = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthItems   = allItems.filter(i => i.date.toLocaleDateString('en-CA').startsWith(monthKey))
  const meetingCount = monthItems.filter(i => i.type === 'meeting').length
  const taskCount    = monthItems.filter(i => i.type === 'task').length

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const todayKey     = dayKey(new Date())

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const monthLabel    = displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const selectedItems = selectedDay ? (dayMap[dayKey(selectedDay)] || []) : []

  function handleDayClick(date) {
    if (!date) return
    setSelectedDay(prev => prev && dayKey(prev) === dayKey(date) ? null : date)
  }

  function goToToday() {
    const t = new Date(); t.setDate(1); t.setHours(0, 0, 0, 0)
    setDisplayMonth(t)
    const td = new Date(); td.setHours(0, 0, 0, 0)
    setSelectedDay(td)
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendar</h1>
          <p className={styles.subtitle}>
            {loaded
              ? `${meetingCount} meeting${meetingCount !== 1 ? 's' : ''} · ${taskCount} task${taskCount !== 1 ? 's' : ''} this month`
              : 'Loading…'}
          </p>
        </div>
        <div className={styles.countBadge}>{monthItems.length}</div>
      </div>

      {/* Month navigation */}
      <div className={styles.monthNav}>
        <button
          className={styles.navBtn}
          onClick={() => setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          <ChevronIcon dir="left" />
        </button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <div className={styles.navRight}>
          <button className={styles.todayBtn} onClick={goToToday}>Today</button>
          <button
            className={styles.navBtn}
            onClick={() => setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            <ChevronIcon dir="right" />
          </button>
        </div>
      </div>

      {/* Week-day headers */}
      <div className={styles.weekHeaders}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className={styles.weekHeader}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className={styles.calGrid}>
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className={`${styles.dayCell} ${styles.dayCellEmpty}`} />

          const key      = dayKey(date)
          const dayItems = dayMap[key] || []
          const isToday    = key === todayKey
          const isSelected = selectedDay && dayKey(selectedDay) === key

          // Build dots: meetings first, then tasks, cap at 3 visible
          const dots     = []
          for (const x of dayItems.filter(x => x.type === 'meeting')) { if (dots.length < 3) dots.push('meeting') }
          for (const x of dayItems.filter(x => x.type === 'task'))    { if (dots.length < 3) dots.push('task') }
          const overflow = dayItems.length - dots.length

          return (
            <button
              key={key}
              className={[
                styles.dayCell,
                isToday    ? styles.dayCellToday    : '',
                isSelected ? styles.dayCellSelected : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleDayClick(date)}
              aria-label={`${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'long' })}`}
            >
              <span className={styles.dayNum}>{date.getDate()}</span>
              {dots.length > 0 && (
                <div className={styles.dayDots}>
                  {dots.map((type, di) => (
                    <span key={di} className={`${styles.dot} ${type === 'meeting' ? styles.dotMeeting : styles.dotTask}`} />
                  ))}
                  {overflow > 0 && <span className={styles.dotMore}>+{overflow}</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={`${styles.dot} ${styles.dotMeeting}`} />Meeting</span>
        <span className={styles.legendItem}><span className={`${styles.dot} ${styles.dotTask}`} />Task</span>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className={styles.dayDetail}>
          <div className={styles.dayDetailTitle}>
            {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
          {selectedItems.length === 0 ? (
            <p className={styles.detailEmpty}>Nothing scheduled for this day.</p>
          ) : (
            selectedItems
              .sort((a, b) => a.date - b.date)
              .map(item =>
                item.type === 'meeting'
                  ? <MeetingDetailItem key={item.id} item={item} />
                  : <TaskDetailItem    key={item.id} item={item} />
              )
          )}
        </div>
      )}
    </div>
  )
}

// ── Detail cards ──────────────────────────────────────────────────────────────

function MeetingDetailItem({ item }) {
  const m = item.raw
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailIcon}>📅</span>
      <div className={styles.detailBody}>
        <span className={styles.detailTitle}>{m.title}</span>
        {(m.time || m.date_label) && (
          <span className={styles.detailSub}>{m.time || m.date_label}</span>
        )}
      </div>
      <span className={`${styles.badge} ${styles.badgeMeeting}`}>Meeting</span>
    </div>
  )
}

function TaskDetailItem({ item }) {
  const t = item.raw
  const priority = t.priority ? (PRIORITY_LABEL[t.priority] ?? t.priority) : null
  const status   = t.status   ? (STATUS_LABEL[t.status]    ?? t.status)   : null
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailIcon}>✅</span>
      <div className={styles.detailBody}>
        <span className={styles.detailTitle}>{t.title}</span>
        {t.due_label && <span className={styles.detailSub}>{t.due_label}</span>}
        {(priority || status) && (
          <div className={styles.detailBadges}>
            {priority && <span className={`${styles.badge} ${styles[`pri_${t.priority}`]}`}>{priority}</span>}
            {status   && <span className={`${styles.badge} ${styles[`status_${t.status}`]}`}>{status}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronIcon({ dir }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={dir === 'left' ? '15,18 9,12 15,6' : '9,18 15,12 9,6'} />
    </svg>
  )
}
