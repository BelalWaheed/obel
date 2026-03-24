import { useState, useEffect } from 'react'
import { Sparkles, ArrowRight, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTaskStore, type Priority, type TaskStatus, type Task, type Subtask } from '@/stores/taskStore'
import { generateSubtasks } from '@/lib/ai'
import dayjs from 'dayjs'

interface TaskFormModalProps {
  isOpen: boolean
  onClose: () => void
  editingTask: Task | null
}

export function TaskFormModal({ isOpen, onClose, editingTask }: TaskFormModalProps) {
  const addTask = useTaskStore((state) => state.addTask)
  const updateTask = useTaskStore((state) => state.updateTask)

  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPriority, setFormPriority] = useState<Priority>('medium')
  const [formTags, setFormTags] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formStatus, setFormStatus] = useState<TaskStatus>('todo')
  const [formSubtasks, setFormSubtasks] = useState<Subtask[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setFormTitle(editingTask.title)
        setFormDescription(editingTask.description || '')
        setFormPriority(editingTask.priority)
        setFormTags(editingTask.tags.join(', '))
        setFormDueDate(editingTask.dueDate || '')
        setFormStatus(editingTask.status)
        setFormSubtasks(editingTask.subtasks || [])
      } else {
        setFormTitle('')
        setFormDescription('')
        setFormPriority('medium')
        setFormTags('')
        setFormDueDate(dayjs().format('YYYY-MM-DD')) // Default deadline to today
        setFormStatus('todo')
        setFormSubtasks([])
      }
    }
  }, [isOpen, editingTask])

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
        subtasks: formSubtasks,
      })
    } else {
      await addTask({
        title: formTitle,
        description: formDescription,
        priority: formPriority,
        tags,
        subtasks: formSubtasks,
        dueDate: formDueDate || undefined,
        status: formStatus,
      })
    }
    setIsSaving(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Ensure modal z-index doesn't conflict with Select drop-downs */}
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-2xl rounded-3xl z-100">
        <div className="px-6 py-5 border-b border-border/50 bg-muted/20">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {editingTask ? 'Edit Task' : 'Define New Objective'}
          </DialogTitle>
        </div>
        <div className="px-6 py-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider block">Objective Title</label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] font-bold uppercase tracking-tight gap-1.5 text-primary hover:text-primary hover:bg-primary/10 rounded-full px-3"
                onClick={async () => {
                  if (!formTitle.trim()) return
                  setIsGenerating(true)
                  try {
                    const aiSteps = await generateSubtasks(formTitle)
                    const newSubtasks: Subtask[] = aiSteps.map(s => ({
                      id: Math.random().toString(36).substr(2, 9),
                      title: s.title,
                      completed: false
                    }))
                    setFormSubtasks([...formSubtasks, ...newSubtasks])
                  } finally {
                    setIsGenerating(false)
                  }
                }}
                disabled={!formTitle.trim() || isGenerating}
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Break down with AI
              </Button>
            </div>
            <Input 
              placeholder="What do you need to accomplish?" 
              value={formTitle} 
              onChange={(e) => setFormTitle(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }} 
              autoFocus 
              className="h-12 text-lg font-medium bg-background/50 border-border/50 rounded-xl focus-visible:ring-primary/30"
            />
          </div>

          {/* Subtasks Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider block">Actionable Steps</label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 rounded-full flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => {
                  const newSubtask: Subtask = { id: Math.random().toString(36).substr(2, 9), title: '', completed: false }
                  setFormSubtasks([...formSubtasks, newSubtask])
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              {formSubtasks.length === 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground/50 border border-dashed border-border/50 rounded-xl">
                  No steps defined yet.
                </div>
              )}
              {formSubtasks.map((st, idx) => (
                <div key={st.id} className="flex gap-2 group animate-in fade-in slide-in-from-top-1 duration-200">
                  <Input 
                    placeholder={`Step ${idx + 1}...`}
                    value={st.title}
                    onChange={(e) => {
                      const updated = [...formSubtasks]
                      updated[idx].title = e.target.value
                      setFormSubtasks(updated)
                    }}
                    className="h-10 text-sm bg-background/30 border-border/30 rounded-lg focus-visible:ring-primary/20"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => {
                      setFormSubtasks(formSubtasks.filter(s => s.id !== st.id))
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
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
                  <SelectItem value="low">🔵 Low Priority</SelectItem>
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
          <Button variant="outline" className="h-12 px-6 rounded-xl font-bold border-border/50" onClick={onClose}>Cancel</Button>
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
  )
}
