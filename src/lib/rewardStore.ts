import { create } from "zustand";
import { getCachedProfile } from "./profileStore";
import confetti from "canvas-confetti";
import { toast } from "sonner";

const XP_KEY = "bioflow_xp";
const STREAK_KEY = "bioflow_streak";
const DAILY_XP_KEY = "bioflow_xp_daily";
const CATEGORY_KEY = "bioflow_xp_categories";

const DAILY_CAP = 150;

export interface Tier {
  name: string;
  color: string; // CSS hsl value (without hsl() wrapper) matching project tokens
}

// Level curve: cumulative XP required to REACH level N
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(level, 1.5));
}

export function levelFromXP(totalXP: number): number {
  let lvl = 1;
  // simple ascending loop, capped reasonably high
  while (xpForLevel(lvl + 1) <= totalXP && lvl < 999) lvl++;
  return lvl;
}

export function getTier(level: number): Tier {
  // Color progression: teal (energy) → violet (ai-violet)
  if (level <= 4) return { name: "Signal", color: "175 80% 45%" };
  if (level <= 9) return { name: "Pouls", color: "172 75% 50%" };
  if (level <= 15) return { name: "Rythme", color: "190 75% 55%" };
  if (level <= 22) return { name: "Cadence", color: "210 75% 58%" };
  if (level <= 30) return { name: "Synchro", color: "230 75% 60%" };
  if (level <= 40) return { name: "Flux", color: "250 75% 62%" };
  if (level <= 52) return { name: "Résonance", color: "265 75% 62%" };
  if (level <= 66) return { name: "Apogée", color: "270 75% 60%" };
  if (level <= 82) return { name: "Harmonique", color: "280 78% 62%" };
  return { name: "Bio-Flow", color: "290 80% 65%" };
}

export interface RewardState {
  xp: number;
  streak: number;
  lastActiveDate: string;
  addXP: (amount: number, label?: string, options?: { category?: string; exemptDailyCap?: boolean }) => void;
  checkStreak: () => void;
  getLevel: () => number;
  getXPInLevel: () => { current: number; needed: number };
}

const loadXP = (): number => {
  try { return Number(localStorage.getItem(XP_KEY) || "0"); } catch { return 0; }
};

const loadStreak = (): { streak: number; lastActiveDate: string } => {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? JSON.parse(raw) : { streak: 0, lastActiveDate: "" };
  } catch {
    return { streak: 0, lastActiveDate: "" };
  }
};

const today = () => new Date().toISOString().slice(0, 10);

function getDailyXP(): number {
  try {
    const raw = localStorage.getItem(DAILY_XP_KEY);
    if (!raw) return 0;
    const p = JSON.parse(raw);
    return p.date === today() ? Number(p.xp) || 0 : 0;
  } catch { return 0; }
}

function setDailyXP(xp: number) {
  localStorage.setItem(DAILY_XP_KEY, JSON.stringify({ date: today(), xp }));
}

function getCategoryCount(category: string): number {
  try {
    const raw = localStorage.getItem(CATEGORY_KEY);
    if (!raw) return 0;
    const p = JSON.parse(raw);
    if (p.date !== today()) return 0;
    return Number(p.counts?.[category]) || 0;
  } catch { return 0; }
}

function incCategoryCount(category: string) {
  let p: { date: string; counts: Record<string, number> } = { date: today(), counts: {} };
  try {
    const raw = localStorage.getItem(CATEGORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today()) p = parsed;
    }
  } catch {}
  p.counts[category] = (p.counts[category] || 0) + 1;
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(p));
}

function streakMultiplier(streak: number): number {
  if (streak >= 30) return 1.5;
  if (streak >= 7) return 1.2;
  return 1.0;
}

const saveXP = (xp: number) => localStorage.setItem(XP_KEY, String(xp));
const saveStreak = (s: { streak: number; lastActiveDate: string }) =>
  localStorage.setItem(STREAK_KEY, JSON.stringify(s));

