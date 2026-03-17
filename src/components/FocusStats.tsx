import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Timer, Target, Flame } from "lucide-react";

interface Stats {
  totalMinutes: number;
  completionRate: number;
  streak: number;
}

const FocusStats = () => {
  const [stats, setStats] = useState<Stats>({ totalMinutes: 0, completionRate: 0, streak: 0 });

  useEffect(() => {
    const load = async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data } = await supabase
        .from("focus_sessions")
        .select("*")
        .gte("started_at", weekAgo.toISOString())
        .order("started_at", { ascending: false });

      if (!data || data.length === 0) return;

      const totalSecs = data.reduce((s, r) => s + (r.duration_seconds || 0), 0);
      const completed = data.filter((r) => r.completed).length;
      const rate = Math.round((completed / data.length) * 100);

      // Streak: consecutive days with >=1 completed session
      const today = new Date();
      let streak = 0;
      for (let d = 0; d < 30; d++) {
        const day = new Date(today);
        day.setDate(day.getDate() - d);
        const dayStr = day.toISOString().slice(0, 10);
        const hasCompleted = data.some(
          (r) => r.completed && r.started_at?.slice(0, 10) === dayStr
        );
        if (hasCompleted) streak++;
        else if (d > 0) break; // allow today to be incomplete
      }

      setStats({ totalMinutes: Math.round(totalSecs / 60), completionRate: rate, streak });
    };
    load();
  }, []);

  return (
    <div className="glass-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Timer className="w-4 h-4 text-energy" />
        Focus Stats
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 text-center">
          <span className="mono text-lg font-bold text-foreground block">
            {stats.totalMinutes < 60
              ? `${stats.totalMinutes}m`
              : `${(stats.totalMinutes / 60).toFixed(1)}h`}
          </span>
          <span className="text-[10px] text-muted-foreground">Cette semaine</span>
        </div>
        <div className="glass-card p-3 text-center">
          <span className="mono text-lg font-bold text-foreground block flex items-center justify-center gap-1">
            <Target className="w-3.5 h-3.5 text-energy" />
            {stats.completionRate}%
          </span>
          <span className="text-[10px] text-muted-foreground">Complétion</span>
        </div>
        <div className="glass-card p-3 text-center">
          <span className="mono text-lg font-bold text-foreground block flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-intensity" />
            {stats.streak}j
          </span>
          <span className="text-[10px] text-muted-foreground">Série</span>
        </div>
      </div>
    </div>
  );
};

export default FocusStats;
