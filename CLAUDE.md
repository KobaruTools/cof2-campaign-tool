@AGENTS.md

# cof2-character-editor

Éditeur/simulateur de personnage pour le JDR **Chroniques Oubliées Fantasy 2e édition (CO2)**, en français, pour une table de jeu privée.

**Lire `PRD.md` avant toute implémentation** — il contient toutes les décisions validées, le périmètre, le plan de jalons et les critères d'acceptation.

## Points critiques

- **Source de règles unique** : `CBHS_06_Chroniques_Oubliees_2_web_v2.pdf` (livre de base CO2, ~358 pages, à la racine de ce dossier).
- **`[COF2_40]--Le-Compagnon_web_v0b.pdf` est HORS SCOPE** : ne pas l'ouvrir, ne pas en extraire de données, sauf demande explicite de l'utilisateur.
- Les deux PDF ne doivent jamais entrer dans le bundle ni dans git.
- Ordre d'implémentation imposé : schéma de données → extraction exhaustive du PDF (validée par l'utilisateur) → moteur de calcul testé → UI. Pas d'UI avant des données validées.
- Stack : Next.js (App Router) + TypeScript strict + zustand (persist/localStorage) + MUI. 100% client en phase 1, pas d'API, pas de backend. Supabase prévu en phase 2 seulement.
- Caractéristiques : saisie libre uniquement (les dés sont lancés en vrai à la table — aucune génération simulée).
- Wizard bloquant (création + montée de niveau) ; fiche éditable permissive avec avertissements non bloquants.
- Ne jamais deviner une règle de CO2 : toute donnée vient du PDF avec sa page source (`sourcePage`) ; en cas de doute, marquer `TODO(extraction)` et demander.
- Caractéristiques (PRD décision #13) : SCORE saisi (-10 à +10) → MODIFICATEUR calculé (1→+0, 6→+3, 10→+5). La progression modifie le score ; les formules consomment le modificateur. Le livre, lui, exprime directement des « valeurs » (= modificateurs).

## Lire le PDF

L'outil Read ne voit pas poppler (PATH figé) : rendre les pages en PNG puis lire les images.
`pdftoppm -png -r 200 -f <début> -l <fin> "CBHS_06_Chroniques_Oubliees_2_web_v2.pdf" ".pdf-pages\p"` → `.pdf-pages/p-NNN.png` (dossier gitignoré). Le numéro de page PDF = numéro imprimé dans le livre.
