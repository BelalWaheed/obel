import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Coffee, 
  X, 
  Plus,
  Trash2, 
  Zap, 
  TrendingUp, 
  History, 
  Clock,
  Check
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCoffeeStore } from '@/stores/coffeeStore'
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

interface CoffeeHubProps {
  isOpen: boolean
  onClose: () => void
}

const DRINK_PRESETS = [
  { name: 'Turkish', mg: 80, icon: '☕' },
  { name: 'Espresso', mg: 64, icon: '⚡' },
  { name: 'Latte', mg: 120, icon: '🥛' },
  { name: 'Americano', mg: 150, icon: '💧' },
  { name: 'Cold Brew', mg: 200, icon: '❄️' },
]

const MOOD_PRESETS = [
  { name: 'Productive', icon: '🔥' },
  { name: 'Focused', icon: '🎯' },
  { name: 'Relaxed', icon: '🌿' },
  { name: 'Tired', icon: '😴' },
  { name: 'Creative', icon: '✨' },
]

export function CoffeeHub({ isOpen, onClose }: CoffeeHubProps) {
  const logs = useCoffeeStore((s) => s.logs)
  const addLog = useCoffeeStore((s) => s.addLog)
  const deleteLog = useCoffeeStore((s) => s.deleteLog)
  const getCurrentCaffeineLevel = useCoffeeStore((s) => s.getCurrentCaffeineLevel)

  const [selectedDrink, setSelectedDrink] = useState(DRINK_PRESETS[1]) // Espresso default
  const [selectedMood, setSelectedMood] = useState(MOOD_PRESETS[0]) // Productive default

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [logs])

  const chartData = useMemo(() => {
    const points = []
    const now = dayjs()
    const start = now.subtract(12, 'hour')
    const halfLifeMinutes = 300

    for (let i = 0; i <= 18 * 4; i++) {
      const time = start.add(i * 15, 'minute')
      const timeUnix = time.valueOf()
      let totalCaffeine = 0
      logs.forEach(log => {
        const logTime = dayjs(log.timestamp).valueOf()
        if (logTime <= timeUnix) {
          const diffMins = (timeUnix - logTime) / (1000 * 60)
          const remaining = log.caffeineMg * Math.pow(0.5, diffMins / halfLifeMinutes)
          totalCaffeine += remaining
        }
      })
      points.push({
        time: time.format('HH:mm'),
        level: Math.round(totalCaffeine),
      })
    }
    return points
  }, [logs])

  const handleAdd = async () => {
    await addLog({
      type: selectedDrink.name,
      caffeineMg: selectedDrink.mg,
      mood: selectedMood.name
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-2 md:p-4 bg-background/80 backdrop-blur-md overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card/90 border border-border/50 w-full max-w-4xl max-h-[95dvh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative pb-safe"
        >
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-border/50 flex items-center justify-between bg-muted/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">Obel Coffee Hub</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Scientific Refueling</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 custom-scrollbar">
            {/* Chart Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Caffeine Evolution
                </h3>
                <div className="px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
                    <span className="text-[10px] md:text-xs font-bold text-orange-500 uppercase tracking-tighter">
                        Current Impact: {getCurrentCaffeineLevel()}%
                    </span>
                </div>
              </div>
              
              <Card className="p-4 md:p-6 h-[200px] md:h-[300px] bg-muted/10 border-border/30">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="caffeineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--orange-500))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--orange-500))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.1} />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                      interval={12}
                    />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="level" 
                      stroke="#f97316" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#caffeineGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {/* Selectors Section */}
              <section className="space-y-6">
                {/* Drink Type Selector */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Select Drink
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {DRINK_PRESETS.map((drink) => (
                      <button
                        key={drink.name}
                        onClick={() => setSelectedDrink(drink)}
                        className={`px-3 py-2 rounded-2xl border transition-all flex items-center gap-2 ${
                          selectedDrink.name === drink.name
                            ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'bg-muted/10 border-border/50 hover:bg-muted/20'
                        }`}
                      >
                        <span className="text-sm">{drink.icon}</span>
                        <span className="text-xs font-bold">{drink.name}</span>
                        {selectedDrink.name === drink.name && <Check className="w-3 h-3 ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood Selector */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"> Current Mood</h3>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_PRESETS.map((mood) => (
                      <button
                        key={mood.name}
                        onClick={() => setSelectedMood(mood)}
                        className={`px-3 py-2 rounded-2xl border transition-all flex items-center gap-2 ${
                          selectedMood.name === mood.name
                            ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20'
                            : 'bg-muted/10 border-border/50 hover:bg-muted/20'
                        }`}
                      >
                        <span className="text-sm">{mood.icon}</span>
                        <span className="text-xs font-bold">{mood.name}</span>
                        {selectedMood.name === mood.name && <Check className="w-3 h-3 ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full h-14 rounded-[1.5rem] bg-orange-500 hover:bg-orange-600 font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 text-white active:scale-95 transition-all"
                  onClick={handleAdd}
                >
                  Log <span className="mx-1">{selectedDrink.name}</span>
                </Button>
              </section>

              {/* History Section */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Recent Sips
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {sortedLogs.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-border/20 rounded-[2rem] opacity-30">
                        <Coffee className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs font-bold italic">No drinks logged yet</p>
                    </div>
                  ) : (
                    sortedLogs.map((log) => (
                      <motion.div 
                        key={log.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group flex items-center gap-3 bg-muted/10 border border-border/30 p-2.5 rounded-2xl hover:bg-muted/20 transition-all"
                      >
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 text-orange-500">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-xs truncate">{log.type}</h4>
                            <span className="text-[10px] font-black text-orange-500 uppercase">{log.caffeineMg}mg</span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase opacity-70">
                            <Clock className="w-2.5 h-2.5" />
                            {dayjs(log.timestamp).format('HH:mm')}
                            <span className="mx-1">•</span>
                            {log.mood}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive transition-all rounded-full"
                          onClick={() => deleteLog(log.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
