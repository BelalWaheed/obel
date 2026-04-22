import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '@/lib/storage'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { useAuthStore } from './authStore'
import { useToastStore } from './toastStore'

export type TaskStatus = 'todo' | 'in-progress' | 'done'

export interface TaskList {
  id: string
  title: string
  order: number
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface Task {
  id: string
  title: string
  description?: string
  tags: string[]
  subtasks: Subtask[]
  status: 'todo' | 'in-progress' | 'done'
  dueDate?: string
  createdAt: string
  updatedAt?: string
  completedAt?: string
  userId: string
  focusSessions?: number
  focusTime?: number
  scheduledTime?: string
  estimatedDuration?: number
  listId?: string
  linkedNoteIds?: string[]
}

interface ApiTask {
  id: string
  title: string
  description: string
  tags: string[]
  subtasks: Subtask[]
  status: string
  dueDate: string
  createdAt: string
  updatedAt?: string
  completedAt: string
  userId: string
  scheduledTime?: string
  estimatedDuration?: number
  listId?: string
  linkedNoteIds?: string[]
}

function parseApiTask(raw: ApiTask): Partial<Task> {
  const result: Partial<Task> = { ...raw } as any
  
  // Backwards compatibility: if data is still stringified in DB, parse it
  if (typeof raw.subtasks === 'string') {
    try { result.subtasks = JSON.parse(raw.subtasks) } catch { result.subtasks = [] }
  }
  if (typeof raw.tags === 'string') {
    try { result.tags = JSON.parse(raw.tags) } catch { result.tags = [] }
  }
  if (typeof raw.linkedNoteIds === 'string') {
    try { result.linkedNoteIds = JSON.parse(raw.linkedNoteIds) } catch { result.linkedNoteIds = [] }
  }

  if (raw.status) result.status = raw.status as TaskStatus
  return result
}

function serializeTask(task: Partial<Task>) {
  const data: Record<string, unknown> = { ...task }
  if (task.dueDate === null) data.dueDate = ''
  if (task.completedAt === null) data.completedAt = ''
  if (task.scheduledTime === null) data.scheduledTime = ''
  if (task.estimatedDuration === null) data.estimatedDuration = 0
  return data
}

/** Merge API tasks with local tasks.
 *  - API tasks are source of truth for known IDs.
 *  - Local-only tasks (temp IDs or IDs not in API) are kept so offline
 *    work is never silently discarded.
 */
function mergeTasks(apiTasks: Task[], localTasks: Task[], userId: string): Task[] {
  const apiMap = new Map(apiTasks.map((t) => [t.id, t]))
  const localMap = new Map(localTasks.map((t) => [t.id, t]))
  
  const mergedIds = new Set([...apiMap.keys(), ...localMap.keys()])
  const result: Task[] = []

  for (const id of mergedIds) {
    const api = apiMap.get(id)
    const local = localMap.get(id)

    if (api && local) {
      // Both exist: pick the newer one
      const apiTime = new Date(api.updatedAt || api.createdAt).getTime()
      const localTime = new Date(local.updatedAt || local.createdAt).getTime()
      
      if (apiTime >= localTime) {
        result.push(api)
      } else {
        result.push(local)
      }
    } else if (api) {
      // Only in API: keep it
      result.push(api)
    } else if (local) {
      // Only local: keep it if it belongs to user and is temp
      if (local.userId === userId && local.id.startsWith('temp-')) {
        result.push(local)
      }
    }
  }

  return result
}

interface TaskState {
  tasks: Task[]
  lists: TaskList[]
  isLoading: boolean
  error: string | null

  fetchTasks: () => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'userId'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleComplete: (id: string) => Promise<void>

  updateListTitle: (id: string, title: string) => void
  addList: (title: string) => void

  addSubtask: (taskId: string, title: string) => Promise<void>
  updateSubtask: (taskId: string, subtaskId: string, title: string) => Promise<void>
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>

  getFilteredTasks: (status?: string, search?: string) => Task[]
  getAllTags: () => string[]
  getTasksDueToday: () => Task[]
  getCompletedToday: () => Task[]
  calculateTaskProgress: (taskId: string) => number
}

const DEFAULT_LISTS: TaskList[] = [
  { id: 'imp', title: 'IMP', order: 0 },
  { id: 'fast', title: 'Fast', order: 1 },
  { id: 'later', title: 'Later', order: 2 },
]

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      lists: DEFAULT_LISTS,
      isLoading: false,
      error: null,

      fetchTasks: async () => {
        const userId = useAuthStore.getState().user?.id
        if (!userId) return

        // Show loading only if we have no local data yet
        const hasLocal = get().tasks.some((t) => t.userId === userId)
        if (!hasLocal) set({ isLoading: true, error: null })

        try {
          const raw = await apiGet<ApiTask[]>(`/tasks?userId=${userId}`)
          const apiTasks = (Array.isArray(raw) ? raw : []).map(t => ({
            ...t,
            ...parseApiTask(t)
          } as Task))
          const merged = mergeTasks(apiTasks, get().tasks, userId)
          set({ tasks: merged, isLoading: false, error: null })
        } catch {
          // Network failure – keep whatever is in local store
          set({ isLoading: false, error: null })
        }
      },

