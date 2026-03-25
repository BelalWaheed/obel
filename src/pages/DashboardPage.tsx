import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ListTodo, Timer, CheckCircle2, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useTaskStore } from '@/stores/taskStore'
import { useTimerStore } from '@/stores/timerStore'
import { useAuthStore } from '@/stores/authStore'
import { ProductivityCoach } from '@/components/dashboard/ProductivityCoach'
import {
  DueTodayWidget,
  UrgentTasksWidget,
} from '@/components/dashboard/DashboardWidgets'
import { LevelBadge } from '@/components/ui/LevelBadge'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function DashboardPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const getTasksDueToday = useTaskStore((s) => s.getTasksDueToday)
  const getCompletedToday = useTaskStore((s) => s.getCompletedToday)
  const sessionsCompleted = useTimerStore((s) => s.sessionsCompleted)
  const sessionHistory = useTimerStore((s) => s.sessionHistory)
  const user = useAuthStore((s) => s.user)
  const userName = user?.name || ''

  const tasksDueToday = useMemo(() => getTasksDueToday(), [tasks, getTasksDueToday])
  const completedToday = useMemo(() => getCompletedToday(), [tasks, getCompletedToday])

  const todayFocusMinutes = useMemo(() => {
    const today = new Date().toDateString()
    return Math.round(
      sessionHistory
        .filter((s) => s.mode === 'focus' && new Date(s.completedAt).toDateString() === today)
        .reduce((acc, s) => acc + s.duration, 0) / 60
    )
  }, [sessionHistory])

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== 'done'), [tasks])
  const urgentTasks = useMemo(() => activeTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high'), [activeTasks])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const stats = [
    { label: 'Active Tasks', value: activeTasks.length, icon: ListTodo, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Completed Today', value: completedToday.length, icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { label: 'Focus Minutes', value: todayFocusMinutes, icon: Timer, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { label: 'Sessions Done', value: sessionsCompleted, icon: TrendingUp, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}{userName ? `, ${userName}` : ''} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's happening with your productivity today.</p>
        </div>
        {user && (
          <LevelBadge level={user.level || 1} xp={user.xp || 0} size="md" />
        )}
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="p-4 hover:shadow-md transition-shadow cursor-default">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bgColor}`}><Icon className={`w-5 h-5 ${stat.color}`} /></div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div variants={item}>
          <DueTodayWidget tasks={tasksDueToday} />
        </motion.div>

        {urgentTasks.length > 0 && (
          <motion.div variants={item}>
             <UrgentTasksWidget tasks={urgentTasks} />
          </motion.div>
        )}
      </div>

      <motion.div variants={item}>
        <ProductivityCoach />
      </motion.div>
    </motion.div>
  )
}
