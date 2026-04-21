import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Clock,
  CheckCircle2,
  CalendarDays,
  Target,
  Flame,
  TrendingUp,
  Activity,
  Sparkles,
  Archive,
  RotateCcw,
  Search,
  Trash2,
  Palette,
  CheckCircle,
  Undo2,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/authStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTimerStore } from '@/stores/timerStore'
import { useThemeStore } from '@/stores/themeStore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { BackupManager } from '@/components/profile/BackupManager'
import { getStorageStats, clearAllLocalData } from '@/lib/storage'
import { HardDrive, ShieldAlert, Cpu } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

dayjs.extend(relativeTime)

// Custom tooltips for charts (defined outside to avoid re-creation on render)
interface CustomBarTooltipProps {
  active?: boolean
  payload?: {
    value: number
    payload: {
      fullDate: string
    }
  }[]
}

const CustomBarTooltip = ({ active, payload }: CustomBarTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-popover text-popover-foreground border border-border p-3 rounded-lg shadow-xl">
        <p className="font-medium text-sm mb-1">{data.fullDate}</p>
        <p className="text-primary font-bold">{payload[0].value} minutes focused</p>
      </div>
    )
  }
  return null
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const COLORS = {
  done: '#10b981', // emerald-500
  inProgress: '#3b82f6', // blue-500
  todo: '#64748b', // slate-500
}

const THEMES = [
  { id: 'theme-default', name: 'Original', colors: ['#492e56', '#f8f4fa'], icon: '✨' },
  { id: 'theme-emerald', name: 'Emerald', colors: ['#10b981', '#f0fdf4'], icon: '🌿' },
  { id: 'theme-midnight', name: 'Midnight', colors: ['#0ea5e9', '#f0f9ff'], icon: '🌊' },
  { id: 'theme-nord', name: 'Nord', colors: ['#5e81ac', '#eceff4'], icon: '❄️' },
  { id: 'theme-sunset', name: 'Sunset', colors: ['#f97316', '#fff7ed'], icon: '🌅' },
  { id: 'theme-dracula', name: 'Dracula', colors: ['#bd93f9', '#282a36'], icon: '🧛' },
]

