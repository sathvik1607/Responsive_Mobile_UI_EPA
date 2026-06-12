# PEA — Personal Executive Assistant

A React-based frontend for PEA, your AI-powered personal executive assistant. Chat with PEA to manage your schedule, tasks, and meetings.

---

## Tech Stack

- **React 18** + **Vite 5**
- **React Router v6**
- **CSS Modules** — dark olive theme
- **Axios** for API calls

---

## Getting Started

```bash
npm install
npm run dev
```

Requires the PEA backend running on `http://localhost:8000`.

---

## Features

| Screen | Description |
|--------|-------------|
| **Chat** (`/assistant`) | Talk to PEA — create tasks, meetings, get info |
| **Schedule** (`/schedule`) | View, complete, or cancel upcoming tasks & meetings |
| **Memory** (`/context`) | Timeline of what PEA remembers about you |

**Schedule alerts** — a popup appears near a scheduled item's time asking "Did you complete this?" with Yes/No actions.

---

## Backend API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/users` | Register / get existing user |
| `POST` | `/auth/login` | Login with username + password |
| `POST` | `/chat` | Send message, get AI response |
| `GET`  | `/meetings/{user_id}` | Fetch upcoming meetings |
| `GET`  | `/tasks/{user_id}` | Fetch pending tasks |
| `GET`  | `/context/{user_id}` | Fetch memory/context |
| `PATCH` | `/items/{id}/complete` | Mark item complete |
| `DELETE` | `/items/{id}` | Cancel/delete item |
| `GET`  | `/health` | Backend health check |

---

## Project Structure

```
src/
├── components/
│   ├── Alert/          # Schedule alert popup
│   ├── Layout/         # Sidebar + Layout wrapper
│   └── Setup/          # Login screen
├── context/
│   ├── UserContext.jsx # Auth state (login/logout)
│   └── ToastContext.jsx
├── hooks/
│   └── useScheduleAlerts.js
├── pages/
│   ├── Assistant/      # Chat UI
│   ├── Schedule/       # Tasks & meetings view
│   └── Context/        # Memory timeline
└── services/
    ├── api.js           # Axios base instance
    ├── userService.js
    ├── assistantService.js
    ├── scheduleService.js
    └── contextService.js
```

---

## Auth Flow

Login is required on every page load (session-scoped). The same username always maps to the same backend user via a stable email (`username@pea.local`), so your data persists across sessions.