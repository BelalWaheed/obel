import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckCircle2, Play, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useTaskStore, type Priority, type Task } from '@/stores/taskStore'
import { useTimerStore } from '@/stores/timerStore'
import { useNavigate } from 'react-router-dom'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal'
import { TaskFilters } from '@/components/tasks/TaskFilters'

const priorityConfig: Record<Priority, { label: string; color: string; border: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-500 bg-red-500/10', border: 'border-red-500/20' },
  high: { label: 'High', color: 'text-orange-500 bg-orange-500/10', border: 'border-orange-500/20' },
  medium: { label: 'Medium', color: 'text-yellow-600 dark:text-yellow-500 bg-yellow-500/10', border: 'border-yellow-500/20' },
  low: { label: 'Low', color: 'text-blue-500 bg-blue-500/10', border: 'border-blue-500/20' },
}

export default function TasksPage() {
  const navigate = useNavigate()
  const tasks = useTaskStore((state) => state.tasks)
  const isLoading = useTaskStore((state) => state.isLoading)
  const getFilteredTasks = useTaskStore((state) => state.getFilteredTasks)
  const getAllTags = useTaskStore((state) => state.getAllTags)
  const toggleComplete = useTaskStore((state) => state.toggleComplete)

  const setActiveTaskId = useTimerStore((state) => state.setActiveTaskId)

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedTaskDetailsId, setSelectedTaskDetailsId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const filteredTasks = useMemo(
    () => {
      let fTasks = getFilteredTasks(filterStatus, filterPriority, searchQuery)
      // Exclude archived (done) tasks from the main list unless specifically filtered?
      // Since we removed 'done' from filters, we just exclude them here.
      if (filterStatus === 'all') {
        fTasks = fTasks.filter(t => t.status !== 'done')
      }
      return fTasks
    },
    [filterStatus, filterPriority, searchQuery, getFilteredTasks, tasks]
  ) 
  
  const liveSelectedTask = useMemo(() => 
    selectedTaskDetailsId ? tasks.find(t => t.id === selectedTaskDetailsId) || null : null,
  [tasks, selectedTaskDetailsId])

  const allTags = useMemo(() => getAllTags(), [tasks, getAllTags])

  const openCreateModal = () => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  const handleStartFocus = (taskId: string) => {
    setActiveTaskId(taskId)
    navigate('/pomodoro')
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent pb-1">
            Your Objectives
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">
            Plan your work, execute with focus, and achieve your goals.
          </p>
        </div>
        <Button 
          onClick={openCreateModal} 
          size="lg" 
          className="gap-2 rounded-full px-6 shadow-xl shadow-primary/25 hover:scale-105 transition-all duration-300 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span className="font-semibold text-base">New Task</span>
        </Button>
      </div>

      <TaskFilters 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
        allTags={allTags}
      />

      {isLoading && (
        <div className="text-center py-20">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-sm font-medium text-muted-foreground mt-4">Syncing your objectives...</p>
        </div>
      )}

      <div className="space-y-3 relative">
        <AnimatePresence mode="popLayout">
          {!isLoading && filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-24 px-4 bg-card/30 backdrop-blur-xl rounded-[2.5rem] border border-border/40"
            >
              <div className="w-24 h-24 bg-linear-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/5">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">You're all caught up</h3>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">Either you have no tasks here, or your filters are too specific. Take a break, or create a new objective.</p>
              <Button onClick={openCreateModal} variant="outline" className="mt-8 rounded-full px-6 h-12 text-base font-semibold border-border/50">
                Create a Task
              </Button>
            </motion.div>
          ) : (
            filteredTasks.map((task, index) => {
              const isDone = task.status === 'done'
              const prioConf = priorityConfig[task.priority]
              const totalSubtasks = task.subtasks?.length || 0
              const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: index * 0.03 } }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
                >
                  <Card
                    onClick={() => setSelectedTaskDetailsId(task.id)}
                    className={`relative overflow-hidden cursor-pointer group transition-all duration-300 rounded-2xl ${
                      isDone 
                        ? 'opacity-60 bg-muted/10 border-transparent shadow-none' 
                        : 'bg-card/70 backdrop-blur-md border border-border/50 hover:border-primary/40 shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5'
                    }`}
                  >
                    {!isDone && (
                      <div className="absolute inset-0 bg-linear-to-r from-white/10 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    )}
                    
                    <div className="p-4 flex items-center gap-4 relative z-10">
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (!isDone) {
                            import('canvas-confetti').then((confetti) => {
                              confetti.default({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.6 },
                                colors: ['#a855f7', '#ec4899', '#3b82f6']
                              })
                            })
                          }
                          toggleComplete(task.id) 
                        }}
                        className={`w-7 h-7 shrink-0 rounded-full border-[2.5px] flex items-center justify-center transition-all duration-300 ${
                          isDone 
                            ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-md shadow-primary/30' 
                            : 'border-muted-foreground/40 hover:border-primary text-transparent hover:bg-primary/10'
                        }`}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isDone ? 'opacity-100' : 'opacity-0'} transition-opacity`} strokeWidth={3} />
                      </button>
                      
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-3">
                          <h3 className={`font-bold text-lg truncate transition-colors duration-300 ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {task.title}
                          </h3>
                        </div>
                        {(!isDone && totalSubtasks > 0) && (
                          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                            {completedSubtasks}/{totalSubtasks} steps
                          </p>
                        )}
                      </div>
                      
                      <Badge variant="outline" className={`hidden sm:flex capitalize px-2.5 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${prioConf.color} ${prioConf.border} ${isDone ? 'opacity-50 grayscale' : ''}`}>
                         {prioConf.label}
                      </Badge>
                      
                      {!isDone && (
                        <Button
                          onClick={(e) => { e.stopPropagation(); handleStartFocus(task.id) }}
                          className="shrink-0 gap-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 font-bold rounded-xl h-9 px-4 shadow-none hover:shadow-md hover:shadow-primary/30 transition-all ml-2"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Focus</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      <TaskDetailsModal 
        task={liveSelectedTask}
        onClose={() => setSelectedTaskDetailsId(null)}
        onEdit={(task) => { setEditingTask(task); setIsModalOpen(true); }}
        onStartFocus={handleStartFocus}
      />

      <TaskFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingTask={editingTask}
      />
    </div>
  )
}
