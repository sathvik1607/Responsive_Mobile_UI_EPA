import api from './api'

export const getContext = (userId) =>
  api.get(`/context/${userId}`).then(r => r.data)