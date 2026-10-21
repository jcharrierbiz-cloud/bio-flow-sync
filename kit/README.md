# Kit Zéro Abonnement

Des outils du quotidien que l'acheteur possède : un dossier, hors ligne, données
sur son appareil. Ce dossier ne fait pas partie de l'application Bio-Flow :
Vite ne le compile pas et Lovable ne le publie pas.

| Dossier | Contenu |
| --- | --- |
| `module-1-console/console/` | « Ma Console », générée depuis CALYRE (`public/pilotage/`). Ne pas modifier à la main. |
| `module-1-console/GUIDE.md` | Le guide de l'acheteur : installation, sauvegarde, personnalisation, dépannage. |
| `module-1-console/guide-style.html` | La mise en forme du guide quand il est converti en page. |

## Régénérer le Module 1 après une évolution de CALYRE

```sh
node scripts/build-kit-module-1.mjs
```

Le script retire la synchronisation Supabase et la marque CALYRE, puis ajoute le
rappel de sauvegarde. S'il s'arrête sur « motif trouvé 0 fois », c'est que CALYRE
a changé à cet endroit : adapte le motif dans le script, ne contourne pas l'arrêt.
C'est lui qui garantit qu'aucun acheteur ne se connecte à ton projet Supabase.

## Fabriquer le fichier livré à l'acheteur

```sh
cd kit/module-1-console
pandoc GUIDE.md -s -f gfm -t html5 --metadata title="Ma Console — guide" \
  -H guide-style.html -o /tmp/GUIDE.html
mkdir -p "/tmp/pack/Ma Console — Module 1"
cp -r console "/tmp/pack/Ma Console — Module 1/"
cp /tmp/GUIDE.html "/tmp/pack/Ma Console — Module 1/"
(cd /tmp/pack && zip -qr ../ma-console-module-1.zip "Ma Console — Module 1")
```

Puis dépose `ma-console-module-1.zip` dans la leçon « Télécharger le Module 1 »
de l'espace membre TinyPages. L'envoi de fichiers ne passe que par le tableau de bord.

## Avant d'ouvrir la vente

- [ ] 3 personnes non techniques installent la console sur leur téléphone avec le
      guide seul, sans ton aide. Note où chacune bloque et corrige le guide.
- [ ] Refaire toi-même le parcours Netlify Drop du guide (section 3.1) : je n'ai
      pas pu vérifier l'écran actuel de Netlify depuis la session où le guide a été écrit.
- [ ] Ouvrir la console installée en mode avion sur un iPhone et sur un Android.
