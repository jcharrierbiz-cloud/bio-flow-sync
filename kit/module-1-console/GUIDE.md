# Module 1 — Ma Console

Ta console personnelle : tâches, journée heure par heure, rappels, objectifs,
finances et notes. Un seul dossier, aucun compte, aucun abonnement. Tes données
restent sur ton appareil.

Compte 10 minutes pour l'installer sur ton téléphone, 2 minutes pour l'utiliser
tout de suite sur ton ordinateur.

---

## 1. Ce que tu as entre les mains

Le dossier `console` contient :

| Fichier | À quoi il sert |
| --- | --- |
| `index.html` | La console elle-même. C'est le seul fichier indispensable. |
| `manifest.webmanifest` | Le nom et l'icône quand tu l'installes sur ton téléphone. |
| `sw.js` | Ce qui permet à la console de s'ouvrir sans connexion. |
| `icon-*.png`, `icon.svg` | Les icônes. |

Ce que la console fait :

- **Tâches** : ce que tu fais aujourd'hui, avec une série de jours tenus et un bilan mensuel.
- **Journée** : ce que tu as réellement fait, heure par heure, et les rappels.
- **Objectifs** : chiffrés ou écrits, rangés en colonnes, avec un cap épinglé.
- **Finances** : entrées, sorties, solde du mois, regroupés par libellé.
- **Notes** : classées par dossier, avec recherche.

Ce qu'elle ne fait pas, pour que tu ne sois pas surpris :

- **Pas de synchronisation automatique.** Le téléphone et l'ordinateur ont chacun
  leur console. Tu passes de l'un à l'autre par un export (section 4).
- **Les rappels sonnent quand la console est ouverte**, au moins en arrière-plan.
  Fermée, elle ne se réveille pas toute seule : le rappel t'attend en haut de
  l'écran à la prochaine ouverture.
- **Pas de chiffrement.** Les notes « confidentielles » sont masquées à l'écran,
  pas chiffrées. N'y mets pas de mots de passe.

---

## 2. Option rapide : sur ton ordinateur (2 minutes)

1. Décompresse le fichier `.zip` que tu as téléchargé.
2. Range le dossier `console` à un endroit où il restera : `Documents`, par exemple.
   Pas dans `Téléchargements`, que l'on vide un jour ou l'autre.
3. Double-clique sur `index.html`. La console s'ouvre dans ton navigateur.
4. Ajoute la page à tes favoris pour la retrouver.

Important : tes données vivent **dans ce navigateur-là**. Si tu ouvres le même
fichier avec un autre navigateur, il sera vide. Choisis-en un et garde-le.

---

## 3. Option complète : sur ton téléphone, comme une vraie appli (10 minutes)

Un téléphone ne sait pas ouvrir proprement un fichier `index.html`. Il faut
donc mettre la console en ligne, gratuitement. Rassure-toi : ce que tu mets en
ligne est une console **vide**. Tes données ne quittent jamais ton téléphone.
Quelqu'un qui trouverait l'adresse verrait sa propre console, vide, jamais la tienne.

### 3.1 Mettre la console en ligne avec Netlify Drop

