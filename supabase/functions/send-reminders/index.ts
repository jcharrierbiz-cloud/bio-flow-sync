// supabase/functions/send-reminders/index.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Envoi des rappels par Web Push.
//
// Appelée toutes les minutes par une tâche planifiée (pg_cron, voir
// docs/rappels-push.md). Lit les rappels échus, envoie une notification à
// chaque appareil abonné, puis marque l'occurrence comme envoyée.
//
// Sécurité : la fonction est appelée par une machine, pas par un utilisateur.
// Elle n'accepte donc pas de JWT mais un secret partagé (REMINDER_CRON_SECRET)
// dans l'en-tête `x-cron-secret`. Sans ce secret configuré, elle refuse de
// tourner plutôt que de s'ouvrir à tout le monde.
// -----------------------------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { collectDueRows, type ReminderRow } from "./due.ts";

/**
 * `web-push` est un paquet npm chargé par le runtime Deno de Supabase. Cette
 * compatibilité n'a pas pu être vérifiée avant déploiement (pas de Deno dans
 * l'environnement de développement utilisé). L'import est donc dynamique et
 * encapsulé : si le paquet ne se charge pas, la fonction répond une erreur
 * explicite au lieu de refuser de démarrer avec un message opaque.
 *
 * Repli si le chargement échoue en production : remplacer par un build esm.sh
 * (`https://esm.sh/web-push@3.6.7`), ou signer et chiffrer avec WebCrypto.
 */
async function loadWebPush() {
  try {
    const mod = await import("npm:web-push@3.6.7");
    return (mod.default ?? mod) as {
      setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
      sendNotification: (
        subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
        payload: string,
        options?: { TTL?: number }
      ) => Promise<unknown>;
    };
  } catch (e) {
    console.error("web-push import failed:", e);
    return null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface SubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("REMINDER_CRON_SECRET");
  if (!cronSecret) {
    // Pas de secret configuré : on refuse plutôt que d'exposer un déclencheur.
    return json({ error: "REMINDER_CRON_SECRET not configured" }, 503);
  }
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "Forbidden" }, 403);
  }

  const webpush = await loadWebPush();
  if (!webpush) {
    return json(
      {
        error:
          "web-push n'a pas pu être chargé par le runtime. Voir le commentaire " +
          "loadWebPush() dans cette fonction pour les solutions de repli.",
      },
      503
    );
  }

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@bio-flow.app";
  if (!vapidPublic || !vapidPrivate) {
    return json({ error: "VAPID keys not configured" }, 503);
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: reminders, error } = await admin
      .from("reminders")
      .select(
        "id, user_id, title, note, time, repeat, date, weekday, enabled, timezone, last_sent_key"
      )
      .eq("enabled", true);
    if (error) throw error;

    const now = new Date();
    const due = collectDueRows((reminders ?? []) as ReminderRow[], now);
    if (due.length === 0) return json({ ok: true, checked: reminders?.length ?? 0, sent: 0 });

    // Un seul aller-retour pour les abonnements des utilisateurs concernés.
    const userIds = [...new Set(due.map((d) => d.reminder.user_id))];
    const { data: subs, error: subErr } = await admin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth, failure_count")
      .in("user_id", userIds);
    if (subErr) throw subErr;

    const byUser = new Map<string, SubscriptionRow[]>();
    for (const s of (subs ?? []) as SubscriptionRow[]) {
      const list = byUser.get(s.user_id) ?? [];
      list.push(s);
      byUser.set(s.user_id, list);
    }

    let sent = 0;
    const staleSubscriptionIds: string[] = [];

    for (const { reminder, occurrenceKey } of due) {
      const targets = byUser.get(reminder.user_id) ?? [];
      if (targets.length === 0) continue;

      const payload = JSON.stringify({
        title: `⏰ ${reminder.title}`,
        body: reminder.note || `Rappel de ${reminder.time}`,
        tag: `reminder-${reminder.id}`,
        url: "/journal",
      });

      const results = await Promise.allSettled(
        targets.map((sub) =>
          webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            { TTL: 3600 }
          )
        )
      );

      let delivered = 0;
      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          delivered++;
          return;
        }
        const status = (result.reason as { statusCode?: number })?.statusCode;
        // 404/410 : l'abonnement n'existe plus côté navigateur (app
        // désinstallée, permission retirée). On le retire, il ne reviendra pas.
        if (status === 404 || status === 410) staleSubscriptionIds.push(targets[i].id);
        else console.error("push failed:", status, result.reason);
      });

      if (delivered === 0) continue;
      sent += delivered;

      // Marque l'occurrence comme traitée — c'est ce qui empêche le doublon
      // à la minute suivante. Un rappel ponctuel se désactive après envoi.
      const patch: Record<string, unknown> = {
        last_sent_key: occurrenceKey,
        last_sent_at: new Date().toISOString(),
      };
      if (reminder.repeat === "once") patch.enabled = false;

      const { error: updateErr } = await admin
        .from("reminders")
        .update(patch)
        .eq("id", reminder.id);
      if (updateErr) console.error("reminder update failed:", updateErr.message);
    }

    if (staleSubscriptionIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", staleSubscriptionIds);
    }

    return json({
      ok: true,
      checked: reminders?.length ?? 0,
      due: due.length,
      sent,
      pruned: staleSubscriptionIds.length,
    });
  } catch (e) {
    console.error("send-reminders error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
