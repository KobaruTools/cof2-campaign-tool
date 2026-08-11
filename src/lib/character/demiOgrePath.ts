/**
 * Notes d'affichage de la voie du demi-ogre (PER-325, Le Compagnon p. 13) — r4 « Toujours plus lourd ».
 *
 * « Lorsqu'il utilise une arme de cette façon, il ignore la RD imposée par les créatures de grande
 * taille » : un effet qui porte sur la RD d'un TIERS (l'adversaire), jamais un modificateur chiffré sur
 * la fiche du porteur — même nature d'affichage informatif que la RD ou la note « DM ÷2 » de
 * l'élémentaliste. Rendu en badge SITUATIONNEL (ambre) sur les cartes d'attaque, avec un renvoi vers la
 * règle des créatures de grande taille (p. 206). Fonctions PURES et testables, au patron de
 * `flayerPath.ts` / `elementalistPath.ts`.
 */
import type { FeatureEffectNote } from '@/components/sheet/FeatureEffectBadge';
import { wornRangedWeapon } from '@/lib/character/equipment';
import type { Character } from '@/lib/character/types';

const R4 = 'demi-ogre-r4';

/** Note « ignore la RD des créatures de grande taille » commune aux cartes de contact et à distance. */
function ignoreLargeCreatureRdNote(): FeatureEffectNote {
  return {
    featureId: R4,
    icon: 'ignore-rd',
    label: 'Ignore RD (grande taille)',
    // SITUATIONNEL (ne joue que contre une créature de grande taille) → ambre, comme les autres
    // rappels conditionnés à un déclencheur précis sur ces cartes.
    color: 'warning',
    // Contact ARME comme mains nues (aucun `weaponOnly`) — le demi-ogre frappe fort quelle que soit l'arme.
    reminder:
      'Ignore la réduction de dégâts (RD) imposée par les créatures de grande taille (voie des créatures colossales).',
    sourcePage: 206,
  };
}

/**
 * Carte « Attaque au contact » (arme équipée OU mains nues) : la note apparaît dès que le demi-ogre a
 * acquis le rang 4. `[]` sinon.
 */
export function demiOgreMeleeAttackNotes(character: Character): FeatureEffectNote[] {
  return character.featureIds.includes(R4) ? [ignoreLargeCreatureRdNote()] : [];
}

/**
 * Carte « Attaque à distance » : la note n'apparaît que si le demi-ogre a le rang 4 ET qu'une arme à
 * distance est réellement portée (la carte à distance n'existe pas sinon). `[]` sinon.
 */
export function demiOgreRangedAttackNotes(character: Character): FeatureEffectNote[] {
  if (!character.featureIds.includes(R4)) return [];
  return wornRangedWeapon(character.equipment ?? []) ? [ignoreLargeCreatureRdNote()] : [];
}
