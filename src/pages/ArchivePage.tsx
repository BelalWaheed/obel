import { motion } from 'framer-motion'
import { Archive, RotateCcw, Search, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTaskStore } from '@/stores/taskStore'
import { useState, useMemo } from 'react'
import dayjs from 'dayjs'

export default function ArchivePage() {
  const tasks = useTaskStore((state) => state.tasks)
  const toggleComplete = useTaskStore((state) => state.toggleComplete)
  const deleteTask = useTaskStore((state) => state.deleteTask)
  const [search, setSearch] = useState('')

  const archivedTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'done')
      .filter(t => 
        t.title.toLowerCase().includes(search.toLowerCase()) || 
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => dayjs(b.completedAt || b.createdAt).diff(dayjs(a.completedAt || a.createdAt)))
  }, [tasks, search])

  const handleRestore = (id: string) => {
    toggleComplete(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Vault Archive</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Your historical record of completed objectives.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Search archived tasks by title, description or tags..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-14 pl-12 bg-card/50 border-border/50 rounded-2xl text-lg font-medium focus-visible:ring-primary/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {archivedTasks.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border/30 rounded-3xl">
            <Archive className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-muted-foreground">No archived items found</h3>
            <p className="text-sm text-muted-foreground/60">Complete tasks to see them appear here in your vault.</p>
          </div>
        ) : (
          archivedTasks.map((task) => (
            <motion.div
              layout
              key={task.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="p-5 border-border/50 bg-card/40 backdrop-blur-sm group hover:bg-card/60 transition-all rounded-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Completed {dayjs(task.completedAt && dayjs(task.completedAt).isValid() ? task.completedAt : task.createdAt).format('MMM D, YYYY')}</span>
                    </div>
                    <h3 className="text-lg font-bold text-muted-foreground line-through decoration-muted-foreground/30 truncate">
                      {task.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                       {task.tags.map(tag => (
                         <span key={tag} className="text-[10px] bg-muted/30 px-2 py-0.5 rounded-md text-muted-foreground/70 font-bold border border-border/30 capitalize">{tag}</span>
                       ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 self-end sm:self-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-10 px-4 rounded-xl font-bold bg-primary/5 text-primary hover:bg-primary/10 transition-colors gap-2"
                      onClick={() => handleRestore(task.id)}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-xl"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
