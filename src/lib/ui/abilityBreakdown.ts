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

/** Modificateur de carac apporté par une capacité, pour le détail (ex. « +1 — Endurer »). */
export interface AbilityFeatureTerm {
  /** Nom de la capacité source (français). */
  name: string;
  value: number;
  /** Id de la capacité source → puce de voie dans le détail (PER-73). */
  featureId?: string;
}

/**
 * Construit le détail d'une caractéristique : la valeur de base, chaque modificateur
 * de peuple qui cible cette caractéristique (résolu via `choices` pour les
 * modificateurs « au choix »), puis les modificateurs PERMANENTS apportés par les
 * capacités (`featureTerms`, ex. « +1 en CON » d'Endurer). Le total vaut la valeur
 * finale affichée.
 */
export function abilityBreakdown(
  abilityId: AbilityId,
  baseAbilities: Record<AbilityId, number>,
  ancestry: Ancestry,
  choices: AncestryChoice,
  featureTerms: AbilityFeatureTerm[] = [],
): StatBreakdown {
  const terms: BreakdownTerm[] = [{ label: 'Valeur de base', value: baseAbilities[abilityId] ?? 0 }];

  ancestry.abilityModifiers.forEach((mod, i) => {
    const target = mod.abilities.length === 1 ? mod.abilities[0] : choices[i];
    if (target === abilityId) {
      terms.push({ label: `Peuple (${ancestry.name})`, value: mod.value });
    }
  });

  for (const ft of featureTerms) {
    // Libellé = nom de la capacité ; la PROVENANCE (voie) est portée par la puce de voie
    // (`CapabilityChip`) rendue sous le libellé quand `featureId` est présent (PER-73).
    terms.push({ label: ft.name, value: ft.value, featureId: ft.featureId });
  }

  return { terms, total: sum(terms), page: 28 };
}
