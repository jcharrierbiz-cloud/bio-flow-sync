import { create } from "zustand";

export interface Task {
  id: number;
  time: string;
  duration: string;
  title: string;
  priority: "high" | "medium" | "low";
  energy: "high" | "low";
  category: string;
}

export const defaultTasks: Task[] = [
  { id: 1, time: "09:00", duration: "1h30", title: "Réunion Stratégie Q1", priority: "high", energy: "high", category: "Travail" },
  { id: 2, time: "10:30", duration: "45min", title: "Rédaction rapport", priority: "medium", energy: "high", category: "Travail" },
  { id: 3, time: "12:00", duration: "1h", title: "Déjeuner", priority: "low", energy: "low", category: "Repas" },
  { id: 4, time: "13:30", duration: "1h", title: "Code Review", priority: "medium", energy: "high", category: "Travail" },
  { id: 5, time: "15:00", duration: "30min", title: "Marche rapide", priority: "low", energy: "low", category: "Sport" },
  { id: 6, time: "16:00", duration: "1h30", title: "Deep Work — Maquettes", priority: "high", energy: "high", category: "Travail" },
  { id: 7, time: "18:00", duration: "45min", title: "HIIT Training", priority: "medium", energy: "high", category: "Sport" },
];

interface AgendaStore {
  tasks: Task[];
  optimized: boolean;
  setTasks: (tasks: Task[]) => void;
  setOptimized: (v: boolean) => void;
}

export const useAgendaStore = create<AgendaStore>((set) => ({
  tasks: defaultTasks,
  optimized: false,
  setTasks: (tasks) => set({ tasks }),
  setOptimized: (optimized) => set({ optimized }),
}));
