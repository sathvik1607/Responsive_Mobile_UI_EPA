// useScheduleAlerts — polls every 60 s and queues items whose time falls within
// the alert window (−2 min to +30 min from now).
//
// Meetings fire two separate alerts using distinct keys:
//   - "upcoming" key: triggers in the −2→0 min window (about to start)
//   - "past" key:     triggers in the 0→30 min window (just started / in progress)
// Tasks use a single key so they only alert once.
//
// alertedIds prevents the same event from re-entering the queue across polls.

import { useState, useEffect, useRef, useCallback } from 'react'
import { getMeetings, getTasks, getAssignedTasks, completeItem } from '../services/scheduleService'
import { useUser } from '../context/UserContext'
import { playNotificationSound } from '../utils/notificationSound'
import { parseServerDate } from '../utils/parseServerDate'

const WINDOW_BEFORE_MINS = 2   // alert this many minutes before the item's time
const WINDOW_AFTER_MINS  = 30  // keep alerting for this many minutes after the item's time
const CHECK_INTERVAL_MS  = 60_000

export function useScheduleAlerts() {
  const { userId } = useUser()
  const [queue, setQueue] = useState([])
  const alertedIds = useRef(new Set()) // persists across re-renders and poll cycles

  const check = useCallback(async () => {
    if (!userId) return
    try {
      const [meetings, ownTasks, assignedTasks] = await Promise.all([
        getMeetings(userId), getTasks(userId), getAssignedTasks(userId),
      ])

      const items = [
        ...meetings.map(m => ({
          ...m,
          _type:  'meeting',
          _time:  m.scheduled_at,
          // Rephrase meeting title for members who were assigned to it by an owner
          title:  (m.assigned_to_user_id && m.assigned_to_user_id === userId && m.owner_name)
                    ? `Meeting with ${m.owner_name}`
                    : m.title,
        })),

        // Owner's own tasks — flag delegated ones so the popup can phrase them correctly
        ...ownTasks.map(t => ({
          ...t,
          _type:               'task',
          _time:               t.due_at,
          _alertKey:           `own_${t.id}`,
          _assigned_to_member: !!t.assigned_to_user_id,
          _member_name:        t.assigned_to_name || null,
        })),

        // Member's assigned tasks — separate alertKey namespace from own tasks
        ...assignedTasks.map(t => ({
          ...t,
          _type:              'task',
          _time:              t.due_at,
          _alertKey:          `assigned_${t.id}`,
          _assigned_by_owner: true,
          _owner_name:        t.owner_name || 'your manager',
        })),
      ]

      const now = Date.now()
      items.forEach(item => {
        const baseKey = item._alertKey || `${item._type}_${item.id}`
        if (!item._time) return

        const diffMins = (now - parseServerDate(item._time).getTime()) / 60_000
        if (diffMins >= -WINDOW_BEFORE_MINS && diffMins <= WINDOW_AFTER_MINS) {
          const isPast = diffMins >= 0
          // Meetings use separate keys per phase so both upcoming and started alerts fire
          const alertKey = item._type === 'meeting'
            ? `${baseKey}_${isPast ? 'past' : 'upcoming'}`
            : baseKey
          if (alertedIds.current.has(alertKey)) return // already alerted this session
          alertedIds.current.add(alertKey)
          playNotificationSound()
          setQueue(prev => [...prev, { ...item, _alertKey: alertKey, _isPast: isPast }])
        }
      })
    } catch {}
  }, [userId])

  useEffect(() => {
    check()
    const t = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(t)
  }, [check])

  const dismiss = useCallback((alertKey) => {
    setQueue(prev => prev.filter(a => a._alertKey !== alertKey))
  }, [])

  const complete = useCallback(async (item) => {
    try { await completeItem(userId, item.id) } catch {}
    dismiss(item._alertKey)
    // Notify ScheduleContext and Context page to update their data
    window.dispatchEvent(new CustomEvent('pa:refresh-schedule'))
    window.dispatchEvent(new CustomEvent('pa:refresh-context'))
  }, [userId, dismiss])

  return { queue, dismiss, complete }
}
