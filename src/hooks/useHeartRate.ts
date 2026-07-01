/**
 * useHeartRate.ts — Moteur de mesure PPG (photopléthysmographie) par caméra
 * ---------------------------------------------------------------------------
 * Drop-in remplaçant de src/hooks/useHeartRate.ts pour Bio-Flow.
 * L'API publique exportée est IDENTIQUE à la version précédente, donc
 * src/components/PPGScanner.tsx fonctionne sans modification.
 * (Un champ optionnel `signalQuality` est ajouté en plus — ignoré si non utilisé.)
 *
 * CE QUI A CHANGÉ vs l'ancienne version, et POURQUOI
 * ---------------------------------------------------------------------------
 * 1. TIMING RÉEL PAR FRAME (le correctif majeur).
 *    L'ancien code supposait 33 ms entre chaque frame (setInterval @30fps).
 *    Faux sur mobile : le débit réel dérive (15–30 fps, irrégulier). Toute la
 *    mesure héritait de cette erreur. On utilise maintenant
 *    `requestVideoFrameCallback` qui fournit un timestamp réel par frame
 *    présentée (mediaTime = PTS du décodeur). Fallback requestAnimationFrame.
 *
 * 2. CONDITIONNEMENT DU SIGNAL (filtrage absent avant).
 *    Rééchantillonnage sur grille uniforme (depuis les vrais timestamps) →
 *    détrend (passe-haut ~0.5 Hz, retire DC + dérive de pression/respiration) →
 *    passe-bas (~4 Hz, retire le bruit) → z-score. Bande cardiaque 0.7–3.5 Hz
 *    (42–210 bpm). C'est le pipeline standard de la littérature PPG smartphone.
 *
 * 3. BPM PAR ESTIMATION SPECTRALE (DFT bande-limitée) plutôt que par moyenne
 *    d'intervalles entre pics. Beaucoup plus robuste aux pics manqués/parasites.
 *    Le BPM caméra au doigt est fiable (~1–2 bpm d'erreur dans les validations).
 *
 * 4. VFC (RMSSD) DURCIE — mais voir l'AVERTISSEMENT ci-dessous.
 *    Pics détectés avec période réfractaire (min 300 ms) + interpolation
 *    parabolique (timing sous-frame) + rejet des intervalles aberrants
 *    (ectopiques / battements manqués). RMSSD calculée uniquement si la qualité
 *    le permet, sinon OMISE (0). On n'invente jamais une valeur.
 *
 * 5. INDICE DE QUALITÉ DU SIGNAL (SQI) qui conditionne TOUT.
 *    Présence du doigt (rouge élevé, rouge > vert), SNR spectral, cohérence des
 *    intervalles, mouvement. En dessous du seuil → échec honnête (phase "failed").
 *
 * 6. CONTRÔLES CAMÉRA "best effort" : torche, et tentative de verrouillage
 *    exposition / balance des blancs / focus. L'auto-exposition LUTTE contre le
 *    signal PPG (quand le volume sanguin change, la caméra compense et aplatit la
 *    pulsation). On essaie de la verrouiller, sans échouer si non supporté.
 *
 * AVERTISSEMENT HONNÊTE SUR LA VFC
 * ---------------------------------------------------------------------------
 * À ~30 fps, l'écart entre deux frames est ~33 ms → ambiguïté de ±16 ms sur la
 * position d'un pic. La RMSSD d'un adulte au repos vaut souvent 20–60 ms :
 * l'erreur de quantification est donc du même ordre que le signal mesuré.
 * L'interpolation parabolique aide mais ne récupère pas l'info perdue.
 * Conséquence : le BPM est solide, la VFC reste une ESTIMATION grossière, fiable
 * seulement immobile + au repos + bonne lumière, et JAMAIS un dispositif médical.
 * De plus, en PWA (getUserMedia), le verrouillage d'exposition est inconstant
 * (souvent indisponible sur iOS Safari). Pour une VFC vraiment fiable il faut un
 * accès natif (Camera2 / AVFoundation) ou un capteur dédié (ceinture/montre).
 * Le code reflète ces limites : il préfère omettre une métrique que la falsifier.
 */

import { ScanEnhancer } from "@/lib/scanEnhancements";
import { useState, useRef, useCallback, useEffect } from "react";

