import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar as CalendarIcon, Clock, GripVertical } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTaskStore, type Task } from '@/stores/taskStore'
import dayjs from 'dayjs'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function PlannerPage() {
  const tasks = useTaskStore((s) => s.tasks)
  const updateTask = useTaskStore((s) => s.updateTask)
  const getTasksDueToday = useTaskStore((s) => s.getTasksDueToday)

  const tasksDueToday = useMemo(() => getTasksDueToday(), [tasks, getTasksDueToday])

  // Tasks without a scheduled time (Backlog)
  const unscheduledTasks = useMemo(() => {
    return tasksDueToday.filter((t) => !t.scheduledTime && t.status !== 'done')
  }, [tasksDueToday])

  // Tasks mapped by hour (0-23)
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
    // remove scheduled time (this means we need to pass '' or null. since serialize task ignores null, passing '' will wipe it via JSON.stringify but wait, json won't)
    // Actually our updateTask merges.
    // wait, if we set scheduledTime: '', it drops it. Let's do that.
    await updateTask(taskId, { scheduledTime: '' })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
      {/* Left: Unscheduled Backlog */}
      <Card
        className="w-full md:w-80 flex flex-col bg-background/50 border-border/50"
        onDrop={handleDropToBacklog}
        onDragOver={handleDragOver}
      >
        <div className="p-4 border-b border-border/50">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10">
              <CalendarIcon className="w-4 h-4 text-primary" />
            </span>
            Today's Backlog
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Drag tasks to the timeline to schedule them.</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {unscheduledTasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
              No tasks left. You're all planned!
            </div>
          )}
          {unscheduledTasks.map((task) => (
            <motion.div
              layoutId={task.id}
              key={task.id}
              draggable
              onDragStart={(e: any) => handleDragStart(e, task.id)}
              className="bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group flex items-start gap-2"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground/30 mt-0.5 group-hover:text-primary transition-colors shrink-0" />
              <div>
                <p className="text-sm font-medium leading-tight mb-1">{task.title}</p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                    {task.priority}
                  </Badge>
                  {task.estimatedDuration && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                      {task.estimatedDuration}m
                    </Badge>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Right: Timeline */}
      <Card className="flex-1 flex flex-col overflow-hidden border-border/50">
        <div className="p-4 border-b border-border/50 flex justify-between items-center bg-background/50 sticky top-0 z-20">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10">
              <Clock className="w-4 h-4 text-primary" />
            </span>
            Daily Timeline
          </h2>
          <Badge variant="outline">{dayjs().format('dddd, MMMM D')}</Badge>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/10 relative">
          <div className="space-y-4">
            {HOURS.map((hour) => {
              const hourTasks = scheduledTasks.get(hour) || []
              const isCurrentHour = dayjs().hour() === hour

              return (
                <div key={hour} className="flex gap-4">
                  <div className="w-16 text-right shrink-0 pt-2">
                    <span className={`text-xs font-semibold ${isCurrentHour ? 'text-primary' : 'text-muted-foreground'}`}>
                      {dayjs().hour(hour).minute(0).format('h A')}
                    </span>
                  </div>
                  
                  <div
                    className={`flex-1 min-h-[4rem] rounded-xl border-2 transition-colors duration-200 relative p-2 flex flex-col gap-2 ${
                      isCurrentHour ? 'bg-primary/5 border-primary/20' : 'bg-background border-dashed hover:bg-muted/30'
                    }`}
                    onDrop={(e) => handleDrop(e, hour)}
                    onDragOver={handleDragOver}
                  >
                    {isCurrentHour && (
                      <div className="absolute top-0 -left-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20" />
                    )}

                    {hourTasks.map((task) => (
                      <motion.div
                        layoutId={task.id}
                        key={task.id}
                        draggable
                        onDragStart={(e: any) => handleDragStart(e, task.id)}
                        className="bg-card border-l-4 border-l-primary border-y border-r rounded-md p-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow flex items-start justify-between group"
                      >
                        <div>
                          <p className="text-sm font-medium leading-tight">{task.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {task.scheduledTime}
                            {task.estimatedDuration ? ` • ${task.estimatedDuration}m` : ''}
                          </p>
                        </div>
                        <GripVertical className="w-4 h-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
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