1. Sur ton ordinateur, va sur [app.netlify.com/drop](https://app.netlify.com/drop).
2. Glisse le dossier `console` entier dans la zone prévue.
3. Netlify te donne une adresse en `https://…netlify.app`.
4. **Crée ton compte gratuit (ou connecte-toi) quand Netlify te propose de garder le site.**
   Sans compte, le site est temporaire et finit par disparaître.
5. Dans les réglages du site, tu peux changer l'adresse : `ma-console-prenom.netlify.app`.

### 3.2 L'installer sur l'écran d'accueil

**iPhone (Safari)**

1. Ouvre l'adresse dans **Safari** (pas Chrome ni un autre navigateur).
2. Touche le bouton Partager (le carré avec une flèche vers le haut).
3. Choisis **Sur l'écran d'accueil**, puis **Ajouter**.
4. Ouvre la console **depuis l'icône**, toujours.

Pourquoi c'est important sur iPhone : Safari peut effacer les données d'un site
qu'on n'a pas visité depuis 7 jours. Selon WebKit, le moteur de Safari, une appli
posée sur l'écran d'accueil a son propre compteur, qui avance avec ton usage.
Ça ne remplace pas pour autant les sauvegardes (section 4).

**Android (Chrome)**

1. Ouvre l'adresse dans **Chrome**.
2. Touche le bouton **Installer l'application** en bas de la console, ou le menu ⋮
   puis **Installer l'application** (parfois « Ajouter à l'écran d'accueil »).
3. Ouvre la console depuis l'icône.

Une fois installée, la console s'ouvre même en mode avion.

### 3.3 Activer les rappels

Dans l'onglet **Journée**, touche **Autoriser les notifications**. Sur iPhone,
cela ne marche que si la console a été ouverte depuis l'icône de l'écran d'accueil.

---

## 4. Sauvegarder et changer d'appareil (3 minutes)

Tes données n'existent qu'à un seul endroit : le navigateur de ton appareil. Vider
le cache, passer en navigation privée ou changer de téléphone les fait disparaître.
**La sauvegarde est ta seule copie de secours.** La console te le rappelle si rien
n'a été exporté depuis 7 jours.

**Sauvegarder**

1. En bas de la console, touche **Exporter / sauvegarder**.
2. Touche **Télécharger le fichier** (un fichier `ma-console-AAAA-MM-JJ.json`),
   ou **Copier** puis colle le texte dans un e-mail que tu t'envoies.
3. Range ce fichier dans un endroit sûr : ton cloud, ta boîte mail.

**Restaurer, ou passer sur un autre appareil**

1. Sur l'autre appareil, ouvre la console.
2. Touche **Importer**, puis choisis le fichier ou colle le texte.
3. Confirme. Attention : l'import **remplace** ce qu'il y avait sur cet appareil.

Les deux consoles restent ensuite indépendantes : ce que tu saisis d'un côté
n'apparaît pas de l'autre.

Le bon rythme : une sauvegarde par semaine, le dimanche soir par exemple. Tu peux
même créer un rappel « Sauvegarder ma console » qui revient chaque semaine.

---

## 5. La personnaliser avec l'IA (bonus)

La console est un seul fichier lisible. Un assistant IA (Claude, ChatGPT…) peut
la modifier pour toi.

Avant toute modification :

1. **Exporte tes données** (section 4).
2. Garde une copie du dossier `console` d'origine.

Puis donne `index.html` à l'assistant avec une demande précise. Trois exemples :

> Voici le fichier de ma console personnelle. Change la couleur dorée des accents
> pour un bleu doux, sans rien modifier d'autre. Rends-moi le fichier complet.

> Dans l'onglet Finances, ajoute un champ « catégorie » (Logement, Courses,
> Transport, Loisirs, Autre) et affiche le total par catégorie du mois en cours.
> Les anciennes données doivent rester lisibles. Rends-moi le fichier complet.

> Renomme l'onglet « Journée » en « Mon agenda » et le titre « MA CONSOLE » en
> « [ton prénom] ». Ne touche à rien d'autre. Rends-moi le fichier complet.

Remplace ensuite `index.html` par la nouvelle version. Si tu l'as mise en ligne,
glisse à nouveau le dossier sur Netlify. Si quelque chose ne va plus, remets la
copie d'origine puis importe ta sauvegarde.

---

## 6. Dépannage

**Ma console est vide alors que j'avais des données.**
Tu l'as sans doute ouverte dans un autre navigateur, en navigation privée, ou
depuis une autre adresse. Reviens à celui d'avant, ou importe ta dernière sauvegarde.

**Le bouton « Installer l'application » n'apparaît pas.**
Sur iPhone, il n'existe pas : passe par Partager → Sur l'écran d'accueil. Sur
Android, utilise le menu ⋮ de Chrome. Sur ordinateur, ouvert comme simple
fichier, l'installation n'est pas possible : c'est normal.

**Un rappel n'a pas sonné.**
La console était fermée. Le rappel s'affiche en haut de la console, marqué en
retard, dès que tu la rouvres.

**Un message dit « Sauvegarde locale indisponible ».**
Ton navigateur bloque le stockage, souvent en navigation privée. Ouvre la
console dans une fenêtre normale.

---

## Licence

Ce module est pour ton usage personnel. Tu peux le modifier autant que tu veux.
Tu ne peux pas le revendre ni le redistribuer.