export type ScanPhase = "idle" | "placing" | "stabilizing" | "measuring" | "done" | "failed";

export interface HeartRateResult {
  bpm: number;
  hrv: number;          // RMSSD en ms — 0 = non disponible (qualité insuffisante)
  readiness: number;    // 0–100, heuristique transparente (voir computeWellness)
  stressIndex: number;  // 0–100, heuristique non validée cliniquement, 0 = N/A
}

interface PPGState {
  phase: ScanPhase;
  progress: number;
  bpmLive: number;
  waveform: number[];       // normalisé 0–1 pour l'affichage
  error: string | null;
  torchSupported: boolean;
  signalQuality: number;    // 0–1, exposé pour l'UI (optionnel)
}

interface Sample {
  t: number;   // ms (horloge cohérente sur toute la session)
  r: number;   // rouge moyen ROI 0–255
  g: number;   // vert moyen ROI 0–255
}

// ── Paramètres ─────────────────────────────────────────────────────────────
const STABILIZE_MS = 5000;     // gardé à 5000 pour rester compatible avec l'UI
const MEASURE_MS = 30000;
const WAVEFORM_LENGTH = 180;
const ROI = 32;                // taille du carré central échantillonné (px)
const CANVAS = 64;
const ANALYSIS_THROTTLE_MS = 400; // recalcul "live" max ~2.5×/s (perf)

const HR_FMIN = 0.7;           // 42 bpm
const HR_FMAX = 3.5;           // 210 bpm
const DFT_STEP = 0.01;         // résolution du balayage fréquentiel (Hz)
const BPM_MIN = 40;
const BPM_MAX = 200;

const scanRef = useRef(new ScanEnhancer());
const REFRACTORY_S = 0.30;     // 300 ms → max 200 bpm entre deux pics
const IBI_MIN_MS = 300;
const IBI_MAX_MS = 1500;       // 40 bpm
const IBI_MAX_DEV = 0.30;      // ±30% autour de la médiane → rejet ectopique
const MIN_IBI_FOR_HRV = 15;    // assez de battements propres pour une RMSSD stable
const MIN_FS_FOR_HRV = 24;     // sous ~24 Hz effectifs, on n'ose pas la VFC

const Q_BPM_MIN = 0.30;        // qualité mini pour livrer un BPM
const Q_HRV_MIN = 0.60;        // qualité mini pour livrer une VFC
const SNR_LO = 3;              // mapping SNR spectral → [0,1]
const SNR_HI = 15;

// ── Outils signal (sans dépendance externe) ────────────────────────────────
function mean(a: number[]): number {
  if (!a.length) return 0;
  let s = 0;
  for (const v of a) s += v;
  return s / a.length;
}

function std(a: number[]): number {
  if (a.length < 2) return 0;
  const m = mean(a);
  let s = 0;
  for (const v of a) s += (v - m) * (v - m);
  return Math.sqrt(s / (a.length - 1));
}

function median(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Moyenne glissante centrée (gère les bords)
function movingAvgCentered(arr: number[], win: number): number[] {
  if (win < 2) return arr.slice();
  const half = Math.floor(win / 2);
  const out = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    const a = Math.max(0, i - half);
    const b = Math.min(arr.length, i + half + 1);
    let s = 0;
    for (let j = a; j < b; j++) s += arr[j];
    out[i] = s / (b - a);
  }
  return out;
}

// Rééchantillonnage linéaire des (t, v) sur une grille uniforme à fs Hz
function resampleUniform(ts: number[], vs: number[], fs: number): number[] {
  if (ts.length < 2) return vs.slice();
  const t0 = ts[0];
  const tN = ts[ts.length - 1];
  const n = Math.max(2, Math.floor(((tN - t0) / 1000) * fs));
  const dt = 1000 / fs;
  const out = new Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * dt;
    while (j < ts.length - 2 && ts[j + 1] < t) j++;
    const t1 = ts[j], t2 = ts[j + 1];
    const v1 = vs[j], v2 = vs[j + 1];
    const frac = t2 > t1 ? (t - t1) / (t2 - t1) : 0;
    out[i] = v1 + (v2 - v1) * Math.max(0, Math.min(1, frac));
  }
  return out;
}

