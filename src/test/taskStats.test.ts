import { describe, it, expect } from "vitest";
import {
  ACTIVE_GROUP_ORDER,
  groupTodos,
  isOverdue,
  monthlyTaskStats,
  totalsFor,
} from "@/lib/taskStats";
import { migrateTodos, rescheduleIsoForDay, type TodoItem } from "@/lib/todoStore";

const NOW = new Date(2026, 8, 7, 14, 0, 0); // lundi 7 septembre 2026, 14 h locales

/** Fabrique une tâche avec des dates **locales** (pas UTC). */
function todo(partial: Partial<TodoItem> & { id: string }): TodoItem {
  return {
    title: `Tâche ${partial.id}`,
    category: "Perso",
    done: false,
    createdAt: new Date(2026, 8, 1, 10, 0).toISOString(),
    ...partial,
  } as TodoItem;
}

const at = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h, 0).toISOString();

describe("isOverdue", () => {
  it("marque en retard une tâche non faite dont le jour prévu est passé", () => {
    expect(isOverdue(todo({ id: "a", scheduledAt: at(2026, 8, 5) }), NOW)).toBe(true);
  });

  it("ne marque pas en retard une tâche prévue aujourd'hui, même à une heure passée", () => {
    expect(isOverdue(todo({ id: "b", scheduledAt: at(2026, 8, 7, 8) }), NOW)).toBe(false);
  });

  it("ne marque jamais en retard une tâche faite ou sans date prévue", () => {
    expect(isOverdue(todo({ id: "c", scheduledAt: at(2026, 8, 1), done: true }), NOW)).toBe(false);
    expect(isOverdue(todo({ id: "d" }), NOW)).toBe(false);
  });
});

describe("groupTodos", () => {
  const todos: TodoItem[] = [
    todo({ id: "retard", scheduledAt: at(2026, 8, 4) }),
    todo({ id: "retard-assume", scheduledAt: at(2026, 7, 20), setAside: true }),
    todo({ id: "aujourdhui", scheduledAt: at(2026, 8, 7, 18) }),
    todo({ id: "demain", scheduledAt: at(2026, 8, 8) }),
    todo({ id: "semaine", scheduledAt: at(2026, 8, 12) }),
    todo({ id: "plus-tard", scheduledAt: at(2026, 9, 3) }),
    todo({ id: "sans-date", createdAt: at(2026, 8, 2) }),
    todo({ id: "creee-aujourdhui", createdAt: at(2026, 8, 7, 11) }),
    todo({ id: "faite", scheduledAt: at(2026, 8, 3), done: true, completedAt: at(2026, 8, 3, 20) }),
  ];

  const groups = groupTodos(todos, NOW);

  it("sort le retard des groupes du haut de page", () => {
    expect(groups.overdue.map((t) => t.id)).toEqual(["retard"]);
    const enAvant = ACTIVE_GROUP_ORDER.flatMap((g) => groups[g]).map((t) => t.id);
    expect(enAvant).not.toContain("retard");
    expect(enAvant).not.toContain("retard-assume");
  });

  it("isole les tâches laissées de côté", () => {
    expect(groups.setAside.map((t) => t.id)).toEqual(["retard-assume"]);
  });

  it("range chaque tâche dans son échéance", () => {
    expect(groups.today.map((t) => t.id).sort()).toEqual(["aujourdhui", "creee-aujourdhui"]);
    expect(groups.tomorrow.map((t) => t.id)).toEqual(["demain"]);
    expect(groups.week.map((t) => t.id)).toEqual(["semaine"]);
    expect(groups.later.map((t) => t.id)).toEqual(["plus-tard"]);
    expect(groups.undated.map((t) => t.id)).toEqual(["sans-date"]);
    expect(groups.done.map((t) => t.id)).toEqual(["faite"]);
  });

  it("ne perd aucune tâche", () => {
    const total = Object.values(groups).reduce((n, list) => n + list.length, 0);
    expect(total).toBe(todos.length);
  });
});

