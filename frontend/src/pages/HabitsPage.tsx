import { useState, useEffect, useMemo } from 'react'
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
  Target,
  Calendar,
  TrendingUp,
  Hash,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { useHabitStore, type Habit } from '@/stores/habitStore'
import dayjs from 'dayjs'
import { useToastStore } from '@/stores/toastStore'

// ─── Helpers ───────────────────────────────────────────────
function parseDates(raw: string): string[] {
  try { return JSON.parse(raw || '[]') } catch { return [] }
}

function getCompletionRate(dates: string[], windowDays: number): number {
  const start = dayjs().subtract(windowDays - 1, 'day').startOf('day')
  let count = 0
  for (let i = 0; i < windowDays; i++) {
    const d = start.add(i, 'day').format('YYYY-MM-DD')
    if (dates.includes(d)) count++
  }
  return Math.round((count / windowDays) * 100)
}

function getDaysSinceCreated(createdAt: string): number {
  return dayjs().diff(dayjs(createdAt), 'day') + 1
}

// ─── Page ──────────────────────────────────────────────────
export default function HabitsPage() {
  const { habits, isLoading, fetchHabits, addHabit, updateHabit, deleteHabit, toggleHabitCompletion } = useHabitStore()
  const showToast = useToastStore((s) => s.showToast)
  
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

  // ─── Aggregate stats for the header ────────────────────
  const globalStats = useMemo(() => {
    let totalCompletions = 0
    let activeStreaks = 0
    let bestStreak = 0
    let completedToday = 0

    habits.forEach(h => {
      const dates = parseDates(h.completedDates)
      totalCompletions += dates.length
      if (h.currentStreak > 0) activeStreaks++
      if (h.longestStreak > bestStreak) bestStreak = h.longestStreak
      if (dates.includes(todayStr)) completedToday++
    })

    const todayRate = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0

    return { totalCompletions, activeStreaks, bestStreak, completedToday, todayRate }
  }, [habits, todayStr])

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
    return parseDates(habit.completedDates).includes(todayStr)
  }

  const handleToggle = (habit: Habit, e: React.MouseEvent) => {
    e.stopPropagation()
    const willComplete = !isCompletedToday(habit)
    if (willComplete) {
      import('@/lib/sounds').then(({ soundSystem }) => soundSystem.playHabitCheck())
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f97316', '#eab308', '#22c55e']
        })
      })
    } else {
      import('@/lib/sounds').then(({ soundSystem }) => soundSystem.playHabitUncheck())
    }
    toggleHabitCompletion(habit.id, todayStr)
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
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

      {/* ─── Stats Overview ─────────────────────────────── */}
      {habits.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {[
            { label: 'Done Today', value: `${globalStats.completedToday}/${habits.length}`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', sub: `${globalStats.todayRate}% complete` },
            { label: 'Total Check-ins', value: globalStats.totalCompletions, icon: Hash, color: 'text-primary', bg: 'bg-primary/10', sub: 'all time' },
            { label: 'Active Streaks', value: globalStats.activeStreaks, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10', sub: `of ${habits.length} habits` },
            { label: 'Best Streak', value: `${globalStats.bestStreak}d`, icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-500/10', sub: 'personal record' },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Today's progress bar */}
      {habits.length > 0 && (
        <div className="px-1">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground font-medium">Today's Progress</span>
            <span className="font-bold text-primary">{globalStats.todayRate}%</span>
          </div>
          <Progress value={globalStats.todayRate} className="h-2.5" />
        </div>
      )}

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
              const dates = parseDates(habit.completedDates)
              const totalCount = dates.length
              const rate7d = getCompletionRate(dates, 7)

              // Mini 7-day dots for the card
              const last7 = Array.from({ length: 7 }).map((_, j) => {
                const d = dayjs().subtract(6 - j, 'day').format('YYYY-MM-DD')
                return dates.includes(d)
              })

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
                    
                    <div className="p-4 sm:p-5 relative z-10">
                      {/* Top row: icon, name, check button */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5 min-w-0 pr-4">
                           <div className={`p-2.5 rounded-2xl shrink-0 transition-colors ${completed ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-muted/50 text-muted-foreground border border-border/50 group-hover:bg-muted'}`}>
                             <Flame className={`w-6 h-6 ${habit.currentStreak > 0 && !completed ? 'text-orange-500' : ''}`} />
                           </div>
                           <div className="min-w-0">
                             <h3 className={`font-bold text-lg truncate transition-colors ${completed ? 'text-primary' : 'text-foreground'}`}>
                               {habit.name}
                             </h3>
                             <div className="flex items-center gap-3 mt-0.5">
                               <span className="text-xs font-semibold text-muted-foreground">
                                 🔥 <span className={habit.currentStreak > 0 ? 'text-orange-500' : ''}>{habit.currentStreak}d streak</span>
                               </span>
                               <span className="text-xs font-semibold text-muted-foreground">
                                 × {totalCount} total
                               </span>
                             </div>
                           </div>
                        </div>
                        
                        {/* Check button */}
                        <button
                          onClick={(e) => handleToggle(habit, e)}
                          className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-[2.5px] transition-all duration-300 ${
                            completed 
                              ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30' 
                              : 'border-muted-foreground/30 text-transparent hover:border-primary hover:text-primary hover:bg-primary/10'
                          }`}
                        >
                          <CheckCircle2 className={`w-6 h-6 ${completed ? 'opacity-100' : 'opacity-0 scale-50 group-hover:opacity-50 group-hover:scale-100'} transition-all duration-300`} strokeWidth={3} />
                        </button>
                      </div>

                      {/* Bottom row: mini heatmap + rate */}
                      <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-border/30">
                        <div className="flex items-center gap-1">
                          {last7.map((done, idx) => (
                            <div 
                              key={idx} 
                              className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[5px] transition-all ${
                                done 
                                  ? 'bg-primary shadow-sm shadow-primary/30' 
                                  : 'bg-muted/40 border border-border/30'
                              }`}
                            />
                          ))}
                          <span className="text-[10px] font-bold text-muted-foreground ml-1.5 uppercase tracking-wider">7d</span>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] px-2.5 py-0.5 font-bold rounded-full ${
                            rate7d >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 
                            rate7d >= 50 ? 'bg-yellow-500/10 text-yellow-500' : 
                            'bg-muted text-muted-foreground'
                          }`}
                        >
                          {rate7d}% weekly
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ─── DETAILED HABIT MODAL ───────────────────────── */}
      <Dialog open={!!liveSelectedHabit} onOpenChange={(open) => {
        if (!open) setSelectedHabitDetails(null)
      }}>
        <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-3xl rounded-3xl outline-none shadow-2xl z-100 max-h-[90vh] overflow-y-auto">
          {liveSelectedHabit && (() => {
            const habit = liveSelectedHabit
            const completed = isCompletedToday(habit)
            const dates = parseDates(habit.completedDates)
            const totalCount = dates.length
            const daysSince = getDaysSinceCreated(habit.createdAt)
            const lifetimeRate = daysSince > 0 ? Math.round((totalCount / daysSince) * 100) : 0
            const rate7d = getCompletionRate(dates, 7)
            const rate30d = getCompletionRate(dates, 30)
            
            // Build 35-day calendar grid (5 weeks)
            const calendarDays = Array.from({ length: 35 }).map((_, i) => {
               const d = dayjs().subtract(34 - i, 'day')
               return {
                 date: d.format('YYYY-MM-DD'),
                 isDone: dates.includes(d.format('YYYY-MM-DD')),
                 dayNum: d.date(),
                 isToday: d.isSame(dayjs(), 'day'),
                 monthLabel: d.date() === 1 ? d.format('MMM') : null,
               }
            })

            // Week-by-week completion for the chart bars (last 4 weeks)
            const weeklyBars = Array.from({ length: 4 }).map((_, wi) => {
              const weekStart = dayjs().subtract((3 - wi) * 7 + 6, 'day')
              let count = 0
              for (let d = 0; d < 7; d++) {
                if (dates.includes(weekStart.add(d, 'day').format('YYYY-MM-DD'))) count++
              }
              return { label: `W${wi + 1}`, count, pct: Math.round((count / 7) * 100) }
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
                         <Badge variant="outline" className="capitalize px-3 py-1 text-[10px] font-bold rounded-full border border-primary/20 bg-primary/10 text-primary">
                          Daily Habit
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-2.5 py-0.5 font-bold rounded-full bg-muted">
                          Day {daysSince}
                        </Badge>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                        {habit.name}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 sm:p-8 space-y-7">

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
                      <p className="text-base leading-relaxed p-4 rounded-2xl bg-background/50 border border-border/30 text-foreground/90 font-medium">
                        {habit.description}
                      </p>
                    </div>
                  )}

                  {/* Stats row — 4 metrics */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {[
                      { label: 'Streak', value: habit.currentStreak, unit: 'd', icon: Flame, color: habit.currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground', bg: habit.currentStreak > 0 ? 'bg-orange-500/10' : 'bg-muted/50' },
                      { label: 'Best', value: habit.longestStreak, unit: 'd', icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                      { label: 'Total', value: totalCount, unit: '×', icon: Hash, color: 'text-primary', bg: 'bg-primary/10' },
                      { label: 'Rate', value: lifetimeRate, unit: '%', icon: TrendingUp, color: lifetimeRate >= 70 ? 'text-emerald-500' : 'text-muted-foreground', bg: lifetimeRate >= 70 ? 'bg-emerald-500/10' : 'bg-muted/50' },
                    ].map((stat) => (
                      <div key={stat.label} className={`${stat.bg} rounded-2xl p-3 flex flex-col items-center justify-center text-center border border-border/20`}>
                        <stat.icon className={`w-4 h-4 ${stat.color} mb-1.5`} />
                        <p className={`text-lg sm:text-xl font-extrabold ${stat.color}`}>
                          {stat.value}<span className="text-xs font-bold opacity-60">{stat.unit}</span>
                        </p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* 35-Day Heatmap Calendar */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Last 35 Days
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted/40 border border-border/30" /> Missed</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Done</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <div key={i} className="text-[9px] font-bold text-muted-foreground uppercase text-center py-0.5">{d}</div>
                      ))}
                      {/* Offset for starting day of week */}
                      {Array.from({ length: dayjs().subtract(34, 'day').day() }).map((_, i) => (
                        <div key={`pad-${i}`} />
                      ))}
                      {calendarDays.map((day) => (
                        <div
                          key={day.date}
                          className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-bold transition-all relative ${
                            day.isDone
                              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                              : 'bg-muted/20 text-muted-foreground/40 border border-border/20'
                          } ${day.isToday ? 'ring-2 ring-primary/50 ring-offset-1 ring-offset-background' : ''}`}
                          title={day.date}
                        >
                          {day.dayNum}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Weekly Bars */}
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Weekly Completion
                    </h4>
                    <div className="flex items-end gap-2 h-20">
                      {weeklyBars.map((week) => (
                        <div key={week.label} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground">{week.count}/7</span>
                          <div className="w-full bg-muted/30 rounded-lg relative overflow-hidden" style={{ height: '48px' }}>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${week.pct}%` }}
                              transition={{ duration: 0.6, delay: 0.1 }}
                              className={`absolute bottom-0 left-0 right-0 rounded-lg ${
                                week.pct >= 80 ? 'bg-emerald-500' :
                                week.pct >= 50 ? 'bg-primary' :
                                week.pct > 0 ? 'bg-yellow-500' : 'bg-muted'
                              }`}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{week.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Completion rates comparison */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background/50 border border-border/30 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">7-Day Rate</span>
                        <span className={`text-sm font-extrabold ${rate7d >= 70 ? 'text-emerald-500' : rate7d >= 40 ? 'text-yellow-500' : 'text-red-400'}`}>{rate7d}%</span>
                      </div>
                      <Progress value={rate7d} className="h-2" />
                    </div>
                    <div className="bg-background/50 border border-border/30 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">30-Day Rate</span>
                        <span className={`text-sm font-extrabold ${rate30d >= 70 ? 'text-emerald-500' : rate30d >= 40 ? 'text-yellow-500' : 'text-red-400'}`}>{rate30d}%</span>
                      </div>
                      <Progress value={rate30d} className="h-2" />
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
                    onClick={() => { 
                      const habitToRestore = { ...habit }
                      setSelectedHabitDetails(null); 
                      deleteHabit(habit.id); 
                      showToast(`Deleted habit: ${habit.name}`, () => {
                        addHabit(habitToRestore)
                      })
                    }}
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
