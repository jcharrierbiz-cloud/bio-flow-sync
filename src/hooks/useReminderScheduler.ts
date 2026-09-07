// src/hooks/useReminderScheduler.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Déclencheur des rappels.
//
// Vérifie toutes les 30 s (et à chaque retour au premier plan) les rappels
// échus. Notification système si la permission est accordée, toast dans tous
// les cas : le rappel reste visible même sans permission navigateur.
//
// Rappel de la limite : ça ne tourne que pendant que l'app est ouverte. Les
// occurrences trop anciennes sont marquées « manquées » au lieu d'être
// notifiées en rafale au retour.
// -----------------------------------------------------------------------------

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { collectDue, useReminderStore } from "@/lib/reminderStore";
import { sendNotification } from "@/lib/notifications";

const TICK_MS = 30_000;

export function useReminderScheduler() {
  const reminders = useReminderStore((s) => s.reminders);
  const markHandled = useReminderStore((s) => s.markHandled);
  // Évite qu'un même rappel soit traité deux fois si deux ticks se croisent.
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      const due = collectDue(useReminderStore.getState().reminders, new Date());
      for (const { reminder, occurrence, late } of due) {
        const token = `${reminder.id}@${occurrence.getTime()}`;
        if (inFlight.current.has(token)) continue;
        inFlight.current.add(token);

        if (late) {
          // L'app était fermée à l'heure dite : on l'assume au lieu de mentir.
          markHandled(reminder.id, occurrence, true);
          continue;
        }

        const time = occurrence.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        sendNotification(`⏰ ${reminder.title}`, reminder.note || `Rappel de ${time}`, `reminder-${reminder.id}`);
        toast(`⏰ ${reminder.title}`, {
          description: reminder.note || `Rappel de ${time}`,
        });
        markHandled(reminder.id, occurrence, false);
      }
    };

    check();
    const timer = window.setInterval(check, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // `reminders` en dépendance : un nouveau rappel est pris en compte tout de suite.
  }, [reminders, markHandled]);
}
