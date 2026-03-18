import { create } from "zustand";
import { getCachedProfile } from "./profileStore";
import confetti from "canvas-confetti";
import { toast } from "sonner";

const XP_KEY = "bioflow_xp";
const STREAK_KEY = "bioflow_streak";

export interface RewardState {
  xp: number;
  streak: number;
  lastActiveDate: string;
  addXP: (amount: number, label?: string) => void;
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

const saveXP = (xp: number) => localStorage.setItem(XP_KEY, String(xp));
const saveStreak = (s: { streak: number; lastActiveDate: string }) =>
  localStorage.setItem(STREAK_KEY, JSON.stringify(s));

export const useRewardStore = create<RewardState>((set, get) => {
  const { streak, lastActiveDate } = loadStreak();
  return {
    xp: loadXP(),
    streak,
    lastActiveDate,

    addXP: (amount, label) => {
      const newXP = get().xp + amount;
      saveXP(newXP);
      set({ xp: newXP });

      // Show floating XP animation via toast
      if (label) {
        toast.success(label, { description: `+${amount} XP`, duration: 2000 });
      }
    },

    checkStreak: () => {
      const today = new Date().toISOString().slice(0, 10);
      const { lastActiveDate: last, streak: current } = get();
      
      if (last === today) return; // already checked today

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      let newStreak = current;
      if (last === yesterdayStr) {
        newStreak = current + 1;
      } else if (last !== today) {
        newStreak = 1;
      }

      saveStreak({ streak: newStreak, lastActiveDate: today });
      set({ streak: newStreak, lastActiveDate: today });

      // Check milestones
      const profile = getCachedProfile();
      const config = profile?.ai_coach_config as any;
      const milestones = config?.rewardSystem?.streakMilestones;
      if (milestones) {
        if (newStreak === 3 && milestones["3days"]) {
          showMilestone(milestones["3days"], 3);
        } else if (newStreak === 7 && milestones["7days"]) {
          showMilestone(milestones["7days"], 7);
        } else if (newStreak === 30 && milestones["30days"]) {
          showMilestone(milestones["30days"], 30);
        }
      }
    },

    getLevel: () => Math.floor(get().xp / 100) + 1,
    getXPInLevel: () => {
      const xp = get().xp;
      const current = xp % 100;
      return { current, needed: 100 };
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
  toast.success(msg, { description: "+10 XP", duration: 2000 });
}

export function fireDailyCompletion() {
  confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
  const profile = getCachedProfile();
  const config = profile?.ai_coach_config as any;
  const msg = config?.rewardSystem?.dailyReward || "Journée parfaite ! ✨";
  toast.success(msg, { description: "+50 XP bonus", duration: 3000 });
}
