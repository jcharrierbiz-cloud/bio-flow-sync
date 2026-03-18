import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const profileData = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es le moteur d'analyse de Bio-Flow, une app de productivité et bien-être.
À partir du profil utilisateur, génère une configuration de coach personnalisé.

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de texte autour) avec cette structure :
{
  "coachPersonality": "2-3 phrases décrivant le ton et le style exact du coach pour cet utilisateur",
  "coachName": "un prénom pour le coach adapté au profil",
  "dailyStructure": "structure de journée recommandée (rythme matin/après-midi/soir)",
  "focusAreas": ["domaine1", "domaine2", "domaine3"],
  "weeklyGoals": {
    "tasks": number entre 5 et 20,
    "focusSessions": number entre 3 et 14,
    "restDays": number entre 1 et 3
  },
  "rewardSystem": {
    "taskReward": "court message de célébration pour une tâche terminée",
    "dailyReward": "récompense débloquée après avoir terminé toutes les tâches du jour",
    "streakMilestones": {
      "3days": "message milestone",
      "7days": "message milestone",
      "30days": "message milestone"
    }
  },
  "nutritionGuidelines": "3-4 conseils nutrition pratiques adaptés à l'âge, niveau sportif et objectif",
  "firstMessage": "le tout premier message du coach à l'utilisateur, chaleureux et personnalisé, max 3 phrases"
}`;

    const userMsg = `Profil utilisateur :
- Pseudo : ${profileData.pseudo}
- Âge : ${profileData.age} ans
- Poids : ${profileData.weight ? `${profileData.weight} ${profileData.weightUnit}` : "non renseigné"}
- Taille : ${profileData.height ? `${profileData.height} ${profileData.heightUnit}` : "non renseigné"}
- Niveau sportif : ${profileData.fitness}
- Organisation : ${profileData.org}
- Statut : ${profileData.status}
- Objectif principal : ${profileData.goal}
- Détails objectif : ${profileData.goalDetails || "aucun"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    // Parse JSON from response (handle potential markdown wrapping)
    let config;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      config = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.error("Failed to parse AI response:", content);
      config = {};
    }

    return new Response(JSON.stringify({ config }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-profile error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", config: {} }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
