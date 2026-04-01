import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { weekSessions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const sessionsData = (weekSessions || []).map((s: any) => ({
      date: s.day_date || s.logged_at,
      type: s.session_type_detected,
      intensity: s.intensity_level,
      load: s.ai_analysis?.estimatedLoad,
      note: s.ai_analysis?.weeklyProgressNote,
    }));

    const systemPrompt =
      "You are BIO. Generate a weekly sport performance summary in French. " +
      "Be precise, honest and encouraging. " +
      "Max 4 sentences covering: what went well, what to focus on next week, " +
      "and one specific technique or recovery tip. " +
      "No generic advice — reference the actual sessions. " +
      "Return plain text only, no JSON, no markdown.";

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
          { role: "user", content: "Sessions this week: " + JSON.stringify(sessionsData) },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429 || status === 402) {
        return new Response(JSON.stringify({ error: "Service IA temporairement indisponible." }), {
          status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const synthesis = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ synthesis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-sport-synthesis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
