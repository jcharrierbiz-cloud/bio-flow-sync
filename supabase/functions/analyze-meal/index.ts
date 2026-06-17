import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, profile, energyScore, hourOfDay } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!imageBase64) throw new Error("imageBase64 is required");

    const pseudo = profile?.pseudo || "Utilisateur";
    const age = profile?.age || "inconnu";
    const weight = profile?.weight || "non renseigné";
    const height = profile?.height || "non renseigné";
    const level = profile?.fitness_level || "non renseigné";
    const goal = profile?.main_goal || "non renseigné";
    const hour = typeof hourOfDay === "number" ? hourOfDay : new Date().getHours();
    const energy = energyScore ?? "non disponible";

    const systemPrompt = `Tu es NUTRI-VISION, un expert nutritionniste et chef cuisinier doté d'une base de connaissance de plus de 500 000 plats du monde entier (cuisines françaises, italiennes, japonaises, asiatiques, méditerranéennes, africaines, sud-américaines, fast-food, healthy-bowls, street-food, plats faits maison, desserts, snacks, boissons, smoothies, etc.).

Ton expertise couvre :
- Identification précise des plats même partiellement visibles, avec leurs variantes régionales
- Estimation des portions par analyse visuelle (taille assiette, hauteur, densité)
- Décomposition en ingrédients principaux avec quantités estimées
- Calcul des macronutriments (calories, protéines, glucides, lipides, fibres) par référence USDA/CIQUAL
- Index et charge glycémique
- Vitesse de digestion (1-5h) et fenêtre d'absorption
- Impact métabolique : pic d'insuline, somnolence post-prandiale, charge digestive
- Synergie avec le rythme circadien et la chronobiologie nutritionnelle

Profil utilisateur :
- Nom : ${pseudo} | Âge : ${age} ans | Poids : ${weight} | Taille : ${height}
- Niveau sportif : ${level} | Objectif principal : ${goal}
- Score d'énergie actuel : ${energy}/100
- Heure du repas : ${hour}h

Analyse la photo du plat fournie. Sois ULTRA-PRÉCIS, jamais générique. Si plusieurs éléments visibles, liste-les tous.

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de backticks, pas de préambule) avec EXACTEMENT ces clés :
{
  "dishName": "nom précis du plat en français (ex: 'Poke bowl saumon-avocat-riz vinaigré')",
  "cuisine": "origine culinaire (ex: 'Hawaïen / Japonais fusion')",
  "confidence": entier 0-100 (confiance d'identification),
  "ingredients": [tableau de 3 à 8 objets {"name": "ingrédient", "qty": "quantité estimée (ex: 120g, 1 cuillère)"}] ,
  "portion": "Petite" | "Standard" | "Grande" | "XL",
  "calories": entier estimé (kcal),
  "macros": {"protein": grammes entier, "carbs": grammes entier, "fat": grammes entier, "fiber": grammes entier},
  "glycemicLoad": "Bas" | "Modéré" | "Élevé" | "Très élevé",
  "digestionWeight": "Léger" | "Modéré" | "Lourd" | "Très lourd",
  "digestionHours": nombre décimal (durée approx en heures, ex: 2.5),
  "energyImpactPct": entier entre -35 et +20 (impact sur l'énergie dans les 2-3h),
  "impactDurationHours": entier 1-5,
  "nutritionalQuality": entier 0-100 (densité nutritionnelle),
  "strengths": [tableau de 1 à 3 points forts nutritionnels en français],
  "weaknesses": [tableau de 1 à 3 points faibles ou attentions en français],
  "circadianFit": "Excellent" | "Bon" | "Moyen" | "Mauvais" (adéquation avec l'heure du repas),
  "bestTimeWindow": "matin" | "midi" | "après-midi" | "soir" | "post-entraînement",
  "expertNote": "analyse experte personnalisée en 2-3 phrases, référence le score d'énergie et l'objectif de l'utilisateur",
  "nextMealAdvice": "recommandation concrète pour le prochain repas (1 phrase)",
  "hydrationTip": "conseil d'hydratation spécifique à ce plat (1 phrase)",
  "tags": [tableau de 2 à 4 tags courts en français (ex: 'Riche en protéines', 'Pic glycémique', 'Anti-inflammatoire')]
}

Si l'image ne contient PAS de nourriture, renvoie : {"error": "no_food_detected"}.`;

    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

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
          {
            role: "user",
            content: [
              { type: "text", text: "Analyse ce plat avec une précision maximale." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
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

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      // Find first { and last } in case of preamble
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      parsed = JSON.parse(cleaned.slice(start, end + 1));
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
    console.error("analyze-meal error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
