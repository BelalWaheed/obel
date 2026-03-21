import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from './authStore'

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak'

export interface TimerSettings {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  longBreakInterval: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
}

export interface PomodoroSession {
  id: string
  mode: TimerMode
  duration: number // seconds
  completedAt: string
  linkedTaskId: string | null
}

interface TimerState {
  // Timer state
  timeRemaining: number
  isRunning: boolean
  mode: TimerMode
  sessionsCompleted: number

  // Settings
  settings: TimerSettings

  // Session history
  sessionHistory: PomodoroSession[]
  linkedTaskId: string | null

  // Actions
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  tick: () => void
  updateSettings: (s: Partial<TimerSettings>) => void
  setLinkedTask: (id: string | null) => void
  loadFromUser: () => void
  saveToUser: () => void
}

// Global interval so timer runs even when not on Pomodoro page
let globalInterval: ReturnType<typeof setInterval> | null = null

function startGlobalTick() {
  if (globalInterval) return
  globalInterval = setInterval(() => {
    const state = useTimerStore.getState()
    if (state.isRunning) {
      state.tick()
    }
  }, 1000)
}

function stopGlobalTick() {
  if (globalInterval) {
    clearInterval(globalInterval)
    globalInterval = null
  }
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      timeRemaining: 25 * 60,
      isRunning: false,
      mode: 'focus',
      sessionsCompleted: 0,
      settings: {
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartFocus: false,
      },
      sessionHistory: [],
      linkedTaskId: null,

      start: () => {
        set({ isRunning: true })
        startGlobalTick()
      },

      pause: () => {
        set({ isRunning: false })
      },

      reset: () => {
        const { mode, settings } = get()
        set({
          timeRemaining:
            mode === 'focus'
              ? settings.focusDuration * 60
              : mode === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : settings.longBreakDuration * 60,
          isRunning: false,
        })
      },

      skip: () => {
        const { mode, settings, sessionsCompleted } = get()
        let nextMode: TimerMode
        if (mode === 'focus') {
          const nextSession = sessionsCompleted + 1
          nextMode = nextSession % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak'
        } else {
          nextMode = 'focus'
        }
        set({
          mode: nextMode,
          timeRemaining:
            nextMode === 'focus'
              ? settings.focusDuration * 60
              : nextMode === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : settings.longBreakDuration * 60,
          isRunning: false,
        })
      },

      tick: () => {
        const { timeRemaining, mode, settings, sessionsCompleted, linkedTaskId } = get()
        if (timeRemaining <= 0) {
          // Session complete
          const totalDuration =
            mode === 'focus'
              ? settings.focusDuration * 60
              : mode === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : settings.longBreakDuration * 60

          const session: PomodoroSession = {
            id: crypto.randomUUID(),
            mode,
            duration: totalDuration,
            completedAt: new Date().toISOString(),
            linkedTaskId,
          }

          let nextMode: TimerMode
          let newSessionsCompleted = sessionsCompleted

          if (mode === 'focus') {
            newSessionsCompleted = sessionsCompleted + 1
            nextMode =
              newSessionsCompleted % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak'
          } else {
            nextMode = 'focus'
          }

          const shouldAutoStart =
            (nextMode === 'focus' && settings.autoStartFocus) ||
            (nextMode !== 'focus' && settings.autoStartBreaks)

          set({
            mode: nextMode,
            timeRemaining:
              nextMode === 'focus'
                ? settings.focusDuration * 60
                : nextMode === 'shortBreak'
                ? settings.shortBreakDuration * 60
                : settings.longBreakDuration * 60,
            isRunning: shouldAutoStart,
            sessionsCompleted: newSessionsCompleted,
            sessionHistory: [...get().sessionHistory, session],
          })

          // Save to API after session complete
          get().saveToUser()

          if (!shouldAutoStart) {
            stopGlobalTick()
          }
          return
        }

        set({ timeRemaining: timeRemaining - 1 })
      },

      updateSettings: (newSettings) => {
        const { settings, mode, isRunning } = get()
        const merged = { ...settings, ...newSettings }
        const updates: Partial<TimerState> = { settings: merged }

        // If timer is not running, update the display
        if (!isRunning) {
          updates.timeRemaining =
            mode === 'focus'
              ? merged.focusDuration * 60
              : mode === 'shortBreak'
              ? merged.shortBreakDuration * 60
              : merged.longBreakDuration * 60
        }

        set(updates)
        get().saveToUser()
      },

      setLinkedTask: (id) => set({ linkedTaskId: id }),

      // Load settings & session history from the user's API record
      loadFromUser: () => {
        const user = useAuthStore.getState().user
        if (!user) return
        try {
          const settings = JSON.parse(user.pomodoroSettings || '{}') as Partial<TimerSettings>
          const history = JSON.parse(user.sessionHistory || '[]') as PomodoroSession[]

          const merged: TimerSettings = {
            focusDuration: settings.focusDuration ?? 25,
            shortBreakDuration: settings.shortBreakDuration ?? 5,
            longBreakDuration: settings.longBreakDuration ?? 15,
            longBreakInterval: settings.longBreakInterval ?? 4,
            autoStartBreaks: settings.autoStartBreaks ?? false,
            autoStartFocus: settings.autoStartFocus ?? false,
          }

          set({
            settings: merged,
            sessionHistory: history,
            timeRemaining: merged.focusDuration * 60,
          })
        } catch {
          // Use defaults
        }
      },

      // Persist settings + sessions to the user's API record
      saveToUser: () => {
        const { settings, sessionHistory } = get()
        const user = useAuthStore.getState().user
        if (!user) return

        // Calculate total focus hours
        const totalFocusSeconds = sessionHistory
          .filter((s) => s.mode === 'focus')
          .reduce((acc, s) => acc + s.duration, 0)
        const totalFocusHours = (totalFocusSeconds / 3600).toFixed(1)

        // Only keep last 100 sessions to avoid huge payload
        const recentHistory = sessionHistory.slice(-100)

        useAuthStore.getState().updateUser({
          pomodoroSettings: JSON.stringify(settings),
          sessionHistory: JSON.stringify(recentHistory),
          totalFocusHours,
        })
      },
    }),
    {
      name: 'obel-timer',
      partialize: (state) => ({
        settings: state.settings,
        sessionsCompleted: state.sessionsCompleted,
        sessionHistory: state.sessionHistory,
        timeRemaining: state.timeRemaining,
        mode: state.mode,
      }),
    }
  )
)

// Auto-start global tick if the store loads with isRunning true
if (useTimerStore.getState().isRunning) {
  startGlobalTick()
}
