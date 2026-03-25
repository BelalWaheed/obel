import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Flame,
  CheckCircle2,
  Trash2,
  Award,
  Loader2,
  Edit3,
  ArrowRight,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { useHabitStore, type Habit } from '@/stores/habitStore'
import dayjs from 'dayjs'

export default function HabitsPage() {
  const { habits, isLoading, fetchHabits, addHabit, updateHabit, deleteHabit, toggleHabitCompletion } = useHabitStore()
  
  const [selectedHabitDetails, setSelectedHabitDetails] = useState<Habit | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')

  useEffect(() => {
    fetchHabits()
  }, [fetchHabits])

  const todayStr = dayjs().format('YYYY-MM-DD')
  
  const liveSelectedHabit = selectedHabitDetails ? habits.find(h => h.id === selectedHabitDetails.id) || null : null

  const openCreateModal = () => {
    setEditingHabit(null)
    setFormName('')
    setFormDescription('')
    setIsModalOpen(true)
  }

  const openEditModal = (habit: Habit) => {
    setEditingHabit(habit)
    setFormName(habit.name)
    setFormDescription(habit.description || '')
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setIsSaving(true)
    
    if (editingHabit) {
      updateHabit(editingHabit.id, {
        name: formName,
        description: formDescription,
      })
    } else {
      addHabit({
        name: formName,
        description: formDescription,
        frequency: 'daily',
      })
    }
    
    setIsSaving(false)
    setIsModalOpen(false)
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
    <div className="space-y-10 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent pb-1">
            Build Habits
          </h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">
            Daily routines that forge unbreakable momentum.
          </p>
        </div>
        <Button 
          onClick={openCreateModal} 
          size="lg" 
          className="gap-2 rounded-full px-6 shadow-xl shadow-primary/25 hover:scale-105 transition-all duration-300 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span className="font-semibold text-base">New Habit</span>
        </Button>
      </div>

      {isLoading && habits.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-sm font-medium text-muted-foreground mt-4">Loading your habits...</p>
        </div>
      ) : habits.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24 px-4 bg-card/30 backdrop-blur-xl rounded-[2.5rem] border border-border/40">
          <div className="w-24 h-24 bg-linear-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/5">
            <Target className="w-12 h-12 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No habits yet</h3>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">Create your first daily habit to start building momentum!</p>
          <Button onClick={openCreateModal} variant="outline" className="mt-8 rounded-full px-6 h-12 text-base font-semibold border-border/50">
            Create a Habit
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {habits.map((habit, i) => {
              const completed = isCompletedToday(habit)
              return (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.05 } }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card 
                    onClick={() => setSelectedHabitDetails(habit)}
                    className={`relative overflow-hidden cursor-pointer group transition-all duration-300 rounded-2xl ${
                      completed 
                        ? 'border-primary/40 shadow-md shadow-primary/10 bg-primary/5' 
                        : 'bg-card/70 backdrop-blur-md border border-border/50 hover:border-primary/40 shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5'
                    }`}
                  >
                    {!completed && (
                      <div className="absolute inset-0 bg-linear-to-r from-white/10 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    )}
                    
                    <div className="p-4 sm:p-5 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4 min-w-0 pr-4">
                         <div className={`p-2.5 rounded-2xl shrink-0 transition-colors ${completed ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-muted/50 text-muted-foreground border border-border/50 group-hover:bg-muted'}`}>
                           <Flame className={`w-6 h-6 ${habit.currentStreak > 0 && !completed ? 'text-orange-500' : ''}`} />
                         </div>
                         <div className="min-w-0">
                           <h3 className={`font-bold text-lg truncate transition-colors ${completed ? 'text-primary' : 'text-foreground'}`}>
                             {habit.name}
                           </h3>
                           <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                             Streak: <span className={habit.currentStreak > 0 ? 'text-orange-500' : ''}>{habit.currentStreak}</span>
                           </p>
                         </div>
                      </div>
                      
                      {/* Check button (Giant Circle) */}
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const willComplete = !completed;
                          if (willComplete) {
                            import('@/lib/sounds').then(({ soundSystem }) => soundSystem.playHabitCheck())
                            import('canvas-confetti').then((confetti) => {
                              confetti.default({
                                particleCount: 150,
                                spread: 80,
                                origin: { y: 0.6 },
                                colors: ['#f97316', '#eab308', '#22c55e'] // Fire/Gold/Green
                              })
                            })
                          } else {
                            import('@/lib/sounds').then(({ soundSystem }) => soundSystem.playHabitUncheck())
                          }
                          toggleHabitCompletion(habit.id, todayStr) 
                        }}
                        className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-[2.5px] transition-all duration-300 ${
                          completed 
                            ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30' 
                            : 'border-muted-foreground/30 text-transparent hover:border-primary hover:text-primary hover:bg-primary/10'
                        }`}
                      >
                        <CheckCircle2 className={`w-6 h-6 ${completed ? 'opacity-100' : 'opacity-0 scale-50 group-hover:opacity-50 group-hover:scale-100'} transition-all duration-300`} strokeWidth={3} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* DETAILED HABIT MODAL */}
      <Dialog open={!!liveSelectedHabit} onOpenChange={(open) => {
        if (!open) setSelectedHabitDetails(null)
      }}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-3xl rounded-3xl outline-none shadow-2xl z-100">
          {liveSelectedHabit && (() => {
            const habit = liveSelectedHabit
            const completed = isCompletedToday(habit)
            
            // Build last 7 days visual graph
            const days = Array.from({ length: 7 }).map((_, i) => {
               const checkDate = dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD')
               const isDone = (habit.completedDates || '').includes(checkDate)
               const label = dayjs().subtract(6 - i, 'day').format('ddd')
               return { date: checkDate, isDone, label }
            })

            return (
              <div className="flex flex-col">
                {/* Header */}
                <div className="px-6 py-6 sm:px-8 border-b border-border/30 bg-background/30 shrink-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-3 mb-2">
                         <div className={`p-1.5 rounded-xl shrink-0 ${completed ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground border border-border/50'}`}>
                           <Target className="w-5 h-5" />
                         </div>
                         <Badge variant="outline" className={`capitalize px-3 py-1 text-[10px] font-bold rounded-full border border-primary/20 bg-primary/10 text-primary`}>
                          Daily Habit
                        </Badge>
                      </div>
                      <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight`}>
                        {habit.name}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Body scrollable */}
                <div className="p-6 sm:p-8 space-y-8">
                  {/* Action check-in */}
                  <div className={`p-5 rounded-3xl border transition-all duration-300 flex items-center justify-between shadow-inner-sm cursor-pointer ${
                    completed ? 'bg-primary/10 border-primary/30' : 'bg-muted/20 border-border/50 hover:bg-muted/40 hover:border-primary/30'
                  }`} onClick={() => toggleHabitCompletion(habit.id, todayStr)}>
                     <div>
                       <h3 className={`font-bold text-lg ${completed ? 'text-primary' : ''}`}>
                         {completed ? 'Checked in for today!' : 'Ready to check in?'}
                       </h3>
                       <p className="text-sm font-medium text-muted-foreground mt-0.5">
                         {completed ? "You're keeping the momentum going." : "Don't break the chain."}
                       </p>
                     </div>
                     <div className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 ${
                        completed 
                          ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30' 
                          : 'border-muted-foreground/30 text-transparent'
                      }`}>
                        <CheckCircle2 className={`w-7 h-7 ${completed ? 'opacity-100' : 'opacity-0'} transition-all`} strokeWidth={3} />
                     </div>
                  </div>

                  {/* Description */}
                  {habit.description && (
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Why you're doing this</h4>
                      <p className={`text-base leading-relaxed p-4 rounded-2xl bg-background/50 border border-border/30 text-foreground/90 font-medium`}>
                        {habit.description}
                      </p>
                    </div>
                  )}

                  {/* Streaks */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-background/50 border border-border/40 p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                        <div className={`p-3 rounded-2xl mb-3 ${habit.currentStreak > 0 ? 'bg-orange-500/10 text-orange-500 shadow-inner' : 'bg-muted text-muted-foreground'}`}>
                          <Flame className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Current Streak</p>
                        <p className={`text-3xl font-extrabold mt-1 ${habit.currentStreak > 0 ? 'text-orange-500' : ''}`}>
                          {habit.currentStreak}
                        </p>
                     </div>
                     <div className="bg-background/50 border border-border/40 p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                        <div className="p-3 rounded-2xl mb-3 bg-yellow-500/10 text-yellow-500 shadow-inner">
                          <Award className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Best Streak</p>
                        <p className="text-3xl font-extrabold mt-1 text-yellow-500">
                          {habit.longestStreak}
                        </p>
                     </div>
                  </div>

                  {/* Heatmap / Last 7 Days */}
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Last 7 Days</h4>
                    <div className="flex justify-between items-end px-2">
                       {days.map((day, idx) => (
                         <div key={day.date} className="flex flex-col items-center gap-2">
                           <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                             day.isDone 
                               ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30 ring-2 ring-primary/20 ring-offset-2 ring-offset-background' 
                               : 'bg-muted/30 border border-border/50 text-muted-foreground/30'
                           }`}>
                             {day.isDone && <CheckCircle2 className="w-5 h-5" strokeWidth={3} />}
                           </div>
                           <span className={`text-[10px] font-bold uppercase ${day.isDone || idx === 6 ? 'text-foreground' : 'text-muted-foreground'}`}>
                             {idx === 6 ? 'Today' : day.label}
                           </span>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 sm:px-8 border-t border-border/40 bg-muted/10 flex items-center justify-end shrink-0 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-4 rounded-lg text-muted-foreground hover:text-foreground transition-colors font-semibold"
                    onClick={() => { setSelectedHabitDetails(null); openEditModal(habit); }}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Habit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-4 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors font-semibold"
                    onClick={() => { setSelectedHabitDetails(null); deleteHabit(habit.id); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-2xl rounded-3xl z-100">
          <div className="px-6 py-5 border-b border-border/50 bg-muted/20">
            <DialogTitle className="text-2xl font-bold tracking-tight">{editingHabit ? 'Edit Habit' : 'Forge a New Habit'}</DialogTitle>
          </div>
          <div className="px-6 py-6 space-y-5">
            <div>
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Habit Name</label>
              <Input
                placeholder="e.g. Read 10 pages, Drink water"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }} 
                autoFocus
                className="h-12 text-lg font-medium bg-background/50 border-border/50 rounded-xl focus-visible:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Description (Optional)</label>
              <textarea
                placeholder="Why are you building this habit?"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="flex min-h-[100px] w-full rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-base text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 resize-none font-medium" 
              />
            </div>
          </div>
          <div className="px-6 py-5 border-t border-border/50 bg-muted/10 flex justify-end gap-3">
            <Button variant="outline" className="h-12 px-6 rounded-xl font-bold border-border/50" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="h-12 px-8 rounded-xl font-bold gap-2 shadow-lg shadow-primary/25" onClick={handleSave} disabled={!formName.trim() || isSaving}>
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {editingHabit ? 'Save Changes' : 'Create Habit'}
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
