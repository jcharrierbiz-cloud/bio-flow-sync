import { Camera, Utensils, Dumbbell, Flame, Sparkles, Loader2, Zap, Clock, Activity, Droplet, ChevronDown, ChevronUp, X } from "lucide-react";
import { useState, useEffect } from "react";
import { takePhoto } from "@/lib/camera";
import { toast } from "sonner";
import { useEffortStore, EffortSession, getSportIcon } from "@/lib/effortStore";
import SportJournal from "@/components/SportJournal";
import SportAnalysisCard from "@/components/SportAnalysisCard";
import HealthyRecipes from "@/components/HealthyRecipes";
import { supabase } from "@/integrations/supabase/client";
import { getCachedProfile } from "@/lib/profileStore";
import { useScanStore } from "@/lib/scanStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const intensityConfig = {
  light: { label: "Léger", color: "text-energy", bg: "bg-energy/15 border-energy/20", dbValue: "Léger" },
  moderate: { label: "Modéré", color: "text-warning", bg: "bg-warning/15 border-warning/20", dbValue: "Modéré" },
  intense: { label: "Intense", color: "text-intensity", bg: "bg-intensity/15 border-intensity/20", dbValue: "Intense" },
};

interface MealAnalysis {
  dishName: string;
  cuisine: string;
  confidence: number;
  ingredients: { name: string; qty: string }[];
  portion: string;
  calories: number;
  macros: { protein: number; carbs: number; fat: number; fiber: number };
  glycemicLoad: string;
  digestionWeight: string;
  digestionHours: number;
  energyImpactPct: number;
  impactDurationHours: number;
  nutritionalQuality: number;
  strengths: string[];
  weaknesses: string[];
  circadianFit: string;
  bestTimeWindow: string;
  expertNote: string;
  nextMealAdvice: string;
  hydrationTip: string;
  tags: string[];
}

