import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `Tu es "Coach Bio-Flow", un assistant IA spécialisé dans l'optimisation biologique de la journée. Tu aides l'utilisateur à organiser son agenda en fonction de son niveau d'énergie, son sommeil, sa nutrition et son activité sportive.

Tes capacités :
- Analyser le niveau d'énergie et la fatigue de l'utilisateur
- Réorganiser les tâches en fonction des fenêtres de performance (pics d'énergie le matin 9h-11h)
- Conseiller sur la nutrition et le sport en lien avec la productivité
- Proposer des ajustements d'emploi du temps concrets

Quand l'utilisateur te demande de réorganiser son agenda, tu dois répondre avec un JSON structuré dans un bloc \`\`\`json_agenda\`\`\` contenant les tâches réorganisées au format :
\`\`\`json_agenda
[
  {"time": "09:00", "duration": "1h30", "title": "Nom de la tâche", "priority": "high|medium|low", "energy": "high|low", "category": "Travail|Sport|Repas"}
]
\`\`\`

Sois bienveillant, concis et scientifique. Utilise le tutoiement. Réponds en français.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, agenda, deviceId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build sport context if deviceId provided
    let sportContext = "";
    if (deviceId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const sb = createClient(supabaseUrl, serviceKey);

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
          // Compute aggregates
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

          // Check overtraining
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
        console.error("Failed to load sport context:", e);
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
            { role: "system", content: BASE_SYSTEM_PROMPT + contextMessage + sportContext },
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
