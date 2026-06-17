// Tasks page — flat hierarchy, all members equal.
// "My Tasks" tab = merged own tasks + tasks assigned to me, deduped.
// Completed tasks are lazy-loaded and invalidated after any completeItem call.

import { useState, useCallback, useEffect } from 'react'
import { cancelItem, completeItem, getCompletedTasks, getMemberCompletedTasks, getAssignedByMeTasks, updateItemStatus } from '../../services/scheduleService'
import { useUser } from '../../context/UserContext'
import { useSchedule } from '../../context/ScheduleContext'
import styles from './Tasks.module.css'

const PRIORITY_LABEL = { low: 'Low', medium: 'Med', high: 'High' }
const STATUS_LABEL   = { pending: 'Pending', in_progress: 'In Progress', completed: 'Done', cancelled: 'Cancelled', scheduled: 'Scheduled' }

// Removes duplicate task objects by ID — needed because self-created tasks and assigned tasks
// can overlap when an owner assigns a task to themselves
const dedup = (arr) => [...new Map(arr.map(t => [t.id, t])).values()]

// ── Task card (owner — complete + delete) ─────────────────────────────────────

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
            <span className={styles.metaDesc} style={{color:'var(--text-muted,#888)'}}>
              ↳ sub-task
            </span>
          )}
          {item.assigned_to_name && (
            <span className={styles.metaDesc} style={{color:'var(--text-muted,#888)'}}>
              👤 Assigned to {item.assigned_to_name}
            </span>
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

// ── Assigned task card (assignee view — complete + start) ────────────────────

function AssignedTaskCard({ item, onComplete, onStart }) {
  const [busy, setBusy] = useState(false)

  async function handleComplete() {
    setBusy(true)
    try { await onComplete(item.id) }
    finally { setBusy(false) }
  }

  async function handleStart() {
    setBusy(true)
    try { await onStart(item.id) }
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
          {item.owner_name && (
            <span className={styles.metaDesc} style={{color:'var(--text-muted,#888)'}}>
              Assigned by {item.owner_name}
            </span>
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
          {item.status === 'pending' && (
            <button className={styles.startBtn} onClick={handleStart} disabled={busy} title="Mark as in progress">
              <StartIcon />
            </button>
          )}
          <button className={styles.doneBtn} onClick={handleComplete} disabled={busy} title="Mark done">
            <DoneIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Completed task card (read-only) ───────────────────────────────────────────

function CompletedTaskCard({ item }) {
  return (
    <div className={`${styles.card} ${styles.type_task} ${styles.cardCompleted}`}>
      <div className={styles.cardIcon}>✅</div>
      <div className={styles.cardBody}>
        <span className={styles.cardTitle}>{item.title}</span>
        <div className={styles.cardMeta}>
          {item.due_label && (
            <span className={styles.metaDate}>{item.due_label}</span>
          )}
        </div>
      </div>
      <div className={styles.cardRight}>
        <div className={styles.cardBadges}>
          {item.priority && (
            <span className={`${styles.badge} ${styles[`pri_${item.priority}`]}`}>
              {PRIORITY_LABEL[item.priority] ?? item.priority}
            </span>
          )}
          <span className={`${styles.badge} ${styles.status_completed}`}>Done</span>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { userId } = useUser()
  const { tasks, assignedTasks, loaded, error, refresh } = useSchedule()

  // Lazily-loaded completed tasks (both own and assigned, merged)
  const [completedTasks,    setCompletedTasks]    = useState([])
  const [completedLoaded,   setCompletedLoaded]   = useState(false)
  const [completedLoading,  setCompletedLoading]  = useState(false)
  const [completedError,    setCompletedError]    = useState(null)

  // Tasks this user created and assigned to someone else
  const [assignedByMeTasks,   setAssignedByMeTasks]   = useState([])
  const [assignedByMeLoaded,  setAssignedByMeLoaded]  = useState(false)
  const [assignedByMeLoading, setAssignedByMeLoading] = useState(false)

  const [activeTab, setActiveTab] = useState('mine')

  // Fetch completed tasks on first visit — merge own + assigned
  useEffect(() => {
    if (activeTab === 'completed' && !completedLoaded && !completedLoading) {
      setCompletedLoading(true)
      setCompletedError(null)
      Promise.all([getCompletedTasks(userId), getMemberCompletedTasks(userId)])
        .then(([own, assigned]) => {
          setCompletedTasks(dedup([...(own ?? []), ...(assigned ?? [])]))
          setCompletedLoaded(true)
        })
        .catch(() => setCompletedError('Could not load completed tasks.'))
        .finally(() => setCompletedLoading(false))
    }
  }, [activeTab, userId, completedLoaded, completedLoading])

  // Fetch "assigned by me" tasks on first visit to that tab (all roles).
  useEffect(() => {
    if (activeTab === 'assignedByMe' && !assignedByMeLoaded && !assignedByMeLoading) {
      setAssignedByMeLoading(true)
      getAssignedByMeTasks(userId)
        .then(data => { setAssignedByMeTasks(data ?? []); setAssignedByMeLoaded(true) })
        .catch(() => {})
        .finally(() => setAssignedByMeLoading(false))
    }
  }, [activeTab, userId, assignedByMeLoaded, assignedByMeLoading])

  const handleDelete = useCallback(async (itemId) => {
    await cancelItem(userId, itemId)
    refresh()
  }, [userId, refresh])

  const handleComplete = useCallback(async (itemId) => {
    await completeItem(userId, itemId)
    // Invalidate completed cache so next visit re-fetches
    setCompletedTasks([])
    setCompletedLoaded(false)
    refresh()
  }, [userId, refresh])

  const handleStart = useCallback(async (itemId) => {
    await updateItemStatus(userId, itemId, 'in_progress')
    // Invalidate assigned-by-me cache so status reflects immediately
    setAssignedByMeTasks([])
    setAssignedByMeLoaded(false)
    refresh()
  }, [userId, refresh])

  // ── Tab definitions ────────────────────────────────────────────────────────

  // Merge own tasks + assigned tasks, deduped — active only
  const allActive = dedup([
    ...tasks.filter(t => t.status !== 'completed'),
    ...assignedTasks.filter(t => t.status !== 'completed'),
  ])
  const overdueItems = allActive.filter(t => t.is_overdue)

  // IDs of tasks created by me vs assigned to me by someone else
  const ownTaskIds      = new Set(tasks.map(t => t.id))
  const assignedTaskIds = new Set(assignedTasks.map(t => t.id))
  const isAssignedByOther = (id) => assignedTaskIds.has(id) && !ownTaskIds.has(id)

  const TABS = [
    { key: 'mine',         label: 'My Tasks',       count: allActive.length },
    { key: 'overdue',      label: 'Overdue',         count: overdueItems.length },
    { key: 'assignedByMe', label: 'Assigned By Me',  count: null },
    { key: 'completed',    label: 'Completed',       count: null },
  ]

  // ── Active items for current tab ───────────────────────────────────────────

  function getItems() {
    if (activeTab === 'mine')         return allActive
    if (activeTab === 'overdue')      return overdueItems
    if (activeTab === 'assignedByMe') return assignedByMeTasks
    if (activeTab === 'completed')    return completedTasks
    return []
  }

  const items             = getItems()
  const isCompletedTab    = activeTab === 'completed'
  const isAssignedByMeTab = activeTab === 'assignedByMe'

  function renderCard(item) {
    if (isCompletedTab)    return <CompletedTaskCard key={item.id} item={item} />
    if (isAssignedByMeTab) return <TaskCard key={item.id} item={item} onDelete={handleDelete} onComplete={handleComplete} />
    if (isAssignedByOther(item.id)) return <AssignedTaskCard key={item.id} item={item} onComplete={handleComplete} onStart={handleStart} />
    return <TaskCard key={item.id} item={item} onDelete={handleDelete} onComplete={handleComplete} />
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tasks</h1>
          <p className={styles.subtitle}>Your tasks and assignments</p>
        </div>
        <button className={styles.refreshBtn} onClick={refresh} title="Refresh" disabled={!loaded}>
          <RefreshIcon />
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={styles.tabBadge}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {!loaded ? (
        <div className={styles.skeletonWrap}>
          {[1, 2, 3].map(n => <div key={n} className={styles.skeleton} />)}
        </div>
      ) : error ? (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={refresh}>Retry</button>
        </div>
      ) : (isCompletedTab && completedLoading) || (isAssignedByMeTab && assignedByMeLoading) ? (
        <div className={styles.skeletonWrap}>
          {[1, 2, 3].map(n => <div key={n} className={styles.skeleton} />)}
        </div>
      ) : isCompletedTab && completedError ? (
        <div className={styles.errorBox}>
          <p>{completedError}</p>
          <button className={styles.retryBtn} onClick={() => { setCompletedLoaded(false); setCompletedError(null) }}>Retry</button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.allEmpty}>
          <span className={styles.allEmptyIcon}>✅</span>
          <p>
            {isCompletedTab
              ? 'No completed tasks yet.'
              : isAssignedByMeTab
              ? 'No tasks assigned to others yet. Ask P.A to assign a task to a team member.'
              : 'No tasks here. Ask P.A to create one via chat.'}
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map(item => renderCard(item))}
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
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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

function StartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
