/**
 * Détail (« breakdown ») d'une caractéristique pour l'affichage : valeur de base
 * saisie à la création + modificateur(s) apporté(s) par le peuple = total. Pur
 * UI, à l'image de `derivedStatBreakdown` pour les statistiques dérivées. La
 * page citée renvoie à la table « Modificateur de peuple » du livre de base CO2.
 */
import type { AbilityId, Ancestry } from '@/data/schema';
import type { AncestryChoice } from '@/lib/character/ancestry';
import type { BreakdownTerm, StatBreakdown } from './derivedStatBreakdown';

const sum = (terms: BreakdownTerm[]) => terms.reduce((acc, t) => acc + t.value, 0);

/**
 * Construit le détail d'une caractéristique : la valeur de base, puis chaque
 * modificateur de peuple qui cible cette caractéristique (résolu via `choices`
 * pour les modificateurs « au choix »). Le total vaut la valeur finale affichée.
 */
export function abilityBreakdown(
  abilityId: AbilityId,
  baseAbilities: Record<AbilityId, number>,
  ancestry: Ancestry,
  choices: AncestryChoice,
): StatBreakdown {
  const terms: BreakdownTerm[] = [{ label: 'Valeur de base', value: baseAbilities[abilityId] ?? 0 }];

  ancestry.abilityModifiers.forEach((mod, i) => {
    const target = mod.abilities.length === 1 ? mod.abilities[0] : choices[i];
    if (target === abilityId) {
      terms.push({ label: `Peuple (${ancestry.name})`, value: mod.value });
    }
  });

  return { terms, total: sum(terms), page: 28 };
}
