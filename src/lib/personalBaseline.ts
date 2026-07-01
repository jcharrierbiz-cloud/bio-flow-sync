/**
 * personalBaseline.ts — Baseline personnelle glissante pour Bio-Flow
 * ---------------------------------------------------------------------------
 * Adapté à la table réelle `scan_sessions` :
 *   scanned_at, bpm, hrv_rmssd, readiness_score, stress_index,
 *   is_morning_scan, signal_quality (colonne ajoutée par 0001_fix_rls_security).
 *
 * RÔLE : transformer l'historique (~30 j) en "normal personnel", puis situer
 * la mesure du jour PAR RAPPORT À CE NORMAL — pas à une référence universelle.
 * C'est le cœur de la promesse : "ton énergie vs TON habitude".
 *
 * COHÉRENCE MATIN : la promesse porte sur l'énergie DU MATIN. Par défaut la
 * baseline ne retient donc que les scans du matin (is_morning_scan = true) :
 * on compare matin à matin. Comparer un scan du matin à des scans de fin de
 * journée fausserait tout.
 *
 * HONNÊTETÉ (volontaire) :
 *  - < MIN_MEASUREMENTS scans fiables → statut "calibrating" (on n'invente pas
 *    un normal après 2 scans).
 *  - signal_quality insuffisant → mesure EXCLUE de la baseline.
 *  - hrv_rmssd souvent absent (le moteur PPG l'omet si peu fiable) → optionnel,
 *    jamais inventé.
 *  - Cadre BIEN-ÊTRE, pas médical. Aucune sortie n'est un diagnostic.
 *
 * Module PUR (aucune dépendance, aucun I/O) → testable.
 */

// ── Types alignés sur scan_sessions ─────────────────────────────────────────

export interface ScanRow {
  scanned_at: string;              // ISO 8601
  bpm: number;
  hrv_rmssd: number | null;        // null = non disponible ce jour-là
  readiness_score: number;         // 0–100 (heuristique ; voir note)
  stress_index: number | null;
  is_morning_scan: boolean;
  signal_quality: number | null;   // 0–1 ; null toléré (anciens scans)
}

export type MetricDirection = "higher_is_better" | "lower_is_better";

export type RelativeLevel =
  | "well_below" | "below" | "typical" | "above" | "well_above";

export interface MetricComparison {
  value: number;
  mean: number;
  std: number;
  z: number;
  level: RelativeLevel;
  direction: MetricDirection;
  favorable: boolean | null;   // true = meilleur que l'habitude ; null si typical
}

export interface BaselineComparison {
  status: "calibrating" | "ready";
  measurementsUsed: number;
  daysObserved: number;
  calibrationRemaining: number;
  energy: MetricComparison | null;     // basé sur readiness_score
  restingHr: MetricComparison | null;  // basé sur bpm
  hrv: MetricComparison | null;        // basé sur hrv_rmssd (souvent null)
}

// ── Paramètres ──────────────────────────────────────────────────────────────

const WINDOW_DAYS = 30;
const MIN_QUALITY = 0.5;         // sous ce seuil : exclu de la baseline
const MIN_MEASUREMENTS = 5;      // en dessous : calibration
const STD_FLOOR_READINESS = 4;
const STD_FLOOR_BPM = 2;
const STD_FLOOR_HRV = 4;
const Z_WELL = 1.5;
const Z_SOME = 0.5;

// ── Stats ───────────────────────────────────────────────────────────────────

function mean(a: number[]): number {
  if (!a.length) return 0;
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}

function std(a: number[], floor: number): number {
  if (a.length < 2) return floor;
  const m = mean(a);
  let s = 0;
  for (const v of a) s += (v - m) * (v - m);
  return Math.max(floor, Math.sqrt(s / (a.length - 1)));
}

function levelFromZ(z: number): RelativeLevel {
  if (z <= -Z_WELL) return "well_below";
  if (z <= -Z_SOME) return "below";
  if (z < Z_SOME) return "typical";
  if (z < Z_WELL) return "above";
  return "well_above";
}

function isFavorable(level: RelativeLevel, dir: MetricDirection): boolean | null {
  if (level === "typical") return null;
  const above = level === "above" || level === "well_above";
  return dir === "higher_is_better" ? above : !above;
}

function buildComparison(
  todayValue: number,
  history: number[],
  direction: MetricDirection,
  stdFloor: number
): MetricComparison | null {
  if (history.length < MIN_MEASUREMENTS) return null;
  const m = mean(history);
  const s = std(history, stdFloor);
  const z = (todayValue - m) / s;
  const level = levelFromZ(z);
  return {
    value: todayValue,
    mean: Math.round(m * 10) / 10,
    std: Math.round(s * 10) / 10,
    z: Math.round(z * 100) / 100,
    level,
    direction,
    favorable: isFavorable(level, direction),
  };
}

