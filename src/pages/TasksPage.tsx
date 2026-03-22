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
  ListTodo,
  Calendar,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

const priorityColors: Record<Priority, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tasks, track progress, and stay organized.
          </p>
        </div>
        <Button onClick={openCreateModal} size="lg" className="gap-2 shadow-lg shadow-primary/25">
          <Plus className="w-5 h-5" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v ?? 'all')}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">🔴 Urgent</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🔵 Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <TagIcon className="w-3.5 h-3.5 text-muted-foreground" />
              {allTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setSearchQuery(tag)}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Loading tasks...</p>
        </div>
      )}

      {/* Task List */}
      <div className="lg:col-span-3 space-y-4">
        <AnimatePresence mode="popLayout">
          {!isLoading && filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 bg-card rounded-xl border border-border/50"
            >
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No tasks found</h3>
              <p className="text-muted-foreground mt-1">Try adjusting your filters or create a new task.</p>
            </motion.div>
          ) : (
            filteredTasks.map((task) => {
              const isDone = task.status === 'done'
              const completedSubtasks = task.subtasks.filter((st) => st.completed).length
              const totalSubtasks = task.subtasks.length
              
              // Formatted focus time
              const focusMinutes = Math.floor((task.focusTime || 0) / 60)
              const hours = Math.floor(focusMinutes / 60)
              const mins = focusMinutes % 60
              const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <Card
                    className={`relative overflow-hidden group transition-all duration-300 hover:shadow-md ${
                      isDone ? 'opacity-60 bg-muted/30 border-muted' : 'bg-card hover:border-primary/30'
                    }`}
                  >
                    {/* Priority left indicator line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityColors[task.priority]} transition-opacity ${isDone ? 'opacity-30' : 'opacity-100'}`} />
                    
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
                      {/* Checkbox */}
                      <div className="pt-1 shrink-0">
                        <button
                          onClick={() => updateTask(task.id, { status: isDone ? 'todo' : 'done' })}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            isDone ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 hover:border-primary/50 text-transparent hover:text-primary/30'
                          }`}
                        >
                          <CheckCircle2 className={`w-4 h-4 ${isDone ? 'opacity-100' : 'opacity-0'} transition-opacity`} />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                          <div>
                            <h3 className={`font-semibold text-lg transition-colors ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className={`text-sm mt-1 line-clamp-2 ${isDone ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                                {task.description}
                              </p>
                            )}
                          </div>
                          
                          {/* Badges row top right */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Badge variant="outline" className={`capitalize ${isDone ? 'border-muted-foreground/20 text-muted-foreground/50' : ''}`}>
                              {task.priority}
                            </Badge>
                            {task.status === 'in-progress' && !isDone && (
                              <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Active</Badge>
                            )}
                          </div>
                        </div>

                        {/* Meta stats row */}
                        <div className="flex flex-wrap items-center gap-3 mt-4">
                          {/* Tags */}
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className={`text-xs ${isDone ? 'opacity-50' : 'bg-muted hover:bg-muted/80'}`}>
                              <TagIcon className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          
                          {/* Subtasks */}
                          {totalSubtasks > 0 && (
                            <div className={`flex items-center text-xs px-2 py-1 rounded-md bg-muted/50 ${
                              completedSubtasks === totalSubtasks ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground'
                            }`}>
                              <ListTodo className="w-3.5 h-3.5 mr-1" />
                              {completedSubtasks}/{totalSubtasks}
                            </div>
                          )}

                          {/* Due Date */}
                          {task.dueDate && (
                            <div className={`flex items-center text-xs px-2 py-1 rounded-md ${
                              dayjs(task.dueDate).isBefore(dayjs(), 'day') && !isDone
                                ? 'text-red-500 bg-red-500/10 font-medium'
                                : 'text-muted-foreground bg-muted/50'
                            }`}>
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              {dayjs(task.dueDate).format('MMM D')}
                            </div>
                          )}

                          {/* Pomodoro Tracking Stats */}
                          {(task.focusSessions || 0) > 0 && (
                            <div className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                              isDone ? 'bg-muted text-muted-foreground opacity-70' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                            }`}>
                              <div className="flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5" />
                                <span>{task.focusSessions} {task.focusSessions === 1 ? 'session' : 'sessions'}</span>
                              </div>
                              <span className="opacity-50">•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{timeStr}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Subtasks List & Add New */}
                        {!isDone && (
                          <div className="mt-4 pl-3 border-l-2 border-muted space-y-2">
                            {task.subtasks.map((st) => (
                              <div key={st.id} className="flex items-center gap-2 group/st">
                                <Checkbox
                                  checked={st.completed}
                                  onCheckedChange={() => toggleSubtask(task.id, st.id)}
                                  className="w-4 h-4 border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <span className={`text-sm transition-colors flex-1 ${st.completed ? 'line-through text-muted-foreground opacity-70' : 'text-foreground'}`}>
                                  {st.title}
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/st:opacity-100 text-muted-foreground hover:text-destructive transition-all" onClick={() => deleteSubtask(task.id, st.id)}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                            {/* Quick Add Subtask */}
                            <div className="flex items-center gap-2 mt-2 pt-1">
                              <Input
                                placeholder="Add subtask..."
                                className="h-7 text-xs bg-transparent border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground/50 px-0"
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
                          </div>
                        )}
                      </div>

                      {/* Actions Right Side */}
                      <div className="flex flex-col items-end gap-2 shrink-0 pt-2 sm:pt-0">
                        {/* Focus Button */}
                        {!isDone && (
                          <Button
                            onClick={() => handleStartFocus(task.id)}
                            className="w-full sm:w-auto gap-2 bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            Focus
                          </Button>
                        )}
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className={`h-10 w-10 transition-colors ${isDone ? 'opacity-0 pointer-events-none' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                            onClick={() => {
                              updateTask(task.id, {
                                status: task.status === 'in-progress' ? 'todo' : 'in-progress',
                              })
                            }}
                          >
                            {task.status === 'in-progress' ? <Pause className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={() => openEditModal(task)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title</label>
              <Input placeholder="Task title..." value={formTitle} onChange={(e) => setFormTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }} autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <textarea placeholder="Add a description..." value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Priority</label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as Priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🔵 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Status</label>
                <Select value={formStatus} onValueChange={(v) => setFormStatus(v as TaskStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags</label>
              <Input placeholder="Enter tags separated by commas..." value={formTags} onChange={(e) => setFormTags(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Due Date</label>
              <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formTitle.trim() || isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
