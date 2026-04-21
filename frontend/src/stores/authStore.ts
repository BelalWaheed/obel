import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '@/lib/storage'
import { apiGet, apiPost, apiPut } from '@/lib/api'

export interface UserProfile {
  id: string
  name: string
  email: string
  password: string
  avatar: string
  pomodoroSettings: string
  sessionHistory: string
  totalFocusHours: string
  createdAt: string
  unlockedThemes?: string
  activeTheme?: string
  partnerId?: string
  coffeeCups: number
  xp: number
  level: number
  longestFocusStreak: number
  lastFocusDate?: string
  coffeeLog?: string
}

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  isOffline: boolean
  _hasHydrated: boolean

  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  updateUser: (data: Partial<UserProfile>) => Promise<void>
  addXP: (amount: number) => Promise<void>
  trackCoffee: () => Promise<void>
  clearError: () => void
  setHasHydrated: (val: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isOffline: false,
      _hasHydrated: false,

      login: async (email, password) => {
        set({ isLoading: true, error: null })

        // ── OFFLINE FALLBACK ─────────────────────────────────────────
        // If we already have a persisted user that matches these credentials,
        // allow login without a network round-trip.
        const cached = get().user
        if (cached && cached.email === email && cached.password === password) {
          set({ isAuthenticated: true, isLoading: false, error: null, isOffline: false })
          return true
        }

        try {
          const users = await apiGet<UserProfile[]>(
            `/users?email=${encodeURIComponent(email)}`
          )
          const user = users.find((u) => u.email === email)

          if (!user) {
            // One more offline check: maybe we haven't cached yet but network failed
            set({ isLoading: false, error: 'No account found with this email' })
            return false
          }
          if (user.password !== password) {
            set({ isLoading: false, error: 'Incorrect password' })
            return false
          }

          set({ user, isAuthenticated: true, isLoading: false, error: null, isOffline: false })
          return true
        } catch {
          // Network error — check persisted credentials one final time
          if (cached && cached.email === email && cached.password === password) {
            set({
              isAuthenticated: true,
              isLoading: false,
              error: null,
              isOffline: true,
            })
            return true
          }
          set({
            isLoading: false,
            error: 'Network unavailable. Please check your connection.',
          })
          return false
        }
      },

      signup: async (name, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const existing = await apiGet<UserProfile[]>(
            `/users?email=${encodeURIComponent(email)}`
          )
          if (existing.some((u) => u.email === email)) {
            set({ isLoading: false, error: 'An account with this email already exists' })
            return false
          }

          const user = await apiPost<UserProfile>('/users', {
            name,
            email,
            password,
            avatar: '',
            pomodoroSettings: JSON.stringify({
              focusDuration: 25,
              shortBreakDuration: 5,
              longBreakDuration: 15,
              longBreakInterval: 4,
              autoStartBreaks: false,
              autoStartFocus: false,
            }),
            sessionHistory: '[]',
            totalFocusHours: '0',
            xp: 0,
            level: 1,
            coffeeCups: 0,
            longestFocusStreak: 0,
            createdAt: new Date().toISOString(),
          })

          set({ user, isAuthenticated: true, isLoading: false, error: null, isOffline: false })
          return true
        } catch {
          set({ isLoading: false, error: 'Network error. Please try again.' })
          return false
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null, isOffline: false })
      },

      updateUser: async (data) => {
        const { user } = get()
        if (!user) return
        // Always optimistic-update locally first so the UI is snappy
        set({ user: { ...user, ...data } })
        try {
          await apiPut<UserProfile>(`/users/${user.id}`, { ...user, ...data })
        } catch {
          // silently keep local update — will sync when back online
        }
      },

      addXP: async (amount) => {
        const { user } = get()
        if (!user) return
        const currentXP = user.xp || 0
        const newXP = currentXP + amount
        const newLevel = Math.floor(newXP / 500) + 1
        const currentLevel = user.level || 1

        await get().updateUser({ xp: newXP, level: newLevel })

        if (newLevel > currentLevel) {
          import('canvas-confetti').then((confetti) => {
            confetti.default({
              particleCount: 200,
              spread: 100,
              origin: { y: 0.6 },
            })
          })
        }
      },

      trackCoffee: async () => {
        const { user } = get()
        if (!user) return
        const log = JSON.parse(user.coffeeLog || '[]')
        const newLog = [...log, { id: crypto.randomUUID(), timestamp: new Date().toISOString() }]
        const newCount = (user.coffeeCups || 0) + 1
        
        await get().updateUser({ 
          coffeeCups: newCount, 
          coffeeLog: JSON.stringify(newLog) 
        })
      },

      clearError: () => set({ error: null }),
      setHasHydrated: (val) => set({ _hasHydrated: val }),
    }),
    {
      name: 'obel-auth',
      storage: createJSONStorage(() => indexedDBStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
