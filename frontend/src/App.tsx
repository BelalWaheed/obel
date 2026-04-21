import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/layout/AuthGuard'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import TasksPage from '@/pages/TasksPage'
import PomodoroPage from '@/pages/PomodoroPage'
import HabitsPage from '@/pages/HabitsPage'
import CalendarPage from '@/pages/CalendarPage'
import ProfilePage from '@/pages/ProfilePage'
import NotesPage from '@/pages/NotesPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PWAUpdater from '@/components/layout/PWAUpdater'
import { ReloadPrompt } from '@/components/pwa/ReloadPrompt'

export default function App() {
  return (
    <BrowserRouter>
      <PWAUpdater />
      <ReloadPrompt />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/pomodoro" element={<PomodoroPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
