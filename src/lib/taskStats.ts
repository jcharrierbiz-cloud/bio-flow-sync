// src/lib/taskStats.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Logique pure de tri et de statistiques des tâches.
//
// Isolée du store pour être testable sans React ni localStorage :
//   • groupTodos()      → répartition Aujourd'hui / Demain / … / **En retard**
//   • monthlyTaskStats()→ tâches créées vs réalisées, par mois (graphique)
//
// Règle « en retard » : une tâche non faite dont le jour prévu est **passé**.
// Elle sort des groupes du haut de page et rejoint l'espace « À rattraper ».
// Une tâche sans date prévue n'est jamais en retard (aucun jour n'a été promis).
// -----------------------------------------------------------------------------

import type { TodoItem } from "./todoStore";
import { addDays, dayKey, dayKeyOf, monthKey, monthKeyOf, monthLabel } from "./dateUtils";

export type TodoGroup =
  | "overdue"
  | "setAside"
  | "today"
  | "tomorrow"
  | "week"
  | "later"
  | "undated";

export const GROUP_LABELS: Record<TodoGroup, string> = {
  overdue: "À rattraper",
  setAside: "Laissées de côté",
  today: "Aujourd'hui",
  tomorrow: "Demain",
  week: "Cette semaine",
  later: "Plus tard",
  undated: "Sans date",
};

/** Ordre d'affichage des groupes actifs (le retard est rendu à part, en bas). */
export const ACTIVE_GROUP_ORDER: TodoGroup[] = [
  "today",
  "tomorrow",
  "week",
  "later",
  "undated",
];

export type GroupedTodos = Record<TodoGroup, TodoItem[]> & { done: TodoItem[] };

/** Une tâche est-elle en retard (non faite + jour prévu dépassé) ? */
export function isOverdue(todo: TodoItem, now: Date = new Date()): boolean {
  if (todo.done || !todo.scheduledAt) return false;
  const key = dayKeyOf(todo.scheduledAt);
  return key !== "" && key < dayKey(now);
}

function byScheduledThenCreated(a: TodoItem, b: TodoItem) {
  const av = a.scheduledAt ?? a.createdAt;
  const bv = b.scheduledAt ?? b.createdAt;
  return av.localeCompare(bv);
}

/**
 * Répartit les tâches par échéance.
 * Le retard est extrait *avant* tout le reste : rien de périmé ne peut
 * réapparaître dans « Aujourd'hui ».
 */
export function groupTodos(todos: TodoItem[], now: Date = new Date()): GroupedTodos {
  const groups: GroupedTodos = {
    overdue: [],
    setAside: [],
    today: [],
    tomorrow: [],
    week: [],
    later: [],
    undated: [],
    done: [],
  };

  const todayStr = dayKey(now);
  const tomorrowStr = dayKey(addDays(now, 1));
  const weekEndStr = dayKey(addDays(now, 7));

  for (const t of todos) {
    if (t.done) {
      groups.done.push(t);
      continue;
    }

    if (isOverdue(t, now)) {
      (t.setAside ? groups.setAside : groups.overdue).push(t);
      continue;
    }

    if (!t.scheduledAt) {
      // Sans jour prévu : « aujourd'hui » si créée aujourd'hui, sinon « sans date ».
      if (dayKeyOf(t.createdAt) === todayStr) groups.today.push(t);
      else groups.undated.push(t);
      continue;
    }

    const key = dayKeyOf(t.scheduledAt);
    if (key === todayStr) groups.today.push(t);
    else if (key === tomorrowStr) groups.tomorrow.push(t);
    else if (key > tomorrowStr && key <= weekEndStr) groups.week.push(t);
    else groups.later.push(t);
  }

  for (const key of Object.keys(groups) as (keyof GroupedTodos)[]) {
    groups[key].sort(byScheduledThenCreated);
  }
  groups.done.sort((a, b) =>
    (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt)
  );

  return groups;
}

// --- Statistiques mensuelles -------------------------------------------------

export interface MonthlyTaskStat {
  /** Clé "AAAA-MM". */
  key: string;
  /** Libellé court : "sept. 26". */
  label: string;
  /** Tâches créées ce mois-là. */
  created: number;
  /** Tâches terminées ce mois-là (quel que soit leur mois de création). */
  completed: number;
  /** Parmi les tâches créées ce mois-là, combien ont été terminées (un jour). */
  cohortCompleted: number;
  /** cohortCompleted / created, en %. `null` si aucune tâche créée. */
  cohortRate: number | null;
}

/**
 * Séries mensuelles « créées vs réalisées » sur les `months` derniers mois
 * (mois courant inclus), du plus ancien au plus récent.
 *
 * Deux lectures volontairement distinctes :
 *   • `created` / `completed` : volume d'activité du mois. Une tâche créée en
 *     août et terminée en septembre compte dans août pour l'une, septembre pour
 *     l'autre — `completed` peut donc dépasser `created` sur un mois.
 *   • `cohortRate` : taux de réalisation de ce qui a été *créé* ce mois-là.
 *     C'est la métrique honnête pour « est-ce que je tiens mes engagements ».
 */
export function monthlyTaskStats(
  todos: TodoItem[],
  months = 6,
  now: Date = new Date()
): MonthlyTaskStat[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }

  const stats = new Map<string, MonthlyTaskStat>(
    keys.map((key) => [
      key,
      { key, label: monthLabel(key), created: 0, completed: 0, cohortCompleted: 0, cohortRate: null },
    ])
  );

  for (const t of todos) {
    const createdMonth = monthKeyOf(t.createdAt);
    const createdStat = stats.get(createdMonth);
    if (createdStat) {
      createdStat.created += 1;
      if (t.done) createdStat.cohortCompleted += 1;
    }

    if (t.done) {
      // Tâches cochées avant l'ajout du champ `completedAt` : on retombe sur la
      // date de création (approximation, signalée dans l'écran Bilan).
      const doneMonth = monthKeyOf(t.completedAt) || createdMonth;
      const doneStat = stats.get(doneMonth);
      if (doneStat) doneStat.completed += 1;
    }
  }

  return keys.map((key) => {
    const s = stats.get(key)!;
    return {
      ...s,
      cohortRate: s.created > 0 ? Math.round((s.cohortCompleted / s.created) * 100) : null,
    };
  });
}

/** Totaux sur la période affichée. */
export function totalsFor(stats: MonthlyTaskStat[]) {
  const created = stats.reduce((n, s) => n + s.created, 0);
  const completed = stats.reduce((n, s) => n + s.completed, 0);
  const cohortCompleted = stats.reduce((n, s) => n + s.cohortCompleted, 0);
  return {
    created,
    completed,
    cohortCompleted,
    rate: created > 0 ? Math.round((cohortCompleted / created) * 100) : null,
  };
}

/** Nombre de tâches dont la date de réalisation est une approximation. */
export function approximatedCompletions(todos: TodoItem[]): number {
  return todos.filter((t) => t.done && !t.completedAt).length;
}
