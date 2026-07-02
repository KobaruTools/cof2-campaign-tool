/**
 * Génère un personnage de RECETTE dédié aux CAPACITÉS EMPRUNTÉES.
 *
 * But : réunir le MAXIMUM d'emprunts (`feature-from-path`) sur un seul personnage
 * pour vérifier l'affichage enrichi d'une capacité empruntée (marqueurs d'action,
 * astérisque de sort, goutte de coût en PM, prise en compte de la concentration).
 *
 * Le MAXIMUM d'emprunts STRICTEMENT légaux sur un même personnage est 3. Les seules
 * capacités « emprunteuses » du jeu sont : 1 voie de peuple + noblesse-r5 (combattant) +
 * mercenaire-r3 (aventurier) + prestige-expert-r4 (voie de l'expert). Or la voie de
 * l'expert est INTERDITE aux hybrides multi-familles (p. 129) — incompatible avec avoir à
 * la fois noblesse (combattant) et mercenaire (aventurier). Les voies de prestige n'étant
 * de toute façon pas encore intégrées, on s'en tient aux 3 emprunts légaux ci-dessous.
 *
 * Hôtes emprunteurs retenus :
 *   - voie de peuple : elfe-haut-r3  « Talent pour la magie »  (magicien/ensorceleur r1-2)
 *   - voie de profil : noblesse-r5   « Formation d'élite »     (combattants/aventuriers r1-3)
 *   - voie de profil : mercenaire-r3 « Combattant aguerri »    (guerrier/voleur/rôdeur r1)
 *
 * Emprunts choisis (variés pour couvrir tous les cas d'affichage) :
 *   - elfe-haut-r3  → magie-des-arcanes-r1 « Projectile de mana » (SORT, (A), 1 PM) — la concentration le transforme
 *   - noblesse-r5   → musicien-r1 « Chant des héros »            (SORT, (L), 1 PM) — la concentration ne l'affecte PAS
 *   - mercenaire-r3 → combat-a-deux-armes-r1 « Attaque à suivre » (NON-SORT, (G), pas de PM)
 *
 * Lance : `npx tsx scripts/generate-borrowed-demo.ts`
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ancestryById } from '@/data';
import type { AbilityId } from '@/data/schema';
import { rulesContext as ctx } from '@/lib/character/rulesContext';
import { packLevelUpHistory } from '@/lib/character/historyBuilder';
import { eligibleFeaturesForChoice, featureChoiceDefs } from '@/lib/character/choices';
import { checkCompliance, featurePointBudget } from '@/lib/engine';
import { createBlankCharacter } from '@/lib/character/factory';
import type { Character, FeatureChoiceSelection } from '@/lib/character/types';

const isoNow = '2026-07-01T00:00:00.000Z';
const ancestryId = 'elfe-haut';
const ancestryPathId = 'elfe-haut';
const classId = 'barde';

// Valeurs de base (avant modificateurs de peuple) : caster INT+CHA pour que les
// formules des sorts empruntés (Projectile de mana → INT ; sorts de barde → CHA)
// donnent des valeurs parlantes, avec un peu d'AGI pour l'escrime.
const baseAbilities: Record<AbilityId, number> = {
  AGI: 2, CON: 1, FOR: 0, PER: 1, CHA: 4, INT: 3, VOL: 1,
};
// Elfe haut : +1 INT ou CHA (→ INT), -1 FOR.
const ancestryChoices: AbilityId[] = ['INT', 'FOR'];

// Emprunts voulus : hôte → sélections (alignées sur `Feature.choices`).
const BORROWS: Record<string, FeatureChoiceSelection[]> = {
  'elfe-haut-r3': ['magie-des-arcanes-r1'],
  'noblesse-r5': ['musicien-r1', 'CHA'],
  'mercenaire-r3': ['combat-a-deux-armes-r1'],
};

// Voies NATIVES + voies hôtes, toutes ACQUISES LÉGALEMENT (par `packLevelUpHistory`).
const NATIVE_BARDE = ['escrime', 'seduction']; // 2 voies de barde (création légale)
const targetFeatureIds = [
  // voie de peuple jusqu'au rang 3 (Talent pour la magie)
  'elfe-haut-r1', 'elfe-haut-r2', 'elfe-haut-r3',
  // 2 voies natives de barde
  ...NATIVE_BARDE.flatMap((p) => ['r1', 'r2', 'r3'].map((r) => `${p}-${r}`)),
  // voie de guerrier (noblesse) jusqu'au rang 5 (Formation d'élite)
  ...['r1', 'r2', 'r3', 'r4', 'r5'].map((r) => `noblesse-${r}`),
  // voie d'arquebusier (mercenaire) jusqu'au rang 3 (Combattant aguerri)
  ...['r1', 'r2', 'r3'].map((r) => `mercenaire-${r}`),
];

const ancestry = ancestryById.get(ancestryId)!;

// Caractéristiques finales = base + modificateurs de peuple résolus.
const abilities = { ...baseAbilities };
ancestry.abilityModifiers.forEach((mod, i) => {
  const chosen = ancestryChoices[i];
  if (!chosen || !mod.abilities.includes(chosen)) throw new Error(`Choix de modificateur ${i} invalide (${chosen}).`);
  abilities[chosen] += mod.value;
});

// Capacités gratuites de création : 2 voies de barde au rang 1 + rang 1 de peuple.
const freeIds = [`${NATIVE_BARDE[0]}-r1`, `${NATIVE_BARDE[1]}-r1`, 'elfe-haut-r1'];

const base: Character = {
  ...createBlankCharacter({ name: 'Recette — Capacités empruntées (elfe haut · barde hybride)', now: isoNow }),
  id: 'recette-borrowed-demo-elfe-haut-barde',
  identity: {
    sex: 'female',
    description:
      "Vérification de l'affichage des CAPACITÉS EMPRUNTÉES. 3 emprunts (maximum légal) : " +
      'elfe-haut-r3 → Projectile de mana (magicien, SORT (A), 1 PM) ; noblesse-r5 → Chant des héros ' +
      '(barde, SORT (L), 1 PM) ; mercenaire-r3 → Attaque à suivre (rôdeur, NON-SORT (G), pas de PM). ' +
      'Activez « Concentration accrue » : le Projectile de mana (A) passe en (L) et coûte 2 PM de moins ' +
      '(1→0, plancher 0) ; le Chant des héros (L) reste inchangé (la concentration ne joue que sur les ' +
      'sorts en (A)) ; l’Attaque à suivre (non-sort) ne montre pas de goutte de PM.',
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

const packed = packLevelUpHistory(base, targetFeatureIds, 12, ctx);
const { unspentByLevel } = packed;
const built = packed.character;

// Garde-fou : ensemble entièrement acquis.
for (const id of targetFeatureIds) {
  if (!built.featureIds.includes(id)) throw new Error(`Capacité ${id} non acquise.`);
}

// Auto-remplissage de TOUS les choix portés par les capacités acquises (première
// valeur éligible / option / carac), pour une fiche sans « choix à faire » parasite.
const featureChoices: Character['featureChoices'] = {};
for (const fid of built.featureIds) {
  const defs = featureChoiceDefs(fid);
  if (defs.length === 0) continue;
  featureChoices[fid] = defs.map((choice) => {
    if (choice.kind === 'feature-from-path') {
      return eligibleFeaturesForChoice(built, fid, choice)[0]?.id ?? null;
    }
    if (choice.kind === 'ability') {
      if (choice.lowestHint) {
        return (Object.keys(abilities) as AbilityId[]).reduce((lo, k) => (abilities[k] < abilities[lo] ? k : lo));
      }
      return choice.allowed?.[0] ?? 'FOR';
    }
    if (choice.kind === 'custom-skill') return null; // gagne-pain libre : pas d'auto-remplissage
    return choice.options[0]?.id ?? null; // option (non répétable ici)
  });
}

// Force les 4 emprunts vers les cibles voulues + VÉRIFIE leur éligibilité.
for (const [hostId, sels] of Object.entries(BORROWS)) {
  const defs = featureChoiceDefs(hostId);
  defs.forEach((choice, i) => {
    if (choice.kind !== 'feature-from-path') return;
    const wanted = sels[i] as string;
    const eligible = eligibleFeaturesForChoice(built, hostId, choice).map((f) => f.id);
    if (!eligible.includes(wanted)) {
      throw new Error(`${hostId}[${i}] : cible « ${wanted} » NON éligible. Éligibles : ${eligible.join(', ')}`);
    }
  });
  featureChoices[hostId] = sels;
}

const output: Character = {
  ...built,
  featureChoices,
  notes:
    'Perso de recette pour les CAPACITÉS EMPRUNTÉES (affichage enrichi : marqueurs (A)/(L)/(G), ' +
    'astérisque de sort, goutte de coût en PM, concentration). Build hybride volontaire : elfe haut, profil ' +
    'principal barde (voies escrime + séduction), hybridé guerrier (voie de noblesse) et arquebusier (voie de ' +
    'mercenaire). 3 emprunts = maximum légal : le 4e emprunt possible (voie de l\'expert, prestige-expert-r4) ' +
    'est écarté car la voie de l\'expert est interdite aux hybrides multi-familles (p. 129) et les voies de ' +
    'prestige ne sont pas encore intégrées. Emprunts calés sur des cibles variées (sort (A), sort (L), ' +
    'capacité non-sort). Les choix non-emprunt sont auto-remplis.',
  createdAt: isoNow,
  updatedAt: isoNow,
};

const dir = join(process.cwd(), 'examples', 'characters');
const file = 'recette-borrowed-demo-elfe-haut-barde.json';
writeFileSync(join(dir, file), `${JSON.stringify(output, null, 2)}\n`, 'utf8');

// Diagnostic de conformité (non bloquant : build hybride de recette).
const warnings = checkCompliance(output, ctx);
const budget = featurePointBudget(output, ctx);
const orphan = budget.available - budget.spent;
console.log(`✓ ${file} — niveau ${output.level}, ${output.featureIds.length} capacités, ${orphan} point(s) orphelin(s).`);
console.log(`  Emprunts : ${Object.entries(BORROWS).map(([h, s]) => `${h}→${s[0]}`).join(' | ')}`);
if (warnings.length) {
  console.log(`  Avertissements de conformité (${warnings.length}) :`);
  for (const w of warnings) console.log(`   - [${w.code}] ${w.message}`);
}
const unspent = Object.entries(unspentByLevel).map(([l, p]) => `niv ${l}: ${p}`).join(', ');
if (unspent) console.log(`  Points non dépensés par niveau : ${unspent}`);