export const useRewardStore = create<RewardState>((set, get) => {
  const { streak, lastActiveDate } = loadStreak();
  return {
    xp: loadXP(),
    streak,
    lastActiveDate,

    addXP: (amount, label, options) => {
      const category = options?.category;
      const exempt = options?.exemptDailyCap === true;

      // Degressive on repeat category same day
      let adjusted = amount;
      if (category) {
        const count = getCategoryCount(category);
        if (count === 1) adjusted = Math.round(amount * 0.6);
        else if (count >= 2) adjusted = Math.round(amount * 0.3);
        incCategoryCount(category);
      }

      // Streak multiplier (not on exempt bonus)
      if (!exempt) {
        adjusted = Math.round(adjusted * streakMultiplier(get().streak));
      }

      // Daily cap
      if (!exempt) {
        const dailyUsed = getDailyXP();
        const remaining = Math.max(0, DAILY_CAP - dailyUsed);
        adjusted = Math.min(adjusted, remaining);
        if (adjusted <= 0) {
          // Silently no XP — cap reached
          return;
        }
        setDailyXP(dailyUsed + adjusted);
      }

      const prevLevel = get().getLevel();
      const newXP = get().xp + adjusted;
      saveXP(newXP);
      set({ xp: newXP });

      if (label) {
        toast.success(label, { description: `+${adjusted} XP`, duration: 2000 });
      }

      const newLevel = get().getLevel();
      if (newLevel > prevLevel) {
        const tier = getTier(newLevel);
        confetti({ particleCount: 180, spread: 90, origin: { y: 0.6 } });
        toast.success(`Niveau ${newLevel} — ${tier.name} !`, {
          description: "Nouveau palier débloqué",
          duration: 4000,
        });
      }
    },

    checkStreak: () => {
      const t = today();
      const { lastActiveDate: last, streak: current } = get();
      if (last === t) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      let newStreak = current;
      if (last === yesterdayStr) newStreak = current + 1;
      else if (last !== t) newStreak = 1;

      saveStreak({ streak: newStreak, lastActiveDate: t });
      set({ streak: newStreak, lastActiveDate: t });

      const profile = getCachedProfile();
      const config = profile?.ai_coach_config as any;
      const milestones = config?.rewardSystem?.streakMilestones;
      if (milestones) {
        if (newStreak === 3 && milestones["3days"]) showMilestone(milestones["3days"], 3);
        else if (newStreak === 7 && milestones["7days"]) showMilestone(milestones["7days"], 7);
        else if (newStreak === 30 && milestones["30days"]) showMilestone(milestones["30days"], 30);
      }
    },

    getLevel: () => levelFromXP(get().xp),
    getXPInLevel: () => {
      const xp = get().xp;
      const lvl = levelFromXP(xp);
      const base = xpForLevel(lvl);
      const next = xpForLevel(lvl + 1);
      return { current: xp - base, needed: next - base };
    },
  };
});

function showMilestone(message: string, days: number) {
  confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  toast.success(`🔥 ${days} jours de streak !`, { description: message, duration: 5000 });
}

export function fireTaskConfetti() {
  confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  const profile = getCachedProfile();
  const config = profile?.ai_coach_config as any;
  const msg = config?.rewardSystem?.taskReward || "Bien joué ! 🎉";
  useRewardStore.getState().checkStreak();
  useRewardStore.getState().addXP(10, msg, { category: "task" });
}

export function fireDailyCompletion() {
  confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
  const profile = getCachedProfile();
  const config = profile?.ai_coach_config as any;
  const msg = config?.rewardSystem?.dailyReward || "Journée parfaite ! ✨";
  // Exempt from daily cap & streak multiplier — fixed bonus
  useRewardStore.getState().addXP(50, msg, { exemptDailyCap: true });
}

export function fireScanCompleted() {
  useRewardStore.getState().checkStreak();
  useRewardStore.getState().addXP(20, "Scan terminé", { category: "scan" });
}

export function fireCheckinCompleted() {
  useRewardStore.getState().checkStreak();
  useRewardStore.getState().addXP(15, "Check-in matinal", { category: "checkin" });
}

export function fireMealLogged() {
  useRewardStore.getState().checkStreak();
  useRewardStore.getState().addXP(8, "Repas enregistré", { category: "meal" });
}

export function fireSportLogged() {
  useRewardStore.getState().checkStreak();
  useRewardStore.getState().addXP(15, "Séance enregistrée", { category: "sport" });
}

export function fireSleepLogged() {
  useRewardStore.getState().checkStreak();
  useRewardStore.getState().addXP(8, "Sommeil enregistré", { category: "sleep" });
}
