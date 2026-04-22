import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '@/lib/storage'
import { useAuthStore } from './authStore'
import { useTaskStore } from './taskStore'
import { useCoffeeStore } from './coffeeStore'
import { wakeLockSystem } from '@/lib/wakeLock'
import { notificationSystem } from '@/lib/notifications'

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
  timeRemaining: number
  isRunning: boolean
  mode: TimerMode
  sessionsCompleted: number
  expectedEndTime: number | null

  settings: PomodoroSettings
  sessionHistory: SessionHistory[]
  activeTaskId: string | null

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
  _hasHydrated: boolean
  setHasHydrated: (val: boolean) => void
}

let globalTimerInterval: ReturnType<typeof setInterval> | null = null

function startGlobalTick() {
  if (globalTimerInterval) return
  globalTimerInterval = setInterval(() => {
    const state = useTimerStore.getState()
    if (state.isRunning) {
      // Only tick if the page is visible to save CPU/Battery
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        state.tick()
      }
    }
  }, 1000) // 1s is enough for background logic, UI can interpolate if needed
}

function stopGlobalTick() {
  if (globalTimerInterval) {
    clearInterval(globalTimerInterval)
    globalTimerInterval = null
  }
}

function getDurationForMode(mode: TimerMode, settings: PomodoroSettings): number {
  switch (mode) {
    case 'focus': return settings.focusDuration * 60
    case 'shortBreak': return settings.shortBreakDuration * 60
    case 'longBreak': return settings.longBreakDuration * 60
    case 'coffeeBreak': return 5 * 60
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
        set({
          mode,
          timeRemaining: getDurationForMode(mode, settings),
          expectedEndTime: null,
          isRunning: false,
        })
        stopGlobalTick()
        const userId = useAuthStore.getState().user?.id
        notificationSystem.cancelScheduled('obel-timer', userId)
      },

      start: (taskId) => {
        if (get().isRunning) return
        const now = Date.now()
        const endTime = now + get().timeRemaining * 1000
        const userId = useAuthStore.getState().user?.id
        set({
          isRunning: true,
          expectedEndTime: endTime,
          activeTaskId: taskId !== undefined ? taskId : get().activeTaskId,
        })

        const { mode, settings } = get()
        if (settings.notificationsEnabled) {
          const modeNames: Record<TimerMode, string> = {
            focus: 'Focus',
            shortBreak: 'Short Break',
            longBreak: 'Long Break',
            coffeeBreak: 'Coffee Break',
          }
          notificationSystem.schedule(
            `${modeNames[mode]} session finished!`,
            endTime,
            'obel-timer',
            userId,
            { body: 'Time to switch modes.' }
          )
        }
        startGlobalTick()
        wakeLockSystem.request()
      },

      pause: () => {
        const userId = (useAuthStore.getState() as { user: { id: string } }).user?.id
        set({ isRunning: false, expectedEndTime: null })
        stopGlobalTick()
        notificationSystem.cancelScheduled('obel-timer', userId)
        wakeLockSystem.release()
      },

      reset: () => {
        const { mode, settings } = get()
        const userId = (useAuthStore.getState() as { user: { id: string } }).user?.id
        set({
          isRunning: false,
          expectedEndTime: null,
          timeRemaining: getDurationForMode(mode, settings),
          activeTaskId: null,
        })
        stopGlobalTick()
        notificationSystem.cancelScheduled('obel-timer', userId)
        wakeLockSystem.release()
      },

      skip: () => {
        const { mode, settings, sessionsCompleted } = get()
        const userId = (useAuthStore.getState() as { user: { id: string } }).user?.id
        let nextMode: TimerMode
        if (mode === 'focus') {
          const nextSession = sessionsCompleted + 1
          nextMode =
            nextSession % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak'
        } else {
          nextMode = 'focus'
        }
        
        notificationSystem.cancelScheduled('obel-timer', userId)
        
        set({
          mode: nextMode,
          timeRemaining: getDurationForMode(nextMode, settings),
          expectedEndTime: null,
          isRunning: false,
          activeTaskId: null,
        })
        stopGlobalTick()
        wakeLockSystem.release()
        import('@/lib/notifications').then(({ notificationSystem }) => {
          notificationSystem.cancelScheduled('obel-timer')
        })
      },

      tick: () => {
        const {
          expectedEndTime,
          isRunning,
          mode,
          settings,
          sessionsCompleted,
          activeTaskId,
        } = get()
        if (!isRunning || !expectedEndTime) return

        const now = Date.now()
        const remaining = Math.max(0, Math.ceil((expectedEndTime - now) / 1000))
        set({ timeRemaining: remaining })

        if (remaining > 0) return

        // ── Session completed ──────────────────────────────────────────
        stopGlobalTick()

        const finalDuration =
          mode === 'coffeeBreak' ? 5 * 60 : getDurationForMode(mode, settings)

        // Credit focus time to active task
        if (mode === 'focus' && activeTaskId) {
          const task = useTaskStore
            .getState()
            .tasks.find((t) => t.id === activeTaskId)
          useTaskStore.getState().updateTask(activeTaskId, {
            focusSessions: (task?.focusSessions || 0) + 1,
            focusTime: (task?.focusTime || 0) + finalDuration,
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
          nextMode =
            newSessionsCompleted % settings.longBreakInterval === 0
              ? 'longBreak'
              : 'shortBreak'
        } else if (mode === 'coffeeBreak') {
          nextMode = 'focus'
          // Use the new coffee management API
          useCoffeeStore.getState().addLog({
            type: 'Coffee Break',
            caffeineMg: 80,
            mood: 'Relaxed'
          })
        } else {
          nextMode = 'focus'
        }

        const shouldAutoStart =
          (nextMode === 'focus' && settings.autoStartFocus) ||
          (nextMode !== 'focus' &&
            (nextMode as string) !== 'coffeeBreak' &&
            settings.autoStartBreaks)

        const nextDuration = getDurationForMode(nextMode, settings)

        set({
          mode: nextMode,
          timeRemaining: nextDuration,
          isRunning: shouldAutoStart,
          expectedEndTime: shouldAutoStart ? Date.now() + nextDuration * 1000 : null,
          sessionsCompleted: newSessionsCompleted,
          sessionHistory: [...get().sessionHistory, newHistoryItem],
          activeTaskId: nextMode === 'focus' ? activeTaskId : null,
        })

        get().saveToUser()

        if (mode === 'focus') {
          useAuthStore.getState().addXP(Math.round((finalDuration / 60) * 2))
        }

        if (settings.soundEnabled) {
          import('@/lib/sounds').then(({ soundSystem }) => soundSystem.playChime())
        }
        if (settings.notificationsEnabled) {
          const userId = useAuthStore.getState().user?.id
          const title = nextMode === 'focus' ? 'Break Over!' : 'Session Complete!'
          notificationSystem.send(title, { body: 'Time to switch modes.' })
          
          if (shouldAutoStart) {
            const modeNames: Record<TimerMode, string> = {
              focus: 'Focus',
              shortBreak: 'Short Break',
              longBreak: 'Long Break',
              coffeeBreak: 'Coffee Break',
            }
            notificationSystem.schedule(
              `${modeNames[nextMode]} session finished!`,
              Date.now() + nextDuration * 1000,
              'obel-timer',
              userId,
              { body: 'Next session starting...' }
            )
          }
        }

        if (shouldAutoStart) {
          startGlobalTick()
          wakeLockSystem.request()
        } else {
          wakeLockSystem.release()
        }
      },

      updateSettings: async (newSettings) => {
        const { settings, mode, isRunning } = get()
        const merged = { ...settings, ...newSettings }
        const updates: Partial<TimerState> = { settings: merged }
        if (!isRunning) {
          updates.timeRemaining = getDurationForMode(mode, merged)
        }
        set(updates)
        await get().saveToUser()
      },

      setActiveTaskId: (taskId) => set({ activeTaskId: taskId }),

      loadFromUser: async () => {
        const user = useAuthStore.getState().user
        if (!user) return
        try {
          const settings = JSON.parse(
            user.pomodoroSettings || '{}'
          ) as Partial<PomodoroSettings>
          const history = JSON.parse(
            user.sessionHistory || '[]'
          ) as SessionHistory[]

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

          set({ settings: merged, sessionHistory: history })

          // Only reset timeRemaining if not currently running
          if (!get().isRunning) {
            set({ timeRemaining: getDurationForMode(get().mode, merged) })
          }
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
        await useAuthStore.getState().updateUser({
          pomodoroSettings: JSON.stringify(settings),
          sessionHistory: JSON.stringify(sessionHistory.slice(-100)),
          totalFocusHours,
        })
      },

      // ── CRITICAL FIX: handle timer that expired while app was closed ──
      resumeTick: () => {
        const { isRunning, expectedEndTime, mode, settings } = get()
        if (!isRunning || !expectedEndTime) {
          // If we are not running, but we have a timer interval, clear it
          if (!isRunning) stopGlobalTick()
          return
        }

        const now = Date.now()

        if (now >= expectedEndTime) {
          // Timer expired while the app was closed — force to 0 then complete
          set({ timeRemaining: 0 })
          // Small delay so persisted state settles before completion logic runs
          setTimeout(() => get().tick(), 150)
        } else {
          // Still running — sync remaining time with wall clock and resume
          const remaining = Math.ceil((expectedEndTime - now) / 1000)
          set({ timeRemaining: remaining, isRunning: true })
          startGlobalTick()

          // Re-schedule the notification with the correct remaining time
          if (settings.notificationsEnabled) {
            const userId = useAuthStore.getState().user?.id
            const modeNames: Record<TimerMode, string> = {
              focus: 'Focus',
              shortBreak: 'Short Break',
              longBreak: 'Long Break',
              coffeeBreak: 'Coffee Break',
            }
            notificationSystem.cancelScheduled('obel-timer', userId)
            notificationSystem.schedule(
              `${modeNames[mode]} session finished!`,
              expectedEndTime,
              'obel-timer',
              userId,
              { body: 'Time to switch modes.' }
            )
          }
          
          // Re-request wake lock if we are resuming an active timer
          wakeLockSystem.request()
        }
      },

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'obel-timer',
      storage: createJSONStorage(() => indexedDBStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      partialize: (state) => ({
        settings: state.settings,
        sessionsCompleted: state.sessionsCompleted,
        sessionHistory: state.sessionHistory,
        // CRITICAL: We no longer persist timeRemaining every 500ms.
        // Instead, we recalculate it from expectedEndTime on resume.
        // This saves massive amounts of Disk I/O and battery.
        mode: state.mode,
        activeTaskId: state.activeTaskId,
        expectedEndTime: state.expectedEndTime,
        isRunning: state.isRunning,
      }),
    }
  )
)
