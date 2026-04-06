import { create } from "zustand";

export interface DayLog {
  date: string; // YYYY-MM-DD
  agendaDone: number;
  agendaTotal: number;
  todosDone: number;
  todosTotal: number;
  sportDone: boolean;
  sleepLogged: boolean;
  scanDone: boolean;
  nutritionDone: boolean;
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

/** Compute a global completion percentage for a day log */
export function computeDayPct(log: DayLog | undefined): number {
  if (!log) return 0;

  // Each "pillar" contributes equally: tasks, sleep, scan, nutrition, sport
  const pillars: number[] = [];

  // Tasks (todos) completion ratio
  if (log.todosTotal > 0) {
    pillars.push(log.todosDone / log.todosTotal);
  }

  // Sleep logged (binary)
  pillars.push(log.sleepLogged ? 1 : 0);

  // Scan done (binary)
  pillars.push(log.scanDone ? 1 : 0);

  // Nutrition done (binary)
  pillars.push(log.nutritionDone ? 1 : 0);

  // Sport done (binary)
  pillars.push(log.sportDone ? 1 : 0);

  if (pillars.length === 0) return 0;
  const avg = pillars.reduce((a, b) => a + b, 0) / pillars.length;
  return Math.round(avg * 100);
}
