import { Play, Pause, Clock, Edit3, Trash2, Calendar, Flame, TagIcon, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useTaskStore, type Priority, type Task } from '@/stores/taskStore'
import dayjs from 'dayjs'

const priorityConfig: Record<Priority, { label: string; color: string; border: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-500 bg-red-500/10', border: 'border-red-500/20' },
  high: { label: 'High', color: 'text-orange-500 bg-orange-500/10', border: 'border-orange-500/20' },
  medium: { label: 'Medium', color: 'text-yellow-600 dark:text-yellow-500 bg-yellow-500/10', border: 'border-yellow-500/20' },
  low: { label: 'Low', color: 'text-blue-500 bg-blue-500/10', border: 'border-blue-500/20' },
}

interface TaskDetailsModalProps {
  task: Task | null
  onClose: () => void
  onEdit: (task: Task) => void
  onStartFocus: (taskId: string) => void
}

export function TaskDetailsModal({ task, onClose, onEdit, onStartFocus }: TaskDetailsModalProps) {
  const updateTask = useTaskStore((state) => state.updateTask)
  const deleteTask = useTaskStore((state) => state.deleteTask)
  const addSubtask = useTaskStore((state) => state.addSubtask)
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask)
  const deleteSubtask = useTaskStore((state) => state.deleteSubtask)

  if (!task) return null

  const isDone = task.status === 'done'
  const prioConf = priorityConfig[task.priority]
  const totalSubtasks = task.subtasks.length
  const completedSubtasks = task.subtasks.filter((st) => st.completed).length

  const focusMinutes = Math.floor((task.focusTime || 0) / 60)
  const hours = Math.floor(focusMinutes / 60)
  const mins = focusMinutes % 60
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-3xl rounded-3xl outline-none shadow-2xl z-100">
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
                  onClick={() => { onClose(); onStartFocus(task.id); }}
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
                onClick={() => { onClose(); onEdit(task); }}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => { onClose(); deleteTask(task.id); }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