const Log = () => {
  const [mealPhoto, setMealPhoto] = useState<string | null>(null);
  const [mealAnalysis, setMealAnalysis] = useState<MealAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sportDuration, setSportDuration] = useState(30);
  const [sportIntensity, setSportIntensity] = useState<"light" | "moderate" | "intense">("moderate");
  const [currentSession, setCurrentSession] = useState<EffortSession | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<EffortSession | null>(null);

  const { sessions, loading, loadSessions, saveSession, addFollowupNote } = useEffortStore();
  const energyScore = useScanStore((s) => s.energyScore);

  useEffect(() => {
    loadSessions();
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem("bioflow_meal_" + today);
      if (raw) {
        const parsed = JSON.parse(raw);
        setMealPhoto(parsed.photo || null);
        setMealAnalysis(parsed.analysis || null);
      }
    } catch {}
  }, []);

  const persistMeal = (photo: string | null, analysis: MealAnalysis | null) => {
    const today = new Date().toISOString().slice(0, 10);
    if (analysis) {
      localStorage.setItem("bioflow_meal_" + today, JSON.stringify({ photo, analysis }));
    } else {
      localStorage.removeItem("bioflow_meal_" + today);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await takePhoto();
      if (!photo) return;
      setMealPhoto(photo);
      setMealAnalysis(null);
      setAnalyzing(true);
      toast.loading("Analyse experte du plat en cours…", { id: "meal-analysis" });

      const profile = getCachedProfile();
      const { data, error } = await supabase.functions.invoke("analyze-meal", {
        body: {
          imageBase64: photo,
          profile,
          energyScore,
          hourOfDay: new Date().getHours(),
        },
      });

      if (error) throw error;
      if (data?.error === "no_food_detected") {
        toast.error("Aucune nourriture détectée sur la photo", { id: "meal-analysis" });
        setMealPhoto(null);
        setAnalyzing(false);
        return;
      }
      if (data?.error) {
        toast.error(data.error, { id: "meal-analysis" });
        setAnalyzing(false);
        return;
      }

      setMealAnalysis(data as MealAnalysis);
      persistMeal(photo, data as MealAnalysis);
      fireMealLogged();
      toast.success(`${data.dishName} identifié`, { id: "meal-analysis" });
    } catch (e: any) {
      console.error(e);
      toast.error("Analyse impossible : " + (e?.message || "erreur"), { id: "meal-analysis" });
    } finally {
      setAnalyzing(false);
    }
  };

  const resetMeal = () => {
    setMealPhoto(null);
    setMealAnalysis(null);
    setDetailsOpen(false);
    persistMeal(null, null);
  };

  const handleLogSport = async () => {
    const session = await saveSession(sportDuration, intensityConfig[sportIntensity].dbValue);
    if (session) {
      setCurrentSession(session);
      fireSportLogged();
      toast.success("Effort enregistré !");
    }
  };

  // Past sessions (excluding current)
  const pastSessions = sessions.filter((s) => s.id !== currentSession?.id);

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

        {!mealPhoto && !analyzing ? (
          <button
            onClick={handleTakePhoto}
            className="w-full py-10 rounded-xl border-2 border-dashed border-glass-border hover:border-energy/30 transition-colors flex flex-col items-center gap-3 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-energy/10 transition-colors">
              <Camera className="w-7 h-7 text-muted-foreground group-hover:text-energy transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Prendre une photo du plat</p>
              <p className="text-xs text-muted-foreground mt-0.5">Reconnaissance IA · 500 000+ plats</p>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            {mealPhoto && (
              <div className="relative">
                <img src={mealPhoto} alt="Repas" className="w-full h-40 rounded-xl object-cover" />
                <button
                  onClick={resetMeal}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-black/80"
                  aria-label="Réinitialiser"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {analyzing && (
                  <div className="absolute inset-0 rounded-xl bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-energy animate-spin" />
                    <span className="text-xs text-foreground font-medium">Analyse experte en cours…</span>
                  </div>
                )}
              </div>
            )}

            {mealAnalysis && (
              <div className="space-y-3 animate-fade-in">
                {/* Title */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-foreground leading-tight">{mealAnalysis.dishName}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {mealAnalysis.cuisine} · Confiance {mealAnalysis.confidence}%
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-ai-violet/15 text-ai-violet border border-ai-violet/20 flex items-center gap-1 shrink-0">
                      <Sparkles className="w-3 h-3" /> IA
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {mealAnalysis.tags?.slice(0, 4).map((t, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-energy/10 text-energy border border-energy/20">
                      {t}
                    </span>
                  ))}
                </div>

                {/* Macros grid */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Kcal", value: mealAnalysis.calories, unit: "" },
                    { label: "Prot", value: mealAnalysis.macros?.protein, unit: "g" },
                    { label: "Gluc", value: mealAnalysis.macros?.carbs, unit: "g" },
                    { label: "Lip", value: mealAnalysis.macros?.fat, unit: "g" },
                  ].map((m) => (
                    <div key={m.label} className="bg-secondary/60 rounded-lg p-2 text-center">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                      <p className="text-sm font-bold mono text-foreground">{m.value ?? "—"}{m.unit}</p>
                    </div>
                  ))}
                </div>

                {/* Impact summary */}
                <div className="glass-card p-3 space-y-2 border-energy/10">
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Zap className={`w-3.5 h-3.5 ${mealAnalysis.energyImpactPct < 0 ? "text-intensity" : "text-energy"}`} />
                      <span className="text-muted-foreground">Énergie:</span>
                      <span className={`font-semibold ${mealAnalysis.energyImpactPct < 0 ? "text-intensity" : "text-energy"}`}>
                        {mealAnalysis.energyImpactPct > 0 ? "+" : ""}{mealAnalysis.energyImpactPct}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-ai-violet" />
                      <span className="text-muted-foreground">Digestion:</span>
                      <span className="font-semibold text-foreground">{mealAnalysis.digestionHours}h</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-warning" />
                      <span className="text-muted-foreground">IG:</span>
                      <span className="font-semibold text-foreground">{mealAnalysis.glycemicLoad}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-intensity" />
                      <span className="text-muted-foreground">Charge:</span>
                      <span className="font-semibold text-foreground">{mealAnalysis.digestionWeight}</span>
                    </div>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed pt-1 border-t border-border">
                    {mealAnalysis.expertNote}
                  </p>
                </div>

                {/* Expandable details */}
                <button
                  onClick={() => setDetailsOpen(!detailsOpen)}
                  className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <span>Détails de l'analyse</span>
                  {detailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {detailsOpen && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Ingredients */}
                    {mealAnalysis.ingredients?.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Ingrédients estimés</p>
                        <div className="space-y-1">
                          {mealAnalysis.ingredients.map((ing, i) => (
                            <div key={i} className="flex justify-between text-[11px]">
                              <span className="text-foreground">{ing.name}</span>
                              <span className="text-muted-foreground mono">{ing.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quality bar */}
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground uppercase tracking-wider">Qualité nutritionnelle</span>
                        <span className="mono text-foreground font-semibold">{mealAnalysis.nutritionalQuality}/100</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${mealAnalysis.nutritionalQuality}%`,
                            background:
                              mealAnalysis.nutritionalQuality >= 70
                                ? "hsl(var(--energy))"
                                : mealAnalysis.nutritionalQuality >= 40
                                ? "hsl(var(--warning))"
                                : "hsl(var(--intensity))",
                          }}
                        />
                      </div>
                    </div>

                    {/* Strengths / Weaknesses */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-energy/5 border border-energy/15 rounded-lg p-2">
                        <p className="text-[10px] uppercase tracking-wider text-energy mb-1">Atouts</p>
                        <ul className="space-y-0.5">
                          {mealAnalysis.strengths?.map((s, i) => (
                            <li key={i} className="text-[10px] text-foreground">• {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-intensity/5 border border-intensity/15 rounded-lg p-2">
                        <p className="text-[10px] uppercase tracking-wider text-intensity mb-1">Attentions</p>
                        <ul className="space-y-0.5">
                          {mealAnalysis.weaknesses?.map((w, i) => (
                            <li key={i} className="text-[10px] text-foreground">• {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Circadian + advice */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] bg-secondary/40 rounded-lg p-2">
                        <span className="text-muted-foreground">Timing circadien</span>
                        <span className="text-foreground font-medium">
                          {mealAnalysis.circadianFit} · idéal {mealAnalysis.bestTimeWindow}
                        </span>
                      </div>
                      <div className="flex gap-2 items-start text-[11px] text-foreground">
                        <Droplet className="w-3.5 h-3.5 text-energy shrink-0 mt-0.5" />
                        <span>{mealAnalysis.hydrationTip}</span>
                      </div>
                      <div className="flex gap-2 items-start text-[11px] text-foreground">
                        <Utensils className="w-3.5 h-3.5 text-ai-violet shrink-0 mt-0.5" />
                        <span>{mealAnalysis.nextMealAdvice}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Healthy Recipes Section */}
      <HealthyRecipes />

      {/* Sport Section */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-intensity" />
            <h2 className="text-sm font-semibold text-foreground">Effort</h2>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-ai-violet/15 text-ai-violet border border-ai-violet/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> IA · 200 000+ exercices
          </span>
        </div>

        <div className="space-y-4">
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

          {!currentSession ? (
            <button
              onClick={handleLogSport}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-energy text-primary-foreground hover:opacity-90 transition-all"
            >
              Enregistrer l'effort
            </button>
          ) : (
            <div className="bg-energy/15 text-energy border border-energy/20 py-3 rounded-xl text-sm font-semibold text-center">
              ✓ Effort enregistré
            </div>
          )}
        </div>

        {/* Journal block — shown after logging */}
        {currentSession && (
          <SportJournal session={currentSession} />
        )}
      </div>

      {/* Effort History */}
      {pastSessions.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Historique des efforts</h2>
          <div className="space-y-2">
            {pastSessions.slice(0, 10).map((s) => {
              const d = new Date(s.logged_at);
              const timeStr = d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
              const dateStr = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedHistory(s)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{getSportIcon(s.session_type_detected)}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {s.session_type_detected || s.intensity} — {s.duration_minutes} min
                      </p>
                      <p className="text-xs text-muted-foreground">{dateStr} à {timeStr}</p>
                    </div>
                  </div>
                  <div>
                    {s.ai_analysis ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-energy/15 text-energy">✦ Analysé</span>
                    ) : s.journal_text ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/15 text-warning">📝 Non analysé</span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* History detail modal */}
      <Dialog open={!!selectedHistory} onOpenChange={() => setSelectedHistory(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {getSportIcon(selectedHistory?.session_type_detected)}{" "}
              {selectedHistory?.session_type_detected || "Séance"}
            </DialogTitle>
          </DialogHeader>
          {selectedHistory && (
            <div className="space-y-4">
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>⏱ {selectedHistory.duration_minutes} min</span>
                <span>📅 {new Date(selectedHistory.logged_at).toLocaleDateString("fr-FR")}</span>
              </div>

              {selectedHistory.journal_text && (
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedHistory.journal_text}</p>
                </div>
              )}

              {selectedHistory.ai_analysis ? (
                <SportAnalysisCard
                  analysis={selectedHistory.ai_analysis}
                  followupNotes={selectedHistory.followup_notes || []}
                  onAddFollowup={(note) => {
                    addFollowupNote(selectedHistory.id, note);
                    setSelectedHistory({
                      ...selectedHistory,
                      followup_notes: [...(selectedHistory.followup_notes || []), note],
                    });
                  }}
                />
              ) : selectedHistory.journal_text ? (
                <SportJournal session={selectedHistory} />
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Aucun journal pour cette séance
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Log;
