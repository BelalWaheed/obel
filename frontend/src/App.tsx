import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/layout/AuthGuard'
import PWAUpdater from '@/components/layout/PWAUpdater'
import { ReloadPrompt } from '@/components/pwa/ReloadPrompt'

// Lazy load pages for better code-splitting and stability
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const TasksPage = lazy(() => import('@/pages/TasksPage'))
const PomodoroPage = lazy(() => import('@/pages/PomodoroPage'))
const HabitsPage = lazy(() => import('@/pages/HabitsPage'))
const CalendarPage = lazy(() => import('@/pages/CalendarPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const NotesPage = lazy(() => import('@/pages/NotesPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

// Loading fallback component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <PWAUpdater />
      <ReloadPrompt />
      <Suspense fallback={<LoadingScreen />}>
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
      </Suspense>
    </BrowserRouter>
  )
}
