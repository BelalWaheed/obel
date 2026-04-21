import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '@/lib/storage'

interface ThemeState {
  isDark: boolean
  setIsDark: (isDark: boolean) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true,
      setIsDark: (isDark) => {
        set({ isDark })
        if (isDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
      toggleTheme: () => {
        set((state) => {
          const next = !state.isDark
          if (next) {
            document.documentElement.classList.add('dark')
          } else {
            document.documentElement.classList.remove('dark')
          }
          return { isDark: next }
        })
      },
    }),
    {
      name: 'obel-theme-store',
      storage: createJSONStorage(() => indexedDBStorage),
    }
  )
)
