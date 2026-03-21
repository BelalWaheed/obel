import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, CheckSquare, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function HabitsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Habits</h1>
        <p className="text-muted-foreground mt-1">
          Build daily habits and track your streaks.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
            className="absolute -inset-3 border-2 border-dashed border-primary/20 rounded-[2rem]"
          />
        </div>

        <h2 className="text-2xl font-bold mb-2">Coming in Phase 2</h2>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          Track daily habits, build streaks, and develop consistent routines 
          that transform your productivity.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full">
          {[
            { icon: CheckSquare, label: 'Daily Check-ins', desc: 'Mark habits as complete each day' },
            { icon: TrendingUp, label: 'Streak Tracking', desc: 'Build momentum with streaks' },
            { icon: Calendar, label: 'Habit Calendar', desc: 'Visualize your consistency' },
          ].map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Card className="p-4 text-center h-full">
                <feature.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <h4 className="text-sm font-semibold">{feature.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
