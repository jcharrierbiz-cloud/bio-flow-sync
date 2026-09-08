// src/lib/reminderStore.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Rappels personnels (indépendants des tâches de l'agenda).
//
// Un rappel = un titre + une heure + une récurrence (une fois / chaque jour /
// jours de semaine / chaque semaine). Le déclenchement est fait par
// `useReminderScheduler`, qui interroge `collectDue()` toutes les 30 s.
//
// Deux chemins de déclenchement, complémentaires :
//   • app ouverte  → `useReminderScheduler` (ce store, en local) ;
//   • app fermée   → Web Push, envoyé par la fonction `send-reminders` à partir
//                    de la copie Supabase (voir reminderSync.ts + push.ts).
// Les deux se partagent la même clé d'occurrence (`lastSentKey`, heure locale
// "AAAA-MM-JJTHH:MM") : le premier qui la revendique empêche l'autre de
// notifier une seconde fois.
//
// Quand le push n'est pas activé (permission refusée, navigateur sans support,
// iPhone non installé), le comportement reste celui d'avant : déclenchement
// pendant que l'app est ouverte, occurrences ratées marquées `lastMissedAt` et
// affichées telles quelles. L'écran Rappels dit lequel des deux régimes
// s'applique plutôt que de laisser croire à une alarme fiable.
// -----------------------------------------------------------------------------

import { create } from "zustand";
import { dayKey, parseDayKey } from "./dateUtils";
import { deviceTimezone } from "./push";
import { deleteRemoteReminder, pushRemoteReminder } from "./reminderSync";

const STORAGE_KEY = "bioflow_reminders_v1";

/** Au-delà de ce retard, on considère l'occurrence « manquée » (app fermée). */
export const DEFAULT_GRACE_MINUTES = 120;

export type ReminderRepeat = "once" | "daily" | "weekdays" | "weekly";

export const REPEAT_LABELS: Record<ReminderRepeat, string> = {
  once: "Une fois",
  daily: "Chaque jour",
  weekdays: "Lun → Ven",
  weekly: "Chaque semaine",
};

export const WEEKDAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export interface Reminder {
  id: string;
  title: string;
  note?: string;
  /** Heure locale "HH:MM". */
  time: string;
  repeat: ReminderRepeat;
  /** Jour "AAAA-MM-JJ", uniquement pour `repeat === "once"`. */
  date?: string;
  /** 0 = dimanche … 6 = samedi, uniquement pour `repeat === "weekly"`. */
  weekday?: number;
  enabled: boolean;
  /** Fuseau IANA de création — le serveur en a besoin pour situer "18:00". */
  timezone?: string;
  /** Occurrence déjà notifiée, en heure locale : "AAAA-MM-JJTHH:MM". */
  lastSentKey?: string;
  /** Dernière occurrence effectivement notifiée (ISO). */
  lastFiredAt?: string;
  /** Dernière occurrence passée sans notification possible (app fermée). */
  lastMissedAt?: string;
  createdAt: string;
  /** Dernière modification, utilisée pour départager local et serveur. */
  updatedAt?: string;
}

// --- Persistance -------------------------------------------------------------

function sanitize(raw: unknown): Reminder | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Reminder>;
  if (!r.id || !r.time) return null;
  const repeat: ReminderRepeat =
    r.repeat === "daily" || r.repeat === "weekdays" || r.repeat === "weekly" || r.repeat === "once"
      ? r.repeat
      : "daily";
  return {
    id: String(r.id),
    title: String(r.title ?? "Rappel"),
    note: r.note ? String(r.note) : undefined,
    time: String(r.time),
    repeat,
    date: r.date ? String(r.date) : undefined,
    weekday: typeof r.weekday === "number" ? r.weekday : undefined,
    enabled: r.enabled !== false,
    timezone: r.timezone ? String(r.timezone) : undefined,
    lastSentKey: r.lastSentKey ? String(r.lastSentKey) : undefined,
    lastFiredAt: r.lastFiredAt ? String(r.lastFiredAt) : undefined,
    lastMissedAt: r.lastMissedAt ? String(r.lastMissedAt) : undefined,
    createdAt: r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
  };
}

