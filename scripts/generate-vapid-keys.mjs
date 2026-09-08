#!/usr/bin/env node
/**
 * Bio-Flow — Génère une paire de clés VAPID pour les notifications push.
 *
 *   node scripts/generate-vapid-keys.mjs
 *
 * VAPID identifie le serveur auprès des services de push (Google, Apple,
 * Mozilla). La paire est générée une seule fois pour l'application :
 *   • la clé PUBLIQUE part dans le build du site (VITE_VAPID_PUBLIC_KEY) ;
 *   • la clé PRIVÉE reste un secret Supabase (VAPID_PRIVATE_KEY) et ne doit
 *     jamais être commitée.
 *
 * Changer de paire invalide tous les abonnements existants : chaque appareil
 * devra réactiver ses notifications. À ne faire qu'en cas de fuite.
 *
 * Aucune dépendance : uniquement le module crypto de Node.
 */

import { generateKeyPairSync } from "node:crypto";

/** Base64 standard → base64url, sans remplissage (format attendu par VAPID). */
function toBase64Url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });

// Passage par JWK : `x`, `y` et `d` y sont déjà en base64url, ce qui évite de
// découper du DER à coups de décalages d'octets — fragile et illisible.
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });

const fromBase64Url = (value) => Buffer.from(value, "base64url");
const x = fromBase64Url(pub.x);
const y = fromBase64Url(pub.y);
const d = fromBase64Url(priv.d);

if (x.length !== 32 || y.length !== 32 || d.length !== 32) {
  console.error("Longueur de clé inattendue — ne pas utiliser ce résultat.");
  process.exit(1);
}

// Clé publique au format « raw » non compressé : 0x04 || X || Y (65 octets).
const publicRaw = Buffer.concat([Buffer.from([0x04]), x, y]);

console.log(`
Paire VAPID générée. Garde la clé privée secrète.

  Clé publique  (VITE_VAPID_PUBLIC_KEY, va dans le build du site) :
  ${toBase64Url(publicRaw)}

  Clé privée    (VAPID_PRIVATE_KEY, secret Supabase, jamais dans le dépôt) :
  ${toBase64Url(d)}

Étapes suivantes : voir docs/rappels-push.md
`);
