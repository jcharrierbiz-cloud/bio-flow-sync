// src/lib/scanEnhancements.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Façade d'amélioration du scan PPG.
//
// Relie en UNE API simple les 4 briques d'amélioration, pour se brancher dans
// le moteur existant (useHeartRate.ts) SANS le réécrire :
//   • flash FORCÉ (torchController)
//   • qualité du signal + couverture du doigt (ppgQuality)
//   • VFC RMSSD + indice de stress (hrvMetrics)
//   • sons/haptique satisfaisants (feedback)
//
// @example  (dans le composant/hook de scan)
//   const scan = new ScanEnhancer();
//   const stream = await navigator.mediaDevices.getUserMedia(...); // flux existant
//   const torch = await scan.begin(stream);
//   if (!torch.supported) toast(torch.reason);      // iOS : message honnête
//
//   // à chaque frame déjà capturée sur ton canvas :
//   const coverage = scan.onFrameData(ctx.getImageData(0,0,w,h).data);
//   setHint(coverage.message);                        // guide l'utilisateur
//
//   // à chaque pulsation détectée par ton moteur :
//   scan.onBeat();                                    // son « toc » + vibration
//
//   // en fin de mesure :
//   const m = scan.finish();                          // { valid, rmssd, stressIndex, bpm ... }
//   if (m.valid) await saveScan({ bpm: m.bpm, hrv_rmssd: m.rmssd, stress_index: m.stressIndex, ... });
// -----------------------------------------------------------------------------

import { TorchController, type TorchState } from "@/lib/torchController";
import { SignalQualityMeter, meanRGB, assessCoverage, type CoverageResult } from "@/lib/ppgQuality";
import { computeHrvMetrics, type HrvMetrics } from "@/lib/hrvMetrics";
import { feedback } from "@/lib/feedback";

export class ScanEnhancer {
  private torch = new TorchController();
  private quality = new SignalQualityMeter();
  private peaks: number[] = [];
  private started = false;

  /**
   * Démarre l'amélioration : rattache le flux, FORCE le flash, joue le son de
   * démarrage. Renvoie l'état du torch (honnête : supported=false sur iOS).
   */
  async begin(stream: MediaStream): Promise<TorchState> {
    this.reset();
    this.torch.attach(stream);
    const state = await this.torch.enable();
    feedback.scanStart();
    this.started = true;
    return state;
  }

  /** Réapplique le flash s'il s'est éteint (à appeler périodiquement, ex. toutes les 3 s). */
  async keepTorchOn(): Promise<void> {
    await this.torch.ensureOn();
  }

  /**
   * À appeler à chaque frame capturée (données RGBA du canvas).
   * Alimente la qualité du signal et renvoie l'état de couverture du doigt.
   */
  onFrameData(rgba: Uint8ClampedArray): CoverageResult {
    const rgb = meanRGB(rgba);
    this.quality.push(rgb.r);
    return assessCoverage(rgb);
  }

  /** Variante si tu as déjà la moyenne du canal rouge (perf). */
  onRedSample(red: number, tMs: number = performance.now()): void {
    this.quality.push(red, tMs);
  }

  /** Qualité courante du signal 0..1 + libellé UI. */
  signalQuality(): number {
    return this.quality.quality();
  }
  signalLabel() {
    return this.quality.label();
  }
  isSignalStable(): boolean {
    return this.quality.isStable();
  }

  /**
   * À appeler à CHAQUE pulsation détectée par ton moteur. Enregistre le pic
   * (pour la VFC) et joue le petit « toc » satisfaisant + micro-vibration.
   */
  onBeat(tMs: number = performance.now()): void {
    this.peaks.push(tMs);
    feedback.beat();
  }

  /** Alternative : fournir directement les intervalles R-R (ms). */
  setRRIntervals(rrMs: number[]): void {
    // Reconstruit des pseudo-timestamps cumulés pour rester cohérent en interne.
    let t = 0;
    this.peaks = [0, ...rrMs.map((rr) => (t += rr))];
  }

  /** Petit tic de décompte pendant l'attente. */
  tick(): void {
    feedback.tick();
  }

  /** Nombre de pulsations enregistrées jusque-là. */
  get beatCount(): number {
    return Math.max(0, this.peaks.length - 1);
  }

  /**
   * Termine la mesure : éteint le flash, joue le son de fin, calcule et renvoie
   * les métriques VFC. `valid=false` si le signal est insuffisant (gating honnête).
   */
  finish(): HrvMetrics {
    const metrics = computeHrvMetrics({ peaksMs: this.peaks });
    if (metrics.valid) feedback.scanComplete();
    else feedback.error();
    this.torch.disable().catch(() => {});
    this.started = false;
    return metrics;
  }

  /** Annulation propre (retour arrière, permission refusée…). */
  async cancel(): Promise<void> {
    await this.torch.disable().catch(() => {});
    this.reset();
  }

  private reset(): void {
    this.quality.reset();
    this.peaks = [];
    this.started = false;
  }

  get isRunning(): boolean {
    return this.started;
  }
}