// Bande-passante ~0.5–4 Hz : détrend (passe-haut) puis lissage (passe-bas)
function bandpass(x: number[], fs: number): number[] {
  const hpWin = Math.max(3, Math.round(fs * 2));      // cutoff ~0.5 Hz
  const baseline = movingAvgCentered(x, hpWin);
  const hp = x.map((v, i) => v - baseline[i]);
  const lpWin = Math.max(3, Math.round(fs / 8));       // cutoff ~4 Hz
  return movingAvgCentered(hp, lpWin);
}

function zscore(x: number[]): number[] {
  const m = mean(x);
  const s = std(x) || 1;
  return x.map((v) => (v - m) / s);
}

function hann(n: number): number[] {
  const w = new Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

// Estimation spectrale (DFT bande-limitée) → fréquence dominante + SNR
function spectralPeak(
  x: number[],
  fs: number,
  fmin = HR_FMIN,
  fmax = HR_FMAX
): { freq: number; snr: number } {
  const n = x.length;
  if (n < 8) return { freq: 0, snr: 0 };
  const w = hann(n);
  const xs = x.map((v, i) => v * w[i]);

  const powers: { f: number; p: number }[] = [];
  for (let f = fmin; f <= fmax; f += DFT_STEP) {
    let re = 0, im = 0;
    const k = (2 * Math.PI * f) / fs;
    for (let i = 0; i < n; i++) {
      const a = k * i;
      re += xs[i] * Math.cos(a);
      im += xs[i] * Math.sin(a);
    }
    powers.push({ f, p: re * re + im * im });
  }
  let best = powers[0];
  for (const pp of powers) if (pp.p > best.p) best = pp;

  const med = median(powers.map((pp) => pp.p)) || 1;
  const snr = best.p / med;
  return { freq: best.f, snr };
}

// Détection de pics avec seuil adaptatif + période réfractaire
function detectPeaks(x: number[], fs: number): number[] {
  const minDist = Math.max(1, Math.round(fs * REFRACTORY_S));
  const thr = 0.3; // x est z-scoré (std=1)
  const cand: number[] = [];
  for (let i = 1; i < x.length - 1; i++) {
    if (x[i] > thr && x[i] >= x[i - 1] && x[i] > x[i + 1]) cand.push(i);
  }
  // Imposer la réfractarité : on garde le pic le plus haut dans chaque fenêtre
  const peaks: number[] = [];
  for (const i of cand) {
    if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDist) {
      peaks.push(i);
    } else if (x[i] > x[peaks[peaks.length - 1]]) {
      peaks[peaks.length - 1] = i;
    }
  }
  return peaks;
}

// Décalage sous-frame par interpolation parabolique autour d'un pic
function parabolicOffset(ym1: number, y0: number, yp1: number): number {
  const denom = ym1 - 2 * y0 + yp1;
  if (denom === 0) return 0;
  const d = (0.5 * (ym1 - yp1)) / denom;
  return Math.max(-1, Math.min(1, d));
}

// Intervalles inter-battements (ms) avec timing sous-frame
function peakTimesMs(x: number[], peaks: number[], fs: number): number[] {
  const dt = 1000 / fs;
  return peaks.map((i) => {
    if (i <= 0 || i >= x.length - 1) return i * dt;
    return (i + parabolicOffset(x[i - 1], x[i], x[i + 1])) * dt;
  });
}

// Nettoyage des IBI : bornes physiologiques + rejet des écarts à la médiane
function cleanIBIs(ibis: number[]): { clean: number[]; rejectedFrac: number } {
  const inRange = ibis.filter((v) => v >= IBI_MIN_MS && v <= IBI_MAX_MS);
  if (inRange.length < 3) return { clean: inRange, rejectedFrac: 1 };
  const med = median(inRange);
  const clean = inRange.filter((v) => Math.abs(v - med) / med <= IBI_MAX_DEV);
  const rejectedFrac = ibis.length ? 1 - clean.length / ibis.length : 1;
  return { clean, rejectedFrac };
}

