import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '@/lib/storage'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import { useAuthStore } from './authStore'

export interface CoffeeEntry {
  id: string
  userId: string
  type: string
  caffeineMg: number
  mood: string
  timestamp: string
}

interface CoffeeState {
  logs: CoffeeEntry[]
  isLoading: boolean
  error: string | null

  fetchLogs: () => Promise<void>
  addLog: (entry: Omit<CoffeeEntry, 'id' | 'timestamp' | 'userId'>) => Promise<void>
  deleteLog: (id: string) => Promise<void>
  
  // Helpers
  getCupsToday: () => number
  getCurrentCaffeineLevel: () => number // 0-100 based on decay
}

export const useCoffeeStore = create<CoffeeState>()(
  persist(
    (set, get) => ({
      logs: [],
      isLoading: false,
      error: null,

      fetchLogs: async () => {
        const userId = useAuthStore.getState().user?.id
        if (!userId) return
        set({ isLoading: true, error: null })
        try {
          const raw = await apiGet<CoffeeEntry[]>(`/coffee?userId=${userId}`)
          set({ logs: Array.isArray(raw) ? raw : [], isLoading: false })
        } catch {
          set({ error: 'Failed to fetch coffee logs', isLoading: false })
        }
      },

      addLog: async (data) => {
        const userId = useAuthStore.getState().user?.id
        if (!userId) return
        
        const newEntry = {
          ...data,
          userId,
          timestamp: new Date().toISOString(),
        }

        try {
          const saved = await apiPost<CoffeeEntry>('/coffee', newEntry)
          set((s) => ({ logs: [...s.logs, saved] }))
          
          // Surprize! Confetti for coffee logging
          import('canvas-confetti').then((confetti) => {
            confetti.default({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.7 },
              colors: ['#f97316', '#fb923c', '#fdba74'], // Coffee colors
            });
          });
          
          // Also update the legacy counter in authStore for compatibility
          const authStore = useAuthStore.getState()
          if (authStore.user) {
             authStore.updateUser({ 
               coffeeCups: (authStore.user.coffeeCups || 0) + 1 
             })
          }
          
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20)
          }
        } catch (err: unknown) {
          console.error('Failed to log coffee:', err)
        }
      },

      deleteLog: async (id) => {
        try {
          await apiDelete(`/coffee/${id}`)
          set((s) => ({ logs: s.logs.filter((l) => l.id !== id) }))
        } catch (err: unknown) {
          console.error('Failed to delete log:', err)
        }
      },

      getCupsToday: () => {
        const today = new Date().toDateString()
        return get().logs.filter(
          (l) => new Date(l.timestamp).toDateString() === today
        ).length
      },

      getCurrentCaffeineLevel: () => {
        if (get().logs.length === 0) return 0
        const sortedLogs = [...get().logs].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        const lastLog = sortedLogs[0]
        const lastTime = new Date(lastLog.timestamp).getTime()
        const now = Date.now()
        const diffMinutes = (now - lastTime) / (1000 * 60)
        
        // Decay calculation (5-hour half-life)
        const decayMinutes = 300 
        const level = Math.max(0, 100 - (diffMinutes / decayMinutes) * 100)
        return Math.round(level)
      },
    }),
    {
      name: 'obel-coffee',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({ logs: state.logs }),
    }
  )
)
