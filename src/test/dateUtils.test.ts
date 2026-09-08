import { describe, it, expect } from "vitest";
import { addDays, dayKey, dayKeyOf, monthKey, monthKeyOf, parseDayKey } from "@/lib/dateUtils";

describe("clés de date locales", () => {
  it("utilise le fuseau local, pas UTC", () => {
    // 23 h 30 le 7 septembre en heure locale : toISOString() basculerait au 8
    // dans tous les fuseaux à l'est de Greenwich.
    const soir = new Date(2026, 8, 7, 23, 30);
    expect(dayKey(soir)).toBe("2026-09-07");
    expect(monthKey(soir)).toBe("2026-09");
  });

  it("dérive la clé d'une date ISO", () => {
    const iso = new Date(2026, 0, 31, 22, 0).toISOString();
    expect(dayKeyOf(iso)).toBe("2026-01-31");
    expect(monthKeyOf(iso)).toBe("2026-01");
  });

  it("renvoie une chaîne vide sur une valeur absente ou invalide", () => {
    expect(dayKeyOf(undefined)).toBe("");
    expect(dayKeyOf("pas une date")).toBe("");
  });

  it("fait l'aller-retour clé → date → clé", () => {
    expect(dayKey(parseDayKey("2026-02-29"))).toBe("2026-03-01"); // 2026 n'est pas bissextile
    expect(dayKey(parseDayKey("2026-12-31"))).toBe("2026-12-31");
  });

  it("décale les jours en franchissant les mois", () => {
    expect(dayKey(addDays(parseDayKey("2026-08-31"), 1))).toBe("2026-09-01");
    expect(dayKey(addDays(parseDayKey("2026-01-01"), -1))).toBe("2025-12-31");
  });
});