describe("monthlyTaskStats", () => {
  const todos: TodoItem[] = [
    // Août : 2 créées, 1 terminée en août, 1 terminée en septembre.
    todo({ id: "a1", createdAt: at(2026, 7, 3), done: true, completedAt: at(2026, 7, 10) }),
    todo({ id: "a2", createdAt: at(2026, 7, 20), done: true, completedAt: at(2026, 8, 2) }),
    // Septembre : 3 créées, 1 terminée.
    todo({ id: "s1", createdAt: at(2026, 8, 1), done: true, completedAt: at(2026, 8, 6) }),
    todo({ id: "s2", createdAt: at(2026, 8, 2) }),
    todo({ id: "s3", createdAt: at(2026, 8, 5) }),
  ];

  const stats = monthlyTaskStats(todos, 3, NOW);

  it("renvoie un point par mois, du plus ancien au plus récent", () => {
    expect(stats.map((s) => s.key)).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("compte les créations au mois de création", () => {
    expect(stats.find((s) => s.key === "2026-08")!.created).toBe(2);
    expect(stats.find((s) => s.key === "2026-09")!.created).toBe(3);
  });

  it("compte les réalisations au mois de réalisation", () => {
    expect(stats.find((s) => s.key === "2026-08")!.completed).toBe(1);
    expect(stats.find((s) => s.key === "2026-09")!.completed).toBe(2);
  });

  it("calcule un taux de cohorte sur ce qui a été créé dans le mois", () => {
    expect(stats.find((s) => s.key === "2026-08")!.cohortRate).toBe(100);
    expect(stats.find((s) => s.key === "2026-09")!.cohortRate).toBe(33);
    expect(stats.find((s) => s.key === "2026-07")!.cohortRate).toBeNull();
  });

  it("totalise la période affichée", () => {
    expect(totalsFor(stats)).toMatchObject({ created: 5, completed: 3, cohortCompleted: 3, rate: 60 });
  });

  it("retombe sur la date de création quand la date de réalisation manque", () => {
    const legacy = [todo({ id: "old", createdAt: at(2026, 7, 15), done: true })];
    const s = monthlyTaskStats(legacy, 3, NOW);
    expect(s.find((x) => x.key === "2026-08")!.completed).toBe(1);
  });
});

describe("migrateTodos", () => {
  it("conserve les tâches existantes et complète les champs manquants", () => {
    const stored = [
      { id: "1", title: "Ancienne", category: "Travail", done: true, createdAt: at(2026, 7, 1) },
      { id: "2", title: "Ouverte", category: "Perso", done: false, createdAt: at(2026, 8, 1) },
    ];
    const { todos, changed } = migrateTodos(stored);
    expect(todos).toHaveLength(2);
    expect(todos[0].title).toBe("Ancienne");
    expect(todos[0].completedAt).toBe(stored[0].createdAt);
    expect(todos[1].completedAt).toBeUndefined();
    expect(changed).toBe(true);
  });

  it("ne modifie rien quand les données sont déjà à jour", () => {
    const stored = [
      { id: "1", title: "OK", category: "Perso", done: true, createdAt: at(2026, 8, 1), completedAt: at(2026, 8, 2) },
    ];
    expect(migrateTodos(stored).changed).toBe(false);
  });

  it("résiste à un contenu corrompu", () => {
    expect(migrateTodos(null).todos).toEqual([]);
    expect(migrateTodos("cassé").todos).toEqual([]);
  });
});

describe("rescheduleIsoForDay", () => {
  it("garde l'heure d'origine sur le nouveau jour", () => {
    const t = todo({ id: "x", scheduledAt: at(2026, 8, 2, 18) });
    const iso = rescheduleIsoForDay(t, "2026-09-09");
    const d = new Date(iso);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(9);
    expect(d.getHours()).toBe(18);
  });

  it("retient 09:00 quand aucune heure n'était fixée", () => {
    const iso = rescheduleIsoForDay(todo({ id: "y" }), "2026-09-09");
    expect(new Date(iso).getHours()).toBe(9);
  });
});
