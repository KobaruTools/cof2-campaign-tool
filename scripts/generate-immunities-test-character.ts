/**
 * Génère un personnage de TEST montrant TOUTES les immunités d'état sur un seul écran
 * (carte Défense) — pour vérifier les icônes dédiées (StatusEffectIcon, cf. game-icons).
 *
 * Lance : `npx tsx scripts/generate-immunities-test-character.ts`
 *
 * Choix du profil : un BARDE ELFE HAUT cumule à lui seul les 5 immunités de `IMMUNITY_IDS` :
 *  - Force d'âme (voie de l'elfe haut, rang 2) → peur + sommeil magique ;
 *  - Liberté d'action (voie du saltimbanque, rang 4) → peur + charme/possession + ralenti + immobilisé.
 * (« peur » est accordée par les deux → dédupliquée, avec deux sources dans le tooltip.)
 *
 * Même méthode que `generate-per73-characters.ts` : niveau 1 avec capacités gratuites de création,
 * puis `packLevelUpHistory` jusqu'au niveau 20 (voie de peuple 5/5 + 4 voies de profil 5/5 + 1 au rang 1).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ancestryById, classById, pathById, featureById } from '@/data';
import type { AbilityId } from '@/data/schema';
import { rulesContext as ctx } from '@/lib/character/rulesContext';
import { packLevelUpHistory } from '@/lib/character/historyBuilder';
import { eligibleFeaturesForChoice } from '@/lib/character/choices';
import { checkCompliance, featurePointBudget } from '@/lib/engine';
import { createBlankCharacter } from '@/lib/character/factory';
import type { Character } from '@/lib/character/types';

const FILE = 'test-immunites-barde-elfe-haut.json';
const isoNow = '2026-07-01T00:00:00.000Z';

const ancestryId = 'elfe-haut';
const ancestryPathId = 'elfe-haut';
const classId = 'barde';
const baseAbilities: Record<AbilityId, number> = { AGI: 2, CON: 1, FOR: -1, PER: 0, CHA: 3, INT: 1, VOL: 2 };
const ancestryChoices: AbilityId[] = ['CHA', 'FOR'];

const dir = join(process.cwd(), 'examples', 'characters');

function featureAtRank(pathId: string, rank: number): string {
  const id = pathById.get(pathId)!.featureIds.find((fid) => featureById.get(fid)!.rank === rank);
  if (!id) throw new Error(`Voie ${pathId} : pas de capacité de rang ${rank}.`);
  return id;
}
function featuresUpToRank(pathId: string, maxRank: number): string[] {
  return pathById.get(pathId)!.featureIds.filter((fid) => featureById.get(fid)!.rank <= maxRank);
}

const ancestry = ancestryById.get(ancestryId)!;
const cls = classById.get(classId)!;
const classPaths = cls.pathIds; // barde : escrime, musicien, saltimbanque, seduction, vagabond

// saltimbanque doit être parmi les 4 voies poussées à 5/5 (pour atteindre le rang 4, Liberté d'action).
const saltiIdx = classPaths.indexOf('saltimbanque');
if (saltiIdx < 0 || saltiIdx > 3) throw new Error('saltimbanque doit être dans les 4 premières voies du barde.');

const abilities = { ...baseAbilities };
ancestry.abilityModifiers.forEach((mod, i) => {
  const chosen = ancestryChoices[i];
  if (!chosen || !mod.abilities.includes(chosen)) throw new Error(`Choix de modificateur ${i} invalide (${chosen}).`);
  abilities[chosen] += mod.value;
});

const freeIds = [featureAtRank(classPaths[0], 1), featureAtRank(classPaths[1], 1), featureAtRank(ancestryPathId, 1)];

const targetFeatureIds = [
  ...featuresUpToRank(ancestryPathId, 5),
  ...featuresUpToRank(classPaths[0], 5),
  ...featuresUpToRank(classPaths[1], 5),
  ...featuresUpToRank(classPaths[2], 5),
  ...featuresUpToRank(classPaths[3], 5),
  ...featuresUpToRank(classPaths[4], 1),
];

const base: Character = {
  ...createBlankCharacter({ name: 'Test — Immunités (barde elfe haut)', now: isoNow }),
  id: FILE.replace(/\.json$/, ''),
  identity: {
    sex: 'female',
    description:
      "Personnage de TEST des icônes d'immunité d'état. Cumule les 5 immunités : Force d'âme (elfe haut r2 → peur + sommeil magique) et Liberté d'action (saltimbanque r4 → peur + charme/possession + ralenti + immobilisé). Voir la carte Défense.",
  },
  ancestryId,
  classId,
  ancestryPathId,
  level: 1,
  abilities,
  baseAbilities,
  ancestryChoices,
  featureIds: [...freeIds],
  levelUpHistory: [{ level: 1, chosenFeatureIds: [...freeIds] }],
};

const { character: built, unspentByLevel } = packLevelUpHistory(base, targetFeatureIds, 20, ctx);

const after = new Set(built.featureIds);
for (const id of targetFeatureIds) {
  if (!after.has(id)) throw new Error(`Capacité ${id} non acquise.`);
}
for (const need of ['elfe-haut-r2', 'saltimbanque-r4']) {
  if (!after.has(need)) throw new Error(`Capacité d'immunité ${need} absente du build.`);
}

// Auto-remplissage des CHOIX portés par les capacités de la voie de peuple (comme la recette PER-73).
const ancestryFeatureIds = featuresUpToRank(ancestryPathId, 5);
const featureChoices: Character['featureChoices'] = {};
for (const fid of ancestryFeatureIds) {
  const feature = featureById.get(fid)!;
  if (!feature.choices?.length) continue;
  featureChoices[fid] = feature.choices.map((choice) => {
    if (choice.kind === 'feature-from-path') {
      const eligible = eligibleFeaturesForChoice(built, fid, choice);
      return eligible[0]?.id ?? null;
    }
    if (choice.kind === 'ability') {
      if (choice.lowestHint) {
        return (Object.keys(abilities) as AbilityId[]).reduce((lo, k) => (abilities[k] < abilities[lo] ? k : lo));
      }
      return choice.allowed?.[0] ?? 'FOR';
    }
    if (choice.kind === 'custom-skill') return null;
    return choice.options[0]?.id ?? null;
  });
}

const output: Character = {
  ...built,
  featureChoices,
  notes:
    "Perso de test des icônes d'immunité d'état (5 immunités visibles sur la carte Défense). Barde elfe haut, voies elfe haut + saltimbanque poussées pour débloquer Force d'âme et Liberté d'action.",
  createdAt: isoNow,
  updatedAt: isoNow,
};

writeFileSync(join(dir, FILE), `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const warnings = checkCompliance(output, ctx);
const blocking = warnings.filter(
  (w) => w.code === 'FEATURE_POINTS_OVERSPENT' || w.code === 'MISSING_RANK' || w.code === 'UNKNOWN_FEATURE',
);
if (blocking.length > 0) throw new Error(`Conformité KO → ${blocking.map((w) => w.message).join(' | ')}`);
const budget = featurePointBudget(output, ctx);
const orphan = budget.available - budget.spent;
const unspent = Object.entries(unspentByLevel).map(([l, p]) => `niv ${l}: ${p}`).join(', ');
console.log(
  `✓ ${FILE} — niveau ${output.level}, ${output.levelUpHistory.length} entrées, ${orphan} point(s) orphelin(s)` +
    `${unspent ? ` (${unspent})` : ''}. Immunités : elfe-haut-r2 + saltimbanque-r4 présents.`,
);
