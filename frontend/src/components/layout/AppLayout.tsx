import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ListTodo,
  Timer,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  MoreHorizontal,
  X,
  FileText,
  Sun,

  Moon,
  CloudOff,
  WifiOff,
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTimerStore, type TimerMode } from '@/stores/timerStore'
import { useHabitStore } from '@/stores/habitStore'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { InstallBanner } from '@/components/pwa/InstallBanner'
import { UndoToast } from '@/components/ui/UndoToast'
import { useThemeStore } from '@/stores/themeStore'

// Lazy loaded layout components
const CommandPalette = lazy(() => import('@/components/CommandPalette').then(m => ({ default: m.CommandPalette })))
const LevelUpModal = lazy(() => import('../ui/LevelUpModal').then(m => ({ default: m.LevelUpModal })))

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/tasks', icon: ListTodo, label: 'Tasks' },
  { path: '/pomodoro', icon: Timer, label: 'Pomodoro' },
  { path: '/habits', icon: Sparkles, label: 'Habits' },
  { path: '/notes', icon: FileText, label: 'Notes' },
  { path: '/profile', icon: User, label: 'Profile' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
]

// Bottom nav shows first 4 items + More
const PRIMARY_NAV = navItems.slice(0, 4)
const MORE_NAV = navItems.slice(4)

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [prevLevel, setPrevLevel] = useState<number | null>(null)
  
  const isDark = useThemeStore((s) => s.isDark)
  // const setIsDark = useThemeStore((s) => s.setIsDark) // Removed unused

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const user = useAuthStore((s) => s.user)
  const isOffline = useAuthStore((s) => s.isOffline)
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

  const isTimerHydrated = useTimerStore((s) => s._hasHydrated)

  // Online / offline detection
  useEffect(() => {
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Visibility change handling for timer
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTimerHydrated) {
        resumeTick()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isTimerHydrated, resumeTick])

  // Tab title timer
  useEffect(() => {
    if (isTimerRunning) {
      const modeLabels: Record<TimerMode, string> = {
        focus: 'Focus',
        shortBreak: 'Break',
        longBreak: 'Long Break',
        coffeeBreak: 'Coffee Break',
      }
      document.title = `${timerDisplay} — ${modeLabels[timerMode]} | Obel`
    } else {
      document.title = 'Obel'
    }
    return () => { document.title = 'Obel' }
  }, [isTimerRunning, timerDisplay, timerMode])

  useEffect(() => {
    fetchTasks()
    loadFromUser()
    fetchHabits()
    if (isTimerHydrated) {
      resumeTick()
    }
  }, [fetchTasks, loadFromUser, fetchHabits, resumeTick, isTimerHydrated])

  // Sync Global Theme Class from Profile
  useEffect(() => {
    const activeTheme = user?.activeTheme || 'theme-default'
    
    // Remove existing themes
    const themes = ['theme-emerald', 'theme-midnight', 'theme-nord', 'theme-sunset', 'theme-dracula']
    themes.forEach(t => document.documentElement.classList.remove(t))
    
    if (activeTheme !== 'theme-default') {
      document.documentElement.classList.add(activeTheme)
    }
  }, [user?.activeTheme])

  // Track Level Up
  useEffect(() => {
    if (user?.level) {
      if (prevLevel !== null && user.level > prevLevel) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowLevelUp(true)
      }
      setPrevLevel(user.level)
    }
  }, [user?.level, prevLevel])


  const toggleTheme = () => {
    useThemeStore.getState().toggleTheme()
  }

  const showOfflineBadge = !isOnline || isOffline

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
              Obel
            </span>
          </motion.div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden z-10">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
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
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-card/95 border-l border-t border-primary/20 -rotate-45" />
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border/50 p-2 space-y-1 shrink-0 z-10">
        {user && !collapsed && (
          <div className="px-3 py-2 space-y-3">
            <NavLink
              to="/profile"
              className="flex items-center gap-2 rounded-xl hover:bg-white/5 transition-colors p-1"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate uppercase font-bold tracking-widest">
                  {user.email}
                </p>
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
            {isDark ? (
              <Sun className="w-4 h-4 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 shrink-0" />
            )}
            {!collapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
          </Button>
        </div>


        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center hidden md:flex hover:bg-white/5"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* BACKGROUND WATERMARK */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.02] select-none z-0">
        <div className="absolute top-[-5%] left-[-5%] text-[45vw] font-black leading-none tracking-tighter">
          Obel
        </div>
      </div>

      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        className="relative hidden md:flex flex-col border-r border-border/50 bg-black/20 backdrop-blur-3xl shrink-0 z-20"
      >
        {sidebarContent}
        <div className="mt-auto pt-2 p-4 flex items-center gap-2 justify-center opacity-40">
          {showOfflineBadge ? (
            <>
              <WifiOff className="w-4 h-4 text-orange-400" />
              {!collapsed && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 whitespace-nowrap overflow-hidden">
                  Offline
                </span>
              )}
            </>
          ) : (
            <>
              <CloudOff className="w-4 h-4 text-muted-foreground" />
              {!collapsed && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap overflow-hidden">
                  Local Data
                </span>
              )}
            </>
          )}
        </div>
      </motion.aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full z-10 overflow-hidden">
        {/* Scroll area — pb-nav on mobile so content isn't hidden under bottom nav */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto p-4 sm:p-8 max-w-7xl mx-auto w-full pb-nav md:pb-8"
        >
          <Outlet />
        </div>

        {/* ── Mobile bottom nav ── */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-2xl border-t border-border/50 z-50 flex items-center justify-around px-2"
          style={{
            height: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setShowMoreMenu(false)}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              showMoreMenu ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {showMoreMenu ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">More</span>
          </button>
        </nav>

        {/* More menu */}
        <AnimatePresence>
          {showMoreMenu && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="md:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-30"
                onClick={() => setShowMoreMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="md:hidden fixed inset-x-0 bg-background/98 backdrop-blur-3xl border-t border-border/50 z-40 p-4 grid grid-cols-3 gap-3"
                style={{
                  bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
                }}
              >
                {MORE_NAV.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMoreMenu(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                          : 'bg-muted/40 text-foreground hover:bg-muted'
                      }`
                    }
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-bold">{item.label}</span>
                  </NavLink>
                ))}
                

              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>

      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
      <InstallBanner />
      <UndoToast />
      
      {user && (
        <Suspense fallback={null}>
          <LevelUpModal 
            isOpen={showLevelUp} 
            onClose={() => setShowLevelUp(false)} 
            level={user.level} 
          />
        </Suspense>
      )}
    </div>
  )
}
