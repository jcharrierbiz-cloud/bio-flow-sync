// src/lib/hrvMetrics.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Métriques VFC (HRV) : RMSSD, SDNN, pNN50 + Indice de stress (Baevsky)
//
// Fonctions PURES, sans dépendance, à partir des intervalles R-R (ms) OU des
// timestamps de pics détectés (ms) par le moteur PPG (useHeartRate.ts).
//
// ⚖️ Politique « zéro fake data » : rien n'est fabriqué. computeHrvMetrics()
//    renvoie { valid:false, reason } si le signal est insuffisant, exactement
//    comme le gating honnête déjà en place dans l'app. Aucune valeur inventée.
//
// Références :
//   - RMSSD/SDNN/pNN50 : Task Force ESC/NASPE 1996 (standards VFC).
//   - Indice de stress (Stress Index / SI) : R.M. Baevsky, cardio-intervalographie.
// -----------------------------------------------------------------------------

export interface HrvMetrics {
  /** true si le signal est suffisant pour des métriques fiables. */
  valid: boolean;
  /** Raison lisible (FR) quand valid === false. */
  reason?: string;
  /** Nombre d'intervalles R-R valides retenus après filtrage. */
  beats: number;
  /** Intervalle R-R moyen (ms). */
  meanRR: number;
  /** Fréquence cardiaque moyenne dérivée des R-R (bpm). */
  bpm: number;
  /** RMSSD (ms) — variabilité à court terme (tonus parasympathique). */
  rmssd: number;
  /** SDNN (ms) — variabilité globale. */
  sdnn: number;
  /** pNN50 (%) — proportion d'intervalles successifs différant de > 50 ms. */
  pnn50: number;
  /** Indice de stress de Baevsky (sans unité). Plus élevé = plus de stress. */
  stressIndex: number;
  /** Ratio d'artefacts écartés (0..1). */
  artifactRatio: number;
}

export interface HrvInput {
  /** Timestamps des pics R détectés (ms). */
  peaksMs?: number[];
  /** OU directement les intervalles R-R (ms). */
  rrMs?: number[];
}

// Bornes physiologiques (fréquence 30–200 bpm ⇒ R-R 300–2000 ms).
const RR_MIN_MS = 300;
const RR_MAX_MS = 2000;
// Écart relatif max entre deux R-R successifs (au-delà = battement ectopique/artefact).
const REL_JUMP = 0.2;
// Minimum de battements pour une VFC fiable (~20 R-R ≈ 20–30 s de mesure).
const MIN_BEATS = 20;
// Ratio d'artefacts au-delà duquel on refuse le calcul.
const MAX_ARTIFACT_RATIO = 0.35;

/** Convertit une liste de timestamps de pics (ms) en intervalles R-R (ms). */
export function rrFromPeaks(peaksMs: number[]): number[] {
  const sorted = [...peaksMs].sort((a, b) => a - b);
  const rr: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    rr.push(sorted[i] - sorted[i - 1]);
  }
  return rr;
}

/**
 * Filtre les intervalles non physiologiques et les battements ectopiques.
 * Renvoie { clean, removed } où removed = nombre d'intervalles écartés.
 */
export function filterArtifacts(rr: number[]): { clean: number[]; removed: number } {
  // 1) bornes absolues
  const inRange = rr.filter((v) => v >= RR_MIN_MS && v <= RR_MAX_MS);
  if (inRange.length === 0) return { clean: [], removed: rr.length };

  // 2) filtre adaptatif : écart au R-R précédent retenu
  const clean: number[] = [inRange[0]];
  let removed = rr.length - inRange.length;
  for (let i = 1; i < inRange.length; i++) {
    const prev = clean[clean.length - 1];
    const diff = Math.abs(inRange[i] - prev) / prev;
    if (diff <= REL_JUMP) clean.push(inRange[i]);
    else removed++;
  }
  return { clean, removed };
}

export function meanRR(rr: number[]): number {
  if (rr.length === 0) return 0;
  return rr.reduce((s, v) => s + v, 0) / rr.length;
}

export function heartRateFromRR(rr: number[]): number {
  const m = meanRR(rr);
  return m > 0 ? Math.round(60000 / m) : 0;
}

/** RMSSD (ms) : racine de la moyenne des carrés des différences successives. */
export function rmssd(rr: number[]): number {
  if (rr.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < rr.length; i++) {
    const d = rr[i] - rr[i - 1];
    sum += d * d;
  }
  return Math.sqrt(sum / (rr.length - 1));
}

/** SDNN (ms) : écart-type des intervalles R-R. */
export function sdnn(rr: number[]): number {
  if (rr.length < 2) return 0;
  const m = meanRR(rr);
  const variance = rr.reduce((s, v) => s + (v - m) * (v - m), 0) / (rr.length - 1);
  return Math.sqrt(variance);
}

