import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
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
import { useTaskStore } from '@/stores/taskStore'

const modeConfig: Record<TimerMode, { label: string; color: string; bgColor: string; icon: typeof Timer }> = {
  focus: { label: 'Focus Time', color: 'text-primary', bgColor: 'bg-primary/10', icon: Zap },
  shortBreak: { label: 'Short Break', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: Coffee },
  longBreak: { label: 'Long Break', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: Coffee },
}

const focusPresets = [15, 20, 25, 30, 40, 45, 60]

export default function PomodoroPage() {
  const timeRemaining = useTimerStore((s) => s.timeRemaining)
  const isRunning = useTimerStore((s) => s.isRunning)
  const mode = useTimerStore((s) => s.mode)
  const sessionsCompleted = useTimerStore((s) => s.sessionsCompleted)
  const settings = useTimerStore((s) => s.settings)
  const sessionHistory = useTimerStore((s) => s.sessionHistory)
  const linkedTaskId = useTimerStore((s) => s.linkedTaskId)
  const start = useTimerStore((s) => s.start)
  const pause = useTimerStore((s) => s.pause)
  const reset = useTimerStore((s) => s.reset)
  const skip = useTimerStore((s) => s.skip)
  const updateSettings = useTimerStore((s) => s.updateSettings)
  const setLinkedTask = useTimerStore((s) => s.setLinkedTask)

  const tasks = useTaskStore((s) => s.tasks)
  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== 'done'), [tasks])
  const linkedTask = useMemo(() => tasks.find((t) => t.id === linkedTaskId), [tasks, linkedTaskId])

  const [showSettings, setShowSettings] = useState(false)
  const [localFocus, setLocalFocus] = useState(settings.focusDuration)
  const [localShortBreak, setLocalShortBreak] = useState(settings.shortBreakDuration)
  const [localLongBreak, setLocalLongBreak] = useState(settings.longBreakDuration)
  const [localInterval, setLocalInterval] = useState(settings.longBreakInterval)
  const [autoBreaks, setAutoBreaks] = useState(settings.autoStartBreaks)
  const [autoFocus, setAutoFocus] = useState(settings.autoStartFocus)

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const totalDuration =
    mode === 'focus'
      ? settings.focusDuration * 60
      : mode === 'shortBreak'
      ? settings.shortBreakDuration * 60
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

  const handleSaveSettings = () => {
    updateSettings({
      focusDuration: localFocus,
      shortBreakDuration: localShortBreak,
      longBreakDuration: localLongBreak,
      longBreakInterval: localInterval,
      autoStartBreaks: autoBreaks,
      autoStartFocus: autoFocus,
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
    setShowSettings(true)
  }

  const handleModeSwitch = (m: TimerMode) => {
    if (!isRunning) {
      useTimerStore.setState({
        mode: m,
        timeRemaining:
          m === 'focus'
            ? settings.focusDuration * 60
            : m === 'shortBreak'
            ? settings.shortBreakDuration * 60
            : settings.longBreakDuration * 60,
      })
    }
  }

  const radius = 140
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Pomodoro Timer</h1>
        <p className="text-muted-foreground mt-1">Stay focused, take breaks, and accomplish more.</p>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center gap-2">
        {(Object.entries(modeConfig) as [TimerMode, typeof config][]).map(([m, c]) => {
          const Icon = c.icon
          return (
            <Button
              key={m}
              variant={mode === m ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => handleModeSwitch(m)}
              disabled={isRunning}
            >
              <Icon className="w-4 h-4" />
              {c.label}
            </Button>
          )
        })}
      </div>

      {/* Timer */}
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
            {linkedTask && (
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                <Link2 className="w-3 h-3" />
                <span className="max-w-[180px] truncate">{linkedTask.title}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-3">
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={reset} title="Reset">
          <RotateCcw className="w-5 h-5" />
        </Button>
        <Button size="lg" className="h-14 w-14 rounded-2xl shadow-lg shadow-primary/25" onClick={isRunning ? pause : start}>
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </Button>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={skip} title="Skip">
          <SkipForward className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={openSettings} title="Settings">
          <Settings2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Link Task */}
      <div className="flex justify-center">
        <Select value={linkedTaskId || 'none'} onValueChange={(v) => setLinkedTask(v === 'none' ? null : v)}>
          <SelectTrigger className="w-[280px]">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <SelectValue placeholder="Link to a task..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No linked task</SelectItem>
            {activeTasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{sessionsCompleted}</p>
          <p className="text-sm text-muted-foreground">Sessions Completed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{todayFocusMinutes}</p>
          <p className="text-sm text-muted-foreground">Focus Minutes Today</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{todaySessions.filter((s) => s.mode === 'focus').length}</p>
          <p className="text-sm text-muted-foreground">Sessions Today</p>
        </Card>
      </div>

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
          <div className="space-y-4 py-4">
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
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={autoBreaks} onChange={(e) => setAutoBreaks(e.target.checked)} className="rounded" />
                Auto-start breaks
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={autoFocus} onChange={(e) => setAutoFocus(e.target.checked)} className="rounded" />
                Auto-start focus sessions
              </label>
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
