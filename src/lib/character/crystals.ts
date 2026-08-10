/**
 * Voie des cristaux (PER-74, prestige mage, p. 156) — couche pure : cristaux APPRIS (choix figés
 * sur les rangs 4-8) vs cristaux ACTIFS (état de jeu dynamique, `Character.activeCrystalIds`,
 * plafonné par le rang atteint dans la voie mais jamais bloqué — fiche permissive, avertissement
 * non bloquant en cas de dépassement). Voir `src/data/crystals.ts` pour le catalogue.
 */
import { featureById } from '@/data';
import { CRYSTALS, crystalById, crystalLabel, type Crystal } from '@/data/crystals';
import { isCrystalStatusId } from '@/data/crystalStatuses';
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

/**
 * Cristaux REÇUS d'un autre personnage (PER-360), résolus en entités du catalogue. Aucun filtre
 * « appris » ici, contrairement aux cristaux actifs : le porteur n'a rien appris du tout, c'est le
 * mage des cristaux qui a fabriqué le sien et le lui a confié (p. 156, rang 4).
 */
export function receivedCrystals(character: Character): Crystal[] {
  return (character.receivedCrystalIds ?? [])
    .map((id) => crystalById.get(id))
    .filter((c): c is Crystal => c != null);
}

/**
 * Cristaux dont les effets COMPTENT pour ce personnage : ceux qu'il a activés sur lui-même, plus
 * ceux qu'on lui a confiés. Point d'entrée unique des deux canaux chiffrés ci-dessous — un cristal
 * confié à quelqu'un d'autre a déjà quitté `activeCrystalIds` de la copie de calcul de son
 * propriétaire (cf. `withAssignedCrystalsOff`), il ne peut donc jamais compter deux fois.
 */
function effectiveCrystals(character: Character): Crystal[] {
  return [...activeKnownCrystals(character), ...receivedCrystals(character)];
}

/**
 * Copie de CALCUL du porteur d'un cristal confié (PER-360) : les états de combat `statusIds` posés
 * sur lui sont filtrés sur le catalogue des cristaux, et alimentent `receivedCrystalIds`. Jamais
 * persistée — même précaution que `withSupersededBuffTogglesOff` (PER-314). Renvoie le personnage
 * INCHANGÉ (même référence) quand aucun cristal ne lui est confié : ni copie ni rendu inutiles.
 */
export function withReceivedCrystals(
  character: Character,
  statusIds: readonly string[],
): Character {
  const received = statusIds.filter((id) => isCrystalStatusId(id));
  if (received.length === 0 && (character.receivedCrystalIds ?? []).length === 0) return character;
  return { ...character, receivedCrystalIds: [...new Set(received)] };
}

/**
 * Cristaux qui ne sont PLUS sur un personnage (PER-360), à retirer de sa copie de calcul :
 *  - ceux POSÉS sur un autre combattant — l'état de combat partagé fait foi, et il survit au
 *    rechargement de page qui aurait vidé la carte locale (sans quoi le bonus recompterait chez le
 *    propriétaire ET chez le porteur) ;
 *  - ceux qu'il VIENT de confier (`localAssignments`, couche optimiste) — pour que le bonus quitte
 *    sa fiche à l'instant du clic, sans attendre l'aller-retour par le MJ.
 *
 * Le rapprochement se fait sur l'id du cristal, seule information que porte l'état posé : si deux
 * mages de la voie avaient le MÊME cristal actif et que l'un le confiait, l'autre le perdrait aussi
 * de son calcul. Cas d'école à une table où les voies de prestige ne se dupliquent pas.
 */
export function crystalsHeldByOthers(
  statusesByCombatant: Readonly<Record<string, readonly { id: string }[]>> | undefined,
  characterId: string,
  localAssignments: Readonly<Record<string, string>> | null,
): string[] {
  const ids = new Set<string>(localAssignments ? Object.keys(localAssignments) : []);
  for (const [key, applied] of Object.entries(statusesByCombatant ?? {})) {
    if (key === characterId) continue;
    for (const status of applied) if (isCrystalStatusId(status.id)) ids.add(status.id);
  }
  return [...ids];
}

/**
 * Copie de CALCUL du PROPRIÉTAIRE des cristaux (PER-360) : les cristaux qu'il a confiés sortent de
 * ses cristaux actifs, puisque leur effet joue désormais sur le porteur. Ils restent ACTIVÉS au sens
 * de la règle (ils comptent dans son plafond d'activation, p. 156 : « il peut activer les effets de
 * N cristaux simultanément ») — d'où le retrait sur la seule copie de calcul, jamais sur le
 * personnage réel. Renvoie la MÊME référence quand rien n'est confié.
 */
