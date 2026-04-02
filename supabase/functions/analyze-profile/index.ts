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

    const systemPrompt = "You are Bio-Flow's onboarding AI. " +
      "Based on the user profile, generate a complete personalized coaching configuration in JSON only. " +
      "No preamble, no markdown, no backticks. Only a valid JSON object with these exact keys: " +
      "coachTone (string: describe the exact communication style and tone BIO should use with this user), " +
      "coachName (string: a first name for the coach adapted to the user profile), " +
      "dailyStructure (string: recommended day structure based on schedule and workload), " +
      "focusAreas (array of 3 strings: top priorities), " +
      "weeklyTaskGoal (integer: realistic number of tasks per week for this profile), " +
      "nutritionTip (string: one specific daily nutrition tip for this profile), " +
      "firstMessage (string: BIO's very first message to the user, warm, personalized, max 2 sentences, in French, use their pseudo), " +
      "motivationStyle (string: how to celebrate wins for this specific user)";

    const userMsg = "Profile: pseudo=" + (profileData.pseudo || "") +
      ", age=" + (profileData.age || "") +
      ", weight=" + (profileData.weight || "not provided") +
      ", height=" + (profileData.height || "not provided") +
      ", sportLevel=" + (profileData.sportLevel || profileData.fitness || "") +
      ", sportHistory=" + (profileData.sportHistory || "not provided") +
      ", schedule=" + (profileData.schedule || profileData.status || "") +
      ", workload=" + (profileData.workload || profileData.org || "") +
      ", mainGoal=" + (profileData.mainGoal || profileData.goal || "") +
      ", goalDetail=" + (profileData.goalDetail || profileData.goalDetails || "none") +
      ", focusLockEnabled=" + (profileData.focusLockEnabled || false) +
      ", blockedCategories=" + ((profileData.blockedCategories || []).join(",") || "none");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + LOVABLE_API_KEY,
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
