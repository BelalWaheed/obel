import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
  Play,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTaskStore, type Task } from "@/stores/taskStore";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskListCardProps {
  listId: string;
  title: string;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onStartFocus: (taskId: string) => void;
}

export function TaskListCard({
  listId,
  title,
  tasks,
  onTaskClick,
  onStartFocus,
}: TaskListCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<string, string>>({});
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskValue, setEditingSubtaskValue] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const updateListTitle = useTaskStore((state) => state.updateListTitle);
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const calculateTaskProgress = useTaskStore((state) => state.calculateTaskProgress);
  const addSubtask = useTaskStore((state) => state.addSubtask);
  const updateSubtask = useTaskStore((state) => state.updateSubtask);
  const toggleSubtask = useTaskStore((state) => state.toggleSubtask);
  const deleteSubtask = useTaskStore((state) => state.deleteSubtask);

  const handleSaveTitle = () => {
    if (newTitle.trim() && newTitle !== title) {
      updateListTitle(listId, newTitle);
    }
    setIsEditingTitle(false);
  };

  const handleAddSubtask = async (taskId: string) => {
    const title = newSubtaskTitles[taskId];
    if (title?.trim()) {
      await addSubtask(taskId, title.trim());
      setNewSubtaskTitles(prev => ({ ...prev, [taskId]: "" }));
    }
  };

  const handleStartEditSubtask = (id: string, title: string) => {
    setEditingSubtaskId(id);
    setEditingSubtaskValue(title);
  };

  const handleSaveSubtask = async (taskId: string) => {
    if (editingSubtaskId && editingSubtaskValue.trim()) {
      await updateSubtask(taskId, editingSubtaskId, editingSubtaskValue.trim());
    }
    setEditingSubtaskId(null);
  };

  return (
    <Card className="bg-card/40 backdrop-blur-xl border-border/40 overflow-hidden rounded-[2rem] md:w-[320px] lg:w-[350px] md:shrink-0 flex flex-col max-h-[calc(100vh-270px)] md:max-h-none h-fit">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors group "
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 flex-1">
          {isEditingTitle ? (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
                className="h-8 text-xl font-bold bg-background/50 border-primary/30 w-48"
                autoFocus
              />
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-primary hover:bg-primary/10"
                  onClick={handleSaveTitle}
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:bg-muted"
                  onClick={() => setIsEditingTitle(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight first-letter:uppercase">
                {title}
              </h2>
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-muted-foreground font-semibold text-sm bg-muted/20 px-2 py-0.5 rounded-full">
                  {tasks.length}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition-all shadow-none"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="rounded-full shadow-none">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </Button>
      </div>

      {/* Task List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 space-y-3">
              {tasks.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-border/20 rounded-[1.5rem]">
                  <p className="text-muted-foreground text-sm font-medium italic opacity-50">
                    No tasks in this list
                  </p>
                </div>
              ) : (
                [...tasks]
                  .sort((a, b) => {
                    if (a.status === "done" && b.status !== "done") return 1;
                    if (a.status !== "done" && b.status === "done") return -1;
                    return 0;
                  })
                  .map((task) => {
                    const isDone = task.status === "done";
                    const progress = calculateTaskProgress(task.id);
                    const isTaskExpanded = expandedTaskId === task.id;

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 border ${
                          isDone
                            ? "opacity-50 bg-muted/5 border-transparent"
                            : isTaskExpanded && !isMobile
                              ? "bg-background shadow-xl border-primary/20 scale-[1.02] z-10"
                              : "bg-background/40 border-border/40 hover:border-primary/30 hover:bg-background/60"
                        }`}
                      >
                        {/* Main Task Item */}
                        <div 
                          className="p-3 flex items-center gap-3 cursor-pointer"
                          onClick={() => {
                            if (isMobile) {
                              onTaskClick(task.id);
                            } else {
                              setExpandedTaskId(isTaskExpanded ? null : task.id);
                            }
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isDone) {
                                import("canvas-confetti").then((confetti) => {
                                  confetti.default({
                                    particleCount: 100,
                                    spread: 70,
                                    origin: { y: 0.6 },
                                    colors: ["#a855f7", "#ec4899", "#3b82f6"],
                                  });
                                });
                              }
                              toggleComplete(task.id);
                            }}
                            className={`shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300 w-6 h-6 z-10 ${
                              isDone
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/30 hover:border-primary text-transparent hover:bg-primary/10"
                            }`}
                          >
                            <CheckCircle2
                              className={`w-4 h-4 ${isDone ? "opacity-100" : "opacity-0"} transition-opacity`}
                              strokeWidth={3}
                            />
                          </button>

                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-bold text-[15px] truncate transition-colors duration-300 ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}
                            >
                              {task.title}
                            </h3>
                            {task.subtasks?.length > 0 && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <ProgressRing progress={progress} size={14} strokeWidth={2} />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                  {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} Steps
                                </span>
                              </div>
                            )}
                          </div>

                          <div className={`flex items-center gap-1 transition-opacity ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {!isDone && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartFocus(task.id);
                                }}
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
                              >
                                <Play className="w-4 h-4 fill-current" />
                              </Button>
                            )}
                            {!isMobile && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTaskClick(task.id);
                                }}
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Subtasks Section */}
                        <AnimatePresence>
                          {isTaskExpanded && !isMobile && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-3 pb-3 space-y-2 border-t border-border/20 bg-muted/5 mt-1"
                            >
                              <div className="pt-2 space-y-1.5">
                                {task.subtasks.map((st) => (
                                  <div 
                                    key={st.id} 
                                    className="flex items-center gap-2 group/st p-1.5 rounded-xl hover:bg-muted/10 transition-colors"
                                  >
                                    <Checkbox
                                      checked={st.completed}
                                      onCheckedChange={() => toggleSubtask(task.id, st.id)}
                                      className="w-4 h-4 rounded border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                                    />
                                    
                                    {editingSubtaskId === st.id ? (
                                      <div className="flex-1 flex items-center gap-1">
                                        <Input
                                          value={editingSubtaskValue}
                                          onChange={(e) => setEditingSubtaskValue(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveSubtask(task.id);
                                            if (e.key === "Escape") setEditingSubtaskId(null);
                                          }}
                                          onBlur={() => handleSaveSubtask(task.id)}
                                          className="h-7 text-xs bg-background/50 border-primary/30"
                                          autoFocus
                                        />
                                      </div>
                                    ) : (
                                      <span 
                                        className={`text-xs font-semibold flex-1 cursor-text ${st.completed ? 'line-through text-muted-foreground opacity-60' : 'text-foreground/90'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEditSubtask(st.id, st.title);
                                        }}
                                      >
                                        {st.title}
                                      </span>
                                    )}

                                    <div className="flex items-center opacity-0 group-hover/st:opacity-100 transition-opacity">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" 
                                        onClick={(e) => { e.stopPropagation(); deleteSubtask(task.id, st.id); }}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}

                                {/* Quick Add Subtask */}
                                <div className="flex items-center gap-2 mt-2 px-1">
                                  <div className="flex-1 flex items-center gap-2 bg-background/50 border border-border/50 rounded-xl px-2 focus-within:border-primary/50 transition-all">
                                    <Plus className="w-3 h-3 text-muted-foreground" />
                                    <Input
                                      placeholder="Add step..."
                                      value={newSubtaskTitles[task.id] || ""}
                                      onChange={(e) => setNewSubtaskTitles(prev => ({ ...prev, [task.id]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAddSubtask(task.id);
                                        if (e.key === "Escape") setExpandedTaskId(null);
                                      }}
                                      className="h-8 text-xs border-none bg-transparent shadow-none focus-visible:ring-0 p-0"
                                    />
                                  </div>
                                  <Button 
                                    size="sm" 
                                    className="h-8 w-8 rounded-xl px-0 shrink-0"
                                    onClick={(e) => { e.stopPropagation(); handleAddSubtask(task.id); }}
                                    disabled={!newSubtaskTitles[task.id]?.trim()}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
