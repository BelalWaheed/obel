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
  duration: number // seconds
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
  completeSession: (manualDuration?: number, taskId?: string) => void
  loadFromUser: () => Promise<void>
  saveToUser: () => Promise<void>
  resumeTick: () => void
  _hasHydrated: boolean
  setHasHydrated: (val: boolean) => void
}

// ── SW TIMER BRIDGE ──────────────────────────────────────────────────────────
// Posts messages to the service worker to drive the timer from the SW context,
// which survives tab throttling and backgrounding on mobile.

async function sendToSW(message: Record<string, unknown>) {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    if (reg.active) reg.active.postMessage(message)
  } catch {
    // SW not yet active — fall back to main-thread interval (see below)
  }
}

function startSWTimer(expectedEndTime: number) {
  sendToSW({ type: 'START_SW_TIMER', expectedEndTime })
}

function stopSWTimer() {
  sendToSW({ type: 'STOP_SW_TIMER' })
}

// ── MAIN-THREAD FALLBACK INTERVAL ────────────────────────────────────────────
// Used only when the SW is unavailable (first load / dev mode).
let fallbackInterval: ReturnType<typeof setInterval> | null = null

function startFallbackTick() {
  if (fallbackInterval) return
  fallbackInterval = setInterval(() => {
    const state = useTimerStore.getState()
    if (state.isRunning && document.visibilityState === 'visible') {
      state.tick()
    }
  }, 1000)
}

function stopFallbackTick() {
  if (fallbackInterval) {
    clearInterval(fallbackInterval)
    fallbackInterval = null
  }
}

// ── SW MESSAGE LISTENER ───────────────────────────────────────────────────────
// Set up once at module level so it persists across store updates.
let swListenerAttached = false

function attachSWListener() {
  if (swListenerAttached || !('serviceWorker' in navigator)) return
  swListenerAttached = true

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      type: string
      remaining?: number
      expectedEndTime?: number
    }

    if (data?.type === 'SW_TIMER_TICK') {
      const state = useTimerStore.getState()
      if (!state.isRunning) return
      const remaining = data.remaining ?? 0
      useTimerStore.setState({ timeRemaining: remaining })
      if (remaining === 0) {
        state.tick() // will trigger completeSession
      }
    }

    if (data?.type === 'SW_TIMER_EXPIRED') {
      const state = useTimerStore.getState()
      if (state.isRunning) {
        useTimerStore.setState({ timeRemaining: 0 })
        state.tick()
      }
    }
  })
}

