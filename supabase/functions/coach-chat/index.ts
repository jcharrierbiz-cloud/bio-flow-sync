import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `Tu es "Coach Bio-Flow", coach IA d'optimisation biologique. Tutoiement, français.

## STYLE DE RÉPONSE — RÈGLE ABSOLUE
- **Ultra-concis**. Jamais de blabla d'introduction ("Bonjour", "Bien sûr", "Voici…"). Va direct à la réponse.
- **Format : phrases clés courtes**, en gras les mots importants, bullet points, emojis pertinents (⚡️ 💪 🧠 🛌 🍽️ 🎯 🔥 ⏱️).
- **Max ~80 mots** pour une réponse normale. Si l'user demande "détaille", alors développe.
- Aère : sauts de ligne entre les idées. Pas de pavé.
- Pas de disclaimers, pas de "n'hésite pas à…", pas de conclusion molle.
- Réponds **directement à la question posée**, pas à côté.

### Exemple de bon format
**Améliorer ta VMA (8 km/h)** 🎯

• **Fractionné 30/30** ⚡️ — 10×(30s rapide / 30s lent), 2x/sem
• **Sortie longue** 🏃 — 45min allure facile, 1x/sem
• **Côtes courtes** 💪 — 8×20s en montée, récup descente

Objectif : +1 km/h en 6 semaines.


## CAPACITÉS
Analyse énergie/sommeil/sport/nutrition. Réorganise l'agenda **uniquement** si l'user le demande explicitement (mots-clés : "réorganise", "modifie mon agenda", "change mon planning", "déplace", "ajoute une tâche/pause", etc.).

⚠️ **NE JAMAIS** générer de bloc \`\`\`json_agenda\`\`\` pour une simple question, un conseil, ou une discussion. Seulement quand on te demande explicitement de modifier l'agenda.

Format quand demandé :
\`\`\`json_agenda
[{"time":"09:00","duration":"1h30","title":"...","priority":"high","energy":"high","category":"Travail"}]
\`\`\``;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, agenda, deviceId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let personalContext = "";
    let sportContext = "";

    if (deviceId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, serviceKey);

        // Load user profile for personalization
        const { data: profileData } = await sb
          .from("user_profiles")
          .select("*")
          .eq("device_id", deviceId)
          .maybeSingle();

        if (profileData) {
          const coachConfig = profileData.ai_coach_config as any;
          const p = profileData as any;
          
          if (coachConfig) {
            personalContext = "\n\nYour communication style for this user: " +
              (coachConfig.coachTone || coachConfig.coachPersonality || "") +
              "\nUser identity: " + p.pseudo +
              ", " + p.age + " years old" +
              (p.weight ? ", " + p.weight + (p.weight_unit || "kg") : "") +
              (p.height ? ", " + p.height + (p.height_unit || "cm") : "") +
              "\nSport profile: " + (p.fitness_level || "") +
              ", history: " + (p.sport_history || "unknown") +
              "\nDaily context: " + (p.schedule || p.status || "") +
              ", workload: " + (p.workload || p.organization_level || "") +
              "\nPrimary goal: " + (p.main_goal || "") +
              (p.goal_details ? " — " + p.goal_details : "") +
              "\nFocus areas: " + ((coachConfig.focusAreas || []).join(", ") || "general") +
              "\nWeekly task goal: " + (coachConfig.weeklyTaskGoal || "10") +
              "\nMotivation style: " + (coachConfig.motivationStyle || "encouraging") +
              "\nCritical rule: Always address the user as '" + p.pseudo +
              "'. Never use a generic greeting. " +
              "Every recommendation must reference their specific profile data — never give generic advice.";
          }
        }

        // Load sport context
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const { data: sportSessions } = await sb
          .from("effort_sessions")
          .select("*")
          .eq("device_id", deviceId)
          .not("ai_analysis", "is", null)
          .gte("day_date", fourteenDaysAgo.toISOString().slice(0, 10))
          .order("logged_at", { ascending: false })
          .limit(20);

        if (sportSessions && sportSessions.length > 0) {
          const typeCount: Record<string, number> = {};
          sportSessions.forEach((s: any) => {
            const t = s.session_type_detected || "Unknown";
            typeCount[t] = (typeCount[t] || 0) + 1;
          });
          const mostPracticedSport = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
          const avgWeeklySessions = (sportSessions.length / 2).toFixed(1);
          const latest = sportSessions[0];
          const latestAnalysis = latest.ai_analysis as any;
          const latestStrengthPattern = latestAnalysis?.strengthPattern || "not enough data yet";
          const latestImprovementFocus = latestAnalysis?.improvementFocus || "not enough data yet";
          const lastNextSessionAdvice = latestAnalysis?.nextSessionAdvice || "none";

          const recentFollowupNotes = sportSessions
            .slice(0, 5)
            .flatMap((s: any) => s.followup_notes || [])
            .join("; ") || "aucune note de suivi";

          const sessionLines = sportSessions.map((s: any) => {
            const a = s.ai_analysis as any;
            return "- " + s.day_date + ": " + s.session_type_detected +
              " (" + s.intensity_level + ", load " + (a?.estimatedLoad || "?") + "/100) — " +
              (a?.weeklyProgressNote || "");
          }).join("\n");

          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const recentHigh = sportSessions.filter((s: any) =>
            new Date(s.day_date) >= sevenDaysAgo &&
            (s.intensity_level === "High" || s.intensity_level === "Maximum")
          ).length;

          sportContext = "\n\n## Sport training history — last 14 days\n" +
            sessionLines + "\n\n" +
            "## Running coach observations\n" +
            "- Most practiced sport: " + mostPracticedSport + "\n" +
            "- Weekly average sessions: " + avgWeeklySessions + "\n" +
            "- Identified strength: " + latestStrengthPattern + "\n" +
            "- Current improvement focus: " + latestImprovementFocus + "\n" +
            "- Last advice given: " + lastNextSessionAdvice + "\n" +
            "- Follow-up notes from user: " + recentFollowupNotes + "\n\n" +
            "Sport coaching rules:\n" +
            "1. Always reference actual past sessions by type and date.\n" +
            "2. Never repeat the same nextSessionAdvice twice in a row.\n" +
            "3. Track progression explicitly — compare current to past.\n" +
            (recentHigh >= 5
              ? "4. WARNING: " + recentHigh + " High/Maximum sessions in last 7 days. Proactively warn about overtraining risk.\n"
              : "4. Monitor for overtraining if intensity increases.\n") +
            "5. When user asks about sport: always check follow-up notes for recovery feedback before giving new advice.";
        }
      } catch (e) {
        console.error("Failed to load context:", e);
      }
    }

    const contextMessage = agenda
      ? "\n\nVoici l'agenda actuel de l'utilisateur :\n" + JSON.stringify(agenda, null, 2)
      : "";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + LOVABLE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: BASE_SYSTEM_PROMPT + personalContext + contextMessage + sportContext },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessaie dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coach-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
