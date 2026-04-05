import { useState, useEffect } from "react";
import { Utensils, ChevronDown, ChevronUp, Check, History, Calendar } from "lucide-react";
import { getCachedProfile } from "@/lib/profileStore";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/profileStore";

const defaultTips = [
  "Bois au moins 2L d'eau par jour",
  "Mange des protéines à chaque repas",
  "Limite le sucre ajouté",
  "Privilégie les légumes de saison",
];

interface DayLog {
  date: string;
  tips: { index: number; label: string; checked: boolean }[];
  score: number;
}

const NutritionCard = () => {
  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<DayLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [checks, setChecks] = useState<boolean[]>([false, false, false, false]);
  const profile = getCachedProfile();
  const config = profile?.ai_coach_config as any;

  const tips: string[] = config?.nutritionGuidelines
    ? (typeof config.nutritionGuidelines === "string"
        ? config.nutritionGuidelines.split(/\n|(?:\d+\.\s)/).filter(Boolean).slice(0, 4)
        : Array.isArray(config.nutritionGuidelines)
          ? config.nutritionGuidelines
          : defaultTips)
    : defaultTips;

  while (tips.length < 4) tips.push(defaultTips[tips.length % defaultTips.length]);

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const todayTipIdx = dayOfYear % tips.length;

  useEffect(() => {
    const loadChecks = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const deviceId = getDeviceId();
      const { data } = await supabase
        .from("daily_nutrition_logs")
        .select("tip_index, checked")
        .eq("device_id", deviceId)
        .eq("log_date", today);

      if (data) {
        const newChecks = [...checks];
        data.forEach((d) => {
          if (d.tip_index < newChecks.length) newChecks[d.tip_index] = d.checked;
        });
        setChecks(newChecks);
      }
    };
    loadChecks();
  }, []);

  const toggleCheck = async (idx: number) => {
    const newChecks = [...checks];
    newChecks[idx] = !newChecks[idx];
    setChecks(newChecks);

    const today = new Date().toISOString().slice(0, 10);
    const deviceId = getDeviceId();

    const { data: existing } = await supabase
      .from("daily_nutrition_logs")
      .select("id")
      .eq("device_id", deviceId)
      .eq("log_date", today)
      .eq("tip_index", idx)
      .maybeSingle();

    if (existing) {
      await supabase.from("daily_nutrition_logs").update({ checked: newChecks[idx] }).eq("id", existing.id);
    } else {
      await supabase.from("daily_nutrition_logs").insert({
        device_id: deviceId,
        log_date: today,
        tip_index: idx,
        checked: newChecks[idx],
      });
    }
  };

  const loadHistory = async () => {
    if (history.length > 0) {
      setHistoryOpen(!historyOpen);
      return;
    }
    setHistoryLoading(true);
    const deviceId = getDeviceId();
    const { data } = await supabase
      .from("daily_nutrition_logs")
      .select("*")
      .eq("device_id", deviceId)
      .order("log_date", { ascending: false })
      .limit(200);

    if (data) {
      const grouped: Record<string, { index: number; checked: boolean }[]> = {};
      data.forEach((d) => {
        if (!grouped[d.log_date]) grouped[d.log_date] = [];
        grouped[d.log_date].push({ index: d.tip_index, checked: d.checked });
      });

      const today = new Date().toISOString().slice(0, 10);
      const days: DayLog[] = Object.entries(grouped)
        .filter(([date]) => date !== today)
        .map(([date, entries]) => {
          const dayTips = entries.map((e) => ({
            index: e.index,
            label: tips[e.index] || defaultTips[e.index % defaultTips.length],
            checked: e.checked,
          }));
          const checkedCount = dayTips.filter((t) => t.checked).length;
          const score = Math.round((checkedCount / Math.max(dayTips.length, 1)) * 100);
          return { date, tips: dayTips, score };
        })
        .sort((a, b) => b.date.localeCompare(a.date));

      setHistory(days);
    }
    setHistoryLoading(false);
    setHistoryOpen(true);
  };

  const checkedToday = checks.filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Utensils className="w-3.5 h-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Nutrition du jour</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{checkedToday}/{tips.length}</span>
            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Today's tip */}
        <div className="flex items-start gap-2">
          <button
            onClick={() => toggleCheck(todayTipIdx)}
            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
              checks[todayTipIdx]
                ? "bg-primary border-primary"
                : "border-muted-foreground/30 hover:border-primary/50"
            }`}
          >
            {checks[todayTipIdx] && <Check className="w-3 h-3 text-primary-foreground" />}
          </button>
          <p className={`text-xs leading-relaxed ${checks[todayTipIdx] ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {tips[todayTipIdx]}
          </p>
        </div>

        {/* Expanded: all tips */}
        {expanded && (
          <div className="space-y-2 pt-1 border-t border-border">
            {tips.map((tip, i) => {
              if (i === todayTipIdx) return null;
              return (
                <div key={i} className="flex items-start gap-2">
                  <button
                    onClick={() => toggleCheck(i)}
                    className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      checks[i]
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30 hover:border-primary/50"
                    }`}
                  >
                    {checks[i] && <Check className="w-3 h-3 text-primary-foreground" />}
                  </button>
                  <p className={`text-xs leading-relaxed ${checks[i] ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {tip}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History toggle */}
      <button
        onClick={loadHistory}
        className="w-full flex items-center justify-between glass-card p-3 hover:border-primary/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">Historique nutrition</span>
        </div>
        <div className="flex items-center gap-1.5">
          {history.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{history.length} jour{history.length > 1 ? "s" : ""}</span>
          )}
          {historyLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : historyOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* History list */}
      {historyOpen && (
        <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
          {history.length === 0 ? (
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Aucun historique pour le moment</p>
            </div>
          ) : (
            history.slice(0, 14).map((day) => {
              const dateObj = new Date(day.date + "T12:00:00");
              const label = dateObj.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
              const scoreColor = day.score >= 75 ? "text-energy" : day.score >= 50 ? "text-warning" : "text-intensity";

              return (
                <div key={day.date} className="glass-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground capitalize">{label}</span>
                    </div>
                    <span className={`text-xs font-semibold ${scoreColor}`}>{day.score}%</span>
                  </div>
                  <div className="space-y-1">
                    {day.tips.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] ${
                          t.checked ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}>
                          {t.checked ? "✓" : "✗"}
                        </span>
                        <span className={`text-[11px] ${t.checked ? "text-muted-foreground line-through" : "text-foreground"}`}>
                          {t.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default NutritionCard;
