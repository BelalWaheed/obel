import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
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
  Menu,
  X,
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const fetchTasks = useTaskStore((s) => s.fetchTasks)
  const loadFromUser = useTimerStore((s) => s.loadFromUser)

  const isTimerRunning = useTimerStore((s) => s.isRunning)
  const timerRemaining = useTimerStore((s) => s.timeRemaining)
  const timerMode = useTimerStore((s) => s.mode)

  const timerMinutes = Math.floor(timerRemaining / 60)
  const timerSeconds = timerRemaining % 60
  const timerDisplay = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`

  useEffect(() => {
    if (isTimerRunning) {
      const modeLabel = timerMode === 'focus' ? 'Focus' : timerMode === 'shortBreak' ? 'Break' : 'Long Break'
      document.title = `${timerDisplay} — ${modeLabel} | Obel`
    } else {
      document.title = 'Obel'
    }
    return () => { document.title = 'Obel' }
  }, [isTimerRunning, timerDisplay, timerMode])

  useEffect(() => {
    fetchTasks()
    loadFromUser()
  }, [fetchTasks, loadFromUser])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground shrink-0">
          <Zap className="w-5 h-5" />
        </div>
        <AnimatePresence>
          {(!collapsed || mobileOpen) && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-bold text-lg tracking-tight text-foreground whitespace-nowrap"
            >
              Obel
            </motion.span>
          )}
        </AnimatePresence>

        {/* Close button on mobile */}
        <button
          className="ml-auto md:hidden p-1.5 rounded-lg hover:bg-accent"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mini timer indicator */}
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
              className={`w-2 h-2 rounded-full ${timerMode === 'focus' ? 'bg-primary' : 'bg-emerald-500'}`}
            />
            <span>{timerDisplay}</span>
            <span className="text-[10px] opacity-70">
              {timerMode === 'focus' ? 'Focus' : 'Break'}
            </span>
          </motion.div>
        </NavLink>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed && !mobileOpen ? item.label : undefined}
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
              {(!collapsed || mobileOpen) && (
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
      <div className="border-t border-border p-2 space-y-1 shrink-0">
        {user && (!collapsed || mobileOpen) && (
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

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          title={collapsed && !mobileOpen ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <AnimatePresence>
            {(!collapsed || mobileOpen) && (
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

        {/* Collapse toggle — desktop only */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center hidden md:flex"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar — always visible on md+ */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative hidden md:flex flex-col border-r border-border bg-sidebar shrink-0"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile sidebar — slides in from left */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-[280px] flex flex-col border-r border-border bg-sidebar md:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-accent"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-primary-foreground">
              <Zap className="w-4 h-4" />
            </div>
            <span className="font-bold text-base">Obel</span>
          </div>

          {/* Mini timer on mobile top bar */}
          {isTimerRunning && (
            <NavLink to="/pomodoro" className="ml-auto">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                timerMode === 'focus' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-500'
              }`}>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`w-1.5 h-1.5 rounded-full ${timerMode === 'focus' ? 'bg-primary' : 'bg-emerald-500'}`}
                />
                {timerDisplay}
              </div>
            </NavLink>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-6xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
