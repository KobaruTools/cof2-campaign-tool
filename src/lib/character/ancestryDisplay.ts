/**
 * Nom d'affichage d'un peuple selon le genre du personnage (PER-518).
 *
 * Miroir de `classDisplayName` (cf. `classDisplay.ts`) côté peuple : un
 * personnage dont `Identity.sex === 'female'` voit le nom féminin du peuple
 * (`Ancestry.nameFeminine`) quand il en déclare un — sinon repli sur le nom
 * épicène. `sex` absent/`male` → nom masculin, comportement inchangé.
 */
import type { Ancestry } from '@/data/schema';
import { ancestryById } from '@/data';
import type { Character, Sex } from './types';

/** Libellé du peuple `ancestry` compte tenu du genre `sex`. */
export function ancestryDisplayName(ancestry: Ancestry, sex?: Sex): string {
  if (sex !== 'female') return ancestry.name;
  return ancestry.nameFeminine ?? ancestry.name;
}

/** Libellé du peuple d'un personnage (résout l'id + applique son genre). */
export function characterAncestryName(character: Character, fallback = '—'): string {
  const ancestry = ancestryById.get(character.ancestryId);
  return ancestry ? ancestryDisplayName(ancestry, character.identity.sex) : fallback;
}

/**
 * Libellé du peuple d'un PNJ du MJ (`ancestryId`/`sex` optionnels, cf.
 * `CampaignNpc`) — `null` si le peuple n'est pas renseigné ou inconnu.
 */
export function npcAncestryName(
  ancestryId: string | null | undefined,
  sex?: Sex | null,
): string | null {
  if (!ancestryId) return null;
  const ancestry = ancestryById.get(ancestryId);
  return ancestry ? ancestryDisplayName(ancestry, sex ?? undefined) : null;
}
