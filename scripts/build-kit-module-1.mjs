#!/usr/bin/env node
/**
 * Kit Zéro Abonnement — Construit le Module 1 « Ma Console » à partir de CALYRE.
 *
 *   node scripts/build-kit-module-1.mjs
 *
 * CALYRE (public/pilotage/) reste ta console personnelle. Ce script en tire
 * une copie neutre, vendable, dans kit/module-1-console/console/ :
 *   • la synchronisation Supabase est retirée — sinon chaque acheteur créerait
 *     un compte dans TON projet, et tu deviendrais responsable de ses données ;
 *   • la marque CALYRE devient « Ma Console » ;
 *   • un rappel de sauvegarde apparaît quand rien n'a été exporté depuis 7 jours,
 *     puisque le navigateur est désormais la seule copie des données.
 *
 * Chaque remplacement doit trouver son texte exactement une fois. Si CALYRE a
 * changé au point qu'un motif ne correspond plus, le script s'arrête et dit
 * lequel : mieux vaut un échec bruyant qu'un kit qui parle encore à ton serveur.
 *
 * Aucune dépendance : uniquement les modules fs et path de Node.
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public", "pilotage");
const out = join(root, "kit", "module-1-console", "console");

function once(text, from, to, label) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error(`« ${label} » : motif trouvé ${n} fois au lieu d'une.`);
  return text.replace(from, () => to);
}
function all(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`« ${label} » : motif introuvable.`);
  return text.split(from).join(to);
}
function between(text, start, end, to, label) {
  const a = text.indexOf(start);
  const b = text.indexOf(end, a + 1);
  if (a < 0 || b < 0 || text.indexOf(start, a + 1) >= 0) throw new Error(`« ${label} » : bornes introuvables ou ambiguës.`);
  return text.slice(0, a) + to + text.slice(b);
}

/* ── index.html ─────────────────────────────────────────── */
let html = readFileSync(join(src, "index.html"), "utf8");

html = once(html, `content="CALYRE — console de pilotage : tâches, objectifs, finances, notes."`,
  `content="Ma Console — tâches, journée, rappels, objectifs, finances et notes, sur ton appareil."`, "description");
html = once(html, `<meta name="apple-mobile-web-app-title" content="CALYRE">`, `<meta name="apple-mobile-web-app-title" content="Ma Console">`, "titre iOS");
html = once(html, `<meta name="application-name" content="CALYRE">`, `<meta name="application-name" content="Ma Console">`, "nom d'application");
html = once(html, `<title>CALYRE-pilotage</title>`, `<title>Ma Console</title>`, "titre");
html = once(html, `<span class="mark">CAL<b>Y</b>RE</span>`, `<span class="mark">MA <b>CONSOLE</b></span>`, "marque");
html = once(html, `var KEY = "calyre-pilotage-v1";`, `var KEY = "ma-console-v1";`, "clé de stockage");
html = all(html, `"calyre-probe"`, `"ma-console-probe"`, "sonde de stockage");
html = all(html, `"CALYRE — rappel"`, `"Ma Console — rappel"`, "titre des notifications");
html = once(html, `tag:"calyre-rappel"`, `tag:"ma-console-rappel"`, "étiquette des notifications");
html = once(html, `{calyreSheet:1}`, `{consoleSheet:1}`, "historique du panneau");
html = once(html, `"calyre-pilotage-"+TODAY+".json"`, `"ma-console-"+TODAY+".json"`, "nom du fichier exporté");
html = once(html, `ce n'est pas une sauvegarde CALYRE.`, `ce n'est pas une sauvegarde de la console.`, "message d'import");
html = once(html, `toast("CALYRE est sur ton écran d'accueil")`, `toast("Ta console est sur ton écran d'accueil")`, "message d'installation");

