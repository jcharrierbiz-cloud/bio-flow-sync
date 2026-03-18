import { useState, useEffect } from "react";
import { Utensils, ChevronDown, ChevronUp, Check } from "lucide-react";
import { getCachedProfile } from "@/lib/profileStore";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/profileStore";

const defaultTips = [
  "Bois au moins 2L d'eau par jour",
  "Mange des protéines à chaque repas",
  "Limite le sucre ajouté",
  "Privilégie les légumes de saison",
];

const NutritionCard = () => {
  const [expanded, setExpanded] = useState(false);
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

  // Ensure we always have 4 tips
  while (tips.length < 4) tips.push(defaultTips[tips.length % defaultTips.length]);

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const todayTipIdx = dayOfYear % tips.length;

  // Load today's checks from Supabase
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

    // Upsert to Supabase
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

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Utensils className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Nutrition du jour</h3>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
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
  );
};

export default NutritionCard;
