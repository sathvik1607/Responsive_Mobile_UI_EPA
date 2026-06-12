import { useState, useEffect, useCallback } from 'react'
import { getContext } from '../../services/contextService'
import { useUser } from '../../context/UserContext'
import styles from './Context.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hrs   = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24)  return `${hrs}h ago`
  return `${days}d ago`
}

const INTENT_LABELS = {
  create_task:          'Task created',
  create_meeting:       'Meeting created',
  update_task:          'Task updated',
  update_meeting:       'Meeting updated',
  bulk_update_meetings: 'Meetings rescheduled',
  complete_task:        'Task completed',
  cancel_task:          'Task cancelled',
  cancel_meeting:       'Meeting cancelled',
  cancel_meetings:      'Meetings cancelled',
  get_schedule:         'Schedule viewed',
  get_tasks:            'Tasks viewed',
  get_context:          'Context viewed',
  conversational:       'Chat',
}

const IMPORTANCE_COLOR = {
  low:    styles.imp_low,
  medium: styles.imp_medium,
  high:   styles.imp_high,
}

// ── Memory card ───────────────────────────────────────────────────────────────

function MemoryCard({ memory }) {
  const intentLabel = INTENT_LABELS[memory.source_intent] ?? memory.source_intent
  return (
    <div className={`${styles.card} ${IMPORTANCE_COLOR[memory.importance] ?? ''}`}>
      <div className={styles.cardDot} />
      <div className={styles.cardBody}>
        <p className={styles.summary}>{memory.summary}</p>
        <div className={styles.cardMeta}>
          <span className={styles.intentBadge}>{intentLabel}</span>
          <span className={styles.time}>{timeAgo(memory.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Context() {
  const { userId } = useUser()
  const [memories, setMemories] = useState([])
  const [loaded, setLoaded]     = useState(false)
  const [error, setError]       = useState(null)

  const load = useCallback(() => {
    if (!userId) return
    setError(null)
    getContext(userId)
      .then(data => { setMemories(data ?? []); setLoaded(true) })
      .catch(err => { setError(err.message || 'Could not load memories'); setLoaded(true) })
  }, [userId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.addEventListener('pa:refresh-context', load)
    return () => window.removeEventListener('pa:refresh-context', load)
  }, [load])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Memory</h1>
          <p className={styles.subtitle}>What PA remembers about your recent activity</p>
        </div>
        <button className={styles.refreshBtn} onClick={load} title="Refresh" disabled={!loaded}>
          <RefreshIcon />
        </button>
      </div>

      {!loaded ? (
        <div className={styles.skeletonWrap}>
          {[1, 2, 3, 4].map(n => <div key={n} className={styles.skeleton} />)}
        </div>
      ) : error ? (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={load}>Retry</button>
        </div>
      ) : memories.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🧠</span>
          <p>No memories yet. Start chatting and PA will remember what you do.</p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {memories.map(m => <MemoryCard key={m.id} memory={m} />)}
        </div>
      )}
    </div>
  )
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}
