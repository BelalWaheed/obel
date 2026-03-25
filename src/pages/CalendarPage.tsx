import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { useTaskStore } from '@/stores/taskStore'
import { useTimerStore } from '@/stores/timerStore'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

export default function CalendarPage() {
  const navigate = useNavigate()
  const tasks = useTaskStore((state) => state.tasks)
  const setActiveTaskId = useTimerStore((state) => state.setActiveTaskId)
  
  const [currentDate, setCurrentDate] = useState(dayjs())
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)

  const handlePrevWeek = () => setCurrentDate(currentDate.subtract(1, 'week'))
  const handleNextWeek = () => setCurrentDate(currentDate.add(1, 'week'))
  const handleToday = () => setCurrentDate(dayjs())

  const selectedTask = useMemo(() => 
    selectedTaskId ? tasks.find(t => t.id === selectedTaskId) || null : null,
  [tasks, selectedTaskId])

  const handleStartFocus = (taskId: string) => {
    setActiveTaskId(taskId)
    navigate('/pomodoro')
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Focus Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Strategic mapping of your deadlines and objectives.
          </p>
        </div>
      </div>

      <CalendarGrid 
        currentDate={currentDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        onTaskClick={(id) => setSelectedTaskId(id)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Weekly Planning</h4>
          <p className="text-sm text-foreground/80 leading-relaxed font-medium">
            Use this view to align your weekly goals. Clicking any task will reveal its full roadmap, 
            allowing you to stay synchronized with your broader mission.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-muted/20 border border-border/50">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Strategic Overview</h4>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            Keep an eye on clustered deadlines. If a day has more than 3 high-priority tasks, 
            consider rescheduling to maintain peak focus and flow.
          </p>
        </div>
      </div>

      <TaskDetailsModal 
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onEdit={(task) => { setEditingTask(task); setIsEditModalOpen(true); }}
        onStartFocus={handleStartFocus}
      />

      <TaskFormModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        editingTask={editingTask}
      />
    </motion.div>
  )
}
