import { create } from 'zustand'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import { useAuthStore } from './authStore'

export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in-progress' | 'done'

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface Task {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  tags: string[]
  subtasks: Subtask[]
  status: 'todo' | 'in-progress' | 'done'
  dueDate?: string
  createdAt: string
  completedAt?: string
  userId: string
  focusSessions?: number
  focusTime?: number
}

// Shape coming from API (tags/subtasks are JSON strings)
interface ApiTask {
  id: string
  title: string
  description: string
  priority: string
  tags: string
  subtasks: string
  status: string
  dueDate: string
  createdAt: string
  completedAt: string
  userId: string
}

function parseApiTask(raw: ApiTask): Task {
  let tags: string[] = []
  let subtasks: Subtask[] = []
  try { tags = JSON.parse(raw.tags || '[]') } catch { /* empty */ }
  try { subtasks = JSON.parse(raw.subtasks || '[]') } catch { /* empty */ }
  return {
    ...raw,
    priority: (raw.priority || 'medium') as Priority,
    status: (raw.status || 'todo') as TaskStatus,
    tags,
    subtasks,
    dueDate: raw.dueDate || null,
    completedAt: raw.completedAt || null,
  }
}

function serializeTask(task: Partial<Task>) {
  const data: Record<string, unknown> = { ...task }
  if (task.tags !== undefined) data.tags = JSON.stringify(task.tags)
  if (task.subtasks !== undefined) data.subtasks = JSON.stringify(task.subtasks)
  if (task.dueDate === null) data.dueDate = ''
  if (task.completedAt === null) data.completedAt = ''
  return data
}

interface TaskState {
  tasks: Task[]
  isLoading: boolean
  error: string | null

  fetchTasks: () => Promise<void>
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'userId'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleComplete: (id: string) => Promise<void>

  // Subtask helpers
  addSubtask: (taskId: string, title: string) => Promise<void>
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>

  // Selectors
  getFilteredTasks: (status?: string, priority?: string, search?: string) => Task[]
  getAllTags: () => string[]
  getTasksDueToday: () => Task[]
  getCompletedToday: () => Task[]
}

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
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
    try {
      const payload = serializeTask({
        ...taskData,
        createdAt: new Date().toISOString(),
        completedAt: undefined, // Changed from null to undefined
        userId,
      } as Task)
      const raw = await apiPost<ApiTask>('/tasks', payload)
      const task = parseApiTask(raw)
      set((s) => ({ tasks: [...s.tasks, task] }))
    } catch {
      set({ error: 'Failed to create task' })
    }
  },

  updateTask: async (id, updates) => {
    try {
      const payload = serializeTask(updates)
      const raw = await apiPut<ApiTask>(`/tasks/${id}`, payload)
      const updated = parseApiTask(raw)
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }))
    } catch {
      set({ error: 'Failed to update task' })
    }
  },

  deleteTask: async (id) => {
    try {
      await apiDelete(`/tasks/${id}`)
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    } catch {
      set({ error: 'Failed to delete task' })
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
    await get().updateTask(id, updates)
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
    const subtasks = task.subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    )
    await get().updateTask(taskId, { subtasks })
  },

  deleteSubtask: async (taskId, subtaskId) => {
    const task = get().tasks.find((t) => t.id === taskId)
    if (!task) return
    const subtasks = task.subtasks.filter((s) => s.id !== subtaskId)
    await get().updateTask(taskId, { subtasks })
  },

  getFilteredTasks: (status, priority, search) => {
    let filtered = get().tasks
    if (status && status !== 'all') filtered = filtered.filter((t) => t.status === status)
    if (priority && priority !== 'all') filtered = filtered.filter((t) => t.priority === priority)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
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
}))