export function loadReminders(): Reminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitize).filter((r): r is Reminder => r !== null);
  } catch {
    return [];
  }
}

function persist(reminders: Reminder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch {
    // Stockage indisponible : on garde l'état en mémoire pour la session.
  }
}

// --- Calcul des occurrences (pur, testable) ----------------------------------

function withTime(day: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(day);
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/** Le rappel a-t-il une occurrence ce jour-là ? Renvoie l'instant exact ou null. */
export function occurrenceOn(reminder: Reminder, day: Date): Date | null {
  const dow = day.getDay();
  switch (reminder.repeat) {
    case "once":
      return reminder.date === dayKey(day) ? withTime(day, reminder.time) : null;
    case "daily":
      return withTime(day, reminder.time);
    case "weekdays":
      return dow >= 1 && dow <= 5 ? withTime(day, reminder.time) : null;
    case "weekly":
      return dow === (reminder.weekday ?? 1) ? withTime(day, reminder.time) : null;
    default:
      return null;
  }
}

/** Prochaine occurrence strictement après `from` (cherche jusqu'à 1 an). */
export function nextOccurrence(reminder: Reminder, from: Date = new Date()): Date | null {
  if (!reminder.enabled) return null;
  for (let i = 0; i <= 366; i++) {
    const day = new Date(from);
    day.setDate(day.getDate() + i);
    const occ = occurrenceOn(reminder, day);
    if (occ && occ.getTime() > from.getTime()) return occ;
  }
  return null;
}

/** Dernière occurrence à `now` ou avant (cherche jusqu'à 1 an en arrière). */
export function lastOccurrence(reminder: Reminder, now: Date = new Date()): Date | null {
  for (let i = 0; i <= 366; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    const occ = occurrenceOn(reminder, day);
    if (occ && occ.getTime() <= now.getTime()) return occ;
  }
  return null;
}

/**
 * Clé d'occurrence en heure locale : "AAAA-MM-JJTHH:MM".
 * Format identique à celui du serveur (`send-reminders/due.ts`), c'est ce qui
 * permet aux deux chemins de déclenchement de ne pas notifier deux fois.
 */
export function occurrenceKey(occurrence: Date): string {
  const hh = String(occurrence.getHours()).padStart(2, "0");
  const mm = String(occurrence.getMinutes()).padStart(2, "0");
  return `${dayKey(occurrence)}T${hh}:${mm}`;
}

export interface DueReminder {
  reminder: Reminder;
  occurrence: Date;
  /** true si l'occurrence est trop ancienne pour être notifiée maintenant. */
  late: boolean;
}

/**
 * Rappels dont l'occurrence est échue et pas encore traitée.
 * `late` distingue « c'est l'heure » de « c'était il y a longtemps, l'app était
 * fermée » : le planificateur ne notifie que le premier cas.
 *
 * Une occurrence antérieure à la création du rappel est ignorée — sinon un
 * rappel quotidien fixé à 23 h et créé ce matin se déclarerait « manqué hier ».
 */
export function collectDue(
  reminders: Reminder[],
  now: Date = new Date(),
  graceMinutes = DEFAULT_GRACE_MINUTES
): DueReminder[] {
  const due: DueReminder[] = [];
  for (const reminder of reminders) {
    if (!reminder.enabled) continue;
    const occ = lastOccurrence(reminder, now);
    if (!occ) continue;
    const createdAt = new Date(reminder.createdAt).getTime();
    if (Number.isFinite(createdAt) && occ.getTime() < createdAt) continue;
    // Déjà envoyée par le serveur (push) : rien à refaire côté navigateur.
    if (reminder.lastSentKey === occurrenceKey(occ)) continue;

    const handledAt = Math.max(
      reminder.lastFiredAt ? new Date(reminder.lastFiredAt).getTime() : 0,
      reminder.lastMissedAt ? new Date(reminder.lastMissedAt).getTime() : 0
    );
    if (handledAt >= occ.getTime()) continue; // occurrence déjà traitée
    due.push({
      reminder,
      occurrence: occ,
      late: now.getTime() - occ.getTime() > graceMinutes * 60_000,
    });
  }
  return due.sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime());
}

