import { useEffect } from "react";
import EnergyRing from "@/components/EnergyRing";
import BioWindowChart from "@/components/BioWindowChart";
import WeeklyChart from "@/components/WeeklyChart";
import AudioGreeting from "@/components/AudioGreeting";
import NutritionCard from "@/components/NutritionCard";
import StreakBadge from "@/components/StreakBadge";
import LevelBadge from "@/components/LevelBadge";
import ScanCards from "@/components/ScanCards";
import AnimatedScore from "@/components/AnimatedScore";
import { Bot, TrendingUp, Moon, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGreeting } from "@/hooks/useGreeting";
import { useScanStore } from "@/lib/scanStore";

const Home = () => {
  const navigate = useNavigate();
  const { dateLabel, greeting, emoji, userName, shouldPlayAudio, markPlayed } = useGreeting();
  const { morningScan, additionalScans, energyScore, loadTodayScans } = useScanStore();

  useEffect(() => {
    loadTodayScans();
  }, []);

  return (
    <div className="px-5 pt-12 pb-24 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-sm capitalize">{dateLabel}</p>
          <StreakBadge />
        </div>
        <h1 className="text-2xl font-bold text-foreground mt-1 animate-fade-in flex items-center gap-2">
          {greeting}, {userName} {emoji}
          <LevelBadge />
        </h1>
        <AudioGreeting
          greeting={greeting}
          userName={userName}
          shouldPlay={shouldPlayAudio}
          onPlayed={markPlayed}
        />
      </div>

      {/* AI Coach CTA */}
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
            1 recommandation en attente
          </p>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse-glow" />
          <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
        </div>
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
      </button>

      {/* Energy Score */}
      <div className="glass-card p-6 flex flex-col items-center glow-energy">
        <p className="text-xs text-muted-foreground font-medium tracking-widest uppercase mb-4">Score d'énergie</p>
        <EnergyRing score={energyScore || 0} />
        <div className="flex items-center gap-4 mt-5 text-xs">
          {morningScan ? (
            <>
              <div className="flex items-center gap-1.5 text-energy">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Basé sur {1 + additionalScans.length} scan{additionalScans.length > 0 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Moon className="w-3.5 h-3.5" />
                <span>HRV: {Math.round(morningScan.hrv_rmssd)} ms</span>
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">Fais ton scan matinal pour calibrer</span>
          )}
        </div>
      </div>

      {/* Scan Cards */}
      <ScanCards morningScan={morningScan} additionalScans={additionalScans} />

      {/* Nutrition Card */}
      <NutritionCard />

      {/* BioWindow Performance Curve */}
      <BioWindowChart morningScan={morningScan} additionalScans={additionalScans} />

      {/* Weekly Chart */}
      <WeeklyChart />
    </div>
  );
};

export default Home;
