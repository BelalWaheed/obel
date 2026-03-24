import { useMemo, useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, GripVertical } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTaskStore, type Task } from '@/stores/taskStore'
import dayjs from 'dayjs'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function PlannerPage() {
  const [mobileTab, setMobileTab] = useState<'timeline' | 'backlog'>('timeline')
  const timelineRef = useRef<HTMLDivElement>(null)
  
  const tasks = useTaskStore((s) => s.tasks)
  const updateTask = useTaskStore((s) => s.updateTask)
  const getTasksDueToday = useTaskStore((s) => s.getTasksDueToday)

  const tasksDueToday = useMemo(() => getTasksDueToday(), [tasks, getTasksDueToday])

  const unscheduledTasks = useMemo(() => {
    return tasksDueToday.filter((t) => !t.scheduledTime && t.status !== 'done')
  }, [tasksDueToday])

  const scheduledTasks = useMemo(() => {
    const map = new Map<number, Task[]>()
    HOURS.forEach(h => map.set(h, []))

    tasksDueToday.forEach(t => {
      if (t.scheduledTime && t.status !== 'done') {
        const hour = parseInt(t.scheduledTime.split(':')[0], 10)
        if (!isNaN(hour)) {
          map.get(hour)?.push(t)
        }
      }
    })
    return map
  }, [tasksDueToday])

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId)
  }

  const handleDrop = async (e: React.DragEvent, hour: number) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return

    const timeStr = `${hour.toString().padStart(2, '0')}:00`
    await updateTask(taskId, { scheduledTime: timeStr })
  }

  const handleDropToBacklog = async (e: React.DragEvent) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return
    await updateTask(taskId, { scheduledTime: '' })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Auto-scroll to current hour
  useEffect(() => {
    const currentHour = dayjs().hour()
    const element = document.getElementById(`hour-${currentHour}`)
    if (element && timelineRef.current) {
      setTimeout(() => {
        timelineRef.current?.scrollTo({
          top: (element as HTMLElement).offsetTop - 100,
          behavior: 'smooth'
        })
      }, 100)
    }
  }, [])

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
      <div className="flex md:hidden bg-muted/50 p-1.5 rounded-xl shrink-0">
        <button 
          onClick={() => setMobileTab('timeline')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mobileTab === 'timeline' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Timeline
        </button>
        <button 
          onClick={() => setMobileTab('backlog')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${mobileTab === 'backlog' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Backlog
          {unscheduledTasks.length > 0 && (
            <span className="bg-primary/20 text-primary px-1.5 rounded-full text-[10px]">{unscheduledTasks.length}</span>
          )}
        </button>
      </div>

      <Card
        className={`w-full md:w-80 flex-col bg-background/50 border-border/50 ${mobileTab === 'backlog' ? 'flex' : 'hidden md:flex'}`}
        onDrop={handleDropToBacklog}
        onDragOver={handleDragOver}
      >
        <div className="p-4 border-b border-border/50">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10">
              <CalendarIcon className="w-4 h-4 text-primary" />
            </span>
            Backlog
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {unscheduledTasks.map((task) => (
            <motion.div
              layoutId={task.id}
              key={task.id}
              draggable
              onDragStart={(e: any) => handleDragStart(e, task.id)}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className={`bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-4 cursor-grab active:cursor-grabbing hover:shadow-2xl transition-all group flex items-start gap-3 ${
                task.priority === 'urgent' ? 'hover:border-red-500/30 hover:shadow-red-500/5' :
                task.priority === 'high' ? 'hover:border-orange-500/30 hover:shadow-orange-500/5' :
                task.priority === 'medium' ? 'hover:border-yellow-500/30 hover:shadow-yellow-500/5' :
                'hover:border-blue-500/30 hover:shadow-blue-500/5'
              }`}
            >
              <div className="flex flex-col items-center gap-1 shrink-0 mt-1">
                <GripVertical className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary transition-colors" />
                <div className={`w-1 h-4 rounded-full ${
                  task.priority === 'urgent' ? 'bg-red-500' :
                  task.priority === 'high' ? 'bg-orange-500' :
                  task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight mb-2 group-hover:text-primary transition-colors">{task.title}</p>
                <Badge variant="outline" className="text-[9px] font-black tracking-widest px-2 py-0 h-4 uppercase border-muted-foreground/20">
                  {task.priority}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      <Card className={`flex-1 flex-col overflow-hidden border-border/40 bg-card/20 backdrop-blur-3xl rounded-[2.5rem] ${mobileTab === 'timeline' ? 'flex' : 'hidden md:flex'}`}>
        <div 
          ref={timelineRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 bg-linear-to-b from-muted/5 to-background scroll-smooth"
        >
          <div className="space-y-6 max-w-4xl mx-auto">
            {HOURS.map((hour) => {
              const hourTasks = scheduledTasks.get(hour) || []
              const isCurrentHour = dayjs().hour() === hour

              return (
                <div key={hour} id={`hour-${hour}`} className="flex gap-8 relative group">
                  <div className="w-20 text-right shrink-0 pt-4">
                    <span className={`text-[10px] font-black tracking-widest uppercase transition-colors duration-500 ${isCurrentHour ? 'text-primary' : 'text-muted-foreground/30 group-hover:text-muted-foreground/60'}`}>
                      {dayjs().hour(hour).minute(0).format('H:00')}
                    </span>
                  </div>
                  
                  <div
                    className={`flex-1 min-h-20 rounded-[2rem] border-2 transition-all duration-500 relative p-4 flex flex-col gap-4 ${
                      isCurrentHour 
                        ? 'bg-primary/5 border-primary/20 shadow-[0_0_40px_-10px_rgba(var(--primary),0.15)] ring-1 ring-primary/10' 
                        : 'bg-card/20 border-border/30 hover:border-primary/20 hover:bg-card/40'
                    }`}
                    onDrop={(e) => handleDrop(e, hour)}
                    onDragOver={handleDragOver}
                  >
                    {isCurrentHour && (
                      <motion.div 
                        layoutId="current-hour-indicator"
                        className="absolute -left-15 top-1/2 -translate-y-1/2 flex items-center gap-3"
                      >
                        <div className="w-4 h-4 rounded-full bg-primary ring-8 ring-primary/10 animate-pulse" />
                        <div className="h-px w-8 bg-linear-to-r from-primary to-transparent opacity-50" />
                      </motion.div>
                    )}

                    {hourTasks.map((task) => (
                      <motion.div
                        layoutId={task.id}
                        key={task.id}
                        draggable
                        onDragStart={(e: any) => handleDragStart(e, task.id)}
                        whileHover={{ scale: 1.01, x: 5, transition: { duration: 0.2 } }}
                        className={`bg-card/80 backdrop-blur-2xl border border-border/50 rounded-2xl p-5 cursor-grab active:cursor-grabbing hover:shadow-2xl transition-all flex items-center justify-between group overflow-hidden relative ${
                          task.priority === 'urgent' ? 'shadow-red-500/5 hover:border-red-500/30' :
                          task.priority === 'high' ? 'shadow-orange-500/5 hover:border-orange-500/30' :
                          task.priority === 'medium' ? 'shadow-yellow-500/5 hover:border-yellow-500/30' :
                          'shadow-blue-500/5 hover:border-blue-500/30'
                        }`}
                      >
                         <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent pointer-events-none" />
                        
                        <div className="flex items-center gap-4 relative z-10">
                          <div className={`w-1.5 h-10 rounded-full transition-all duration-300 group-hover:scale-y-110 ${
                            task.priority === 'urgent' ? 'bg-red-500 shadow-lg shadow-red-500/40' :
                            task.priority === 'high' ? 'bg-orange-500 shadow-lg shadow-orange-500/40' :
                            task.priority === 'medium' ? 'bg-yellow-500 shadow-lg shadow-yellow-500/40' : 'bg-blue-500 shadow-lg shadow-blue-500/40'
                          }`} />
                          <div>
                            <p className="text-base font-bold tracking-tight group-hover:text-primary transition-colors">{task.title}</p>
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{task.priority}</span>
                          </div>
                        </div>
                        <GripVertical className="w-5 h-5 text-muted-foreground/10 group-hover:text-primary transition-colors shrink-0 relative z-10" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
