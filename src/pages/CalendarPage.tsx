import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import dayjs from 'dayjs'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(dayjs())

  const handlePrevWeek = () => setCurrentDate(currentDate.subtract(1, 'week'))
  const handleNextWeek = () => setCurrentDate(currentDate.add(1, 'week'))
  const handleToday = () => setCurrentDate(dayjs())

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Focus Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            Strategic mapping of your deadlines and objectives.
          </p>
        </div>
      </div>

      <CalendarGrid 
        currentDate={currentDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Weekly Planning</h4>
          <p className="text-sm text-foreground/80 leading-relaxed font-medium">
            Switch to the <strong>Planner</strong> view to timeblock your next 24 hours. 
            The calendar ensures your long-term goals align with your daily execution.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-muted/20 border border-border/50">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Strategic Overview</h4>
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            Keep an eye on clustered deadlines. If a day has more than 3 high-priority tasks, 
            consider rescheduling to maintain peak focus and flow.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