/** pNN50 (%) : % de paires successives dont l'écart dépasse 50 ms. */
export function pnn50(rr: number[]): number {
  if (rr.length < 2) return 0;
  let count = 0;
  for (let i = 1; i < rr.length; i++) {
    if (Math.abs(rr[i] - rr[i - 1]) > 50) count++;
  }
  return (count / (rr.length - 1)) * 100;
}

/**
 * Indice de stress de Baevsky : SI = AMo / (2 · Mo · MxDMn)
 *   - Mo    : mode des R-R en secondes (classe la plus fréquente, pas de 50 ms)
 *   - AMo   : amplitude du mode en % (part des R-R dans la classe modale)
 *   - MxDMn : étendue (max − min) des R-R en secondes
 * Renvoie null si non calculable.
 */
export function baevskyStressIndex(rr: number[]): number | null {
  if (rr.length < 5) return null;

  const BIN = 50; // ms
  const bins = new Map<number, number>();
  for (const v of rr) {
    const b = Math.round(v / BIN) * BIN;
    bins.set(b, (bins.get(b) || 0) + 1);
  }

  let moBin = 0;
  let moCount = 0;
  for (const [b, c] of bins) {
    if (c > moCount) {
      moCount = c;
      moBin = b;
    }
  }

  const Mo = moBin / 1000; // s
  const AMo = (moCount / rr.length) * 100; // %
  const MxDMn = (Math.max(...rr) - Math.min(...rr)) / 1000; // s

  if (Mo <= 0 || MxDMn <= 0) return null;
  const si = AMo / (2 * Mo * MxDMn);
  return Math.round(si);
}

/**
 * Calcul complet des métriques VFC avec gating honnête.
 * Alimente scan_sessions.hrv_rmssd et scan_sessions.stress_index.
 */
export function computeHrvMetrics(input: HrvInput): HrvMetrics {
  const rawRR = input.rrMs ?? (input.peaksMs ? rrFromPeaks(input.peaksMs) : []);

  const empty: HrvMetrics = {
    valid: false,
    beats: 0,
    meanRR: 0,
    bpm: 0,
    rmssd: 0,
    sdnn: 0,
    pnn50: 0,
    stressIndex: 0,
    artifactRatio: 1,
  };

  if (rawRR.length < 2) {
    return { ...empty, reason: "Pas assez de battements détectés." };
  }

  const { clean, removed } = filterArtifacts(rawRR);
  const artifactRatio = rawRR.length > 0 ? removed / rawRR.length : 1;

  if (clean.length < MIN_BEATS) {
    return {
      ...empty,
      beats: clean.length,
      artifactRatio,
      reason: `Signal trop court (${clean.length} battements fiables, ${MIN_BEATS} requis).`,
    };
  }

  if (artifactRatio > MAX_ARTIFACT_RATIO) {
    return {
      ...empty,
      beats: clean.length,
      artifactRatio,
      reason: "Trop de bruit dans le signal — garde le doigt bien immobile.",
    };
  }

  const si = baevskyStressIndex(clean);

  return {
    valid: true,
    beats: clean.length,
    meanRR: Math.round(meanRR(clean)),
    bpm: heartRateFromRR(clean),
    rmssd: Math.round(rmssd(clean)),
    sdnn: Math.round(sdnn(clean)),
    pnn50: Math.round(pnn50(clean) * 10) / 10,
    stressIndex: si ?? 0,
    artifactRatio: Math.round(artifactRatio * 100) / 100,
  };
}

// --- Interprétations pour l'UI (labels FR + jeton de couleur Tailwind) --------

export interface Interpretation {
  label: string;
  /** Jeton de couleur du thème Bio-Flow. */
  tone: "energy" | "primary" | "destructive" | "muted-foreground";
}

/** Lecture RMSSD (repos, adulte). Bandes indicatives, non médicales. */
export function interpretRmssd(value: number): Interpretation {
  if (value <= 0) return { label: "Non mesuré", tone: "muted-foreground" };
  if (value < 20) return { label: "Faible", tone: "destructive" };
  if (value < 40) return { label: "Modérée", tone: "primary" };
  if (value < 70) return { label: "Bonne", tone: "energy" };
  return { label: "Excellente", tone: "energy" };
}

/** Lecture de l'indice de stress de Baevsky. */
export function interpretStressIndex(value: number): Interpretation {
  if (value <= 0) return { label: "Non mesuré", tone: "muted-foreground" };
  if (value < 50) return { label: "Très détendu", tone: "energy" };
  if (value < 150) return { label: "Équilibré", tone: "energy" };
  if (value < 300) return { label: "Tension modérée", tone: "primary" };
  if (value < 500) return { label: "Stress élevé", tone: "destructive" };
  return { label: "Stress très élevé", tone: "destructive" };
}
