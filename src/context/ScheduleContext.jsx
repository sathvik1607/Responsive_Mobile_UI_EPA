// ScheduleContext — single source of truth for meetings and tasks.
// Fetches once on login, then re-fetches whenever the custom window event
// `pa:refresh-schedule` fires. This event-based approach lets any component
// (Assistant, Tasks, alerts) trigger a refresh without prop drilling.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMeetings, getTasks, getAssignedTasks } from '../services/scheduleService'
import { useUser } from './UserContext'

const ScheduleContext = createContext(null)

export function useSchedule() {
  return useContext(ScheduleContext)
}

export function ScheduleProvider({ children }) {
  const { userId } = useUser()
  const [meetings,       setMeetings]       = useState([])
  const [tasks,          setTasks]          = useState([])
  const [assignedTasks,  setAssignedTasks]  = useState([])
  const [loaded,         setLoaded]         = useState(false)
  const [error,          setError]          = useState(null)

  const refresh = useCallback(() => {
    if (!userId) return
    setError(null)

    // Fetch own tasks + tasks assigned to this user by others (all members)
    const fetches = [getMeetings(userId), getTasks(userId), getAssignedTasks(userId)]

    Promise.all(fetches)
      .then(([m, t, a]) => {
        setMeetings(m ?? [])
        setTasks(t ?? [])
        setAssignedTasks(a ?? [])
        setLoaded(true)
      })
      .catch(err => { setError(err.message || 'Could not load schedule'); setLoaded(true) })
  }, [userId])

  // Initial fetch on mount (or when userId changes after login)
  useEffect(() => { refresh() }, [refresh])

  // Listen for cross-component refresh signals (fired by Assistant, alert popup, etc.)
  useEffect(() => {
    window.addEventListener('pa:refresh-schedule', refresh)
    return () => window.removeEventListener('pa:refresh-schedule', refresh)
  }, [refresh])

  // Convenience derived value used by Dashboard and alert popup
  const todayMeetings = meetings.filter(m => m.is_today)

  return (
    <ScheduleContext.Provider value={{ meetings, tasks, assignedTasks, todayMeetings, loaded, error, refresh }}>
      {children}
    </ScheduleContext.Provider>
  )
}
