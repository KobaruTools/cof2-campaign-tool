import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import { createBlankCharacter } from './factory';
import type { Character, Depletion } from './types';
import { listCompanions, pruneCompanionDepletion, resolveCreatureMaxHp } from './companions';

/** Personnage de test : niveau + capacités + choix, le reste par défaut. */
function char(over: Partial<Character> = {}): Character {
  return { ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }), level: 5, ...over };
}

describe('listCompanions', () => {
  it('liste un compagnon débloqué (golem) avec sa clé = id du rang porteur', () => {
    const c = char({ classId: 'forgesort', featureIds: ['golem-r1', 'golem-r2'] });
    const companions = listCompanions(c);
    expect(companions).toHaveLength(1);
    expect(companions[0].key).toBe('golem-r2');
    expect(companions[0].profile.name).toBe('Golem');
    // Rang atteint dans la voie = 2 (plus haut rang acquis de la voie golem).
    expect(companions[0].pathRank).toBe(2);
  });

  it('aucun compagnon si aucun rang porteur de profil', () => {
    expect(listCompanions(char({ featureIds: ['golem-r1'] }))).toHaveLength(0);
    expect(listCompanions(char({ featureIds: [] }))).toHaveLength(0);
  });

  it('loup → Mâle alpha : le remplacement supplante le loup de base', () => {
    const loup = listCompanions(char({ classId: 'rodeur', featureIds: ['compagnon-animal-r1'] }));
    expect(loup.map((e) => e.profile.name)).toEqual(['Loup']);

    const alpha = listCompanions(
      char({ classId: 'rodeur', featureIds: ['compagnon-animal-r1', 'compagnon-animal-r4'] }),
    );
    expect(alpha).toHaveLength(1);
    expect(alpha[0].key).toBe('compagnon-animal-r4');
    expect(alpha[0].profile.name).toBe('Mâle alpha');
  });

  it('chevalier : la Monture fantastique (rang 5) supplante la Fidèle monture (rang 1)', () => {
    // Fidèle monture seule (rang 1).
    const fidele = listCompanions(char({ classId: 'chevalier', featureIds: ['cavalier-r1'] }));
    expect(fidele.map((e) => e.profile.name)).toEqual(['Fidèle monture']);

    // Rang 5 acquis mais option NON choisie → pas de profil effectif → on garde la Fidèle monture.
    const r5NoChoice = listCompanions(
      char({ classId: 'chevalier', featureIds: ['cavalier-r1', 'cavalier-r5'] }),
    );
    expect(r5NoChoice.map((e) => e.profile.name)).toEqual(['Fidèle monture']);

    // Rang 5 avec la monture choisie → un seul compagnon, la monture fantastique.
    const r5Chosen = listCompanions(
      char({
        classId: 'chevalier',
        featureIds: ['cavalier-r1', 'cavalier-r5'],
        featureChoices: { 'cavalier-r5': ['war-horse'] },
      }),
    );
    expect(r5Chosen).toHaveLength(1);
    expect(r5Chosen[0].key).toBe('cavalier-r5');
    expect(r5Chosen[0].profile.name).toBe('Cheval de guerre lourd');
  });

  it('écuyer : compagnon sans bloc de caractéristiques (grille masquée)', () => {
    const c = char({ classId: 'chevalier', featureIds: ['noblesse-r1', 'noblesse-r2'] });
    const companions = listCompanions(c);
    expect(companions).toHaveLength(1);
    expect(companions[0].profile.name).toBe('Écuyer');
    expect(companions[0].profile.abilities).toBeUndefined();
  });

  it('plusieurs compagnons de voies distinctes coexistent', () => {
    const c = char({ classId: 'chevalier', featureIds: ['cavalier-r1', 'noblesse-r2'] });
    const companions = listCompanions(c);
    expect(companions.map((e) => e.profile.name).sort()).toEqual(['Fidèle monture', 'Écuyer']);
  });
});

describe('resolveCreatureMaxHp', () => {
  it('résout une quantité niveau × N en nombre', () => {
    const golem = featureById.get('golem-r2')!.creatureProfile!;
    // [=niveau × 5] au niveau 5 → 25.
    expect(resolveCreatureMaxHp(golem, char().abilities, 5, 2)).toBe(25);
  });

  it('résout une constante + niveau × N (fidèle monture)', () => {
    const mount = featureById.get('cavalier-r1')!.creatureProfile!;
    // [=10 + niveau × 4] au niveau 5 → 30.
    expect(resolveCreatureMaxHp(mount, char().abilities, 5, 1)).toBe(30);
  });
});

describe('pruneCompanionDepletion', () => {
  it('purge un compagnon disparu et normalise les manques restants', () => {
    const c = char({ classId: 'forgesort', featureIds: ['golem-r1', 'golem-r2'] });
    const record: Record<string, Depletion> = {
      'golem-r2': { hp: { lethal: 4, temp: 0 } }, // compagnon vivant → conservé
      'cavalier-r1': { hp: { lethal: 3, temp: 0 } }, // compagnon absent → purgé
      'compagnon-animal-r4': { hp: { lethal: 0, temp: 0 } }, // absent + vide → purgé
    };
    expect(pruneCompanionDepletion(record, c)).toEqual({ 'golem-r2': { hp: { lethal: 4, temp: 0 } } });
  });

  it('retire une entrée redevenue pleine même pour un compagnon vivant', () => {
    const c = char({ classId: 'forgesort', featureIds: ['golem-r2'] });
    expect(pruneCompanionDepletion({ 'golem-r2': { hp: { lethal: 0, temp: 0 } } }, c)).toEqual({});
  });
});
