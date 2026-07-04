/**
 * Nom d'affichage d'un profil selon l'autorisation des armes à feu.
 *
 * L'arquebusier privé de poudre (armes à feu interdites dans l'univers, p. 62)
 * combat à l'arbalète et prend le nom d'« Arbalétrier » (`nameWithoutFirearms`).
 * Le nom du profil doit donc suivre le réglage `Character.firearmsAllowed`
 * partout où il est présenté comme LIBELLÉ (liste, wizard, en-tête de fiche) — la
 * prose verbatim des capacités, elle, n'est pas altérée.
 */
import type { CharacterClass } from '@/data/schema';
import { classById } from '@/data';
import type { Character } from './types';

/**
 * Libellé du profil `cls` compte tenu de l'autorisation des armes à feu. On ne
 * bascule sur le nom alternatif que si les armes à feu sont EXPLICITEMENT
 * interdites (`false`) et que le profil déclare un `nameWithoutFirearms` ;
 * `true`/absence de valeur → nom standard.
 */
export function classDisplayName(cls: CharacterClass, firearmsAllowed: boolean): string {
  return firearmsAllowed === false && cls.nameWithoutFirearms ? cls.nameWithoutFirearms : cls.name;
}

/** Libellé du profil d'un personnage (résout l'id + applique `firearmsAllowed`). */
export function characterClassName(character: Character, fallback = '—'): string {
  const cls = classById.get(character.classId);
  return cls ? classDisplayName(cls, character.firearmsAllowed) : fallback;
}
