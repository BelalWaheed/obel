import { useEffect, useState, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ListTodo,
  Timer,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Archive,
  MoreHorizontal,
  X,
  CalendarClock,
  BarChart3,
  FileText,
  Sun,
  Moon,
  CloudOff,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTimerStore, type TimerMode } from '@/stores/timerStore'
import { useHabitStore } from '@/stores/habitStore'
import { CommandPalette } from '@/components/CommandPalette'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { InstallBanner } from '@/components/pwa/InstallBanner'
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/tasks', icon: ListTodo, label: 'Tasks' },
  { path: '/pomodoro', icon: Timer, label: 'Pomodoro' },
  { path: '/habits', icon: Sparkles, label: 'Habits' },
  { path: '/planner', icon: CalendarClock, label: 'Planner' },
  { path: '/notes', icon: FileText, label: 'Notes' },
  { path: '/profile', icon: User, label: 'Profile' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/archive', icon: Archive, label: 'Archive' },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [showTopBar, setShowTopBar] = useState(true)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
  const navigate = useNavigate()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: scrollContainerRef })

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0
    if (latest > previous && latest > 50) {
      setShowTopBar(false)
    } else {
      setShowTopBar(true)
    }
  })

  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const fetchTasks = useTaskStore((s) => s.fetchTasks)
  const loadFromUser = useTimerStore((s) => s.loadFromUser)
  const fetchHabits = useHabitStore((s) => s.fetchHabits)
  const resumeTick = useTimerStore((s) => s.resumeTick)

  const isTimerRunning = useTimerStore((s) => s.isRunning)
  const timerRemaining = useTimerStore((s) => s.timeRemaining)
  const timerMode = useTimerStore((s) => s.mode)

  const timerMinutes = Math.floor(timerRemaining / 60)
  const timerSeconds = timerRemaining % 60
  const timerDisplay = `${String(timerMinutes).padStart(2, '0')}:${String(timerSeconds).padStart(2, '0')}`

  useEffect(() => {
    if (isTimerRunning) {
      const modeLabels: Record<TimerMode, string> = {
        focus: 'Focus',
        shortBreak: 'Break',
        longBreak: 'Long Break',
        coffeeBreak: 'Coffee Break'
      }
      const modeLabel = modeLabels[timerMode] || 'Timing'
      document.title = `${timerDisplay} — ${modeLabel} | OBEL`
    } else {
      document.title = 'OBEL'
    }
    return () => { document.title = 'OBEL' }
  }, [isTimerRunning, timerDisplay, timerMode])

  useEffect(() => {
    fetchTasks()
    loadFromUser()
    fetchHabits()
    resumeTick()
  }, [fetchTasks, loadFromUser, fetchHabits, resumeTick])

  // Initialize theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('obel-theme')
    if (saved === 'dark') {
      document.documentElement.classList.add('dark')
      setIsDark(true)
    } else if (saved === 'light') {
      document.documentElement.classList.remove('dark')
      setIsDark(false)
    } else {
      // Follow system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
      setIsDark(prefersDark)
    }
  }, [])

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('obel-theme', next ? 'dark' : 'light')
  }

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 shrink-0 border border-primary/20">
          <Logo size={24} />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <span className="font-black text-2xl tracking-[0.2em] text-foreground uppercase">
              OBEL
            </span>
          </motion.div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden z-10">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 group relative ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
            
            {!collapsed ? (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                className="whitespace-nowrap overflow-hidden"
              >
                {item.label}
              </motion.span>
            ) : (
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-card/95 backdrop-blur-2xl border border-primary/20 rounded-xl shadow-2xl opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none whitespace-nowrap z-100 hidden md:block">
                <span className="text-[10px] font-black tracking-[0.2em] uppercase text-foreground">
                  {item.label}
                </span>
                {/* Tooltip Arrow */}
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-card/95 border-l border-t border-primary/20 -rotate-45" />
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border/50 p-2 space-y-1 shrink-0 z-10">
        {user && !collapsed && (
          <div className="px-3 py-2 space-y-3">
            <NavLink to="/profile" className="flex items-center gap-2 rounded-xl hover:bg-white/5 transition-colors p-1">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-widest">{user.email}</p>
              </div>
            </NavLink>
            <LevelBadge level={user.level || 1} xp={user.xp || 0} size="sm" />
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center hidden md:flex hover:bg-white/5"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* BACKGROUND TYPOGRAPHY WATERMARK */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.02] select-none z-0">
        <div className="absolute top-[-5%] left-[-5%] text-[45vw] font-black leading-none tracking-tighter">
          OBEL
        </div>
        <div className="absolute bottom-[-5%] right-[-5%] text-[30vw] font-black leading-none tracking-tighter text-primary">
          FOCUS
        </div>
      </div>

      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        className="relative hidden md:flex flex-col border-r border-border/50 bg-black/20 backdrop-blur-3xl shrink-0 z-20"
      >
        {sidebarContent}
        {/* Sync Indicator */}
        <div className="mt-auto pt-4 p-4 opacity-50 flex items-center gap-2 justify-center group-hover:opacity-100 transition-opacity">
           <CloudOff className="w-4 h-4 text-muted-foreground" />
           {!collapsed && <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap overflow-hidden">Local Data</span>}
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 relative h-full z-10">
        {/* Mobile top bar */}
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: showTopBar ? 0 : -60 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-between px-4 h-14 border-b border-border/50 shrink-0 md:hidden bg-background/50 backdrop-blur-xl sticky top-0 z-40"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 border border-primary/20">
              <Logo size={18} />
            </div>
            <span className="font-black text-xl tracking-widest uppercase">OBEL</span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground w-8 h-8 rounded-lg">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </motion.div>

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-auto p-4 sm:p-8 max-w-7xl mx-auto w-full"
        >
          <Outlet />
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/90 backdrop-blur-2xl border-t border-border/50 z-50 flex items-center justify-around px-2 pb-safe">
          {navItems.slice(0, 4).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setShowMoreMenu(false)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full gap-1 ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 ${
              showMoreMenu ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {showMoreMenu ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">More</span>
          </button>
        </nav>

        <AnimatePresence>
          {showMoreMenu && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="md:hidden fixed inset-x-0 bottom-16 bg-background/95 backdrop-blur-3xl border-t border-border/50 z-40 p-4 grid grid-cols-2 gap-4 pb-8"
            >
              {navItems.slice(4).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setShowMoreMenu(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 p-4 rounded-2xl ${
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-white/5 text-foreground'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-bold">{item.label}</span>
                </NavLink>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <CommandPalette />
      <InstallBanner />

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-[380px] rounded-2xl">
          <DialogTitle className="text-xl font-bold">Log out?</DialogTitle>
          <p className="text-sm text-muted-foreground">Are you sure you want to log out? Any unsaved changes will be lost.</p>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1 rounded-xl font-bold" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl font-bold" onClick={confirmLogout}>Log Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
