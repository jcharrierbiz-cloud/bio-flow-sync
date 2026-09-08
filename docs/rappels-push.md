# Rappels qui sonnent application fermée

Ce document décrit les **cinq étapes que Claude ne peut pas faire à ta place** :
elles demandent l'accès à ton projet Supabase (secrets, déploiement, tâche
planifiée). Tant qu'elles ne sont pas faites, l'application reste dans son
comportement précédent — les rappels se déclenchent pendant que Bio-Flow est
ouvert, et l'écran Rappels affiche « pas encore configuré » au lieu de faire
croire à une alarme fiable.

## Pourquoi c'est nécessaire

Un site web ne peut pas se réveiller tout seul. Pour qu'un rappel arrive alors
que l'application est fermée, il faut :

```
navigateur                Supabase                        service de push
    │                        │                          (Google / Apple / Mozilla)
    │ 1. s'abonne ───────────▶ push_subscriptions                │
    │                        │                                    │
    │                   pg_cron (chaque minute)                   │
    │                        │                                    │
    │                        ▼                                    │
    │                 send-reminders ──── notification signée ────▶│
    │                        │                                    │
    │◀────────────── le service worker affiche la notification ───┘
```

Trois pièces sont déjà dans le dépôt : la migration
(`supabase/migrations/…_reminders_and_push.sql`), la fonction
(`supabase/functions/send-reminders/`) et le service worker (`public/sw.js`).
Il manque leur application, les clés et le déclencheur.

---

## 0. Appliquer la migration

Les tables `reminders` et `push_subscriptions` doivent exister avant tout le
reste. **Ne compte pas sur l'intégration GitHub de Supabase pour le faire :**
sur la PR qui a introduit ces fichiers, le contrôle « Supabase Preview » a
répondu *« This git branch is not associated with any Supabase Branch »*, et il
pointe vers un projet (`ahmhqinkrbtubpkxnoql`) **différent** de celui que
l'application utilise (`qiugyurwxmxjhsezysnn`, cf. `.env` et
`supabase/config.toml`). Autrement dit : rien ne garantit que la migration soit
appliquée automatiquement au bon projet.

Applique-la explicitement, au choix :

```bash
supabase link --project-ref qiugyurwxmxjhsezysnn
supabase db push
```

ou bien colle le contenu de
`supabase/migrations/20260908060000_reminders_and_push.sql` dans l'éditeur SQL
du projet, une fois.

Pour vérifier que c'est fait : la console du navigateur n'affiche plus
« table `reminders` absente ». Tant qu'elle l'affiche, les rappels restent sur
l'appareil et ne peuvent pas être envoyés par le serveur.

---

## 1. Générer la paire de clés VAPID

VAPID identifie ton serveur auprès des services de push. Une seule paire pour
toute l'application.

```bash
node scripts/generate-vapid-keys.mjs
```

Le script affiche deux valeurs. **La clé privée ne doit jamais être commitée.**

> Changer de paire plus tard invalide tous les abonnements : chaque appareil
> devra réactiver ses notifications. À ne refaire qu'en cas de fuite.

## 2. Poser la clé publique dans le build du site

Dans `.env` (et dans les variables d'environnement de ton hébergement, Lovable
compris) :

```
VITE_VAPID_PUBLIC_KEY=<la clé publique affichée par le script>
```

C'est une clé publique : elle part dans le JavaScript envoyé au navigateur,
c'est normal et sans risque.

## 3. Poser les secrets et déployer la fonction

```bash
# Secrets côté serveur — jamais dans le dépôt
supabase secrets set VAPID_PUBLIC_KEY="<clé publique>"
supabase secrets set VAPID_PRIVATE_KEY="<clé privée>"
supabase secrets set VAPID_SUBJECT="mailto:ton-email@exemple.fr"

# Secret partagé qui protège le déclencheur (invente une longue chaîne aléatoire)
supabase secrets set REMINDER_CRON_SECRET="$(openssl rand -hex 32)"

supabase functions deploy send-reminders
```

La fonction refuse de tourner si `REMINDER_CRON_SECRET` n'est pas défini : sans
lui, n'importe qui pourrait déclencher des envois.

