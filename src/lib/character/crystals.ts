/**
 * Voie des cristaux (PER-74, prestige mage, p. 156) — couche pure : cristaux APPRIS (choix figés
 * sur les rangs 4-8) vs cristaux ACTIFS (état de jeu dynamique, `Character.activeCrystalIds`,
 * plafonné par le rang atteint dans la voie mais jamais bloqué — fiche permissive, avertissement
 * non bloquant en cas de dépassement). Voir `src/data/crystals.ts` pour le catalogue.
 */
import { featureById } from '@/data';
import { CRYSTALS, crystalById, type Crystal } from '@/data/crystals';
import type { AbilityId, DerivedStatId } from '@/data/schema';
import { getOptionSelections } from './choices';
import type { Character } from './types';

const CRYSTAL_PATH_ID = 'prestige-cristaux';
const CRYSTAL_RANK_FEATURE_IDS = [4, 5, 6, 7, 8].map((r) => `prestige-cristaux-r${r}`);

/** Rang le plus élevé atteint dans une voie donnée — évite la dépendance à `effects.ts` (cycle). */
function maxRankInPath(character: Character, pathId: string): number {
  let max = 0;
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (feature?.pathId === pathId) max = Math.max(max, feature.rank);
  }
  return max;
}

/** Ids des cristaux APPRIS (choix figés des rangs 4 à 8 possédés), dédoublonnés. */
export function knownCrystalIds(character: Character): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const featureId of CRYSTAL_RANK_FEATURE_IDS) {
    if (!character.featureIds.includes(featureId)) continue;
    const selections = character.featureChoices[featureId] ?? [];
    selections.forEach((_, index) => {
      for (const id of getOptionSelections(character, featureId, index)) {
        if (!seen.has(id) && crystalById.has(id)) {
          seen.add(id);
          out.push(id);
        }
      }
    });
  }
  return out;
}

/** Cristaux APPRIS, résolus en entités du catalogue. */
export function knownCrystals(character: Character): Crystal[] {
  return knownCrystalIds(character)
    .map((id) => crystalById.get(id))
    .filter((c): c is Crystal => c != null);
}

/** Nombre de cristaux activables SIMULTANÉMENT au rang atteint dans la voie (0 si non engagée). */
export function maxActiveCrystals(character: Character): number {
  const rank = maxRankInPath(character, CRYSTAL_PATH_ID);
  return rank > 0 ? rank - 3 : 0;
}

/** Ids des cristaux actuellement ACTIVÉS (état de jeu), `[]` par défaut. */
export function activeCrystalIds(character: Character): string[] {
  return character.activeCrystalIds ?? [];
}

/** Cristaux ACTIFS **et** connus (ignore les ids activés devenus invalides/orphelins). */
export function activeKnownCrystals(character: Character): Crystal[] {
  const known = new Set(knownCrystalIds(character));
  return activeCrystalIds(character)
    .filter((id) => known.has(id))
    .map((id) => crystalById.get(id))
    .filter((c): c is Crystal => c != null);
}

/** Un cristal donné est-il actuellement activé ? */
export function isCrystalActive(character: Character, crystalId: string): boolean {
  return activeCrystalIds(character).includes(crystalId);
}

/**
 * Avertissement NON BLOQUANT (fiche permissive) si le nombre de cristaux activés dépasse la limite
 * du rang atteint — ex. après une édition manuelle ou une perte de rang. `null` si conforme.
 */
export function crystalOverCapWarning(character: Character): string | null {
  const max = maxActiveCrystals(character);
  const activeCount = activeKnownCrystals(character).length;
  if (activeCount <= max) return null;
  return `${activeCount} cristaux activés pour une limite de ${max} au rang atteint dans la voie des cristaux.`;
}

/**
 * Patch pur (dé)activant un cristal — à appliquer via `update()`, comme `toggleEffect`
 * (`sheetActions.ts`). N'impose PAS la limite d'activation (avertissement seulement, cf.
 * `crystalOverCapWarning`) : le joueur peut toujours désactiver, et activer reste permissif.
 */
export function toggleCrystalActive(
  character: Character,
  crystalId: string,
  active: boolean,
): Partial<Character> {
  const current = activeCrystalIds(character);
  const next = active
    ? current.includes(crystalId) ? current : [...current, crystalId]
    : current.filter((id) => id !== crystalId);
  return { activeCrystalIds: next };
}

/** Modificateurs PERMANENTS de caractéristique apportés par les cristaux ACTIFS (delta, cf. `effectiveAbilities`). */
export function crystalAbilityBonuses(character: Character): Partial<Record<AbilityId, number>> {
  const out: Partial<Record<AbilityId, number>> = {};
  for (const crystal of activeKnownCrystals(character)) {
    if (!crystal.abilityBonus) continue;
    const { ability, value } = crystal.abilityBonus;
    out[ability] = (out[ability] ?? 0) + value;
  }
  return out;
}

/** Bonus de stats DÉRIVÉES apportés par les cristaux ACTIFS (fondu au sac de mods, cf. `mergeMods`). */
export function crystalStatBonuses(character: Character): Partial<Record<DerivedStatId, number>> {
  const out: Partial<Record<DerivedStatId, number>> = {};
  for (const crystal of activeKnownCrystals(character)) {
    for (const b of crystal.statBonuses ?? []) {
      out[b.stat] = (out[b.stat] ?? 0) + b.value;
    }
  }
  return out;
}

/** Tous les cristaux du catalogue (pour un sélecteur — indépendant du personnage). */
export function allCrystals(): Crystal[] {
  return CRYSTALS;
}
