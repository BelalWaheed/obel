import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTimerStore } from '@/stores/timerStore'
import { useTaskStore } from '@/stores/taskStore'
import { Card } from '@/components/ui/card'
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts'
import dayjs from 'dayjs'
import { BarChart3, Target, Zap } from 'lucide-react'

export default function AnalyticsPage() {
  const sessionHistory = useTimerStore(s => s.sessionHistory)
  const tasks = useTaskStore(s => s.tasks)

  // 1. Heatmap Data (Last 12 weeks)
  const heatmapData = useMemo(() => {
    const days = 12 * 7
    const result = []
    for (let i = days; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD')
      const focusSessions = sessionHistory.filter(s => 
        s.mode === 'focus' && dayjs(s.completedAt).format('YYYY-MM-DD') === date
      )
      const totalMinutes = Math.round(focusSessions.reduce((acc, s) => acc + s.duration, 0) / 60)
      result.push({ date, totalMinutes })
    }
    return result
  }, [sessionHistory])

  // 2. Weekly Trend Data
  const trendData = useMemo(() => {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day')
      const dayStr = date.format('YYYY-MM-DD')
      const focusMins = Math.round(sessionHistory
        .filter(s => s.mode === 'focus' && dayjs(s.completedAt).format('YYYY-MM-DD') === dayStr)
        .reduce((acc, s) => acc + s.duration, 0) / 60
      )
      last7Days.push({ name: date.format('ddd'), minutes: focusMins })
    }
    return last7Days
  }, [sessionHistory])

  const totalFocusHours = useMemo(() => {
    return Math.round(sessionHistory.filter(s => s.mode === 'focus').reduce((acc, s) => acc + s.duration, 0) / 3600)
  }, [sessionHistory])

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight">Productivity Analytics</h1>
        <p className="text-muted-foreground text-lg font-medium">Visualize your focus cycles and mission progress.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4 bg-primary/5 border-primary/20">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black">{totalFocusHours}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Focus Hours</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4 bg-emerald-500/5 border-emerald-500/20">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black">{tasks.filter(t => t.status === 'done').length}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Objectives Cleared</p>
          </div>
        </Card>
        <Card className="p-6 flex items-center gap-4 bg-blue-500/5 border-blue-500/20">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-3xl font-black">{Math.round((tasks.filter(t => t.status === 'done').length / (tasks.length || 1)) * 100)}%</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Completion Rate</p>
          </div>
        </Card>
      </div>

      {/* Heatmap Section */}
      <Card className="p-8">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">Focus Intensity (Last 12 Weeks)</h3>
        <div className="grid grid-cols-[repeat(12,1fr)] gap-2">
           {Array.from({ length: 12 }).map((_, weekIdx) => (
             <div key={weekIdx} className="grid grid-rows-7 gap-1.5">
               {Array.from({ length: 7 }).map((_, dayIdx) => {
                 const dataIdx = weekIdx * 7 + dayIdx
                 const dayData = heatmapData[dataIdx] || { totalMinutes: 0 }
                 
                 // Dynamic color based on intensity
                 let intensityClass = 'bg-muted/30'
                 if (dayData.totalMinutes > 0) intensityClass = 'bg-primary/20'
                 if (dayData.totalMinutes > 60) intensityClass = 'bg-primary/40'
                 if (dayData.totalMinutes > 120) intensityClass = 'bg-primary/60'
                 if (dayData.totalMinutes > 240) intensityClass = 'bg-primary/80'
                 if (dayData.totalMinutes > 360) intensityClass = 'bg-primary'

                 return (
                   <motion.div 
                     key={dayIdx}
                     whileHover={{ scale: 1.2, zIndex: 10 }}
                     className={`aspect-square rounded-sm ${intensityClass} cursor-help transition-colors border border-black/5`}
                     title={`${dayData.date}: ${dayData.totalMinutes} mins focus`}
                   />
                 )
               })}
             </div>
           ))}
        </div>
        <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-muted-foreground font-bold uppercase">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-muted/30" />
          <div className="w-3 h-3 rounded-sm bg-primary/20" />
          <div className="w-3 h-3 rounded-sm bg-primary/40" />
          <div className="w-3 h-3 rounded-sm bg-primary/60" />
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span>More</span>
        </div>
      </Card>

      {/* Weekly Trend Chart */}
      <Card className="p-8">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">Weekly Focus Trend</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorMins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 600 }}
              />
              <YAxis 
                hide 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="minutes" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMins)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
