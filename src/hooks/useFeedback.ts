// src/hooks/useFeedback.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Accès React au moteur de retour sensoriel (sons + haptique).
// Expose les préférences de façon réactive (re-render au changement) et les
// setters à câbler dans l'écran Réglages.
// -----------------------------------------------------------------------------

import { useSyncExternalStore, useCallback } from "react";
import {
  feedback,
  subscribeFeedback,
  isSoundEnabled,
  isHapticsEnabled,
  setSoundEnabled as setSound,
  setHapticsEnabled as setHaptics,
} from "@/lib/feedback";

export function useFeedback() {
  const soundEnabled = useSyncExternalStore(subscribeFeedback, isSoundEnabled, isSoundEnabled);
  const hapticsEnabled = useSyncExternalStore(subscribeFeedback, isHapticsEnabled, isHapticsEnabled);

  const setSoundEnabled = useCallback((on: boolean) => {
    setSound(on);
    if (on) feedback.toggle(true); // petit aperçu sonore à l'activation
  }, []);

  const setHapticsEnabled = useCallback((on: boolean) => {
    setHaptics(on);
    if (on) feedback.vibrate(15); // aperçu tactile à l'activation
  }, []);

  return { feedback, soundEnabled, hapticsEnabled, setSoundEnabled, setHapticsEnabled };
}