## 4. Planifier l'appel, chaque minute

Dans l'éditeur SQL de Supabase, une fois :

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'bioflow-send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', '<REMINDER_CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

Remplace `<project-ref>` et `<REMINDER_CRON_SECRET>` par tes valeurs.

Pour arrêter : `select cron.unschedule('bioflow-send-reminders');`

---

## Vérifier que ça marche

1. Ouvre Bio-Flow → onglet **Journal** → **Rappels**. La carte du haut doit
   afficher « Rappels actifs, application fermée comprise » après avoir cliqué
   sur **Activer**.
2. Crée un rappel pour dans deux minutes.
3. **Ferme complètement l'application** (pas seulement l'onglet en arrière-plan).
4. La notification doit arriver à l'heure dite, à une minute près.

En cas de silence, regarde les journaux de la fonction :

```bash
supabase functions logs send-reminders
```

La fonction renvoie un décompte à chaque appel :
`{ ok: true, checked: 12, due: 1, sent: 1, pruned: 0 }`.

## Limites qui subsistent, quoi qu'on fasse

| Plateforme | Rappel application fermée |
|---|---|
| Android — Chrome, Edge, Firefox | ✅ oui |
| Ordinateur — Chrome, Edge, Firefox | ✅ oui, si le navigateur tourne |
| **iPhone / iPad** | ⚠️ seulement si Bio-Flow est **installé sur l'écran d'accueil** (Partager → « Sur l'écran d'accueil »), iOS 16.4 minimum |
| Navigateur en navigation privée | ❌ non |

- La précision est celle de la tâche planifiée : **à la minute près**, pas à la
  seconde.
- Si la tâche planifiée ne tourne pas pendant un moment, les occurrences de plus
  de 15 minutes ne sont pas rattrapées — mieux vaut un rappel manqué qu'une
  notification de 8 h qui arrive à midi. Ce délai est le `graceMinutes` de
  `supabase/functions/send-reminders/due.ts`.
- Un abonnement mort (application désinstallée, permission retirée) est supprimé
  automatiquement à la première erreur 404/410 du service de push.

## Ce qui a été vérifié avant tout déploiement

| Maillon | Vérification | État |
|---|---|---|
| Logique de décision (quel rappel, quand) | `src/test/sendReminders.test.ts` — fuseaux, occurrences, anti-doublon ; identique sous `TZ=UTC`, `Europe/Paris`, `America/Los_Angeles` | ✅ |
| Clés VAPID du script | Acceptées par `web-push` : 87 caractères pour la publique (65 octets, préfixe `0x04`), 43 pour la privée | ✅ |
| Construction de l'envoi | `generateRequestDetails` avec les mêmes arguments que la fonction : en-tête `Authorization: vapid` contenant la clé publique, `Content-Encoding: aes128gcm`, `TTL: 3600`, charge chiffrée (196 octets pour 93 octets en clair) | ✅ |
| Réception par le service worker | Notification push réelle livrée à `public/sw.js` via le protocole DevTools, puis relecture de ce qui a été affiché : titre, corps, `tag`, `data.url` et icône corrects ; repli correct sur charge illisible et sur charge vide | ✅ |
| Service worker enregistré et actif, manifeste, page hors ligne | Sur le build de production, avec une vraie coupure de serveur | ✅ |

### Ce qui reste non vérifié, et pourquoi

- **Le dialogue réseau avec le service de push** (Google, Apple, Mozilla) : il
  demande un endpoint d'abonnement réel. Seul le test manuel ci-dessus le couvre.
- **La compatibilité de `npm:web-push` avec le runtime Deno de Supabase** : Deno
  n'était pas installable dans l'environnement de développement (`deno.land`
  bloqué). L'import est donc dynamique et encapsulé : en cas d'échec, la
  fonction répond `503` avec un message explicite plutôt que de refuser de
  démarrer. Repli documenté dans `loadWebPush()`.
- **Le clic sur la notification** (mise au premier plan, ouverture de
  `/journal`) : aucun moyen de simuler un clic système hors d'un vrai appareil.