// Attach listener immediately (safe to call before SW is ready)
if (typeof window !== 'undefined') {
  attachSWListener()
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getDurationForMode(mode: TimerMode, settings: PomodoroSettings): number {
  switch (mode) {
    case 'focus':       return settings.focusDuration * 60
    case 'shortBreak':  return settings.shortBreakDuration * 60
    case 'longBreak':   return settings.longBreakDuration * 60
    case 'coffeeBreak': return 5 * 60
  }
}

// ── STORE ─────────────────────────────────────────────────────────────────────
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

      // ── setMode ─────────────────────────────────────────────────────────────
      setMode: (mode) => {
        const { settings } = get()
        stopSWTimer()
        stopFallbackTick()
        const userId = useAuthStore.getState().user?.id
        notificationSystem.cancelScheduled('obel-timer', userId)
        set({
          mode,
          timeRemaining: getDurationForMode(mode, settings),
          expectedEndTime: null,
          isRunning: false,
        })
      },

      // ── start ────────────────────────────────────────────────────────────────
      start: (taskId) => {
        if (get().isRunning) return
        const endTime = Date.now() + get().timeRemaining * 1000
        const userId = useAuthStore.getState().user?.id

        set({
          isRunning: true,
          expectedEndTime: endTime,
          activeTaskId: taskId !== undefined ? taskId : get().activeTaskId,
        })

        // Drive from SW (survives background throttling)
        startSWTimer(endTime)
        // Fallback for when SW isn't available yet
        startFallbackTick()
        wakeLockSystem.request()

        const { mode, settings } = get()
        if (settings.notificationsEnabled) {
          const modeNames: Record<TimerMode, string> = {
            focus: 'Focus', shortBreak: 'Short Break',
            longBreak: 'Long Break', coffeeBreak: 'Coffee Break',
          }
          notificationSystem.schedule(
            `${modeNames[mode]} session finished!`,
            endTime,
            'obel-timer',
            userId,
            { body: 'Time to switch modes.' }
          )
        }
      },

      // ── pause ────────────────────────────────────────────────────────────────
      pause: () => {
        stopSWTimer()
        stopFallbackTick()
        const userId = useAuthStore.getState().user?.id
        notificationSystem.cancelScheduled('obel-timer', userId)
        wakeLockSystem.release()
        set({ isRunning: false, expectedEndTime: null })
      },

      // ── reset ────────────────────────────────────────────────────────────────
      reset: () => {
        stopSWTimer()
        stopFallbackTick()
        const { mode, settings } = get()
        const userId = useAuthStore.getState().user?.id
        notificationSystem.cancelScheduled('obel-timer', userId)
        wakeLockSystem.release()
        set({
          isRunning: false,
          expectedEndTime: null,
          timeRemaining: getDurationForMode(mode, settings),
          activeTaskId: null,
        })
      },

      // ── skip ─────────────────────────────────────────────────────────────────
      skip: () => {
        stopSWTimer()
        stopFallbackTick()
        const { mode, settings, sessionsCompleted } = get()
        const userId = useAuthStore.getState().user?.id
        notificationSystem.cancelScheduled('obel-timer', userId)
        wakeLockSystem.release()

        let nextMode: TimerMode
        if (mode === 'focus') {
          const nextSession = sessionsCompleted + 1
          nextMode = nextSession % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak'
        } else {
          nextMode = 'focus'
        }

        set({
          mode: nextMode,
          timeRemaining: getDurationForMode(nextMode, settings),
          expectedEndTime: null,
          isRunning: false,
          activeTaskId: null,
        })
      },

      // ── tick ─────────────────────────────────────────────────────────────────
      // Called by both the SW message handler and the fallback interval.
      tick: () => {
        const { expectedEndTime, isRunning } = get()
        if (!isRunning || !expectedEndTime) return

        const remaining = Math.max(0, Math.ceil((expectedEndTime - Date.now()) / 1000))
        set({ timeRemaining: remaining })
        if (remaining > 0) return

        get().completeSession()
      },

      // ── completeSession ───────────────────────────────────────────────────────
      completeSession: (manualDuration, taskId) => {
        const {
          mode, settings, sessionsCompleted, activeTaskId,
          timeRemaining, isRunning,
        } = get()

        const targetTaskId = taskId ?? activeTaskId

        if (isRunning && (!taskId || taskId === activeTaskId)) {
          stopSWTimer()
          stopFallbackTick()
          const userId = useAuthStore.getState().user?.id
          notificationSystem.cancelScheduled('obel-timer', userId)
        }

        const finalDuration =
          manualDuration ??
          (isRunning && (!taskId || taskId === activeTaskId)
            ? getDurationForMode(mode, settings) - timeRemaining
            : getDurationForMode(mode, settings))

        // Credit focus time to active task
        if (mode === 'focus' && targetTaskId) {
          const task = useTaskStore.getState().tasks.find((t) => t.id === targetTaskId)
          useTaskStore.getState().updateTask(targetTaskId, {
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
          nextMode = newSessionsCompleted % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak'
        } else if (mode === 'coffeeBreak') {
          nextMode = 'focus'
          useCoffeeStore.getState().addLog({ type: 'Coffee Break', caffeineMg: 80, mood: 'Relaxed' })
        } else {
          nextMode = 'focus'
        }

        const shouldAutoStart =
          (nextMode === 'focus' && settings.autoStartFocus) ||
          ((nextMode === 'shortBreak' || nextMode === 'longBreak') && settings.autoStartBreaks)

        const nextDuration = getDurationForMode(nextMode, settings)
        const nextEndTime = shouldAutoStart ? Date.now() + nextDuration * 1000 : null

        set({
          mode: nextMode,
          timeRemaining: nextDuration,
          isRunning: shouldAutoStart,
          expectedEndTime: nextEndTime,
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
          notificationSystem.send(
            nextMode === 'focus' ? 'Break Over!' : 'Session Complete! 🍅',
            { body: 'Time to switch modes.' }
          )

          if (shouldAutoStart && nextEndTime) {
            const modeNames: Record<TimerMode, string> = {
              focus: 'Focus', shortBreak: 'Short Break',
              longBreak: 'Long Break', coffeeBreak: 'Coffee Break',
            }
            notificationSystem.schedule(
              `${modeNames[nextMode]} session finished!`,
              nextEndTime,
              'obel-timer',
              userId,
              { body: 'Next session starting...' }
            )
          }
        }

        if (shouldAutoStart && nextEndTime) {
          startSWTimer(nextEndTime)
          startFallbackTick()
          wakeLockSystem.request()
        } else {
          wakeLockSystem.release()
        }
      },

      // ── updateSettings ────────────────────────────────────────────────────────
      updateSettings: async (newSettings) => {
        const { settings, mode, isRunning } = get()
        const merged = { ...settings, ...newSettings }
        const updates: Partial<TimerState> = { settings: merged }
        if (!isRunning) updates.timeRemaining = getDurationForMode(mode, merged)
        set(updates)
        await get().saveToUser()
      },

      setActiveTaskId: (taskId) => set({ activeTaskId: taskId }),

      // ── loadFromUser ──────────────────────────────────────────────────────────
      loadFromUser: async () => {
        const user = useAuthStore.getState().user
        if (!user) return
        try {
          const settings = JSON.parse(user.pomodoroSettings || '{}') as Partial<PomodoroSettings>
          const history = JSON.parse(user.sessionHistory || '[]') as SessionHistory[]
          const merged: PomodoroSettings = {
            focusDuration:       settings.focusDuration       ?? 25,
            shortBreakDuration:  settings.shortBreakDuration  ?? 5,
            longBreakDuration:   settings.longBreakDuration   ?? 15,
            longBreakInterval:   settings.longBreakInterval   ?? 4,
            autoStartBreaks:     settings.autoStartBreaks     ?? false,
            autoStartFocus:      settings.autoStartFocus      ?? false,
            soundEnabled:        settings.soundEnabled         ?? true,
            notificationsEnabled: settings.notificationsEnabled ?? true,
          }
          set({ settings: merged, sessionHistory: history })
          if (!get().isRunning) {
            set({ timeRemaining: getDurationForMode(get().mode, merged) })
          }
        } catch {
          // use defaults
        }
      },

      // ── saveToUser ────────────────────────────────────────────────────────────
      saveToUser: async () => {
        const { settings, sessionHistory } = get()
        const user = useAuthStore.getState().user
        if (!user) return
        const totalFocusSeconds = sessionHistory
          .filter((s) => s.mode === 'focus')
          .reduce((acc, s) => acc + s.duration, 0)
        await useAuthStore.getState().updateUser({
          pomodoroSettings: JSON.stringify(settings),
          sessionHistory: JSON.stringify(sessionHistory.slice(-100)),
          totalFocusHours: (totalFocusSeconds / 3600).toFixed(1),
        })
      },

      // ── resumeTick ────────────────────────────────────────────────────────────
      // Called on visibilitychange and on first hydration.
      // Syncs wall-clock time and re-attaches SW timer.
      resumeTick: () => {
        const { isRunning, expectedEndTime, mode, settings } = get()

        if (!isRunning || !expectedEndTime) {
          stopSWTimer()
          stopFallbackTick()
          return
        }

        const now = Date.now()

        if (now >= expectedEndTime) {
          // Timer expired while tab was hidden — complete immediately
          set({ timeRemaining: 0 })
          setTimeout(() => get().tick(), 100)
        } else {
          // Still running — re-sync remaining from wall clock
          const remaining = Math.ceil((expectedEndTime - now) / 1000)
          set({ timeRemaining: remaining, isRunning: true })

          // Re-start SW timer and fallback
          startSWTimer(expectedEndTime)
          startFallbackTick()
          wakeLockSystem.request()

          // Re-schedule push notification
          if (settings.notificationsEnabled) {
            const userId = useAuthStore.getState().user?.id
            const modeNames: Record<TimerMode, string> = {
              focus: 'Focus', shortBreak: 'Short Break',
              longBreak: 'Long Break', coffeeBreak: 'Coffee Break',
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
        settings:          state.settings,
        sessionsCompleted: state.sessionsCompleted,
        sessionHistory:    state.sessionHistory,
        mode:              state.mode,
        activeTaskId:      state.activeTaskId,
        expectedEndTime:   state.expectedEndTime,
        isRunning:         state.isRunning,
      }),
    }
  )
)