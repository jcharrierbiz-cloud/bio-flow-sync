import { useState } from "react";
import { SportAnalysis, getSportIcon } from "@/lib/effortStore";

const intensityBadgeStyles: Record<string, { bg: string; text: string }> = {
  Low: { bg: "bg-[#E1F5EE]", text: "text-[#085041]" },
  Moderate: { bg: "bg-[#FAEEDA]", text: "text-[#633806]" },
  High: { bg: "bg-[#FAECE7]", text: "text-[#4A1B0C]" },
  Maximum: { bg: "bg-[#FCEBEB]", text: "text-[#501313]" },
};

interface Props {
  analysis: SportAnalysis;
  followupNotes?: string[];
  onAddFollowup?: (note: string) => void;
  animate?: boolean;
}

const SportAnalysisCard = ({ analysis, followupNotes = [], onAddFollowup, animate = false }: Props) => {
  const [followupText, setFollowupText] = useState("");
  const badge = intensityBadgeStyles[analysis.intensityLevel] || intensityBadgeStyles.Moderate;
  const icon = getSportIcon(analysis.sessionType);

  return (
    <div
      className={`space-y-3 ${animate ? "animate-in slide-in-from-top-2 fade-in duration-400" : ""}`}
    >
      <div className="glass-card p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
            {icon} {analysis.sessionType}
          </span>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}
          >
            {analysis.intensityLevel}
          </span>
        </div>

        {/* Coach feedback */}
        <div className="border-l-2 border-energy pl-3 bg-secondary rounded-md p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-6 h-6 rounded-full bg-energy flex items-center justify-center text-[11px] font-bold text-primary-foreground">
              B
            </div>
            <span className="text-[11px] text-muted-foreground">BIO</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{analysis.coachFeedback}</p>
        </div>

        {/* Improvements */}
        <div>
          <span className="text-xs text-muted-foreground block mb-1.5">Points à améliorer</span>
          <div className="flex flex-wrap gap-2">
            {analysis.improvements.map((imp, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-full border border-energy/30 text-energy"
              >
                {imp}
              </span>
            ))}
          </div>
        </div>

        {/* Next session */}
        <div>
          <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            🎯 Prochaine séance
          </span>
          <p className="text-[13px] text-foreground">{analysis.nextSessionAdvice}</p>
        </div>

        {/* Performance impact */}
        <p className="text-xs text-muted-foreground">
          Impact sur ta courbe :{" "}
          <span className={analysis.performanceCurveImpact >= 0 ? "text-energy" : "text-warning"}>
            {analysis.performanceCurveImpact >= 0 ? "+" : ""}
            {analysis.performanceCurveImpact} pts
          </span>
        </p>
      </div>

      {/* Follow-up notes */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">
          Ajouter une note de suivi (le lendemain...)
        </span>
        <textarea
          value={followupText}
          onChange={(e) => setFollowupText(e.target.value)}
          placeholder="Ex: Courbatures aux quadriceps le lendemain, récupération en 48h..."
          className="w-full min-h-[56px] rounded-xl bg-secondary border border-glass-border p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-energy/30"
        />
        <button
          onClick={() => {
            if (followupText.trim() && onAddFollowup) {
              onAddFollowup(followupText.trim());
              setFollowupText("");
            }
          }}
          disabled={!followupText.trim()}
          className="text-xs text-energy font-medium hover:underline disabled:opacity-40"
        >
          Ajouter
        </button>

        {followupNotes.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {followupNotes.map((note, i) => (
              <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                <span className="text-energy">•</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SportAnalysisCard;
