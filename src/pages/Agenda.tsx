import { Sparkles, Zap, BatteryLow, Clock, Flag } from "lucide-react";
import { useAgendaStore, defaultTasks } from "@/lib/agendaStore";
import AgendaTodoList from "@/components/AgendaTodoList";

const optimizedTasks = [
  { id: 1, time: "09:00", duration: "1h30", title: "Deep Work — Maquettes", priority: "high" as const, energy: "high" as const, category: "Travail" },
  { id: 2, time: "10:30", duration: "1h30", title: "Réunion Stratégie Q1", priority: "high" as const, energy: "high" as const, category: "Travail" },
  { id: 3, time: "12:00", duration: "1h", title: "Déjeuner", priority: "low" as const, energy: "low" as const, category: "Repas" },
  { id: 4, time: "13:30", duration: "30min", title: "Marche rapide", priority: "low" as const, energy: "low" as const, category: "Sport" },
  { id: 5, time: "14:00", duration: "45min", title: "Rédaction rapport", priority: "medium" as const, energy: "low" as const, category: "Travail" },
  { id: 6, time: "15:30", duration: "1h", title: "Code Review", priority: "medium" as const, energy: "low" as const, category: "Travail" },
  { id: 7, time: "17:30", duration: "45min", title: "HIIT Training", priority: "medium" as const, energy: "high" as const, category: "Sport" },
];

const priorityColors: Record<string, string> = {
  high: "text-intensity",
  medium: "text-warning",
  low: "text-muted-foreground",
};

const Agenda = () => {
  const { tasks, optimized, setTasks, setOptimized } = useAgendaStore();

  const handleOptimize = () => {
    if (optimized) {
      setTasks(defaultTasks);
      setOptimized(false);
    } else {
      setTasks(optimizedTasks);
      setOptimized(true);
    }
  };

  return (
    <div className="px-5 pt-12 pb-24 max-w-lg mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">Aujourd'hui</p>
          <h1 className="text-xl font-bold text-foreground mt-0.5">Mon Agenda</h1>
        </div>
        <button
          onClick={handleOptimize}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            optimized
              ? "bg-ai-violet/15 text-ai-violet border border-ai-violet/25"
              : "bg-ai-violet/10 text-ai-violet border border-ai-violet/15 hover:bg-ai-violet/20"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {optimized ? "Réinitialiser" : "Optimiser IA"}
        </button>
      </div>

      {optimized && (
        <div className="glass-card p-3 border-ai-violet/20 glow-violet">
          <p className="text-xs text-secondary-foreground">
            <Sparkles className="w-3 h-3 text-ai-violet inline mr-1" />
            Agenda réorganisé : tâches énergivores déplacées dans ta fenêtre de performance (9h-11h).
          </p>
        </div>
      )}

      {/* To-Do List (replaces weekly chart) */}
      <AgendaTodoList />

      {/* Agenda tasks */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="glass-card p-4 flex gap-4 items-start">
            <div className="flex flex-col items-center min-w-[44px]">
              <span className="mono text-sm font-medium text-foreground">{task.time}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> {task.duration}
              </span>
            </div>
            <div className="w-px h-full min-h-[40px] bg-glass-border self-stretch" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground truncate">{task.title}</h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {task.category}
                </span>
                <span className={`text-[10px] flex items-center gap-0.5 ${priorityColors[task.priority]}`}>
                  <Flag className="w-2.5 h-2.5" /> {task.priority === "high" ? "Haute" : task.priority === "medium" ? "Moyenne" : "Basse"}
                </span>
                <span className={`text-[10px] flex items-center gap-0.5 ${task.energy === "high" ? "text-intensity" : "text-energy"}`}>
                  {task.energy === "high" ? <Zap className="w-2.5 h-2.5" /> : <BatteryLow className="w-2.5 h-2.5" />}
                  {task.energy === "high" ? "High Energy" : "Low Energy"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Agenda;
