import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EffortSession, SportAnalysis, useEffortStore } from "@/lib/effortStore";
import { getCachedProfile } from "@/lib/profileStore";
import { useScanStore } from "@/lib/scanStore";
import SportAnalysisCard from "./SportAnalysisCard";
import { toast } from "sonner";

const quickTags = [
  { emoji: "📍", label: "Lieu", prefix: "📍 Lieu : " },
  { emoji: "💪", label: "Exercices", prefix: "💪 Exercices : " },
  { emoji: "😓", label: "Ressenti", prefix: "😓 Ressenti : " },
  { emoji: "🎯", label: "Objectif atteint", prefix: "🎯 Objectif : " },
];

interface Props {
  session: EffortSession;
  onCurveImpact?: (impact: number) => void;
}

const SportJournal = ({ session, onCurveImpact }: Props) => {
  const [text, setText] = useState(session.journal_text || "");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { updateJournal, saveAnalysis, addFollowupNote, loadWeekSessions } = useEffortStore();
  const { morningScan, energyScore } = useScanStore();

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "96px";
      el.style.height = Math.min(el.scrollHeight, 288) + "px";
    }
  }, [text]);

  const handleBlur = useCallback(async () => {
    if (text !== (session.journal_text || "")) {
      await updateJournal(session.id, text);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }, [text, session.id, session.journal_text, updateJournal]);

  const insertTag = (prefix: string) => {
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? text.length;
      const newText = text.slice(0, start) + prefix + text.slice(start);
      setText(newText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    } else {
      setText(text + prefix);
    }
  };

  const handleAnalyze = async () => {
    if (text.length < 20) return;
    setAnalyzing(true);
    setError(null);

    // Save journal first
    await updateJournal(session.id, text);

    try {
      const profile = getCachedProfile();
      const weekSessions = await loadWeekSessions();

      const { data, error: fnError } = await supabase.functions.invoke("analyze-sport", {
        body: {
          journalText: text,
          profile: profile
            ? {
                pseudo: profile.pseudo,
                age: profile.age,
                weight: profile.weight,
                height: profile.height,
                fitness_level: profile.fitness_level,
                main_goal: profile.main_goal,
              }
            : null,
          scanData: {
            morningHRV: morningScan ? Math.round(morningScan.hrv_rmssd) : null,
            energyScore,
          },
          weekSessions: weekSessions
            .filter((s) => s.ai_analysis)
            .map((s) => ({
              session_type_detected: s.session_type_detected,
              intensity_level: s.intensity_level,
            })),
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const analysis = data as SportAnalysis;
      await saveAnalysis(session.id, analysis);

      // Notify dashboard of curve impact
      if (onCurveImpact && analysis.performanceCurveImpact) {
        onCurveImpact(analysis.performanceCurveImpact);
      }

      toast("Courbe mise à jour — séance " + analysis.sessionType + " prise en compte", {
        style: {
          background: "#0A1F18",
          color: "white",
          borderLeft: "2px solid #00E5C3",
          fontSize: "13px",
        },
        duration: 3000,
      });
    } catch (e) {
      console.error("Analysis failed:", e);
      setError("⚠ Analyse indisponible — ta note est sauvegardée. Réessaie dans un moment.");
    } finally {
      setAnalyzing(false);
    }
  };

  const charCount = text.length;
  const charColor = charCount >= 950 ? "text-destructive" : charCount >= 800 ? "text-warning" : "text-muted-foreground";

  const currentAnalysis = session.ai_analysis;

  return (
    <div className="space-y-3">
      {/* Divider */}
      <div className="h-px bg-energy/20" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-secondary-foreground flex items-center gap-1.5">
          📝 Détails de la séance
        </span>
        {currentAnalysis && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-energy/15 text-energy font-medium">
            Analysé par IA
          </span>
        )}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= 1000) setText(e.target.value);
          }}
          onBlur={handleBlur}
          placeholder={`Décris ta séance...\nEx: Musculation — développé couché 4x10 à 70kg, tirage horizontal 3x12. Bonne forme, légère fatigue en fin de séance. Récupération correcte.`}
          className="w-full min-h-[96px] max-h-[288px] rounded-xl bg-secondary border border-glass-border p-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-energy/30 transition-colors"
        />
        <span className={`absolute bottom-2 right-3 text-[10px] ${charColor}`}>
          {charCount} / 1000
        </span>
        {saved && (
          <span className="absolute top-2 right-3 text-[10px] text-energy animate-in fade-in duration-300">
            Sauvegardé ✓
          </span>
        )}
      </div>

      {/* Quick tags */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {quickTags.map((tag) => (
          <button
            key={tag.label}
            onClick={() => insertTag(tag.prefix)}
            className="flex-shrink-0 text-xs px-3 h-6 rounded-full border border-energy/30 text-energy hover:bg-energy/10 transition-all active:scale-95"
          >
            {tag.emoji} {tag.label}
          </button>
        ))}
      </div>

      {/* Analyze button */}
      {!currentAnalysis && (
        <button
          onClick={handleAnalyze}
          disabled={text.length < 20 || analyzing}
          className="w-full h-11 rounded-lg bg-energy text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {analyzing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse [animation-delay:0.4s]" />
              </span>
              BIO analyse ta séance...
            </span>
          ) : (
            "✦ Analyser avec BIO"
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-warning">
          {error}{" "}
          <button onClick={handleAnalyze} className="underline font-medium">
            Réessayer
          </button>
        </div>
      )}

      {/* Analysis result */}
      {currentAnalysis && (
        <SportAnalysisCard
          analysis={currentAnalysis}
          followupNotes={session.followup_notes || []}
          onAddFollowup={(note) => addFollowupNote(session.id, note)}
          animate={!session.analyzed_at} // animate only on fresh analysis
        />
      )}
    </div>
  );
};

export default SportJournal;