/* Synchronisation : tout le bloc part, il ne reste que les deux points d'appel, vides. */
html = between(html, "  /* ═══ Synchronisation ", "  /* ═══ Données ",
  `  /* ═══ Synchronisation ══════════════════════════════════ */
  /* Retirée de cette version : les données ne quittent jamais l'appareil.
     Pour passer d'un appareil à l'autre : « Exporter », puis « Importer ». */
  var applying = false;
  function scheduleSync(){}
  function renderSync(){}

`, "bloc de synchronisation");
html = once(html, `  <div class="syncBox" id="syncBox"></div>\n`, ``, "encart de synchronisation");
html = once(html, `    if(!confirm(sync.refresh
      ? "Confirmation : tout sera perdu ici ET sur le serveur à la prochaine synchronisation, sauf si tu as exporté."
      : "Confirmation : tout sera perdu, sauf si tu as exporté.")) return;`,
  `    if(!confirm("Confirmation : tout sera perdu, sauf si tu as exporté.")) return;`, "confirmation d'effacement");
html = once(html, `  syncLoad();\n  renderAll();\n  if(sync.refresh) syncNow(false);\n`, `  renderAll();\n`, "démarrage");
html = once(html, `    if(sync.refresh) syncNow(false);\n  });\n})();`, `  });\n})();`, "retour au premier plan");
if (/supabase|SUPA_|syncNow|sync\./.test(html)) throw new Error("Il reste une trace de la synchronisation dans la console.");

/* Rappel de sauvegarde : sans serveur, l'export est la seule copie hors du navigateur. */
html = once(html, `$("storageAlert").innerHTML = storageOK ? "" :`, `$("storageAlert").innerHTML = storageOK ? backupNudge() :`, "alerte de stockage");
html = once(html, `  $("exp").onclick = function(){`, `  function backupNudge(){
    var filled = state.tasks.length + state.goals.length + state.tx.length + state.notes.length
      + state.reminders.length + Object.keys(state.journal).length;
    var last = state.settings.lastExport || "", gap = last ? -daysTo(last) : null;
    if(filled < 5 || (gap !== null && gap < 7)) return "";
    return '<div class="alert"><b>' + (gap === null ? "Aucune sauvegarde pour l'instant." : "Dernière sauvegarde il y a " + gap + " jours.") + '</b> '
      + "Tes données vivent seulement dans ce navigateur : vider le cache ou changer d'appareil les fait disparaître."
      + '<div class="row" style="margin-top:10px;margin-bottom:0"><button class="ghost" data-act="backup" style="flex:1">Exporter maintenant</button></div></div>';
  }
  function markBackup(){ state.settings.lastExport = TODAY; save(); renderAlert(); }
  $("storageAlert").addEventListener("click", function(e){
    if(e.target.closest('[data-act="backup"]')) $("exp").onclick();
  });
  $("exp").onclick = function(){`, "rappel de sauvegarde");
html = once(html, `      if(b.dataset.act==="copy"){`, `      if(b.dataset.act==="copy" || b.dataset.act==="dl") markBackup();
      if(b.dataset.act==="copy"){`, "date de la dernière sauvegarde");
if (/calyre/i.test(html)) throw new Error("Il reste une mention de CALYRE dans la console.");

/* ── manifest et service worker ─────────────────────────── */
const manifest = JSON.parse(readFileSync(join(src, "manifest.webmanifest"), "utf8"));
Object.assign(manifest, {
  name: "Ma Console",
  short_name: "Ma Console",
  description: "Tâches, journée, rappels, objectifs, finances et notes, sur ton appareil.",
  id: "ma-console",
});

let sw = readFileSync(join(src, "sw.js"), "utf8");
sw = once(sw, `/* CALYRE — service worker`, `/* Ma Console — service worker`, "en-tête du service worker");
sw = sw.replace(/var VERSION = "calyre-[^"]*";/, () => `var VERSION = "ma-console-1";`);
sw = once(sw, `list[i].url.indexOf("/pilotage/")>=0`, `list[i].url.indexOf(self.registration.scope)===0`, "retour sur la console");
if (/calyre|pilotage/i.test(sw)) throw new Error("Il reste une mention de CALYRE dans le service worker.");

/* ── écriture ───────────────────────────────────────────── */
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "index.html"), html);
writeFileSync(join(out, "manifest.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(join(out, "sw.js"), sw);
for (const icon of ["icon.svg", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"]) {
  copyFileSync(join(src, icon), join(out, icon));
}
console.log(`Module 1 écrit dans ${out}`);
