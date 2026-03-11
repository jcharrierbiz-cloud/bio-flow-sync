import { useState } from "react";
import { Bell, Clock, Sun, Sparkles } from "lucide-react";
import {
  isOnboarded,
  markOnboarded,
  savePrefs,
  requestPermission,
  type NotifPrefs,
} from "@/lib/notifications";

interface Props {
  open: boolean;
  onClose: () => void;
}

const OnboardingModal = ({ open, onClose }: Props) => {
  const [step, setStep] = useState<"welcome" | "timing" | "done">("welcome");
  const [timing, setTiming] = useState<30 | 60>(30);

  if (!open) return null;

  const handleEnableNotifs = async () => {
    const granted = await requestPermission();
    if (granted) {
      setStep("timing");
    } else {
      // Even if denied, save prefs and continue
      const prefs: NotifPrefs = { enabled: false, reminderMinutes: 30, morningEnabled: true };
      savePrefs(prefs);
      markOnboarded();
      onClose();
    }
  };

  const handleFinish = () => {
    const prefs: NotifPrefs = { enabled: true, reminderMinutes: timing, morningEnabled: true };
    savePrefs(prefs);
    markOnboarded();
    setStep("done");
    setTimeout(onClose, 600);
  };

  const handleSkip = () => {
    const prefs: NotifPrefs = { enabled: false, reminderMinutes: 30, morningEnabled: false };
    savePrefs(prefs);
    markOnboarded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-md p-5">
      <div className="glass-card p-6 max-w-sm w-full space-y-5 glow-violet animate-in fade-in-0 zoom-in-95 duration-300">
        {step === "welcome" && (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-ai-violet/15 flex items-center justify-center">
                <Bell className="w-8 h-8 text-ai-violet" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Bienvenue sur Bio-Flow</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pour t'aider à suivre ta journée, Bio-Flow peut t'envoyer des <strong className="text-foreground">rappels avant chaque activité</strong> et un <strong className="text-foreground">scan matinal</strong> pour calibrer ta journée.
              </p>
            </div>

            <div className="space-y-2">
              <div className="glass-card p-3 flex items-center gap-3">
                <Clock className="w-5 h-5 text-energy shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Rappels d'activité</p>
                  <p className="text-[10px] text-muted-foreground">30 min à 1h avant chaque tâche</p>
                </div>
              </div>
              <div className="glass-card p-3 flex items-center gap-3">
                <Sun className="w-5 h-5 text-warning shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground">Check-in matinal</p>
                  <p className="text-[10px] text-muted-foreground">Comment était ta nuit ? Scan rapide &lt; 2 min</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleEnableNotifs}
                className="w-full py-3 rounded-xl bg-ai-violet text-accent-foreground text-sm font-semibold hover:bg-ai-violet/90 transition-colors"
              >
                Activer les notifications
              </button>
              <button
                onClick={handleSkip}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Plus tard
              </button>
            </div>
          </>
        )}

        {step === "timing" && (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-energy/15 flex items-center justify-center">
                <Clock className="w-7 h-7 text-energy" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Quand te rappeler ?</h2>
              <p className="text-sm text-muted-foreground">Choisis quand recevoir tes rappels avant chaque activité</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTiming(30)}
                className={`glass-card p-4 flex flex-col items-center gap-2 transition-all ${
                  timing === 30 ? "border-energy/50 glow-energy" : "hover:border-glass-highlight"
                }`}
              >
                <span className="mono text-xl font-bold text-foreground">30</span>
                <span className="text-xs text-muted-foreground">minutes avant</span>
              </button>
              <button
                onClick={() => setTiming(60)}
                className={`glass-card p-4 flex flex-col items-center gap-2 transition-all ${
                  timing === 60 ? "border-energy/50 glow-energy" : "hover:border-glass-highlight"
                }`}
              >
                <span className="mono text-xl font-bold text-foreground">1h</span>
                <span className="text-xs text-muted-foreground">avant</span>
              </button>
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-xl bg-energy text-primary-foreground text-sm font-semibold hover:bg-energy/90 transition-colors"
            >
              C'est parti !
            </button>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 text-center py-4">
            <Sparkles className="w-10 h-10 text-ai-violet animate-pulse" />
            <h2 className="text-lg font-bold text-foreground">Tout est prêt !</h2>
            <p className="text-sm text-muted-foreground">Bio-Flow va t'accompagner tout au long de ta journée.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingModal;
