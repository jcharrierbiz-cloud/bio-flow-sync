// src/lib/ppgQuality.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Qualité du signal PPG : couverture du doigt + stabilité du signal.
//
// Objectif : fiabiliser le scan en guidant l'utilisateur AVANT et PENDANT la
// mesure (« pose bien ton doigt », « ne bouge pas ») plutôt que de calculer une
// FC/HRV sur un signal pourri. Se branche sur les frames déjà capturées par
// useHeartRate.ts (canvas → getImageData).
//
// Fonctions pures + une classe de suivi glissant. Aucune dépendance.
// -----------------------------------------------------------------------------

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export type CoverageState = "no_finger" | "too_bright" | "too_dark" | "good";

export interface CoverageResult {
  state: CoverageState;
  /** Message d'aide (FR) à afficher sous l'anneau de scan. */
  message: string;
  /** true si la couverture permet de démarrer/continuer la mesure. */
  ok: boolean;
}

/**
 * Moyenne RGB d'une frame. `step` sous-échantillonne (perf) : 1 = tous les
 * pixels, 4 = 1 pixel sur 4 (largement suffisant pour une moyenne).
 */
export function meanRGB(data: Uint8ClampedArray, step = 4): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const stride = 4 * Math.max(1, Math.floor(step));
  for (let i = 0; i < data.length; i += stride) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (n === 0) return { r: 0, g: 0, b: 0 };
  return { r: r / n, g: g / n, b: b / n };
}

/**
 * Évalue la couverture du doigt à partir de la couleur moyenne, flash allumé.
 * Doigt bien posé sur l'objectif + flash → rouge saturé, vert/bleu faibles.
 */
export function assessCoverage(rgb: RGB): CoverageResult {
  const { r, g, b } = rgb;
  const brightness = (r + g + b) / 3;

  // Trop sombre : objectif totalement obstrué ou flash éteint.
  if (brightness < 25) {
    return {
      state: "too_dark",
      message: "Trop sombre — vérifie que le flash est allumé et allège la pression.",
      ok: false,
    };
  }

  // Doigt bien posé : dominante rouge forte (le sang filtre le vert/bleu).
  const redDominant = r > 110 && r > g * 1.6 && r > b * 1.6;
  if (redDominant) {
    return { state: "good", message: "Doigt bien positionné — reste immobile.", ok: true };
  }

  // Scène claire et équilibrée : pas de doigt, ou doigt mal plaqué.
  if (brightness > 200 || (r < g * 1.25 && r < b * 1.25)) {
    return {
      state: "no_finger",
      message: "Pose ton doigt sur la caméra ET le flash, sans le bouger.",
      ok: false,
    };
  }

  // Trop clair sous le doigt : pression trop faible, lumière parasite.
  return {
    state: "too_bright",
    message: "Couvre bien la caméra avec ton doigt (sans appuyer trop fort).",
    ok: false,
  };
}

/**
 * Suivi glissant de la qualité du signal PPG sur le canal rouge (le plus
 * pulsatile au doigt sous flash). Fournit un score 0..1 basé sur l'amplitude
 * pulsatile relative et un indicateur de stabilité (peu de mouvement).
 */
export class SignalQualityMeter {
  private samples: { t: number; v: number }[] = [];
  private windowMs: number;

  constructor(windowMs = 4000) {
    this.windowMs = windowMs;
  }

  reset(): void {
    this.samples = [];
  }

  /** Ajoute un échantillon (valeur = canal rouge moyen, t = timestamp ms). */
  push(value: number, t: number = performance.now()): void {
    this.samples.push({ t, v: value });
    const cutoff = t - this.windowMs;
    while (this.samples.length > 2 && this.samples[0].t < cutoff) {
      this.samples.shift();
    }
  }

  get count(): number {
    return this.samples.length;
  }

  /**
   * Qualité 0..1 : rapport entre l'amplitude pulsatile (crête-à-crête après
   * retrait de la tendance) et le niveau moyen. Une PPG saine oscille de
   * ~0.3 à 2 % autour de la moyenne ; on mappe ça sur 0..1.
   */
  quality(): number {
    if (this.samples.length < 10) return 0;
    const vals = this.samples.map((s) => s.v);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (mean <= 0) return 0;

    // Amplitude robuste : écart entre les 90e et 10e centiles.
    const sorted = [...vals].sort((a, b) => a - b);
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const amplitudePct = ((p90 - p10) / mean) * 100;

    // 0.15 % → ~0 (bruit), 1.5 % → ~1 (belle pulsation).
    const q = (amplitudePct - 0.15) / (1.5 - 0.15);
    return Math.max(0, Math.min(1, q));
  }

  /** true si la fenêtre est assez remplie ET la qualité suffisante. */
  isStable(threshold = 0.5): boolean {
    return this.samples.length >= 20 && this.quality() >= threshold;
  }

  /** Libellé + jeton de couleur pour l'UI. */
  label(): { text: string; tone: "energy" | "primary" | "destructive" } {
    const q = this.quality();
    if (q >= 0.6) return { text: "Signal excellent", tone: "energy" };
    if (q >= 0.35) return { text: "Signal correct", tone: "primary" };
    return { text: "Signal faible — stabilise ton doigt", tone: "destructive" };
  }
}
