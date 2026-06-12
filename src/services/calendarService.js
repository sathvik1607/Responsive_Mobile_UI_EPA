import api from './api'

const toArray = (data) =>
  Array.isArray(data) ? data : data?.events ?? data?.items ?? data?.slots ?? []

export const getEvents = (userId) =>
  api.get('/calendar/events', { params: { user_id: userId } }).then((r) => toArray(r.data))

export const getFreeSlots = (date, duration) =>
  api
    .get('/calendar/free-slots', { params: { date, duration } })
    .then((r) => toArray(r.data))

export const scheduleEvent = (payload) =>
  api.post('/schedule', payload).then((r) => r.data)
