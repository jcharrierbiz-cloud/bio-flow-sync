// Carte "Action du jour" (Tâche 4) — à placer en haut de Home, juste sous le header.
// Affiche UNE action concrète dérivée du scan matinal + énergie, avec un CTA
// et un bouton "C'est fait" qui récompense (XP) une fois par jour.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { useScanStore } from "@/lib/scanStore";
import { useEnergyScore } from "@/hooks/useEnergyScore";
import { computeDailyAction, toneColor } from "@/lib/dailyAction";
import { useRewardStore } from "@/lib/rewardStore";

const DONE_KEY = "bioflow_daily_action_done";
const todayStr = () => new Date().toISOString().slice(0, 10);

function isDone(actionId: string): boolean {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    if (!raw) return false;
    const p = JSON.parse(raw);
    return p.date === todayStr() && p.id === actionId;
  } catch {
    return false;
  }
}

function markDone(actionId: string) {
  localStorage.setItem(DONE_KEY, JSON.stringify({ date: todayStr(), id: actionId }));
}

const DailyActionCard = ({ className = "" }: { className?: string }) => {
  const navigate = useNavigate();
  const { morningScan, loadTodayScans } = useScanStore();
  const energy = useEnergyScore();
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadTodayScans();
  }, [loadTodayScans]);

  const action = computeDailyAction({
    hasMorningScan: !!morningScan,
    readiness: morningScan?.readiness_score,
    hrv: morningScan?.hrv_rmssd,
    stress: morningScan?.stress_index,
    energyTotal: energy.total,
    contributors: energy.contributors,
  });

  useEffect(() => {
    setDone(isDone(action.id));
  }, [action.id]);

  const accent = toneColor(action.tone);

  const handleDone = () => {
    if (done) return;
    markDone(action.id);
    setDone(true);
    const store = useRewardStore.getState();
    store.checkStreak();
    store.addXP(15, "Action du jour accomplie ✅", { category: "daily_action" });
  };

  return (
    <div
      className={`glass-card p-5 space-y-3 relative overflow-hidden ${className}`}
      style={{ boxShadow: `0 0 0 1px hsl(${accent} / 0.25), 0 0 28px hsl(${accent} / 0.10)` }}
    >
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: `hsl(${accent} / 0.12)` }}
      />

      <div className="flex items-center gap-2">
        <span
          className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `hsl(${accent} / 0.15)`, color: `hsl(${accent})` }}
        >
          Action du jour
        </span>
        <span className="text-lg ml-auto">{action.emoji}</span>
      </div>

      <div>
        <h3 className="text-base font-bold text-foreground">{action.headline}</h3>
        <p className="text-sm text-foreground/90 mt-1 leading-snug">{action.action}</p>
        <p className="text-[11px] text-muted-foreground mt-1.5">{action.why}</p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => navigate(action.ctaRoute)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.02]"
          style={{ backgroundColor: `hsl(${accent})`, color: "hsl(var(--primary-foreground))" }}
        >
          {action.ctaLabel}
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={handleDone}
          disabled={done}
          className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors flex items-center gap-1.5 ${
            done
              ? "border-energy/40 text-energy bg-energy/10 cursor-default"
              : "border-border text-muted-foreground hover:text-foreground hover:border-glass-highlight"
          }`}
          aria-label="Marquer l'action du jour comme faite"
        >
          <Check className="w-4 h-4" />
          {done ? "Fait" : "C'est fait"}
        </button>
      </div>
    </div>
  );
};

export default DailyActionCard;