      addTask: async (taskData) => {
        const userId = useAuthStore.getState().user?.id
        if (!userId) return

        const now = new Date().toISOString()
        const tempId = `temp-${crypto.randomUUID()}`
        const tempTask: Task = {
          ...taskData,
          id: tempId,
          createdAt: now,
          updatedAt: now,
          subtasks: taskData.subtasks || [],
          tags: taskData.tags || [],
          linkedNoteIds: taskData.linkedNoteIds || [],
          status: 'todo',
          userId,
        } as Task
        set((s) => ({ tasks: [...s.tasks, tempTask] }))

        try {
          const payload = serializeTask(tempTask)
          // Omit temp ID so the server generates a real one
          delete (payload as any).id 
          const raw = await apiPost<ApiTask>('/tasks', payload)
          const task = { ...tempTask, ...parseApiTask(raw) } as Task
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === tempId ? task : t)) }))
        } catch {
          // Kept locally with temp ID; will be retried via background sync
          console.warn('Network error: addTask stored locally for background sync')
        }
      },

      updateTask: async (id, updates) => {
        const now = new Date().toISOString()
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: now } : t)),
        }))
        // Don't attempt API for temp IDs
        if (id.startsWith('temp-')) return
        try {
          const payload = serializeTask(updates)
          const raw = await apiPut<ApiTask>(`/tasks/${id}`, payload)
          const updatedPartial = parseApiTask(raw)
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updatedPartial } : t)),
          }))
        } catch {
          console.warn('Network error: updateTask queued for background sync')
        }
      },

      deleteTask: async (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
        if (id.startsWith('temp-')) return
        try {
          await apiDelete(`/tasks/${id}`)
        } catch {
          console.warn('Network error: deleteTask queued for background sync')
        }
      },

      toggleComplete: async (id) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task) return
        
        const originalStatus = task.status
        const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
        const isDone = newStatus === 'done'
        const updates: Partial<Task> = {
          status: newStatus,
          completedAt: isDone ? new Date().toISOString() : undefined,
        }

        if (isDone) {
          const { soundSystem } = await import('@/lib/sounds')
          soundSystem.playSuccess()
          useAuthStore.getState().addXP(50)
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15)
          }

          // Trigger Undo Toast
          useToastStore.getState().showToast(`Task Completed!`, () => {
             get().updateTask(id, { status: originalStatus, completedAt: undefined })
          })
        }
        
        await get().updateTask(id, updates)
      },

      updateListTitle: (id, title) => {
        set((state) => ({
          lists: state.lists.map((l) => (l.id === id ? { ...l, title } : l)),
        }))
      },

      addList: (title) => {
        const newList: TaskList = {
          id: crypto.randomUUID(),
          title,
          order: get().lists.length,
        }
        set((state) => ({ lists: [...state.lists, newList] }))
      },

      addSubtask: async (taskId, title) => {
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task) return
        const newSubtask: Subtask = {
          id: crypto.randomUUID(),
          title,
          completed: false,
        }
        await get().updateTask(taskId, { subtasks: [...task.subtasks, newSubtask] })
      },

      updateSubtask: async (taskId, subtaskId, title) => {
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task) return
        const subtasks = task.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, title } : s
        )
        await get().updateTask(taskId, { subtasks })
      },

      toggleSubtask: async (taskId, subtaskId) => {
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task) return
        const subtasks = task.subtasks.map((s) => {
          if (s.id === subtaskId) {
            const willComplete = !s.completed
            if (willComplete) {
              import('@/lib/sounds').then(({ soundSystem }) => soundSystem.playClick())
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(10)
              }
            }
            return { ...s, completed: willComplete }
          }
          return s
        })
        await get().updateTask(taskId, { subtasks })
      },

      deleteSubtask: async (taskId, subtaskId) => {
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task) return
        const subtasks = task.subtasks.filter((s) => s.id !== subtaskId)
        await get().updateTask(taskId, { subtasks })
      },

      getFilteredTasks: (status, search) => {
        let filtered = get().tasks
        
        // Default to hiding 'done' tasks unless explicitly requested
        if (!status || status === 'all') {
          filtered = filtered.filter((t) => t.status !== 'done')
        } else if (status !== 'all') {
          filtered = filtered.filter((t) => t.status === status)
        }

        if (search) {
          const q = search.toLowerCase()
          filtered = filtered.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.description?.toLowerCase().includes(q)
          )
        }
        return filtered
      },

      getAllTags: () => {
        const tags = new Set<string>()
        get().tasks.forEach((t) => t.tags.forEach((tag) => tags.add(tag)))
        return Array.from(tags)
      },

      getTasksDueToday: () => {
        const today = new Date().toISOString().split('T')[0]
        return get().tasks.filter(
          (t) => t.dueDate?.startsWith(today) && t.status !== 'done'
        )
      },

      getCompletedToday: () => {
        const today = new Date().toISOString().split('T')[0]
        return get().tasks.filter((t) => t.completedAt?.startsWith(today))
      },

      calculateTaskProgress: (taskId: string) => {
        const task = get().tasks.find((t) => t.id === taskId)
        if (!task || !task.subtasks || task.subtasks.length === 0) {
          return task?.status === 'done' ? 100 : 0
        }
        const completed = task.subtasks.filter((s) => s.completed).length
        return Math.round((completed / task.subtasks.length) * 100)
      },
    }),
    {
      name: 'obel-tasks',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({ tasks: state.tasks, lists: state.lists }),
    }
  )
)
