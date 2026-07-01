/**
 * useScanHistory.ts — Persistance des scans + baseline personnelle (Bio-Flow)
 * ---------------------------------------------------------------------------
 * Branché sur la table réelle `scan_sessions`. Remplace l'ancien
 * useMeasurementHistory.ts (qui visait une table doublon abandonnée).
 *
 * Fait le pont entre useHeartRate (mesure) et personalBaseline (comparaison) :
 *   1. enregistre chaque scan réussi dans scan_sessions (avec user_id) ;
 *   2. purge les scans > 30 j côté client (filet RGPD) ;
 *   3. charge l'historique de l'utilisateur connecté ;
 *   4. renvoie la comparaison du scan du jour vs l'habitude personnelle.
 *
 * OPTION A (connexion obligatoire) : sans utilisateur connecté, on n'écrit pas
 * (et le RLS refuserait de toute façon). Le scanner doit donc être derrière un
 * guard d'auth — voir la note en bas.
 *
 * Ajuste l'import du client Supabase si ton chemin diffère.
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  compareToBaseline,
  readinessTrend,
  type ScanRow,
  type BaselineComparison,
} from "@/lib/personalBaseline";
import type { HeartRateResult } from "@/hooks/useHeartRate";

const WINDOW_DAYS = 30;
const TABLE = "scan_sessions";
const COLS = "scanned_at,bpm,hrv_rmssd,readiness_score,stress_index,is_morning_scan,signal_quality";

interface SaveInput extends HeartRateResult {
  signalQuality: number;     // exposé par useHeartRate
  isMorningScan?: boolean;   // true si scan du matin (défaut true)
}

function cutoffIso(): string {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
}

export function useScanHistory() {
  const [history, setHistory] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setHistory([]); setLoading(false); return; }

    const { data, error: qErr } = await supabase
      .from(TABLE)
      .select(COLS)
      .gte("scanned_at", cutoffIso())
      .order("scanned_at", { ascending: false });

    if (qErr) { setError(qErr.message); setLoading(false); return; }
    setHistory((data ?? []) as unknown as ScanRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * Enregistre un scan et renvoie sa comparaison à la baseline.
   * À appeler quand useHeartRate passe en phase "done" avec un result valide.
   */
  const saveScan = useCallback(
    async (r: SaveInput): Promise<BaselineComparison | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setError("Non connecté — scan non enregistré.");
        return null;
      }

      const scannedAt = new Date().toISOString();
      const isMorning = r.isMorningScan ?? true;

      const row = {
        user_id: userId,                                   // requis par le RLS
        scanned_at: scannedAt,
        bpm: r.bpm,
        hrv_rmssd: r.hrv > 0 ? r.hrv : null,               // 0 = non fiable → null
        readiness_score: r.readiness,
        stress_index: r.stressIndex > 0 ? r.stressIndex : null,
        is_morning_scan: isMorning,
        signal_quality: r.signalQuality,
        day_date: scannedAt.slice(0, 10),                  // YYYY-MM-DD
      };

      const { error: insErr } = await supabase.from(TABLE).insert(row);
      if (insErr) { setError(insErr.message); return null; }

      // Purge > 30 j (filet en plus d'un éventuel cron serveur)
      await supabase.from(TABLE).delete().lt("scanned_at", cutoffIso());

      // Relire l'historique frais pour comparer (setState est asynchrone)
      const { data: fresh } = await supabase
        .from(TABLE)
        .select(COLS)
        .gte("scanned_at", cutoffIso())
        .order("scanned_at", { ascending: false });

      const hist = (fresh ?? []) as ScanRow[];
      setHistory(hist);

      const today: ScanRow = {
        scanned_at: scannedAt,
        bpm: r.bpm,
        hrv_rmssd: r.hrv > 0 ? r.hrv : null,
        readiness_score: r.readiness,
        stress_index: r.stressIndex > 0 ? r.stressIndex : null,
        is_morning_scan: isMorning,
        signal_quality: r.signalQuality,
      };
      return compareToBaseline(today, hist, isMorning);
    },
    []
  );

  return {
    history,
    loading,
    error,
    reload: load,
    saveScan,
    trend: readinessTrend(history),
  };
}

/**
 * ── NOTE GUARD D'AUTH (Option A) ───────────────────────────────────────────
 * La page qui contient le scanner DOIT être derrière une vérification de
 * connexion. Motif minimal (à adapter à ton routing / ton contexte d'auth) :
 *
 *   const { data: { user } } = await supabase.auth.getUser();
 *   if (!user) return <Navigate to="/login" replace />;
 *
 * Sans ça, un visiteur non connecté peut lancer un scan qui ne sera jamais
 * enregistré (RLS), et toute la baseline reste vide.
 */
