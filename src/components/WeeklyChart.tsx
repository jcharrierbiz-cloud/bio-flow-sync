// @ts-nocheck
import { useWeeklyStore, getWeekDays, computeDayPct, DayLog } from "@/lib/weeklyStore";
import { useTodoStore } from "@/lib/todoStore";
import { useAgendaStore } from "@/lib/agendaStore";
import { useScanStore } from "@/lib/scanStore";
import { useSleepStore } from "@/lib/sleepStore";
import { CheckCircle2, Dumbbell, ListChecks, Moon, ScanLine, Apple } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const dayLabels = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const WeeklyChart = () => {
  const { days, logDay } = useWeeklyStore();
  const todos = useTodoStore((s) => s.todos);
  const tasks = useAgendaStore((s) => s.tasks);
  const morningScan = useScanStore((s) => s.morningScan);
  const additionalScans = useScanStore((s) => s.additionalScans);
  const sleepQuality = useSleepStore((s) => s.quality);
  const sleepHours = useSleepStore((s) => s.totalHours);
  const [nutritionChecked, setNutritionChecked] = useState(false);

  // Check if nutrition was logged today
  useEffect(() => {
    const checkNutrition = async () => {
      const deviceId = localStorage.getItem("bioflow_device_id");
      if (!deviceId) return;
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("daily_nutrition_logs")
        .select("checked")
        .eq("device_id", deviceId)
        .eq("log_date", todayStr)
        .eq("checked", true);
      setNutritionChecked((data?.length ?? 0) > 0);
    };
    checkNutrition();
  }, []);

  // Auto-log today
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const sportTasks = tasks.filter((t) => t.category === "Sport");
    const todayTodos = todos.filter(
      (t) => t.createdAt.slice(0, 10) === todayStr
    );

    const scanDone = !!(morningScan || additionalScans.length > 0);
    const sleepLogged = !!(sleepQuality || sleepHours !== 6.2);

    logDay({
      date: todayStr,
      agendaDone: 0,
      agendaTotal: tasks.length,
      todosDone: todayTodos.filter((t) => t.done).length,
      todosTotal: todayTodos.length,
      sportDone: sportTasks.length > 0,
      sleepLogged,
      scanDone,
      nutritionDone: nutritionChecked,
    });
  }, [todos, tasks, morningScan, additionalScans, sleepQuality, sleepHours, nutritionChecked]);

  const weekDays = getWeekDays();
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const todayStr = new Date().toISOString().slice(0, 10);

  // Stats
  const completedDays = weekDays.filter((d) => {
    const pct = computeDayPct(dayMap.get(d));
    return pct > 0;
  }).length;

  const sportDays = weekDays.filter((d) => dayMap.get(d)?.sportDone).length;
  const scanDays = weekDays.filter((d) => dayMap.get(d)?.scanDone).length;

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

          const pct = computeDayPct(log);
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
                    background:
                      pct >= 80
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
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <ListChecks className="w-3 h-3 text-energy" /> Tâches
        </span>
        <span className="flex items-center gap-1">
          <Moon className="w-3 h-3 text-ai-violet" /> Sommeil
        </span>
        <span className="flex items-center gap-1">
          <ScanLine className="w-3 h-3 text-energy" /> {scanDays} scans
        </span>
        <span className="flex items-center gap-1">
          <Dumbbell className="w-3 h-3 text-ai-violet" /> {sportDays} sport
        </span>
      </div>
    </div>
  );
};

export default WeeklyChart;
