import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BrainCircuit, Lightbulb, TrendingUp, AlertCircle, Quote } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useTaskStore } from '@/stores/taskStore'
import { useHabitStore } from '@/stores/habitStore'
import { useTimerStore } from '@/stores/timerStore'
import { getProductivityAdvice } from '@/lib/ai'
import dayjs from 'dayjs'

export function ProductivityCoach() {
  const tasks = useTaskStore(s => s.tasks)
  const habits = useHabitStore(s => s.habits)
  const sessionHistory = useTimerStore(s => s.sessionHistory)
  const [aiAdvice, setAiAdvice] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)

  const insights = useMemo(() => {
    const list: { id: string; title: string; message: string; type: 'positive' | 'warning' | 'neutral' | 'tip'; icon: React.ElementType }[] = []

    const todayStr = dayjs().format('YYYY-MM-DD')
    const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD')

    // 1. Overdue Tasks Rule
    const overdueTasks = tasks.filter(t => t.status !== 'done' && t.dueDate && dayjs(t.dueDate).isBefore(dayjs(), 'day'))
    if (overdueTasks.length > 0) {
      list.push({
        id: 'overdue',
        title: 'Backlog Alert',
        message: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}. Consider rescheduling them or breaking them into smaller steps to regain momentum.`,
        type: 'warning',
        icon: AlertCircle
      })
    }

    // 2. Habit Slipping Rule
    const slippedHabit = habits.find(h => {
      try {
        const dates = JSON.parse(h.completedDates || '[]')
        return !dates.includes(todayStr) && !dates.includes(yesterdayStr) && h.longestStreak > 2
      } catch { return false }
    })
    if (slippedHabit) {
      list.push({
        id: 'habit-slip',
        title: 'Habit at Risk',
        message: `You missed "${slippedHabit.name}" yesterday. You've hit a ${slippedHabit.longestStreak}-day streak before—don't let it slide for 2 days in a row!`,
        type: 'warning',
        icon: Lightbulb
      })
    }

    // 3. Focus Consistency
    const yesterdayFocus = sessionHistory.filter(s => dayjs(s.completedAt).format('YYYY-MM-DD') === yesterdayStr && s.mode === 'focus')
    const todayFocus = sessionHistory.filter(s => dayjs(s.completedAt).format('YYYY-MM-DD') === todayStr && s.mode === 'focus')
    
    const yesterdayMins = Math.round(yesterdayFocus.reduce((acc, s) => acc + s.duration, 0) / 60)
    const todayMins = Math.round(todayFocus.reduce((acc, s) => acc + s.duration, 0) / 60)

    if (yesterdayMins > 60 && todayMins === 0) {
      list.push({
        id: 'focus-momentum',
        title: 'Great Momentum',
        message: `You focused for ${Math.round(yesterdayMins / 60)} hour${Math.round(yesterdayMins / 60) > 1 ? 's' : ''} yesterday. Ready to jump into a Pomodoro session and keep the streak alive?`,
        type: 'positive',
        icon: TrendingUp
      })
    }

    // 4. Busiest tag analysis
    const activeTasks = tasks.filter(t => t.status !== 'done')
    if (activeTasks.length > 3) {
      const tagCounts: Record<string, number> = {}
      activeTasks.forEach(t => t.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }))
      const topTag = Object.entries(tagCounts).sort((a,b) => b[1] - a[1])[0]
      if (topTag && topTag[1] >= 3) {
        list.push({
          id: 'tag-heavy',
          title: 'Workload Balance',
          message: `Your current plate is heavy on #${topTag[0]} (${topTag[1]} tasks). If that's intentional, great! If not, see if you can diversify your focus.`,
          type: 'neutral',
          icon: BrainCircuit
        })
      }
    }

    // 5. Completion fallback
    if (list.length === 0) {
      const pendingToday = tasks.filter(t => t.status !== 'done' && t.dueDate === todayStr).length
      if (pendingToday === 0 && tasks.filter(t => t.status === 'done' && t.completedAt?.startsWith(todayStr)).length > 0) {
        list.push({
          id: 'all-done',
          title: 'Incredible Work',
          message: `You've cleared all your scheduled tasks for today. Enjoy the rest of your day, or tackle some backlog items if you're feeling ambitious!`,
          type: 'positive',
          icon: TrendingUp
        })
      } else {
        // Generic tip
        list.push({
          id: 'generic-tip',
          title: 'Coach Tip',
          message: "Breaking large tasks into smaller subtasks can reduce completion friction by 40%. Try adding subtasks to complex objectives.",
          type: 'tip',
          icon: Quote
        })
      }
    }

    // Return max 2 insights so it doesn't overwhelm the dashboard
    const finalInsights = [...list]
    if (aiAdvice) {
      finalInsights.unshift({
        id: 'ai-gen-advice',
        title: 'Personalized Coaching',
        message: aiAdvice,
        type: 'tip',
        icon: BrainCircuit
      })
    }
    return finalInsights.slice(0, 2)
  }, [tasks, habits, sessionHistory, aiAdvice])

  useEffect(() => {
    async function fetchAI() {
      if (tasks.length === 0) return
      setIsAiLoading(true)
      try {
        const advice = await getProductivityAdvice({ tasks, habits, sessions: sessionHistory })
        setAiAdvice(advice)
      } finally {
        setIsAiLoading(false)
      }
    }
    fetchAI()
    // intentional: only re-fetch when count changes to avoid excessive AI calls
  }, [tasks.length, habits.length, sessionHistory.length, tasks, habits, sessionHistory])

  if (insights.length === 0) return null

  return (
    <Card className="p-5 border-primary/20 bg-linear-to-br from-primary/5 to-background">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-primary/10 rounded-xl relative">
          <BrainCircuit className="w-5 h-5 text-primary" />
          {isAiLoading && (
            <motion.div 
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-primary/40 rounded-xl"
            />
          )}
        </div>
        <h3 className="font-semibold text-lg tracking-tight flex items-center gap-2">
          AI Coach Insights
          {isAiLoading && <span className="text-[10px] text-primary animate-pulse uppercase font-bold tracking-widest">Thinking...</span>}
        </h3>
      </div>
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const Icon = insight.icon
          const colorStyles = {
            positive: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
            warning: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
            neutral: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
            tip: 'text-purple-500 bg-purple-500/10 border-purple-500/20'
          }
          const textColor = {
            positive: 'text-emerald-600 dark:text-emerald-400',
            warning: 'text-orange-600 dark:text-orange-400',
            neutral: 'text-blue-600 dark:text-blue-400',
            tip: 'text-purple-600 dark:text-purple-400'
          }

          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex bg-background/50 border border-border/50 rounded-2xl p-4 gap-4"
            >
              <div className={`mt-0.5 p-2 rounded-xl h-fit border ${colorStyles[insight.type]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <h4 className={`font-bold text-sm mb-1 ${textColor[insight.type]}`}>{insight.title}</h4>
                <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                  {insight.message}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </Card>
  )
}
