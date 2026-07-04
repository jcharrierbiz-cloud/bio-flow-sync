/**
 * wellness.ts — Heuristiques bien-être partagées (readiness / stress).
 * ---------------------------------------------------------------------------
 * Ce calcul est EXACTEMENT le même que celui de useHeartRate.ts (chemin caméra).
 * On l'extrait ici pour que le chemin "montre" (Bluetooth) produise des scores
 * cohérents avec le chemin caméra, et pour éviter la duplication.
 *
 * Refactor conseillé (optionnel) : dans useHeartRate.ts, remplace la fonction
 * locale computeWellness par `import { computeWellness } from "@/lib/wellness";`
 *
 * ⚠️ Ces heuristiques ne sont PAS validées cliniquement. Idéalement à recalibrer
 * sur la baseline personnelle de l'utilisateur (cf. src/lib/personalBaseline.ts).
 */

export interface WellnessResult {
  readiness: number;   // 0–100
  stressIndex: number; // 0–100, 0 = non disponible
}

export function computeWellness(bpm: number, hrv: number): WellnessResult {
  let stressIndex = 0;
  if (hrv > 0) {
    // RMSSD élevée → stress bas. Référence ~50 ms. Heuristique bornée.
    stressIndex = Math.round(Math.max(5, Math.min(100, 100 - hrv * 1.4)));
  }

  let readiness = 50;
  if (hrv > 0) {
    if (hrv > 50) readiness += 25;
    else if (hrv > 35) readiness += 15;
    else if (hrv > 20) readiness += 5;
    else readiness -= 10;
  }
  if (bpm < 60) readiness += 20;
  else if (bpm < 75) readiness += 10;
  else if (bpm < 90) readiness += 0;
  else readiness -= 10;
  readiness = Math.max(0, Math.min(100, readiness));

  return { readiness, stressIndex };
}

/** RMSSD (ms) à partir d'intervalles RR (ms). Renvoie 0 si pas assez de data. */
export function rmssdFromRR(rrMs: number[]): number {
  // Bornes physiologiques : 300 ms (200 bpm) à 2000 ms (30 bpm)
  const rr = rrMs.filter((v) => v >= 300 && v <= 2000);
  if (rr.length < 5) return 0;
  let sum = 0;
  for (let i = 1; i < rr.length; i++) {
    const d = rr[i] - rr[i - 1];
    sum += d * d;
  }
  return Math.round(Math.sqrt(sum / (rr.length - 1)));
}
