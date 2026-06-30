import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FocusStats {
  todaySeconds: number;
  weekSeconds: number;
  totalSeconds: number;
  sessionCount: number;
  completedCount: number;
  completionRate: number;
  avgSeconds: number;
  longestSeconds: number;
  currentStreak: number;
  last7Days: { date: string; seconds: number }[];
}

const EMPTY: FocusStats = {
  todaySeconds: 0,
  weekSeconds: 0,
  totalSeconds: 0,
  sessionCount: 0,
  completedCount: 0,
  completionRate: 0,
  avgSeconds: 0,
  longestSeconds: 0,
  currentStreak: 0,
  last7Days: [],
};

const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function useFocusStats() {
  const [stats, setStats] = useState<FocusStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setStats(EMPTY);
      setLoading(false);
      return;
    }

    const since = new Date();
    since.setDate(since.getDate() - 180);

    const { data, error } = await supabase
      .from("focus_sessions")
      .select("started_at, duration_seconds, completed")
      .eq("user_id", user.id)
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false });

    if (error || !data) {
      setStats(EMPTY);
      setLoading(false);
      return;
    }

    const now = new Date();
    const todayKey = key(now);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    let totalSeconds = 0, todaySeconds = 0, weekSeconds = 0, longestSeconds = 0, completedCount = 0;
    const completedDays = new Set<string>();
    const buckets = new Map<string, number>();

    for (const r of data) {
      const dur = r.duration_seconds ?? 0;
      const d = new Date(r.started_at);
      const k = key(d);
      totalSeconds += dur;
      if (dur > longestSeconds) longestSeconds = dur;
      if (k === todayKey) todaySeconds += dur;
      if (d >= weekStart) weekSeconds += dur;
      if (r.completed) {
        completedCount++;
        completedDays.add(k);
      }
      buckets.set(k, (buckets.get(k) ?? 0) + dur);
    }

    const sessionCount = data.length;

    let currentStreak = 0;
    const cur = new Date(now);
    if (!completedDays.has(key(cur))) cur.setDate(cur.getDate() - 1);
    while (completedDays.has(key(cur))) {
      currentStreak++;
      cur.setDate(cur.getDate() - 1);
    }

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      last7Days.push({ date: key(d), seconds: buckets.get(key(d)) ?? 0 });
    }

    setStats({
      todaySeconds,
      weekSeconds,
      totalSeconds,
      sessionCount,
      completedCount,
      completionRate: sessionCount ? completedCount / sessionCount : 0,
      avgSeconds: sessionCount ? Math.round(totalSeconds / sessionCount) : 0,
      longestSeconds,
      currentStreak,
      last7Days,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, reload: load };
}
