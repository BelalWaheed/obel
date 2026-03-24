import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from './authStore'
import { useTaskStore } from './taskStore'

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak'

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
        set({
          mode,
          timeRemaining:
            mode === 'focus'
              ? settings.focusDuration * 60
              : mode === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : settings.longBreakDuration * 60,
          isRunning: false,
        })
      },

      start: (taskId) => {
        if (get().isRunning) return

        set({ isRunning: true, activeTaskId: taskId !== undefined ? taskId : get().activeTaskId })

        // Create a global interval if one doesn't exist
        if (!globalTimerInterval) {
          startGlobalTick()
        }
      },

      pause: () => {
        set({ isRunning: false })
      },

      reset: () => {
        set((state) => ({
          isRunning: false,
          timeRemaining:
            state.mode === 'focus'
              ? state.settings.focusDuration * 60
              : state.mode === 'shortBreak'
              ? state.settings.shortBreakDuration * 60
              : state.settings.longBreakDuration * 60,
          activeTaskId: null,
        }))
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
          activeTaskId: null, // Clear active task on skip
        })
      },

      tick: () => {
        const { timeRemaining, mode, settings, sessionsCompleted, activeTaskId } = get()
        if (timeRemaining <= 0) {
          // Natural completion
          stopGlobalTick()

          const duration =
            mode === 'focus'
              ? settings.focusDuration * 60
              : mode === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : settings.longBreakDuration * 60

          // If a focus session completed, update the task
          if (mode === 'focus' && activeTaskId) {
            useTaskStore.getState().updateTask(activeTaskId, {
              // Need to get the latest task state first
              focusSessions: (useTaskStore.getState().tasks.find((t) => t.id === activeTaskId)?.focusSessions || 0) + 1,
              focusTime: (useTaskStore.getState().tasks.find((t) => t.id === activeTaskId)?.focusTime || 0) + duration,
            })
          }

          const newHistoryItem: SessionHistory = {
            mode,
            duration,
            completedAt: new Date().toISOString(),
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
            sessionHistory: [...get().sessionHistory, newHistoryItem],
            activeTaskId: nextMode === 'focus' ? activeTaskId : null, // Clear active task if not starting a new focus session
          })

          // Save to API after session complete
          get().saveToUser()

          // XP Gain: 2 XP per minute of focus
          if (mode === 'focus') {
            const mins = duration / 60
            const xp = Math.round(mins * 2)
            import('@/stores/authStore').then(({ useAuthStore }) => useAuthStore.getState().addXP(xp))
          }

          // Sound and Notification triggers
          if (settings.soundEnabled) {
            import('@/lib/sounds').then(({ soundSystem }) => soundSystem.playChime())
          }
          if (settings.notificationsEnabled) {
            import('@/lib/notifications').then(({ notificationSystem }) => {
              const title = nextMode === 'focus' ? 'Break Over!' : 'Focus Session Complete!'
              const body = nextMode === 'focus' ? 'Time to get back to work.' : 'Great job! Take a well-deserved break.'
              notificationSystem.send(title, { body })
            })
          }

          if (shouldAutoStart) {
            startGlobalTick()
          } else {
            stopGlobalTick()
          }
          return
        }

        set({ timeRemaining: timeRemaining - 1 })
      },

      updateSettings: async (newSettings) => {
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
        await get().saveToUser()
      },

      setActiveTaskId: (taskId) => set({ activeTaskId: taskId }),

      // Load settings & session history from the user's API record
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

      // Persist settings + sessions to the user's API record
      saveToUser: async () => {
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

        await useAuthStore.getState().updateUser({
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
        activeTaskId: state.activeTaskId,
      }),
    }
  )
)

// Auto-start global tick if the store loads with isRunning true
if (useTimerStore.getState().isRunning) {
  startGlobalTick()
}
