import { Heart, RefreshCw } from "lucide-react";
import { ScanSession } from "@/lib/scanStore";

interface Props {
  morningScan: ScanSession | null;
  additionalScans: ScanSession[];
}

const ScanCards = ({ morningScan, additionalScans }: Props) => {
  if (!morningScan) return null;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-3">
      {/* Morning scan - locked */}
      <div className="glass-card p-4 border-energy/20 glow-energy">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌅</span>
            <h3 className="text-sm font-semibold text-foreground">Scan du matin</h3>
          </div>
          <span className="text-[10px] text-energy font-medium bg-energy/10 px-2 py-0.5 rounded-full mono">
            {formatTime(morningScan.scanned_at)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Heart className="w-3 h-3 text-intensity" />
            </div>
            <span className="mono text-lg font-bold text-foreground">{morningScan.bpm}</span>
            <p className="text-[9px] text-muted-foreground">BPM</p>
          </div>
          <div className="text-center">
            <span className="mono text-lg font-bold text-foreground">{Math.round(morningScan.hrv_rmssd)}</span>
            <p className="text-[9px] text-muted-foreground">HRV ms</p>
          </div>
          <div className="text-center">
            <span className="mono text-lg font-bold text-foreground">{morningScan.stress_index}</span>
            <p className="text-[9px] text-muted-foreground">Stress</p>
          </div>
        </div>
      </div>

      {/* Additional scans */}
      {additionalScans.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {additionalScans.map((scan) => (
            <div key={scan.id} className="glass-card p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">
                  Scan — {formatTime(scan.scanned_at)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] mono text-muted-foreground">
                <span>{scan.bpm} bpm</span>
                <span>{Math.round(scan.hrv_rmssd)} hrv</span>
                <span className={`font-medium ${scan.readiness_score >= 65 ? "text-energy" : scan.readiness_score >= 40 ? "text-warning" : "text-intensity"}`}>
                  {scan.readiness_score}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScanCards;
