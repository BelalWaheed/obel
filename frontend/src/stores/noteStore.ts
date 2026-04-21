import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '@/lib/storage'

export type NoteColor = 'none' | 'red' | 'orange' | 'green' | 'blue' | 'purple' | 'pink'

export interface NoteColorConfig {
  label: string
  dot: string
  bg: string
}

export const NOTE_COLORS: Record<NoteColor, NoteColorConfig> = {
  none:   { label: 'Default', dot: 'bg-muted-foreground/30', bg: '' },
  red:    { label: 'Urgent',  dot: 'bg-red-500',   bg: 'border-l-red-500/60' },
  orange: { label: 'Warning', dot: 'bg-orange-500', bg: 'border-l-orange-500/60' },
  green:  { label: 'Ideas',   dot: 'bg-emerald-500', bg: 'border-l-emerald-500/60' },
  blue:   { label: 'Reference', dot: 'bg-blue-500', bg: 'border-l-blue-500/60' },
  purple: { label: 'Personal', dot: 'bg-purple-500', bg: 'border-l-purple-500/60' },
  pink:   { label: 'Creative', dot: 'bg-pink-500',  bg: 'border-l-pink-500/60' },
}

export interface Note {
  id: string
  title: string
  content: string
  pinned: boolean
  color: NoteColor
  linkedTaskIds?: string[]
  createdAt: string
  updatedAt: string
}

export interface NoteTemplate {
  name: string
  icon: string
  title: string
  content: string
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    name: 'Meeting Notes',
    icon: '📋',
    title: 'Meeting Notes',
    content: `## Meeting Notes\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:** \n\n---\n\n### Agenda\n- \n\n### Discussion\n\n\n### Action Items\n- [ ] \n- [ ] \n\n### Next Steps\n`,
  },
  {
    name: 'Daily Journal',
    icon: '📓',
    title: `Journal — ${new Date().toLocaleDateString()}`,
    content: `# Daily Journal\n\n## 🎯 Today's Goals\n- [ ] \n- [ ] \n- [ ] \n\n## 💭 Reflections\n\n\n## 🙏 Grateful For\n1. \n2. \n3. \n\n## 📝 Notes\n`,
  },
  {
    name: 'Project Brief',
    icon: '🚀',
    title: 'Project Brief',
    content: `# Project Brief\n\n## Overview\n\n\n## Objectives\n1. \n2. \n3. \n\n## Scope\n\n\n## Timeline\n| Phase | Deadline | Status |\n|-------|----------|--------|\n| Planning | | 🟡 |\n| Development | | ⬜ |\n| Testing | | ⬜ |\n| Launch | | ⬜ |\n\n## Resources\n- \n\n## Risks\n- \n`,
  },
  {
    name: 'Quick List',
    icon: '✅',
    title: 'Quick List',
    content: `## Quick List\n\n- [ ] \n- [ ] \n- [ ] \n- [ ] \n- [ ] \n`,
  },
  {
    name: 'Code Snippet',
    icon: '💻',
    title: 'Code Snippet',
    content: "# Code Snippet\n\n## Description\n\n\n## Code\n```\n\n```\n\n## Notes\n- \n",
  },
]

interface NoteState {
  notes: Note[]
  addNote: (title?: string, content?: string) => string
  updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'pinned' | 'color' | 'linkedTaskIds'>>) => void
  deleteNote: (id: string) => void
  togglePin: (id: string) => void
  setColor: (id: string, color: NoteColor) => void
  getNoteById: (id: string) => Note | undefined
  getSortedNotes: () => Note[]
}

export const useNoteStore = create<NoteState>()(
  persist(
    (set, get) => ({
      notes: [],

      addNote: (title?: string, content?: string) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const note: Note = {
          id,
          title: title || 'Untitled',
          content: content || '',
          pinned: false,
          color: 'none',
          linkedTaskIds: [],
          createdAt: now,
          updatedAt: now,
        }
        set((s) => ({ notes: [note, ...s.notes] }))
        return id
      },

      updateNote: (id, updates) => {
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id
              ? { ...n, ...updates, updatedAt: new Date().toISOString() }
              : n
          ),
        }))
      },

      deleteNote: (id) => {
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }))
      },

      togglePin: (id) => {
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id
              ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() }
              : n
          ),
        }))
      },

      setColor: (id, color) => {
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, color, updatedAt: new Date().toISOString() } : n
          ),
        }))
      },

      getNoteById: (id) => get().notes.find((n) => n.id === id),

      getSortedNotes: () => {
        const notes = [...get().notes]
        return notes.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })
      },
    }),
    {
      name: 'obel-notes',
      storage: createJSONStorage(() => indexedDBStorage),
    }
  )
)
