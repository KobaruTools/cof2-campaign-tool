/**
 * Combat à deux armes (PER-116) — module pur (couplé au catalogue figé `@/data`,
 * comme `mastery.ts`, mais sans dépendance à l'UI).
 *
 * Règle générale (p. 215, verbatim) : « Combat à deux armes (L) : attaquer avec une
 * arme dans chaque main est une action limitée. Chacune des deux attaques subit un
 * DÉ MALUS au test d'attaque et inflige des DM normaux. Un combattant à deux armes doit
 * manier une arme peu encombrante dans sa main faible (maxi 1d6 DM). » Le moteur ne
 * résout aucun jet (les dés sont lancés à la vraie table) : il se borne à SIGNALER que
 * tenir une arme dans chaque main impose un dé malus (comme l'indicateur de maîtrise,
 * PER-79).
 *
 * Exception — Combattant héroïque (rôdeur, `combat-a-deux-armes-r4`), OPTION FOR
 * (p. 73, verbatim) : « peut désormais attaquer avec la même arme dans la main
 * secondaire sans subir de dé malus (par exemple deux épées longues). » Quand cette
 * option est retenue ET que le personnage tient la MÊME arme (même objet de base) dans
 * les deux mains, le dé malus du combat à deux armes ne s'applique pas.
 *
 * HORS PÉRIMÈTRE pour l'instant : la contrainte « main faible ≤ 1d6 DM » (p. 215) et
 * les autres capacités de la voie du combat à deux armes (Attaque à suivre, Droite -
 * gauche : dé malus SITUATIONNEL sur une attaque gratuite précise) relèvent du
 * résolveur de combat / Écran MJ. La contrainte de main faible dépend en outre du
 * modèle structuré de dégâts (PER-217), encore en cours de migration.
 */
import { equipmentById } from '@/data';
import { wornWeaponIsTwoHanded } from './equipment';
import { getSelection } from './choices';
import { isCustomItem } from './types';
import type { Character } from './types';

/** Capacité Combattant héroïque (rôdeur) qui porte l'exception au dé malus (p. 73). */
const HEROIC_FIGHTER_FEATURE_ID = 'combat-a-deux-armes-r4';

/** Statut de combat à deux armes d'un personnage, tel que SIGNALÉ par le moteur. */
export interface TwoWeaponCombatStatus {
  /**
   * Le personnage tient une arme (à une main) dans CHAQUE main — main principale ET
   * main secondaire — donc combat à deux armes engagé (p. 215). Faux dès qu'une main
   * est libre, tient un bouclier, ou qu'une arme occupe les deux mains.
   */
  dualWielding: boolean;
  /**
   * L'exemption Combattant héroïque (option FOR + MÊME arme dans les deux mains, p. 73)
   * s'applique-t-elle ? Implique `dualWielding`.
   */
  heroicSameWeaponExempt: boolean;
  /**
   * Le combat à deux armes impose-t-il un dé malus en attaque, APRÈS exemption ? Vrai
   * dès que `dualWielding` et que l'exemption ne joue pas.
   */
  penaltyDie: boolean;
}

const NO_TWO_WEAPON_COMBAT: TwoWeaponCombatStatus = {
  dualWielding: false,
  heroicSameWeaponExempt: false,
  penaltyDie: false,
};

/**
 * Statut de combat à deux armes du personnage (p. 215 + exception p. 73). Ne lit que le
 * PORTÉ (`worn`) : deux armes du catalogue tenues, une par main. Les objets
 * personnalisés (stats/catégorie inconnues) ne comptent pas comme armes. Fonction pure.
 */
export function twoWeaponCombatStatus(character: Character): TwoWeaponCombatStatus {
  let mainHandWeaponId: string | null = null;
  let offHandWeaponId: string | null = null;

  for (const line of character.equipment) {
    if (isCustomItem(line) || !line.worn) continue;
    const item = equipmentById.get(line.itemId);
    if (item?.category !== 'weapon') continue;
    if (line.worn.slot === 'mainHand') {
      // Une arme tenue à deux mains occupe les deux mains : pas de combat à deux armes
      // (une seconde arme en main serait de toute façon un conflit de mains, cf.
      // `equipConflicts`).
      if (wornWeaponIsTwoHanded(line)) return NO_TWO_WEAPON_COMBAT;
      mainHandWeaponId = line.itemId;
    } else if (line.worn.slot === 'offHand') {
      offHandWeaponId = line.itemId;
    }
  }

  if (mainHandWeaponId === null || offHandWeaponId === null) return NO_TWO_WEAPON_COMBAT;

  // « Même arme » = même objet de base (ex. deux épées longues). Une variante (PER-211)
  // d'un objet garde son `itemId` de base : deux variantes de la même arme restent « la
  // même arme » au sens de l'exception.
  const sameWeapon = mainHandWeaponId === offHandWeaponId;
  const heroicForOption =
    character.featureIds.includes(HEROIC_FIGHTER_FEATURE_ID) &&
    getSelection(character, HEROIC_FIGHTER_FEATURE_ID, 0) === 'FOR';
  const heroicSameWeaponExempt = sameWeapon && heroicForOption;

  return {
    dualWielding: true,
    heroicSameWeaponExempt,
    penaltyDie: !heroicSameWeaponExempt,
  };
}
