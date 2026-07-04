/**
 * WatchConnectButton.tsx — UI de connexion + mesure via montre/ceinture BLE.
 * ---------------------------------------------------------------------------
 * Composant optionnel, prêt à poser dans l'écran de scan comme SOURCE
 * alternative à la caméra. Rend un résultat HeartRateResult via onResult,
 * que tu peux router vers le même écran de résultats que la caméra.
 *
 * Style aligné sur Bio-Flow (classes glass-card / energy, lucide, sonner).
 */

import { useState } from "react";
import { Watch, Loader2, HeartPulse, Link2Off, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { HeartRateResult } from "@/hooks/useHeartRate";
import { useWatchHeartRate } from "@/hooks/useWatchHeartRate";

interface Props {
  onResult?: (r: HeartRateResult) => void;
  measureSeconds?: number;
}

const WatchConnectButton = ({ onResult, measureSeconds = 60 }: Props) => {
  const w = useWatchHeartRate();
  const [countdown, setCountdown] = useState(0);

  if (!w.supported) {
    return (
      <div className="flex items-start gap-2 glass-card p-3">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="text-warning font-medium">Connexion montre indisponible ici.</span>{" "}
          Le Bluetooth web ne fonctionne pas sur iPhone. Disponible sur Android/Chrome,
          ou via l'app native (Apple Watch / HealthKit).
        </p>
      </div>
    );
  }

  const runMeasure = async () => {
    try {
      const total = measureSeconds;
      setCountdown(total);
      const timer = window.setInterval(
        () => setCountdown((c) => (c > 1 ? c - 1 : 0)),
        1000
      );
      const result = await w.measure(total * 1000);
      window.clearInterval(timer);
      setCountdown(0);
      if (result.hrv === 0) {
        toast.info("BPM mesuré. VFC indisponible (capteur sans intervalles RR).");
      } else {
        toast.success(`Mesure OK — ${result.bpm} bpm · VFC ${result.hrv} ms`);
      }
      onResult?.(result);
    } catch (e) {
      setCountdown(0);
      toast.error(e instanceof Error ? e.message : "Mesure échouée.");
    }
  };

  return (
    <div className="space-y-3">
      {(w.status === "idle" || w.status === "error") && (
        <button
          onClick={w.connect}
          className="w-full py-2.5 rounded-xl bg-energy text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Watch className="w-4 h-4" />
          Connecter ma montre / ceinture
        </button>
      )}

      {w.status === "connecting" && (
        <div className="w-full py-2.5 rounded-xl glass-card flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Recherche du capteur…
        </div>
      )}

      {(w.status === "connected" || w.status === "measuring") && (
        <div className="space-y-3">
          <div className="glass-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-intensity animate-pulse" />
              <span className="text-xs text-foreground font-medium">
                {w.deviceName}
              </span>
            </div>
            <span className="mono text-lg font-bold text-foreground">
              {w.bpmLive > 0 ? `${w.bpmLive}` : "—"}
              <span className="text-[10px] text-muted-foreground ml-1">bpm</span>
            </span>
          </div>

          {w.contact === false && (
            <p className="text-[11px] text-warning">
              Contact faible — ajuste la ceinture / le capteur.
            </p>
          )}

          <button
            onClick={runMeasure}
            disabled={w.status === "measuring"}
            className="w-full py-2.5 rounded-xl bg-energy text-primary-foreground text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {w.status === "measuring" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mesure… {countdown}s
              </>
            ) : (
              <>Lancer une mesure ({measureSeconds}s)</>
            )}
          </button>

          <button
            onClick={w.disconnect}
            className="w-full py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium flex items-center justify-center gap-1.5"
          >
            <Link2Off className="w-3.5 h-3.5" />
            Déconnecter
          </button>
        </div>
      )}

      {w.error && w.status === "error" && (
        <p className="text-[11px] text-destructive">{w.error}</p>
      )}
    </div>
  );
};

export default WatchConnectButton;
