import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from './authStore'
import { useTaskStore } from './taskStore'

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak' | 'coffeeBreak'

export interface PomodoroSettings {
  focusDuration: number
  shortBreakDuration: number
  longBreakDuration: number
  longBreakInterval: number
  autoStartBreaks: boolean
  autoStartFocus: boolean
  soundEnabled: boolean
  notificationsEnabled: boolean
}

export interface SessionHistory {
  id?: string
  mode: TimerMode
  duration: number // in seconds
  completedAt: string // ISO string
}

interface TimerState {
  // Timer state
  timeRemaining: number
  isRunning: boolean
  mode: TimerMode
  sessionsCompleted: number
  expectedEndTime: number | null // Timestamp in ms

  // Settings
  settings: PomodoroSettings

  // Session history
  sessionHistory: SessionHistory[]
  activeTaskId: string | null

  // Actions
  setMode: (mode: TimerMode) => void
  start: (taskId?: string) => void
  pause: () => void
  reset: () => void
  skip: () => void
  tick: () => void
  updateSettings: (settings: Partial<PomodoroSettings>) => Promise<void>
  setActiveTaskId: (taskId: string | null) => void
  loadFromUser: () => Promise<void>
  saveToUser: () => Promise<void>
  resumeTick: () => void
}

// Global interval so timer runs even when not on Pomodoro page
let globalTimerInterval: ReturnType<typeof setInterval> | null = null

function startGlobalTick() {
  if (globalTimerInterval) return
  globalTimerInterval = setInterval(() => {
    const state = useTimerStore.getState()
    if (state.isRunning) {
      state.tick()
    }
  }, 1000)
}

