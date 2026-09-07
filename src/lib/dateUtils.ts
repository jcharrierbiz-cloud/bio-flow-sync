// src/lib/dateUtils.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Clés de date **locales**.
//
// Pourquoi ce fichier : le reste de l'app utilise souvent
// `new Date().toISOString().slice(0, 10)`, qui renvoie la date **UTC**.
// En France (UTC+1/+2), tout ce qui est saisi après 22h/23h bascule au
// lendemain — une tâche du soir apparaît alors « en retard » dès sa création.
// Les modules récents (journal, retard, stats mensuelles) passent tous par ici.
// -----------------------------------------------------------------------------

/** Clé jour locale : "AAAA-MM-JJ". */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Clé mois locale : "AAAA-MM". */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Clé jour locale d'une date ISO (renvoie "" si la valeur est absente/invalide). */
export function dayKeyOf(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dayKey(d);
}

/** Clé mois locale d'une date ISO (renvoie "" si la valeur est absente/invalide). */
export function monthKeyOf(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : monthKey(d);
}

/** "AAAA-MM-JJ" → Date locale à minuit. */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Nouvelle date décalée de `n` jours (n peut être négatif). */
export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

/** Nouvelle date décalée de `n` mois (n peut être négatif). */
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** Libellé court d'un mois : "sept. 26". */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return `${d.toLocaleDateString("fr-FR", { month: "short" })} ${String(y).slice(2)}`;
}

/** Libellé long d'un jour : "lundi 7 septembre". */
export function dayLabel(d: Date): string {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/** Heure formatée sur deux chiffres : 8 → "08:00". */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
