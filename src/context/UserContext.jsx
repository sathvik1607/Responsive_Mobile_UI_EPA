// UserContext — global auth state gate.
// Persists the logged-in user to localStorage so sessions survive page refresh.
// Also runs a health check on mount to set the backendOnline indicator shown in the
// Assistant header. Health check is intentionally separate from auth so the app boots
// even if the backend is slow (Render free-tier cold-start).

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { registerUser, loginUser, checkHealth } from '../services/userService'

const UserContext = createContext(null)

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }) {
  const [user, setUser]                   = useState(null)
  const [loggedIn, setLoggedIn]           = useState(false)
  const [backendOnline, setBackendOnline] = useState(null) // null = checking, true/false = resolved
  const [ready, setReady]                 = useState(false) // true once localStorage has been read

  useEffect(() => {
    // Restore session from localStorage before rendering any routes
    const saved = localStorage.getItem('pa_user')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setUser(data)
        setLoggedIn(true)
      } catch { /* corrupted entry — ignore */ }
    }
    setReady(true)

    // Health check runs in parallel — doesn't block the app from rendering
    checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const trimmed = username.trim()
    let data
    try {
      data = await loginUser(trimmed, password)
    } catch (err) {
      // Map HTTP status codes to user-friendly messages
      const status = err?.response?.status
      if (status === 404) throw new Error('No account found with that name.')
      if (status === 401) throw new Error('Incorrect password.')
      throw new Error('Login failed. Please try again.')
    }
    localStorage.setItem('pa_user', JSON.stringify(data))
    setUser(data)
    setLoggedIn(true)
    return data
  }, [])

  // Used after owner/member registration — sets state directly from the registration
  // response without a second login round-trip.
  const loginWithData = useCallback((data) => {
    localStorage.setItem('pa_user', JSON.stringify(data))
    setUser(data)
    setLoggedIn(true)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('pa_user')
    setUser(null)
    setLoggedIn(false)
  }, [])

  return (
    <UserContext.Provider value={{
      user,
      userId:   user?.id   ?? null,
      role:     user?.role ?? null,
      teamId:   user?.team_id ?? null,
      loggedIn,
      backendOnline,
      ready,
      login,
      loginWithData,
      logout,
    }}>
      {children}
    </UserContext.Provider>
  )
}
