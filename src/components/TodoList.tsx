import { useState } from "react";
import { useTodoStore } from "@/lib/todoStore";
import { Plus, X, CheckCircle2, Circle } from "lucide-react";

const categories = ["Perso", "Sport", "Travail", "Santé", "Autre"];

const categoryColors: Record<string, string> = {
  Perso: "bg-ai-violet/15 text-ai-violet",
  Sport: "bg-energy/15 text-energy",
  Travail: "bg-warning/15 text-warning",
  Santé: "bg-primary/15 text-primary",
  Autre: "bg-secondary text-secondary-foreground",
};

const TodoList = () => {
  const { todos, addTodo, toggleTodo, removeTodo } = useTodoStore();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Perso");
  const [showForm, setShowForm] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTodos = todos.filter(
    (t) => t.createdAt.slice(0, 10) === todayStr
  );
  const donePct =
    todayTodos.length > 0
      ? Math.round(
          (todayTodos.filter((t) => t.done).length / todayTodos.length) * 100
        )
      : 0;

  const handleAdd = () => {
    if (!title.trim()) return;
    addTodo(title.trim(), category);
    setTitle("");
    setShowForm(false);
  };

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Ma To-Do</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {todayTodos.filter((t) => t.done).length}/{todayTodos.length}{" "}
            terminées · {donePct}%
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-8 h-8 rounded-xl bg-energy/10 flex items-center justify-center hover:bg-energy/20 transition-colors"
        >
          <Plus className="w-4 h-4 text-energy" />
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="space-y-2 animate-fade-in">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nouvelle tâche..."
            className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-energy"
          />
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
          <button
            onClick={handleAdd}
            className="w-full py-2 rounded-xl bg-energy/15 text-energy text-xs font-semibold hover:bg-energy/25 transition-colors"
          >
            Ajouter
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {todayTodos.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucune tâche pour aujourd'hui
          </p>
        )}
        {todayTodos.map((todo) => (
          <div
            key={todo.id}
            className="flex items-center gap-3 py-2 px-1 group"
          >
            <button
              onClick={() => toggleTodo(todo.id)}
              className="shrink-0"
            >
              {todo.done ? (
                <CheckCircle2 className="w-4.5 h-4.5 text-energy" />
              ) : (
                <Circle className="w-4.5 h-4.5 text-muted-foreground" />
              )}
            </button>
            <span
              className={`flex-1 text-sm transition-all ${
                todo.done
                  ? "line-through text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {todo.title}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                categoryColors[todo.category] || categoryColors["Autre"]
              }`}
            >
              {todo.category}
            </span>
            <button
              onClick={() => removeTodo(todo.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodoList;
