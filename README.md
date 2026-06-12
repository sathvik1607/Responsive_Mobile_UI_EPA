# PA — Personal Assistant

A React 18 + Vite frontend for PA, an AI-powered personal assistant for teams. Owners manage tasks and meetings; members receive assignments and respond to update requests.

---

## Tech Stack

- **React 18** + **Vite 5**
- **React Router v6**
- **CSS Modules** — dark olive theme, no CSS framework
- **Axios** — with automatic primary/fallback URL switching

---

## Getting Started

```bash
npm install
cp .env.example .env   # set VITE_API_URL
npm run dev            # http://localhost:3000
```

`VITE_API_URL` accepts a comma-separated pair: `primary,fallback`. On any network error the app automatically retries on the fallback and sticks to it for the session.

```
VITE_API_URL=http://127.0.0.1:8000,https://pa-executive.onrender.com
```

---

## User Roles

| Role | Can do |
|------|--------|
| **Owner** | Register a team, create tasks/meetings via chat, send update requests to members, view all team tasks |
| **Member** | Join an existing team, view assigned tasks, respond to update requests |

---

## Features

| Page | Route | Description |
|------|-------|-------------|
| Assistant | `/assistant` | AI chat — create tasks, meetings, get info. Proactive server events injected every 2 s. |
| Schedule | `/schedule` | Upcoming tasks & meetings; complete or cancel inline |
| Tasks | `/tasks` | Role-aware task list — owner sees All/Overdue/Completed; member sees My Tasks/Completed |
| Calendar | `/calendar` | Month grid view — gold dots for meetings, green for tasks; tap a day for details |
| Notifications | `/notifications` | Polls every 15 s; unread badge on nav |
| Memory | `/context` | AI knowledge base — what PA remembers about you |
| Requests | `/requests` | Owner sends update requests; member responds |
| Free Slots | `/free-slots` | Find available meeting times |

---

## Backend API (key endpoints)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/users` | Register / get existing user |
| `POST` | `/auth/login` | Login with username + password |
| `POST` | `/chat` | Send message, get AI response + intent |
| `GET`  | `/meetings/{userId}` | Active meetings for team |
| `GET`  | `/tasks/{userId}` | Owner's active tasks |
| `GET`  | `/tasks/assigned/{userId}` | Member's assigned tasks |
| `PATCH` | `/items/{id}/complete` | Mark item complete |
| `DELETE` | `/items/{id}` | Cancel/delete item |
| `GET`  | `/notifications/{userId}` | Fetch notifications |
| `GET`  | `/context/{userId}` | AI memory/knowledge base |
| `GET`  | `/health` | Backend health check |

---

## Auth & Session

User object (including `role`) is stored in `localStorage` as `pa_user` and restored on page refresh. Chat history is stored per-user as `pa_messages_<userId>`. Logout clears both.

---

## Production Build

```bash
VITE_API_URL=https://your-backend.onrender.com npm run build
# Output in dist/ — static files only, no Node.js needed on the server
```

See `ec2_deploy_frontend.md` for full EC2 + Nginx deploy instructions.