export function withAssignedCrystalsOff(
  character: Character,
  assignedCrystalIds: readonly string[],
): Character {
  if (assignedCrystalIds.length === 0) return character;
  const assigned = new Set(assignedCrystalIds);
  const active = activeCrystalIds(character);
  const next = active.filter((id) => !assigned.has(id));
  if (next.length === active.length) return character;
  return { ...character, activeCrystalIds: next };
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

/**
 * Modificateurs PERMANENTS de caractéristique apportés par les cristaux qui comptent pour ce
 * personnage — les siens et ceux qu'on lui a confiés (delta, cf. `effectiveAbilities`).
 */
export function crystalAbilityBonuses(character: Character): Partial<Record<AbilityId, number>> {
  const out: Partial<Record<AbilityId, number>> = {};
  for (const crystal of effectiveCrystals(character)) {
    if (!crystal.abilityBonus) continue;
    const { ability, value } = crystal.abilityBonus;
    out[ability] = (out[ability] ?? 0) + value;
  }
  return out;
}

/**
 * Bonus de stats DÉRIVÉES apportés par les cristaux qui comptent pour ce personnage — les siens et
 * ceux qu'on lui a confiés (fondu au sac de mods, cf. `mergeMods`).
 */
export function crystalStatBonuses(character: Character): Partial<Record<DerivedStatId, number>> {
  const out: Partial<Record<DerivedStatId, number>> = {};
  for (const crystal of effectiveCrystals(character)) {
    for (const b of crystal.statBonuses ?? []) {
      out[b.stat] = (out[b.stat] ?? 0) + b.value;
    }
  }
  return out;
}

/**
 * Un cristal cité comme SOURCE d'un bonus, dans le détail (« breakdown ») d'une caractéristique ou
 * d'une stat dérivée (PER-360). Sans lui, un +5 en Init. venu d'un cristal se noie dans la ligne
 * « Capacités / divers » sans que rien ne dise d'où il sort — et un cristal peut venir de n'importe
 * quel mage de la table.
 */
export interface CrystalSourceTerm {
  /** Id du cristal (= id de l'état posé quand il est confié). */
  crystalId: string;
  /** Libellé d'affichage (« Cristal Bleu nuit (Rhombe) »). */
  label: string;
  value: number;
  /** Confié par quelqu'un d'autre (vs fabriqué et porté par soi) ? */
  received: boolean;
}

/** Libellé d'affichage d'un cristal, préfixé — même formulation que son état de combat. */
export function crystalTermLabel(crystal: Crystal): string {
  return `Cristal ${crystalLabel(crystal)}`;
}

/** Cristaux comptés pour ce personnage, avec leur provenance (les siens, puis ceux qu'on lui confie). */
function crystalsWithOrigin(character: Character): { crystal: Crystal; received: boolean }[] {
  return [
    ...activeKnownCrystals(character).map((crystal) => ({ crystal, received: false })),
    ...receivedCrystals(character).map((crystal) => ({ crystal, received: true })),
  ];
}

/**
 * Ventilation par stat DÉRIVÉE des bonus de cristaux — de quoi nommer le cristal sous la ligne
 * « Capacités / divers » au lieu de laisser un chiffre orphelin.
 */
export function crystalStatSources(
  character: Character,
): Partial<Record<DerivedStatId, CrystalSourceTerm[]>> {
  const out: Partial<Record<DerivedStatId, CrystalSourceTerm[]>> = {};
  for (const { crystal, received } of crystalsWithOrigin(character)) {
    for (const b of crystal.statBonuses ?? []) {
      (out[b.stat] ??= []).push({
        crystalId: crystal.id,
        label: crystalTermLabel(crystal),
        value: b.value,
        received,
      });
    }
  }
  return out;
}

/** Ventilation par CARACTÉRISTIQUE des bonus de cristaux (même office que `crystalStatSources`). */
export function crystalAbilitySources(
  character: Character,
): Partial<Record<AbilityId, CrystalSourceTerm[]>> {
  const out: Partial<Record<AbilityId, CrystalSourceTerm[]>> = {};
  for (const { crystal, received } of crystalsWithOrigin(character)) {
    if (!crystal.abilityBonus) continue;
    const { ability, value } = crystal.abilityBonus;
    (out[ability] ??= []).push({
      crystalId: crystal.id,
      label: crystalTermLabel(crystal),
      value,
      received,
    });
  }
  return out;
}

/**
 * Personnage qui POSSÈDE un cristal donné, parmi ceux d'une campagne (PER-360) : celui qui l'a appris
 * ET l'a activé. Sert au client du MJ quand un porteur rend un cristal : l'état posé ne porte que
 * l'id du cristal, jamais celui de son propriétaire — c'est la table qui le retrouve. `null` si
 * personne ne le revendique (mage hors campagne, cristal déjà désactivé).
 */
export function crystalOwner(characters: readonly Character[], crystalId: string): Character | null {
  return (
    characters.find(
      (c) => activeCrystalIds(c).includes(crystalId) && knownCrystalIds(c).includes(crystalId),
    ) ?? null
  );
}

/** Tous les cristaux du catalogue (pour un sélecteur — indépendant du personnage). */
export function allCrystals(): Crystal[] {
  return CRYSTALS;
}
