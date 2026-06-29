import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/profileStore";
import { useScanStore } from "@/lib/scanStore";
import { useSleepStore } from "@/lib/sleepStore";
import { useEffortStore } from "@/lib/effortStore";

export interface EnergyBreakdown {
  total: number;
  scan: number | null;     // 0-100
  sleep: number | null;    // 0-100
  nutrition: number | null;// 0-100
  effort: number | null;   // 0-100
  contributors: number;    // count of pillars actually contributing
}

const SLEEP_QUALITY_SCORE: Record<string, number> = {
  Terrible: 20,
  Moyenne: 45,
  Correcte: 65,
  Bonne: 82,
  Excellente: 95,
};

function sleepScore(quality: string | null, hours: number): number | null {
  if (!quality && hours === 6.2) return null; // default, never set
  if (quality && SLEEP_QUALITY_SCORE[quality] != null) {
    return SLEEP_QUALITY_SCORE[quality];
  }
  // fallback from hours: 7.5h ~ 85, 6h ~ 60, <5 ~ 35
  const h = Math.max(0, Math.min(10, hours));
  return Math.round(Math.max(15, Math.min(95, (h / 8) * 90)));
}

function effortScore(sessions: { duration_minutes: number; intensity: string; day_date: string }[]): number | null {
  const today = new Date().toISOString().slice(0, 10);
  const todays = sessions.filter((s) => s.day_date === today);
  if (todays.length === 0) return null;
  // Score based on total minutes + intensity (cap at 60 min for full credit)
  const totalMin = todays.reduce((a, s) => a + (s.duration_minutes || 0), 0);
  const intensityBoost = todays.reduce((a, s) => {
    const i = (s.intensity || "").toLowerCase();
    if (i.includes("max") || i.includes("haut") || i.includes("high")) return a + 15;
    if (i.includes("mod")) return a + 8;
    return a + 4;
  }, 0);
  const base = Math.min(70, (totalMin / 60) * 70);
  return Math.round(Math.max(30, Math.min(100, base + intensityBoost)));
}

export function useEnergyScore(): EnergyBreakdown {
  const { morningScan, additionalScans, energyScore } = useScanStore();
  const sleepQuality = useSleepStore((s) => s.quality);
  const sleepHours = useSleepStore((s) => s.totalHours);
  const sessions = useEffortStore((s) => s.sessions);
  const loadSessions = useEffortStore((s) => s.loadSessions);

  const [nutrition, setNutrition] = useState<number | null>(null);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const load = async () => {
      const deviceId = getDeviceId();
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("daily_nutrition_logs")
        .select("checked")
        .eq("device_id", deviceId)
        .eq("log_date", today);

      // Tips score (0-100) — null if no tips logged
      let tipsScore: number | null = null;
      if (data && data.length > 0) {
        const checked = data.filter((d) => d.checked).length;
        const expected = Math.max(data.length, 4);
        tipsScore = Math.round((checked / expected) * 100);
      }

      // Meal scan score (0-100) — from localStorage meal analysis
      let mealScore: number | null = null;
      try {
        const raw = localStorage.getItem("bioflow_meal_" + today);
        if (raw) {
          const parsed = JSON.parse(raw);
          const q = parsed?.analysis?.nutritionalQuality;
          if (typeof q === "number") {
            mealScore = Math.max(0, Math.min(100, Math.round(q)));
          }
        }
      } catch {}

      const parts = [tipsScore, mealScore].filter((v): v is number => v != null);
      if (parts.length === 0) {
        setNutrition(null);
      } else {
        setNutrition(Math.round(parts.reduce((a, b) => a + b, 0) / parts.length));
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const scan = morningScan ? energyScore : null;
  const sleep = sleepScore(sleepQuality, sleepHours);
  const effort = effortScore(sessions as any);

  // Weights — re-normalized over contributors that have data
  const weights = { scan: 0.5, sleep: 0.2, nutrition: 0.15, effort: 0.15 };
  const parts: { v: number; w: number }[] = [];
  if (scan != null) parts.push({ v: scan, w: weights.scan });
  if (sleep != null) parts.push({ v: sleep, w: weights.sleep });
  if (nutrition != null) parts.push({ v: nutrition, w: weights.nutrition });
  if (effort != null) parts.push({ v: effort, w: weights.effort });

  let total = 0;
  if (parts.length > 0) {
    const wSum = parts.reduce((a, p) => a + p.w, 0);
    total = Math.round(parts.reduce((a, p) => a + p.v * (p.w / wSum), 0));
  }

  return { total, scan, sleep, nutrition, effort, contributors: parts.length };
}
