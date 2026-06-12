// Sends a user message to the AI assistant backend.
// Response shape: { response, intent, error, metrics }
// The `intent` field (e.g. "create_task", "complete_task") is used by Assistant.jsx
// to decide whether to dispatch a schedule or context refresh event after the reply.

import api from './api'

export const sendMessage = (message, userId) =>
  api.post('/chat', { message, user_id: userId }).then((r) => r.data)
