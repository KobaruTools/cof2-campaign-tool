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
import type { Campaign } from '@/lib/campaign/types';
import type { Character } from './types';

export function firearmsEffective(
  character: Pick<Character, 'firearmsAllowed'>,
  campaign: Campaign | null | undefined,
): boolean {
  const campaignAllows = campaign ? campaign.rules.firearmsAllowed : true;
  return character.firearmsAllowed && campaignAllows;
}
