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
  "coach_tone": "motivant" | "bienveillant" | "direct" | "scientifique",
  "focus_duration_default": number (minutes, entre 15 et 45),
  "morning_routine_suggestion": string (phrase courte),
  "recovery_priority": "high" | "medium" | "low",
  "recommended_breaks_per_day": number,
  "energy_management_tips": [string, string, string],
  "personalized_greeting": string (phrase d'accueil personnalisée)
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
