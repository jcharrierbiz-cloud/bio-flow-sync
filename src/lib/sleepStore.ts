import { create } from "zustand";

interface SleepPhases {
  deep: number;
  light: number;
  rem: number;
}

interface SleepStore {
  totalHours: number;
  quality: string | null; // from morning check-in
  phases: SleepPhases;
  setTotalHours: (hours: number) => void;
  setQualityFromCheckIn: (qualityIndex: number) => void;
}

// Compute realistic sleep phase breakdown based on total hours and quality
function computePhases(totalHours: number, quality: string | null): SleepPhases {
  // Base ratios vary by sleep quality
  let deepRatio: number, remRatio: number, lightRatio: number;

  switch (quality) {
    case "Terrible":
      deepRatio = 0.15; remRatio = 0.12; lightRatio = 0.73;
      break;
    case "Moyenne":
      deepRatio = 0.20; remRatio = 0.18; lightRatio = 0.62;
      break;
    case "Correcte":
      deepRatio = 0.25; remRatio = 0.22; lightRatio = 0.53;
      break;
    case "Bonne":
      deepRatio = 0.28; remRatio = 0.24; lightRatio = 0.48;
      break;
    case "Excellente":
      deepRatio = 0.30; remRatio = 0.25; lightRatio = 0.45;
      break;
    default:
      // No quality set — estimate from hours
      if (totalHours >= 8) {
        deepRatio = 0.28; remRatio = 0.24; lightRatio = 0.48;
      } else if (totalHours >= 7) {
        deepRatio = 0.25; remRatio = 0.22; lightRatio = 0.53;
      } else if (totalHours >= 6) {
        deepRatio = 0.22; remRatio = 0.20; lightRatio = 0.58;
      } else {
        deepRatio = 0.18; remRatio = 0.15; lightRatio = 0.67;
      }
  }

  return {
    deep: Math.round(totalHours * deepRatio * 10) / 10,
    light: Math.round(totalHours * lightRatio * 10) / 10,
    rem: Math.round(totalHours * remRatio * 10) / 10,
  };
}

const SLEEP_HOURS_MAP: Record<string, number> = {
  Terrible: 4,
  Moyenne: 5.5,
  Correcte: 6.5,
  Bonne: 7.5,
  Excellente: 8.5,
};

const QUALITY_LABELS = ["Terrible", "Moyenne", "Correcte", "Bonne", "Excellente"];

// Load from localStorage
function loadSaved(): { totalHours: number; quality: string | null } {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem("bioflow_sleep");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        return { totalHours: parsed.totalHours ?? 6.2, quality: parsed.quality ?? null };
      }
    }
  } catch {}
  return { totalHours: 6.2, quality: null };
}

function save(totalHours: number, quality: string | null) {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem("bioflow_sleep", JSON.stringify({ date: today, totalHours, quality }));
}

const initial = loadSaved();

export const useSleepStore = create<SleepStore>((set) => ({
  totalHours: initial.totalHours,
  quality: initial.quality,
  phases: computePhases(initial.totalHours, initial.quality),

  setTotalHours: (hours) => {
    set((s) => {
      save(hours, s.quality);
      return { totalHours: hours, phases: computePhases(hours, s.quality) };
    });
  },

  setQualityFromCheckIn: (qualityIndex) => {
    const quality = QUALITY_LABELS[qualityIndex] ?? null;
    const hours = quality ? SLEEP_HOURS_MAP[quality] ?? 6.2 : 6.2;
    save(hours, quality);
    set({ quality, totalHours: hours, phases: computePhases(hours, quality) });
  },
}));