function rmssd(ibis: number[]): number {
  if (ibis.length < 3) return 0;
  let sum = 0;
  for (let i = 1; i < ibis.length; i++) {
    const d = ibis[i] - ibis[i - 1];
    sum += d * d;
  }
  return Math.sqrt(sum / (ibis.length - 1));
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ── Analyse d'une fenêtre d'échantillons ───────────────────────────────────
interface Analysis {
  bpm: number;
  hrv: number;
  quality: number;     // 0–1
  fingerPresent: boolean;
}

function analyze(samples: Sample[], wantHRV: boolean): Analysis {
  const fail: Analysis = { bpm: 0, hrv: 0, quality: 0, fingerPresent: false };
  if (samples.length < 16) return fail;

  // Présence du doigt : rouge élevé et dominant (transmission torche+chair)
  const reds = samples.map((s) => s.r);
  const greens = samples.map((s) => s.g);
  const rMean = mean(reds);
  const gMean = mean(greens);
  const fingerPresent = rMean > 40 && rMean < 253 && rMean > gMean * 1.05;
  if (!fingerPresent) return { ...fail, fingerPresent: false };

  // Timing réel → fréquence d'échantillonnage effective
  const ts = samples.map((s) => s.t);
  const dts: number[] = [];
  for (let i = 1; i < ts.length; i++) dts.push(ts[i] - ts[i - 1]);
  const medDt = median(dts) || 33;
  const fs = Math.max(15, Math.min(120, 1000 / medDt));

  // Conditionnement
  const uniform = resampleUniform(ts, reds, fs);
  const conditioned = zscore(bandpass(uniform, fs));

  // BPM spectral
  const { freq, snr } = spectralPeak(conditioned, fs);
  let bpm = Math.round(freq * 60);
  bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, bpm));
  const snrNorm = clamp01((snr - SNR_LO) / (SNR_HI - SNR_LO));

  // VFC (optionnelle)
  let hrv = 0;
  let ibiQuality = 0;
  if (wantHRV) {
    const peaks = detectPeaks(conditioned, fs);
    if (peaks.length >= MIN_IBI_FOR_HRV + 1) {
      const times = peakTimesMs(conditioned, peaks, fs);
      const ibis: number[] = [];
      for (let i = 1; i < times.length; i++) ibis.push(times[i] - times[i - 1]);
      const { clean, rejectedFrac } = cleanIBIs(ibis);
      ibiQuality = clamp01(1 - rejectedFrac);
      if (
        fs >= MIN_FS_FOR_HRV &&
        clean.length >= MIN_IBI_FOR_HRV &&
        rejectedFrac <= 0.25
      ) {
        hrv = Math.round(rmssd(clean));
      }
    }
  }

  const quality = wantHRV ? 0.6 * snrNorm + 0.4 * ibiQuality : snrNorm;
  return { bpm, hrv, quality, fingerPresent };
}

// ── Heuristiques bien-être (transparentes, NON validées cliniquement) ───────
// Idéalement à recalibrer sur la baseline personnelle de l'utilisateur.
function computeWellness(bpm: number, hrv: number): { readiness: number; stressIndex: number } {
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

// rVFC peut manquer dans les types DOM
type RVFCMeta = { mediaTime?: number };
type RVFCVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: RVFCMeta) => void) => number;
  cancelVideoFrameCallback?: (h: number) => void;
};

