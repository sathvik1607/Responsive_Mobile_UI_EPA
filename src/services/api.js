// Central Axios instance shared by all service files.
// VITE_API_URL is a comma-separated pair: "primaryURL,fallbackURL".
// On any network error (no response from server), the interceptor automatically
// retries on the fallback and sticks to it for the rest of the session.

import axios from 'axios'

const [primaryURL, fallbackURL] = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .split(',')
  .map((u) => u.trim())

// Mutable — switched to fallback on first network failure; never switched back
let activeBase = primaryURL

const api = axios.create({
  baseURL: activeBase,
  headers: { 'Content-Type': 'application/json' },
  timeout: 90000, // 90 s — Render free-tier cold-start takes 50-60 s
})

// Re-apply activeBase on every request so post-failover calls hit the right URL
api.interceptors.request.use((config) => {
  config.baseURL = activeBase
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // Only failover on network errors (no response), not on HTTP 4xx / 5xx
    const isNetworkError = !err.response
    if (isNetworkError && fallbackURL && activeBase !== fallbackURL) {
      activeBase = fallbackURL
      err.config.baseURL = fallbackURL
      return api.request(err.config) // retry the original request on the fallback
    }
    // Normalise varying backend error shapes into a plain Error message
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default api
