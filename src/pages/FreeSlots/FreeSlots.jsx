import { useState, useContext } from 'react'
import { getFreeSlots } from '../../services/calendarService'
import LoadingSpinner from '../../components/Common/LoadingSpinner'
import EmptyState from '../../components/Common/EmptyState'
import { ToastContext } from '../../context/ToastContext'
import styles from './FreeSlots.module.css'

const DURATION_OPTIONS = [
  { label: '15 min',  value: 15 },
  { label: '30 min',  value: 30 },
  { label: '45 min',  value: 45 },
  { label: '1 hour',  value: 60 },
  { label: '90 min',  value: 90 },
  { label: '2 hours', value: 120 },
]

export default function FreeSlots() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState(60)
  const [slots, setSlots] = useState(null)
  const [loading, setLoading] = useState(false)
  const { addToast } = useContext(ToastContext)

  const handleSearch = async () => {
    setLoading(true)
    setSlots(null)
    try {
      const data = await getFreeSlots(date, duration)
      const list = Array.isArray(data) ? data : data.slots || data.free_slots || []
      setSlots(list)
      if (list.length === 0) addToast('No free slots found for this date.', 'warning')
    } catch (err) {
      addToast(err.message || 'Failed to fetch free slots', 'error')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  const formattedDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : ''

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>🕐</div>
          <div>
            <h1 className={styles.title}>Free Slots</h1>
            <p className={styles.subtitle}>Find available time on your calendar</p>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.field}>
            <label className={styles.label}>Select Date</label>
            <input
              type="date"
              className={styles.dateInput}
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Meeting Duration</label>
            <div className={styles.durationGrid}>
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.durationBtn} ${duration === opt.value ? styles.active : ''}`}
                  onClick={() => setDuration(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            className={styles.searchBtn}
            onClick={handleSearch}
            disabled={!date || loading}
          >
            {loading
              ? <><LoadingSpinner size={18} color="#1A1B0D" /> Searching…</>
              : <><SearchIcon /> Find Free Slots</>
            }
          </button>
        </div>

        {/* Results */}
        {slots !== null && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h2 className={styles.resultsTitle}>
                Available slots — {formattedDate}
              </h2>
              <span className={styles.resultCount}>
                {slots.length} {slots.length === 1 ? 'slot' : 'slots'}
              </span>
            </div>

            {slots.length === 0 ? (
              <EmptyState
                icon="😴"
                title="No free slots"
                description={`No availability found for ${duration}-minute meetings on this day.`}
              />
            ) : (
              <div className={styles.slotsGrid}>
                {slots.map((slot, i) => (
                  <SlotCard key={i} slot={slot} duration={duration} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {slots === null && !loading && (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>🗓️</span>
            <p>Select a date and duration, then search for available slots.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SlotCard({ slot, duration, index }) {
  const start = slot.start || slot.start_time || slot
  const end   = slot.end   || slot.end_time

  const formatTime = (str) => {
    if (!str) return ''
    try {
      return new Date(str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch { return str }
  }

  return (
    <div
      className={styles.slotCard}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className={styles.slotTime}>
        {formatTime(start)}
        {end && <span className={styles.slotSep}>→</span>}
        {end && formatTime(end)}
      </div>
      <div className={styles.slotDuration}>
        <ClockIcon />
        {duration} min
      </div>
      <div className={styles.slotBadge}>Available</div>
    </div>
  )
}

function SearchIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}

function ClockIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
