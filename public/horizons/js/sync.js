/* Synchronisation entre appareils, par le même serveur Supabase que Bio-Flow
   et CALYRE (mêmes comptes), dans une table à part : public.horizons_state.

   Pas de SDK : deux points d'entrée REST suffisent. La clé ci-dessous est la
   clé publiable du projet — publique par construction. Ce qui protège le
   contenu, ce sont les règles RLS : chaque compte ne voit que sa propre ligne.

   Chaque écriture locale fait avancer une révision. On compare les deux côtés
   à la dernière révision commune : rien ne bouge si personne n'a changé, l'un
   est repris si l'autre seul a changé, et si les deux ont changé on demande.
   Rien n'est jamais écrasé sans accord ; la version écartée reste récupérable. */

import { S, normalize, replaceState, afterSave } from "./store.js";
import { deviceName, ago, esc } from "./util.js";
import { openSheet, closeSheet, toast, ask } from "./ui.js";

const SUPA_URL = "https://qiugyurwxmxjhsezysnn.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpdWd5dXJ3eG14amhzZXp5c25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTUxODIsImV4cCI6MjA4NjgzMTE4Mn0.VH2GUFCck1yV51it84au1iuqfUosxrCGaIqbWj-GqeQ";
const TABLE = "horizons_state";
const SKEY = "horizons-sync-v1";
export const DROPKEY = "horizons-version-ecartee";

let sync = { email: "", uid: "", access: "", refresh: "", exp: 0, baseRev: null, lastAt: "" };
export const status = { state: "off", msg: "" };
let busy = false, timer = null, listeners = [], applied = [];
export const onApplied = (f) => applied.push(f);
export const onStatus = (f) => listeners.push(f);
const emit = () => listeners.forEach((f) => f());

function store() { try { localStorage.setItem(SKEY, JSON.stringify(sync)); } catch (e) { /* indisponible */ } }
export function loadSync() {
  try {
    const s = JSON.parse(localStorage.getItem(SKEY) || "null");
    if (s && typeof s === "object") Object.assign(sync, s, { baseRev: typeof s.baseRev === "number" ? s.baseRev : null });
  } catch (e) { /* illisible */ }
  status.state = sync.refresh ? "idle" : "off";
  afterSave(schedule);
  window.addEventListener("online", () => { if (sync.refresh) syncNow(false); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && sync.refresh) syncNow(false); });
}
export const connected = () => !!sync.refresh;
export const account = () => sync.email;
export const lastAt = () => sync.lastAt;

function httpMsg(code, body) {
  body = body || "";
  if (code === 404 || body.includes("42P01")) return "table absente : la migration SQL n'est pas encore appliquée";
  if (code === 401) return "session expirée, reconnecte-toi";
  if (code === 403 || body.includes("42501")) return "refusé par les règles de sécurité";
  return "erreur " + code;
}
const isOffline = (e) => !navigator.onLine || /Failed to fetch|NetworkError|Load failed|network/i.test((e && e.message) || "");
const jsonOf = (r) => r.text().then((t) => { try { return JSON.parse(t); } catch (e) { return { raw: t }; } });

