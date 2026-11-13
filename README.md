# Cadence

Application personnelle de musculation, entièrement côté navigateur. Aucune donnée n'est envoyée à un serveur et aucun compte n'est nécessaire.

## Lancer l'application en local

Depuis ce dossier, démarre un serveur statique, par exemple :

```powershell
python -m http.server 4173
```

Puis ouvre `http://localhost:4173`. Les fichiers sont servis tels quels : aucun outil de compilation ou téléchargement de dépendances n'est nécessaire.

## Données et sauvegardes

Les séances, notes et préférences sont stockées dans `localStorage` sous la clé `cadence.training-data`. Le schéma v2 migre les données v1 en place et les sauvegardes JSON v1 restent importables. La séance en cours, l’étape d’échauffement, les performances saisies et le minuteur de repos sont sauvegardés progressivement. Les durées de repos conseillées varient selon l’exercice et restent réglables. Dans **Paramètres → Gestion des données**, exporte une sauvegarde JSON avant de changer d'appareil ou d'effacer les données du navigateur. Une restauration vérifie le type, la version et la structure du fichier, demande une confirmation, et conserve l'état précédent pour pouvoir revenir en arrière si l'écriture échoue.

Chaque navigateur et chaque appareil garde son propre stockage. Il faut donc transférer le fichier de sauvegarde pour déplacer les données.

## Historique, ressentis et graphiques

Dans **Historique**, ouvre une séance pour modifier sa date, son type, sa durée, ses notes, ses répétitions, ses charges ou les séries validées. Tu peux aussi la supprimer; un ressenti qui lui était associé est conservé dans le journal et devient indépendant. Le calendrier propose les flèches de mois, un sélecteur de mois, un retour à aujourd’hui et un filtre par journée. Dans **Journal**, les ressentis enregistrés peuvent être modifiés depuis leur fiche. Les points des graphiques affichent leur date et leur valeur au survol de la souris ou au clavier.

## GitHub Pages

Le workflow `.github/workflows/deploy.yml` publie les fichiers statiques à chaque push sur `main` et lors d'un déclenchement manuel. Active **Settings → Pages → Build and deployment → GitHub Actions** dans le dépôt. Les chemins relatifs (`./styles.css`, `./src/main.js`) fonctionnent aussi sous le sous-chemin du dépôt GitHub Pages.

## Architecture

- `index.html` : point d'entrée et métadonnées.
- `src/exercises.js` : bibliothèque, illustrations vectorielles, exercices et séances A/B.
- `src/storage.js` : migration du schéma v1 vers v2, validation et import/export local.
- `src/analytics.js` : progression et records par identifiant d’exercice, records battus et conseils prudents fondés sur les séries validées et le journal.
- `src/muscles.js` : carte avant/arrière sur 18 groupes, contributions indicatives, activité récente et comparaisons d’équilibre.
- `src/timer.js` : minuteur horodaté, réglable et persistant.
- `src/charts.js` : graphiques basés uniquement sur les séries validées.
- `src/main.js` : navigation, échauffement adapté à A/B, retour au calme avec minuteur facultatif, bilan avant/après séance, progression, records, historique, journal et paramètres.
- `styles.css` : interface responsive et thèmes sombre/clair.

Le projet utilise des modules JavaScript natifs et des SVG intégrés pour éviter une chaîne de dépendances et tout appel réseau au runtime. Les illustrations sont originales et locales; aucune photo tierce n’est chargée par l’application.

## Vérification

`npm test` lance les tests intégrés avec Node.js. Ils couvrent les migrations et sauvegardes v1, l’export/restauration, les records par exercice et par séance, les conseils sensibles aux douleurs, les filtres temporels, les séries validées de la carte musculaire, les calculs du minuteur et les graphiques.
