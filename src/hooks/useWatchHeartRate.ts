/**
 * useWatchHeartRate.ts — Hook React pour la mesure via montre / ceinture BLE.
 * ---------------------------------------------------------------------------
 * API pensée pour cohabiter avec useHeartRate (caméra) : la mesure finale
 * renvoie le MÊME type HeartRateResult, donc l'écran de résultats existant
 * (PPGScanner "done") est réutilisable tel quel.
 *
 * Flux typique :
 *   const w = useWatchHeartRate();
 *   if (!w.supported) → afficher "indisponible sur iPhone (web)"
 *   await w.connect();                 // sélecteur d'appareil (clic requis)
 *   const result = await w.measure();  // capte 60 s → { bpm, hrv, readiness, stressIndex }
 *   w.disconnect();
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { HeartRateResult } from "@/hooks/useHeartRate";
import { computeWellness, rmssdFromRR } from "@/lib/wellness";
import {
  connectHeartRateSensor,
  isWebBluetoothSupported,
  type HeartRateConnection,
  type HeartRateSample,
} from "@/lib/bluetoothHeartRate";

export type WatchStatus =
  | "unsupported"   // navigateur sans Web Bluetooth (iPhone en web)
  | "idle"
  | "connecting"
  | "connected"     // flux live actif
  | "measuring"     // fenêtre de capture RR en cours
  | "error";

const DEFAULT_MEASURE_MS = 60_000; // 60 s = fenêtre correcte pour une RMSSD stable

function median(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function useWatchHeartRate() {
  const supported = isWebBluetoothSupported();
  const [status, setStatus] = useState<WatchStatus>(supported ? "idle" : "unsupported");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [bpmLive, setBpmLive] = useState(0);
  const [contact, setContact] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connRef = useRef<HeartRateConnection | null>(null);
  const rrBuffer = useRef<number[]>([]);
  const bpmBuffer = useRef<number[]>([]);
  const capturing = useRef(false);

  const handleSample = useCallback((s: HeartRateSample) => {
    setBpmLive(s.bpm);
    setContact(s.contactDetected);
    if (capturing.current) {
      if (s.rr.length) rrBuffer.current.push(...s.rr);
      if (s.bpm > 0) bpmBuffer.current.push(s.bpm);
    }
  }, []);

  const disconnect = useCallback(() => {
    connRef.current?.disconnect();
    connRef.current = null;
    capturing.current = false;
    setStatus(supported ? "idle" : "unsupported");
    setDeviceName(null);
    setBpmLive(0);
    setContact(null);
  }, [supported]);

  const connect = useCallback(async () => {
    if (!supported) {
      setError("Connexion montre indisponible ici (impossible sur iPhone en web).");
      setStatus("unsupported");
      return;
    }
    setError(null);
    setStatus("connecting");
    try {
      const conn = await connectHeartRateSensor({
        onSample: handleSample,
        onDisconnect: () => {
          connRef.current = null;
          capturing.current = false;
          setStatus("idle");
          setDeviceName(null);
          setBpmLive(0);
        },
      });
      connRef.current = conn;
      setDeviceName(conn.deviceName);
      setStatus("connected");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Échec de connexion.";
      // Annulation du sélecteur = pas une vraie erreur
      if (/cancel|User cancelled|chooser/i.test(msg)) {
        setStatus("idle");
      } else {
        setError(msg);
        setStatus("error");
      }
    }
  }, [supported, handleSample]);

  /**
   * Capte pendant `durationMs`, puis calcule le résultat.
   * Nécessite d'être déjà connecté (appelle connect() avant).
   */
  const measure = useCallback(
    (durationMs: number = DEFAULT_MEASURE_MS): Promise<HeartRateResult> => {
      return new Promise((resolve, reject) => {
        if (!connRef.current) {
          reject(new Error("Aucun capteur connecté."));
          return;
        }
        rrBuffer.current = [];
        bpmBuffer.current = [];
        capturing.current = true;
        setStatus("measuring");

        window.setTimeout(() => {
          capturing.current = false;
          setStatus(connRef.current ? "connected" : "idle");

          const bpm =
            Math.round(median(bpmBuffer.current)) || bpmLive || 0;
          const hrv = rmssdFromRR(rrBuffer.current); // 0 si RR absents/insuffisants
          const { readiness, stressIndex } = computeWellness(bpm, hrv);

          if (bpm <= 0) {
            reject(new Error("Aucune donnée reçue du capteur pendant la mesure."));
            return;
          }
          resolve({ bpm, hrv, readiness, stressIndex });
        }, durationMs);
      });
    },
    [bpmLive]
  );

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      connRef.current?.disconnect();
      connRef.current = null;
    };
  }, []);

  return {
    supported,       // false sur iPhone (web)
    status,
    deviceName,
    bpmLive,
    contact,         // true/false/null (contact peau rapporté par le capteur)
    error,
    connect,
    measure,
    disconnect,
  };
}
