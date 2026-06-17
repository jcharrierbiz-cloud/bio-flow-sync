import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Clock, Flag, Zap, BatteryLow } from "lucide-react";
import { useTodoStore, TodoItem } from "@/lib/todoStore";
import { useAgendaStore } from "@/lib/agendaStore";

const categoryDot: Record<string, string> = {
  Perso: "bg-ai-violet",
  Sport: "bg-energy",
  Travail: "bg-warning",
  Santé: "bg-primary",
  Repas: "bg-primary",
  Autre: "bg-muted-foreground",
};

const categoryChip: Record<string, string> = {
  Perso: "bg-ai-violet/15 text-ai-violet border-ai-violet/25",
  Sport: "bg-energy/15 text-energy border-energy/25",
  Travail: "bg-warning/15 text-warning border-warning/25",
  Santé: "bg-primary/15 text-primary border-primary/25",
  Repas: "bg-primary/15 text-primary border-primary/25",
  Autre: "bg-secondary text-secondary-foreground border-border",
};

const weekdays = ["L", "M", "M", "J", "V", "S", "D"];
const monthNames = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Build a 6x7 grid starting on Monday for the given month
function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // JS: 0=Sun..6=Sat → convert so Monday=0
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toLocalKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const priorityColors: Record<string, string> = {
  high: "text-intensity",
  medium: "text-warning",
  low: "text-muted-foreground",
};

const AgendaCalendar = () => {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);

  const { todos, addTodo, removeTodo } = useTodoStore();
  const { tasks: agendaTasks } = useAgendaStore();

  // Group todos by local date key
  const todosByDay = useMemo(() => {
    const map = new Map<string, TodoItem[]>();
    for (const t of todos) {
      if (!t.scheduledAt) continue;
      const d = new Date(t.scheduledAt);
      const key = toLocalKey(d);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [todos]);

  const grid = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => {
    const t = new Date();
    setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelected(t);
  };

  // Quick add for selected day
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Perso");
  const [time, setTime] = useState("09:00");

  const handleAdd = () => {
    if (!title.trim()) return;
    const [h, m] = time.split(":").map(Number);
    const d = new Date(selected);
    d.setHours(h || 9, m || 0, 0, 0);
    addTodo(title.trim(), category, d.toISOString());
    setTitle("");
    setShowAdd(false);
  };

  const selectedKey = toLocalKey(selected);
  const dayTodos = todosByDay.get(selectedKey) ?? [];
  const isTodaySelected = sameDay(selected, today);

  return (
    <div className="space-y-4">
      {/* Month header */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="text-center">
            <h2 className="text-base font-semibold text-foreground">
              {monthNames[cursor.getMonth()]} {cursor.getFullYear()}
            </h2>
            <button
              onClick={goToday}
              className="text-[10px] text-energy hover:underline mt-0.5"
            >
              Aujourd'hui
            </button>
          </div>
          <button
            onClick={goNext}
            className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-1">
          {weekdays.map((w, i) => (
            <div
              key={i}
              className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1"
            >
              {w}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const isSelected = sameDay(d, selected);
            const items = todosByDay.get(toLocalKey(d)) ?? [];
            return (
              <button
                key={i}
                onClick={() => setSelected(d)}
                className={`relative aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-all border
                  ${isSelected
                    ? "bg-energy/15 border-energy/50 ring-1 ring-energy/40"
                    : isToday
                    ? "bg-energy/5 border-energy/30"
                    : "bg-muted/20 border-transparent hover:border-glass-border"}
                  ${!inMonth ? "opacity-30" : ""}`}
              >
                <span
                  className={`text-[11px] font-medium ${
                    isToday ? "text-energy" : "text-foreground"
                  }`}
                >
                  {d.getDate()}
                </span>
                {/* Category dots */}
                {items.length > 0 && (
                  <div className="flex gap-0.5 mt-auto mb-0.5 flex-wrap justify-center">
                    {items.slice(0, 3).map((it) => (
                      <span
                        key={it.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          categoryDot[it.category] || categoryDot.Autre
                        }`}
                      />
                    ))}
                    {items.length > 3 && (
                      <span className="text-[8px] text-muted-foreground leading-none">
                        +{items.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {isTodaySelected ? "Aujourd'hui" : "Sélection"}
            </p>
            <h3 className="text-sm font-semibold text-foreground capitalize">
              {selected.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="w-8 h-8 rounded-full bg-energy/15 flex items-center justify-center hover:bg-energy/25 transition-colors"
          >
            {showAdd ? <X className="w-4 h-4 text-energy" /> : <Plus className="w-4 h-4 text-energy" />}
          </button>
        </div>

        {showAdd && (
          <div className="space-y-2 border border-border rounded-xl p-3 bg-muted/30 animate-fade-in">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Nouvelle tâche..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-energy"
            />
            <div className="flex gap-2 items-center">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-energy"
              />
              <div className="flex gap-1 flex-wrap flex-1">
                {Object.keys(categoryChip).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                      category === c
                        ? categoryChip[c]
                        : "bg-secondary/40 text-muted-foreground border-transparent"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={!title.trim()}
              className="w-full py-2 rounded-lg bg-energy text-primary-foreground text-xs font-semibold hover:bg-energy/90 transition-colors disabled:opacity-40"
            >
              Ajouter
            </button>
          </div>
        )}

        {/* Day's tasks */}
        {dayTodos.length === 0 && !showAdd && (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Aucune tâche planifiée ce jour.
          </p>
        )}

        {dayTodos
          .slice()
          .sort((a, b) => (a.scheduledAt || "").localeCompare(b.scheduledAt || ""))
          .map((t) => {
            const d = t.scheduledAt ? new Date(t.scheduledAt) : null;
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 border border-glass-border group"
              >
                <span
                  className={`w-1 h-10 rounded-full ${
                    categoryDot[t.category] || categoryDot.Autre
                  }`}
                />
                <div className="min-w-[44px]">
                  <span className="mono text-xs font-medium text-foreground">
                    {d
                      ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                      : "--:--"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-foreground truncate ${t.done ? "line-through opacity-60" : ""}`}>
                    {t.title}
                  </p>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                      categoryChip[t.category] || categoryChip.Autre
                    }`}
                  >
                    {t.category}
                  </span>
                </div>
                <button
                  onClick={() => removeTodo(t.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            );
          })}

        {/* Today's planned bio-rhythm agenda (read-only sample) */}
        {isTodaySelected && (
          <div className="pt-2 mt-2 border-t border-glass-border space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Rythme suggéré
            </p>
            {agendaTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 py-1.5">
                <span className="mono text-[11px] text-muted-foreground min-w-[40px]">
                  {task.time}
                </span>
                <span className="flex-1 text-xs text-foreground truncate">{task.title}</span>
                <span
                  className={`text-[9px] flex items-center gap-0.5 ${priorityColors[task.priority]}`}
                >
                  <Flag className="w-2.5 h-2.5" />
                </span>
                <span
                  className={`text-[9px] ${
                    task.energy === "high" ? "text-intensity" : "text-energy"
                  }`}
                >
                  {task.energy === "high" ? (
                    <Zap className="w-2.5 h-2.5" />
                  ) : (
                    <BatteryLow className="w-2.5 h-2.5" />
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgendaCalendar;
