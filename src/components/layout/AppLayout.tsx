import { useEffect } from 'react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ListTodo,
  Timer,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTimerStore } from '@/stores/timerStore'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/tasks', icon: ListTodo, label: 'Tasks' },
  { path: '/pomodoro', icon: Timer, label: 'Pomodoro' },
  { path: '/habits', icon: Sparkles, label: 'Habits' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()

  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const fetchTasks = useTaskStore((s) => s.fetchTasks)
  const loadFromUser = useTimerStore((s) => s.loadFromUser)

  // Mini timer indicator
  const isTimerRunning = useTimerStore((s) => s.isRunning)
  const timerRemaining = useTimerStore((s) => s.timeRemaining)
  const timerMode = useTimerStore((s) => s.mode)

  const timerMinutes = Math.floor(timerRemaining / 60)
  const timerSeconds = timerRemaining % 60
  const timerDisplay = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`

  // Update document title when timer is running
  useEffect(() => {
    if (isTimerRunning) {
      const modeLabel = timerMode === 'focus' ? 'Focus' : timerMode === 'shortBreak' ? 'Break' : 'Long Break'
      document.title = `${timerDisplay} — ${modeLabel} | FocusFlow`
    } else {
      document.title = 'FocusFlow'
    }
    return () => { document.title = 'FocusFlow' }
  }, [isTimerRunning, timerDisplay, timerMode])

  // Load data on mount
  useEffect(() => {
    fetchTasks()
    loadFromUser()
  }, [fetchTasks, loadFromUser])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative flex flex-col border-r border-border bg-sidebar shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-lg tracking-tight text-foreground whitespace-nowrap"
              >
                FocusFlow
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Mini timer indicator — visible when timer is running */}
        {isTimerRunning && (
          <NavLink to="/pomodoro" className="mx-2 mt-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-bold ${
                timerMode === 'focus'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={`w-2 h-2 rounded-full ${
                  timerMode === 'focus' ? 'bg-primary' : 'bg-emerald-500'
                }`}
              />
              {!collapsed && (
                <>
                  <span>{timerDisplay}</span>
                  <span className="text-[10px] opacity-70">
                    {timerMode === 'focus' ? 'Focus' : 'Break'}
                  </span>
                </>
              )}
            </motion.div>
          </NavLink>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-2 space-y-1">
          {/* User info */}
          {user && !collapsed && (
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </Button>

          {/* Collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
