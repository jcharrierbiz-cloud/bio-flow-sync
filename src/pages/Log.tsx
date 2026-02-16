import { Camera, Utensils, Dumbbell, Flame, Sparkles } from "lucide-react";
import { useState } from "react";

const Log = () => {
  const [mealLogged, setMealLogged] = useState(false);
  const [sportDuration, setSportDuration] = useState(30);
  const [sportIntensity, setSportIntensity] = useState<"light" | "moderate" | "intense">("moderate");
  const [sportLogged, setSportLogged] = useState(false);

  const intensityConfig = {
    light: { label: "Léger", color: "text-energy", bg: "bg-energy/15 border-energy/20" },
    moderate: { label: "Modéré", color: "text-warning", bg: "bg-warning/15 border-warning/20" },
    intense: { label: "Intense", color: "text-intensity", bg: "bg-intensity/15 border-intensity/20" },
  };

  return (
    <div className="px-5 pt-12 pb-24 max-w-lg mx-auto space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">Suivi rapide</p>
        <h1 className="text-xl font-bold text-foreground mt-0.5">Log</h1>
      </div>

      {/* Meal Section */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-energy" />
          <h2 className="text-sm font-semibold text-foreground">Repas</h2>
        </div>

        {!mealLogged ? (
          <button
            onClick={() => setMealLogged(true)}
            className="w-full py-10 rounded-xl border-2 border-dashed border-glass-border hover:border-energy/30 transition-colors flex flex-col items-center gap-3 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-energy/10 transition-colors">
              <Camera className="w-7 h-7 text-muted-foreground group-hover:text-energy transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Prendre une photo du plat</p>
              <p className="text-xs text-muted-foreground mt-0.5">Analyse IA automatique</p>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="w-full h-36 rounded-xl bg-secondary flex items-center justify-center">
              <span className="text-muted-foreground text-sm">🍝 Pâtes Bolognaise</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-intensity/10 text-intensity border border-intensity/15">
                Repas Lourd
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-warning/10 text-warning border border-warning/15">
                Digestion lente
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-ai-violet/10 text-ai-violet border border-ai-violet/15 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Analyse IA
              </span>
            </div>
            <div className="glass-card p-3 border-intensity/10">
              <p className="text-xs text-secondary-foreground leading-relaxed">
                <Flame className="w-3 h-3 text-intensity inline mr-1" />
                Impact énergie : <span className="text-intensity font-medium">-20%</span> pour les 2 prochaines heures. Évite les tâches "High Energy" entre 13h et 15h.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sport Section */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-intensity" />
          <h2 className="text-sm font-semibold text-foreground">Effort</h2>
        </div>

        <div className="space-y-4">
          {/* Duration slider */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">Durée</span>
              <span className="mono text-foreground font-medium">{sportDuration} min</span>
            </div>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={sportDuration}
              onChange={(e) => setSportDuration(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none bg-secondary cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-energy [&::-webkit-slider-thumb]:shadow-[0_0_10px_hsl(175,80%,45%,0.4)]
                [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-energy [&::-moz-range-thumb]:border-0"
            />
          </div>

          {/* Intensity */}
          <div>
            <span className="text-xs text-muted-foreground block mb-2">Intensité</span>
            <div className="grid grid-cols-3 gap-2">
              {(["light", "moderate", "intense"] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setSportIntensity(level)}
                  className={`py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    sportIntensity === level
                      ? intensityConfig[level].bg + " " + intensityConfig[level].color
                      : "bg-secondary text-muted-foreground border-transparent hover:border-glass-highlight"
                  }`}
                >
                  {intensityConfig[level].label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setSportLogged(true)}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
              sportLogged
                ? "bg-energy/15 text-energy border border-energy/20"
                : "bg-energy text-primary-foreground hover:opacity-90"
            }`}
          >
            {sportLogged ? "✓ Effort enregistré" : "Enregistrer l'effort"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Log;
