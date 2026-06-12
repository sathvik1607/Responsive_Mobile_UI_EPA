// Update request flow: an owner sends a status-update request to a team member;
// the member responds with a text reply. Both sides can view the history.

import api from './api'

// body is optional — an owner may send a request with only a subject line
export const sendUpdateRequest = (teamId, fromUserId, toUserId, subject, body) =>
  api.post('/update-requests', {
    team_id: teamId,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    subject,
    body: body || null,
  }).then(r => r.data)

// Owner's sent outbox
export const getSentRequests = (userId) =>
  api.get(`/update-requests/sent/${userId}`).then(r => r.data)

// Member's received inbox
export const getReceivedRequests = (userId) =>
  api.get(`/update-requests/${userId}`).then(r => r.data)

export const respondToRequest = (requestId, responderUserId, responseBody) =>
  api.post(`/update-requests/${requestId}/respond`, {
    responder_user_id: responderUserId,
    response_body: responseBody,
  }).then(r => r.data)

// Owner can retract a pending request before the member has responded
export const cancelUpdateRequest = (requestId, userId) =>
  api.patch(`/update-requests/${requestId}/cancel`, null, {
    params: { user_id: userId },
  }).then(r => r.data)
