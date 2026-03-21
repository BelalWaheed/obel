import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  ListFilter,
  CheckCircle2,
  Circle,
  Clock,

  Tag,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronRight,
  X,
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

import { Progress } from '@/components/ui/progress'
import { useTaskStore, type Priority, type TaskStatus, type Task } from '@/stores/taskStore'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const priorityConfig: Record<Priority, { label: string; color: string; icon: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-500/15 text-red-600 border-red-500/30', icon: '🔴' },
  high: { label: 'High', color: 'bg-orange-500/15 text-orange-600 border-orange-500/30', icon: '🟠' },
  medium: { label: 'Medium', color: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30', icon: '🟡' },
  low: { label: 'Low', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30', icon: '🔵' },
}

const statusConfig: Record<TaskStatus, { label: string; icon: typeof Circle }> = {
  todo: { label: 'To Do', icon: Circle },
  'in-progress': { label: 'In Progress', icon: Clock },
  done: { label: 'Done', icon: CheckCircle2 },
}

export default function TasksPage() {
  const {
    filterStatus,
    filterPriority,
    searchQuery,
    setFilterStatus,
    setFilterPriority,
    setSearchQuery,
    getFilteredTasks,
    getAllTags,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
  } = useTaskStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPriority, setFormPriority] = useState<Priority>('medium')
  const [formTags, setFormTags] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formStatus, setFormStatus] = useState<TaskStatus>('todo')
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const tasks = getFilteredTasks()
  const allTags = getAllTags()

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
    setFormDescription(task.description)
    setFormPriority(task.priority)
    setFormTags(task.tags.join(', '))
    setFormDueDate(task.dueDate || '')
    setFormStatus(task.status)
    setIsModalOpen(true)
  }

  const handleSave = () => {
    if (!formTitle.trim()) return
    const tags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    if (editingTask) {
      updateTask(editingTask.id, {
        title: formTitle,
        description: formDescription,
        priority: formPriority,
        tags,
        dueDate: formDueDate || null,
        status: formStatus,
      })
    } else {
      addTask({
        title: formTitle,
        description: formDescription,
        priority: formPriority,
        tags,
        subtasks: [],
        dueDate: formDueDate || null,
        status: formStatus,
      })
    }
    setIsModalOpen(false)
  }

  const handleAddSubtask = (taskId: string) => {
    if (!newSubtaskTitle.trim()) return
    addSubtask(taskId, newSubtaskTitle)
    setNewSubtaskTitle('')
  }

  const getSubtaskProgress = (task: Task) => {
    if (task.subtasks.length === 0) return 0
    return Math.round(
      (task.subtasks.filter((s) => s.completed).length / task.subtasks.length) * 100
    )
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
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-muted-foreground" />

            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterPriority}
              onValueChange={(v) => setFilterPriority(v as typeof filterPriority)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
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
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => setSearchQuery(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Task List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {tasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ListFilter className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">No tasks found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first task to get started!'}
              </p>
            </motion.div>
          ) : (
            tasks.map((task, i) => {
              const StatusIcon = statusConfig[task.status].icon
              const isExpanded = expandedTaskId === task.id
              const subtaskProgress = getSubtaskProgress(task)

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card
                    className={`p-4 transition-all duration-200 hover:shadow-md cursor-pointer group ${
                      task.status === 'done' ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Completion toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleComplete(task.id)
                        }}
                        className="mt-0.5 shrink-0"
                        title={task.status === 'done' ? 'Mark as todo' : 'Mark as done'}
                      >
                        <StatusIcon
                          className={`w-5 h-5 transition-colors ${
                            task.status === 'done'
                              ? 'text-green-500'
                              : task.status === 'in-progress'
                              ? 'text-primary'
                              : 'text-muted-foreground hover:text-primary'
                          }`}
                        />
                      </button>

                      {/* Content */}
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`font-medium ${
                              task.status === 'done' ? 'line-through text-muted-foreground' : ''
                            }`}
                          >
                            {task.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${priorityConfig[task.priority].color}`}
                          >
                            {priorityConfig[task.priority].icon} {priorityConfig[task.priority].label}
                          </Badge>
                        </div>

                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}

                          {task.subtasks.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="w-16">
                                <Progress value={subtaskProgress} className="h-1.5" />
                              </div>
                              <span>
                                {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                              </span>
                            </div>
                          )}

                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {dayjs(task.dueDate).fromNow()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditModal(task)
                          }}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteTask(task.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedTaskId(isExpanded ? null : task.id)
                          }}
                          className="p-1"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Subtasks */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-border space-y-2">
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {task.description}
                              </p>
                            )}

                            <h4 className="text-sm font-medium flex items-center gap-2">
                              Subtasks
                              {task.subtasks.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
                                </span>
                              )}
                            </h4>

                            {task.subtasks.map((subtask) => (
                              <div
                                key={subtask.id}
                                className="flex items-center gap-2 group/subtask"
                              >
                                <Checkbox
                                  checked={subtask.completed}
                                  onCheckedChange={() => toggleSubtask(task.id, subtask.id)}
                                />
                                <span
                                  className={`text-sm flex-1 ${
                                    subtask.completed
                                      ? 'line-through text-muted-foreground'
                                      : ''
                                  }`}
                                >
                                  {subtask.title}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover/subtask:opacity-100 transition-opacity"
                                  onClick={() => deleteSubtask(task.id, subtask.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}

                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                placeholder="Add subtask..."
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSubtask(task.id)
                                }}
                                className="h-8 text-sm"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddSubtask(task.id)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
              <Input
                placeholder="Task title..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                }}
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <textarea
                placeholder="Add a description..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Priority</label>
                <Select value={formPriority} onValueChange={(v) => setFormPriority(v as Priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
              <Input
                placeholder="Enter tags separated by commas..."
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Due Date</label>
              <Input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formTitle.trim()}>
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
