// Moteur d'action du jour (Tâche 4) — le "feedback immédiat qui corrige".
// À partir du scan matinal (readiness / HRV / stress) + énergie, on dérive
// UNE seule action concrète et prioritaire pour la journée. 100% règles,
// déterministe, sans appel IA — fiable et gratuit. Les seuils sont ajustables.

export type ActionTone = "scan" | "rest" | "moderate" | "peak" | "stress";

export interface DailyActionInput {
  hasMorningScan: boolean;
  readiness?: number | null;  // 0-100
  hrv?: number | null;        // ms (RMSSD)
  stress?: number | null;     // indice de stress (≈ 0-100)
  energyTotal?: number | null;
  contributors: number;
}

export interface DailyAction {
  id: string;                 // identifiant stable pour mémoriser "fait aujourd'hui"
  tone: ActionTone;
  emoji: string;
  headline: string;           // titre court
  action: string;             // L'ACTION concrète (impératif, faisable aujourd'hui)
  why: string;                // justification chiffrée (le "feedback qui corrige")
  ctaLabel: string;
  ctaRoute: string;           // route interne (react-router)
}

export function computeDailyAction(input: DailyActionInput): DailyAction {
  const { hasMorningScan, readiness, hrv, stress, energyTotal, contributors } = input;

  // 0) Pas encore de scan → l'action est de scanner (le hook quotidien).
  if (!hasMorningScan) {
    return {
      id: "scan",
      tone: "scan",
      emoji: "📡",
      headline: "Calibre ta journée",
      action: "Fais ton scan matinal (2 min) avant ta première tâche.",
      why: contributors === 0
        ? "Aucune donnée du jour : ton score d'énergie est encore vide."
        : "Le scan affine ta prédiction d'énergie pour le reste de la journée.",
      ctaLabel: "Scanner maintenant",
      ctaRoute: "/health",
    };
  }

  const r = typeof readiness === "number" ? readiness : null;
  const h = typeof hrv === "number" ? hrv : null;
  const s = typeof stress === "number" ? stress : null;

  // 1) Stress élevé : priorité absolue, ça conditionne tout le reste.
  if (s != null && s >= 65) {
    return {
      id: "stress",
      tone: "stress",
      emoji: "🫁",
      headline: "Stress élevé détecté",
      action: "Fais 3 minutes de respiration lente avant ta première tâche, puis attaque UNE seule chose.",
      why: `Ton indice de stress est à ${Math.round(s)}. Démarrer dans le calme évite de cramer ton énergie tôt.`,
      ctaLabel: "En parler au coach",
      ctaRoute: "/coach",
    };
  }

  // 2) Récupération : readiness basse ou HRV basse.
  if ((r != null && r < 40) || (h != null && h < 30)) {
    return {
      id: "rest",
      tone: "rest",
      emoji: "🌙",
      headline: "Journée récupération",
      action: "Garde 1 seule priorité aujourd'hui, repousse le reste. Marche 10 min et hydrate-toi.",
      why: r != null
        ? `Ta readiness est à ${Math.round(r)}/100 — ton corps demande de la légèreté.`
        : `Ta HRV est à ${Math.round(h as number)} ms, sous ta zone habituelle.`,
      ctaLabel: "Alléger mon agenda",
      ctaRoute: "/agenda",
    };
  }

  // 3) Pic de forme : readiness haute (et HRV correcte).
  if (r != null && r >= 70 && (h == null || h >= 35)) {
    return {
      id: "peak",
      tone: "peak",
      emoji: "⚡",
      headline: "Tu es prêt à performer",
      action: "Attaque ta tâche la plus exigeante MAINTENANT, dans ta fenêtre haute. Lance un Focus Lock.",
      why: `Readiness ${Math.round(r)}/100 : c'est le meilleur moment de la journée pour le travail dur.`,
      ctaLabel: "Démarrer un focus",
      ctaRoute: "/agenda",
    };
  }

  // 4) Journée modérée (cas par défaut quand on a un scan).
  if (r != null) {
    return {
      id: "moderate",
      tone: "moderate",
      emoji: "🎯",
      headline: "Journée modérée",
      action: "Concentre-toi sur 2 tâches clés ce matin. Évite le multitâche, fais-en une à la fois.",
      why: `Readiness ${Math.round(r)}/100 : bon potentiel, à condition de ne pas te disperser.`,
      ctaLabel: "Voir mes priorités",
      ctaRoute: "/agenda",
    };
  }

  // 5) Scan fait mais readiness indisponible → on oriente vers le coach.
  return {
    id: "coach",
    tone: "moderate",
    emoji: "🧭",
    headline: "Planifie ta journée",
    action: "Choisis ta priorité n°1 et bloque un créneau pour elle dès ce matin.",
    why: energyTotal != null
      ? `Score d'énergie du jour : ${Math.round(energyTotal)}/100.`
      : "Définis une intention claire pour donner le ton à ta journée.",
    ctaLabel: "Parler au coach",
    ctaRoute: "/coach",
  };
}

// Couleur d'accent (token DA) selon le ton de l'action.
export function toneColor(tone: ActionTone): string {
  switch (tone) {
    case "peak": return "var(--energy)";
    case "rest": return "var(--ai-violet)";
    case "stress": return "var(--intensity)";
    case "moderate": return "var(--warning)";
    case "scan": return "var(--energy)";
    default: return "var(--energy)";
  }
}
