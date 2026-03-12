import { useWeeklyStore, getWeekDays, DayLog } from "@/lib/weeklyStore";
import { useTodoStore } from "@/lib/todoStore";
import { useAgendaStore } from "@/lib/agendaStore";
import { CheckCircle2, Dumbbell, ListChecks } from "lucide-react";
import { useEffect } from "react";

const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const WeeklyChart = () => {
  const { days, logDay } = useWeeklyStore();
  const todos = useTodoStore((s) => s.todos);
  const tasks = useAgendaStore((s) => s.tasks);

  // Auto-log today
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const sportTasks = tasks.filter((t) => t.category === "Sport");
    const todayTodos = todos.filter(
      (t) => t.createdAt.slice(0, 10) === todayStr
    );

    logDay({
      date: todayStr,
      agendaDone: 0,
      agendaTotal: tasks.length,
      todosDone: todayTodos.filter((t) => t.done).length,
      todosTotal: todayTodos.length,
      sportDone: sportTasks.length > 0,
    });
  }, [todos, tasks]);

  const weekDays = getWeekDays();
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const todayStr = new Date().toISOString().slice(0, 10);

  // Stats
  const completedDays = weekDays.filter((d) => {
    const log = dayMap.get(d);
    return log && (log.todosDone > 0 || log.sportDone);
  }).length;

  const sportDays = weekDays.filter((d) => dayMap.get(d)?.sportDone).length;

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Bilan Hebdomadaire
        </h2>
        <span className="text-[10px] text-energy font-medium bg-energy/10 px-2 py-0.5 rounded-full">
          {completedDays}/7 jours actifs
        </span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-2 h-28">
        {weekDays.map((dateStr) => {
          const log = dayMap.get(dateStr);
          const d = new Date(dateStr);
          const label = dayLabels[d.getDay()];
          const isToday = dateStr === todayStr;

          const total =
            (log?.agendaTotal || 0) + (log?.todosTotal || 0) || 1;
          const done = (log?.agendaDone || 0) + (log?.todosDone || 0);
          const pct = Math.round((done / total) * 100);
          const barH = Math.max(8, pct);

          return (
            <div
              key={dateStr}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-[9px] text-muted-foreground mono">
                {pct}%
              </span>
              <div className="w-full flex justify-center">
                <div
                  className="rounded-md transition-all duration-500"
                  style={{
                    height: `${barH}px`,
                    width: "100%",
                    maxWidth: "28px",
                    background: log?.sportDone
                      ? `linear-gradient(to top, hsl(var(--energy)), hsl(var(--ai-violet)))`
                      : pct > 0
                      ? `hsl(var(--energy) / 0.6)`
                      : `hsl(var(--muted))`,
                  }}
                />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isToday ? "text-energy" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ListChecks className="w-3 h-3 text-energy" /> Tâches
        </span>
        <span className="flex items-center gap-1">
          <Dumbbell className="w-3 h-3 text-ai-violet" /> Sport
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-energy" /> {sportDays} séances
        </span>
      </div>
    </div>
  );
};

export default WeeklyChart;
