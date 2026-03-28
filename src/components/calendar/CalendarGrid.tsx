import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTaskStore, type Task } from '@/stores/taskStore'
import dayjs from 'dayjs'


interface CalendarGridProps {
  currentDate: dayjs.Dayjs
  onPrevWeek: () => void
  onNextWeek: () => void
  onToday: () => void
  onTaskClick: (taskId: string) => void
}

export function CalendarGrid({ currentDate, onPrevWeek, onNextWeek, onToday, onTaskClick }: CalendarGridProps) {
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

      <div className="hidden sm:grid grid-cols-7 border-b border-border/50">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/5">
            {day}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:grid sm:grid-cols-7 auto-rows-auto sm:auto-rows-[180px]">
        {daysInWeek.map((day, idx) => {
          const isToday = day.isSame(dayjs(), 'day')
          const dateKey = day.format('YYYY-MM-DD')
          const dayTasks = tasksByDay.get(dateKey) || []

          return (
            <div 
              key={idx} 
              className={`p-3 sm:p-2 md:p-3 border-b border-border/30 sm:border-r last:border-r-0 relative transition-colors bg-background/20 hover:bg-muted/5 flex flex-col min-h-[100px] sm:min-h-0`}
            >
              <div className="flex sm:flex-col justify-between items-center sm:items-start mb-3 sm:mb-2 shrink-0 gap-3">
                <div className="flex items-center sm:flex-col gap-3 sm:gap-1">
                   <div className="flex flex-col sm:items-center">
                      <span className="text-[10px] sm:text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
                        {weekDays[day.day()]}
                      </span>
                      <span className={`text-sm font-black w-8 h-8 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-all ${
                        isToday ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'text-foreground/70'
                      }`}>
                        {day.date()}
                      </span>
                   </div>
                   <div className="sm:hidden flex flex-col">
                      <span className="text-xs font-bold text-foreground/80">{day.format('MMMM D, YYYY')}</span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{dayTasks.length} objectives</span>
                   </div>
                </div>
                {dayTasks.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary hidden sm:block mt-6" />
                )}
              </div>
              <div className="space-y-1.5 overflow-y-auto max-h-[150px] sm:max-h-[140px] custom-scrollbar pr-0.5 mt-1 flex-1">
                {dayTasks.length === 0 ? (
                  <div className="sm:hidden py-4 text-center border border-dashed border-border/40 rounded-xl">
                    <p className="text-[10px] text-muted-foreground font-medium italic">Rest and reflect day</p>
                  </div>
                ) : (
                  dayTasks.map(task => (
                    <button 
                      key={task.id}
                      onClick={() => onTaskClick(task.id)}
                      className={`w-full text-left text-[10px] sm:text-[9px] md:text-[10px] p-2.5 sm:p-2 rounded-xl border-l-2 font-bold transition-all duration-200 group/item ${
                        task.status === 'done' 
                          ? 'bg-muted/10 text-muted-foreground/50 border-muted-foreground/30 line-through opacity-60' 
                          : 'bg-card border-l-primary shadow-xs hover:shadow-md hover:bg-muted/10 hover:-translate-y-0.5 active:scale-95'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-primary" />
                        <span className="truncate">{task.title}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
