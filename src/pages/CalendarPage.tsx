import { motion } from 'framer-motion'
import { Calendar, Target, Bell } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground mt-1">
          View your deadlines and schedule in a calendar view.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-blue-500" />
          </div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
            className="absolute -inset-3 border-2 border-dashed border-blue-500/20 rounded-[2rem]"
          />
        </div>

        <h2 className="text-2xl font-bold mb-2">Coming in Phase 3</h2>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          A powerful calendar view to manage deadlines, plan your week, and 
          never miss an important date.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full">
          {[
            { icon: Calendar, label: 'Deadlines View', desc: 'See all tasks by due date' },
            { icon: Target, label: 'Weekly Planning', desc: 'Plan and organize your week' },
            { icon: Bell, label: 'Reminders', desc: 'Get notified before deadlines' },
          ].map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Card className="p-4 text-center h-full">
                <feature.icon className="w-6 h-6 text-blue-500 mx-auto mb-2" />
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
