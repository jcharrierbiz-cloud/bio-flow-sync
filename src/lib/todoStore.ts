import { create } from "zustand";
import { dayKey, dayKeyOf, parseDayKey } from "./dateUtils";

export interface TodoItem {
  id: string;
  title: string;
  category: string;
  done: boolean;
  createdAt: string;
  scheduledAt?: string; // ISO datetime string for Focus Lock trigger
  /** Date de réalisation (ISO). Renseignée au moment où la tâche est cochée. */
  completedAt?: string;
  /** « Je la laisse là » : tâche en retard assumée, elle ne relance plus. */
  setAside?: boolean;
  /** Nombre de reprogrammations — utile pour repérer ce qui n'avance jamais. */
  rescheduledCount?: number;
}

interface TodoStore {
  todos: TodoItem[];
  addTodo: (title: string, category: string, scheduledAt?: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  /** Reprogramme une tâche à une date/heure donnée (et lève le « laissée de côté »). */
  rescheduleTodo: (id: string, scheduledAt: string) => void;
  /** Reprogramme à un jour "AAAA-MM-JJ" en conservant l'heure d'origine. */
  rescheduleToDay: (id: string, day: string) => void;
  /** Marque (ou démarque) une tâche en retard comme assumée. */
  setAsideTodo: (id: string, setAside: boolean) => void;
}

const STORAGE_KEY = "bioflow_todos";

/**
 * Migration **non destructive** des tâches déjà enregistrées.
 *
 * Les champs `completedAt` / `setAside` / `rescheduledCount` sont arrivés après
 * la première version du store : on complète les anciennes lignes sans jamais
 * en supprimer. Pour une tâche cochée avant cette migration, la date de
 * réalisation est inconnue — on retombe sur `createdAt` et l'écran Bilan
 * signale l'approximation plutôt que d'inventer une date.
 */
export function migrateTodos(raw: unknown): { todos: TodoItem[]; changed: boolean } {
  if (!Array.isArray(raw)) return { todos: [], changed: false };
  let changed = false;

  const todos = raw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
    .map((t) => {
      const todo: TodoItem = {
        id: String(t.id ?? crypto.randomUUID()),
        title: String(t.title ?? ""),
        category: String(t.category ?? "Autre"),
        done: Boolean(t.done),
        createdAt: typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
        scheduledAt: typeof t.scheduledAt === "string" ? t.scheduledAt : undefined,
        completedAt: typeof t.completedAt === "string" ? t.completedAt : undefined,
        setAside: t.setAside === true ? true : undefined,
        rescheduledCount:
          typeof t.rescheduledCount === "number" ? t.rescheduledCount : undefined,
      };
      if (todo.done && !todo.completedAt) {
        todo.completedAt = todo.createdAt;
        changed = true;
      }
      if (!t.id) changed = true;
      return todo;
    });

  return { todos, changed };
}

const loadTodos = (): TodoItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const { todos, changed } = migrateTodos(JSON.parse(raw));
    if (changed) saveTodos(todos);
    return todos;
  } catch {
    return [];
  }
};

const saveTodos = (todos: TodoItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // Stockage plein ou bloqué : l'état reste au moins cohérent en mémoire.
  }
};

/**
 * Construit la nouvelle date planifiée en gardant l'heure existante.
 * Sans heure d'origine connue, on retient 09:00 (même défaut que la saisie).
 */
export function rescheduleIsoForDay(todo: TodoItem, day: string): string {
  const target = parseDayKey(day);
  const previous = todo.scheduledAt ? new Date(todo.scheduledAt) : null;
  const hours = previous && !Number.isNaN(previous.getTime()) ? previous.getHours() : 9;
  const minutes = previous && !Number.isNaN(previous.getTime()) ? previous.getMinutes() : 0;
  target.setHours(hours, minutes, 0, 0);
  return target.toISOString();
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: loadTodos(),
  addTodo: (title, category, scheduledAt) => {
    const todo: TodoItem = {
      id: crypto.randomUUID(),
      title,
      category,
      done: false,
      createdAt: new Date().toISOString(),
      scheduledAt,
    };
    const next = [...get().todos, todo];
    saveTodos(next);
    set({ todos: next });
  },
  toggleTodo: (id) => {
    const next = get().todos.map((t) =>
      t.id === id
        ? {
            ...t,
            done: !t.done,
            // Coché → on horodate ; décoché → on efface pour ne pas fausser le bilan.
            completedAt: !t.done ? new Date().toISOString() : undefined,
          }
        : t
    );
    saveTodos(next);
    set({ todos: next });
  },
  removeTodo: (id) => {
    const next = get().todos.filter((t) => t.id !== id);
    saveTodos(next);
    set({ todos: next });
  },
  rescheduleTodo: (id, scheduledAt) => {
    const next = get().todos.map((t) =>
      t.id === id
        ? {
            ...t,
            scheduledAt,
            setAside: undefined,
            rescheduledCount: (t.rescheduledCount ?? 0) + 1,
          }
        : t
    );
    saveTodos(next);
    set({ todos: next });
  },
  rescheduleToDay: (id, day) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    get().rescheduleTodo(id, rescheduleIsoForDay(todo, day));
  },
  setAsideTodo: (id, setAside) => {
    const next = get().todos.map((t) =>
      t.id === id ? { ...t, setAside: setAside || undefined } : t
    );
    saveTodos(next);
    set({ todos: next });
  },
}));

/** Rappel : les tâches du jour encore ouvertes (utilisé par les notifications). */
export function todosDueToday(todos: TodoItem[], now: Date = new Date()): TodoItem[] {
  const today = dayKey(now);
  return todos.filter((t) => !t.done && dayKeyOf(t.scheduledAt) === today);
}