/** Libellé lisible de la prochaine occurrence ("aujourd'hui à 18:30"). */
export function describeNext(reminder: Reminder, now: Date = new Date()): string {
  if (!reminder.enabled) return "Désactivé";
  const next = nextOccurrence(reminder, now);
  if (!next) return "Aucune occurrence à venir";
  const time = next.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const nextKey = dayKey(next);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (nextKey === dayKey(now)) return `Aujourd'hui à ${time}`;
  if (nextKey === dayKey(tomorrow)) return `Demain à ${time}`;
  return `${next.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à ${time}`;
}

// --- Store -------------------------------------------------------------------

export interface NewReminder {
  title: string;
  time: string;
  repeat: ReminderRepeat;
  note?: string;
  date?: string;
  weekday?: number;
}

interface ReminderState {
  reminders: Reminder[];
  addReminder: (input: NewReminder) => Reminder | null;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  /** Marque une occurrence comme notifiée (ou manquée si `missed`). */
  markHandled: (id: string, occurrence: Date, missed?: boolean) => void;
  /** Remplace l'état par le résultat d'une fusion locale/serveur. */
  replaceAll: (reminders: Reminder[]) => void;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: loadReminders(),

  addReminder: ({ title, time, repeat, note, date, weekday }) => {
    const clean = title.trim();
    if (!clean || !time) return null;
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: clean,
      note: note?.trim() || undefined,
      time,
      repeat,
      date: repeat === "once" ? date || dayKey() : undefined,
      weekday: repeat === "weekly" ? weekday ?? new Date().getDay() : undefined,
      enabled: true,
      timezone: deviceTimezone(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [...get().reminders, reminder];
    persist(next);
    set({ reminders: next });
    // Copie serveur : sans elle, ce rappel ne sonnerait jamais app fermée.
    void pushRemoteReminder(reminder);
    return reminder;
  },

  updateReminder: (id, patch) => {
    const stamped = { ...patch, updatedAt: new Date().toISOString() };
    const next = get().reminders.map((r) => (r.id === id ? { ...r, ...stamped } : r));
    persist(next);
    set({ reminders: next });
    const updated = next.find((r) => r.id === id);
    if (updated) void pushRemoteReminder(updated);
  },

  removeReminder: (id) => {
    const next = get().reminders.filter((r) => r.id !== id);
    persist(next);
    set({ reminders: next });
    void deleteRemoteReminder(id);
  },

  toggleReminder: (id) => {
    const next = get().reminders.map((r) =>
      r.id === id
        ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() }
        : r
    );
    persist(next);
    set({ reminders: next });
    const updated = next.find((r) => r.id === id);
    if (updated) void pushRemoteReminder(updated);
  },

  replaceAll: (reminders) => {
    persist(reminders);
    set({ reminders });
  },

  markHandled: (id, occurrence, missed = false) => {
    const stamp = occurrence.toISOString();
    const key = occurrenceKey(occurrence);
    const next = get().reminders.map((r) => {
      if (r.id !== id) return r;
      const updated: Reminder = missed
        ? { ...r, lastMissedAt: stamp, lastSentKey: key }
        : { ...r, lastFiredAt: stamp, lastMissedAt: undefined, lastSentKey: key };
      updated.updatedAt = new Date().toISOString();
      // Un rappel ponctuel ne sert qu'une fois : on le désactive après coup.
      if (r.repeat === "once") updated.enabled = false;
      return updated;
    });
    persist(next);
    set({ reminders: next });
    // Revendique l'occurrence côté serveur : le push ne la renverra pas.
    const updated = next.find((r) => r.id === id);
    if (updated) void pushRemoteReminder(updated);
  },
}));

/** Prépare un rappel « une fois » pour une tâche planifiée (aide à la saisie). */
export function reminderDraftFromDate(d: Date): Pick<NewReminder, "time" | "date" | "repeat"> {
  return {
    repeat: "once",
    date: dayKey(d),
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

/** Utilitaire de test/UI : instant d'une occurrence sur un jour donné. */
export function occurrenceForDayKey(reminder: Reminder, key: string): Date | null {
  return occurrenceOn(reminder, parseDayKey(key));
}
