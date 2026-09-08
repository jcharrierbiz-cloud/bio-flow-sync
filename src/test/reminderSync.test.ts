// Fusion de la copie locale et de la copie serveur des rappels.
// L'enjeu : ne rien perdre, et ne jamais notifier deux fois la même occurrence.
import { describe, it, expect } from "vitest";
import { mergeReminders, reminderToRow, rowToReminder } from "@/lib/reminderSync";
import type { Reminder } from "@/lib/reminderStore";

function reminder(partial: Partial<Reminder> & { id: string }): Reminder {
  return {
    title: "Rappel",
    time: "18:00",
    repeat: "daily",
    enabled: true,
    timezone: "Europe/Paris",
    createdAt: "2026-09-01T08:00:00.000Z",
    ...partial,
  } as Reminder;
}

describe("mergeReminders", () => {
  it("téléverse ce qui n'existait que sur l'appareil, sans le perdre", () => {
    const local = [reminder({ id: "local-only", title: "Créé avant la synchro" })];
    const { merged, toUpload } = mergeReminders(local, []);
    expect(merged.map((r) => r.id)).toEqual(["local-only"]);
    expect(toUpload.map((r) => r.id)).toEqual(["local-only"]);
  });

  it("récupère ce qui a été créé sur un autre appareil", () => {
    const remote = [reminder({ id: "remote-only", title: "Créé sur le téléphone" })];
    const { merged, toUpload } = mergeReminders([], remote);
    expect(merged.map((r) => r.id)).toEqual(["remote-only"]);
    expect(toUpload).toEqual([]);
  });

  it("garde la version la plus récemment modifiée", () => {
    const local = [reminder({ id: "x", title: "Ancien titre", updatedAt: "2026-09-02T10:00:00.000Z" })];
    const remote = [reminder({ id: "x", title: "Titre à jour", updatedAt: "2026-09-05T10:00:00.000Z" })];
    expect(mergeReminders(local, remote).merged[0].title).toBe("Titre à jour");

    const localRecent = [reminder({ id: "x", title: "Modifié ici", updatedAt: "2026-09-06T10:00:00.000Z" })];
    expect(mergeReminders(localRecent, remote).merged[0].title).toBe("Modifié ici");
  });

  it("laisse toujours le serveur trancher sur ce qui a déjà été envoyé", () => {
    // Le local est plus récent sur le contenu, mais c'est le serveur qui a
    // envoyé la notification : sa clé d'occurrence doit survivre à la fusion,
    // sinon l'appareil renotifie la même occurrence.
    const local = [reminder({ id: "x", title: "Modifié ici", updatedAt: "2026-09-06T10:00:00.000Z" })];
    const remote = [
      reminder({
        id: "x",
        title: "Ancien",
        updatedAt: "2026-09-05T10:00:00.000Z",
        lastSentKey: "2026-09-08T18:00",
      }),
    ];
    const { merged } = mergeReminders(local, remote);
    expect(merged[0].title).toBe("Modifié ici");
    expect(merged[0].lastSentKey).toBe("2026-09-08T18:00");
  });

  it("ne supprime jamais un rappel des deux listes", () => {
    const local = [reminder({ id: "a" }), reminder({ id: "b" })];
    const remote = [reminder({ id: "b" }), reminder({ id: "c" })];
    const { merged } = mergeReminders(local, remote);
    expect(merged.map((r) => r.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("conversion ligne ⇄ rappel", () => {
  it("fait l'aller-retour sans perdre d'information utile", () => {
    const original = reminder({
      id: "x",
      title: "Facturer",
      note: "Fin de semaine",
      repeat: "weekly",
      weekday: 5,
      lastSentKey: "2026-09-04T18:00",
    });
    const back = rowToReminder(reminderToRow(original, "user-1"));
    expect(back).toMatchObject({
      id: "x",
      title: "Facturer",
      note: "Fin de semaine",
      repeat: "weekly",
      weekday: 5,
      timezone: "Europe/Paris",
      lastSentKey: "2026-09-04T18:00",
    });
  });

  it("n'écrit une date que pour un rappel ponctuel, un jour que pour un hebdomadaire", () => {
    const quotidien = reminderToRow(
      reminder({ id: "d", repeat: "daily", date: "2026-09-08", weekday: 3 }),
      "user-1"
    );
    expect(quotidien.date).toBeNull();
    expect(quotidien.weekday).toBeNull();

    const ponctuel = reminderToRow(
      reminder({ id: "o", repeat: "once", date: "2026-09-08" }),
      "user-1"
    );
    expect(ponctuel.date).toBe("2026-09-08");
  });
});
