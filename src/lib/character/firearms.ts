/**
 * Autorisation EFFECTIVE des armes à feu (PER-185, cf. `docs/adr/0001-firearms-rule-effective-gating.md`).
 *
 * Deux valeurs cohabitent et la valeur utilisée partout est **dérivée** de leur
 * conjonction :
 *  - `campaign.rules.firearmsAllowed` : la poudre EXISTE-t-elle dans cet univers
 *    (disponibilité d'option, éditable par le MJ) ;
 *  - `Character.firearmsAllowed` (*snapshot*) : le choix du joueur à la création,
 *    verrouillé après.
 *
 * `firearmsEffective = character.firearmsAllowed ∧ campaign.rules.firearmsAllowed`.
 * Campagne absente/« Non attribué » ⇒ la règle campagne vaut `true` (comportement
 * historique : la poudre est disponible), donc l'effectif suit le seul snapshot.
 * On ne mute JAMAIS le personnage : interdire la poudre après coup fait basculer
 * l'effectif d'un Arquebusier à `false` (il s'affiche « Arbalétrier »), rebasculer
 * la campagne à `true` restaure l'Arquebusier. Un Arbalétrier (snapshot `false`)
 * reste Arbalétrier quelle que soit la campagne.
 */
import { equipmentById } from '@/data';
import type { EquipmentItem } from '@/data/schema';
import type { Campaign } from '@/lib/campaign/types';
import type { Character } from './types';

/**
 * L'objet est-il une arme à poudre ? (PER-197) DÉTECTION DATA-DRIVEN : dérivée du
 * sous-type d'arme à distance `rangedKind: 'firearm'` (PER-115), la représentation
 * officielle de la catégorie « poudre », et NON d'une liste d'ids codée en dur.
 *
 * L'arme à feu (mousquet, pétoire) et son équivalent arbalète (arbalète lourde, arbalète
 * de poing) sont des objets de catalogue DISTINCTS (p. 62) : seule l'arme à feu porte
 * `rangedKind: 'firearm'`, maîtrisée par le seul profil poudrier quand la poudre est
 * autorisée (p. 185) ; interdite, elle se remplace à la main par l'arbalète correspondante
 * (accès à distance normal). Source unique partagée par la légalité (`checkCompliance`) et
 * la maîtrise des armes (PER-79).
 */
export function isFirearmItem(item: EquipmentItem | undefined | null): boolean {
  return item?.category === 'weapon' && item.rangedKind === 'firearm';
}

/**
 * Idem à partir d'un id du catalogue : résout l'objet de BASE puis lit son sous-type.
 * Le sous-type n'est jamais surchargé par une variante (cf. `items.ts`), donc l'identité
 * « arme à feu » se lit toujours sur la base — inutile de passer par `effectiveItem`.
 */
export function isFirearmItemId(itemId: string): boolean {
  return isFirearmItem(equipmentById.get(itemId));
}

export function firearmsEffective(
  character: Pick<Character, 'firearmsAllowed'>,
  campaign: Campaign | null | undefined,
): boolean {
  const campaignAllows = campaign ? campaign.rules.firearmsAllowed : true;
  return character.firearmsAllowed && campaignAllows;
}
