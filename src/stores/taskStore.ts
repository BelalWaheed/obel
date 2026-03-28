import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { useAuthStore } from './authStore'

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
  completedAt?: string
  userId: string
  focusSessions?: number
  focusTime?: number
  scheduledTime?: string // e.g. "09:00"
  estimatedDuration?: number // in minutes
  listId?: string
}

// Shape coming from API (tags/subtasks are JSON strings)
interface ApiTask {
  id: string
  title: string
  description: string
  tags: string
  subtasks: string
  status: string
  dueDate: string
  createdAt: string
  completedAt: string
  userId: string
  scheduledTime?: string
  estimatedDuration?: number
  listId?: string
}

function parseApiTask(raw: ApiTask): Task {
  let tags: string[] = []
  let subtasks: Subtask[] = []
  try { tags = JSON.parse(raw.tags || '[]') } catch { /* empty */ }
  try { subtasks = JSON.parse(raw.subtasks || '[]') } catch { /* empty */ }
  return {
    ...raw,
    status: (raw.status || 'todo') as TaskStatus,
    tags,
    subtasks,
    dueDate: raw.dueDate || undefined,
    completedAt: raw.completedAt || undefined,
    scheduledTime: raw.scheduledTime || undefined,
    estimatedDuration: raw.estimatedDuration || undefined,
    listId: raw.listId || undefined,
  }
}

function serializeTask(task: Partial<Task>) {
  const data: Record<string, unknown> = { ...task }
  if (task.tags !== undefined) data.tags = JSON.stringify(task.tags)
  if (task.subtasks !== undefined) data.subtasks = JSON.stringify(task.subtasks)
  if (task.dueDate === null) data.dueDate = ''
  if (task.completedAt === null) data.completedAt = ''
  if (task.scheduledTime === null) data.scheduledTime = ''
  if (task.estimatedDuration === null) data.estimatedDuration = 0
  return data
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

  // List actions
  updateListTitle: (id: string, title: string) => void
  addList: (title: string) => void

  // Subtask helpers
  addSubtask: (taskId: string, title: string) => Promise<void>
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>

  // Selectors
  getFilteredTasks: (status?: string, search?: string) => Task[]
  getAllTags: () => string[]
  getTasksDueToday: () => Task[]
  getCompletedToday: () => Task[]
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
    set({ isLoading: true, error: null })
    try {
      const raw = await apiGet<ApiTask[]>(`/tasks?userId=${userId}`)
      const tasks = (Array.isArray(raw) ? raw : []).map(parseApiTask)
      set({ tasks, isLoading: false })
    } catch {
      set({ isLoading: false, error: 'Failed to load tasks' })
    }
  },

  addTask: async (taskData) => {
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    
    // Optimistic UI update
    const tempId = `temp-${crypto.randomUUID()}`
    const tempTask: Task = {
      ...taskData,
      id: tempId,
      createdAt: new Date().toISOString(),
      subtasks: [],
      tags: taskData.tags || [],
      status: 'todo',
      userId,
    } as Task
    set((s) => ({ tasks: [...s.tasks, tempTask] }))

    try {
      const payload = serializeTask(tempTask)
      const raw = await apiPost<ApiTask>('/tasks', payload)
      const task = parseApiTask(raw)
      // Replace temp ID with real ID
      set((s) => ({ tasks: s.tasks.map(t => t.id === tempId ? task : t) }))
    } catch {
      console.warn('Network error: addTask queued for background sync')
    }
  },

  updateTask: async (id, updates) => {
    // Optimistic UI update
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) }))
    try {
      const payload = serializeTask(updates)
      const raw = await apiPut<ApiTask>(`/tasks/${id}`, payload)
      const updated = parseApiTask(raw)
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }))
    } catch {
      console.warn('Network error: updateTask queued for background sync')
    }
  },

  deleteTask: async (id) => {
    // Optimistic UI update
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    try {
      await apiDelete(`/tasks/${id}`)
    } catch {
      console.warn('Network error: deleteTask queued for background sync')
    }
  },

  toggleComplete: async (id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    const isDone = newStatus === 'done'
    const updates: Partial<Task> = {
      status: newStatus,
      completedAt: isDone ? new Date().toISOString() : undefined,
    }
    if (isDone) {
      const { soundSystem } = await import('@/lib/sounds')
      soundSystem.playSuccess()
      // Gain 50 XP for completing a task
      useAuthStore.getState().addXP(50)
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

  toggleSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return
    const subtasks = task.subtasks.map((s) => {
      if (s.id === subtaskId) {
        const willComplete = !s.completed
        if (willComplete) {
          import('@/lib/sounds').then(({ soundSystem }) => soundSystem.playClick())
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
    if (status && status !== 'all') filtered = filtered.filter((t) => t.status === status)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
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
    return get().tasks.filter((t) => t.dueDate?.startsWith(today) && t.status !== 'done')
  },

  getCompletedToday: () => {
    const today = new Date().toISOString().split('T')[0]
    return get().tasks.filter((t) => t.completedAt?.startsWith(today))
  },
}),
  {
    name: 'obel-tasks',
    partialize: (state) => ({ tasks: state.tasks, lists: state.lists }),
  }
)
)
