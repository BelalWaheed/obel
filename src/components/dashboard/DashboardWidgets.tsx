import { useNavigate } from 'react-router-dom'
import { ListTodo, CheckCircle2, Clock, Zap, Play, ArrowRight, Calendar, Flag, Flame } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Task } from '@/stores/taskStore'
import type { Habit } from '@/stores/habitStore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
}

export function QuickActionsWidget({ isRunning, completionRate }: { isRunning: boolean; completionRate: number }) {
  const navigate = useNavigate()
  return (
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
  )
}

export function DueTodayWidget({ tasks }: { tasks: Task[] }) {
  const navigate = useNavigate()
  return (
    <Card className="p-5 h-full bg-card/40 backdrop-blur-xl border-border/40">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Due Today
        </h3>
        <Button variant="ghost" size="sm" className="gap-1 text-xs hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => navigate('/tasks')}>
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50 border-2 border-dashed border-border/20 rounded-2xl">
          <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-xs font-bold tracking-widest uppercase">Clear Horizon</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.slice(0, 5).map((task) => (
            <div 
              key={task.id} 
              className={`flex items-center gap-3 p-3 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all cursor-pointer group shadow-sm hover:shadow-primary/5 ${
                task.priority === 'urgent' ? 'shadow-red-500/5 hover:shadow-red-500/10' :
                task.priority === 'high' ? 'shadow-orange-500/5 hover:shadow-orange-500/10' :
                task.priority === 'medium' ? 'shadow-yellow-500/5 hover:shadow-yellow-500/10' :
                'shadow-blue-500/5 hover:shadow-blue-500/10'
              }`} 
              onClick={() => navigate('/tasks')}
            >
              <div className={`w-1.5 h-6 rounded-full shrink-0 transition-transform group-hover:scale-y-125 ${priorityColors[task.priority]}`} />
              <span className="text-sm font-bold truncate flex-1 group-hover:text-primary transition-colors">{task.title}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function DailyHabitsWidget({ habits }: { habits: Habit[] }) {
  const navigate = useNavigate()
  return (
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
  )
}

export function UrgentTasksWidget({ tasks }: { tasks: Task[] }) {
  const navigate = useNavigate()
  if (tasks.length === 0) return null
  return (
    <Card className="p-5 border-primary/20 bg-primary/5 h-full backdrop-blur-xl rounded-[2rem] overflow-hidden relative">
      <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="p-2 rounded-xl bg-primary/10">
          <Flag className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg tracking-tight">Focus Units</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">High Priority Backlog</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-primary/10 border-primary/20 text-primary font-black px-2">{tasks.length}</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
        {tasks.slice(0, 4).map((task) => (
          <div 
            key={task.id} 
            className="group flex flex-col gap-2 p-4 rounded-2xl bg-card/60 border border-border/50 hover:border-primary/40 hover:bg-card hover:shadow-2xl hover:shadow-primary/10 transition-all cursor-pointer" 
            onClick={() => navigate('/tasks')}
          >
            <div className="flex items-center justify-between">
               <div className={`w-8 h-1 rounded-full ${priorityColors[task.priority]} opacity-80`} />
               {task.dueDate && <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60">{dayjs(task.dueDate).fromNow()}</span>}
            </div>
            <span className="text-sm font-bold tracking-tight line-clamp-2 group-hover:text-primary transition-colors">{task.title}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
