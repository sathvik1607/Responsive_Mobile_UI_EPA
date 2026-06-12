// Auth and team management service.
// registerUser is a legacy generic endpoint; use registerOwner / registerMember for
// role-based registration which also sets the user's role and team on the backend.

import api from './api'

export const registerUser = (name, email, password) =>
  api.post('/users', { name, email, password }).then(r => r.data)

export const loginUser = (username, password) =>
  api.post('/auth/login', { username, password }).then(r => r.data)

// Lightweight ping — used by UserContext on app load to set the backendOnline indicator
export const checkHealth = () =>
  api.get('/health').then(r => r.data)

// Creates a new team and registers the caller as its owner
export const registerOwner = (name, companyName, password) =>
  api.post('/auth/register/owner', { name, company_name: companyName, password }).then(r => r.data)

// Registers a member and links them to an existing team by numeric ID
export const registerMember = (name, teamId, password) =>
  api.post('/auth/register/member', { name, team_id: teamId, password }).then(r => r.data)

// Returns all teams — used to populate the company dropdown in the member registration form
export const getTeams = () =>
  api.get('/teams').then(r => r.data)

export const getTeamMembers = (teamId) =>
  api.get(`/teams/${teamId}/members`).then(r => r.data)
