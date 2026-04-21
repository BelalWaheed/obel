import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '@/lib/storage'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { useAuthStore } from './authStore'
import dayjs from 'dayjs'

export interface Habit {
  id: string
  userId: string
  name: string
  description: string
  frequency: string
  completedDates: string // JSON string array of YYYY-MM-DD
  currentStreak: number
  longestStreak: number
  createdAt: string
}

interface HabitState {
  habits: Habit[]
  isLoading: boolean
  error: string | null

  fetchHabits: () => Promise<void>
  addHabit: (
    habit: Omit<
      Habit,
      'id' | 'userId' | 'completedDates' | 'currentStreak' | 'longestStreak' | 'createdAt'
    >
  ) => Promise<void>
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  toggleHabitCompletion: (id: string, dateStr: string) => Promise<void>
}

function calculateStreaks(dates: string[]): {
  currentStreak: number
  longestStreak: number
} {
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 }

  const sorted = [...new Set(dates)].sort()
  const todayStr = dayjs().format('YYYY-MM-DD')
  const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD')

  // Longest streak
  let longestStreak = 1
  let currentRun = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = dayjs(sorted[i]).diff(dayjs(sorted[i - 1]), 'day')
    if (diff === 1) {
      currentRun++
      longestStreak = Math.max(longestStreak, currentRun)
    } else if (diff > 1) {
      currentRun = 1
    }
  }

  // Current streak (must include today or yesterday)
  const lastDate = sorted[sorted.length - 1]
  let currentStreak = 0
  if (lastDate === todayStr || lastDate === yesterdayStr) {
    currentStreak = 1
    for (let i = sorted.length - 2; i >= 0; i--) {
      const expected = dayjs(lastDate)
        .subtract(currentStreak, 'day')
        .format('YYYY-MM-DD')
      if (sorted[i] === expected) {
        currentStreak++
      } else {
        break
      }
    }
  }

  return { currentStreak, longestStreak }
}

/** Merge API habits with local habits for offline-first. */
function mergeHabits(apiHabits: Habit[], localHabits: Habit[], userId: string): Habit[] {
  const apiIds = new Set(apiHabits.map((h) => h.id))
  // Keep local habits missing from the API only if they have a temp-ID (unsynced).
  const localOnly = localHabits.filter(
    (h) => h.userId === userId && !apiIds.has(h.id) && h.id.startsWith('temp-')
  )
  return [...apiHabits, ...localOnly]
}

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => ({
      habits: [],
      isLoading: false,
      error: null,

      fetchHabits: async () => {
        const userId = useAuthStore.getState().user?.id
        if (!userId) return

        const hasLocal = get().habits.some((h) => h.userId === userId)
        if (!hasLocal) set({ isLoading: true, error: null })

        try {
          const habits = await apiGet<Habit[]>(`/habits?userId=${userId}`)
          const merged = mergeHabits(habits, get().habits, userId)
          set({ habits: merged, isLoading: false, error: null })
        } catch {
          // Network failure — keep local
          set({ isLoading: false, error: null })
        }
      },

      addHabit: async (habitData) => {
        const userId = useAuthStore.getState().user?.id
        if (!userId) return

        const tempId = `temp-${crypto.randomUUID()}`
        const newHabit: Habit = {
          ...habitData,
          id: tempId,
          userId,
          completedDates: JSON.stringify([]),
          currentStreak: 0,
          longestStreak: 0,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({ habits: [...state.habits, newHabit] }))

        try {
          const added = await apiPost<Habit>('/habits', newHabit)
          set((state) => ({
            habits: state.habits.map((h) => (h.id === tempId ? added : h)),
          }))
        } catch {
          console.warn('Network error: addHabit stored locally for background sync')
        }
      },

      updateHabit: async (id, updates) => {
        set((state) => ({
          habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        }))
        if (id.startsWith('temp-')) return
        try {
          const updated = await apiPut<Habit>(`/habits/${id}`, updates)
          set((state) => ({
            habits: state.habits.map((h) => (h.id === id ? updated : h)),
          }))
        } catch {
          console.warn('Network error: updateHabit queued for background sync')
        }
      },

      deleteHabit: async (id) => {
        set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }))
        if (id.startsWith('temp-')) return
        try {
          await apiDelete(`/habits/${id}`)
        } catch {
          console.warn('Network error: deleteHabit queued for background sync')
        }
      },

      toggleHabitCompletion: async (id, dateStr) => {
        const habit = get().habits.find((h) => h.id === id)
        if (!habit) return

        let dates: string[] = []
        try { dates = JSON.parse(habit.completedDates || '[]') } catch { dates = [] }

        const isCompleted = dates.includes(dateStr)
        const newDates = isCompleted
          ? dates.filter((d) => d !== dateStr)
          : [...dates, dateStr]

        const uniqueDates = Array.from(new Set(newDates))
        const { currentStreak, longestStreak } = calculateStreaks(uniqueDates)
        const newLongestStreak = Math.max(habit.longestStreak, longestStreak)

        const updates: Partial<Habit> = {
          completedDates: JSON.stringify(uniqueDates),
          currentStreak,
          longestStreak: newLongestStreak,
        }

        set((state) => ({
          habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        }))

        // Theme unlock check
        if (!isCompleted) {
          const { user, updateUser } = useAuthStore.getState()
          if (user) {
            const unlocked: string[] = user.unlockedThemes
              ? JSON.parse(user.unlockedThemes)
              : []
            let changed = false

            if (currentStreak >= 3 && !unlocked.includes('cyberpunk')) {
              unlocked.push('cyberpunk')
              changed = true
            }
            if (currentStreak >= 7 && !unlocked.includes('forest')) {
              unlocked.push('forest')
              changed = true
            }
            if (currentStreak >= 14 && !unlocked.includes('sunset')) {
              unlocked.push('sunset')
              changed = true
            }

            if (changed) {
              updateUser({ unlockedThemes: JSON.stringify(unlocked) })
            }
          }
        }

        await get().updateHabit(id, updates)
      },
    }),
    {
      name: 'obel-habits',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({ habits: state.habits }),
    }
  )
)
