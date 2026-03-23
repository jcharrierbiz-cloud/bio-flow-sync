import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/profileStore";

export interface ScanSession {
  id: string;
  device_id: string;
  scanned_at: string;
  bpm: number;
  hrv_rmssd: number;
  stress_index: number;
  readiness_score: number;
  is_morning_scan: boolean;
  day_date: string;
}

interface ScanStore {
  morningScan: ScanSession | null;
  additionalScans: ScanSession[];
  energyScore: number;
  loading: boolean;
  loadTodayScans: () => Promise<void>;
  saveScan: (data: Omit<ScanSession, "id" | "device_id" | "day_date">) => Promise<ScanSession | null>;
  getEnergyScore: () => number;
}

function calcEnergy(morning: ScanSession | null, additional: ScanSession[]): number {
  if (!morning) return 0;
  if (additional.length > 0) {
    const latest = additional[additional.length - 1];
    return Math.round(morning.readiness_score * 0.6 + latest.readiness_score * 0.4);
  }
  return morning.readiness_score;
}

export const useScanStore = create<ScanStore>((set, get) => ({
  morningScan: null,
  additionalScans: [],
  energyScore: 0,
  loading: false,

  loadTodayScans: async () => {
    set({ loading: true });
    const deviceId = getDeviceId();
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("scan_sessions")
      .select("*")
      .eq("device_id", deviceId)
      .eq("day_date", today)
      .order("scanned_at", { ascending: true });

    if (error || !data) {
      set({ loading: false });
      return;
    }

    const scans = data as unknown as ScanSession[];
    const morning = scans.find((s) => s.is_morning_scan) || null;
    const additional = scans.filter((s) => !s.is_morning_scan);
    const energy = calcEnergy(morning, additional);

    set({ morningScan: morning, additionalScans: additional, energyScore: energy, loading: false });
  },

  saveScan: async (scanData) => {
    const deviceId = getDeviceId();
    const today = new Date().toISOString().slice(0, 10);
    const { morningScan } = get();

    const isMorning = !morningScan;

    const payload = {
      device_id: deviceId,
      scanned_at: scanData.scanned_at,
      bpm: scanData.bpm,
      hrv_rmssd: scanData.hrv_rmssd,
      stress_index: scanData.stress_index,
      readiness_score: scanData.readiness_score,
      is_morning_scan: isMorning,
      day_date: today,
    };

    const { data, error } = await supabase
      .from("scan_sessions")
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      console.error("Save scan error:", error);
      return null;
    }

    const saved = data as unknown as ScanSession;

    if (isMorning) {
      set((s) => {
        const energy = calcEnergy(saved, s.additionalScans);
        return { morningScan: saved, energyScore: energy };
      });
    } else {
      set((s) => {
        const newAdditional = [...s.additionalScans, saved];
        const energy = calcEnergy(s.morningScan, newAdditional);
        return { additionalScans: newAdditional, energyScore: energy };
      });
    }

    return saved;
  },

  getEnergyScore: () => get().energyScore,
}));

// Generate BioWindow curve data
export function generateBioWindowCurve(
  morningScan: ScanSession | null,
  additionalScans: ScanSession[]
): { hour: string; energy: number; zone: "peak" | "moderate" | "rest" }[] {
  const points: { hour: string; energy: number; zone: "peak" | "moderate" | "rest" }[] = [];

  // Base circadian curve (assuming wake ~7am)
  const baseCurve: Record<number, number> = {
    0: 15, 1: 10, 2: 8, 3: 7, 4: 8, 5: 15, 6: 30,
    7: 50, 8: 70, 9: 85, 10: 90, 11: 82,
    12: 65, 13: 50, 14: 60, 15: 65, 16: 58,
    17: 50, 18: 45, 19: 40, 20: 35, 21: 25, 22: 18, 23: 15,
  };

  // Scale base curve by morning readiness
  const scaleFactor = morningScan ? morningScan.readiness_score / 80 : 1;

  // Build hour-by-hour data
  for (let h = 0; h < 24; h++) {
    let energy = Math.round((baseCurve[h] || 50) * scaleFactor);

    // Apply shifts from additional scans
    for (const scan of additionalScans) {
      const scanHour = new Date(scan.scanned_at).getHours();
      const diff = h - scanHour;
      if (diff >= 0 && diff <= 2) {
        // predicted value at scan time
        const predicted = Math.round((baseCurve[scanHour] || 50) * scaleFactor);
        const delta = scan.readiness_score - predicted;
        // Interpolation factor: full at scan hour, fading over 2h
        const factor = 1 - diff / 2;
        energy = Math.round(energy + delta * factor * 0.5);
      }
    }

    energy = Math.max(0, Math.min(100, energy));
    const zone = energy >= 65 ? "peak" : energy >= 40 ? "moderate" : "rest";
    const hourStr = `${h.toString().padStart(2, "0")}:00`;
    points.push({ hour: hourStr, energy, zone });
  }

  return points;
}