// ── API ─────────────────────────────────────────────────────────────────────

/**
 * Compare le scan du jour à la baseline.
 *
 * @param today        Le scan d'aujourd'hui.
 * @param history      Les scans précédents (30 j). today est retiré par prudence.
 * @param morningOnly  Si true (défaut) la baseline ne retient que les scans du
 *                     matin — cohérent avec la promesse "énergie du matin".
 *
 * Sens des métriques :
 *  - energy (readiness_score) : higher_is_better.
 *  - restingHr (bpm)          : lower_is_better (FC plus haute QUE TON HABITUDE
 *                               ↔ souvent fatigue/stress). Relatif, pas absolu.
 *  - hrv (hrv_rmssd)          : higher_is_better.
 *
 * NOTE readiness_score : heuristique non validée en ABSOLU. Mais sa VARIATION
 * vs ta propre baseline capte un vrai signal (readiness bas pour toi ↔ FC plus
 * haute et/ou HRV plus basse que d'habitude). Le relatif sauve en partie
 * l'arbitraire de l'absolu — ça reste du bien-être, pas du clinique.
 */
export function compareToBaseline(
  today: ScanRow,
  history: ScanRow[],
  morningOnly = true,
  now: Date = new Date()
): BaselineComparison {
  const cutoff = now.getTime() - WINDOW_DAYS * 24 * 3600 * 1000;

  const usable = history.filter((m) => {
    const q = m.signal_quality ?? 1; // null toléré : on ne rejette pas faute de mieux
    return (
      q >= MIN_QUALITY &&
      new Date(m.scanned_at).getTime() >= cutoff &&
      m.scanned_at !== today.scanned_at &&
      (!morningOnly || m.is_morning_scan)
    );
  });

  const n = usable.length;
  let daysObserved = 0;
  if (n > 0) {
    const t = usable.map((m) => new Date(m.scanned_at).getTime());
    daysObserved = Math.round((Math.max(...t) - Math.min(...t)) / (24 * 3600 * 1000));
  }

  if (n < MIN_MEASUREMENTS) {
    return {
      status: "calibrating",
      measurementsUsed: n,
      daysObserved,
      calibrationRemaining: MIN_MEASUREMENTS - n,
      energy: null, restingHr: null, hrv: null,
    };
  }

  const readinessHist = usable.map((m) => m.readiness_score);
  const bpmHist = usable.map((m) => m.bpm);
  const hrvHist = usable
    .map((m) => m.hrv_rmssd)
    .filter((v): v is number => v != null && v > 0);

  return {
    status: "ready",
    measurementsUsed: n,
    daysObserved,
    calibrationRemaining: 0,
    energy: buildComparison(today.readiness_score, readinessHist, "higher_is_better", STD_FLOOR_READINESS),
    restingHr: buildComparison(today.bpm, bpmHist, "lower_is_better", STD_FLOOR_BPM),
    hrv:
      today.hrv_rmssd != null && today.hrv_rmssd > 0
        ? buildComparison(today.hrv_rmssd, hrvHist, "higher_is_better", STD_FLOOR_HRV)
        : null,
  };
}

/**
 * Tendance sur la fenêtre (scans du matin) : "amélioration ou non" demandée.
 * Observation seulement — jamais une alerte.
 */
export function readinessTrend(
  history: ScanRow[],
  morningOnly = true,
  now: Date = new Date()
): { status: "insufficient" | "improving" | "stable" | "declining"; delta: number } {
  const cutoff = now.getTime() - WINDOW_DAYS * 24 * 3600 * 1000;
  const usable = history
    .filter((m) => {
      const q = m.signal_quality ?? 1;
      return q >= MIN_QUALITY &&
        new Date(m.scanned_at).getTime() >= cutoff &&
        (!morningOnly || m.is_morning_scan);
    })
    .sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime());

  if (usable.length < 8) return { status: "insufficient", delta: 0 };

  const half = Math.floor(usable.length / 2);
  const older = mean(usable.slice(0, half).map((m) => m.readiness_score));
  const recent = mean(usable.slice(half).map((m) => m.readiness_score));
  const delta = Math.round(recent - older);

  let status: "improving" | "stable" | "declining" = "stable";
  if (delta >= 5) status = "improving";
  else if (delta <= -5) status = "declining";
  return { status, delta };
}
