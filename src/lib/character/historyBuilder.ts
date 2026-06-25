/**
 * Générateur d'historique de montée de niveau « pour de vrai » — pilote le moteur
 * de légalité (PER-70, recettage des persos de test).
 *
 * Beaucoup de personnages de test ont été remplis en bourrant `featureIds`, avec
 * un `levelUpHistory` réduit à la seule entrée de création (niveau 1). Le moteur
 * de PV lit cet historique pour savoir à quelle **famille** appartiennent les
 * capacités prises à chaque niveau (niveaux mixtes des hybrides, p. 177) ; sans
 * entrées pour les niveaux 2+, tout retombe sur la famille du profil principal et
 * les calculs sont faux.
 *
 * `packLevelUpHistory` reconstruit un historique **complet et légal** en simulant
 * une vraie progression : partant d'un personnage de niveau 1 (avec ses capacités
 * gratuites de création), il dépense `featurePointsPerLevel` (2) points à chaque
 * niveau via les mêmes helpers que le wizard (`applyLevelUp`, `canAcquireFeature`,
 * `featureCost`), jusqu'à acquérir l'ensemble visé. Aucune capacité n'est inventée :
 * le générateur ne pioche que dans `targetFeatureIds`.
 *
 * Stratégie : à chaque niveau, on acquiert les capacités **légalement** disponibles
 * en privilégiant le rang le plus bas (ordre des rangs, niveau minimal par rang,
 * déblocage du rang suivant). Le coût (rang 1-2 → 1 pt, rang 3+ → 2 pts, p. 39) est
 * respecté ; un point qu'on ne peut pas dépenser (ex. dernier point face à un seul
 * rang 3+ à 2 pts) reste **orphelin** — légal (p. 40) et signalé dans le résultat.
 */
import type { RulesContext } from '@/lib/engine';
import { canAcquireFeature, featureCost } from '@/lib/engine';
import { applyLevelUp } from './levelUp';
import type { Character } from './types';

export interface PackResult {
  /** Personnage promu jusqu'à `targetLevel`, historique complet et légal. */
  character: Character;
  /** Points de capacité laissés non dépensés (orphelins, p. 40) par niveau. */
  unspentByLevel: Record<number, number>;
}

/**
 * Reconstruit l'historique de montée de niveau de `base` (niveau 1) jusqu'à
 * `targetLevel` en acquérant exactement les capacités de `targetFeatureIds`.
 *
 * `base` doit déjà porter ses capacités gratuites de création (dans `featureIds`
 * ET dans l'entrée d'historique de niveau 1) ; elles sont considérées comme
 * acquises et ne sont jamais re-piochées. Lève une erreur si l'ensemble visé ne
 * peut pas être entièrement acquis dans la limite des niveaux/points (fixture
 * illégale) — le générateur ne produit jamais d'historique partiel silencieux.
 */
export function packLevelUpHistory(
  base: Character,
  targetFeatureIds: string[],
  targetLevel: number,
  ctx: RulesContext,
): PackResult {
  const pointsPerLevel = ctx.progression.featurePointsPerLevel;
  const cost = (id: string): number => {
    const f = ctx.featureById.get(id);
    return f ? featureCost(f, ctx.progression) : 0;
  };
  const rank = (id: string): number => ctx.featureById.get(id)?.rank ?? 0;
  const pathId = (id: string): string => ctx.featureById.get(id)?.pathId ?? '';

  let current = base;
  const remaining = new Set(targetFeatureIds.filter((id) => !current.featureIds.includes(id)));
  const unspentByLevel: Record<number, number> = {};

  while (current.level < targetLevel) {
    const level = current.level + 1;
    const picks: string[] = [];
    let budget = pointsPerLevel;

    // On remplit le niveau capacité par capacité : après chaque achat, le rang
    // suivant de la même voie peut devenir acquérable, d'où la ré-évaluation.
    for (;;) {
      // Personnage « sonde » au niveau visé, capacités déjà choisies ce niveau
      // incluses : c'est sur lui qu'on teste la légalité (ordre des rangs,
      // niveau minimal, déblocage du rang suivant).
      const probe: Character = {
        ...current,
        level,
        featureIds: [...current.featureIds, ...picks],
      };
      const candidate = [...remaining]
        .filter((id) => cost(id) <= budget)
        .filter((id) => canAcquireFeature(probe, id, ctx).legal)
        .sort((a, b) => rank(a) - rank(b) || cost(a) - cost(b) || pathId(a).localeCompare(pathId(b)))[0];
      if (!candidate) break;
      picks.push(candidate);
      budget -= cost(candidate);
      remaining.delete(candidate);
    }

    if (budget > 0) unspentByLevel[level] = budget;
    current = applyLevelUp(current, picks);
  }

  if (remaining.size > 0) {
    throw new Error(
      `Impossible d'acquérir toutes les capacités visées d'ici le niveau ${targetLevel} : ` +
        `il reste ${[...remaining].join(', ')} (fixture illégale ou ordre de rangs impossible).`,
    );
  }

  return { character: current, unspentByLevel };
}
