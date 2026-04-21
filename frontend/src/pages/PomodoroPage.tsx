import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Settings2,
  Timer,
  Coffee,
  Zap,
  Link2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTimerStore, type TimerMode } from '@/stores/timerStore'
import { useCoffeeStore } from '@/stores/coffeeStore'
import { useTaskStore } from '@/stores/taskStore'

import { CoffeeBreakTimer } from '@/components/pomodoro/CoffeeBreakTimer'

const modeConfig: Record<TimerMode, { label: string; color: string; bgColor: string; icon: typeof Timer }> = {
  focus: { label: 'Focus Time', color: 'text-primary', bgColor: 'bg-primary/10', icon: Zap },
  shortBreak: { label: 'Short Break', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: Coffee },
  longBreak: { label: 'Long Break', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: Coffee },
  coffeeBreak: { label: 'Coffee Break', color: 'text-orange-500', bgColor: 'bg-orange-500/10', icon: Coffee },
}

const focusPresets = [15, 20, 25, 30, 40, 45, 60]

export default function PomodoroPage() {
  const timeRemaining = useTimerStore((s) => s.timeRemaining)
  const isRunning = useTimerStore((s) => s.isRunning)
  const mode = useTimerStore((s) => s.mode)
  const sessionsCompleted = useTimerStore((s) => s.sessionsCompleted)
  const settings = useTimerStore((s) => s.settings)
  const sessionHistory = useTimerStore((s) => s.sessionHistory)
  const activeTaskId = useTimerStore((s) => s.activeTaskId)
  const start = useTimerStore((s) => s.start)
  const pause = useTimerStore((s) => s.pause)
  const reset = useTimerStore((s) => s.reset)
  const skip = useTimerStore((s) => s.skip)
  const setMode = useTimerStore((s) => s.setMode)
  const updateSettings = useTimerStore((s) => s.updateSettings)
  const setActiveTaskId = useTimerStore((s) => s.setActiveTaskId)

  const tasks = useTaskStore((s) => s.tasks)
  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== 'done'), [tasks])
  const activeTask = useMemo(() => tasks.find((t) => t.id === activeTaskId), [tasks, activeTaskId])
  const coffeeLogs = useCoffeeStore((s) => s.logs)
  const getCupsToday = useCoffeeStore((s) => s.getCupsToday)

  const [showSettings, setShowSettings] = useState(false)
  const [localFocus, setLocalFocus] = useState(settings.focusDuration)
  const [localShortBreak, setLocalShortBreak] = useState(settings.shortBreakDuration)
  const [localLongBreak, setLocalLongBreak] = useState(settings.longBreakDuration)
  const [localInterval, setLocalInterval] = useState(settings.longBreakInterval)
  const [autoBreaks, setAutoBreaks] = useState(settings.autoStartBreaks)
  const [autoFocus, setAutoFocus] = useState(settings.autoStartFocus)
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled)
  const [notifsEnabled, setNotifsEnabled] = useState(settings.notificationsEnabled)

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const totalDuration =
    mode === 'focus'
      ? settings.focusDuration * 60
      : mode === 'shortBreak'
      ? settings.shortBreakDuration * 60
      : mode === 'coffeeBreak'
      ? 5 * 60 // Base for selector
      : settings.longBreakDuration * 60

  const progress = ((totalDuration - timeRemaining) / totalDuration) * 100
  const config = modeConfig[mode]
  const ModeIcon = config.icon

  const todaySessions = useMemo(() => {
    const today = new Date().toDateString()
    return sessionHistory.filter((s) => new Date(s.completedAt).toDateString() === today)
  }, [sessionHistory])

  const todayFocusMinutes = useMemo(
    () => Math.round(todaySessions.filter((s) => s.mode === 'focus').reduce((a, s) => a + s.duration, 0) / 60),
    [todaySessions]
  )

  const coffeeStats = useMemo(() => {
    const coffeeSessions = todaySessions.filter(s => s.mode === 'coffeeBreak')
    const cupsLogged = getCupsToday()
    return {
      count: Math.max(coffeeSessions.length, cupsLogged),
      minutes: Math.round(coffeeSessions.reduce((a, s) => a + s.duration, 0) / 60)
    }
  }, [todaySessions, getCupsToday])

  const handleSaveSettings = () => {
    updateSettings({
      focusDuration: localFocus,
      shortBreakDuration: localShortBreak,
      longBreakDuration: localLongBreak,
      longBreakInterval: localInterval,
      autoStartBreaks: autoBreaks,
      autoStartFocus: autoFocus,
      soundEnabled,
      notificationsEnabled: notifsEnabled,
    })
    setShowSettings(false)
  }

  const openSettings = () => {
    setLocalFocus(settings.focusDuration)
    setLocalShortBreak(settings.shortBreakDuration)
    setLocalLongBreak(settings.longBreakDuration)
    setLocalInterval(settings.longBreakInterval)
    setAutoBreaks(settings.autoStartBreaks)
    setAutoFocus(settings.autoStartFocus)
    setSoundEnabled(settings.soundEnabled)
    setNotifsEnabled(settings.notificationsEnabled)
    setShowSettings(true)
  }

  const handleModeSwitch = (m: TimerMode) => {
    if (!isRunning) {
      setMode(m)
    }
  }

  const radius = 140
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Timer</h1>
        <p className="text-muted-foreground mt-1 text-balance">Work hard, recharge deep. Your productivity sanctuary.</p>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center flex-wrap gap-2">
        {(Object.entries(modeConfig) as [TimerMode, typeof config][]).map(([m, c]) => {
          const Icon = c.icon
          return (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'outline'}
              size="sm"
              className={`gap-1.5 transition-all ${mode === m ? 'shadow-lg shadow-primary/25 scale-105' : ''}`}
              onClick={() => handleModeSwitch(m)}
              disabled={isRunning}
            >
              <Icon className="w-4 h-4" />
              {c.label}
            </Button>
          )
        })}
      </div>

      {/* Timer View Conditional */}
      {mode === 'coffeeBreak' ? (
        <CoffeeBreakTimer activeTask={activeTask} />
      ) : (
        <>
          {/* Standard Timer */}
          <div className="flex justify-center">
            <div className="relative w-[340px] h-[340px]">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 320 320">
                <circle cx="160" cy="160" r={radius} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="6" />
                <motion.circle
                  cx="160" cy="160" r={radius} fill="none" stroke="currentColor"
                  className={config.color} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  className={`p-3 rounded-2xl ${config.bgColor} mb-4`}
                  animate={{ scale: isRunning ? [1, 1.05, 1] : 1 }}
                  transition={{ repeat: isRunning ? Infinity : 0, duration: 2 }}
                >
                  <ModeIcon className={`w-6 h-6 ${config.color}`} />
                </motion.div>
                <div className="text-6xl font-bold tracking-tighter tabular-nums">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <p className={`text-sm font-medium mt-2 ${config.color}`}>{config.label}</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center items-center gap-3">
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={reset} title="Reset">
              <RotateCcw className="w-5 h-5" />
            </Button>
            <Button size="lg" className="h-14 w-14 rounded-2xl shadow-lg shadow-primary/25" onClick={() => {
              if (isRunning) {
                import('@/lib/sounds').then(({ soundSystem }) => soundSystem.playPause());
                pause();
              } else {
                import('@/lib/sounds').then(({ soundSystem }) => soundSystem.playStart());
                start();
              }
            }}>
              {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={skip} title="Skip">
              <SkipForward className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={openSettings} title="Settings">
              <Settings2 className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}


      {/* Link Task Section */}
      <div className="max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {!activeTaskId ? (
            <motion.div
              key="select-task"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/50">Focus Objective</p>
              <Select value="none" onValueChange={(v) => setActiveTaskId(v === 'none' ? null : v)}>
                <SelectTrigger className="w-full h-12 bg-card/40 border-border/40 shadow-sm rounded-2xl backdrop-blur-xl hover:bg-card/60 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Link2 className="w-4 h-4 text-primary" />
                    </div>
                    <SelectValue placeholder="Link a task to this session..." />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-2xl border-border/50 rounded-2xl">
                  <SelectItem value="none" className="text-muted-foreground">Standalone Session</SelectItem>
                  {activeTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold">{task.title}</span>
                        <span className="text-[10px] text-muted-foreground">{task.focusSessions || 0} sessions completed</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>
          ) : (
            <motion.div
              key="active-task-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative p-5 rounded-3xl bg-primary/3 border border-primary/20 backdrop-blur-xl overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setActiveTaskId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <p className="text-[10px] uppercase tracking-widest font-black text-primary/60 mb-1">Tracking Progress</p>
                  <h3 className="text-xl font-bold tracking-tight truncate mb-3">{activeTask?.title}</h3>
                  <div className="flex items-center gap-4">
                    <div className="px-3 py-1.5 rounded-xl bg-background/50 border border-border/50 flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1">Sessions</span>
                      <span className="text-sm font-black tabular-nums">{activeTask?.focusSessions || 0}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-background/50 border border-border/50 flex flex-col">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1">Status</span>
                      <span className="text-sm font-bold text-primary capitalize">{activeTask?.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Stats Table */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
        <Card className="p-4 text-center bg-card shadow-sm border-border/60">
          <p className="text-2xl font-bold">{sessionsCompleted}</p>
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Total Sessions</p>
        </Card>
        <Card className="p-4 text-center bg-card shadow-sm border-border/60">
          <p className="text-2xl font-bold">{todayFocusMinutes}</p>
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Focus Mins Today</p>
        </Card>
        <Card className="p-4 text-center bg-card shadow-sm border-border/60">
          <p className="text-2xl font-bold text-orange-500">{coffeeStats.count}</p>
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Coffee Breaks</p>
        </Card>
        <Card className="p-4 text-center bg-card shadow-sm border-border/60">
          <p className="text-2xl font-bold text-orange-500">{coffeeStats.minutes}</p>
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Mins Rested</p>
        </Card>
      </div>

      {/* Lifetime Coffee Cups */}
      {coffeeLogs.length > 0 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Coffee className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-500">{coffeeLogs.length} lifetime coffee cups ☕</span>
          </div>
        </div>
      )}

      {/* Today's Sessions */}
      {todaySessions.length > 0 && (
        <Card className="p-4 max-w-2xl mx-auto">
          <h3 className="font-semibold mb-3">Today's Sessions</h3>
          <div className="space-y-2">
            {todaySessions.slice(0, 8).map((session) => {
              const sc = modeConfig[session.mode]
              const Ic = sc.icon
              return (
                <div key={session.id} className="flex items-center gap-3 text-sm">
                  <div className={`p-1.5 rounded-lg ${sc.bgColor}`}><Ic className={`w-3.5 h-3.5 ${sc.color}`} /></div>
                  <span className="flex-1">{sc.label}</span>
                  <span className="text-muted-foreground">{Math.round(session.duration / 60)} min</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Timer Settings</DialogTitle></DialogHeader>
          <div className="space-y-2 ">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Focus Duration (minutes)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {focusPresets.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLocalFocus(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      localFocus === m
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
              <Input type="number" min={1} max={120} value={localFocus} onChange={(e) => setLocalFocus(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Short Break (minutes)</label>
              <Input type="number" min={1} max={30} value={localShortBreak} onChange={(e) => setLocalShortBreak(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Long Break (minutes)</label>
              <Input type="number" min={1} max={60} value={localLongBreak} onChange={(e) => setLocalLongBreak(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Long Break After (sessions)</label>
              <Input type="number" min={2} max={10} value={localInterval} onChange={(e) => setLocalInterval(Number(e.target.value))} />
            </div>
            <div className="">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={autoBreaks} onChange={(e) => setAutoBreaks(e.target.checked)} className="rounded" />
                Auto-start breaks
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={autoFocus} onChange={(e) => setAutoFocus(e.target.checked)} className="rounded" />
                Auto-start focus sessions
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} className="rounded" />
                Enable timer chime
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={notifsEnabled} onChange={(e) => setNotifsEnabled(e.target.checked)} className="rounded" />
                Enable browser notifications
              </label>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs h-8 border-dashed mt-2"
                onClick={async () => {
                  const { soundSystem } = await import('@/lib/sounds')
                  soundSystem.playChime()
                }}
              >
                Test Sound & Initialize Audio
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
