// src/lib/push.ts
// -----------------------------------------------------------------------------
// Bio-Flow — Notifications qui arrivent application fermée (Web Push).
//
// Chaîne complète :
//   navigateur → abonnement push → table `push_subscriptions`
//   pg_cron (chaque minute) → fonction `send-reminders` → service worker
//
// Sans cette chaîne, un rappel ne peut se déclencher que pendant que l'onglet
// est ouvert. C'est la limite que ce module lève.
//
// Contraintes réelles à ne pas cacher à l'utilisateur :
//   • iPhone / iPad : rien ne fonctionne tant que Bio-Flow n'est pas installé
//     sur l'écran d'accueil (« Partager » → « Sur l'écran d'accueil »),
//     iOS 16.4 minimum.
//   • Un refus de permission est définitif tant qu'il n'est pas levé dans les
//     réglages du navigateur : on l'affiche au lieu de redemander en boucle.
// -----------------------------------------------------------------------------

import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushState =
  | "unsupported"      // navigateur sans service worker / push
  | "needs-install"    // iOS hors écran d'accueil : impossible d'aller plus loin
  | "not-configured"   // clé VAPID absente du build
  | "denied"           // permission refusée dans le navigateur
  | "off"              // possible, pas encore activé
  | "on";              // abonné, le serveur peut nous joindre

/** Le fuseau de l'appareil : le serveur en a besoin pour savoir quand « 18:00 » tombe. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
  } catch {
    return "Europe/Paris";
  }
}

/** L'app tourne-t-elle depuis l'écran d'accueil (mode autonome) ? */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS se présente comme un Mac, mais avec un écran tactile.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Enregistre le service worker. Sans effet si le navigateur n'en gère pas. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (e) {
    console.error("service worker registration failed:", e);
    return null;
  }
}

/** État courant, sans rien demander à l'utilisateur. */
export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) {
    // Sur iPhone, l'absence de support disparaît une fois l'app installée.
    return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  if (Notification.permission === "denied") return "denied";

  try {
    // `getRegistration()` répond tout de suite, y compris « aucun ».
    // `ready`, lui, ne se résout JAMAIS tant qu'aucun service worker n'est
    // enregistré : l'utiliser ici rendait la carte d'état invisible quand
    // l'enregistrement échouait — le pire cas, puisqu'il n'affiche alors
    // aucune explication.
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return "off";
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? "on" : "off";
  } catch {
    return "off";
  }
}

/** `serviceWorker.ready`, mais qui abandonne au lieu d'attendre indéfiniment. */
async function readyWithTimeout(ms = 5000): Promise<ServiceWorkerRegistration | null> {
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  } catch {
    return null;
  }
}

/** base64url (format VAPID) → Uint8Array, ce qu'attend pushManager.subscribe. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function keyToBase64(subscription: PushSubscription, name: "p256dh" | "auth"): string {
  const key = subscription.getKey(name);
  if (!key) return "";
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

/** Enregistre (ou rafraîchit) l'abonnement de cet appareil côté serveur. */
async function saveSubscription(subscription: PushSubscription): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) return false;

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: keyToBase64(subscription, "p256dh"),
      auth: keyToBase64(subscription, "auth"),
      user_agent: navigator.userAgent.slice(0, 300),
      timezone: deviceTimezone(),
      failure_count: 0,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    console.error("push subscription save failed:", error.message);
    return false;
  }
  return true;
}

export interface EnableResult {
  ok: boolean;
  state: PushState;
  /** Message prêt à afficher quand ça n'a pas marché. */
  reason?: string;
}

/** Demande la permission puis abonne l'appareil. À appeler depuis un clic. */
export async function enablePush(): Promise<EnableResult> {
  if (!isPushSupported()) {
    return isIOS() && !isStandalone()
      ? {
          ok: false,
          state: "needs-install",
          reason:
            "Sur iPhone, installe d'abord Bio-Flow : Partager → « Sur l'écran d'accueil », puis rouvre l'app depuis l'icône.",
        }
      : { ok: false, state: "unsupported", reason: "Ce navigateur ne gère pas les notifications push." };
  }

  if (!VAPID_PUBLIC_KEY) {
    return {
      ok: false,
      state: "not-configured",
      reason: "Clé publique VAPID absente du déploiement (VITE_VAPID_PUBLIC_KEY).",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      state: permission === "denied" ? "denied" : "off",
      reason: "Notifications refusées par le navigateur.",
    };
  }

  try {
    const registration = (await registerServiceWorker()) ?? (await readyWithTimeout());
    if (!registration) {
      return {
        ok: false,
        state: "off",
        reason: "Service worker indisponible : impossible de s'abonner.",
      };
    }
    // On attend qu'un worker soit actif, mais sans bloquer pour toujours.
    if (!registration.active) await readyWithTimeout();

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const saved = await saveSubscription(subscription);
    return saved
      ? { ok: true, state: "on" }
      : { ok: false, state: "off", reason: "Abonnement créé mais non enregistré sur le compte." };
  } catch (e) {
    console.error("enablePush failed:", e);
    return {
      ok: false,
      state: "off",
      reason: e instanceof Error ? e.message : "Abonnement impossible.",
    };
  }
}

/** Désabonne cet appareil, côté navigateur et côté serveur. */
export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  } catch (e) {
    console.error("disablePush failed:", e);
  }
}

/**
 * Réenregistre l'abonnement si le navigateur l'a renouvelé de son côté
 * (`pushsubscriptionchange`), et rafraîchit le fuseau à chaque ouverture —
 * un déplacement à l'étranger ne doit pas décaler les rappels.
 */
export async function refreshPushSubscription(): Promise<void> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return;
  if (Notification.permission !== "granted") return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await saveSubscription(subscription);
  } catch {
    /* silencieux : ce n'est qu'un rafraîchissement opportuniste */
  }
}
