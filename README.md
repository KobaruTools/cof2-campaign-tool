# cof2-character-editor

Éditeur / simulateur de personnage pour **Chroniques Oubliées Fantasy 2e édition (CO2)**, pour une table de jeu privée. Application 100 % client (Next.js, App Router) — pas de backend en phase 1.

Voir `PRD.md` pour le périmètre, les décisions de design et le plan de jalons.

## Démarrage

```bash
npm install
npm run dev
```

Puis ouvrir [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js (App Router) + TypeScript strict
- zustand (`persist` / localStorage) pour les personnages
- MUI pour l'interface

## Note sur les données de règles

Les données de règles sont extraites du livre de base CO2 (PDF non versionné — voir `.gitignore`) et vivent dans `src/data/`, avec référence de page source. Usage privé de table uniquement.
