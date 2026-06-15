import { useState, useCallback } from 'react'
import { cancelItem, completeItem } from '../../services/scheduleService'
import { useUser } from '../../context/UserContext'
import { useSchedule } from '../../context/ScheduleContext'
import styles from './Schedule.module.css'

const PRIORITY_LABEL = { low: 'Low', medium: 'Med', high: 'High' }
const STATUS_LABEL   = { pending: 'Pending', in_progress: 'In Progress', completed: 'Done', cancelled: 'Cancelled', scheduled: 'Scheduled' }

// ── Meeting card ──────────────────────────────────────────────────────────────

function MeetingCard({ item, userId, onDelete, onComplete }) {
  const [confirming, setConfirming] = useState(false)
  const [busy,       setBusy]       = useState(false)

  const isInvited   = item.assigned_to_user_id && item.assigned_to_user_id === userId
  const displayTitle = isInvited && item.owner_name
    ? `Meeting with ${item.owner_name}`
    : item.title

  async function handleDelete() {
    setBusy(true)
    try { await onDelete(item.id) }
    finally { setBusy(false); setConfirming(false) }
  }

  async function handleComplete() {
    setBusy(true)
    try { await onComplete(item.id) }
    finally { setBusy(false) }
  }

  return (
    <div className={`${styles.card} ${styles.type_meeting} ${confirming ? styles.cardConfirming : ''}`}>
      <div className={styles.cardIcon}>📅</div>
      <div className={styles.cardBody}>
        <span className={styles.cardTitle}>{displayTitle}</span>
        <div className={styles.cardMeta}>
          {item.date_label && item.time && (
            <span className={styles.metaDate}>{item.date_label} · {item.time}</span>
          )}
          {item.duration_min && (
            <span className={styles.metaDur}>{item.duration_min} min</span>
          )}
          {item.attendees?.length > 0 && (
            <span className={styles.metaAttendees}>👥 {item.attendees.join(', ')}</span>
          )}
          {item.location && (
            <span className={styles.metaLoc}>📍 {item.location}</span>
          )}
        </div>
      </div>

      {confirming ? (
        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>Remove?</span>
          <button className={styles.confirmYes} onClick={handleDelete} disabled={busy}>
            {busy ? '…' : '✓'}
          </button>
          <button className={styles.confirmNo} onClick={() => setConfirming(false)} disabled={busy}>
            ✕
          </button>
        </div>
      ) : (
        <div className={styles.cardRight}>
          <div className={styles.cardBadges}>
            <span className={`${styles.badge} ${styles[`status_${item.status}`]}`}>
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
            {item.is_today    && <span className={`${styles.badge} ${styles.badgeToday}`}>Today</span>}
            {item.is_tomorrow && <span className={`${styles.badge} ${styles.badgeTomorrow}`}>Tomorrow</span>}
          </div>
          <div className={styles.actionBtns}>
            <button className={styles.doneBtn} onClick={handleComplete} disabled={busy} title="Mark done">
              <DoneIcon />
            </button>
            <button className={styles.deleteBtn} onClick={() => setConfirming(true)} disabled={busy} title="Remove">
              <TrashIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({ item, onDelete, onComplete }) {
  const [confirming, setConfirming] = useState(false)
  const [busy,       setBusy]       = useState(false)

  async function handleDelete() {
    setBusy(true)
    try { await onDelete(item.id) }
    finally { setBusy(false); setConfirming(false) }
  }

  async function handleComplete() {
    setBusy(true)
    try { await onComplete(item.id) }
    finally { setBusy(false) }
  }

  return (
    <div className={`${styles.card} ${styles.type_task} ${item.is_overdue ? styles.cardOverdue : ''} ${confirming ? styles.cardConfirming : ''}`}>
      <div className={styles.cardIcon}>✅</div>
      <div className={styles.cardBody}>
        <span className={styles.cardTitle}>
          {item.risk_flag && <span title="Sub-tasks are overdue" style={{marginRight:4}}>⚠️</span>}
          {item.title}
        </span>
        <div className={styles.cardMeta}>
          {item.due_label && (
            <span className={`${styles.metaDate} ${item.is_overdue ? styles.metaOverdue : ''}`}>
              {item.due_label}
            </span>
          )}
          {item.description && (
            <span className={styles.metaDesc}>{item.description}</span>
          )}
          {item.subtask_count > 0 && (
            <span className={styles.metaDesc} style={{color:'var(--text-muted,#888)'}}>
              🔗 {item.subtask_count} sub-task{item.subtask_count !== 1 ? 's' : ''}
            </span>
          )}
          {item.parent_task_id && (
            <span className={styles.metaDesc} style={{color:'var(--text-muted,#888)'}}>↳ sub-task</span>
          )}
        </div>
      </div>

      {confirming ? (
        <div className={styles.confirmRow}>
          <span className={styles.confirmLabel}>Remove?</span>
          <button className={styles.confirmYes} onClick={handleDelete} disabled={busy}>
            {busy ? '…' : '✓'}
          </button>
          <button className={styles.confirmNo} onClick={() => setConfirming(false)} disabled={busy}>
            ✕
          </button>
        </div>
      ) : (
        <div className={styles.cardRight}>
          <div className={styles.cardBadges}>
            {item.risk_flag && (
              <span className={styles.badge} style={{background:'#fef3c7',color:'#92400e',border:'1px solid #fde68a'}}>
                Blocked
              </span>
            )}
            {item.priority && (
              <span className={`${styles.badge} ${styles[`pri_${item.priority}`]}`}>
                {PRIORITY_LABEL[item.priority] ?? item.priority}
              </span>
            )}
            <span className={`${styles.badge} ${styles[`status_${item.status}`]}`}>
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
          </div>
          <div className={styles.actionBtns}>
            <button className={styles.doneBtn} onClick={handleComplete} disabled={busy} title="Mark done">
              <DoneIcon />
            </button>
            <button className={styles.deleteBtn} onClick={() => setConfirming(true)} disabled={busy} title="Remove">
              <TrashIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, icon, items, emptyMsg, renderCard }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>{icon}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <span className={styles.sectionCount}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className={styles.empty}>{emptyMsg}</p>
      ) : (
        <div className={styles.list}>
          {items.map(item => renderCard(item))}
        </div>
      )}
    </section>
  )
}

// ── Assigned task card (member view — complete only, no cancel) ──────────────

function AssignedTaskCard({ item, onComplete }) {
  const [busy, setBusy] = useState(false)

  async function handleComplete() {
    setBusy(true)
    try { await onComplete(item.id) }
    finally { setBusy(false) }
  }

  return (
    <div className={`${styles.card} ${styles.type_task} ${item.is_overdue ? styles.cardOverdue : ''}`}>
      <div className={styles.cardIcon}>📌</div>
      <div className={styles.cardBody}>
        <span className={styles.cardTitle}>{item.title}</span>
        <div className={styles.cardMeta}>
          {item.due_label && (
            <span className={`${styles.metaDate} ${item.is_overdue ? styles.metaOverdue : ''}`}>
              {item.due_label}
            </span>
          )}
          {item.priority && (
            <span className={styles.metaDesc}>{PRIORITY_LABEL[item.priority] ?? item.priority} priority</span>
          )}
        </div>
      </div>
      <div className={styles.cardRight}>
        <div className={styles.cardBadges}>
          <span className={`${styles.badge} ${styles[`status_${item.status}`]}`}>
            {STATUS_LABEL[item.status] ?? item.status}
          </span>
        </div>
        <div className={styles.actionBtns}>
          <button className={styles.doneBtn} onClick={handleComplete} disabled={busy} title="Mark done">
            <DoneIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Schedule() {
  const { userId, user } = useUser()
  const role = user?.role
  const { meetings, tasks, assignedTasks, loaded, error, refresh } = useSchedule()

  const handleDelete = useCallback(async (itemId) => {
    await cancelItem(userId, itemId)
    refresh()
  }, [userId, refresh])

  const handleComplete = useCallback(async (itemId) => {
    await completeItem(userId, itemId)
    refresh()
  }, [userId, refresh])

  const isEmpty = meetings.length === 0 && tasks.length === 0 &&
    (role !== 'member' || assignedTasks.length === 0)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Upcoming Schedule</h1>
          <p className={styles.subtitle}>Your pending tasks and meetings</p>
        </div>
        <button className={styles.refreshBtn} onClick={refresh} title="Refresh" disabled={!loaded}>
          <RefreshIcon />
        </button>
      </div>

      {!loaded ? (
        <div className={styles.skeletonWrap}>
          {[1, 2, 3].map(n => <div key={n} className={styles.skeleton} />)}
        </div>
      ) : error ? (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={refresh}>Retry</button>
        </div>
      ) : isEmpty ? (
        <div className={styles.allEmpty}>
          <span className={styles.allEmptyIcon}>🗓️</span>
          <p>Nothing scheduled. Tell PA to create a task or meeting via chat.</p>
        </div>
      ) : (
        <div className={styles.sections}>
          <Section
            title="Meetings" icon="📅"
            items={meetings} emptyMsg="No upcoming meetings"
            renderCard={item => (
              <MeetingCard key={item.id} item={item} userId={userId} onDelete={handleDelete} onComplete={handleComplete} />
            )}
          />
          <Section
            title="Tasks" icon="✅"
            items={tasks} emptyMsg="No pending tasks"
            renderCard={item => (
              <TaskCard key={item.id} item={item} onDelete={handleDelete} onComplete={handleComplete} />
            )}
          />
          {role === 'member' && (
            <Section
              title="Assigned to Me" icon="📌"
              items={assignedTasks} emptyMsg="No tasks assigned to you"
              renderCard={item => (
                <AssignedTaskCard key={item.id} item={item} onComplete={handleComplete} />
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function DoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
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
