import { useEffect } from 'react'
import { useTaskStore } from '@/stores/taskStore'

export default function PWAUpdater() {
  const tasks = useTaskStore((state) => state.tasks)
  
  useEffect(() => {
    const updateBadge = async () => {
      if ('setAppBadge' in navigator) {
        const today = new Date().toISOString().split('T')[0]
        const count = tasks.filter(t => t.dueDate?.startsWith(today) && t.status !== 'done').length
        
        try {
          if (count > 0) {
            await (navigator as any).setAppBadge(count)
          } else {
            await (navigator as any).clearAppBadge()
          }
        } catch (error) {
          console.error('Failed to update app badge:', error)
        }
      }
    }

    updateBadge()
  }, [tasks])

  return null
}
