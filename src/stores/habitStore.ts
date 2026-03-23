import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { useAuthStore } from './authStore'
import dayjs from 'dayjs'

export interface Habit {
  id: string
  userId: string
  name: string
  description: string
  frequency: string // 'daily'
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
  addHabit: (habit: Omit<Habit, 'id' | 'userId' | 'completedDates' | 'currentStreak' | 'longestStreak' | 'createdAt'>) => Promise<void>
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  toggleHabitCompletion: (id: string, dateStr: string) => Promise<void>
}

// Helper to calculate streaks from an array of sorted date strings (YYYY-MM-DD)
function calculateStreaks(dates: string[]): { currentStreak: number; longestStreak: number } {
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 }

  // Sort dates chronological
  const sorted = [...dates].sort()
  
  let currentStreak = 1
  let longestStreak = 1
  let currentRun = 1

  const todayStr = dayjs().format('YYYY-MM-DD')
  const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD')

  // Calculate longest streak
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = dayjs(sorted[i - 1])
    const currDate = dayjs(sorted[i])
    
    if (currDate.diff(prevDate, 'day') === 1) {
      currentRun++
      longestStreak = Math.max(longestStreak, currentRun)
    } else if (currDate.diff(prevDate, 'day') > 1) {
      currentRun = 1
    }
  }

  // Calculate current streak
  // A streak is active if the last completed date is either today or yesterday
  const lastDate = sorted[sorted.length - 1]
  if (lastDate === todayStr || lastDate === yesterdayStr) {
    currentStreak = 1
    for (let i = sorted.length - 2; i >= 0; i--) {
      const targetStr = dayjs(lastDate).subtract(currentStreak, 'day').format('YYYY-MM-DD')
      if (sorted[i] === targetStr) {
        currentStreak++
      } else {
        break
      }
    }
  } else {
    currentStreak = 0
  }

  return { currentStreak, longestStreak }
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

    set({ isLoading: true, error: null })
    try {
      const habits = await apiGet<Habit[]>(`/habits?userId=${userId}`)
      set({ habits, isLoading: false })
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch habits', isLoading: false })
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
    } as Habit

    // Optimistic UI Update
    set((state) => ({ habits: [...state.habits, newHabit] }))

    try {
      const added = await apiPost<Habit>('/habits', newHabit)
      set((state) => ({ habits: state.habits.map(h => h.id === tempId ? added : h) }))
    } catch (err: any) {
      console.warn('Network error: addHabit queued for background sync')
    }
  },

  updateHabit: async (id, updates) => {
    // Optimistic UI Update
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    }))
    try {
      const updated = await apiPut<Habit>(`/habits/${id}`, updates)
      set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? updated : h)),
      }))
    } catch (err: any) {
      console.warn('Network error: updateHabit queued for background sync')
    }
  },

  deleteHabit: async (id) => {
    // Optimistic UI Update
    set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }))
    try {
      await apiDelete(`/habits/${id}`)
    } catch (err: any) {
      console.warn('Network error: deleteHabit queued for background sync')
    }
  },

  toggleHabitCompletion: async (id, dateStr) => {
    const habit = get().habits.find((h) => h.id === id)
    if (!habit) return

    let dates: string[] = []
    try {
      dates = JSON.parse(habit.completedDates || '[]')
    } catch (e) {
      dates = []
    }

    const isCompleted = dates.includes(dateStr)
    const newDates = isCompleted
      ? dates.filter((d) => d !== dateStr)
      : [...dates, dateStr]

    // Remove duplicates just in case
    const uniqueDates = Array.from(new Set(newDates))
    
    // Recalculate streaks
    const { currentStreak, longestStreak } = calculateStreaks(uniqueDates)
    
    // Ensure longest streak never goes down from its historical peak
    const newLongestStreak = Math.max(habit.longestStreak, longestStreak)

    const updates: Partial<Habit> = {
      completedDates: JSON.stringify(uniqueDates),
      currentStreak,
      longestStreak: newLongestStreak,
    }

    // Optimistic UI update
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    }))

    // Check for theme unlocks
    if (isCompleted === false) { 
      // i.e., we just checked it IN
      const { user, updateUser } = useAuthStore.getState()
      if (user) {
        let unlocked = user.unlockedThemes ? JSON.parse(user.unlockedThemes) : []
        let newUnlocked = false

        if (currentStreak === 3 && !unlocked.includes('cyberpunk')) {
          unlocked.push('cyberpunk')
          newUnlocked = true
        }
        if (currentStreak === 7 && !unlocked.includes('forest')) {
          unlocked.push('forest')
          newUnlocked = true
        }
        if (currentStreak === 14 && !unlocked.includes('sunset')) {
          unlocked.push('sunset')
          newUnlocked = true
        }

        if (newUnlocked) {
          updateUser({ unlockedThemes: JSON.stringify(unlocked) })
          // Optionally trigger confetti here too, but handled in component
        }
      }
    }

    // API update
    await get().updateHabit(id, updates)
  },
}),
  {
    name: 'obel-habits',
    partialize: (state) => ({ habits: state.habits }),
  }
)
)
