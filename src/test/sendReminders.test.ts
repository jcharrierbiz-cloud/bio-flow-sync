// Tests de la logique d'envoi côté serveur (supabase/functions/send-reminders).
// Cette fonction ne peut pas être déployée depuis ici : c'est justement pour ça
// qu'elle est couverte au maximum. Les pièges visés sont ceux des fuseaux —
// un rappel qui part une heure trop tôt, ou deux fois.
import { describe, it, expect } from "vitest";
import {
  collectDueRows,
  localParts,
  occursOn,
  type ReminderRow,
} from "../../supabase/functions/send-reminders/due";

function row(partial: Partial<ReminderRow> & { id: string }): ReminderRow {
  return {
    user_id: "user-1",
    title: "Rappel",
    note: null,
    time: "18:00",
    repeat: "daily",
    date: null,
    weekday: null,
    enabled: true,
    timezone: "Europe/Paris",
    last_sent_key: null,
    ...partial,
  } as ReminderRow;
}

describe("localParts", () => {
  it("convertit un instant UTC dans le fuseau demandé", () => {
    // 2026-09-08 16:05 UTC = 18:05 à Paris (heure d'été).
    const parts = localParts(new Date("2026-09-08T16:05:00Z"), "Europe/Paris");
    expect(parts).toMatchObject({ dateKey: "2026-09-08", hour: 18, minute: 5 });
  });

  it("change de jour civil selon le fuseau", () => {
    // 23:30 UTC le 8 = 01:30 le 9 à Paris, et 16:30 le 8 à Los Angeles.
    const utcInstant = new Date("2026-09-08T23:30:00Z");
    expect(localParts(utcInstant, "Europe/Paris").dateKey).toBe("2026-09-09");
    expect(localParts(utcInstant, "America/Los_Angeles").dateKey).toBe("2026-09-08");
  });

  it("gère minuit sans renvoyer 24 h", () => {
    const parts = localParts(new Date("2026-09-08T22:00:00Z"), "Europe/Paris");
    expect(parts.hour).toBe(0);
    expect(parts.dateKey).toBe("2026-09-09");
  });

  it("donne le bon jour de la semaine dans le fuseau local", () => {
    // Mardi 8 septembre 2026 à Paris, encore lundi 7 à Los Angeles.
    const utcInstant = new Date("2026-09-08T04:00:00Z");
    expect(localParts(utcInstant, "Europe/Paris").weekday).toBe(2);
    expect(localParts(utcInstant, "America/Los_Angeles").weekday).toBe(1);
  });

  it("retombe sur UTC si le fuseau est inconnu", () => {
    const parts = localParts(new Date("2026-09-08T16:05:00Z"), "Mars/Olympus_Mons");
    expect(parts).toMatchObject({ dateKey: "2026-09-08", hour: 16, minute: 5 });
  });
});

describe("occursOn", () => {
  const mardi = localParts(new Date("2026-09-08T10:00:00Z"), "Europe/Paris");
  const samedi = localParts(new Date("2026-09-12T10:00:00Z"), "Europe/Paris");

  it("quotidien : tous les jours", () => {
    expect(occursOn(row({ id: "a" }), mardi)).toBe(true);
    expect(occursOn(row({ id: "a" }), samedi)).toBe(true);
  });

  it("jours de semaine : pas le week-end", () => {
    const r = row({ id: "b", repeat: "weekdays" });
    expect(occursOn(r, mardi)).toBe(true);
    expect(occursOn(r, samedi)).toBe(false);
  });

  it("hebdomadaire : uniquement le jour choisi", () => {
    const r = row({ id: "c", repeat: "weekly", weekday: 6 });
    expect(occursOn(r, mardi)).toBe(false);
    expect(occursOn(r, samedi)).toBe(true);
  });

  it("ponctuel : uniquement à la date choisie", () => {
    const r = row({ id: "d", repeat: "once", date: "2026-09-08" });
    expect(occursOn(r, mardi)).toBe(true);
    expect(occursOn(r, samedi)).toBe(false);
  });
});

describe("collectDueRows", () => {
  // 16:02 UTC = 18:02 à Paris : un rappel de 18:00 vient d'échoir.
  const now = new Date("2026-09-08T16:02:00Z");

  it("retient un rappel dont l'heure locale vient de passer", () => {
    const due = collectDueRows([row({ id: "a", time: "18:00" })], now);
    expect(due).toHaveLength(1);
    expect(due[0].occurrenceKey).toBe("2026-09-08T18:00");
    expect(due[0].lateMinutes).toBe(2);
  });

  it("n'envoie rien avant l'heure", () => {
    expect(collectDueRows([row({ id: "a", time: "18:30" })], now)).toEqual([]);
  });

  it("ne rattrape pas une occurrence trop ancienne", () => {
    // 08:00 à Paris, il est 18:02 : la planification n'a pas tourné, tant pis.
    expect(collectDueRows([row({ id: "a", time: "08:00" })], now, 15)).toEqual([]);
  });

  it("n'envoie pas deux fois la même occurrence", () => {
    const already = row({ id: "a", time: "18:00", last_sent_key: "2026-09-08T18:00" });
    expect(collectDueRows([already], now)).toEqual([]);
  });

  it("renvoie bien le lendemain, une fois la clé changée", () => {
    const already = row({ id: "a", time: "18:00", last_sent_key: "2026-09-07T18:00" });
    expect(collectDueRows([already], now)).toHaveLength(1);
  });

  it("respecte le fuseau propre à chaque rappel", () => {
    // Au même instant : 18:02 à Paris, 09:02 à Los Angeles.
    const paris = row({ id: "p", time: "18:00", timezone: "Europe/Paris" });
    const la = row({ id: "l", time: "18:00", timezone: "America/Los_Angeles" });
    const laMatin = row({ id: "m", time: "09:00", timezone: "America/Los_Angeles" });

    const due = collectDueRows([paris, la, laMatin], now);
    expect(due.map((d) => d.reminder.id).sort()).toEqual(["m", "p"]);
  });

  it("ignore les rappels désactivés", () => {
    expect(collectDueRows([row({ id: "a", time: "18:00", enabled: false })], now)).toEqual([]);
  });

  it("ignore un ponctuel dont la date n'est pas celle du jour local", () => {
    const r = row({ id: "a", time: "18:00", repeat: "once", date: "2026-09-09" });
    expect(collectDueRows([r], now)).toEqual([]);
  });
});