export default function ProfilePage() {
  const isDark = useThemeStore((s) => s.isDark)
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const tasks = useTaskStore((s) => s.tasks)
  const sessionHistory = useTimerStore((s) => s.sessionHistory)
  const sessionsCompleted = useTimerStore((s) => s.sessionsCompleted)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const updateTask = useTaskStore((s) => s.updateTask)
  
  const [archiveSearch, setArchiveSearch] = useState('')
  const [showUndoToast, setShowUndoToast] = useState(false)
  const [lastRestoredTask, setLastRestoredTask] = useState<string | null>(null)
  
  const [storageStats, setStorageStats] = useState<{
    lsBytes: number;
    idbAvailable: boolean;
    quota: number;
    usage: number;
    percentage: number;
  } | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    getStorageStats().then(setStorageStats)
  }, [])

  const handleRestoreTask = async (id: string) => {
    await updateTask(id, { status: 'todo' })
    setLastRestoredTask(id)
    setShowUndoToast(true)
    setTimeout(() => setShowUndoToast(false), 5000)
  }

  const handleUndoRestore = async () => {
    if (lastRestoredTask) {
      await updateTask(lastRestoredTask, { status: 'done' })
      setShowUndoToast(false)
    }
  }

  const totalFocusHours = useMemo(() => {
    return sessionHistory
      .filter((s) => s.mode === 'focus')
      .reduce((acc, s) => acc + s.duration, 0) / 3600
  }, [sessionHistory])


  // ---------------------------------------------------------
  // 1. Focus Time Analytics (Last 7 Days)
  // ---------------------------------------------------------
  const focusTimeChartData = useMemo(() => {
    const data = []
    // Go backwards 6 days to today
    for (let i = 6; i >= 0; i--) {
      const targetDate = dayjs().subtract(i, 'day').startOf('day')
      const targetDateString = targetDate.format('YYYY-MM-DD')
      
      // Sum durations (in seconds) for focus sessions on this day
      const dailySeconds = sessionHistory
        .filter(
          (s) =>
            s.mode === 'focus' &&
            dayjs(s.completedAt).format('YYYY-MM-DD') === targetDateString
        )
        .reduce((acc, s) => acc + s.duration, 0)

      data.push({
        name: targetDate.format('ddd'), // Short day name (e.g. 'Mon')
        minutes: Math.round(dailySeconds / 60),
        fullDate: targetDate.format('MMM D, YYYY'),
      })
    }
    return data
  }, [sessionHistory])

  // ---------------------------------------------------------
  // 2. Task Completion Analytics
  // ---------------------------------------------------------
  const { completedTasks, completionRate } = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'done').length
    const pending = tasks.length - completed
    const rate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
    return { completedTasks: completed, pendingTasks: pending, completionRate: rate }
  }, [tasks])

  const taskStatusData = [
    { name: 'Completed', value: completedTasks, color: COLORS.done },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: COLORS.inProgress },
    { name: 'To Do', value: tasks.filter(t => t.status === 'todo').length, color: COLORS.todo },
  ].filter(d => d.value > 0)



  // ---------------------------------------------------------
  // 3. Fun Stats
  // ---------------------------------------------------------
  const mostProductiveDay = useMemo(() => {
    if (focusTimeChartData.length === 0) return 'N/A'
    const bestDay = [...focusTimeChartData].sort((a, b) => b.minutes - a.minutes)[0]
    return bestDay.minutes > 0 ? bestDay.name : 'N/A'
  }, [focusTimeChartData])

  const averageDailyMinutes = useMemo(() => {
    const totalCurrentWeek = focusTimeChartData.reduce((acc, d) => acc + d.minutes, 0)
    return Math.round(totalCurrentWeek / 7)
  }, [focusTimeChartData])

  const archivedTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'done')
      .filter(t => 
        t.title.toLowerCase().includes(archiveSearch.toLowerCase()) || 
        t.description?.toLowerCase().includes(archiveSearch.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(archiveSearch.toLowerCase()))
      )
      .sort((a, b) => dayjs(b.completedAt || b.createdAt).diff(dayjs(a.completedAt || a.createdAt)))
  }, [tasks, archiveSearch])


  if (!user) return null

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 relative">
      
      
      {/* 1. Header Profile Section */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-border pb-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-4 border-background ring-2 ring-primary/20">
          <User className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center sm:text-left flex-1 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setShowLogoutConfirm(true)}
              className="gap-2 rounded-xl font-bold h-10 px-4 sm:w-auto w-full"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
          </div>
          <p className="text-muted-foreground">{user.email}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2">
            <Badge variant="secondary" className="gap-1.5 py-1">
              <CalendarDays className="w-3.5 h-3.5" />
              Joined {dayjs(user.createdAt).format('MMMM D, YYYY')}
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1 bg-blue-500/10 text-blue-500 border-blue-500/20">
              <Target className="w-3.5 h-3.5" />
              {completedTasks} Tasks Completed
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* 2. Personalization (Theme Switcher) */}
      <motion.div variants={item} className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">Personalization</h2>
          </div>
          
          {/* Light/Dark Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-2xl border border-border/50">
            <button
              onClick={() => useThemeStore.getState().setIsDark(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                !isDark ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
            <button
              onClick={() => useThemeStore.getState().setIsDark(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isDark ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => updateUser({ activeTheme: theme.id })}
              className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                (user.activeTheme || 'theme-default') === theme.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner bg-muted/20">
                {theme.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{theme.name}</span>
              
              {/* Theme Preview Dot */}
              <div className="flex gap-1 mt-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors[0] }} />
                <div className="w-2 h-2 rounded-full border border-border" style={{ backgroundColor: theme.colors[1] }} />
              </div>

              {(user.activeTheme || 'theme-default') === theme.id && (
                <div className="absolute top-2 right-2">
                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* 3. Top-Level Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Focus Hours', value: totalFocusHours.toFixed(1), icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Sessions Completed', value: sessionsCompleted, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Avg Daily Focus (m)', value: averageDailyMinutes, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Best Day', value: mostProductiveDay, icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* 3. Deep Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Focus Chart */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="p-5 h-[350px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Focus Time (Last 7 Days)
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">Your daily productivity rhythm in minutes</p>
              </div>
            </div>
            <div className="flex-1 w-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={focusTimeChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, className: 'fill-muted-foreground' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, className: 'fill-muted-foreground' }} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                  <Bar dataKey="minutes" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Task Analytics */}
        <motion.div variants={item} className="lg:col-span-1 space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-lg mb-4">Task Completion</h3>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-bold text-emerald-500">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-3" />
            
            <div className="mt-6 flex justify-center h-[180px]">
              {taskStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No tasks yet</div>
              )}
            </div>
          </Card>
        </motion.div>



      </div>

      {/* 4. Appearance & Themes */}
      <motion.div variants={item} className="mt-8">
        <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Appearance & Themes
        </h3>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-6">
            Unlock premium themes by maintaining long habit streaks!
            <br/> • 3 Days = Cyberpunk
            <br/> • 7 Days = Forest
            <br/> • 14 Days = Sunset
          </p>
          
          <div className="flex flex-wrap gap-4">
            {['default', 'cyberpunk', 'forest', 'sunset'].map((themeName) => {
              const unlockedThemes = user.unlockedThemes ? JSON.parse(user.unlockedThemes) : []
              const isDefault = themeName === 'default'
              const isUnlocked = isDefault || unlockedThemes.includes(themeName)
              const isActive = (user.activeTheme || 'default') === themeName
              
              const themeColors = {
                default: 'bg-zinc-800 border-zinc-700',
                cyberpunk: 'bg-[#09090b] border-[#fcd34d]',
                forest: 'bg-[#0f172a] border-[#10b981]',
                sunset: 'bg-[#2a1625] border-[#fb7185]'
              }
              const bgClass = themeColors[themeName as keyof typeof themeColors]

              return (
                <button
                  key={themeName}
                  disabled={!isUnlocked}
                  onClick={() => useAuthStore.getState().updateUser({ activeTheme: themeName })}
                  className={`
                    relative w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-2
                    transition-all duration-300 border-2 
                    ${isUnlocked ? 'cursor-pointer hover:scale-105' : 'opacity-40 cursor-not-allowed grayscale'}
                    ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                    ${bgClass}
                  `}
                >
                  <div className="capitalize font-bold text-white text-xs z-10">{themeName}</div>
                  {!isUnlocked && <span className="text-[9px] text-white/70 absolute bottom-2">Locked</span>}
                  {isActive && <CheckCircle2 className="w-4 h-4 text-white absolute top-2 right-2" />}
                </button>
              )
            })}
          </div>
        </Card>
      </motion.div>

      {/* 5. Data Management & Privacy */}
      <motion.div variants={item} className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BackupManager />
        
        <Card className="p-6 border-border/50 bg-card/40 backdrop-blur-sm rounded-3xl">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            System & Storage
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/20 border border-border/50">
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-bold">Storage Engine</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">IndexedDB (High Performance)</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-black">
                ACTIVE
              </Badge>
            </div>

            {storageStats && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold px-1">
                  <span className="text-muted-foreground uppercase tracking-widest">Disk Usage</span>
                  <span>{Math.round(storageStats.usage / 1024 / 1024)}MB / {Math.round(storageStats.quota / 1024 / 1024)}MB</span>
                </div>
                <Progress value={storageStats.percentage} className="h-2 bg-muted/30" />
                <p className="text-[10px] text-muted-foreground px-1 italic">
                  Note: Local storage (legacy) is being phased out in favor of IndexedDB.
                </p>
              </div>
            )}

            <div className="pt-2">
              <Button 
                variant="outline" 
                className="w-full h-11 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive font-bold text-sm gap-2 transition-all"
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 className="w-4 h-4" />
                Wipe Local Database
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Wipe Confirmation Dialog */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md" 
              onClick={() => setShowClearConfirm(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              <Card className="relative w-full max-w-[400px] p-8 rounded-3xl shadow-2xl border-destructive/20 bg-card overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-destructive" />
                <div className="flex flex-col items-center text-center gap-5">
                  <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-2">
                    <ShieldAlert className="w-10 h-10 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Danger Zone</h3>
                    <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                      This will <span className="text-destructive font-black underline decoration-2 underline-offset-4">permanently delete</span> all local tasks, notes, habits, and settings from this browser. This cannot be undone.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 w-full mt-4">
                    <Button 
                      variant="destructive" 
                      className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-destructive/20 uppercase tracking-widest"
                      onClick={() => clearAllLocalData()}
                    >
                      Delete Everything
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full h-12 rounded-2xl font-bold text-muted-foreground hover:text-foreground"
                      onClick={() => setShowClearConfirm(false)}
                    >
                      Wait, keep my data
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Task Archive (Vault) */}
      <motion.div variants={item} className="mt-8 pb-12">
        <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
          <Archive className="w-5 h-5 text-primary" />
          Vault Archive
        </h3>
        <Card className="p-6 border-border/50 bg-card/40 backdrop-blur-sm rounded-3xl overflow-hidden">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search archived tasks..." 
              value={archiveSearch}
              onChange={(e) => setArchiveSearch(e.target.value)}
              className="h-12 pl-11 bg-background/50 border-border/50 rounded-2xl font-medium focus-visible:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            {archivedTasks.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border/30 rounded-2xl">
                <Archive className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-muted-foreground">No archived items</h3>
                <p className="text-xs text-muted-foreground/60">Your completed tasks will appear here.</p>
              </div>
            ) : (
              archivedTasks.map((task) => (
                <motion.div
                  layout
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 border border-border/50 bg-card/40 hover:bg-card/60 transition-all rounded-xl group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                        {dayjs(task.completedAt || task.createdAt).format('MMM D, YYYY')}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-muted-foreground line-through decoration-muted-foreground/30 truncate">
                      {task.title}
                    </h3>
                  </div>
                  <div className="flex gap-2 shrink-0 self-end sm:self-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 px-3 rounded-lg font-bold bg-primary/5 text-primary hover:bg-primary/10 transition-colors gap-2 text-xs"
                      onClick={() => handleRestoreTask(task.id)}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </motion.div>
      {/* Undo Toast */}
      <AnimatePresence>
        {showUndoToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-100 flex items-center gap-3 bg-foreground text-background px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm min-w-[280px] justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Task restored successfully</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndoRestore}
              className="h-8 px-3 rounded-xl hover:bg-white/10 text-primary gap-1.5"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Logout Confirmation Dialog ── */}
      <div className={`fixed inset-0 z-100 flex items-center justify-center p-4 transition-all duration-300 ${showLogoutConfirm ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
        <Card className={`relative w-full max-w-[380px] p-6 rounded-3xl shadow-2xl border-border bg-card transition-all duration-500 ${showLogoutConfirm ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-2">
              <LogOut className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Ready to leave?</h3>
              <p className="text-muted-foreground mt-2">
                Your data is safe on this device. You'll need to log in again to access cloud features.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-4">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-2xl font-bold"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-destructive/20"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
              >
                Log Out
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}

