/* CALYRE — service worker : l'application reste ouvrable hors connexion. */
"use strict";

var VERSION = "calyre-2026-09-09-1";
var CORE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./icon-180.png", "./icon.svg"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(VERSION)
      .then(function(c){ return c.addAll(CORE); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return k===VERSION ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;

  /* La page elle-même : réseau d'abord, pour recevoir les mises à jour ;
     cache en secours, pour fonctionner sans connexion. */
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(function(r){
        var copy = r.clone();
        caches.open(VERSION).then(function(c){ c.put("./index.html", copy); });
        return r;
      }).catch(function(){
        return caches.match("./index.html").then(function(m){ return m || caches.match("./"); });
      })
    );
    return;
  }

  var url;
  try{ url = new URL(req.url); }catch(err){ return; }

  /* Polices : cache d'abord, elles ne changent jamais. */
  if(url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"){
    e.respondWith(
      caches.match(req).then(function(m){
        return m || fetch(req).then(function(r){
          var copy = r.clone();
          caches.open(VERSION).then(function(c){ c.put(req, copy); });
          return r;
        }).catch(function(){ return m; });
      })
    );
    return;
  }

  if(url.origin === self.location.origin){
    e.respondWith(caches.match(req).then(function(m){ return m || fetch(req); }));
  }
});

/* Une notification touchée ramène sur la console plutôt que d'ouvrir un doublon. */
self.addEventListener("notificationclick", function(e){
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type:"window", includeUncontrolled:true }).then(function(list){
      for(var i=0;i<list.length;i++){
        if(list[i].url.indexOf("/pilotage/")>=0 && "focus" in list[i]) return list[i].focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow("./index.html");
    })
  );
});
