import { create } from "zustand";

export interface TodoItem {
  id: string;
  title: string;
  category: string;
  done: boolean;
  createdAt: string;
  scheduledAt?: string; // ISO datetime string for Focus Lock trigger
}

interface TodoStore {
  todos: TodoItem[];
  addTodo: (title: string, category: string, scheduledAt?: string) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
}

const loadTodos = (): TodoItem[] => {
  try {
    const raw = localStorage.getItem("bioflow_todos");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveTodos = (todos: TodoItem[]) => {
  localStorage.setItem("bioflow_todos", JSON.stringify(todos));
};

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
      t.id === id ? { ...t, done: !t.done } : t
    );
    saveTodos(next);
    set({ todos: next });
  },
  removeTodo: (id) => {
    const next = get().todos.filter((t) => t.id !== id);
    saveTodos(next);
    set({ todos: next });
  },
}));
