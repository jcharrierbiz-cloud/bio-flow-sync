import { describe, it, expect } from "vitest";
import {
  collectDue,
  describeNext,
  lastOccurrence,
  nextOccurrence,
  occurrenceKey,
  occurrenceOn,
  type Reminder,
} from "@/lib/reminderStore";

function reminder(partial: Partial<Reminder> & { id: string }): Reminder {
  return {
    title: "Rappel",
    time: "09:00",
    repeat: "daily",
    enabled: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...partial,
  } as Reminder;
}

// Mardi 8 septembre 2026, 10 h locales.
const NOW = new Date(2026, 8, 8, 10, 0, 0);
const SATURDAY = new Date(2026, 8, 12, 10, 0, 0);

describe("occurrenceOn", () => {
  it("tous les jours : une occurrence chaque jour, à l'heure dite", () => {
    const occ = occurrenceOn(reminder({ id: "d", time: "07:30" }), NOW);
    expect(occ?.getHours()).toBe(7);
    expect(occ?.getMinutes()).toBe(30);
    expect(occ?.getDate()).toBe(8);
  });

  it("jours de semaine : rien le samedi", () => {
    const r = reminder({ id: "w", repeat: "weekdays" });
    expect(occurrenceOn(r, NOW)).not.toBeNull();
    expect(occurrenceOn(r, SATURDAY)).toBeNull();
  });

  it("hebdomadaire : seulement le jour choisi", () => {
    const r = reminder({ id: "s", repeat: "weekly", weekday: 6 }); // samedi
    expect(occurrenceOn(r, NOW)).toBeNull();
    expect(occurrenceOn(r, SATURDAY)).not.toBeNull();
  });

  it("une fois : seulement à la date choisie", () => {
    const r = reminder({ id: "o", repeat: "once", date: "2026-09-08" });
    expect(occurrenceOn(r, NOW)).not.toBeNull();
    expect(occurrenceOn(r, SATURDAY)).toBeNull();
  });
});

describe("nextOccurrence / lastOccurrence", () => {
  it("passe au lendemain quand l'heure du jour est déjà écoulée", () => {
    const next = nextOccurrence(reminder({ id: "d", time: "08:00" }), NOW);
    expect(next?.getDate()).toBe(9);
    expect(next?.getHours()).toBe(8);
  });

  it("renvoie l'occurrence du jour quand elle est encore à venir", () => {
    const next = nextOccurrence(reminder({ id: "d", time: "18:00" }), NOW);
    expect(next?.getDate()).toBe(8);
  });

  it("ignore un rappel désactivé", () => {
    expect(nextOccurrence(reminder({ id: "off", enabled: false }), NOW)).toBeNull();
  });

  it("retrouve la dernière occurrence passée", () => {
    const last = lastOccurrence(reminder({ id: "d", time: "08:00" }), NOW);
    expect(last?.getDate()).toBe(8);
    expect(last?.getHours()).toBe(8);
  });
});

describe("collectDue", () => {
  it("retient un rappel dont l'heure vient de passer", () => {
    const due = collectDue([reminder({ id: "a", time: "09:30" })], NOW);
    expect(due).toHaveLength(1);
    expect(due[0].late).toBe(false);
  });

  it("ignore une occurrence déjà notifiée", () => {
    const occ = new Date(2026, 8, 8, 9, 30).toISOString();
    const due = collectDue([reminder({ id: "a", time: "09:30", lastFiredAt: occ })], NOW);
    expect(due).toEqual([]);
  });

  it("marque « en retard » une occurrence trop ancienne (app fermée)", () => {
    const due = collectDue([reminder({ id: "a", time: "01:00" })], NOW, 120);
    expect(due[0].late).toBe(true);
  });

  it("ne redéclenche pas une occurrence déjà marquée manquée", () => {
    const occ = new Date(2026, 8, 8, 1, 0).toISOString();
    expect(collectDue([reminder({ id: "a", time: "01:00", lastMissedAt: occ })], NOW, 120)).toEqual([]);
  });

  it("ignore les rappels désactivés", () => {
    expect(collectDue([reminder({ id: "off", time: "08:00", enabled: false })], NOW)).toEqual([]);
  });

  it("ignore une occurrence antérieure à la création du rappel", () => {
    // Rappel quotidien à 23 h créé ce matin : l'occurrence d'hier soir n'a
    // jamais existé pour lui, il ne doit pas s'annoncer « manqué ».
    const cree = reminder({
      id: "neuf",
      time: "23:00",
      createdAt: new Date(2026, 8, 8, 9, 0).toISOString(),
    });
    expect(collectDue([cree], NOW)).toEqual([]);
  });

  it("signale bien l'occurrence manquée d'un rappel plus ancien", () => {
    const ancien = reminder({
      id: "ancien",
      time: "23:00",
      createdAt: new Date(2026, 8, 1, 9, 0).toISOString(),
    });
    const due = collectDue([ancien], NOW);
    expect(due).toHaveLength(1);
    expect(due[0].occurrence.getDate()).toBe(7);
    expect(due[0].late).toBe(true);
  });
});

describe("describeNext", () => {
  it("dit « Aujourd'hui » ou « Demain » selon le cas", () => {
    expect(describeNext(reminder({ id: "a", time: "18:00" }), NOW)).toMatch(/^Aujourd'hui à 18:00$/);
    expect(describeNext(reminder({ id: "b", time: "08:00" }), NOW)).toMatch(/^Demain à 08:00$/);
  });

  it("annonce un rappel désactivé", () => {
    expect(describeNext(reminder({ id: "c", enabled: false }), NOW)).toBe("Désactivé");
  });
});

describe("occurrenceKey (dédoublonnage avec le serveur)", () => {
  it("produit la même forme que la clé calculée côté serveur", () => {
    expect(occurrenceKey(new Date(2026, 8, 8, 18, 0))).toBe("2026-09-08T18:00");
    expect(occurrenceKey(new Date(2026, 0, 3, 7, 5))).toBe("2026-01-03T07:05");
  });

  it("empêche le planificateur local de renotifier ce que le push a envoyé", () => {
    const dejaEnvoye = reminder({
      id: "a",
      time: "09:30",
      lastSentKey: "2026-09-08T09:30",
    });
    expect(collectDue([dejaEnvoye], NOW)).toEqual([]);
  });
});
