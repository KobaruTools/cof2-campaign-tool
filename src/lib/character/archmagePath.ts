/**
 * Primitives de la voie de l'archimage (PER-74, p. 154), pures et testables.
 */
import { featureById } from '@/data';
import type { ActionType, Feature } from '@/data/schema';
import type { Character } from './types';

const R5 = 'prestige-archimage-r5';

/** Rang le plus élevé atteint dans la voie de l'archimage (0 si absente). */
export function archmageRank(character: Character): number {
  let rank = 0;
  for (const id of character.featureIds) {
    const f = featureById.get(id);
    if (f?.pathId === 'prestige-archimage') rank = Math.max(rank, f.rank);
  }
  return rank;
}

/**
 * `feature` est-elle le sort lié au Bâton magique (R5, p. 154) — cast au prix d'une action de
 * MOUVEMENT et SANS dépense de mana ? R5 porte DEUX choix `feature-from-path` : le premier (sort de
 * rang 1) est actif dès le rang 5 ; le second (sort de rang 2, « il peut AJOUTER ») ne l'est qu'à
 * PARTIR du rang 7 — avant ce rang, le joueur peut déjà le désigner (choix permissif, comme le reste
 * de la fiche) mais il ne bénéficie pas encore de la gratuité ni de l'action de mouvement. Consommé
 * par `FeaturesByPath` pour piloter `noMana`/`actionTypesOverride` de la carte d'emprunt correspondante.
 */
export function archmageStaffSpellGranted(character: Character, feature: Feature): boolean {
  if (!feature.isSpell || !character.featureIds.includes(R5)) return false;
  const choices = character.featureChoices?.[R5];
  const matches = (i: number) => typeof choices?.[i] === 'string' && choices![i] === feature.id;
  if (matches(0)) return true;
  return matches(1) && archmageRank(character) >= 7;
}

/**
 * Type d'action affiché pour un sort lié au Bâton magique (R5, p. 154, retour proprio 2026-08-10).
 * Le verbatim octroie une action de MOUVEMENT — mais seulement comme substitut : si le personnage
 * connaît DÉJÀ ce sort nativement (une autre voie, hors emprunt) en (G) — Gratuite, DONC moins chère
 * qu'une action de mouvement (ex. Murmures dans le vent, ensorceleur air-r1) —, forcer (M) reviendrait
 * à NERFER une capacité qu'il possède déjà. Dans ce cas on garde son type natif (`undefined`, la carte
 * affiche `feature.actionTypes` tel quel) ; sinon (sort non connu par ailleurs, ou connu en (A)/(L)/(M))
 * l'action de mouvement du bâton est un gain net → override (M).
 */
export function archmageStaffActionTypesOverride(
  character: Character,
  feature: Feature,
): ActionType[] | undefined {
  if (character.featureIds.includes(feature.id) && feature.actionTypes.includes('G')) return undefined;
  return ['M'];
}

/**
 * Ids des sorts GRANTÉS par le Bâton magique (R5, p. 154, cf. `archmageStaffSpellGranted`) et QUE le
 * personnage ne connaît PAS déjà par ailleurs. Sert à SUPPRIMER, pour ces ids, les bonus permanents et
 * INCONDITIONNELS (`stat-bonus` ET `test-bonus`) qui accompagnent certains sorts (« en plus de ce sort,
 * gagne un bonus permanent de +1 en Init. et en DEF » — Murmures dans le vent p. 93 ; « ajoute son rang
 * + 2 aux tests de... » — Ténèbres p. 111, Injonction p. 94, Mirage p. 95, Morsure de la forge p. 99) :
 * le verbatim R5 ne lie que LE SORT lui-même au bâton (cast en action de mouvement, sans mana), pas
 * l'à-côté permanent de sa voie d'origine — à la différence de l'encadré général « Appel à une autre
 * capacité » (p. 41) que suivent les autres emprunts. Un sort déjà connu NATIVEMENT (une autre voie que
 * le personnage possède réellement) garde son bonus : il ne vient pas du bâton, l'exclusion ne le
 * concerne donc pas — même logique que `grantedFeatureIds` (choices.ts) pour les octrois fixes.
 * Consommé à la fois comme `suppressedStatBonusFeatureIds` et (fusionné) comme
 * `suppressedTestBonusFeatureIds` dans `effectContext` (effects.ts) — le filtrage par NATURE d'effet se
 * fait au point de consommation (chaque branche `effect.kind`), pas ici. Portée volontairement limitée
 * aux `stat-bonus`/`test-bonus` (les effets `conditional-stat-bonus` d'autres sorts, ex. Armure de mana,
 * Familier, SONT l'effet du sort lui-même et restent mécanisés). Audit PER-74 généralisé 2026-08-11.
 */
export function archmageStaffGrantedSpellIds(character: Character): Set<string> {
  const out = new Set<string>();
  if (!character.featureIds.includes(R5)) return out;
  const choices = character.featureChoices?.[R5];
  for (const [i, sel] of (choices ?? []).entries()) {
    if (typeof sel !== 'string' || character.featureIds.includes(sel)) continue;
    const feature = featureById.get(sel);
    if (feature && archmageStaffSpellGranted(character, feature)) out.add(sel);
  }
  return out;
}

/** Sous-chaîne verbatim introduisant la clause de bonus permanent annexe à un sort (« en plus de ce
 * sort, gagne... »), qui n'accompagne QUE certains sorts de rang 1 d'ensorceleur (Murmures dans le
 * vent p. 93, Divination p. 93…). */
const STAFF_SUPPRESSED_BONUS_MARKER = 'En plus de ce sort,';

/**
 * Sous-chaîne à partir de laquelle barrer le texte de `feature` sur sa carte d'emprunt, quand son
 * bonus annexe (`stat-bonus` OU `test-bonus`) est supprimé par le Bâton magique (cf.
 * `archmageStaffGrantedSpellIds`) : la clause « en plus de ce sort, gagne... » / « ajoute son rang + 2
 * aux tests de... » décrit un à-côté de la VOIE d'origine, pas un effet du sort — le bâton ne lie que
 * le sort. `undefined` si `feature` n'est pas concernée (pas granté par le bâton, ou elle ne porte
 * aucun `stat-bonus`/`test-bonus` supprimable) ou si son texte ne porte pas la clause attendue (repli
 * en texte littéral). Audit PER-74 généralisé 2026-08-11 : initialement borné à `stat-bonus` (l'audit
 * n'avait alors couvert que Murmures dans le vent/Divination) ; élargi au `test-bonus` une fois
 * confirmé que Ténèbres, Injonction, Mirage et Morsure de la forge portent le même à-côté annexe, non
 * mécanisé jusqu'ici.
 */
export function archmageStaffSuppressedBonusMarker(character: Character, feature: Feature): string | undefined {
  if (!archmageStaffGrantedSpellIds(character).has(feature.id)) return undefined;
  if (!feature.effects?.some((e) => e.kind === 'stat-bonus' || e.kind === 'test-bonus')) return undefined;
  return feature.text.includes(STAFF_SUPPRESSED_BONUS_MARKER) ? STAFF_SUPPRESSED_BONUS_MARKER : undefined;
}
