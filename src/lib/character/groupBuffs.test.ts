import { describe, expect, it } from 'vitest';
import {
  groupBuffIntensityFor,
  groupBuffsOf,
  unlockedGroupBuffIds,
} from './groupBuffs';

// Voie du musicien (barde, p. 67) : `musicien-r1` = Chant des héros, `musicien-r5` = rang 5 atteint.
const BARD_R1 = ['musicien-r1'];
const BARD_R5 = ['musicien-r1', 'musicien-r2', 'musicien-r3', 'musicien-r4', 'musicien-r5'];
// Voie de la prière (prêtre, p. 124) : `priere-r1` = Bénédiction.
const PRIEST_R1 = ['priere-r1'];

describe('groupBuffsOf', () => {
  it('reconnaît le Chant des héros porté par musicien-r1', () => {
    expect(groupBuffsOf(BARD_R1)).toEqual([
      { buffId: 'heroes-song', featureId: 'musicien-r1', pathRank: 1, intensity: 1 },
    ]);
  });

  it('au rang 5 de la voie, le palier pré-rempli passe à 2 (« +2 au rang 5 »)', () => {
    expect(groupBuffsOf(BARD_R5)).toEqual([
      { buffId: 'heroes-song', featureId: 'musicien-r1', pathRank: 5, intensity: 2 },
    ]);
  });

  it('c’est le rang ATTEINT dans la voie qui compte, pas le rang de la capacité', () => {
    // Rangs 1 et 3 seulement : le palier reste à +1.
    expect(groupBuffsOf(['musicien-r1', 'musicien-r3'])[0].intensity).toBe(1);
  });

  it('un personnage sans capacité porteuse ne confère aucun buff', () => {
    expect(groupBuffsOf(['guerrier-r1', 'combat-r2'])).toEqual([]);
    expect(groupBuffsOf([])).toEqual([]);
  });

  it('un barde-prêtre porte les deux buffs, dans l’ordre du catalogue', () => {
    expect(groupBuffsOf([...PRIEST_R1, ...BARD_R1]).map((c) => c.buffId)).toEqual([
      'heroes-song',
      'blessing',
    ]);
  });
});

describe('unlockedGroupBuffIds (gating de la palette)', () => {
  it('collecte les buffs de toute la table, dédupliqués, dans l’ordre du catalogue', () => {
    expect(
      unlockedGroupBuffIds([
        { featureIds: PRIEST_R1 },
        { featureIds: BARD_R5 },
        { featureIds: BARD_R1 },
      ]),
    ).toEqual(['heroes-song', 'blessing']);
  });

  it('table sans barde ni prêtre : aucune puce à proposer', () => {
    expect(unlockedGroupBuffIds([{ featureIds: ['guerrier-r1'] }])).toEqual([]);
    expect(unlockedGroupBuffIds([])).toEqual([]);
  });
});

describe('groupBuffIntensityFor (pré-remplissage du palier)', () => {
  it('rend le palier du porteur pour le buff visé', () => {
    expect(groupBuffIntensityFor(BARD_R1, 'heroes-song')).toBe(1);
    expect(groupBuffIntensityFor(BARD_R5, 'heroes-song')).toBe(2);
    expect(groupBuffIntensityFor(PRIEST_R1, 'blessing')).toBe(1);
  });

  it('retombe sur 1 quand le combattant ne porte pas ce buff (créature alliée, autre profil)', () => {
    expect(groupBuffIntensityFor(BARD_R5, 'blessing')).toBe(1);
    expect(groupBuffIntensityFor([], 'heroes-song')).toBe(1);
  });
});
