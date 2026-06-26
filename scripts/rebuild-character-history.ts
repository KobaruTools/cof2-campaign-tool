/**
 * Régénère le `levelUpHistory` des personnages de test « pour de vrai » (PER-70).
 *
 * Lance : `npx tsx scripts/rebuild-character-history.ts`
 *
 * Beaucoup de fixtures ont été remplies en bourrant `featureIds` avec un
 * `levelUpHistory` réduit à l'entrée de création. Le moteur de PV (et tout ce qui
 * dépend de l'historique : famille par niveau des hybrides, points orphelins…)
 * lit cet historique ; sans entrées niveaux 2+, les calculs sont faux.
 *
 * Ce script reconstruit un historique complet et LÉGAL via `packLevelUpHistory`
 * (qui pilote `applyLevelUp` + `canAcquireFeature` comme le wizard) : il repart
 * d'un personnage de niveau 1 avec ses capacités gratuites de création, puis
 * dépense 2 points par niveau jusqu'à reconstituer exactement l'ensemble final.
 * Il ne réécrit que `featureIds`, `levelUpHistory` et `updatedAt` ; tout le reste
 * du fichier (caractéristiques, identité, interrupteurs d'effets…) est conservé.
 *
 * Périmètre actuel : le seul hybride prêtre/magicien (recettage en cours). Ajouter
 * une entrée dans `TARGETS` pour traiter les autres fixtures à historique tronqué.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { rulesContext as ctx } from '@/lib/character/rulesContext';
import { packLevelUpHistory } from '@/lib/character/historyBuilder';
import { checkCompliance, featurePointBudget } from '@/lib/engine';
import type { Character } from '@/lib/character/types';

interface Target {
  /** Nom de fichier dans `examples/characters/`. */
  file: string;
  /** Capacités gratuites de création (2 voies de profil principal + rang 1 de la
   *  voie de peuple). Le reste est reconstruit par montées de niveau successives. */
  level1FreeIds: string[];
}

const TARGETS: Target[] = [
  {
    file: 'test-hybride-pretre-magicien-elfe-haut.json',
    // Profil principal prêtre (prière + spiritualité) ; peuple haut-elfe. La voie
    // de magicien (magie protectrice) s'ouvre comme hybride dès le niveau 2.
    level1FreeIds: ['priere-r1', 'spiritualite-r1', 'elfe-haut-r1'],
  },
  {
    file: 'test-voleur-humain.json',
    // Profil voleur (assassin + déplacement à la création) ; peuple humain.
    // Les trois autres voies (aventurier, roublard, spadassin) s'ouvrent aux montées.
    level1FreeIds: ['assassin-r1', 'deplacement-r1', 'humain-r1'],
  },
  {
    file: 'test-barde-humain.json',
    // Profil barde (escrime + musicien à la création) ; peuple humain.
    // Les trois autres voies (saltimbanque, séduction, vagabond) s'ouvrent aux montées.
    level1FreeIds: ['escrime-r1', 'musicien-r1', 'humain-r1'],
  },
  {
    file: 'test-barde-voleur-hybride.json',
    // Profil barde (escrime + musicien à la création) ; peuple humain. La voie de voleur
    // de l'assassin s'ouvre comme HYBRIDE (une voie de barde, séduction, reste vierge).
    level1FreeIds: ['escrime-r1', 'musicien-r1', 'humain-r1'],
  },
  {
    file: 'test-rodeur-humain.json',
    // Profil rôdeur (archerie + compagnon animal à la création) ; peuple humain.
    // Les trois autres voies (survie, traqueur, combat à deux armes) s'ouvrent aux montées.
    level1FreeIds: ['archer-r1', 'compagnon-animal-r1', 'humain-r1'],
  },
  {
    file: 'test-arquebusier-humain.json',
    // Profil arquebusier (artilleur + explosifs à la création) ; peuple humain.
    // Les trois autres voies (mercenaire, pistolero, précision) s'ouvrent aux montées.
    level1FreeIds: ['artilleur-r1', 'explosifs-r1', 'humain-r1'],
  },
  {
    file: 'test-barbare-humain.json',
    // Profil barbare (brute + pagne à la création) ; peuple humain.
    // Les trois autres voies (pourfendeur, primitif, rage) s'ouvrent aux montées.
    level1FreeIds: ['brute-r1', 'pagne-r1', 'humain-r1'],
  },
  {
    file: 'test-nain-guerrier-rd-cumul.json',
    // Profil guerrier (combat + soldat à la création) ; peuple nain. La voie du pagne
    // (barbare) s'ouvre comme HYBRIDE intra-famille combattants aux montées (Peau d'acier).
    level1FreeIds: ['combat-r1', 'soldat-r1', 'nain-r1'],
  },
];

const dir = join(process.cwd(), 'examples', 'characters');
const isoToday = '2026-06-25T00:00:00.000Z';

for (const { file, level1FreeIds } of TARGETS) {
  const path = join(dir, file);
  const character = JSON.parse(readFileSync(path, 'utf8')) as Character;
  const targetFeatureIds = [...character.featureIds];
  const targetLevel = character.level;

  // Vérifie que les capacités gratuites annoncées sont bien sur la fiche.
  for (const id of level1FreeIds) {
    if (!targetFeatureIds.includes(id)) {
      throw new Error(`${file} : capacité gratuite ${id} absente de featureIds.`);
    }
  }

  const base: Character = {
    ...character,
    level: 1,
    featureIds: [...level1FreeIds],
    levelUpHistory: [{ level: 1, chosenFeatureIds: [...level1FreeIds] }],
  };

  const { character: rebuilt, unspentByLevel } = packLevelUpHistory(
    base,
    targetFeatureIds,
    targetLevel,
    ctx,
  );

  // Garde-fous : ensemble final identique, aucune sur-dépense ni voie à trous.
  const before = new Set(targetFeatureIds);
  const after = new Set(rebuilt.featureIds);
  if (before.size !== after.size || [...before].some((id) => !after.has(id))) {
    throw new Error(`${file} : l'ensemble de capacités a changé pendant la reconstruction.`);
  }
  const warnings = checkCompliance(rebuilt, ctx);
  const blocking = warnings.filter(
    (w) => w.code === 'FEATURE_POINTS_OVERSPENT' || w.code === 'MISSING_RANK',
  );
  if (blocking.length > 0) {
    throw new Error(`${file} : conformité KO → ${blocking.map((w) => w.message).join(' | ')}`);
  }

  const output = {
    ...character,
    featureIds: rebuilt.featureIds,
    levelUpHistory: rebuilt.levelUpHistory,
    updatedAt: isoToday,
  };
  writeFileSync(path, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const budget = featurePointBudget(rebuilt, ctx);
  const orphan = budget.available - budget.spent;
  const unspent = Object.entries(unspentByLevel)
    .map(([lvl, pts]) => `niv ${lvl}: ${pts}`)
    .join(', ');
  console.log(
    `✓ ${file} — niveau ${targetLevel}, ${rebuilt.levelUpHistory.length} entrées d'historique, ` +
      `${orphan} point(s) orphelin(s)${unspent ? ` (${unspent})` : ''}.`,
  );
}
