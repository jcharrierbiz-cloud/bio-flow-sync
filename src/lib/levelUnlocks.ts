// Système de déblocages liés aux paliers (Tâche 5).
// Donne du SENS aux niveaux : chaque palier débloque un insight / une fonctionnalité.
// Conçu pour être NON bloquant par défaut : on s'en sert surtout pour motiver
// (carte "Paliers & déblocages"). Pour réellement verrouiller une fonctionnalité,
// utilise `isUnlocked(key, level)` ou le composant <LockedFeature>.

import { levelFromXP, xpForLevel, getTier, useRewardStore } from "@/lib/rewardStore";

export interface Unlock {
  key: string;
  tier: string;
  minLevel: number;
  title: string;
  desc: string;
  emoji: string;
}

// minLevel = niveau d'entrée de chaque palier (cf. getTier dans rewardStore).
export const UNLOCKS: Unlock[] = [
  { key: "core",          tier: "Signal",     minLevel: 1,  emoji: "📡", title: "Scan & agenda",            desc: "Ton scan matinal et ton agenda intelligent." },
  { key: "weekly_trends", tier: "Pouls",      minLevel: 5,  emoji: "📈", title: "Tendances hebdomadaires",  desc: "Tes graphiques d'énergie sur la semaine." },
  { key: "recipes",       tier: "Rythme",     minLevel: 10, emoji: "🥗", title: "Recettes santé",           desc: "Des suggestions de plats avec recettes complètes." },
  { key: "focus_lock",    tier: "Cadence",    minLevel: 16, emoji: "🎯", title: "Focus Lock",               desc: "Sessions de concentration profonde sans distraction." },
  { key: "bio_windows",   tier: "Synchro",    minLevel: 23, emoji: "🌊", title: "Fenêtres bio",             desc: "Tes créneaux d'énergie prédits dans la journée." },
  { key: "ai_briefings",  tier: "Flux",       minLevel: 31, emoji: "🧠", title: "Briefings IA étendus",     desc: "Les bilans semaine & mois de ton coach." },
  { key: "sport_ai",      tier: "Résonance",  minLevel: 41, emoji: "💪", title: "Analyse sport IA",         desc: "L'analyse détaillée de chacune de tes séances." },
  { key: "prestige_theme",tier: "Apogée",     minLevel: 53, emoji: "✨", title: "Thème Apogée",             desc: "Une personnalisation visuelle prestige." },
  { key: "reports",       tier: "Harmonique", minLevel: 67, emoji: "📊", title: "Rapports avancés",         desc: "Exports et synthèses approfondies." },
  { key: "mastery",       tier: "Bio-Flow",   minLevel: 83, emoji: "🌀", title: "Maîtrise totale",          desc: "Tout est débloqué. Tu ES Bio-Flow." },
];

/** Vrai si la fonctionnalité `key` est débloquée au niveau donné. */
export function isUnlocked(key: string, level: number): boolean {
  const u = UNLOCKS.find((x) => x.key === key);
  if (!u) return true; // clé inconnue => non bloquante
  return level >= u.minLevel;
}

/** Liste des déblocages déjà acquis. */
export function unlockedList(level: number): Unlock[] {
  return UNLOCKS.filter((u) => level >= u.minLevel);
}

/** Prochain déblocage à atteindre (null si tout est débloqué), avec l'XP restant. */
export function nextUnlock(level: number, xp: number): { unlock: Unlock; xpRemaining: number } | null {
  const u = UNLOCKS.find((x) => x.minLevel > level);
  if (!u) return null;
  const xpRemaining = Math.max(0, xpForLevel(u.minLevel) - xp);
  return { unlock: u, xpRemaining };
}

/** Hook pratique : renvoie le niveau courant, le tier, et des helpers de déblocage. */
export function useUnlocks() {
  const xp = useRewardStore((s) => s.xp);
  const level = levelFromXP(xp);
  return {
    xp,
    level,
    tier: getTier(level),
    isUnlocked: (key: string) => isUnlocked(key, level),
    unlocked: unlockedList(level),
    next: nextUnlock(level, xp),
  };
}
