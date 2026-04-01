import { Camera, Utensils, Dumbbell, Flame, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { takePhoto } from "@/lib/camera";
import { toast } from "sonner";
import { useEffortStore, EffortSession, getSportIcon } from "@/lib/effortStore";
import SportJournal from "@/components/SportJournal";
import SportAnalysisCard from "@/components/SportAnalysisCard";
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

const Log = () => {
  const [mealLogged, setMealLogged] = useState(false);
  const [mealPhoto, setMealPhoto] = useState<string | null>(null);
  const [sportDuration, setSportDuration] = useState(30);
  const [sportIntensity, setSportIntensity] = useState<"light" | "moderate" | "intense">("moderate");
  const [currentSession, setCurrentSession] = useState<EffortSession | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<EffortSession | null>(null);

  const { sessions, loading, loadSessions, saveSession, addFollowupNote } = useEffortStore();

  useEffect(() => {
    loadSessions();
  }, []);

  const handleTakePhoto = async () => {
    try {
      const photo = await takePhoto();
      if (photo) {
        setMealPhoto(photo);
        setMealLogged(true);
        toast.success("Photo analysée par l'IA !");
      }
    } catch (e) {
      toast.error("Impossible d'accéder à la caméra");
    }
  };

  const handleLogSport = async () => {
    const session = await saveSession(sportDuration, intensityConfig[sportIntensity].dbValue);
    if (session) {
      setCurrentSession(session);
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

        {!mealLogged ? (
          <button
            onClick={handleTakePhoto}
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
            {mealPhoto ? (
              <img src={mealPhoto} alt="Repas" className="w-full h-36 rounded-xl object-cover" />
            ) : (
              <div className="w-full h-36 rounded-xl bg-secondary flex items-center justify-center">
                <span className="text-muted-foreground text-sm">🍝 Pâtes Bolognaise</span>
              </div>
            )}
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
