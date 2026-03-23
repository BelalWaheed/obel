import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '@/stores/taskStore'
import { 
  LayoutDashboard, 
  ListTodo, 
  Timer, 
  Sparkles, 
  Calendar, 
  User, 
  Plus,
  Search
} from 'lucide-react'

// Lightweight NLP parser for tasks
function parseTaskInput(input: string) {
  let title = input
  let priority = 'low'
  const tags: string[] = []
  let dueDate = null

  // Priority
  if (title.includes('!urgent') || title.includes('!high')) {
    priority = 'high'
    title = title.replace(/!(urgent|high)/g, '')
  } else if (title.includes('!med') || title.includes('!medium')) {
    priority = 'medium'
    title = title.replace(/!(med|medium)/g, '')
  } else if (title.includes('!low')) {
    title = title.replace(/!low/g, '')
  }

  // Tags (#health, etc)
  const tagMathces = title.match(/#[\w-]+/g)
  if (tagMathces) {
    tagMathces.forEach(t => tags.push(t.substring(1)))
    title = title.replace(/#[\w-]+/g, '')
  }

  // Basic Dates
  const lowerTitle = title.toLowerCase()
  if (lowerTitle.includes(' tomorrow')) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    dueDate = d.toISOString()
    title = title.replace(/tomorrow/ig, '')
  } else if (lowerTitle.includes(' today')) {
    dueDate = new Date().toISOString()
    title = title.replace(/today/ig, '')
  } else if (lowerTitle.includes(' next week')) {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    dueDate = d.toISOString()
    title = title.replace(/next week/ig, '')
  }

  return {
    title: title.trim(),
    priority: priority as 'low'|'medium'|'high',
    tags,
    dueDate
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const navigate = useNavigate()
  const addTask = useTaskStore(s => s.addTask)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    setInputValue('')
    command()
  }

  const handleCreateTask = () => {
    if (!inputValue.trim()) return
    const { title, priority, tags, dueDate } = parseTaskInput(inputValue)
    if (!title) return

    addTask({
      title,
      description: '',
      status: 'todo',
      priority,
      tags,
      subtasks: [],
      dueDate: dueDate || undefined,
      focusSessions: 0,
      focusTime: 0
    })
    runCommand(() => navigate('/tasks'))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[20vh] px-4">
      <div 
        className="fixed inset-0 bg-transparent" 
        onClick={() => setOpen(false)} 
        aria-hidden="true" 
      />
      
      <Command 
        className="relative w-full max-w-2xl bg-popover/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col"
        loop
        shouldFilter={false} // Custom filtering or handle via input
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            setOpen(false)
          } else if (e.key === 'Enter') {
            // Let cmdk handle enter on items, but if we want to force create task:
            // The item will trigger `onSelect`
          }
        }}
      >
        <div className="flex items-center px-4 py-3 border-b border-white/10" cmdk-input-wrapper="">
          <Search className="w-5 h-5 mr-3 text-muted-foreground shrink-0" />
          <Command.Input
            autoFocus
            placeholder="Type a command or create a task (e.g. 'Pay bills !high #finance tomorrow')..."
            value={inputValue}
            onValueChange={setInputValue}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none border-none text-base h-10 w-full"
          />
        </div>

        <Command.List className="max-h-[350px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No commands found. Press Enter to create task: <span className="text-foreground font-medium">"{inputValue}"</span>
          </Command.Empty>

          {inputValue.trim().length > 0 && (
            <Command.Group heading="Actions" className="text-xs font-medium text-muted-foreground px-2 py-1.5 **:[[cmdk-item]]:rounded-xl **:[[cmdk-item]]:px-3 **:[[cmdk-item]]:py-3 **:[[cmdk-item]]:flex **:[[cmdk-item]]:items-center **:[[cmdk-item]]:gap-3 **:[[cmdk-item]]:cursor-pointer **:[[cmdk-item]]:text-sm **:[[cmdk-item]]:text-foreground **:[[cmdk-group-heading]]:text-left **:[[cmdk-group-heading]]:mb-2">
              <Command.Item
                onSelect={handleCreateTask}
                className="data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground group transition-colors"
                value={`create task ${inputValue}`}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 group-data-[selected=true]:bg-black/20 text-primary group-data-[selected=true]:text-primary-foreground">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium">Create Task</span>
                  <span className="text-xs opacity-70 truncate">{parseTaskInput(inputValue).title}</span>
                </div>
                <div className="flex gap-1">
                  {parseTaskInput(inputValue).priority === 'high' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-500">Urgent</span>}
                  {parseTaskInput(inputValue).tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">#{t}</span>)}
                </div>
              </Command.Item>
            </Command.Group>
          )}

          <Command.Group heading="Navigation" className="text-xs font-medium text-muted-foreground px-2 py-1.5 **:[[cmdk-item]]:rounded-xl **:[[cmdk-item]]:px-3 **:[[cmdk-item]]:py-2.5 **:[[cmdk-item]]:flex **:[[cmdk-item]]:items-center **:[[cmdk-item]]:gap-3 **:[[cmdk-item]]:cursor-pointer **:[[cmdk-item]]:text-sm **:[[cmdk-item]]:text-foreground **:[[cmdk-group-heading]]:text-left **:[[cmdk-group-heading]]:mb-2">
            <Command.Item
              onSelect={() => runCommand(() => navigate('/'))}
              value="Go to Dashboard"
              className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground group transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-muted-foreground group-data-[selected=true]:text-accent-foreground" />
              <span>Dashboard</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate('/tasks'))}
              value="Go to Tasks"
              className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground group transition-colors"
            >
              <ListTodo className="w-4 h-4 text-muted-foreground group-data-[selected=true]:text-accent-foreground" />
              <span>Tasks</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate('/pomodoro'))}
              value="Go to Pomodoro Timer"
              className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground group transition-colors"
            >
              <Timer className="w-4 h-4 text-muted-foreground group-data-[selected=true]:text-accent-foreground" />
              <span>Pomodoro Timer</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate('/habits'))}
              value="Go to Habits"
              className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground group transition-colors"
            >
              <Sparkles className="w-4 h-4 text-muted-foreground group-data-[selected=true]:text-accent-foreground" />
              <span>Habits</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate('/calendar'))}
              value="Go to Calendar"
              className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground group transition-colors"
            >
              <Calendar className="w-4 h-4 text-muted-foreground group-data-[selected=true]:text-accent-foreground" />
              <span>Calendar</span>
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => navigate('/profile'))}
              value="Go to Profile Settings"
              className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground group transition-colors"
            >
              <User className="w-4 h-4 text-muted-foreground group-data-[selected=true]:text-accent-foreground" />
              <span>Profile</span>
            </Command.Item>
          </Command.Group>

          <div className="h-4"></div>
        </Command.List>

        <div className="flex items-center justify-between px-4 py-2 bg-black/20 border-t border-white/5 text-[10px] text-muted-foreground font-medium">
          <div className="flex gap-4">
            <span><kbd className="font-sans bg-white/10 px-1 py-0.5 rounded text-[9px] mr-1 border border-white/10">↑↓</kbd> to navigate</span>
            <span><kbd className="font-sans bg-white/10 px-1 py-0.5 rounded text-[9px] mr-1 border border-white/10">Enter</kbd> to select</span>
            <span><kbd className="font-sans bg-white/10 px-1 py-0.5 rounded text-[9px] mr-1 border border-white/10">Esc</kbd> to close</span>
          </div>
          <div className="font-mono opacity-50">Obel CMD</div>
        </div>
      </Command>
    </div>
  )
}
