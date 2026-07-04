/**
 * healthkit.ts — Chemin iPhone (natif) pour lire la montre via HealthKit.
 * ---------------------------------------------------------------------------
 * ⚠️ CE FICHIER EST UN STUB VOLONTAIRE. Sur le web (PWA), HealthKit n'existe
 * pas : ces fonctions renvoient donc "non disponible". Le vrai code ne
 * fonctionne QUE dans un build natif iOS empaqueté avec Capacitor.
 *
 * Pourquoi ce détour : sur iPhone, l'Apple Watch n'expose sa FC/VFC qu'à des
 * apps natives via HealthKit — jamais au Web Bluetooth. Donc pour avoir la
 * montre sur iPhone, il faut passer natif (voir INTEGRATION.md).
 *
 * ── MISE EN PLACE (résumé, détails dans INTEGRATION.md) ────────────────────
 *   1. npm i @capacitor/core @capacitor/cli && npx cap init
 *   2. npm i @perfood/capacitor-healthkit   (ou capacitor-health)
 *   3. Xcode : activer la capability HealthKit + clés Info.plist
 *      NSHealthShareUsageDescription / NSHealthUpdateUsageDescription
 *   4. Décommenter l'implémentation ci-dessous et l'appeler à la place du
 *      chemin caméra quand Capacitor.isNativePlatform() est vrai sur iOS.
 *
 * ── DIFFÉRENCE DE MÉTRIQUE (à ne PAS mélanger silencieusement) ─────────────
 *   HealthKit fournit la VFC sous forme SDNN (heartRateVariabilitySDNN, en ms).
 *   Le chemin caméra et le chemin ceinture BLE utilisent RMSSD.
 *   SDNN ≠ RMSSD : affiche/labelle la source ("VFC SDNN (Apple Watch)") plutôt
 *   que de la traiter comme une RMSSD. Sinon tes scores deviennent incohérents.
 */

import type { HeartRateResult } from "@/hooks/useHeartRate";
import { computeWellness } from "@/lib/wellness";

/** Vrai uniquement dans un build natif iOS (Capacitor). Faux en PWA/web. */
export function isNativeHealthKitAvailable(): boolean {
  // En natif tu remplaceras par : return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  return false;
}

export interface HealthKitReading {
  bpm: number;
  hrvSdnnMs: number; // SDNN (≠ RMSSD)
  source: "apple_watch" | "iphone" | "unknown";
}

/**
 * Lit le dernier échantillon FC + VFC (SDNN) depuis HealthKit.
 * STUB : lève une erreur sur le web. À implémenter dans le build natif.
 */
export async function readLatestFromHealthKit(): Promise<HealthKitReading> {
  if (!isNativeHealthKitAvailable()) {
    throw new Error("HealthKit indisponible (nécessite l'app native iOS).");
  }

  // ───────────────────────────────────────────────────────────────────────
  // IMPLÉMENTATION NATIVE (à décommenter une fois Capacitor + plugin en place) :
  //
  // import { CapacitorHealthkit, SampleNames } from "@perfood/capacitor-healthkit";
  //
  // await CapacitorHealthkit.requestAuthorization({
  //   all: [],
  //   read: ["heartRate", "heartRateVariabilitySDNN"],
  //   write: [],
  // });
  //
  // const now = new Date();
  // const start = new Date(now.getTime() - 24 * 3600 * 1000);
  // const hr = await CapacitorHealthkit.queryHKitSampleType({
  //   sampleName: SampleNames.HEART_RATE, startDate: start.toISOString(),
  //   endDate: now.toISOString(), limit: 1,
  // });
  // const hrv = await CapacitorHealthkit.queryHKitSampleType({
  //   sampleName: "heartRateVariabilitySDNN", startDate: start.toISOString(),
  //   endDate: now.toISOString(), limit: 1,
  // });
  // const bpm = Math.round(hr.resultData?.[0]?.value ?? 0);
  // const hrvSdnnMs = Math.round(hrv.resultData?.[0]?.value ?? 0);
  // const source = (hr.resultData?.[0]?.sourceName ?? "").includes("Watch")
  //   ? "apple_watch" : "iphone";
  // return { bpm, hrvSdnnMs, source };
  // ───────────────────────────────────────────────────────────────────────

  throw new Error("readLatestFromHealthKit: implémentation native à activer.");
}

/** Convertit une lecture HealthKit vers le type de résultat commun de l'app. */
export function healthKitToResult(r: HealthKitReading): HeartRateResult {
  // On réutilise l'heuristique commune. NB : ici hrv est du SDNN, pas du RMSSD —
  // à toi de décider si tu l'affiches distinctement dans l'UI.
  const { readiness, stressIndex } = computeWellness(r.bpm, r.hrvSdnnMs);
  return { bpm: r.bpm, hrv: r.hrvSdnnMs, readiness, stressIndex };
}
