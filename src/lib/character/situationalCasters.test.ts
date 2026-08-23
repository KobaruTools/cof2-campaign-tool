import { describe, expect, it } from 'vitest';
import { situationalEffectCasters } from './situationalCasters';
import { createBlankCharacter } from './factory';
import type { Character } from './types';

// `prestige-vermines-r5` (voie des vermines, p. 175) confère « Nuée de criquets » (`locust-swarm`).
const makeChar = (overrides: Partial<Character>): Character => ({
  ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }),
  ...overrides,
});

describe('situationalEffectCasters (PER-446)', () => {
  it('retient le personnage réclamé qui possède la capacité porteuse', () => {
    const scorpion = makeChar({
      id: 'c-1',
      name: 'Ixis',
      featureIds: ['prestige-vermines-r5'],
      abilities: { ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }).abilities, CHA: 3 },
    });
    expect(situationalEffectCasters([scorpion], 'locust-swarm')).toEqual([
      { id: 'c-1', name: 'Ixis', abilities: scorpion.abilities },
    ]);
  });

  it('vide si personne à la table ne porte la capacité', () => {
    const guerrier = makeChar({ id: 'c-2', name: 'Brask', featureIds: ['guerrier-r1'] });
    expect(situationalEffectCasters([guerrier], 'locust-swarm')).toEqual([]);
    expect(situationalEffectCasters([], 'locust-swarm')).toEqual([]);
  });

  it("vide pour un effet qu'aucune capacité ne confère (id inconnu du côté capacités)", () => {
    const scorpion = makeChar({ id: 'c-1', name: 'Ixis', featureIds: ['prestige-vermines-r5'] });
    expect(situationalEffectCasters([scorpion], 'silenced')).toEqual([]);
  });

  it('plusieurs personnages porteurs → tous candidats, dans l’ordre reçu', () => {
    const a = makeChar({ id: 'c-1', name: 'Ixis', featureIds: ['prestige-vermines-r5'] });
    const b = makeChar({ id: 'c-2', name: 'Nyx', featureIds: ['prestige-vermines-r5'] });
    expect(situationalEffectCasters([a, b], 'locust-swarm').map((c) => c.id)).toEqual(['c-1', 'c-2']);
  });
});
