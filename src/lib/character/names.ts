/**
 * Générateur de nom simple, alimenté par la section « Noms typiques » de chaque
 * peuple (cf. `Ancestry.names`). Tire au hasard dans les listes du livre, en
 * tenant compte du sexe, et applique les rares règles de composition que le
 * livre décrit sans fournir de liste (demi-elfe, nom de famille halfelin).
 */

import { ancestryById } from '@/data';
import type { Ancestry, AncestryNames } from '@/data/schema';
import type { Sex } from './types';

/** Élément au hasard d'un tableau, ou `undefined` si le tableau est vide. */
function sample<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Prénoms candidats selon le sexe : la liste correspondante, ou les deux
 * fusionnées quand le sexe n'est pas précisé.
 */
function pool(names: Pick<AncestryNames, 'male' | 'female'>, sex: Sex | undefined): string[] {
  if (sex === 'male') return names.male;
  if (sex === 'female') return names.female;
  return [...names.male, ...names.female];
}

/**
 * Tire un nom au hasard pour un peuple et un sexe donnés. Renvoie `null` si
 * aucune proposition n'est disponible (ne devrait survenir qu'avec des données
 * incomplètes).
 */
export function pickName(ancestry: Ancestry, sex: Sex | undefined): string | null {
  // Demi-elfe : pas de liste propre — prénom elfique (haut ou sylvain) accolé à
  // un nom humain (p. 46).
  if (ancestry.id === 'demi-elfe') {
    const elfHigh = ancestryById.get('elfe-haut')?.names;
    const elfWood = ancestryById.get('elfe-sylvain')?.names;
    const human = ancestryById.get('humain')?.names;
    const given = sample([
      ...(elfHigh ? pool(elfHigh, sex) : []),
      ...(elfWood ? pool(elfWood, sex) : []),
    ]);
    if (!given) return null;
    const surname = human ? sample([...human.male, ...human.female]) : undefined;
    return surname ? `${given} ${surname}` : given;
  }

  const given = sample(pool(ancestry.names, sex));
  if (!given) return null;

  // Halfelin : prénom + nom de famille lié au lieu de naissance (p. 54-55).
  const surname = ancestry.names.surnames ? sample(ancestry.names.surnames) : undefined;
  return surname ? `${given} ${surname}` : given;
}
