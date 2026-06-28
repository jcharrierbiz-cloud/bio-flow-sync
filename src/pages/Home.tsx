import { useEffect } from "react";
import EnergyRing from "@/components/EnergyRing";
import BioWindowChart from "@/components/BioWindowChart";
import WeeklyChart from "@/components/WeeklyChart";
import AudioGreeting from "@/components/AudioGreeting";
import NutritionCard from "@/components/NutritionCard";
import StreakBadge from "@/components/StreakBadge";
import LevelBadge from "@/components/LevelBadge";
import ScanCards from "@/components/ScanCards";
import WeeklySportSummary from "@/components/WeeklySportSummary";
import ProfileDrawer from "@/components/ProfileDrawer";
import { Bot, TrendingUp, Moon, Sparkles, ArrowRight, Activity, Utensils, Dumbbell, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGreeting } from "@/hooks/useGreeting";
import { useScanStore } from "@/lib/scanStore";
import { useEnergyScore } from "@/hooks/useEnergyScore";

const Home = () => {
  const navigate = useNavigate();
  const { dateLabel, greeting, emoji, userName, shouldPlayAudio, markPlayed } = useGreeting();
  const { morningScan, additionalScans, loadTodayScans } = useScanStore();
  const energy = useEnergyScore();

  useEffect(() => {
    loadTodayScans();
  }, []);

  // Honest CTA subtitle — reflects real app state, no fake "1 recommandation en attente"
  const coachSubtitle =
    energy.contributors === 0
      ? "Commence par ton scan matinal"
      : morningScan && morningScan.hrv_rmssd < 30
      ? "Ton HRV est basse — parle au coach"
      : "Discute avec ton coach IA";

  return (
    <div className="px-5 pt-4 pb-24 max-w-lg mx-auto space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <span className="text-primary font-bold text-sm tracking-wider">BIO-FLOW</span>
        <ProfileDrawer />
      </div>

      {/* Header — greeting on its own line, badges on a dedicated row below */}
      <div>
        <p className="text-muted-foreground text-sm capitalize">{dateLabel}</p>
        <h1 className="text-2xl font-bold text-foreground mt-1 animate-fade-in">
          {greeting}, {userName} {emoji}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <StreakBadge />
          <LevelBadge />
        </div>
        <AudioGreeting
          greeting={greeting}
          userName={userName}
          shouldPlay={shouldPlayAudio}
          onPlayed={markPlayed}
        />
      </div>

      {/* Energy Score — HERO, now the first thing the user sees */}
      <div className="glass-card p-6 flex flex-col items-center glow-energy">
        <p className="text-xs text-muted-foreground font-medium tracking-widest uppercase mb-4">Score d'énergie</p>
        <EnergyRing score={energy.total || 0} />

        {/* Pillar breakdown — bigger, readable labels and values */}
        <div className="grid grid-cols-4 gap-2.5 mt-6 w-full">
          {[
            { label: "Scan", icon: ScanLine, value: energy.scan },
            { label: "Sommeil", icon: Moon, value: energy.sleep },
            { label: "Nutrition", icon: Utensils, value: energy.nutrition },
            { label: "Effort", icon: Dumbbell, value: energy.effort },
          ].map(({ label, icon: Icon, value }) => (
            <div
              key={label}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 min-h-[72px] border transition-colors ${
                value != null ? "border-energy/30 bg-energy/10" : "border-border bg-muted/20"
              }`}
            >
              <Icon className={`w-4 h-4 ${value != null ? "text-energy" : "text-muted-foreground"}`} />
              <span className="text-[11px] text-muted-foreground leading-none">{label}</span>
              <span className="text-base font-bold mono text-foreground leading-none">
                {value != null ? value : "—"}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 mt-5 text-xs">
          {energy.contributors > 0 ? (
            <div className="flex items-center gap-1.5 text-energy">
              <Activity className="w-3.5 h-3.5" />
              <span>{energy.contributors} source{energy.contributors > 1 ? "s" : ""} active{energy.contributors > 1 ? "s" : ""}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Fais ton scan matinal pour calibrer</span>
          )}
          {morningScan && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>HRV: {Math.round(morningScan.hrv_rmssd)} ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Scan Cards */}
      <ScanCards morningScan={morningScan} additionalScans={additionalScans} />

      {/* AI Coach CTA — demoted below the score, still prominent but no longer competing with the hero */}
      <button
        onClick={() => navigate("/coach")}
        className="w-full relative overflow-hidden rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all group"
        style={{
          background: "linear-gradient(135deg, hsl(var(--ai-violet)), hsl(var(--ai-violet) / 0.7), hsl(var(--energy) / 0.5))",
        }}
      >
        <div className="w-14 h-14 rounded-2xl bg-background/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
          <Bot className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-base font-bold text-white">Coach Bio-Flow</h3>
          <p className="text-xs text-white/80 mt-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {coachSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
        </div>
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      </button>

      {/* Nutrition Card */}
      <NutritionCard />

      {/* BioWindow Performance Curve */}
      <BioWindowChart morningScan={morningScan} additionalScans={additionalScans} />

      {/* Weekly Sport Summary */}
      <WeeklySportSummary />

      {/* Weekly Chart */}
      <WeeklyChart />
    </div>
  );
};

export default Home;
