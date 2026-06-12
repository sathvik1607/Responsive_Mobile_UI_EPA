import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './context/UserContext'
import { ToastProvider } from './context/ToastContext'
import { ScheduleProvider } from './context/ScheduleContext'
import { NotificationProvider } from './context/NotificationContext'
import Layout from './components/Layout/Layout'
import UserSetup from './components/Setup/UserSetup'
import Assistant from './pages/Assistant/Assistant'
import Schedule from './pages/Schedule/Schedule'
import Context from './pages/Context/Context'
import Calendar from './pages/Calendar/Calendar'
import FreeSlots from './pages/FreeSlots/FreeSlots'
import Dashboard from './pages/Dashboard/Dashboard'
import UpdateRequests from './pages/UpdateRequests/UpdateRequests'
import Notifications from './pages/Notifications/Notifications'
import Tasks from './pages/Tasks/Tasks'

function AppRoutes() {
  const { ready, loggedIn } = useUser()

  if (!ready) return null

  if (!loggedIn) {
    return (
      <Routes>
        <Route path="/register" element={<UserSetup />} />
        <Route path="/login"    element={<UserSetup loginMode />} />
        <Route path="*"         element={<Navigate to="/register" replace />} />
      </Routes>
    )
  }

  return (
    <ScheduleProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index                element={<Navigate to="/assistant" replace />} />
          <Route path="/assistant"    element={<Assistant />} />
          <Route path="/schedule"     element={<Schedule />} />
          <Route path="/tasks"        element={<Tasks />} />
          <Route path="/context"      element={<Context />} />
          <Route path="/calendar"     element={<Calendar />} />
          <Route path="/free-slots"   element={<FreeSlots />} />
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/requests"       element={<UpdateRequests />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>
        <Route path="*" element={<Navigate to="/assistant" replace />} />
      </Routes>
    </ScheduleProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UserProvider>
        <ToastProvider>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </ToastProvider>
      </UserProvider>
    </BrowserRouter>
  )
}
