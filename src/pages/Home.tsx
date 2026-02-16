import EnergyRing from "@/components/EnergyRing";
import PerformanceChart from "@/components/PerformanceChart";
import CoachModal from "@/components/CoachModal";
import { Bot, TrendingUp, Moon, Sparkles } from "lucide-react";

const Home = () => {
  return (
    <div className="px-5 pt-12 pb-24 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-muted-foreground text-sm">Dimanche 16 Février</p>
        <h1 className="text-2xl font-bold text-foreground mt-1">Bonjour, Alex 👋</h1>
      </div>

      {/* Energy Score */}
      <div className="glass-card p-6 flex flex-col items-center glow-energy">
        <p className="text-xs text-muted-foreground font-medium tracking-widest uppercase mb-4">Score d'énergie</p>
        <EnergyRing score={82} />
        <div className="flex items-center gap-4 mt-5 text-xs">
          <div className="flex items-center gap-1.5 text-energy">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+8% vs hier</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Moon className="w-3.5 h-3.5" />
            <span>6.2h sommeil</span>
          </div>
        </div>
      </div>

      {/* Performance Window */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Fenêtre de Performance</h2>
          <span className="text-[10px] text-energy font-medium bg-energy/10 px-2 py-0.5 rounded-full">Peak: 9h-11h</span>
        </div>
        <PerformanceChart />
      </div>

      {/* AI Coach CTA */}
      <CoachModal>
        <button className="w-full glass-card p-4 flex items-center gap-4 glow-violet cursor-pointer hover:bg-card/80 transition-all group">
          <div className="w-12 h-12 rounded-2xl bg-ai-violet/15 flex items-center justify-center group-hover:bg-ai-violet/25 transition-colors">
            <Bot className="w-6 h-6 text-ai-violet" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-sm font-semibold text-foreground">Coach Bio-Flow</h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-ai-violet" />
              1 recommandation en attente
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-ai-violet animate-pulse-glow" />
        </button>
      </CoachModal>
    </div>
  );
};

export default Home;
