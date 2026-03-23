import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  ListFilter,
  CheckCircle2,
  Clock,
  TagIcon,
  Trash2,
  Edit3,
  X,
  Loader2,
  Play,
  Pause,
  Calendar,
  Flame,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTaskStore, type Priority, type TaskStatus, type Task } from '@/stores/taskStore'
import { useTimerStore } from '@/stores/timerStore'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

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
  const addTask = useTaskStore((state) => state.addTask)
  const updateTask = useTaskStore((state) => state.updateTask)
  const deleteTask = useTaskStore((state) => state.deleteTask)
  const addSubtask = useTaskStore((state) => state.addSubtask)
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask)
  const deleteSubtask = useTaskStore((state) => state.deleteSubtask)

  const setActiveTaskId = useTimerStore((state) => state.setActiveTaskId)

  // Local filter state
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Popups State
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPriority, setFormPriority] = useState<Priority>('medium')
  const [formTags, setFormTags] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formStatus, setFormStatus] = useState<TaskStatus>('todo')

  const filteredTasks = useMemo(
    () => getFilteredTasks(filterStatus, filterPriority, searchQuery),
    [tasks, filterStatus, filterPriority, searchQuery, getFilteredTasks]
  ) 
  
  const liveSelectedTask = selectedTaskDetails ? tasks.find(t => t.id === selectedTaskDetails.id) || null : null

  const allTags = useMemo(() => getAllTags(), [tasks, getAllTags])

  const openCreateModal = () => {
    setEditingTask(null)
    setFormTitle('')
    setFormDescription('')
    setFormPriority('medium')
    setFormTags('')
    setFormDueDate('')
    setFormStatus('todo')
    setIsModalOpen(true)
  }

  const openEditModal = (task: Task) => {
    setEditingTask(task)
    setFormTitle(task.title)
    setFormDescription(task.description || '')
    setFormPriority(task.priority)
    setFormTags(task.tags.join(', '))
    setFormDueDate(task.dueDate || '')
    setFormStatus(task.status)
    setIsModalOpen(true)
  }

  const handleStartFocus = (taskId: string) => {
    setActiveTaskId(taskId)
    navigate('/pomodoro')
  }

  const handleSave = async () => {
    if (!formTitle.trim()) return
    setIsSaving(true)
    const tags = formTags.split(',').map((t) => t.trim()).filter(Boolean)

    if (editingTask) {
      await updateTask(editingTask.id, {
        title: formTitle,
        description: formDescription,
        priority: formPriority,
        tags,
        dueDate: formDueDate || undefined,
        status: formStatus,
      })
    } else {
      await addTask({
        title: formTitle,
        description: formDescription,
        priority: formPriority,
        tags,
        subtasks: [],
        dueDate: formDueDate || undefined,
        status: formStatus,
      })
    }
    setIsSaving(false)
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-24">
      {/* Header with glassmorphism */}
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

      {/* Filters Toolbar */}
      <div className="bg-card/40 backdrop-blur-xl border border-border/80 rounded-[2rem] p-4 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-white/5 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row flex-wrap items-center gap-4 z-10">
          <div className="relative flex-1 min-w-[280px] w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search tasks..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-11 h-12 bg-background/50 border-border/50 rounded-2xl shadow-inner-sm text-base focus-visible:ring-primary/30" 
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-background/50 border border-border/50 text-muted-foreground shrink-0">
               <ListFilter className="w-5 h-5" />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
              <SelectTrigger className="w-full md:w-[150px] h-12 rounded-2xl bg-background/50 border-border/50 text-base font-medium">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 bg-card/95 backdrop-blur-xl">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v ?? 'all')}>
              <SelectTrigger className="w-full md:w-[150px] h-12 rounded-2xl bg-background/50 border-border/50 text-base font-medium">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 bg-card/95 backdrop-blur-xl">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">🔴 Urgent</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🔵 Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {allTags.length > 0 && (
          <div className="relative flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-border/30 z-10">
            <TagIcon className="w-4 h-4 text-muted-foreground mr-1" />
            {allTags.map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className={`cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                  searchQuery === tag 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105' 
                    : 'bg-background/50 hover:bg-primary/20 text-muted-foreground hover:text-foreground'
                }`} 
                onClick={() => setSearchQuery(searchQuery === tag ? '' : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-20">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <p className="text-sm font-medium text-muted-foreground mt-4">Syncing your objectives...</p>
        </div>
      )}

      {/* Task List (Simplified) */}
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
                    onClick={() => setSelectedTaskDetails(task)}
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
                          updateTask(task.id, { status: isDone ? 'todo' : 'done' }) 
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

      {/* DETAILED TASK MODAL */}
      <Dialog open={!!liveSelectedTask} onOpenChange={(open) => {
        if (!open) setSelectedTaskDetails(null)
      }}>
        <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-3xl rounded-3xl outline-none shadow-2xl z-100">
          {liveSelectedTask && (() => {
            const task = liveSelectedTask
            const isDone = task.status === 'done'
            const prioConf = priorityConfig[task.priority]
            const totalSubtasks = task.subtasks.length
            const completedSubtasks = task.subtasks.filter((st) => st.completed).length

            const focusMinutes = Math.floor((task.focusTime || 0) / 60)
            const hours = Math.floor(focusMinutes / 60)
            const mins = focusMinutes % 60
            const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

            return (
              <div className="flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-6 py-6 sm:px-8 sm:py-8 border-b border-border/30 bg-background/30 shrink-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-3 mb-3">
                         {task.status === 'in-progress' && !isDone && (
                          <Badge variant="secondary" className="bg-primary text-primary-foreground px-3 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full shadow-lg shadow-primary/20 border-none">
                            Active
                          </Badge>
                        )}
                        <Badge variant="outline" className={`capitalize px-3 py-1 text-[10px] font-bold rounded-full border ${prioConf.color} ${prioConf.border} ${isDone ? 'opacity-50 grayscale' : ''}`}>
                          {prioConf.label} Priority
                        </Badge>
                      </div>
                      <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {task.title}
                      </h2>
                    </div>
                    {/* Main Focus Action in Header */}
                    {!isDone && (
                      <Button
                        onClick={() => { setSelectedTaskDetails(null); handleStartFocus(task.id); }}
                        className="shrink-0 gap-2 bg-linear-to-tr from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground font-bold rounded-2xl h-12 px-6 shadow-xl shadow-primary/20 transition-all hover:scale-105"
                      >
                        <Play className="w-5 h-5 fill-current" />
                        Focus
                      </Button>
                    )}
                  </div>
                </div>

                {/* Body scrollable */}
                <div className="p-6 sm:p-8 overflow-y-auto space-y-8">
                  {/* Meta Details Row */}
                  <div className="flex flex-wrap items-center gap-3">
                    {task.dueDate && (
                      <div className={`flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                        dayjs(task.dueDate).isBefore(dayjs(), 'day') && !isDone
                          ? 'text-red-500 bg-red-500/10 border-red-500/20'
                          : 'text-muted-foreground bg-muted/50 border-border/50'
                      }`}>
                        <Calendar className="w-4 h-4 mr-2 opacity-70" />
                        Due {dayjs(task.dueDate).format('MMM D, YYYY')}
                      </div>
                    )}
                    
                    {(task.focusSessions || 0) > 0 && (
                      <div className={`flex items-center gap-4 text-xs font-bold px-4 py-1.5 rounded-lg border ${
                        isDone 
                          ? 'bg-muted/50 text-muted-foreground border-border/50' 
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-4 h-4" />
                          <span>{task.focusSessions} Sessions</span>
                        </div>
                        <div className="w-px h-4 bg-current opacity-30" />
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{timeStr} Deep Work</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {task.description && (
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Description</h4>
                      <p className={`text-base leading-relaxed p-4 rounded-2xl bg-muted/20 border border-border/30 ${isDone ? 'text-muted-foreground' : 'text-foreground/90'}`}>
                        {task.description}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {task.tags.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {task.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className={`text-xs px-3 py-1.5 rounded-xl font-medium border border-border/50 ${isDone ? 'opacity-50' : 'bg-background hover:bg-muted'}`}>
                            <TagIcon className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actionable Subtasks */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Actionable Steps</h4>
                      {totalSubtasks > 0 && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {completedSubtasks} / {totalSubtasks}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {task.subtasks.map((st) => (
                        <div key={st.id} className="flex items-center gap-3 group/st p-2 sm:p-3 rounded-2xl bg-muted/10 border border-border/40 hover:bg-muted/30 transition-colors">
                          <div className="pt-0.5 pl-1 shrink-0">
                            <Checkbox
                              checked={st.completed}
                              onCheckedChange={() => toggleSubtask(task.id, st.id)}
                              className="w-5 h-5 rounded border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                            />
                          </div>
                          <span className={`text-[15px] leading-snug font-medium transition-colors flex-1 ${st.completed ? 'line-through text-muted-foreground opacity-60' : 'text-foreground/90'}`}>
                            {st.title}
                          </span>
                          {!isDone && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover/st:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-full" onClick={() => deleteSubtask(task.id, st.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      {!isDone && (
                        <div className="flex items-center gap-3 mt-3 p-1 rounded-2xl group/add relative bg-background border border-border/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                          <div className="pl-4">
                            <Plus className="w-5 h-5 text-muted-foreground group-focus-within/add:text-primary transition-colors" />
                          </div>
                          <Input
                            placeholder="Add a new step..."
                            className="h-11 text-sm font-medium bg-transparent border-none shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 w-full"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value
                                if (val.trim()) {
                                  addSubtask(task.id, val)
                                  ;(e.target as HTMLInputElement).value = ''
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 sm:px-8 border-t border-border/40 bg-muted/10 flex items-center justify-between shrink-0">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors font-semibold"
                      onClick={() => {
                        updateTask(task.id, { status: task.status === 'in-progress' ? 'todo' : 'in-progress' })
                      }}
                    >
                      {task.status === 'in-progress' ? <Pause className="w-4 h-4 mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                      {task.status === 'in-progress' ? 'Pause' : 'Start working'}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => { setSelectedTaskDetails(null); openEditModal(task); }}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => { setSelectedTaskDetails(null); deleteTask(task.id); }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-2xl rounded-3xl z-100">
          <div className="px-6 py-5 border-b border-border/50 bg-muted/20">
            <DialogTitle className="text-2xl font-bold tracking-tight">{editingTask ? 'Edit Task' : 'Define New Objective'}</DialogTitle>
          </div>
          <div className="px-6 py-6 space-y-5">
            <div>
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Objective Title</label>
              <Input 
                placeholder="What do you need to accomplish?" 
                value={formTitle} 
                onChange={(e) => setFormTitle(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }} 
                autoFocus 
                className="h-12 text-lg font-medium bg-background/50 border-border/50 rounded-xl focus-visible:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Description</label>
              <textarea 
                placeholder="Add additional context or notes..." 
                value={formDescription} 
                onChange={(e) => setFormDescription(e.target.value)} 
                className="flex min-h-[100px] w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-base text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-medium" 
              />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Priority</label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as Priority)}>
                  <SelectTrigger className="h-12 bg-background/50 border-border/50 rounded-xl text-base font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="low">🔵 Low Prioriry</SelectItem>
                    <SelectItem value="medium">🟡 Medium Priority</SelectItem>
                    <SelectItem value="high">🟠 High Priority</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Status</label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as TaskStatus)}>
                  <SelectTrigger className="h-12 bg-background/50 border-border/50 rounded-xl text-base font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Tags</label>
              <Input 
                placeholder="design, coding, meeting..." 
                value={formTags} 
                onChange={(e) => setFormTags(e.target.value)} 
                className="h-12 bg-background/50 border-border/50 rounded-xl text-base font-medium focus-visible:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Deadline</label>
              <Input 
                type="date" 
                value={formDueDate} 
                onChange={(e) => setFormDueDate(e.target.value)} 
                className="h-12 bg-background/50 border-border/50 rounded-xl text-base font-medium focus-visible:ring-primary/30 w-full"
              />
            </div>
          </div>
          <div className="px-6 py-5 border-t border-border/50 bg-muted/10 flex justify-end gap-3">
            <Button variant="outline" className="h-12 px-6 rounded-xl font-bold border-border/50" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="h-12 px-8 rounded-xl font-bold gap-2 shadow-lg shadow-primary/25" onClick={handleSave} disabled={!formTitle.trim() || isSaving}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {editingTask ? 'Save Changes' : 'Create Objective'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
