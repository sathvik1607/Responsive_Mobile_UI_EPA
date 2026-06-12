// Tasks page — shows active and completed tasks for owners and members.
// Members see a merged "My Tasks" tab combining self-created tasks (from ScheduleContext.tasks)
// and assigned tasks (from ScheduleContext.assignedTasks), deduplicated by ID.
// Completed tasks are lazy-loaded on first tab visit and invalidated after any completeItem call
// so the list stays accurate without polling.

import { useState, useCallback, useEffect } from 'react'
import { cancelItem, completeItem, getCompletedTasks, getMemberCompletedTasks } from '../../services/scheduleService'
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
        <span className={styles.cardTitle}>{item.title}</span>
        <div className={styles.cardMeta}>
          {item.due_label && (
            <span className={`${styles.metaDate} ${item.is_overdue ? styles.metaOverdue : ''}`}>
              {item.due_label}
            </span>
          )}
          {item.description && (
            <span className={styles.metaDesc}>{item.description}</span>
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

// ── Assigned task card (member — complete only) ───────────────────────────────

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
  const { userId, user } = useUser()
  const role = user?.role
  const { tasks, assignedTasks, loaded, error, refresh } = useSchedule()

  // Owner: lazily-loaded completed tasks
  const [completedTasks,    setCompletedTasks]    = useState([])
  const [completedLoaded,   setCompletedLoaded]   = useState(false)
  const [completedLoading,  setCompletedLoading]  = useState(false)
  const [completedError,    setCompletedError]    = useState(null)

  // Active tab
  const ownerDefaultTab  = 'all'
  const memberDefaultTab = 'mine'
  const [activeTab, setActiveTab] = useState(role === 'member' ? memberDefaultTab : ownerDefaultTab)

  // Fetch completed tasks on first visit to the Completed tab.
  // Uses different endpoints for members (/tasks/assigned) vs owners (/tasks).
  // Cache is invalidated (completedLoaded = false) after any completeItem call.
  useEffect(() => {
    if (activeTab === 'completed' && !completedLoaded && !completedLoading) {
      setCompletedLoading(true)
      setCompletedError(null)
      const fetcher = role === 'member' ? getMemberCompletedTasks : getCompletedTasks
      fetcher(userId)
        .then(data => { setCompletedTasks(data ?? []); setCompletedLoaded(true) })
        .catch(() => setCompletedError('Could not load completed tasks.'))
        .finally(() => setCompletedLoading(false))
    }
  }, [activeTab, role, userId, completedLoaded, completedLoading])

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

  // ── Tab definitions ────────────────────────────────────────────────────────

  const OWNER_TABS = [
    { key: 'all',       label: 'All Tasks', count: tasks.length },
    { key: 'overdue',   label: 'Overdue',   count: tasks.filter(t => t.is_overdue).length },
    { key: 'completed', label: 'Completed', count: null },
  ]

  // Merge own tasks + assigned tasks for members, deduplicated by id
  const memberActive = dedup([
    ...tasks.filter(t => t.status !== 'completed'),
    ...assignedTasks.filter(t => t.status !== 'completed'),
  ])

  const MEMBER_TABS = [
    { key: 'mine',      label: 'My Tasks',  count: memberActive.length },
    { key: 'completed', label: 'Completed', count: null },
  ]

  const tabs = role === 'member' ? MEMBER_TABS : OWNER_TABS

  // ── Active items for current tab ───────────────────────────────────────────

  function getItems() {
    if (role === 'member') {
      if (activeTab === 'mine')      return memberActive
      if (activeTab === 'completed') return completedTasks
      return []
    }
    if (activeTab === 'all')       return tasks
    if (activeTab === 'overdue')   return tasks.filter(t => t.is_overdue)
    if (activeTab === 'completed') return completedTasks
    return []
  }

  const items        = getItems()
  const isCompletedTab = activeTab === 'completed'

  function renderCard(item) {
    if (isCompletedTab) return <CompletedTaskCard key={item.id} item={item} />
    if (role === 'member') return <AssignedTaskCard key={item.id} item={item} onComplete={handleComplete} />
    return <TaskCard key={item.id} item={item} onDelete={handleDelete} onComplete={handleComplete} />
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tasks</h1>
          <p className={styles.subtitle}>
            {role === 'member' ? 'Your tasks and assignments' : 'Your tasks and to-dos'}
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={refresh} title="Refresh" disabled={!loaded}>
          <RefreshIcon />
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map(tab => (
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
      ) : isCompletedTab && completedLoading ? (
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
            {isCompletedTab ? 'No completed tasks yet.' : 'No tasks here. Ask P.A to create one via chat.'}
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