function refreshToken() {
  return fetch(SUPA_URL + "/auth/v1/token?grant_type=refresh_token", {
    method: "POST", headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: sync.refresh }),
  }).then((r) => jsonOf(r).then((j) => {
    if (!r.ok || !j.access_token) throw new Error("session expirée, reconnecte-toi");
    sync.access = j.access_token; sync.refresh = j.refresh_token || sync.refresh;
    sync.exp = Date.now() + (j.expires_in || 3600) * 1000; store();
  }));
}
function sfetch(path, opts, retried) {
  opts = opts || {};
  const h = Object.assign({ apikey: SUPA_KEY, "Content-Type": "application/json" }, opts.headers || {});
  if (sync.access) h.Authorization = "Bearer " + sync.access;
  opts.headers = h;
  return fetch(SUPA_URL + path, opts).then((r) => {
    if (r.status === 401 && sync.refresh && !retried) return refreshToken().then(() => sfetch(path, opts, true));
    return r;
  });
}
function auth(kind, email, pass) {
  const url = kind === "up" ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
  return fetch(SUPA_URL + url, {
    method: "POST", headers: { apikey: SUPA_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  }).then((r) => jsonOf(r).then((j) => {
    if (!r.ok) throw new Error(j.error_description || j.msg || j.message || (kind === "up" ? "création refusée" : "connexion refusée"));
    if (!j.access_token) { if (kind === "up") return "confirme"; throw new Error("connexion refusée"); }
    sync = { email, uid: (j.user && j.user.id) || "", access: j.access_token, refresh: j.refresh_token || "",
      exp: Date.now() + (j.expires_in || 3600) * 1000, baseRev: null, lastAt: "" };
    store(); status.state = "idle"; emit();
    return "connecte";
  }));
}
export function signOut() {
  sync = { email: "", uid: "", access: "", refresh: "", exp: 0, baseRev: null, lastAt: "" };
  try { localStorage.removeItem(SKEY); } catch (e) { /* indisponible */ }
  status.state = "off"; status.msg = ""; emit();
}

function pull() {
  return sfetch("/rest/v1/" + TABLE + "?select=data,rev,updated_at,device&user_id=eq." + encodeURIComponent(sync.uid), { method: "GET" })
    .then((r) => (r.ok ? r.json() : r.text().then((t) => { throw new Error(httpMsg(r.status, t)); })))
    .then((rows) => (rows && rows.length ? { exists: true, data: rows[0].data, rev: rows[0].rev || 0, at: rows[0].updated_at, device: rows[0].device } : { exists: false }));
}
function push() {
  return sfetch("/rest/v1/" + TABLE + "?on_conflict=user_id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: sync.uid, data: S.state, rev: S.state.rev || 0, device: deviceName() }),
  }).then((r) => {
    if (!r.ok) return r.text().then((t) => { throw new Error(httpMsg(r.status, t)); });
    sync.baseRev = S.state.rev || 0; sync.lastAt = new Date().toISOString(); store();
  });
}
function applyServer(srv) {
  try { localStorage.setItem(DROPKEY, JSON.stringify(S.state)); } catch (e) { /* indisponible */ }
  const data = Object.assign({}, srv.data || {}, { rev: srv.rev || 0 });
  replaceState(data, true);
  sync.baseRev = srv.rev || 0; sync.lastAt = new Date().toISOString(); store();
  applied.forEach((f) => setTimeout(f, 0));
}

export function syncNow(manual) {
  if (!sync.refresh) { if (manual) openSyncSheet(); return Promise.resolve(); }
  if (busy) return Promise.resolve();
  busy = true; status.state = "busy"; status.msg = ""; emit();
  return pull().then((srv) => {
    const localChanged = sync.baseRev === null || (S.state.rev || 0) !== sync.baseRev;
    if (!srv.exists) return push();
    /* Un appareil qui n'a encore rien écrit n'a rien à défendre : il prend le serveur. */
    if (!S.state.touchedAt) return applyServer(srv);
    const serverChanged = (srv.rev || 0) !== sync.baseRev;
    if (!localChanged && !serverChanged) return null;
    if (!localChanged) return applyServer(srv);
    if (!serverChanged) return push();
    openConflict(srv);
    return "conflit";
  }).then((r) => {
    busy = false;
    status.state = r === "conflit" ? "conflict" : "ok"; status.msg = ""; emit();
  }).catch((e) => {
    busy = false;
    status.state = isOffline(e) ? "offline" : "err"; status.msg = isOffline(e) ? "" : e.message || "échec"; emit();
  });
}
function schedule() {
  if (!sync.refresh) return;
  clearTimeout(timer);
  timer = setTimeout(() => syncNow(false), 4000);
}

function summarize(d) {
  d = d || {};
  const it = Array.isArray(d.items) ? d.items : [];
  return it.length + " éléments · " + (Array.isArray(d.boards) ? d.boards.length : 0) + " tableaux · " + (Array.isArray(d.spaces) ? d.spaces.length : 0) + " espaces";
}

