// Schedule service — meetings and tasks for the logged-in user.
// All calls go through the shared Axios instance in api.js.

import api from './api'

// Active meetings for the user's team
export const getMeetings = (userId) =>
  api.get(`/meetings/${userId}`).then(r => r.data.meetings)

// Owner's own active tasks only (pending + in_progress).
// Completed tasks are fetched separately on demand via getCompletedTasks
// to avoid bloating the initial schedule load.
export const getTasks = (userId) =>
  api.get(`/tasks/${userId}`).then(r =>
    (r.data.tasks ?? []).filter(t => t.status === 'pending' || t.status === 'in_progress')
  )

// Tasks assigned to a member by an owner — separate endpoint from self-created tasks.
// Members merge both lists in Tasks.jsx to show a unified "My Tasks" tab.
export const getAssignedTasks = (userId) =>
  api.get(`/tasks/assigned/${userId}`).then(r => r.data.tasks ?? [])

// Lazy-loaded the first time the Completed tab is opened — never part of the boot fetch
export const getCompletedTasks = (userId) =>
  api.get(`/tasks/${userId}?status=completed`).then(r => r.data.tasks)

// Member variant of getCompletedTasks — uses the /assigned endpoint.
// `?? r.data` handles backends that return the array at root instead of a tasks key.
export const getMemberCompletedTasks = (userId) =>
  api.get(`/tasks/assigned/${userId}?status=completed`).then(r => r.data.tasks ?? r.data)

// Soft-deletes a task or meeting (sets status to cancelled)
export const cancelItem = (userId, itemId) =>
  api.delete(`/items/${itemId}?user_id=${userId}`).then(r => r.data)

// Marks a task completed; callers should invalidate the completed cache and call refresh()
export const completeItem = (userId, itemId) =>
  api.patch(`/items/${itemId}/complete?user_id=${userId}`).then(r => r.data)
