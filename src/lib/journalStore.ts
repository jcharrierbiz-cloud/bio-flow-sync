// src/lib/journalStore.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Journal d'activité **heure par heure**.
//
// Espace indépendant de l'agenda : l'agenda est ce qui est *prévu*, le journal
// est ce qui a *réellement* eu lieu. Une heure peut contenir plusieurs entrées.
//
// Stockage : localStorage (`bioflow_journal_v1`), comme les tâches (todoStore).
// Conséquence assumée : les données restent sur l'appareil, elles ne se
// synchronisent pas entre téléphone et ordinateur. Passer sur Supabase demande
// une table + RLS (voir README du module dans la PR).
// -----------------------------------------------------------------------------

import { create } from "zustand";
import { dayKey, monthKeyOf } from "./dateUtils";

const STORAGE_KEY = "bioflow_journal_v1";

export const JOURNAL_CATEGORIES = [
  "Travail",
  "Sport",
  "Perso",
  "Santé",
  "Repas",
  "Repos",
  "Autre",
] as const;

export type JournalCategory = (typeof JOURNAL_CATEGORIES)[number];

export interface JournalEntry {
  id: string;
  /** Clé jour locale "AAAA-MM-JJ". */
  date: string;
  /** Heure de la journée, 0 → 23. */
  hour: number;
  text: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

// --- Persistance -------------------------------------------------------------

/** Nettoie une entrée venant du stockage (tolère les champs manquants). */
function sanitize(raw: unknown): JournalEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<JournalEntry>;
  if (!e.id || !e.date || typeof e.hour !== "number") return null;
  return {
    id: String(e.id),
    date: String(e.date),
    hour: Math.min(23, Math.max(0, Math.round(e.hour))),
    text: String(e.text ?? ""),
    category: String(e.category ?? "Autre"),
    createdAt: e.createdAt ?? new Date().toISOString(),
    updatedAt: e.updatedAt ?? e.createdAt ?? new Date().toISOString(),
  };
}

export function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitize).filter((e): e is JournalEntry => e !== null);
  } catch {
    return [];
  }
}

function persist(entries: JournalEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota plein ou stockage bloqué : on garde l'état en mémoire.
  }
}

// --- Sélecteurs purs (testables sans React) ----------------------------------

/** Entrées d'un jour, triées par heure puis par ordre de création. */
export function entriesForDay(entries: JournalEntry[], day: string): JournalEntry[] {
  return entries
    .filter((e) => e.date === day)
    .sort((a, b) => a.hour - b.hour || a.createdAt.localeCompare(b.createdAt));
}

/** Entrées d'un jour regroupées par heure. */
export function entriesByHour(
  entries: JournalEntry[],
  day: string
): Map<number, JournalEntry[]> {
  const map = new Map<number, JournalEntry[]>();
  for (const e of entriesForDay(entries, day)) {
    const arr = map.get(e.hour) ?? [];
    arr.push(e);
    map.set(e.hour, arr);
  }
  return map;
}

export interface DaySummary {
  entries: number;
  /** Nombre d'heures distinctes documentées. */
  hoursCovered: number;
  /** Nombre d'entrées par catégorie, du plus fréquent au moins fréquent. */
  byCategory: { category: string; count: number }[];
}

export function summarizeDay(entries: JournalEntry[], day: string): DaySummary {
  const list = entriesForDay(entries, day);
  const hours = new Set(list.map((e) => e.hour));
  const counts = new Map<string, number>();
  for (const e of list) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  return {
    entries: list.length,
    hoursCovered: hours.size,
    byCategory: [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
  };
}

/** Nombre d'entrées et de jours documentés pour un mois "AAAA-MM". */
export function summarizeMonth(entries: JournalEntry[], month: string) {
  const list = entries.filter((e) => e.date.startsWith(month));
  return {
    entries: list.length,
    days: new Set(list.map((e) => e.date)).size,
  };
}

/** Jours (clés locales) contenant au moins une entrée, pour un mois donné. */
export function daysWithEntries(entries: JournalEntry[], month: string): Set<string> {
  return new Set(entries.filter((e) => e.date.startsWith(month)).map((e) => e.date));
}

/** Recherche plein texte simple (titre + catégorie), la plus récente d'abord. */
export function searchEntries(entries: JournalEntry[], query: string): JournalEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries
    .filter(
      (e) =>
        e.text.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.hour - a.hour);
}

/** Mois (clés "AAAA-MM") où le journal contient au moins une entrée. */
export function journalMonths(entries: JournalEntry[]): string[] {
  return [...new Set(entries.map((e) => monthKeyOf(e.createdAt) || e.date.slice(0, 7)))].sort();
}

// --- Store -------------------------------------------------------------------

interface JournalState {
  entries: JournalEntry[];
  addEntry: (input: { date?: string; hour: number; text: string; category: string }) => JournalEntry | null;
  updateEntry: (id: string, patch: Partial<Pick<JournalEntry, "text" | "category" | "hour" | "date">>) => void;
  removeEntry: (id: string) => void;
  moveEntry: (id: string, hour: number) => void;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: loadEntries(),

  addEntry: ({ date, hour, text, category }) => {
    const clean = text.trim();
    if (!clean) return null;
    const now = new Date().toISOString();
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: date || dayKey(),
      hour: Math.min(23, Math.max(0, Math.round(hour))),
      text: clean,
      category: category || "Autre",
      createdAt: now,
      updatedAt: now,
    };
    const next = [...get().entries, entry];
    persist(next);
    set({ entries: next });
    return entry;
  },

  updateEntry: (id, patch) => {
    const next = get().entries.map((e) =>
      e.id === id
        ? {
            ...e,
            ...patch,
            text: patch.text !== undefined ? patch.text.trim() : e.text,
            updatedAt: new Date().toISOString(),
          }
        : e
    );
    persist(next);
    set({ entries: next });
  },

  removeEntry: (id) => {
    const next = get().entries.filter((e) => e.id !== id);
    persist(next);
    set({ entries: next });
  },

  moveEntry: (id, hour) => get().updateEntry(id, { hour }),
}));
