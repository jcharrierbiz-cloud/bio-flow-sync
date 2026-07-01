// src/hooks/useGlobalTapFeedback.ts
// -----------------------------------------------------------------------------
// Bio-Flow — « Un peu de vie » sur TOUTE l'app en une seule ligne.
//
// Monté une fois (dans App), ce hook joue un petit son + une micro-vibration
// sur chaque appui d'élément interactif (bouton, lien, onglet…). Il débloque
// aussi l'AudioContext au tout premier geste (politique autoplay navigateurs).
//
// Opt-out : ajoute `data-no-feedback` sur un élément (ou un parent) pour le
// rendre silencieux (ex. curseurs, zones de saisie qui gèrent leur propre son).
//
// @example  App.tsx →  useGlobalTapFeedback();
// -----------------------------------------------------------------------------

import { useEffect } from "react";
import { feedback, unlockAudio } from "@/lib/feedback";

const INTERACTIVE = 'button, [role="button"], a[href], summary, label[for], .feedback-tap';

export function useGlobalTapFeedback(): void {
  useEffect(() => {
    let unlocked = false;

    const onPointerDown = (e: Event) => {
      // Débloque l'audio dès la 1re interaction, quoi qu'il arrive.
      if (!unlocked) {
        unlockAudio();
        unlocked = true;
      }

      const target = e.target as HTMLElement | null;
      const el = target?.closest?.(INTERACTIVE) as HTMLElement | null;
      if (!el) return;

      // Respecte les opt-out et les éléments désactivés.
      if (el.closest("[data-no-feedback]")) return;
      if ((el as HTMLButtonElement).disabled) return;
      if (el.getAttribute("aria-disabled") === "true") return;

      feedback.softTap();
      feedback.vibrate(6);
    };

    // pointerdown = réactif (avant le click), passif = zéro impact perf.
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
}
