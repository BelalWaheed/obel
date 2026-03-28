import { useNavigate } from 'react-router-dom'
import { ListTodo, CheckCircle2, Clock, Zap, Play, ArrowRight, Calendar, Flame } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Task } from '@/stores/taskStore'
import type { Habit } from '@/stores/habitStore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)



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
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Due Today</h3>
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/tasks')}>
          View all <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No tasks due today. You're all caught up! 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer" onClick={() => navigate('/tasks')}>
              <span className="text-sm font-medium flex-1 truncate">{task.title}</span>
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

