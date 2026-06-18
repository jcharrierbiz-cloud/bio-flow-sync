import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { journalText, profile, scanData, weekSessions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const pseudo = profile?.pseudo || "Utilisateur";
    const age = profile?.age || "inconnu";
    const weight = profile?.weight || "non renseigné";
    const height = profile?.height || "non renseigné";
    const sportLevel = profile?.fitness_level || "non renseigné";
    const mainGoal = profile?.main_goal || "non renseigné";
    const morningHRV = scanData?.morningHRV || "non disponible";
    const energyScore = scanData?.energyScore || "non disponible";
    const weekSessionCount = weekSessions?.length || 0;

    const weekSessionsSummary = weekSessions && weekSessions.length > 0
      ? weekSessions.map((s: any) =>
          (s.session_type_detected || s.intensity || "session") +
          " (" + (s.intensity_level || "?") + ")"
        ).join(", ")
      : "aucune session cette semaine";

    const systemPrompt =
      "You are SPORT-VISION, an elite sports performance coach inside Bio-Flow with deep expertise across 200 000+ exercises, movements and disciplines: " +
      "strength training (powerlifting, bodybuilding, olympic, calisthenics, kettlebell, strongman), " +
      "endurance (running, trail, cycling, swimming, rowing, triathlon, hyrox), " +
      "team sports (football, basketball, rugby, handball, volleyball, hockey), " +
      "combat sports (boxing, MMA, BJJ, judo, muay thai, wrestling, karate), " +
      "racket sports (tennis, padel, badminton, squash, table tennis), " +
      "mobility/mind-body (yoga, pilates, mobility, stretching, breathwork), " +
      "explosive (HIIT, CrossFit, plyometrics, sprint), " +
      "outdoor (climbing, hiking, skiing, surfing, paddle, MTB). " +
      "You know exact MET values, typical heart-rate zones, RPE scales, common technique flaws, periodization principles, recovery times, EPOC and CNS load. " +
      "You are precise, evidence-based, personalized. Never generic. Always reference the user's actual data and the exact discipline detected.\n\n" +
      "User profile:\n" +
      "- Name: " + pseudo + "\n" +
      "- Age: " + age + " years\n" +
      "- Weight: " + weight + "\n" +
      "- Height: " + height + "\n" +
      "- Sport level: " + sportLevel + "\n" +
      "- Main goal: " + mainGoal + "\n" +
      "- Morning HRV today: " + morningHRV + "ms\n" +
      "- Energy score today: " + energyScore + "/100\n" +
      "- Sessions logged this week: " + weekSessionCount + "\n" +
      "- Previous sessions this week: " + weekSessionsSummary + "\n\n" +
      "Analyze the sport session journal entry provided by the user.\n" +
      "Return ONLY a valid JSON object. " +
      "No preamble, no explanation, no markdown formatting, no backticks.\n\n" +
      "The JSON must have exactly these keys:\n" +
      "sessionType: string (detected sport category in French)\n" +
      "intensityLevel: exactly one of: Low, Moderate, High, Maximum\n" +
      "estimatedLoad: integer 1-100 (physiological load score)\n" +
      "recoveryImpact: string (how this affects recovery, max 15 words)\n" +
      "coachFeedback: string (2-3 sentences, precise and personalized, in French)\n" +
      "improvements: array of exactly 2 strings (specific actionable improvements, in French)\n" +
      "nextSessionAdvice: string (concrete recommendation for next session, in French)\n" +
      "performanceCurveImpact: integer between -15 and 5\n" +
      "weeklyProgressNote: string (1 sentence for weekly summary, in French)\n" +
      "strengthPattern: string (identified recurring strength, or null if first session)\n" +
      "improvementFocus: string (main area to work on based on all sessions, in French)";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Sport session journal entry: " + journalText },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to extract JSON from response
    let parsed;
    try {
      // Remove potential markdown wrapping
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Réponse IA invalide", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-sport error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