export function openSyncSheet() {
  const body = openSheet("Synchronisation",
    '<p class="hint">Connecte-toi avec ton compte Bio-Flow (le même serveur que CALYRE). Horizons enverra alors son contenu sur ce serveur pour le retrouver sur tes autres appareils. Tant que tu ne te connectes pas, rien ne quitte cet appareil.</p>'
    + '<label class="f-row col"><span class="lbl">Adresse e-mail</span><input id="syEmail" type="email" autocomplete="username" value="' + esc(sync.email) + '" placeholder="toi@exemple.fr"></label>'
    + '<label class="f-row col"><span class="lbl">Mot de passe</span><input id="syPass" type="password" autocomplete="current-password"></label>'
    + '<div id="syMsg" class="hint" style="min-height:18px"></div>'
    + '<div class="f-acts"><button class="btn primary" data-sy="in">Se connecter</button><button class="btn ghost" data-sy="up">Créer un compte</button></div>', {});
  const go = (kind) => {
    const em = document.getElementById("syEmail").value.trim(), pw = document.getElementById("syPass").value;
    const msg = document.getElementById("syMsg");
    if (!em || !pw) { msg.textContent = "Il faut une adresse et un mot de passe."; return; }
    msg.textContent = "Connexion…";
    auth(kind, em, pw).then((r) => {
      if (r === "confirme") { msg.textContent = "Compte créé. Confirme l'adresse depuis l'e-mail reçu, puis reviens te connecter."; return; }
      closeSheet(); toast("Connecté — synchronisation en cours"); syncNow(true);
    }, (e) => { msg.textContent = e.message || "échec"; });
  };
  body.onclick = (e) => { const b = e.target.closest("[data-sy]"); if (b) go(b.dataset.sy); };
  body.onkeydown = (e) => { if (e.target.id === "syPass" && e.key === "Enter") go("in"); };
}

function openConflict(srv) {
  const body = openSheet("Deux versions",
    '<p class="hint">Les deux côtés ont changé depuis le dernier échange. Je ne choisis pas à ta place : la version écartée reste récupérable depuis les réglages.</p>'
    + '<div class="sides"><div><b>Cet appareil — ' + esc(deviceName()) + "</b><span>" + esc(summarize(S.state)) + "</span><small>modifié " + esc(ago(S.state.touchedAt)) + "</small></div>"
    + "<div><b>Le serveur" + (srv.device ? " — " + esc(srv.device) : "") + "</b><span>" + esc(summarize(srv.data)) + "</span><small>modifié " + esc(ago(srv.at)) + "</small></div></div>"
    + '<div class="f-acts"><button class="btn primary" data-c="local">Garder cet appareil</button><button class="btn ghost" data-c="server">Prendre le serveur</button></div>', { tone: "var(--danger)" });
  body.onclick = (e) => {
    const b = e.target.closest("[data-c]"); if (!b) return;
    if (b.dataset.c === "local") {
      try { localStorage.setItem(DROPKEY, JSON.stringify(srv.data || {})); } catch (err) { /* indisponible */ }
      push().then(() => { closeSheet(); status.state = "ok"; emit(); toast("Cet appareil fait foi"); },
        (err) => { status.state = "err"; status.msg = err.message || "échec"; emit(); });
    } else {
      applyServer(srv); closeSheet(); status.state = "ok"; emit(); toast("Version du serveur reprise");
    }
  };
}

export const hasDropped = () => { try { return !!localStorage.getItem(DROPKEY); } catch (e) { return false; } };
export async function restoreDropped() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DROPKEY) || "null"); } catch (e) { /* illisible */ }
  if (!d) { toast("Aucune version écartée."); return; }
  const ok = await ask("Remplacer le contenu actuel par la version écartée (" + summarize(d) + ") ?", [{ v: true, label: "Remplacer", kind: "danger" }]);
  if (!ok) return;
  replaceState(normalize(d), false);
  try { localStorage.removeItem(DROPKEY); } catch (e) { /* indisponible */ }
  toast("Version écartée restaurée");
}
