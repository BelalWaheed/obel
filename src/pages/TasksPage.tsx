import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTaskStore } from '@/stores/taskStore'
import { useTimerStore } from '@/stores/timerStore'
import { useNavigate } from 'react-router-dom'
import { TaskFormModal } from '@/components/tasks/TaskFormModal'
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal'
import { TaskListCard } from '@/components/tasks/TaskListCard'

export default function TasksPage() {
  const navigate = useNavigate()
  const tasks = useTaskStore((state) => state.tasks)
  const lists = useTaskStore((state) => state.lists)
  const isLoading = useTaskStore((state) => state.isLoading)
  const getFilteredTasks = useTaskStore((state) => state.getFilteredTasks)
  const addList = useTaskStore((state) => state.addList)

  const setActiveTaskId = useTimerStore((state) => state.setActiveTaskId)

  const [filterStatus] = useState<string>('all')
  const [filterPriority] = useState<string>('all')
  const [searchQuery] = useState('')

  const [selectedTaskDetailsId, setSelectedTaskDetailsId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)

  const filteredTasks = useMemo(
    () => {
      let fTasks = getFilteredTasks(filterStatus, filterPriority, searchQuery)
      return fTasks
    },
    [filterStatus, filterPriority, searchQuery, getFilteredTasks, tasks]
  ) 
  
  const tasksByList = useMemo(() => {
    const grouped: Record<string, typeof tasks> = {}
    lists.forEach(list => {
      grouped[list.id] = filteredTasks.filter(t => t.listId === list.id || (!t.listId && list.id === 'imp'))
    })
    return grouped
  }, [filteredTasks, lists])

  const liveSelectedTask = useMemo(() => 
    selectedTaskDetailsId ? tasks.find(t => t.id === selectedTaskDetailsId) || null : null,
  [tasks, selectedTaskDetailsId])


  const openCreateModal = () => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  const handleStartFocus = (taskId: string) => {
    setActiveTaskId(taskId)
    navigate('/pomodoro')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24 px-4 sm:px-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="relative group">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute -left-4 top-0 bottom-0 w-1 bg-primary rounded-full" 
          />
          <h1 className="text-6xl lg:text-7xl font-black tracking-tight font-arabic bg-linear-to-br from-foreground via-foreground to-primary/40 bg-clip-text text-transparent pb-2 leading-tight">
            استعن بالله
          </h1>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-20">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary/40" />
          <p className="text-md font-bold text-muted-foreground mt-6 uppercase tracking-widest opacity-50">Syncing Workspace...</p>
        </div>
      )}

      {/* List Cards Container */}
      <div className="space-y-5 relative">
        <AnimatePresence mode="popLayout">
          {!isLoading && lists.length === 0 ? (
             <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-center py-24 px-4 bg-card/30 backdrop-blur-xl rounded-[3rem] border border-border/40"
             >
               <h3 className="text-2xl font-bold mb-2">No lists found</h3>
               <Button onClick={() => addList('New List')} variant="outline" className="mt-8 rounded-full px-8 h-12">
                 Create First List
               </Button>
             </motion.div>
          ) : (
            lists.map((list) => (
              <TaskListCard 
                key={list.id}
                listId={list.id}
                title={list.title}
                tasks={tasksByList[list.id] || []}
                onTaskClick={(id) => setSelectedTaskDetailsId(id)}
                onStartFocus={handleStartFocus}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-24 right-5 flex flex-col gap-4 z-50">
         <Button 
            onClick={openCreateModal} 
            size="lg" 
            className="w-16 h-16 rounded-full shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all duration-300 p-0"
          >
            <Plus className="w-8 h-8" strokeWidth={3} />
          </Button>
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
