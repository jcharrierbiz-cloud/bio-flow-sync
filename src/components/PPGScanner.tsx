import { Heart, Activity, Sparkles, Share2, AlertTriangle, Fingerprint } from "lucide-react";
import { type ScanPhase, type HeartRateResult } from "@/hooks/useHeartRate";
import { toast } from "sonner";

interface PPGScannerProps {
  phase: ScanPhase;
  progress: number;
  bpmLive: number;
  waveform: number[];
  error: string | null;
  torchSupported: boolean;
  result: HeartRateResult | null;
  onStop: () => void;
  onFinish?: () => void;
  compact?: boolean;
}

function WaveformSVG({ data, active }: { data: number[]; active: boolean }) {
  if (data.length < 2) return null;

  const width = 300;
  const height = 80;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${height - v * height * 0.85 - height * 0.05}`);
  const pathD = `M ${points.join(" L ")}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--intensity))" stopOpacity="0.3" />
          <stop offset="50%" stopColor="hsl(var(--intensity))" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(var(--energy))" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="waveGradGrey" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.2" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke={active ? "url(#waveGrad)" : "url(#waveGradGrey)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={active ? "drop-shadow-[0_0_6px_hsl(var(--intensity)/0.4)]" : ""}
      />
    </svg>
  );
}

function PulseRing() {
  return (
    <div className="relative w-28 h-28 mx-auto">
      <div className="absolute inset-0 rounded-full bg-intensity/10 animate-ping" style={{ animationDuration: "2s" }} />
      <div className="absolute inset-3 rounded-full bg-intensity/15 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
      <div className="absolute inset-0 rounded-full bg-intensity/10 flex items-center justify-center">
        <Fingerprint className="w-12 h-12 text-intensity" />
      </div>
    </div>
  );
}

const PPGScanner = ({
  phase,
  progress,
  bpmLive,
  waveform,
  error,
  torchSupported,
  result,
  onStop,
  onFinish,
  compact,
}: PPGScannerProps) => {
  const handleShare = async () => {
    if (!result) return;
    const text = `🫀 Bio-Flow Scan\n❤️ BPM: ${result.bpm}\n💓 VFC: ${result.hrv}ms\n⚡ Readiness: ${result.readiness}%\n😰 Stress: ${result.stressIndex}/100`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Bio-Flow Scan", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Résultats copiés !");
      }
    } catch { /* user cancelled */ }
  };

  // Phase: Placing finger
  if (phase === "placing") {
    return (
      <div className="space-y-4 text-center">
        <PulseRing />
        <div>
          <p className="text-sm font-semibold text-foreground">Place ton index sur la caméra</p>
          <p className="text-xs text-muted-foreground mt-1">Couvre entièrement le capteur avec ton doigt</p>
        </div>
        {!torchSupported && (
          <div className="flex items-center gap-2 glass-card p-2.5 text-left">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <p className="text-[11px] text-warning">Flash non disponible — mesure en lumière vive</p>
          </div>
        )}
        <button
          onClick={onStop}
          className="w-full py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium"
        >
          Annuler
        </button>
      </div>
    );
  }

  // Phase: Stabilizing
  if (phase === "stabilizing") {
    const remainSec = Math.max(0, Math.ceil((5000 - (progress / 100) * 5000) / 1000));
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">Stabilisation...</p>
          <p className="text-xs text-muted-foreground">Ne bouge pas — {remainSec}s</p>
        </div>
        <div className="glass-card p-3 rounded-xl overflow-hidden">
          <WaveformSVG data={waveform} active={false} />
        </div>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-muted-foreground/50 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <button
          onClick={onStop}
          className="w-full py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium"
        >
          Annuler
        </button>
      </div>
    );
  }

  // Phase: Measuring
  if (phase === "measuring") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-sm font-semibold text-foreground">Mesure en cours</p>
          </div>
          {bpmLive > 0 && (
            <div className="flex items-center gap-1.5 glass-card px-3 py-1.5 rounded-full">
              <Heart className="w-3.5 h-3.5 text-intensity animate-pulse" />
              <span className="mono text-sm font-bold text-foreground">{bpmLive}</span>
              <span className="text-[10px] text-muted-foreground">bpm</span>
            </div>
          )}
        </div>

        <div className="glass-card p-3 rounded-xl overflow-hidden">
          <WaveformSVG data={waveform} active={true} />
        </div>

        {error && (
          <div className="flex items-center gap-2 glass-card p-2.5">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <p className="text-[11px] text-warning">{error}</p>
          </div>
        )}

        <div className="space-y-1">
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-intensity to-energy rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mono">{Math.round(progress)}%</p>
        </div>

        <button
          onClick={onStop}
          className="w-full py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium"
        >
          Annuler
        </button>
      </div>
    );
  }

  // Phase: Done / Results
  if (phase === "done" && result) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <Sparkles className="w-7 h-7 text-ai-violet mx-auto mb-2" />
          <h3 className="text-lg font-bold text-foreground">Scan terminé</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 text-center glow-energy">
            <Activity className="w-5 h-5 text-energy mx-auto mb-1.5" />
            <span className="mono text-2xl font-bold text-foreground block">{result.bpm}</span>
            <span className="text-[10px] text-muted-foreground">BPM repos</span>
          </div>
          <div className="glass-card p-4 text-center glow-violet">
            <Heart className="w-5 h-5 text-intensity mx-auto mb-1.5" />
            <span className="mono text-2xl font-bold text-foreground block">{result.hrv}<span className="text-xs font-normal">ms</span></span>
            <span className="text-[10px] text-muted-foreground">VFC (RMSSD)</span>
          </div>
          <div className="glass-card p-4 text-center">
            <Sparkles className="w-5 h-5 text-ai-violet mx-auto mb-1.5" />
            <span className="mono text-2xl font-bold text-foreground block">{result.readiness}%</span>
            <span className="text-[10px] text-muted-foreground">Readiness</span>
          </div>
          <div className="glass-card p-4 text-center">
            <div className={`w-5 h-5 mx-auto mb-1.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              result.stressIndex < 40 ? "bg-energy/20 text-energy" : result.stressIndex < 70 ? "bg-warning/20 text-warning" : "bg-intensity/20 text-intensity"
            }`}>
              {result.stressIndex < 40 ? "😌" : result.stressIndex < 70 ? "😐" : "😰"}
            </div>
            <span className="mono text-2xl font-bold text-foreground block">{result.stressIndex}</span>
            <span className="text-[10px] text-muted-foreground">Stress Index</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 py-2.5 rounded-xl glass-card flex items-center justify-center gap-2 text-xs font-medium text-foreground hover:border-ai-violet/30 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Partager
          </button>
          {onFinish && (
            <button
              onClick={onFinish}
              className="flex-1 py-2.5 rounded-xl bg-energy text-primary-foreground text-xs font-semibold hover:bg-energy/90 transition-colors"
            >
              Continuer
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default PPGScanner;
