import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import { formatUnarmedDamage, unarmedStrike } from './unarmedStrike';

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'guerrier',
    level: 5,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: null,
    playerId: null,
    status: 'active',
    abilities: { AGI: 2, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 4 },
    baseAbilities: { AGI: 2, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 4 },
    ancestryChoices: [],
    ancestryPathId: 'humain',
    featureIds: [],
    featureChoices: {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    depletion: {},
    purse: { platinum: 0, gold: 0, silver: 0, copper: 0 },
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('unarmedStrike — cas commun (n\'importe quel personnage)', () => {
  it('DM de base 1d3 + FOR, contondants, non létal (p. 183/219)', () => {
    const v = unarmedStrike(makeCharacter());
    expect(v.damage).toEqual({ count: 1, die: 'd3', nonLethal: true });
    expect(v.damageAbilities).toEqual(['FOR']);
    expect(v.lethality).toBe('non-lethal');
    expect(v.magical).toBe(false);
    expect(v.evolving).toBe(false);
    expect(v.minRollBecomesMax).toBe(false);
    expect(v.damageTypeChoice).toBe(false);
    expect(v.criticalRangeBonus).toBe(0);
    expect(v.sources).toEqual([]);
  });

  it('formatage : « 1d3 + FOR »', () => {
    expect(formatUnarmedDamage(unarmedStrike(makeCharacter()))).toBe('1d3 + FOR');
  });
});

describe('unarmedStrike — moine', () => {
  it('sans capacité de poing : DM létaux AU CHOIX (trait de profil, p. 119)', () => {
    const v = unarmedStrike(makeCharacter({ classId: 'moine', featureIds: ['meditation-r1'] }));
    expect(v.lethality).toBe('choice');
    // Le dé de base reste 1d3 tant que Poings de fer n'est pas pris.
    expect(v.damage).toEqual({ count: 1, die: 'd3', nonLethal: false });
    expect(v.damageAbilities).toEqual(['FOR']);
  });

  it('Poings de fer rang 1 : 1d6 + FOR/AGI, létaux (p. 121)', () => {
    const v = unarmedStrike(makeCharacter({ classId: 'moine', featureIds: ['poing-r1'] }));
    expect(v.damage).toEqual({ count: 1, die: 'd6', nonLethal: false });
    expect(v.damageAbilities).toEqual(['FOR', 'AGI']);
    expect(v.lethality).toBe('lethal');
    expect(v.sources).toContainEqual({ featureId: 'poing-r1', name: 'Poings de fer' });
    expect(formatUnarmedDamage(v)).toBe('1d6 + FOR/AGI');
  });

  it('Poings de fer : escalade du dé par rang de la voie du poing (2d6 au rang 5)', () => {
    const v = unarmedStrike(
      makeCharacter({ classId: 'moine', featureIds: ['poing-r1', 'poing-r2', 'poing-r3', 'poing-r4', 'poing-r5'] }),
    );
    expect(v.damage).toEqual({ count: 2, die: 'd6', nonLethal: false });
    expect(formatUnarmedDamage(v)).toBe('2d6 + FOR/AGI');
  });

  it('Mains d\'énergie : attaques magiques, FOR→VOL possible aux DM (p. 119)', () => {
    const v = unarmedStrike(makeCharacter({ classId: 'moine', featureIds: ['energie-vitale-r1'] }));
    expect(v.magical).toBe(true);
    expect(v.damageAbilities).toEqual(['FOR', 'VOL']);
    expect(v.lethality).toBe('choice');
    expect(formatUnarmedDamage(v)).toBe('1d3 + FOR/VOL');
  });

  it('Poings de fer + Mains d\'énergie : best-of FOR/AGI/VOL, magique, létal', () => {
    const v = unarmedStrike(makeCharacter({ classId: 'moine', featureIds: ['poing-r1', 'energie-vitale-r1'] }));
    expect(v.damage.die).toBe('d6');
    expect(v.damageAbilities).toEqual(['FOR', 'AGI', 'VOL']);
    expect(v.magical).toBe(true);
    expect(v.lethality).toBe('lethal');
    expect(formatUnarmedDamage(v)).toBe('1d6 + FOR/AGI/VOL');
  });

  it('Griffes du tigre : 1 au dé → max, choix du type de DM (p. 119)', () => {
    const v = unarmedStrike(makeCharacter({ classId: 'moine', featureIds: ['maitrise-r2'] }));
    expect(v.minRollBecomesMax).toBe(true);
    expect(v.damageTypeChoice).toBe(true);
  });

  it('Morsure du serpent : plage de critique au contact +1 à mains nues (p. 119)', () => {
    const v = unarmedStrike(makeCharacter({ classId: 'moine', featureIds: ['maitrise-r3'] }));
    expect(v.criticalRangeBonus).toBe(1);
  });
});

describe('unarmedStrike — arquebusier', () => {
  it('Pilier de bar : 1d4° non létal, sans carac (p. 64)', () => {
    const v = unarmedStrike(makeCharacter({ classId: 'arquebusier', featureIds: ['mercenaire-r1'] }));
    expect(v.damage).toEqual({ count: 1, die: 'd4', nonLethal: true });
    expect(v.evolving).toBe(true);
    expect(v.damageAbilities).toEqual([]);
    expect(v.lethality).toBe('non-lethal');
    expect(v.sources).toContainEqual({ featureId: 'mercenaire-r1', name: 'Pilier de bar' });
    expect(formatUnarmedDamage(v)).toBe('1d4°');
  });
});