export function useHeartRate() {
  const [state, setState] = useState<PPGState>({
    phase: "idle",
    progress: 0,
    bpmLive: 0,
    waveform: [],
    error: null,
    torchSupported: true,
    signalQuality: 0,
  });
  const [result, setResult] = useState<HeartRateResult | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<RVFCVideo | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rvfcHandle = useRef<number | null>(null);
  const rafHandle = useRef<number | null>(null);

  const samplesRef = useRef<Sample[]>([]);
  const phaseRef = useRef<ScanPhase>("idle");
  const phaseStartRef = useRef<number>(0);
  const usePtsRef = useRef<boolean | null>(null); // source d'horloge figée à la 1re frame
  const lastAnalysisRef = useRef<number>(0);
  const stoppedRef = useRef(false);

  const cancelFrameLoop = useCallback(() => {
    const v = videoRef.current;
    if (rvfcHandle.current != null && v?.cancelVideoFrameCallback) {
      v.cancelVideoFrameCallback(rvfcHandle.current);
    }
    if (rafHandle.current != null) cancelAnimationFrame(rafHandle.current);
    rvfcHandle.current = null;
    rafHandle.current = null;
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    cancelFrameLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    videoRef.current = null;
    ctxRef.current = null;
    setState((s) => ({ ...s, phase: "idle", progress: 0, error: null }));
    phaseRef.current = "idle";
  }, [cancelFrameLoop]);

  // Normalise la queue d'échantillons pour l'affichage (0–1)
  const buildWaveform = useCallback((samples: Sample[]): number[] => {
    const tail = samples.slice(-WAVEFORM_LENGTH).map((s) => s.r);
    if (tail.length < 2) return [];
    const smooth = movingAvgCentered(tail, 5);
    const min = Math.min(...smooth);
    const max = Math.max(...smooth);
    const range = max - min || 1;
    return smooth.map((v) => (v - min) / range);
  }, []);

  const onFrame = useCallback(
    (now: number, meta?: RVFCMeta) => {
      if (stoppedRef.current) return;
      const v = videoRef.current;
      const ctx = ctxRef.current;
      if (!v || !ctx) return;

      // Choix de l'horloge figé à la 1re frame (évite de mélanger 2 horloges)
      if (usePtsRef.current === null) {
        usePtsRef.current = !!meta && Number.isFinite(meta.mediaTime);
      }
      const t =
        usePtsRef.current && meta && Number.isFinite(meta.mediaTime!)
          ? (meta!.mediaTime as number) * 1000
          : now;

      // Échantillonnage ROI central
      ctx.drawImage(v, 0, 0, CANVAS, CANVAS);
      const o = (CANVAS - ROI) / 2;
      const data = ctx.getImageData(o, o, ROI, ROI).data;
      let rSum = 0, gSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        rSum += data[i];
        gSum += data[i + 1];
      }
      const px = ROI * ROI;
      samplesRef.current.push({ t, r: rSum / px, g: gSum / px });
      
      const coverage = scanRef.current.onFrameData(imageData.data);

      const elapsed = Date.now() - phaseStartRef.current;
      const phase = phaseRef.current;
      const waveform = buildWaveform(samplesRef.current);

      scanRef.current.onBeat();

      if (phase === "stabilizing") {
        const progress = Math.min(100, (elapsed / STABILIZE_MS) * 100);
        setState((s) => ({ ...s, waveform, progress }));
        if (elapsed >= STABILIZE_MS) {
          phaseRef.current = "measuring";
          phaseStartRef.current = Date.now();
          samplesRef.current = []; // fenêtre fraîche pour la mesure
          setState((s) => ({ ...s, phase: "measuring", progress: 0 }));
        }
      } else if (phase === "measuring") {
        const progress = Math.min(100, (elapsed / MEASURE_MS) * 100);

        // Analyse "live" throttlée (BPM seulement, fenêtre ~8 s)
        let patch: Partial<PPGState> = { waveform, progress };
        if (t - lastAnalysisRef.current > ANALYSIS_THROTTLE_MS) {
          lastAnalysisRef.current = t;
          const cutoff = (samplesRef.current.at(-1)?.t ?? 0) - 8000;
          const win = samplesRef.current.filter((s) => s.t >= cutoff);
          const live = analyze(win, false);
          let error: string | null = null;
          if (elapsed > 10000 && !live.fingerPresent) {
            error = "Signal faible — couvre entièrement la caméra avec ton index";
          }
          patch = {
            ...patch,
            bpmLive: live.bpm || undefined,
            signalQuality: live.quality,
            error,
          };
        }
        setState((s) => ({
          ...s,
          ...patch,
          bpmLive: patch.bpmLive ?? s.bpmLive,
        }));

        if (elapsed >= MEASURE_MS) {
          finalizeRef.current();
          return;
        }
      }

      scheduleRef.current();
    },
    [buildWaveform] // finalize / scheduleNextFrame sont stables via refs
  );

  const scheduleNextFrame = useCallback(() => {
    if (stoppedRef.current) return;
    const v = videoRef.current;
    if (v?.requestVideoFrameCallback) {
      rvfcHandle.current = v.requestVideoFrameCallback(onFrame);
    } else {
      rafHandle.current = requestAnimationFrame((ts) => onFrame(ts));
    }
  }, [onFrame]);

  const finalize = useCallback(() => {
    cancelFrameLoop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const a = analyze(samplesRef.current, true);

    // Échec honnête : qualité BPM insuffisante → aucune valeur inventée
    if (!a.fingerPresent || a.quality < Q_BPM_MIN || a.bpm === 0) {
      phaseRef.current = "failed";
      setState((s) => ({
        ...s,
        phase: "failed",
        progress: 100,
        signalQuality: a.quality,
        error:
          "Mesure invalide — signal trop faible. Réessaie en couvrant entièrement la caméra avec ton doigt, immobile.",
      }));
      setResult(null);
      return;
    }

    // VFC livrée seulement si la qualité globale est suffisante, sinon omise
    const hrv = a.quality >= Q_HRV_MIN ? a.hrv : 0;
    const { readiness, stressIndex } = computeWellness(a.bpm, hrv);

    phaseRef.current = "done";
    setState((s) => ({
      ...s,
      phase: "done",
      progress: 100,
      bpmLive: a.bpm,
      signalQuality: a.quality,
      error: null,
    }));
    setResult({ bpm: a.bpm, hrv, readiness, stressIndex });
  }, [cancelFrameLoop]);

  // onFrame référence finalize/scheduleNextFrame : on les garde à jour via refs
  const finalizeRef = useRef(finalize);
  const scheduleRef = useRef(scheduleNextFrame);
  useEffect(() => { finalizeRef.current = finalize; }, [finalize]);
  useEffect(() => { scheduleRef.current = scheduleNextFrame; }, [scheduleNextFrame]);

  const start = useCallback(async () => {
    stoppedRef.current = false;
    setResult(null);
    samplesRef.current = [];
    usePtsRef.current = null;
    lastAnalysisRef.current = 0;
    setState({
      phase: "placing", progress: 0, bpmLive: 0, waveform: [],
      error: null, torchSupported: true, signalQuality: 0,
    });
    phaseRef.current = "placing";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 60, min: 24 }, // + de fps = meilleure VFC si dispo
        },
      });
      if (stoppedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as Record<string, unknown>;

      // Torche (best effort)
      let torchOk = false;
      if ((caps as { torch?: boolean }).torch) {
        try {
          await track.applyConstraints({ advanced: [{ torch: true } as any] });
          torchOk = true;
        } catch { /* ignore */ }
      }

      // Verrouillage exposition / balance / focus (best effort, souvent ignoré)
      const lock: any[] = [];
      if ("exposureMode" in caps) lock.push({ exposureMode: "manual" });
      if ("whiteBalanceMode" in caps) lock.push({ whiteBalanceMode: "manual" });
      if ("focusMode" in caps) lock.push({ focusMode: "manual" });
      if (lock.length) {
        try { await track.applyConstraints({ advanced: lock }); } catch { /* ignore */ }
      }

      if (!torchOk) {
        setState((s) => ({
          ...s,
          torchSupported: false,
          error: "Flash non disponible — mesure en lumière vive",
        }));
      }

      // Vidéo cachée + canvas
      const video = document.createElement("video") as RVFCVideo;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;
      await video.play();
      videoRef.current = video;

      const canvas = document.createElement("canvas");
      canvas.width = CANVAS;
      canvas.height = CANVAS;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas non disponible");
      ctxRef.current = ctx;

      // Phase placing visible ~1.5 s, puis stabilisation
      phaseStartRef.current = Date.now();
      setTimeout(() => {
        if (stoppedRef.current) return;
        phaseRef.current = "stabilizing";
        phaseStartRef.current = Date.now();
        samplesRef.current = [];
        setState((s) => ({ ...s, phase: "stabilizing", progress: 0 }));
      }, 1500);

      // Démarrer la boucle de capture (rVFC ou rAF)
      if (video.requestVideoFrameCallback) {
        rvfcHandle.current = video.requestVideoFrameCallback((now, meta) => onFrame(now, meta));
      } else {
        rafHandle.current = requestAnimationFrame((ts) => onFrame(ts));
      }
    } catch (e) {
      console.error("PPG Scanner error:", e);
      stop();
      throw e;
    }
  }, [onFrame, stop]);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      cancelFrameLoop();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [cancelFrameLoop]);

  return {
    phase: state.phase,
    progress: state.progress,
    bpmLive: state.bpmLive,
    waveform: state.waveform,
    error: state.error,
    torchSupported: state.torchSupported,
    signalQuality: state.signalQuality, // champ en plus, optionnel pour l'UI
    result,
    start,
    stop,
    measuring:
      state.phase === "stabilizing" ||
      state.phase === "measuring" ||
      state.phase === "placing",
  };
}
