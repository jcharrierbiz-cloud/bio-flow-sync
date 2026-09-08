import { describe, it, expect } from "vitest";
import {
  entriesByHour,
  entriesForDay,
  searchEntries,
  summarizeDay,
  summarizeMonth,
  type JournalEntry,
} from "@/lib/journalStore";

function entry(partial: Partial<JournalEntry> & { id: string; date: string; hour: number }): JournalEntry {
  return {
    text: `Activité ${partial.id}`,
    category: "Travail",
    createdAt: "2026-09-07T08:00:00.000Z",
    updatedAt: "2026-09-07T08:00:00.000Z",
    ...partial,
  } as JournalEntry;
}

const entries: JournalEntry[] = [
  entry({ id: "1", date: "2026-09-07", hour: 9, category: "Travail" }),
  entry({ id: "2", date: "2026-09-07", hour: 9, category: "Perso", createdAt: "2026-09-07T09:30:00.000Z" }),
  entry({ id: "3", date: "2026-09-07", hour: 7, category: "Sport", text: "Course 5 km" }),
  entry({ id: "4", date: "2026-09-06", hour: 12, category: "Repas" }),
  entry({ id: "5", date: "2026-08-30", hour: 20, category: "Repos" }),
];

describe("entriesForDay", () => {
  it("ne renvoie que le jour demandé, trié par heure", () => {
    expect(entriesForDay(entries, "2026-09-07").map((e) => e.id)).toEqual(["3", "1", "2"]);
  });

  it("renvoie une liste vide pour un jour sans entrée", () => {
    expect(entriesForDay(entries, "2026-09-01")).toEqual([]);
  });
});

describe("entriesByHour", () => {
  it("regroupe plusieurs activités sur la même heure", () => {
    const byHour = entriesByHour(entries, "2026-09-07");
    expect(byHour.get(9)?.map((e) => e.id)).toEqual(["1", "2"]);
    expect(byHour.get(7)?.map((e) => e.id)).toEqual(["3"]);
    expect(byHour.has(15)).toBe(false);
  });
});

describe("summarizeDay", () => {
  it("compte les activités, les heures couvertes et les catégories", () => {
    const s = summarizeDay(entries, "2026-09-07");
    expect(s.entries).toBe(3);
    expect(s.hoursCovered).toBe(2);
    expect(s.byCategory).toEqual([
      { category: "Perso", count: 1 },
      { category: "Sport", count: 1 },
      { category: "Travail", count: 1 },
    ]);
  });
});

describe("summarizeMonth", () => {
  it("compte les entrées et les jours documentés du mois", () => {
    expect(summarizeMonth(entries, "2026-09")).toEqual({ entries: 4, days: 2 });
    expect(summarizeMonth(entries, "2026-08")).toEqual({ entries: 1, days: 1 });
  });
});

describe("searchEntries", () => {
  it("cherche dans le texte et la catégorie, sans casse", () => {
    expect(searchEntries(entries, "course").map((e) => e.id)).toEqual(["3"]);
    expect(searchEntries(entries, "REPAS").map((e) => e.id)).toEqual(["4"]);
  });

  it("ne renvoie rien sur une requête vide", () => {
    expect(searchEntries(entries, "   ")).toEqual([]);
  });
});
