import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  ListTodo,
  Timer,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  Play,
  ArrowRight,
  Calendar,
  Flag,
  Flame,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useTaskStore } from '@/stores/taskStore'
import { useTimerStore } from '@/stores/timerStore'
import { useAuthStore } from '@/stores/authStore'
import { useHabitStore } from '@/stores/habitStore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const tasks = useTaskStore((s) => s.tasks)
  const getTasksDueToday = useTaskStore((s) => s.getTasksDueToday)
  const getCompletedToday = useTaskStore((s) => s.getCompletedToday)
  const sessionsCompleted = useTimerStore((s) => s.sessionsCompleted)
  const isRunning = useTimerStore((s) => s.isRunning)
  const sessionHistory = useTimerStore((s) => s.sessionHistory)
  const userName = useAuthStore((s) => s.user?.name || '')
  const habits = useHabitStore((s) => s.habits)

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

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0
    return Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100)
  }, [tasks])

  const stats = [
    { label: 'Active Tasks', value: activeTasks.length, icon: ListTodo, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Completed Today', value: completedToday.length, icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { label: 'Focus Minutes', value: todayFocusMinutes, icon: Timer, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { label: 'Sessions Done', value: sessionsCompleted, icon: TrendingUp, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  ]

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}{userName ? `, ${userName}` : ''} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your productivity today.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Quick Actions */}
        <motion.div variants={item} className="lg:col-span-1">
          <Card className="p-5 h-full">
            <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button className="w-full justify-start gap-3 h-12 shadow-sm" onClick={() => navigate('/pomodoro')}>
                {isRunning ? <Zap className="w-5 h-5 text-yellow-300" /> : <Play className="w-5 h-5" />}
                {isRunning ? 'Continue Focus Session' : 'Start Pomodoro'}
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => navigate('/tasks')}>
                <ListTodo className="w-5 h-5" />Manage Tasks
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={() => navigate('/habits')}>
                <Calendar className="w-5 h-5" />View Habits
              </Button>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Task Completion</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </Card>
        </motion.div>

        {/* Col 2: Due Today */}
        <motion.div variants={item} className="lg:col-span-1">
          <Card className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Due Today</h3>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/tasks')}>
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            {tasksDueToday.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No tasks due today. You're all caught up! 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasksDueToday.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer" onClick={() => navigate('/tasks')}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${priorityColors[task.priority]}`} />
                    <span className="text-sm font-medium flex-1 truncate">{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Col 3: Habits Today */}
        <motion.div variants={item} className="lg:col-span-1">
          <Card className="p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Daily Habits</h3>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/habits')}>
                Track <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            {habits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Build your first daily habit to start fresh.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {habits.slice(0, 5).map((habit) => {
                  let isDone = false
                  try {
                    const todayStr = dayjs().format('YYYY-MM-DD')
                    isDone = JSON.parse(habit.completedDates || '[]').includes(todayStr)
                  } catch (e) {}

                  return (
                    <div key={habit.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${isDone ? 'bg-primary/5 border-primary/20' : 'bg-background hover:bg-muted'}`} onClick={() => navigate('/habits')}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${isDone ? 'text-primary' : 'text-muted-foreground/30'}`} />
                        <span className={`text-sm font-medium truncate ${isDone ? 'text-primary' : ''}`}>{habit.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Flame className={`w-3.5 h-3.5 ${habit.currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground/30'}`} />
                        <span className={`text-xs font-bold ${habit.currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>{habit.currentStreak}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {urgentTasks.length > 0 && (
        <motion.div variants={item}>
          <Card className="p-5 border-orange-500/30 bg-orange-500/5">
            <div className="flex items-center gap-2 mb-4">
              <Flag className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-lg">Needs Attention</h3>
              <Badge variant="secondary" className="ml-1">{urgentTasks.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {urgentTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-background hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate('/tasks')}>
                  <div className={`w-2.5 h-2.5 rounded-full ${priorityColors[task.priority]}`} />
                  <span className="text-sm font-medium flex-1 truncate">{task.title}</span>
                  {task.dueDate && <span className="text-xs text-muted-foreground">{dayjs(task.dueDate).fromNow()}</span>}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
