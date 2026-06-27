import { useState, useRef, useCallback, useEffect } from "react";

export type ScanPhase = "idle" | "placing" | "stabilizing" | "measuring" | "done" | "failed";

export interface HeartRateResult {
  bpm: number;
  hrv: number;
  readiness: number;
  stressIndex: number;
}

interface PPGState {
  phase: ScanPhase;
  progress: number;
  bpmLive: number;
  waveform: number[]; // normalized 0-1, last ~150 frames (5s at 30fps)
  error: string | null;
  torchSupported: boolean;
}

const SAMPLE_INTERVAL = 33; // ~30fps
const STABILIZE_MS = 5000;
const MEASURE_MS = 30000;
const WAVEFORM_LENGTH = 150; // 5s * 30fps
const MOVING_AVG_WINDOW = 5;
const NO_PEAK_TIMEOUT = 10000;
const MIN_PEAKS_FOR_BPM = 5;   // require enough beats for stable measurement
const MIN_PEAKS_FOR_HRV = 6;   // RMSSD needs more samples for stability

function movingAverage(arr: number[], window: number): number[] {
  return arr.map((_, i) => {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(arr.length, i + Math.ceil(window / 2));
    const slice = arr.slice(start, end);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function findPeaks(data: number[], radius = 3): number[] {
  const peaks: number[] = [];
  for (let i = radius; i < data.length - radius; i++) {
    let isPeak = true;
    for (let j = 1; j <= radius; j++) {
      if (data[i] <= data[i - j] || data[i] <= data[i + j]) {
        isPeak = false;
        break;
      }
    }
    if (isPeak) peaks.push(i);
  }
  return peaks;
}

function calculateRMSSD(peakIndices: number[], intervalMs: number): number {
  if (peakIndices.length < 3) return 0;
  const intervals: number[] = [];
  for (let i = 1; i < peakIndices.length; i++) {
    intervals.push((peakIndices[i] - peakIndices[i - 1]) * intervalMs);
  }
  let sumSqDiff = 0;
  for (let i = 1; i < intervals.length; i++) {
    const diff = intervals[i] - intervals[i - 1];
    sumSqDiff += diff * diff;
  }
  return Math.sqrt(sumSqDiff / (intervals.length - 1));
}

function calculateBPMFromPeaks(peakIndices: number[], intervalMs: number): number {
  if (peakIndices.length < 2) return 0;
  const intervals: number[] = [];
  for (let i = 1; i < peakIndices.length; i++) {
    intervals.push((peakIndices[i] - peakIndices[i - 1]) * intervalMs);
  }
  const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return Math.round(60000 / meanInterval);
}

export function useHeartRate() {
  const [state, setState] = useState<PPGState>({
    phase: "idle",
    progress: 0,
    bpmLive: 0,
    waveform: [],
    error: null,
    torchSupported: true,
  });
  const [result, setResult] = useState<HeartRateResult | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number>(0);
  const rawSamples = useRef<number[]>([]);
  const phaseStartRef = useRef<number>(0);
  const phaseRef = useRef<ScanPhase>("idle");
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    videoRef.current = null;
    setState((s) => ({ ...s, phase: "idle", progress: 0, error: null }));
    phaseRef.current = "idle";
  }, []);

  const start = useCallback(async () => {
    stoppedRef.current = false;
    setResult(null);
    rawSamples.current = [];
    setState({ phase: "placing", progress: 0, bpmLive: 0, waveform: [], error: null, torchSupported: true });
    phaseRef.current = "placing";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (stoppedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      // Try to enable torch
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      let torchOk = false;
      if (capabilities?.torch) {
        try {
          await track.applyConstraints({ advanced: [{ torch: true } as any] });
          torchOk = true;
        } catch { /* ignore */ }
      }

      if (!torchOk) {
        setState((s) => ({
          ...s,
          torchSupported: false,
          error: "Flash non disponible — mesure en lumière vive",
        }));
      }

      // Setup hidden video + canvas
      const video = document.createElement("video");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();
      videoRef.current = video;

      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d")!;

      // Start sampling
      phaseStartRef.current = Date.now();

      // Move to stabilizing after the user sees "placing" for 1s
      setTimeout(() => {
        if (stoppedRef.current) return;
        phaseRef.current = "stabilizing";
        phaseStartRef.current = Date.now();
        rawSamples.current = [];
        setState((s) => ({ ...s, phase: "stabilizing", progress: 0 }));
      }, 1500);

      timerRef.current = window.setInterval(() => {
        if (stoppedRef.current || !videoRef.current) return;

        // Sample the center 50x50px red channel
        ctx.drawImage(videoRef.current, 0, 0, 100, 100);
        const imageData = ctx.getImageData(25, 25, 50, 50);
        let redSum = 0;
        for (let i = 0; i < imageData.data.length; i += 4) {
          redSum += imageData.data[i];
        }
        const avgRed = redSum / (50 * 50);
        rawSamples.current.push(avgRed);

        const now = Date.now();
        const elapsed = now - phaseStartRef.current;
        const currentPhase = phaseRef.current;

        // Smoothed waveform for display
        const smoothed = movingAverage(rawSamples.current, MOVING_AVG_WINDOW);
        const tail = smoothed.slice(-WAVEFORM_LENGTH);
        const min = Math.min(...tail);
        const max = Math.max(...tail);
        const range = max - min || 1;
        const normalized = tail.map((v) => (v - min) / range);

        if (currentPhase === "stabilizing") {
          const stabProgress = Math.min(100, (elapsed / STABILIZE_MS) * 100);
          setState((s) => ({ ...s, waveform: normalized, progress: stabProgress }));

          if (elapsed >= STABILIZE_MS) {
            phaseRef.current = "measuring";
            phaseStartRef.current = Date.now();
            rawSamples.current = []; // fresh samples for measurement
            setState((s) => ({ ...s, phase: "measuring", progress: 0 }));
          }
        } else if (currentPhase === "measuring") {
          const measProgress = Math.min(100, (elapsed / MEASURE_MS) * 100);

          // Live BPM calculation
          const allSmoothed = movingAverage(rawSamples.current, MOVING_AVG_WINDOW);
          const peaks = findPeaks(allSmoothed, 3);
          let liveBpm = 0;
          if (peaks.length >= 2) {
            liveBpm = calculateBPMFromPeaks(peaks, SAMPLE_INTERVAL);
            liveBpm = Math.max(40, Math.min(200, liveBpm));
          }

          // Error check: no peaks after 10s
          let error: string | null = null;
          if (elapsed > NO_PEAK_TIMEOUT && peaks.length < 2) {
            error = "Signal faible — appuie plus fermement ton doigt";
          }

          setState((s) => ({
            ...s,
            waveform: normalized,
            progress: measProgress,
            bpmLive: liveBpm || s.bpmLive,
            error,
          }));

          if (elapsed >= MEASURE_MS) {
            // Final calculation — HONEST version, no fake fallbacks
            const finalSmoothed = movingAverage(rawSamples.current, MOVING_AVG_WINDOW);
            const finalPeaks = findPeaks(finalSmoothed, 3);

            clearInterval(timerRef.current);
            timerRef.current = 0;
            if (streamRef.current) {
              streamRef.current.getTracks().forEach((t) => t.stop());
              streamRef.current = null;
            }

            // If we don't have enough peaks for a reliable measurement,
            // fail honestly instead of fabricating values.
            if (finalPeaks.length < MIN_PEAKS_FOR_BPM) {
              phaseRef.current = "failed";
              setState((s) => ({
                ...s,
                phase: "failed",
                progress: 100,
                error: "Mesure invalide — signal trop faible. Réessaie en couvrant entièrement la caméra avec ton doigt.",
              }));
              setResult(null);
              return;
            }

            const bpm = Math.max(40, Math.min(200, calculateBPMFromPeaks(finalPeaks, SAMPLE_INTERVAL)));

            // HRV requires more peaks. If not enough, omit it (0) — caller must handle.
            const hrv = finalPeaks.length >= MIN_PEAKS_FOR_HRV
              ? Math.round(calculateRMSSD(finalPeaks, SAMPLE_INTERVAL))
              : 0;

            // Stress index only computed when HRV is valid
            const stressIndex = hrv > 0
              ? Math.round(Math.max(10, Math.min(100, 100 - hrv * 1.2)))
              : 0;

            // Readiness: deterministic formula, NO random noise
            // Combines BPM proximity to resting (lower = better) and HRV (higher = better)
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

            phaseRef.current = "done";
            setState((s) => ({ ...s, phase: "done", progress: 100, bpmLive: bpm, waveform: normalized, error: null }));
            setResult({ bpm, hrv, readiness, stressIndex });
          }
        }
      }, SAMPLE_INTERVAL);
    } catch (e) {
      console.error("PPG Scanner error:", e);
      stop();
      throw e;
    }
  }, [stop]);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    phase: state.phase,
    progress: state.progress,
    bpmLive: state.bpmLive,
    waveform: state.waveform,
    error: state.error,
    torchSupported: state.torchSupported,
    result,
    start,
    stop,
    measuring: state.phase === "stabilizing" || state.phase === "measuring" || state.phase === "placing",
  };
}
