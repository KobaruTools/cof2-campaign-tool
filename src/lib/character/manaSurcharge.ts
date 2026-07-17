/**
 * Surcoût de mana des sorts lancés en armure non autorisée (PER-82) — module pur.
 *
 * Règle CO2 (chap. « Profils hybrides », p. 178 ; voir `docs/extraction/hybrides.md`
 * §7.2) : lancer un sort en portant une armure NON AUTORISÉE au profil dont la
 * capacité est issue coûte des points de mana supplémentaires.
 *
 * > « Pour lancer un sort en portant une armure qui n'est pas autorisée au profil
 * >   dont la capacité est issue, le personnage doit respecter deux règles :
 * >   maîtriser l'armure concernée et dépenser davantage de points de mana. » — p. 178
 *
 * > « Le nombre de PM supplémentaires à dépenser pour lancer le sort est égal au
 * >   bonus de DEF de l'armure portée (ne pas tenir compte d'un éventuel bonus
 * >   magique de l'armure). » — p. 178
 *
 * Détail par profil d'ORIGINE du sort :
 *  - **prêtre** : aucun surcoût, quelle que soit l'armure (`spellsIgnoreArmor`) ;
 *  - **magicien / ensorceleur / sorcier** (armure autorisée = aucune) : surcoût =
 *    DEF mondaine de l'armure portée ;
 *  - **forgesort / druide** (cuir, DEF +2) et **barde** (cuir renforcé, DEF +3) :
 *    surcoût = DEF mondaine portée − DEF de l'armure autorisée.
 *
 * Le surcoût s'ajoute PAR-DESSUS le coût de base du sort (`spellManaCost`, PER-65)
 * et ne consomme que la DEF MONDAINE de l'armure (le bonus magique de PER-85 est
 * exclu). Comme le reste de la fiche, le moteur SIGNALE — il ne bloque rien : un
 * sort dont l'armure n'est pas maîtrisée est marqué `blockedByMastery` (le livre
 * l'interdit sans maîtrise) sans être retiré de force.
 */
import { pathById } from '@/data';
import type { CharacterClass, Feature } from '@/data/schema';
import type { RulesContext } from '@/lib/engine';
import type { Character } from './types';
import { wornArmorAllowedDef, wornArmorWorldlyDef, classMaxArmorDef } from './armorRestrictions';

/**
 * Profil d'origine (id de `CharacterClass`) d'un sort, d'après SA voie
 * (`feature.pathId`). `null` si la voie n'est pas une voie de profil unique — voie
 * de peuple, voie du mage (`type: 'mage'`, générique aux mages) ou voie de prestige
 * — où le « profil dont la capacité est issue » (p. 178) n'est pas défini : on ne
 * devine pas d'allocation d'armure dans ces cas.
 */
export function spellOriginClassId(feature: Feature): string | null {
  const path = pathById.get(feature.pathId);
  return path?.type === 'class' && path.classIds.length > 0 ? path.classIds[0] : null;
}

/**
 * Allocation d'armure d'incantation (DEF mondaine) d'un profil, p. 178 :
 *  - `null` = ILLIMITÉE (prêtre, `spellsIgnoreArmor`) : ses sorts se lancent en
 *    toute armure sans surcoût ;
 *  - sinon = DEF de l'armure maximale autorisée au profil (`classMaxArmorDef`) : 0
 *    pour magicien/ensorceleur/sorcier (aucune armure), 2 pour forgesort/druide
 *    (cuir), 3 pour barde (cuir renforcé).
 */
export function spellcastingArmorAllowance(cls: CharacterClass): number | null {
  return cls.spellsIgnoreArmor ? null : classMaxArmorDef(cls);
}

/** Surcoût de mana d'un sort dû à l'armure portée (PER-82). */
export interface SpellArmorSurcharge {
  /** Profil d'origine du sort (id de `CharacterClass`). */
  originClassId: string;
  /** DEF MONDAINE de l'armure effectivement portée (bonus magique exclu, 0 si aucune). */
  wornArmorDef: number;
  /** Allocation d'armure d'incantation du profil d'origine (`null` = illimitée, prêtre). */
  allowanceDef: number | null;
  /** PM supplémentaires à dépenser (0 s'il n'y a pas de surcoût). */
  surcharge: number;
  /** Le personnage MAÎTRISE-t-il l'armure portée (armure ≤ plafond de port maîtrisé) ? */
  armorMastered: boolean;
  /**
   * Le sort ne peut pas être lancé dans cette armure faute de maîtrise : il y a un
   * surcoût (armure non autorisée au profil) MAIS l'armure n'est pas maîtrisée, les
   * deux conditions de la règle ne sont donc pas réunies (p. 178).
   */
  blockedByMastery: boolean;
}

/**
 * Surcoût de mana d'un sort donné pour le personnage tel qu'équipé (PER-82), ou
 * `null` si la notion ne s'applique pas : capacité qui n'est pas un sort, ou sort
 * dont le profil d'origine n'est pas déterminé (`spellOriginClassId` → `null`).
 *
 * Le surcoût est PUREMENT fonction du profil d'origine, de l'armure portée et de la
 * maîtrise ; il est indépendant du coût de base du sort (l'appelant l'ajoute par-
 * dessus `spellManaCost`).
 */
export function spellArmorManaSurcharge(
  character: Character,
  ctx: RulesContext,
  feature: Feature,
): SpellArmorSurcharge | null {
  if (!feature.isSpell) return null;
  const originClassId = spellOriginClassId(feature);
  if (!originClassId) return null;
  const cls = ctx.classById.get(originClassId);
  if (!cls) return null;

  const allowanceDef = spellcastingArmorAllowance(cls);
  const wornArmorDef = wornArmorWorldlyDef(character.equipment);
  // Prêtre (allocation illimitée) : jamais de surcoût. Sinon = DEF portée au-delà
  // de l'armure autorisée au profil, plancher 0.
  const surcharge = allowanceDef === null ? 0 : Math.max(0, wornArmorDef - allowanceDef);
  // Maîtrise de l'armure portée = armure ≤ plafond de port des profils maîtrisés.
  const armorMastered = wornArmorDef <= wornArmorAllowedDef(character, ctx);

  return {
    originClassId,
    wornArmorDef,
    allowanceDef,
    surcharge,
    armorMastered,
    blockedByMastery: surcharge > 0 && !armorMastered,
  };
}
