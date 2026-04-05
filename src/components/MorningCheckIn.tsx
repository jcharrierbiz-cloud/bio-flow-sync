import { useState } from "react";
import { Sun, Moon, Heart, Smartphone, Fingerprint, Sparkles, X } from "lucide-react";
import { markMorningScanDone } from "@/lib/notifications";
import { useHeartRate } from "@/hooks/useHeartRate";
import { toast } from "sonner";
import PPGScanner from "@/components/PPGScanner";
import { useScanStore } from "@/lib/scanStore";
import { useSleepStore } from "@/lib/sleepStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

const sleepQualities = [
  { label: "Terrible", emoji: "😫", hours: 4, color: "text-intensity" },
  { label: "Moyenne", emoji: "😐", hours: 5.5, color: "text-warning" },
  { label: "Correcte", emoji: "🙂", hours: 6.5, color: "text-muted-foreground" },
  { label: "Bonne", emoji: "😊", hours: 7.5, color: "text-energy" },
  { label: "Excellente", emoji: "🤩", hours: 8.5, color: "text-energy" },
];

const MorningCheckIn = ({ open, onClose }: Props) => {
  const [step, setStep] = useState<"sleep" | "scan-choice" | "scanning" | "result">("sleep");
  const [selectedSleep, setSelectedSleep] = useState<number | null>(null);
  const hr = useHeartRate();
  const saveScan = useScanStore((s) => s.saveScan);
  const setQualityFromCheckIn = useSleepStore((s) => s.setQualityFromCheckIn);

  if (!open) return null;

  const handleSleepSelect = (index: number) => {
    setSelectedSleep(index);
    setQualityFromCheckIn(index);
  };

  const handleNextToScan = () => {
    if (selectedSleep === null) return;
    setStep("scan-choice");
  };

  const handleWatchConnect = () => {
    toast.info("Connexion à la montre non disponible sur le web. Utilise le flash.");
  };

  const handleCameraScan = async () => {
    setStep("scanning");
    try {
      await hr.start();
    } catch {
      toast.error("Impossible d'accéder à la caméra.");
      setStep("scan-choice");
    }
  };

  const handleSkipScan = () => {
    markMorningScanDone();
    onClose();
    toast.success("Check-in matinal enregistré !");
  };

  const handleFinish = async () => {
    // Save scan to Supabase
    if (hr.result) {
      await saveScan({
        scanned_at: new Date().toISOString(),
        bpm: hr.result.bpm,
        hrv_rmssd: hr.result.hrv,
        stress_index: hr.result.stressIndex,
        readiness_score: hr.result.readiness,
        is_morning_scan: true, // will be overridden by store logic
      });
    }
    markMorningScanDone();
    onClose();
    toast.success("Journée calibrée ! Bonne journée 💪");
  };

  // Auto-advance when scan completes
  if (hr.phase === "done" && hr.result && step === "scanning") {
    setTimeout(() => setStep("result"), 300);
  }

  const sleepData = selectedSleep !== null ? sleepQualities[selectedSleep] : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-lg p-5">
      <div className="glass-card p-6 max-w-sm w-full space-y-5 glow-energy animate-in fade-in-0 slide-in-from-bottom-4 duration-300 relative">
        <button
          onClick={() => { hr.stop(); markMorningScanDone(); onClose(); }}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {step === "sleep" && (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-ai-violet/15 flex items-center justify-center">
                <Sun className="w-7 h-7 text-warning" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Bonjour ! ☀️</h2>
              <p className="text-sm text-muted-foreground">Comment était ta nuit ?</p>
            </div>
            <div className="flex justify-between gap-2">
              {sleepQualities.map((sq, i) => (
                <button
                  key={sq.label}
                  onClick={() => handleSleepSelect(i)}
                  className={`flex-1 glass-card p-2.5 flex flex-col items-center gap-1.5 transition-all ${
                    selectedSleep === i ? "border-energy/50 glow-energy scale-105" : "hover:border-glass-highlight"
                  }`}
                >
                  <span className="text-xl">{sq.emoji}</span>
                  <span className="text-[9px] text-muted-foreground leading-tight">{sq.label}</span>
                </button>
              ))}
            </div>
            {sleepData && (
              <div className="glass-card p-3 flex items-center gap-3">
                <Moon className="w-4 h-4 text-ai-violet shrink-0" />
                <p className="text-xs text-secondary-foreground">
                  Estimation : <strong className={sleepData.color}>{sleepData.hours}h</strong> de sommeil
                </p>
              </div>
            )}
            <button
              onClick={handleNextToScan}
              disabled={selectedSleep === null}
              className="w-full py-3 rounded-xl bg-energy text-primary-foreground text-sm font-semibold hover:bg-energy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Étape suivante — Scan rapide
            </button>
          </>
        )}

        {step === "scan-choice" && (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-intensity/15 flex items-center justify-center">
                <Heart className="w-7 h-7 text-intensity" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Scan rapide</h2>
              <p className="text-sm text-muted-foreground">Mesure ta fréquence cardiaque pour calibrer ta journée</p>
              <p className="text-[10px] text-muted-foreground">⏱️ Moins de 2 minutes</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleWatchConnect} className="glass-card p-4 flex flex-col items-center gap-2 hover:border-ai-violet/30 transition-all">
                <Smartphone className="w-6 h-6 text-ai-violet" />
                <span className="text-xs font-medium text-foreground">Montre connectée</span>
                <span className="text-[10px] text-muted-foreground">HealthKit / Fit</span>
              </button>
              <button onClick={handleCameraScan} className="glass-card p-4 flex flex-col items-center gap-2 hover:border-energy/30 transition-all">
                <Fingerprint className="w-6 h-6 text-energy" />
                <span className="text-xs font-medium text-foreground">Flash + Index</span>
                <span className="text-[10px] text-muted-foreground">30 secondes</span>
              </button>
            </div>
            <button onClick={handleSkipScan} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Passer le scan
            </button>
          </>
        )}

        {(step === "scanning" || step === "result") && (
          <PPGScanner
            phase={hr.phase === "done" ? "done" : hr.phase}
            progress={hr.progress}
            bpmLive={hr.bpmLive}
            waveform={hr.waveform}
            error={hr.error}
            torchSupported={hr.torchSupported}
            result={hr.result}
            onStop={() => { hr.stop(); setStep("scan-choice"); }}
            onFinish={handleFinish}
            compact
          />
        )}

        {step === "result" && hr.result && sleepData && (
          <div className="glass-card p-3 glow-violet">
            <p className="text-xs text-secondary-foreground leading-relaxed">
              <Sparkles className="w-3 h-3 text-ai-violet inline mr-1" />
              {sleepData.hours < 7
                ? `Nuit ${sleepData.label.toLowerCase()} (~${sleepData.hours}h). Privilégie les tâches légères cet après-midi et un créneau de récupération.`
                : `${sleepData.label} nuit (~${sleepData.hours}h) ! Tes créneaux de performance seront optimaux ce matin. Profites-en pour les tâches exigeantes.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MorningCheckIn;
