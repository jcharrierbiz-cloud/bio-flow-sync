import { Heart, Moon, ScanLine, Sparkles, Smartphone, Fingerprint } from "lucide-react";
import { useState } from "react";
import { useHeartRate } from "@/hooks/useHeartRate";
import { toast } from "sonner";
import PPGScanner from "@/components/PPGScanner";

const Health = () => {
  const [sleep, setSleep] = useState(6.2);
  const [scanMode, setScanMode] = useState<"idle" | "choosing" | "scanning">("idle");
  const hr = useHeartRate();

  const sleepQuality = sleep >= 7.5 ? "Optimal" : sleep >= 6 ? "Insuffisant" : "Critique";
  const sleepColor = sleep >= 7.5 ? "text-energy" : sleep >= 6 ? "text-warning" : "text-intensity";

  const handleStartScan = () => setScanMode("choosing");

  const handleWatchConnect = () => {
    toast.info("Connexion à la montre connectée non disponible sur le web. Utilise la méthode par caméra.");
  };

  const handleCameraScan = async () => {
    setScanMode("scanning");
    try {
      await hr.start();
    } catch {
      toast.error("Impossible d'accéder à la caméra. Vérifie les permissions.");
      setScanMode("idle");
    }
  };

  const handleStop = () => {
    hr.stop();
    setScanMode("idle");
  };

  const scanned = hr.result !== null && hr.phase === "done";

  return (
    <div className="px-5 pt-12 pb-24 max-w-lg mx-auto space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">Biométrie</p>
        <h1 className="text-xl font-bold text-foreground mt-0.5">Santé</h1>
      </div>

      {/* Morning Scan */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-ai-violet" />
          <h2 className="text-sm font-semibold text-foreground">Scan Matinal</h2>
        </div>

        {scanMode === "idle" && !scanned && (
          <button
            onClick={handleStartScan}
            className="w-full py-10 rounded-xl border-2 border-dashed border-glass-border hover:border-ai-violet/30 transition-colors flex flex-col items-center gap-3 group"
          >
            <div className="w-16 h-16 rounded-full bg-ai-violet/10 flex items-center justify-center group-hover:bg-ai-violet/20 transition-colors relative">
              <Heart className="w-7 h-7 text-ai-violet" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-ai-violet rounded-full flex items-center justify-center">
                <ScanLine className="w-3 h-3 text-accent-foreground" />
              </span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Calibrer ma journée</p>
              <p className="text-xs text-muted-foreground mt-0.5">Mesure ta fréquence cardiaque</p>
            </div>
          </button>
        )}

        {scanMode === "choosing" && !scanned && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">Choisis ta méthode de mesure</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleWatchConnect}
                className="glass-card p-4 flex flex-col items-center gap-2 hover:border-ai-violet/30 transition-all"
              >
                <Smartphone className="w-6 h-6 text-ai-violet" />
                <span className="text-xs font-medium text-foreground">Montre connectée</span>
                <span className="text-[10px] text-muted-foreground">HealthKit / Google Fit</span>
              </button>
              <button
                onClick={handleCameraScan}
                className="glass-card p-4 flex flex-col items-center gap-2 hover:border-energy/30 transition-all"
              >
                <Fingerprint className="w-6 h-6 text-energy" />
                <span className="text-xs font-medium text-foreground">Flash + Index</span>
                <span className="text-[10px] text-muted-foreground">30 secondes</span>
              </button>
            </div>
          </div>
        )}

        {scanMode === "scanning" && (
          <PPGScanner
            phase={hr.phase}
            progress={hr.progress}
            bpmLive={hr.bpmLive}
            waveform={hr.waveform}
            error={hr.error}
            torchSupported={hr.torchSupported}
            result={hr.result}
            onStop={handleStop}
          />
        )}

        {scanned && scanMode !== "scanning" && (
          <PPGScanner
            phase="done"
            progress={100}
            bpmLive={hr.result!.bpm}
            waveform={[]}
            error={null}
            torchSupported={true}
            result={hr.result}
            onStop={() => {}}
          />
        )}
      </div>

      {/* Sleep */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-ai-violet" />
            <h2 className="text-sm font-semibold text-foreground">Sommeil</h2>
          </div>
          <span className={`text-xs font-medium ${sleepColor}`}>{sleepQuality}</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="mono text-3xl font-bold text-foreground">{sleep.toFixed(1)}<span className="text-sm text-muted-foreground font-normal ml-1">h</span></span>
          <div className="flex-1">
            <input
              type="range"
              min="3"
              max="10"
              step="0.1"
              value={sleep}
              onChange={(e) => setSleep(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-secondary cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ai-violet [&::-webkit-slider-thumb]:shadow-[0_0_10px_hsl(270,75%,60%,0.4)]
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-ai-violet [&::-moz-range-thumb]:border-0"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {["Profond", "Léger", "REM"].map((phase, i) => (
            <div key={phase} className="flex-1 glass-card p-2 text-center">
              <span className="mono text-sm font-semibold text-foreground block">
                {i === 0 ? "1.8h" : i === 1 ? "2.9h" : "1.5h"}
              </span>
              <span className="text-[10px] text-muted-foreground">{phase}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Analysis */}
      <div className="glass-card p-5 glow-violet">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-ai-violet" />
          <h2 className="text-sm font-semibold text-foreground">Analyse IA</h2>
        </div>
        <p className="text-sm text-secondary-foreground leading-relaxed">
          {sleep < 7
            ? `Avec ${sleep.toFixed(1)}h de sommeil, ta récupération est incomplète. Ton cycle de sommeil profond est sous la moyenne (1.8h vs 2.2h recommandé). Je suggère d'alléger l'après-midi et d'éviter le sport intense après 17h aujourd'hui.`
            : `Belle nuit ! ${sleep.toFixed(1)}h avec un bon ratio de sommeil profond. Tu devrais être au top de 9h à 12h. C'est le moment idéal pour tes tâches les plus exigeantes.`}
        </p>
      </div>
    </div>
  );
};

export default Health;
