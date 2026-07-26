/**
 * Tests de la résolution PURE des voies de créature (`resolvePath`).
 *
 * OBJECTIF PRINCIPAL — figer la RÈGLE (confirmée par les auteurs, Discord officiel
 * 2026-07-27) : « Voie X rang N » sur un profil de créature = la SEULE capacité de
 * rang N, PAS les rangs 1..N. Ce test cassera si quelqu'un réintroduit la faute
 * (filtre `<=` au lieu de `===`) — le garde-fou qui protège les ~140 créatures du
 * bestiaire d'une régression silencieuse à la prochaine implémentation.
 *
 * Ancré sur la voie RÉELLE de l'aberratus (« Voie des illusions rang 5 », ensorceleur,
 * p. 95-96) : capacité de rang 5 = « Exécution mentale » (p. 96), rangs 1-4 en amont.
 */
import { describe, expect, it } from 'vitest';
import { resolvePath } from './creaturePaths';

describe('resolvePath', () => {
  it('rang 5 ne donne QUE la capacité de rang 5, jamais les rangs 1..4', () => {
    const resolved = resolvePath({ pathId: 'illusions', rank: 5 });
    expect(resolved).not.toBeNull();
    // Au moins une capacité (sinon on a tout cassé au lieu de restreindre au bon rang).
    expect(resolved!.features.length).toBeGreaterThanOrEqual(1);
    // Le cœur de la règle : toutes les capacités résolues sont EXACTEMENT au rang 5.
    expect(resolved!.features.every((f) => f.rank === 5)).toBe(true);
    // Anti-régression explicite contre le retour à `<=` : aucune capacité de rang inférieur.
    expect(resolved!.features.some((f) => f.rank < 5)).toBe(false);
  });

  it('la voie des illusions a bien plus de capacités que celle du seul rang 5', () => {
    // Prouve que la restriction est réelle : la voie complète (1..5) compte davantage de
    // capacités que ce que `rank: 5` renvoie — donc on ne déroule pas toute la voie.
    const rank5 = resolvePath({ pathId: 'illusions', rank: 5 })!;
    const allRanks = [1, 2, 3, 4, 5].flatMap(
      (rank) => resolvePath({ pathId: 'illusions', rank })!.features,
    );
    expect(allRanks.length).toBeGreaterThan(rank5.features.length);
  });

  it('nom canonique de la voie résolu depuis les données', () => {
    const resolved = resolvePath({ pathId: 'illusions', rank: 5 });
    expect(resolved!.name).toBe('Voie des illusions');
  });

  it('la source pointe la capacité du rang, pas le début de la voie', () => {
    // « Exécution mentale » (rang 5) est p. 96, alors que le rang 1 de la voie est p. 95 :
    // la page suit la capacité affichée, ce qui corrige l'ancien renvoi au début de voie.
    expect(resolvePath({ pathId: 'illusions', rank: 5 })!.sourcePage).toBe(96);
    expect(resolvePath({ pathId: 'illusions', rank: 1 })!.sourcePage).toBe(95);
  });

  it('voie inconnue → null (on n\'invente rien)', () => {
    expect(resolvePath({ pathId: 'voie-inexistante', rank: 5 })).toBeNull();
  });
});
