import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Flame,
  Calendar,
  CheckCircle2,
  Trash2,
  Award,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useHabitStore, type Habit } from '@/stores/habitStore'
import dayjs from 'dayjs'

export default function HabitsPage() {
  const { habits, isLoading, fetchHabits, addHabit, deleteHabit, toggleHabitCompletion } = useHabitStore()
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')

  useEffect(() => {
    fetchHabits()
  }, [fetchHabits])

  const todayStr = dayjs().format('YYYY-MM-DD')

  const handleSave = async () => {
    if (!formName.trim()) return
    setIsSaving(true)
    await addHabit({
      name: formName,
      description: formDescription,
      frequency: 'daily',
    })
    setIsSaving(false)
    setIsModalOpen(false)
    setFormName('')
    setFormDescription('')
  }

  const isCompletedToday = (habit: Habit) => {
    try {
      const dates = JSON.parse(habit.completedDates || '[]')
      return dates.includes(todayStr)
    } catch {
      return false
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Habits</h1>
          <p className="text-muted-foreground mt-1">
            Build daily routines, check them off, and track your streaks.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="lg" className="gap-2 shadow-lg shadow-primary/25">
          <Plus className="w-5 h-5" />
          New Habit
        </Button>
      </div>

      {isLoading && habits.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading habits...</p>
        </div>
      ) : habits.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No habits yet</h3>
          <p className="text-muted-foreground mt-1">Create your first daily habit to start building momentum!</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {habits.map((habit, i) => {
              const completed = isCompletedToday(habit)
              return (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`relative overflow-hidden group transition-all duration-300 ${
                    completed ? 'border-primary/50 shadow-md shadow-primary/10' : 'hover:border-primary/30'
                  }`}>
                    {/* Background fill for completed state */}
                    <div className={`absolute inset-0 bg-primary/5 transition-opacity duration-300 ${completed ? 'opacity-100' : 'opacity-0'}`} />
                    
                    <div className="relative p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="pr-8">
                          <h3 className={`font-semibold text-lg line-clamp-1 transition-colors ${completed ? 'text-primary' : ''}`}>
                            {habit.name}
                          </h3>
                          {habit.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {habit.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Check button (Giant Circle) */}
                        <button
                          onClick={() => toggleHabitCompletion(habit.id, todayStr)}
                          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                            completed 
                              ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30' 
                              : 'border-muted-foreground/30 text-muted-foreground/30 hover:border-primary/50 hover:text-primary/50'
                          }`}
                        >
                          <CheckCircle2 className={`w-6 h-6 ${completed ? 'opacity-100' : 'opacity-0 scale-50'} transition-all duration-300`} />
                        </button>
                      </div>

                      {/* Streaks */}
                      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${habit.currentStreak > 0 ? 'bg-orange-500/10 text-orange-500' : 'bg-muted text-muted-foreground'}`}>
                            <Flame className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Current Streak</p>
                            <p className={`font-bold ${habit.currentStreak > 0 ? 'text-orange-500' : ''}`}>
                              {habit.currentStreak} {habit.currentStreak === 1 ? 'day' : 'days'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="w-px h-8 bg-border" />

                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-600">
                            <Award className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Best Streak</p>
                            <p className="font-bold text-yellow-600">
                              {habit.longestStreak} {habit.longestStreak === 1 ? 'day' : 'days'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Delete Action */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteHabit(habit.id)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Habit Name</label>
              <Input
                placeholder="e.g. Read 10 pages, Drink water"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description (Optional)</label>
              <Input
                placeholder="Why are you building this habit?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Habit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
