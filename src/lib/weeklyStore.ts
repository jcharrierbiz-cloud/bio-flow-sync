import { create } from "zustand";

export interface DayLog {
  date: string; // YYYY-MM-DD
  agendaDone: number;
  agendaTotal: number;
  todosDone: number;
  todosTotal: number;
  sportDone: boolean;
}

interface WeeklyStore {
  days: DayLog[];
  logDay: (log: DayLog) => void;
}

const loadWeek = (): DayLog[] => {
  try {
    const raw = localStorage.getItem("bioflow_weekly");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveWeek = (days: DayLog[]) => {
  localStorage.setItem("bioflow_weekly", JSON.stringify(days));
};

const today = () => new Date().toISOString().slice(0, 10);

export const useWeeklyStore = create<WeeklyStore>((set, get) => ({
  days: loadWeek(),
  logDay: (log) => {
    const existing = get().days.filter((d) => d.date !== log.date);
    const next = [...existing, log].slice(-7);
    saveWeek(next);
    set({ days: next });
  },
}));

export const getWeekDays = (): string[] => {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};
