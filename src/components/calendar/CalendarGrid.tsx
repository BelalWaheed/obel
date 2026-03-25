import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTaskStore, type Task, type Priority } from '@/stores/taskStore'
import dayjs from 'dayjs'

const priorityColors: Record<Priority, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
}

interface CalendarGridProps {
  currentDate: dayjs.Dayjs
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
}

export function CalendarGrid({ currentDate, onPrevWeek, onNextWeek, onToday }: CalendarGridProps) {
  const tasks = useTaskStore((state) => state.tasks)
  
  const daysInWeek = useMemo(() => {
    const startOfWeek = currentDate.startOf('week')
    const endOfWeek = currentDate.endOf('week')

    const days = []
    let day = startOfWeek
    while (day.isBefore(endOfWeek) || day.isSame(endOfWeek, 'day')) {
      days.push(day)
      day = day.add(1, 'day')
    }
    return days
  }, [currentDate])

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateKey = dayjs(task.dueDate).format('YYYY-MM-DD')
        if (!map.has(dateKey)) map.set(dateKey, [])
        map.get(dateKey)?.push(task)
      }
    })
    return map
  }, [tasks])

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const weekLabel = useMemo(() => {
    const start = currentDate.startOf('week')
    const end = currentDate.endOf('week')
    if (start.month() === end.month()) {
      return `${start.format('MMM D')} - ${end.format('D, YYYY')}`
    }
    return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`
  }, [currentDate])

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-xl overflow-hidden shadow-2xl rounded-3xl">
      <div className="p-4 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/20">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold tracking-tight min-w-[200px]">
            {weekLabel}
          </h2>
          <div className="flex bg-muted/50 p-1 rounded-xl">
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onPrevWeek}>
               <ChevronLeft className="w-4 h-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onNextWeek}>
               <ChevronRight className="w-4 h-4" />
             </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold border-border/50" onClick={onToday}>
            Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border/50">
        {weekDays.map(day => (
          <div key={day} className="py-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/5">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[140px] sm:auto-rows-[180px]">
        {daysInWeek.map((day, idx) => {
          const isToday = day.isSame(dayjs(), 'day')
          const dateKey = day.format('YYYY-MM-DD')
          const dayTasks = tasksByDay.get(dateKey) || []

          return (
            <div 
              key={idx} 
              className={`p-3 border-r border-b border-border/30 last:border-r-0 relative transition-colors bg-background/20 hover:bg-muted/10`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col items-center">
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{weekDays[day.day()]}</span>
                   <span className={`text-base font-black w-8 h-8 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'text-foreground/70'
                  }`}>
                    {day.date()}
                  </span>
                </div>
                {dayTasks.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-primary/40 mt-6" />
                )}
              </div>
              <div className="space-y-1.5 overflow-y-auto max-h-[80px] sm:max-h-[110px] custom-scrollbar pr-0.5 mt-2">
                {dayTasks.map(task => (
                  <div 
                    key={task.id}
                    className={`text-[9px] sm:text-[10px] p-1.5 rounded-lg border-l-2 truncate font-bold ${
                      task.status === 'done' 
                        ? 'bg-muted/5 text-muted-foreground/50 border-muted-foreground/30 line-through opacity-60' 
                        : 'bg-card border-l-primary shadow-sm hover:translate-x-0.5 transition-transform'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${priorityColors[task.priority]}`} />
                      <span className="truncate">{task.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
