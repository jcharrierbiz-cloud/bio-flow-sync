// src/hooks/useReminderSync.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Rapprochement des rappels locaux et de la copie serveur.
//
// Au démarrage : on lit les rappels du compte, on fusionne avec ce qui est sur
// l'appareil, et on téléverse ce qui n'existait que localement — typiquement
// les rappels créés avant cette version, qui doivent rejoindre le serveur pour
// pouvoir sonner application fermée. Aucun rappel n'est supprimé par ce
// rapprochement.
//
// Hors ligne ou hors connexion, la fonction ne fait rien : l'app continue sur
// sa copie locale.
// -----------------------------------------------------------------------------

import { useEffect } from "react";
import { useReminderStore } from "@/lib/reminderStore";
import {
  fetchRemoteReminders,
  mergeReminders,
  pushRemoteReminders,
} from "@/lib/reminderSync";
import { refreshPushSubscription, registerServiceWorker } from "@/lib/push";

export function useReminderSync() {
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const remote = await fetchRemoteReminders();
      if (cancelled || remote === null) return;

      const local = useReminderStore.getState().reminders;
      const { merged, toUpload } = mergeReminders(local, remote);

      useReminderStore.getState().replaceAll(merged);
      if (toUpload.length > 0) await pushRemoteReminders(toUpload);
    };

    // Le service worker doit être enregistré pour que le navigateur puisse
    // recevoir un push ; on le fait au démarrage, sans rien demander.
    void registerServiceWorker().then(() => refreshPushSubscription());
    void sync();

    // Le navigateur peut renouveler l'abonnement de lui-même : le service
    // worker prévient les onglets, on le réenregistre côté serveur.
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "push-subscription-change") void refreshPushSubscription();
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      cancelled = true;
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);
}
