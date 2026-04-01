import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EffortSession, getSportIcon, useEffortStore } from "@/lib/effortStore";
import { getDeviceId } from "@/lib/profileStore";
import SportAnalysisCard from "./SportAnalysisCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const intensityBadgeStyles: Record<string, { bg: string; text: string }> = {
  Low: { bg: "bg-[#E1F5EE]", text: "text-[#085041]" },
  Moderate: { bg: "bg-[#FAEEDA]", text: "text-[#633806]" },
  High: { bg: "bg-[#FAECE7]", text: "text-[#4A1B0C]" },
  Maximum: { bg: "bg-[#FCEBEB]", text: "text-[#501313]" },
};

const WeeklySportSummary = () => {
  const [weekSessions, setWeekSessions] = useState<EffortSession[]>([]);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [synthDate, setSynthDate] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedSession, setSelectedSession] = useState<EffortSession | null>(null);
  const { addFollowupNote } = useEffortStore();

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekRange = weekStartStr + " — " + weekEnd.toISOString().slice(0, 10);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const deviceId = getDeviceId();

    // Load week sessions
    const { data: sessions } = await supabase
      .from("effort_sessions")
      .select("*")
      .eq("device_id", deviceId)
      .gte("day_date", weekStartStr)
      .order("logged_at", { ascending: true });

    if (sessions) setWeekSessions(sessions as unknown as EffortSession[]);

    // Load existing synthesis
    const { data: synth } = await supabase
      .from("weekly_summaries")
      .select("*")
      .eq("device_id", deviceId)
      .eq("week_start_date", weekStartStr)
      .maybeSingle();

    if (synth) {
      setSynthesis((synth as any).sport_synthesis);
      setSynthDate((synth as any).generated_at);
    }
  };

  const generateSynthesis = async () => {
    const analyzed = weekSessions.filter((s) => s.ai_analysis);
    if (analyzed.length === 0) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("weekly-sport-synthesis", {
        body: { weekSessions: analyzed },
      });

      if (error || data?.error) throw new Error(data?.error || "Failed");

      const text = data.synthesis;
      setSynthesis(text);
      const now = new Date().toISOString();
      setSynthDate(now);

      // Save to DB
      const deviceId = getDeviceId();
      await supabase.from("weekly_summaries").upsert(
        {
          device_id: deviceId,
          week_start_date: weekStartStr,
          sport_synthesis: text,
          generated_at: now,
        },
        { onConflict: "device_id,week_start_date" }
      );
    } catch (e) {
      console.error("Synthesis error:", e);
    } finally {
      setGenerating(false);
    }
  };

  const analyzedCount = weekSessions.filter((s) => s.ai_analysis).length;
  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-foreground flex items-center gap-1.5">
          📊 Activité sportive
        </h2>
        <span className="text-xs text-muted-foreground">{weekRange}</span>
      </div>

      <span className="text-xs px-2.5 py-1 rounded-full bg-energy/15 text-energy font-medium inline-block">
        {weekSessions.length} séance{weekSessions.length !== 1 ? "s" : ""} cette semaine
      </span>

      {/* Session cards row */}
      {weekSessions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {weekSessions.map((s) => {
            const badge = intensityBadgeStyles[s.intensity_level || "Moderate"] || intensityBadgeStyles.Moderate;
            const d = new Date(s.logged_at);
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSession(s)}
                className="min-w-[140px] glass-card p-3 space-y-1.5 text-left flex-shrink-0 hover:border-glass-highlight transition-colors relative"
              >
                <div className="text-lg">{getSportIcon(s.session_type_detected)}</div>
                <p className="text-[13px] font-medium text-foreground truncate">
                  {s.session_type_detected || s.intensity}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dayNames[d.getDay()]} {d.getHours().toString().padStart(2, "0")}:
                  {d.getMinutes().toString().padStart(2, "0")}
                </p>
                {s.intensity_level && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                    {s.intensity_level}
                  </span>
                )}
                {s.journal_text && (
                  <span className="absolute bottom-2 right-2 text-xs">📝</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Generate button or synthesis */}
      {synthesis ? (
        <div className="border-l-2 border-energy pl-3 bg-secondary rounded-md p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-energy flex items-center justify-center text-[11px] font-bold text-primary-foreground">
              B
            </div>
            <span className="text-[11px] text-muted-foreground">BIO</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{synthesis}</p>
          {synthDate && (
            <p className="text-[11px] text-muted-foreground text-right">
              Généré le {new Date(synthDate).toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
      ) : (
        analyzedCount > 0 && (
          <button
            onClick={generateSynthesis}
            disabled={generating}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-energy/30 text-energy hover:bg-energy/10 transition-colors disabled:opacity-40"
          >
            {generating ? "Génération en cours..." : "Générer mon bilan sportif"}
          </button>
        )
      )}

      {/* Session detail modal */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto bg-card border-glass-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {getSportIcon(selectedSession?.session_type_detected)}{" "}
              {selectedSession?.session_type_detected || "Séance"}
            </DialogTitle>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-4">
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>⏱ {selectedSession.duration_minutes} min</span>
                <span>📅 {new Date(selectedSession.logged_at).toLocaleDateString("fr-FR")}</span>
              </div>

              {selectedSession.journal_text && (
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedSession.journal_text}</p>
                </div>
              )}

              {selectedSession.ai_analysis && (
                <SportAnalysisCard
                  analysis={selectedSession.ai_analysis}
                  followupNotes={selectedSession.followup_notes || []}
                  onAddFollowup={(note) => {
                    addFollowupNote(selectedSession.id, note);
                    setSelectedSession({
                      ...selectedSession,
                      followup_notes: [...(selectedSession.followup_notes || []), note],
                    });
                  }}
                />
              )}

              {!selectedSession.ai_analysis && selectedSession.journal_text && (
                <p className="text-xs text-warning">📝 Non analysé — analyse disponible depuis l'écran Effort</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WeeklySportSummary;
