import { useMemo } from 'react'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/stores/authStore'
import { useTaskStore } from '@/stores/taskStore'
import { useTimerStore } from '@/stores/timerStore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
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



export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const tasks = useTaskStore((s) => s.tasks)
  const sessionHistory = useTimerStore((s) => s.sessionHistory)
  const sessionsCompleted = useTimerStore((s) => s.sessionsCompleted)

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

  // Custom tooltips for charts
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground border border-border p-3 rounded-lg shadow-xl">
          <p className="font-medium text-sm mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-primary font-bold">{payload[0].value} minutes focused</p>
        </div>
      )
    }
    return null
  }

  if (!user) return null

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      
      {/* 1. Header Profile Section */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-border pb-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-4 border-background ring-2 ring-primary/20">
          <User className="w-10 h-10 text-primary" />
        </div>
        <div className="text-center sm:text-left flex-1 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
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

      {/* 2. Top-Level Stats */}
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

    </motion.div>
  )
}
