import { useMemo, useState } from "react";
import { useTodoStore, TodoItem } from "@/lib/todoStore";
import { Plus, X, CheckCircle2, Circle, Clock, Lock, Pencil, ChevronDown, ChevronUp, CalendarIcon } from "lucide-react";
import { useRewardStore, fireTaskConfetti, fireDailyCompletion } from "@/lib/rewardStore";
import { ACTIVE_GROUP_ORDER, GROUP_LABELS, groupTodos } from "@/lib/taskStats";
import OverdueTasks from "@/components/OverdueTasks";

const categories = ["Perso", "Sport", "Travail", "Santé", "Autre"];

const categoryColors: Record<string, string> = {
  Perso: "bg-ai-violet/15 text-ai-violet",
  Sport: "bg-energy/15 text-energy",
  Travail: "bg-warning/15 text-warning",
  Santé: "bg-primary/15 text-primary",
  Autre: "bg-secondary text-secondary-foreground",
};

const AgendaTodoList = () => {
  const { todos, addTodo, toggleTodo, removeTodo } = useTodoStore();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Perso");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [focusLock, setFocusLock] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDone, setShowDone] = useState(false);

  // Le tri (dont l'extraction du retard) vit dans taskStats — testé à part.
  const groups = useMemo(() => groupTodos(todos), [todos]);
  const doneTodos = groups.done;
  // « Actives » = ce qui est encore à l'ordre du jour, retard exclu : une tâche
  // périmée ne doit ni remonter en haut de page, ni déclencher la fête du soir.
  const activeTodos = ACTIVE_GROUP_ORDER.flatMap((g) => groups[g]);

  const handleAdd = () => {
    if (!title.trim()) return;
    const scheduledAt =
      scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : scheduledDate
        ? new Date(`${scheduledDate}T09:00`).toISOString()
        : undefined;
    addTodo(title.trim(), category, scheduledAt);
    setTitle("");
    setScheduledDate("");
    setScheduledTime("");
    setFocusLock(false);
    setShowForm(false);
  };

  const handleToggle = (todo: TodoItem) => {
    const wasDone = todo.done;
    toggleTodo(todo.id);
    if (!wasDone) {
      fireTaskConfetti();
      useRewardStore.getState().addXP(10);
      useRewardStore.getState().checkStreak();
      const allDone = activeTodos.every((t) => t.id === todo.id || t.done);
      if (allDone && activeTodos.length > 1) {
        setTimeout(() => {
          fireDailyCompletion();
          useRewardStore.getState().addXP(50);
        }, 1000);
      }
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Mes tâches</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-8 h-8 rounded-full bg-energy/15 flex items-center justify-center hover:bg-energy/25 transition-colors"
        >
          {showForm ? <X className="w-4 h-4 text-energy" /> : <Plus className="w-4 h-4 text-energy" />}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="space-y-3 animate-fade-in border border-border rounded-xl p-4 bg-muted/30">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nom de la tâche..."
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-energy"
          />

          {/* Date & time */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <CalendarIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-energy"
              />
            </div>
            {scheduledDate && (
              <div className="flex-1 relative">
                <Clock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-energy"
                />
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${
                  category === c
                    ? categoryColors[c] + " ring-1 ring-current"
                    : "bg-secondary/50 text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Focus Lock toggle */}
          {scheduledDate && scheduledTime && (
            <button
              onClick={() => setFocusLock(!focusLock)}
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition-all ${
                focusLock
                  ? "bg-energy/15 text-energy ring-1 ring-energy/30"
                  : "bg-secondary/50 text-muted-foreground"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Focus Lock (15 min)
            </button>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!title.trim()}
              className="flex-1 py-2.5 rounded-xl bg-energy text-primary-foreground text-xs font-semibold hover:bg-energy/90 transition-colors disabled:opacity-40"
            >
              Ajouter
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {activeTodos.length === 0 &&
        doneTodos.length === 0 &&
        groups.overdue.length === 0 &&
        groups.setAside.length === 0 &&
        !showForm && (
        <div className="flex flex-col items-center py-8 text-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-3 text-energy/30">
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M16 24l5 5 11-11" stroke="hsl(175, 80%, 45%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm text-muted-foreground">Aucune tâche — profite ou planifie 🎯</p>
          </div>
        )}

      {/* Grouped tasks — le retard est volontairement absent d'ici */}
      {ACTIVE_GROUP_ORDER.map((group) => {
        const items = groups[group];
        if (!items || items.length === 0) return null;
        return (
          <div key={group} className="space-y-1.5">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{GROUP_LABELS[group]}</h3>
            {items.map((todo) => (
              <div key={todo.id} className="flex items-center gap-3 py-2 px-1 group">
                <button onClick={() => handleToggle(todo)} className="shrink-0">
                  <Circle className="w-[18px] h-[18px] text-muted-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground block truncate">{todo.title}</span>
                  {todo.scheduledAt && (
                    <span className="text-[9px] text-energy bg-energy/10 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(todo.scheduledAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      {" "}
                      {new Date(todo.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${categoryColors[todo.category] || categoryColors["Autre"]}`}>
                  {todo.category}
                </span>
                {todo.scheduledAt && <Lock className="w-3 h-3 text-energy/40" />}
                <button onClick={() => removeTodo(todo.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {/* Espace « À rattraper » — volontairement sous les tâches à venir */}
      <OverdueTasks overdue={groups.overdue} setAside={groups.setAside} />

      {/* Completed tasks */}
      {doneTodos.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone(!showDone)}
            className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {showDone ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span className="font-semibold uppercase tracking-wider">Terminées ({doneTodos.length})</span>
          </button>
          {showDone && (
            <div className="space-y-1 mt-2">
              {doneTodos.map((todo) => (
                <div key={todo.id} className="flex items-center gap-3 py-1.5 px-1 group">
                  <button onClick={() => handleToggle(todo)} className="shrink-0">
                    <CheckCircle2 className="w-[18px] h-[18px] text-energy" />
                  </button>
                  <span className="text-sm text-muted-foreground line-through flex-1 truncate">{todo.title}</span>
                  <button onClick={() => removeTodo(todo.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgendaTodoList;
