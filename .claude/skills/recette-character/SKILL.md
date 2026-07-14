---
name: recette-character
description: >-
  Fabrique des personnages de recette/exemple importables (examples/characters/*.json)
  pour vérifier une fonctionnalité dans la vraie app. Utiliser quand on veut recetter
  un ticket (PER-NN) avec des persos concrets, créer un cas de test de fiche, ou
  reproduire un scénario joueur. Génère via la VRAIE factory + vérifie le comportement
  attendu programmatiquement avant d'écrire.
---

# Créer des personnages de recette

Objectif : produire des fichiers `examples/characters/recette-<ticket>-<slug>.json`
qu'on **importe dans l'app** (bouton « Importer » de l'accueil) pour recetter une
fonctionnalité comme un joueur — pas seulement via des tests unitaires.

## Pourquoi passer par un générateur (et pas écrire le JSON à la main)

Un `Character` a beaucoup de champs. Les écrire à la main dérive vite du schéma.
On **fabrique avec la vraie factory** (`createBlankCharacter`) puis on ne surcharge
que ce qui compte (profil, `featureIds`, équipement porté). Et on **vérifie le
verdict attendu par le vrai moteur** (`checkCompliance` ou la fonction concernée)
AVANT d'écrire le fichier — jamais d'attendu affirmé « au jugé ».

## Recette

1. Écris un générateur jetable dans le scratchpad (PAS dans le repo), ex.
   `scratchpad/gen-<ticket>-examples.ts`. Squelette :

   ```ts
   import { writeFileSync } from 'node:fs';
   import { join } from 'node:path';
   import { createBlankCharacter } from '@/lib/character/factory';
   import { checkCompliance } from '@/lib/engine/legality';
   import { rulesContext } from '@/lib/character/rulesContext';
   import type { Character, EquipmentLine } from '@/lib/character/types';

   const OUT = join(process.cwd(), 'examples', 'characters');
   const now = '2026-01-01T00:00:00.000Z'; // fixe (pas de Date.now dans un blob versionné)
   const wornArmor = (itemId: string): EquipmentLine => ({ itemId, quantity: 1, worn: { slot: 'armor' } });

   const character: Character = {
     ...createBlankCharacter({ now }),
     id: 'recette-perNN-slug',
     name: 'Recette PER-NN — …',
     identity: { description: 'ATTENDU : …' },
     ancestryId: 'humain', ancestryPathId: 'humain',
     classId: 'barbare', level: 3,
     abilities: { FOR: 3, AGI: 1, CON: 2, PER: 0, CHA: 1, INT: -1, VOL: 0 },
     baseAbilities: { FOR: 3, AGI: 1, CON: 2, PER: 0, CHA: 1, INT: -1, VOL: 0 },
     featureIds: ['brute-r1', 'brute-r2', 'humain-r1'],
     equipment: [wornArmor('chemise-de-mailles')],
     notes: 'PER-NN — …',
     createdAt: now, updatedAt: now,
   };

   // Vérifie l'attendu AVANT d'écrire (ici : avertissements de port d'armure).
   const w = checkCompliance(character, rulesContext)
     .filter((x) => x.code === 'ARMOR_TOO_HEAVY' || x.code === 'SHIELD_NOT_ALLOWED');
   console.log(w.length ? w.map((x) => x.message).join(' | ') : '✓ aucun');

   writeFileSync(join(OUT, 'recette-perNN-slug.json'), JSON.stringify(character, null, 2) + '\n');
   ```

2. Lance-le : `npx tsx scratchpad/gen-<ticket>-examples.ts`. Lis les verdicts
   imprimés : ils DOIVENT correspondre à l'attendu. Sinon, corrige avant d'écrire.

3. Livre le(s) fichier(s) sous `examples/characters/`. Ne commite pas sans accord.

## Conventions (calquées sur les fichiers existants)

- **Format = objet `Character` brut** (pas l'enveloppe de transfert) — l'import est
  rétrocompatible avec un perso à plat. `schemaVersion` = courant (la factory le pose).
- **Nommage** : `recette-<ticket>-<slug>.json` pour la recette d'un ticket ;
  `test-<profil>-<peuple>.json` pour un cas de référence durable.
- **Équipement à porter** : mettre `worn: { slot: 'armor' | 'shield' }` (ou main pour
  une arme) EXPLICITEMENT — sinon rien n'est équipé et le calcul de port ne voit rien.
- **`campaignId: null`** → le perso apparaît sous « Non attribué » à l'accueil (facile
  à repérer et supprimer après recette).
- **`identity.description` / `notes`** : y écrire l'ATTENDU et ce qu'il faut vérifier
  (les fichiers existants sont verbeux là-dessus, c'est voulu).
- **Contrôle négatif** : quand on démontre qu'un rang/choix FAIT apparaître ou
  disparaître un effet, livrer AUSSI le perso sans ce rang, pour prouver le contraste.

## Vérifier / importer

- Vérif logique immédiate : le `console.log` du générateur suffit (vrai chemin moteur).
- Recette visuelle : importe le JSON via l'accueil → ouvre la fiche → observe.
  L'app est gatée derrière `/login` quand Supabase est configuré (`.env.local`) ; un
  agent headless ne peut pas s'authentifier — c'est au propriétaire d'importer dans
  son navigateur connecté, ou de lancer une instance locale SANS Supabase (gating off).
