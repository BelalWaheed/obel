import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
}

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  updateUser: (data: Partial<UserProfile>) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const users = await apiGet<UserProfile[]>(`/users?email=${encodeURIComponent(email)}`)
          const user = users.find((u) => u.email === email)

          if (!user) {
            set({ isLoading: false, error: 'No account found with this email' })
            return false
          }
          if (user.password !== password) {
            set({ isLoading: false, error: 'Incorrect password' })
            return false
          }

          set({ user, isAuthenticated: true, isLoading: false, error: null })
          return true
        } catch {
          set({ isLoading: false, error: 'Network error. Please try again.' })
          return false
        }
      },

      signup: async (name, email, password) => {
        set({ isLoading: true, error: null })
        try {
          // Check if email already exists
          const existing = await apiGet<UserProfile[]>(`/users?email=${encodeURIComponent(email)}`)
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
            createdAt: new Date().toISOString(),
          })

          set({ user, isAuthenticated: true, isLoading: false, error: null })
          return true
        } catch {
          set({ isLoading: false, error: 'Network error. Please try again.' })
          return false
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null })
      },

      updateUser: async (data) => {
        const { user } = get()
        if (!user) return
        try {
          const updated = await apiPut<UserProfile>(`/users/${user.id}`, data)
          set({ user: { ...user, ...updated } })
        } catch (err) {
          console.error('Failed to update user:', err)
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'focusflow-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
