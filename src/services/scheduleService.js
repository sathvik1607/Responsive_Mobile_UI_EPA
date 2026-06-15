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

// Sub-tasks this user delegated to others (tasks with a parent, created by this user)
export const getDelegatedTasks = (userId) =>
  api.get(`/tasks/${userId}/delegated`).then(r => r.data.tasks ?? [])

// Tasks with pending sub-tasks that are blocking completion (risk_flag=1)
export const getBlockedTasks = (userId) =>
  api.get(`/tasks/${userId}/blocked`).then(r => r.data.tasks ?? [])

// Full recursive task tree for a given task
export const getTaskTree = (taskId, userId) =>
  api.get(`/tasks/${taskId}/tree?user_id=${userId}`).then(r => r.data)

// Active tasks this user created and assigned to someone else (all roles)
export const getAssignedByMeTasks = (userId) =>
  api.get(`/tasks/${userId}/assigned-by-me`).then(r => r.data.tasks ?? [])

// Audit timeline for a single task
export const getTaskTimeline = (taskId, userId) =>
  api.get(`/tasks/${taskId}/timeline?user_id=${userId}`).then(r => r.data.timeline ?? [])

// Update task status via UI button (Start / Block / etc.)
export const updateItemStatus = (userId, itemId, status) =>
  api.patch(`/items/${itemId}/status?user_id=${userId}&status=${status}`).then(r => r.data)
