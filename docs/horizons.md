# Horizons — planifier du jour à la vie

Application autonome, séparée de Bio-Flow et de CALYRE, qui reprend le
fonctionnement de Timestripe : des objectifs posés à chaque échelle de temps et
reliés entre eux. Elle se trouve dans `public/horizons/` ; une fois le site
publié, elle s'ouvre à l'adresse `/horizons/` et s'installe comme une
application (téléphone et ordinateur). Elle fonctionne hors connexion.

Aucune dépendance, aucune étape de compilation : du HTML, du CSS et des modules
JavaScript servis tels quels.

## Ce qu'elle fait

| Fonction | Dans Horizons |
|---|---|
| Horizons | Jour, semaine (ISO), mois, trimestre, année, décennie, vie. Vue « Ensemble » (une colonne par horizon, chacune navigable dans le temps, repliable) et vue « bande » (un horizon, ses périodes à la suite). |
| Objectifs liés | Un élément se rattache à un élément d'un horizon plus large qui couvre sa période ; le parent affiche « faits / total » et transmet sa couleur. |
| Sous-objectifs | Imbriqués sous n'importe quel élément, repliables. |
| Report automatique | Ce qui n'est pas fait glisse dans la période en cours (réglable). Les séries et les étapes d'ascension restent à leur date. |
| Tâches récurrentes | Chaque jour / tous les N jours, jours ouvrés, certains jours de la semaine, chaque mois, chaque année ; pour les autres horizons, chaque période. Une occurrence se coche, se déplace, se détache ou se passe. |
| Notes | Markdown : titres, gras, italique, code, citations, listes, cases à cocher, liens. |
| Étiquettes | `#étiquette` dans un titre ; filtre et recherche. |
| Espaces | Personnel, Travail… : chacun a ses horizons et ses tableaux. |
| Tableaux | Listes hors du temps, en colonnes ou en liste, listes repliables. Un élément peut être à la fois dans un tableau et dans un horizon. |
| Calendrier | Vue du mois, glisser d'un jour à l'autre ; sur téléphone, pastilles et liste du jour choisi. |
| Blocs de temps | Grille horaire d'une journée : glisser sur une heure, tirer pour la durée, toucher une plage pour créer. |
| Ascensions | Programmes guidés (8 fournis) et programmes personnels ; une étape par jour posée dans les horizons. |
| Progrès | Faits du jour, de la semaine, du mois, série, tenue sur 30 jours, 12 dernières semaines, objectifs suivis, étiquettes. |
| Rappels | Notification à l'heure choisie tant que l'application est ouverte ; sinon bandeau à la réouverture. |
| Clavier | N nouvel élément, / ou Ctrl K recherche, H C J A P I pour naviguer, T aujourd'hui, ← →, 0 – 7, ? aide. |
| Données | Export, import, tout effacer — chaque fois avec annulation. Thème clair, sombre ou système. |

### Ce qui n'y est pas, et pourquoi

- **Partage et collaboration en temps réel** (tableaux publics, page d'équipe) :
  il faudrait un vrai serveur multi-utilisateur, au-delà du document unique
  synchronisé.
- **Connexion à Google Agenda**, **extension Chrome**, **widgets** : chacun
  demande une intégration externe (OAuth Google, magasin d'extensions,
  application native).
- **Rappels quand l'application est fermée** : il faudrait des notifications
  push côté serveur, comme celles de Bio-Flow.
- **Le contenu des Climbs de Timestripe** : les ascensions fournies ici sont
  écrites pour l'occasion.
- **L'apparence exacte de Timestripe** : la mise en page suit son principe
  (colonnes par horizon), pas sa charte graphique.

## Synchronisation entre appareils

Mêmes comptes que Bio-Flow et CALYRE, table séparée : `public.horizons_state`.
Avant la première connexion, appliquer la migration
`supabase/migrations/20261029120000_horizons_state.sql` (la chaîne de
déploiement le fait, ou la coller dans l'éditeur SQL : elle est idempotente).
Tant qu'elle n'est pas appliquée, l'application le dit (« table absente ») et
continue de fonctionner sur l'appareil.

Règles : rien ne quitte l'appareil sans connexion ; si les deux côtés ont
changé, l'application demande lequel garder et conserve l'autre, récupérable
depuis les réglages ; un appareil neuf prend le serveur sans demander. Les
choix d'affichage (vue, colonnes repliées, thème, espace courant) et l'état
« rappel déjà sonné » restent propres à chaque appareil : ils ne créent jamais
de conflit.
