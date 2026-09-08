/* Bio-Flow — Service worker.
 *
 * Deux rôles, volontairement limités :
 *   1. Recevoir les notifications Web Push envoyées par la fonction
 *      `send-reminders`, y compris quand l'application est fermée.
 *   2. Rendre Bio-Flow installable (nécessaire sur iPhone : sans installation
 *      sur l'écran d'accueil, iOS n'autorise aucune notification web).
 *
 * Ce qu'il ne fait PAS : mettre le JavaScript et le CSS en cache. Sur une
 * application déployée en continu, un cache d'assets mal invalidé sert une
 * version périmée pendant des jours — un bug bien pire que l'absence de mode
 * hors ligne. Seule une page de repli minimale est mise en cache.
 */

const OFFLINE_CACHE = "bioflow-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord, repli hors ligne uniquement pour la navigation.
// Aucune réponse n'est mise en cache : l'app reste toujours à jour.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Bio-Flow", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Bio-Flow";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: payload.tag || "bioflow",
      renotify: true,
      data: { url: payload.url || "/journal" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/journal";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // Une fenêtre Bio-Flow est déjà ouverte : on la remet au premier plan
      // plutôt que d'en ouvrir une deuxième.
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// Le navigateur peut renouveler l'abonnement de lui-même : on prévient les
// onglets ouverts pour qu'ils le réenregistrent côté serveur.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true }).then((list) => {
      list.forEach((client) => client.postMessage({ type: "push-subscription-change" }));
    })
  );
});
