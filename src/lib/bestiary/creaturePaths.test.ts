/**
 * Tests de la résolution PURE des voies de créature (`resolvePath`).
 *
 * OBJECTIF PRINCIPAL — figer la RÈGLE (confirmée par le propriétaire, 2026-07-27) :
 * « Voie X rang N » sur un profil de créature, quand elle désigne une VOIE DE PROFIL de
 * joueur, = la voie ENTIÈRE jusqu'au rang N, donc les capacités des rangs 1..N (comme un
 * personnage qui atteint le rang N). Ce test cassera si quelqu'un restreint au seul rang
 * (filtre `===` au lieu de `<=`).
 *
 * Ancré sur la voie RÉELLE de l'aberratus (« Voie des illusions rang 5 », ensorceleur,
 * p. 95-96) : 5 capacités (rangs 1 à 5), « Exécution mentale » (rang 5, p. 96) incluse.
 */
import { describe, expect, it } from 'vitest';
import { resolvePath } from './creaturePaths';

describe('resolvePath', () => {
  it('rang 5 donne toute la voie, rangs 1 à 5', () => {
    const resolved = resolvePath({ pathId: 'illusions', rank: 5 });
    expect(resolved).not.toBeNull();
    // La voie des illusions compte 5 rangs → 5 capacités résolues au rang 5.
    expect(resolved!.features.map((f) => f.rank)).toEqual([1, 2, 3, 4, 5]);
    // Aucune capacité au-delà du rang demandé.
    expect(resolved!.features.every((f) => f.rank <= 5)).toBe(true);
  });

  it('rang N ne remonte pas au-delà de N', () => {
    // Rang 2 → seulement les rangs 1 et 2 (jamais 3+).
    const resolved = resolvePath({ pathId: 'illusions', rank: 2 });
    expect(resolved!.features.map((f) => f.rank)).toEqual([1, 2]);
    expect(resolved!.features.some((f) => f.rank > 2)).toBe(false);
  });

  it('capacités triées par rang croissant', () => {
    const ranks = resolvePath({ pathId: 'illusions', rank: 5 })!.features.map((f) => f.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it('nom canonique de la voie résolu depuis les données', () => {
    expect(resolvePath({ pathId: 'illusions', rank: 5 })!.name).toBe('Voie des illusions');
  });

  it('la source du titre pointe le DÉBUT de la voie', () => {
    // Le renvoi du titre pointe la page de début de voie (`Path.sourcePage`, p. 95),
    // pas la page d'une capacité en particulier — le bloc liste tous les rangs.
    expect(resolvePath({ pathId: 'illusions', rank: 5 })!.sourcePage).toBe(95);
  });

  it("voie inconnue → null (on n'invente rien)", () => {
    expect(resolvePath({ pathId: 'voie-inexistante', rank: 5 })).toBeNull();
  });
});