function stopGlobalTick() {
  if (globalTimerInterval) {
    clearInterval(globalTimerInterval)
    globalTimerInterval = null
  }
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      timeRemaining: 25 * 60,
      expectedEndTime: null,
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
        soundEnabled: true,
        notificationsEnabled: true,
      },
      sessionHistory: [],
      activeTaskId: null,

      setMode: (mode) => {
        const { settings } = get()
        const duration = 
            mode === 'focus'
              ? settings.focusDuration * 60
              : mode === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : mode === 'coffeeBreak'
              ? 5 * 60 // Default coffee break duration
              : settings.longBreakDuration * 60

        set({
          mode,
          timeRemaining: duration,
          expectedEndTime: null,
          isRunning: false,
        })
        stopGlobalTick()
      },

      start: (taskId) => {
        if (get().isRunning) return
        
        const now = Date.now()
        const endTime = now + (get().timeRemaining * 1000)

        set({ 
          isRunning: true, 
          expectedEndTime: endTime,
          activeTaskId: taskId !== undefined ? taskId : get().activeTaskId 
        })

        startGlobalTick()
      },

      pause: () => {
        set({ isRunning: false, expectedEndTime: null })
        stopGlobalTick()
      },

      reset: () => {
        const { mode, settings } = get()
        const duration = 
            mode === 'focus'
              ? settings.focusDuration * 60
              : mode === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : mode === 'coffeeBreak'
              ? 5 * 60 
              : settings.longBreakDuration * 60

        set({
          isRunning: false,
          expectedEndTime: null,
          timeRemaining: duration,
          activeTaskId: null,
        })
        stopGlobalTick()
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
        
        const duration = 
            nextMode === 'focus'
              ? settings.focusDuration * 60
              : nextMode === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : settings.longBreakDuration * 60

        set({
          mode: nextMode,
          timeRemaining: duration,
          expectedEndTime: null,
          isRunning: false,
          activeTaskId: null,
        })
        stopGlobalTick()
      },

      tick: () => {
        const { expectedEndTime, isRunning, mode, settings, sessionsCompleted, activeTaskId } = get()
        if (!isRunning || !expectedEndTime) return

        const now = Date.now()
        const remaining = Math.max(0, Math.ceil((expectedEndTime - now) / 1000))
        
        set({ timeRemaining: remaining })

        if (remaining <= 0) {
          // Natural completion
          stopGlobalTick()

          const duration =
            mode === 'focus'
              ? settings.focusDuration * 60
              : mode === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : mode === 'coffeeBreak'
              ? Math.round((expectedEndTime - (expectedEndTime - (get().timeRemaining * 1000))) / 1000) // This is edge casey
              : settings.longBreakDuration * 60

          const finalDuration = mode === 'coffeeBreak' ? 5 * 60 : duration // Simplification for history

          // If a focus session completed, update the task
          if (mode === 'focus' && activeTaskId) {
            useTaskStore.getState().updateTask(activeTaskId, {
              focusSessions: (useTaskStore.getState().tasks.find((t) => t.id === activeTaskId)?.focusSessions || 0) + 1,
              focusTime: (useTaskStore.getState().tasks.find((t) => t.id === activeTaskId)?.focusTime || 0) + finalDuration,
            })
          }

          const newHistoryItem: SessionHistory = {
            mode,
            duration: finalDuration,
            completedAt: new Date().toISOString(),
          }

          let nextMode: TimerMode = 'focus'
          let newSessionsCompleted = sessionsCompleted

          if (mode === 'focus') {
            newSessionsCompleted = sessionsCompleted + 1
            nextMode = newSessionsCompleted % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak'
          } else if (mode === 'coffeeBreak') {
            nextMode = 'focus'
          } else {
            nextMode = 'focus'
          }

          const shouldAutoStart =
            (nextMode === 'focus' && settings.autoStartFocus) ||
            (nextMode !== 'focus' && (nextMode as string) !== 'coffeeBreak' && settings.autoStartBreaks)

          const nextDuration = 
            nextMode === 'focus'
              ? settings.focusDuration * 60
              : nextMode === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : settings.longBreakDuration * 60

          set({
            mode: nextMode,
            timeRemaining: nextDuration,
            isRunning: shouldAutoStart,
            expectedEndTime: shouldAutoStart ? Date.now() + (nextDuration * 1000) : null,
            sessionsCompleted: newSessionsCompleted,
            sessionHistory: [...get().sessionHistory, newHistoryItem],
            activeTaskId: nextMode === 'focus' ? activeTaskId : null,
          })

          get().saveToUser()

          if (mode === 'focus') {
            const xp = Math.round((finalDuration / 60) * 2)
            useAuthStore.getState().addXP(xp)
          }

          if (settings.soundEnabled) {
            import('@/lib/sounds').then(({ soundSystem }) => soundSystem.playChime())
          }
          if (settings.notificationsEnabled) {
            import('@/lib/notifications').then(({ notificationSystem }) => {
              const title = nextMode === 'focus' ? 'Break Over!' : 'Session Complete!'
              notificationSystem.send(title, { body: 'Time to switch modes.' })
            })
          }

          if (shouldAutoStart) startGlobalTick()
        }
      },

      updateSettings: async (newSettings) => {
        const { settings, mode, isRunning } = get()
        const merged = { ...settings, ...newSettings }
        const updates: Partial<TimerState> = { settings: merged }

        if (!isRunning) {
          updates.timeRemaining =
            mode === 'focus'
              ? merged.focusDuration * 60
              : mode === 'shortBreak'
              ? merged.shortBreakDuration * 60
              : merged.longBreakDuration * 60
        }

        set(updates)
        await get().saveToUser()
      },

      setActiveTaskId: (taskId) => set({ activeTaskId: taskId }),

      loadFromUser: async () => {
        const user = useAuthStore.getState().user
        if (!user) return
        try {
          const settings = JSON.parse(user.pomodoroSettings || '{}') as Partial<PomodoroSettings>
          const history = JSON.parse(user.sessionHistory || '[]') as SessionHistory[]

          const merged: PomodoroSettings = {
            focusDuration: settings.focusDuration ?? 25,
            shortBreakDuration: settings.shortBreakDuration ?? 5,
            longBreakDuration: settings.longBreakDuration ?? 15,
            longBreakInterval: settings.longBreakInterval ?? 4,
            autoStartBreaks: settings.autoStartBreaks ?? false,
            autoStartFocus: settings.autoStartFocus ?? false,
            soundEnabled: settings.soundEnabled ?? true,
            notificationsEnabled: settings.notificationsEnabled ?? true,
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

      saveToUser: async () => {
        const { settings, sessionHistory } = get()
        const user = useAuthStore.getState().user
        if (!user) return

        const totalFocusSeconds = sessionHistory
          .filter((s) => s.mode === 'focus')
          .reduce((acc, s) => acc + s.duration, 0)
        const totalFocusHours = (totalFocusSeconds / 3600).toFixed(1)
        const recentHistory = sessionHistory.slice(-100)

        await useAuthStore.getState().updateUser({
          pomodoroSettings: JSON.stringify(settings),
          sessionHistory: JSON.stringify(recentHistory),
          totalFocusHours,
        })
      },

      resumeTick: () => {
        if (get().isRunning) {
          startGlobalTick()
        }
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
        activeTaskId: state.activeTaskId,
        expectedEndTime: state.expectedEndTime,
      }),
    }
  )
)

