@AGENTS.md

# cof2-character-editor

Éditeur/simulateur de personnage pour le JDR **Chroniques Oubliées Fantasy 2e édition (CO2)**, en français, pour une table de jeu privée.

**Lire `PRD.md` avant toute implémentation** — il contient toutes les décisions validées, le périmètre, le plan de jalons et les critères d'acceptation.

## Points critiques

- **Langue : le CODE est en ANGLAIS, le TEXTE affiché est en FRANÇAIS.** Règle absolue, sans exception. Tout ce qui relève du code et de la logique s'écrit en anglais : noms de types/interfaces, variables, fonctions, **clés d'objets/JSON**, valeurs d'énumérations fermées, noms de fichiers, dossiers et routes. Tout ce qui est montré au joueur reste en français : **valeurs** de chaînes (noms de peuples, descriptions, textes de règles verbatim, libellés d'UI). Les commentaires restent en français. Exceptions volontaires conservées en français : les **slugs d'`id`** des entités (`'demi-elfe'`, `'epee-longue'`, `'artilleur-r1'`…) car ce sont des clés de contenu persistées (référencées dans les personnages sauvegardés) ; les codes neutres `AGI/CON/FOR/PER/CHA/INT/VOL` et `d4…d20`. Ne jamais réintroduire de français dans le code (incident corrigé le 2026-06-13 : tout le code avait dérivé en français et a été retraduit ; modèle `Character` migré v1→v2 pour les clés renommées, voir `src/lib/engine/migrations.ts`).
- **Source de règles unique** : `CBHS_06_Chroniques_Oubliees_2_web_v2.pdf` (livre de base CO2, ~358 pages, à la racine de ce dossier).
- **`[COF2_40]--Le-Compagnon_web_v0b.pdf` est HORS SCOPE pour l'extraction de données** : ne pas en extraire de règles ni de contenu, sauf demande explicite de l'utilisateur. Sa **consultation** comme livre intégré au visualiseur PDF est en revanche autorisée (voir ci-dessous).
- **PDF dans git — contrainte assouplie le 2026-06-14** (milestone Linear « Visualiseur PDF », app strictement privée) : la règle d'origine était « les deux PDF ne doivent jamais entrer dans le bundle ni dans git ». Désormais le livre de base **et** le Compagnon sont **commités via Git LFS** et servis depuis `public/rules/` pour alimenter le visualiseur PDF intégré (exception ciblée dans `.gitignore`, la règle globale `*.pdf` reste). Ne pas traiter leur présence comme une régression. Si l'app est un jour distribuée, revenir à un import local du PDF par l'utilisateur (ticket PER-57) et rétablir la contrainte d'origine.
- Ordre d'implémentation imposé : schéma de données → extraction exhaustive du PDF (validée par l'utilisateur) → moteur de calcul testé → UI. Pas d'UI avant des données validées.
- Stack : Next.js (App Router) + TypeScript strict + zustand (persist/localStorage) + MUI. 100% client en phase 1, pas d'API, pas de backend. Supabase prévu en phase 2 seulement.
- Caractéristiques : saisie libre uniquement (les dés sont lancés en vrai à la table — aucune génération simulée).
- Wizard bloquant (création + montée de niveau) ; fiche éditable permissive avec avertissements non bloquants.
- Ne jamais deviner une règle de CO2 : toute donnée vient du PDF avec sa page source (`sourcePage`) ; en cas de doute, marquer `TODO(extraction)` et demander.
- Caractéristiques (PRD décision #13) : on suit le livre tel quel — une **valeur unique** par caractéristique (-3 à +5), ajoutée directement au d20 et aux formules. Pas de couche score → modificateur (question soulevée puis retirée par le propriétaire le 2026-06-12 — ne pas la réintroduire).

## Lire le PDF

L'outil Read ne voit pas poppler (PATH figé) : rendre les pages en PNG puis lire les images.
`pdftoppm -png -r 200 -f <début> -l <fin> "CBHS_06_Chroniques_Oubliees_2_web_v2.pdf" ".pdf-pages\p"` → `.pdf-pages/p-NNN.png` (dossier gitignoré). Le numéro de page PDF = numéro imprimé dans le livre.
