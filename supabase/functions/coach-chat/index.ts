import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es "Coach Bio-Flow", un assistant IA spécialisé dans l'optimisation biologique de la journée. Tu aides l'utilisateur à organiser son agenda en fonction de son niveau d'énergie, son sommeil, sa nutrition et son activité sportive.

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
    const { messages, agenda } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextMessage = agenda
      ? `\n\nVoici l'agenda actuel de l'utilisateur :\n${JSON.stringify(agenda, null, 2)}`
      : "";

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT + contextMessage },
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
