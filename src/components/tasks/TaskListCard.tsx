import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Edit2, Check, X, Play, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTaskStore, type Task, type Priority } from '@/stores/taskStore'
import { Badge } from '@/components/ui/badge'

const priorityConfig: Record<Priority, { label: string; color: string; border: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-500 bg-red-500/10', border: 'border-red-500/20' },
  high: { label: 'High', color: 'text-orange-500 bg-orange-500/10', border: 'border-orange-500/20' },
  medium: { label: 'Medium', color: 'text-yellow-600 dark:text-yellow-500 bg-yellow-500/10', border: 'border-yellow-500/20' },
  low: { label: 'Low', color: 'text-blue-500 bg-blue-500/10', border: 'border-blue-500/20' },
}

interface TaskListCardProps {
  listId: string
  title: string
  tasks: Task[]
  onTaskClick: (taskId: string) => void
  onStartFocus: (taskId: string) => void
}

export function TaskListCard({ listId, title, tasks, onTaskClick, onStartFocus }: TaskListCardProps) {
  const [isExpanded, setIsExpanded] = useState(tasks.length > 0)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [newTitle, setNewTitle] = useState(title)
  const updateListTitle = useTaskStore((state) => state.updateListTitle)
  const toggleComplete = useTaskStore((state) => state.toggleComplete)

  const handleSaveTitle = () => {
    if (newTitle.trim() && newTitle !== title) {
      updateListTitle(listId, newTitle)
    }
    setIsEditingTitle(false)
  }

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/40 overflow-hidden rounded-[2rem] md:w-[320px] lg:w-[350px] md:shrink-0 flex flex-col max-h-[calc(100vh-270px)] md:max-h-none h-fit">
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Input 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle()
                  if (e.key === 'Escape') setIsEditingTitle(false)
                }}
                className="h-8 text-xl font-bold bg-background/50 border-primary/30 w-48"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={handleSaveTitle}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setIsEditingTitle(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold tracking-tight first-letter:uppercase">{title}</h2>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <span className="text-muted-foreground font-semibold text-base">{tasks.length}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
        </Button>
      </div>

      {/* Task List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {tasks.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-border/30 rounded-3xl">
                  <p className="text-muted-foreground font-medium italic">No tasks in this list</p>
                </div>
              ) : (
                tasks.map((task) => {
                  const isDone = task.status === 'done'
                  const prioConf = priorityConfig[task.priority]
                  const totalSubtasks = task.subtasks?.length || 0
                  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group relative p-4 flex items-center gap-4 cursor-pointer rounded-2xl transition-all duration-300 ${
                        isDone 
                          ? 'opacity-60 bg-muted/5' 
                          : 'bg-background/40 border border-border/40 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5'
                      }`}
                      onClick={() => onTaskClick(task.id)}
                    >
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
                            ? 'bg-primary border-primary text-primary-foreground' 
                            : 'border-muted-foreground/40 hover:border-primary text-transparent hover:bg-primary/10'
                        }`}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isDone ? 'opacity-100' : 'opacity-0'} transition-opacity`} strokeWidth={3} />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-base truncate transition-colors duration-300 ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {task.title}
                        </h3>
                        {(!isDone && totalSubtasks > 0) && (
                          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                            {completedSubtasks}/{totalSubtasks} steps
                          </p>
                        )}
                        {task.description && !isDone && (
                          <p className="text-xs text-muted-foreground line-clamp-2 opacity-70 mt-0.5 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                      
                      {!isDone && (
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`hidden sm:flex capitalize px-2.5 py-0.5 text-[10px] font-bold rounded-full border shrink-0 ${prioConf.color} ${prioConf.border}`}>
                             {prioConf.label}
                          </Badge>
                          <Button
                            onClick={(e) => { e.stopPropagation(); onStartFocus(task.id) }}
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
