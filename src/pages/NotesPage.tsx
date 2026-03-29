import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Trash2,
  Eye,
  Edit3,
  FileText,
  ChevronLeft,
  MoreVertical,
  Download,
  Bold,
  Italic,
  Heading,
  List,
  Code,
  CheckSquare,
  Columns,
  Palette
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { useNoteStore, NOTE_COLORS, NOTE_TEMPLATES, type NoteColor, type Note } from '@/stores/noteStore'
import { MarkdownRenderer } from '@/components/ui/markdown'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export default function NotesPage() {
  const notes = useNoteStore((s) => s.notes)
  const addNote = useNoteStore((s) => s.addNote)
  const updateNote = useNoteStore((s) => s.updateNote)
  const deleteNote = useNoteStore((s) => s.deleteNote)
  const togglePin = useNoteStore((s) => s.togglePin)
  const setColor = useNoteStore((s) => s.setColor)
  const getSortedNotes = useNoteStore((s) => s.getSortedNotes)

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [showSidebar, setShowSidebar] = useState(true)
  const titleRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')

  const sortedNotes = useMemo(() => getSortedNotes(), [notes, getSortedNotes])

  // Handle responsive view mode
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && viewMode === 'split') {
        setViewMode('edit')
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize() // init
    return () => window.removeEventListener('resize', handleResize)
  }, [viewMode])


  const filteredNotes = useMemo(() => {
    if (!search.trim()) return sortedNotes
    const q = search.toLowerCase()
    return sortedNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    )
  }, [sortedNotes, search])

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeNoteId) || null,
    [notes, activeNoteId]
  )

  useEffect(() => {
    if (activeNote) {
      setDraftTitle(activeNote.title)
      setDraftContent(activeNote.content)
    }
  }, [activeNoteId])

  const scheduleSave = useCallback(
    (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'color'>>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        updateNote(id, updates)
      }, 400)
    },
    [updateNote]
  )

  const handleTitleChange = (val: string) => {
    setDraftTitle(val)
    if (activeNoteId) scheduleSave(activeNoteId, { title: val || 'Untitled', content: draftContent })
  }

  const handleContentChange = (val: string) => {
    setDraftContent(val)
    if (activeNoteId) scheduleSave(activeNoteId, { title: draftTitle || 'Untitled', content: val })
  }

  const handleNewNote = (templateIndex?: number) => {
    if (templateIndex !== undefined) {
      const template = NOTE_TEMPLATES[templateIndex]
      const id = addNote(template.title, template.content)
      setActiveNoteId(id)
    } else {
      const id = addNote()
      setActiveNoteId(id)
    }
    
    if (window.innerWidth < 1024) setViewMode('edit')
    setShowSidebar(false)
    setTimeout(() => titleRef.current?.focus(), 100)
  }

  const handleSelectNote = (id: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      if (activeNoteId) {
        updateNote(activeNoteId, { title: draftTitle || 'Untitled', content: draftContent })
      }
    }
    setActiveNoteId(id)
    setShowSidebar(false)
  }

  const handleDeleteNote = (id: string) => {
    deleteNote(id)
    if (activeNoteId === id) {
      setActiveNoteId(null)
      setShowSidebar(true)
    }
  }

  const handleBack = () => {
    if (saveTimerRef.current && activeNoteId) {
      clearTimeout(saveTimerRef.current)
      updateNote(activeNoteId, { title: draftTitle || 'Untitled', content: draftContent })
    }
    setShowSidebar(true)
  }

  const getExcerpt = (content: string, maxLen = 80) => {
    const plain = content
      .replace(/[#*_~`>\[\]!()-]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
    if (!plain) return 'Empty note'
    return plain.length > maxLen ? plain.substring(0, maxLen) + '…' : plain
  }

  const exportNote = () => {
    if (!activeNote) return
    const blob = new Blob([activeNote.content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // --- Toolbar & Keyboard Shortcuts ---
  const insertText = (before: string, after: string = '') => {
    if (!editorRef.current) return
    const el = editorRef.current
    const start = el.selectionStart
    const end = el.selectionEnd
    const text = el.value
    const selectedText = text.substring(start, end)
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end)
    handleContentChange(newText)
    
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); insertText('**', '**'); break;
        case 'i': e.preventDefault(); insertText('*', '*'); break;
        case 'k': e.preventDefault(); insertText('[', '](url)'); break;
      }
    }
  }

  const wordCount = draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0

  return (
    <div className="h-[calc(100vh-6rem)] flex overflow-hidden">
      {/* ─── NOTE LIST SIDEBAR ─── */}
      <div
        className={`w-full md:w-80 lg:w-96 flex-col border-r border-border/40 bg-background/60 backdrop-blur-md ${
          showSidebar ? 'flex' : 'hidden md:flex'
        }`}
      >
        <div className="p-4 border-b border-border/40 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight">Notes</h1>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                  {notes.length} note{notes.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 shadow-lg shadow-primary/20 cursor-pointer">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/40 bg-background/95 backdrop-blur-xl">
                <DropdownMenuItem onClick={() => handleNewNote()} className="font-semibold cursor-pointer py-2">
                  <span className="w-5 mr-2 text-center text-lg leading-none">+</span> Blank Note
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/40" />
                <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Templates</DropdownMenuLabel>
                {NOTE_TEMPLATES.map((tmpl, idx) => (
                  <DropdownMenuItem key={tmpl.name} onClick={() => handleNewNote(idx)} className="cursor-pointer font-medium py-1.5 hidden sm:flex">
                     <span className="w-5 mr-2 text-center">{tmpl.icon}</span> {tmpl.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 bg-muted/30 border-border/30 rounded-xl text-sm font-medium focus-visible:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-bold text-muted-foreground">
                {search ? 'No notes found' : 'No notes yet'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <AnimatePresence mode="popLayout">
                {filteredNotes.map((note) => {
                  const colorConfig = NOTE_COLORS[note.color || 'none']
                  return (
                  <motion.button
                    layout
                    key={note.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => handleSelectNote(note.id)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all duration-200 group relative border-l-4 ${colorConfig.bg || 'border-l-transparent'} ${
                      activeNoteId === note.id
                        ? 'bg-primary/10 border-t-primary/20 border-r-primary/20 border-b-primary/20 shadow-sm'
                        : 'hover:bg-muted/40 border-t-transparent border-r-transparent border-b-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {note.pinned && <Pin className="w-3 h-3 text-primary shrink-0 fill-primary" />}
                          {note.color && note.color !== 'none' && (
                             <div className={`w-2 h-2 rounded-full shrink-0 ${colorConfig.dot}`} />
                          )}
                          <h3 className={`text-sm font-bold truncate ${activeNoteId === note.id ? 'text-primary' : 'text-foreground'}`}>
                            {note.title}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
                          {getExcerpt(note.content)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/40 mt-2 font-medium">
                          {dayjs(note.updatedAt).fromNow()}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-lg hover:bg-muted/50 shrink-0 mt-0.5"
                        >
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePin(note.id) }} className="gap-2 cursor-pointer text-xs font-semibold">
                            {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                            {note.pinned ? 'Unpin' : 'Pin to top'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); exportNote() }} className="gap-2 cursor-pointer text-xs font-semibold">
                            <Download className="w-3.5 h-3.5" /> Export (.md)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id) }} className="gap-2 cursor-pointer text-xs font-semibold text-destructive focus:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.button>
                )})}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ─── EDITOR / PREVIEW PANE ─── */}
      <div className={`flex-1 flex flex-col min-w-0 ${!showSidebar ? 'flex' : 'hidden md:flex'}`}>
        {activeNote ? (
          <>
            {/* Header & Modes */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 gap-3 border-b border-border/40 bg-background/40 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 rounded-lg" onClick={handleBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <div className="flex bg-muted/40 rounded-xl p-0.5 border border-border/30">
                  <button onClick={() => setViewMode('edit')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'edit' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    <Edit3 className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Write</span>
                  </button>
                  <button onClick={() => setViewMode('preview')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'preview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    <Eye className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Preview</span>
                  </button>
                  <button onClick={() => setViewMode('split')} className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'split' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    <Columns className="w-3.5 h-3.5" /> Split
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 md:gap-3 ml-auto">
                <span className="text-[10px] text-muted-foreground/50 font-medium hidden lg:inline mr-2">
                  {wordCount} word{wordCount !== 1 ? 's' : ''} · Updated {dayjs(activeNote.updatedAt).fromNow()}
                </span>
                
                {/* Color Picker */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-8 w-8 text-muted-foreground cursor-pointer">
                       <Palette className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl p-2 grid grid-cols-4 gap-1">
                    {(Object.entries(NOTE_COLORS) as [NoteColor, any][]).map(([key, config]) => (
                      <button
                        key={key}
                        title={config.label}
                        onClick={() => setColor(activeNote.id, key)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted/50 transition-colors ${activeNote.color === key ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                      >
                         {key === 'none' ? <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-dashed" /> : <div className={`w-4 h-4 rounded-full ${config.dot}`} />}
                      </button>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary" onClick={() => togglePin(activeNote.id)} title={activeNote.pinned ? 'Unpin note' : 'Pin note'}>
                  {activeNote.pinned ? <Pin className="w-4 h-4 fill-primary text-primary" /> : <Pin className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 hidden sm:flex" onClick={() => handleDeleteNote(activeNote.id)} title="Delete note">
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hidden sm:flex" onClick={exportNote} title="Export Markdown">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Title Input */}
            <div className="px-5 pt-4 pb-2 shrink-0 border-b border-border/20">
              <input
                ref={titleRef}
                value={draftTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Note title..."
                className="w-full bg-transparent text-2xl sm:text-3xl font-black tracking-tight text-foreground placeholder:text-muted-foreground/30 outline-none border-none"
              />
            </div>

            {/* Markdown Toolbar (only in edit or split mode) */}
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border/20 bg-muted/10 shrink-0 overflow-x-auto custom-scrollbar">
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground" onClick={() => insertText('**', '**')} title="Bold (Ctrl+B)">
                   <Bold className="w-3.5 h-3.5" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground" onClick={() => insertText('*', '*')} title="Italic (Ctrl+I)">
                   <Italic className="w-3.5 h-3.5" />
                 </Button>
                 <div className="w-px h-4 bg-border/50 mx-1" />
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground" onClick={() => insertText('## ')} title="Heading">
                   <Heading className="w-3.5 h-3.5" />
                 </Button>
                 <div className="w-px h-4 bg-border/50 mx-1" />
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground" onClick={() => insertText('- ')} title="Bullet List">
                   <List className="w-3.5 h-3.5" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground" onClick={() => insertText('- [ ] ')} title="Task List">
                   <CheckSquare className="w-3.5 h-3.5" />
                 </Button>
                 <div className="w-px h-4 bg-border/50 mx-1" />
                 <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground" onClick={() => insertText('```\n', '\n```')} title="Code Block">
                   <Code className="w-3.5 h-3.5" />
                 </Button>
              </div>
            )}

            {/* Content Area */}
            <div className={`flex-1 overflow-hidden flex ${viewMode === 'split' ? 'flex-row' : 'flex-col'}`}>
              
              {/* Editor */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={`flex-1 overflow-auto p-5 ${viewMode === 'split' ? 'border-r border-border/30 w-1/2' : 'w-full'}`}>
                  <textarea
                    ref={editorRef}
                    value={draftContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Start writing... (supports Markdown)"
                    className="w-full h-full min-h-[60vh] bg-transparent text-[13px] leading-[1.8] text-foreground/90 placeholder:text-muted-foreground/30 outline-none border-none resize-none font-mono"
                    spellCheck
                  />
                </div>
              )}

              {/* Preview */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className={`flex-1 overflow-auto p-6 ${viewMode === 'split' ? 'w-1/2 bg-muted/5' : 'w-full'}`}>
                  {draftContent.trim() ? (
                    <MarkdownRenderer content={draftContent} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <Eye className="w-8 h-8 mb-3" />
                      <p className="text-sm italic">Nothing to preview yet.</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-muted/30 border border-border/30 flex items-center justify-center mb-5">
              <FileText className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-muted-foreground/60 mb-2">
              Select a note
            </h2>
            <p className="text-sm text-muted-foreground/40 max-w-xs">
              Choose a note from the sidebar or select a template to start writing.
            </p>
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-3">
               <Button onClick={() => handleNewNote()} variant="outline" className="h-24 rounded-2xl flex flex-col gap-2 bg-card/50 hover:bg-card">
                  <Plus className="w-6 h-6 text-primary" /> Blank Note
               </Button>
               {NOTE_TEMPLATES.slice(0, 5).map((tmpl, idx) => (
                 <Button key={tmpl.name} onClick={() => handleNewNote(idx)} variant="outline" className="h-24 rounded-2xl flex flex-col gap-2 bg-card/50 hover:bg-card">
                    <span className="text-2xl">{tmpl.icon}</span> {tmpl.name}
                 </Button>
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
