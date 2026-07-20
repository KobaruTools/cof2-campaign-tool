import { describe, expect, it } from 'vitest';
import { equipmentById } from '@/data';
import type { Weapon } from '@/data/schema';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import { weaponDamageBonuses } from './weaponDamageBonus';

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'rodeur',
    level: 5,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: null,
    playerId: null,
    status: 'active',
    abilities: { AGI: 3, CON: 2, FOR: 2, PER: 4, CHA: 0, INT: 0, VOL: 1 },
    baseAbilities: { AGI: 3, CON: 2, FOR: 2, PER: 4, CHA: 0, INT: 0, VOL: 1 },
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

const weapon = (id: string): Weapon => {
  const w = equipmentById.get(id);
  if (!w || w.category !== 'weapon') throw new Error(`arme de test introuvable : ${id}`);
  return w;
};

const arcLong = weapon('arc-long'); // rangedKind 'bow'
const arbaleteLegere = weapon('arbalete-legere'); // rangedKind 'crossbow'
const epeeLongue = weapon('epee-longue'); // arme de contact

describe('weaponDamageBonuses — règle de base (aucune capacité)', () => {
  it('sans capacité : aucun bonus, quel que soit le mode/arme', () => {
    const c = makeCharacter();
    expect(weaponDamageBonuses(c, 'ranged', arcLong)).toEqual({ addedAbilities: [], situational: [] });
    expect(weaponDamageBonuses(c, 'melee', epeeLongue)).toEqual({ addedAbilities: [], situational: [] });
  });
});

describe('weaponDamageBonuses — Archer émérite (+PER à l\'arc, permanent)', () => {
  const archer = makeCharacter({ featureIds: ['archer-r1'] });

  it('arc en main → +PER agrégé au DM à distance', () => {
    const r = weaponDamageBonuses(archer, 'ranged', arcLong);
    expect(r.addedAbilities).toHaveLength(1);
    expect(r.addedAbilities[0]).toMatchObject({ ability: 'PER', featureId: 'archer-r1' });
    expect(r.situational).toEqual([]);
  });

  it('arbalète en main → PAS de bonus (arc seulement)', () => {
    expect(weaponDamageBonuses(archer, 'ranged', arbaleteLegere).addedAbilities).toEqual([]);
  });

  it('aucune arme à distance → PAS de bonus', () => {
    expect(weaponDamageBonuses(archer, 'ranged', null).addedAbilities).toEqual([]);
  });

  it('mode contact → PAS de bonus (bonus à distance)', () => {
    expect(weaponDamageBonuses(archer, 'melee', epeeLongue).addedAbilities).toEqual([]);
  });
});

describe('weaponDamageBonuses — Attaque éclair (bonus à ACTIVATION, non modélisé)', () => {
  it('traqueur-r2 : aucun badge — le +AGI relève d\'une capacité activée, pas de l\'attaque régulière', () => {
    const traqueur = makeCharacter({ featureIds: ['traqueur-r2'] });
    expect(weaponDamageBonuses(traqueur, 'melee', epeeLongue)).toEqual({ addedAbilities: [], situational: [] });
  });
});

describe('weaponDamageBonuses — Chasseur émérite (+1d4° situationnel, les deux modes)', () => {
  const traqueur = makeCharacter({ featureIds: ['traqueur-r3'] });

  it('badge situationnel de dé aux deux modes', () => {
    const melee = weaponDamageBonuses(traqueur, 'melee', epeeLongue);
    const ranged = weaponDamageBonuses(traqueur, 'ranged', arcLong);
    expect(melee.situational[0]).toMatchObject({
      dice: { count: 1, die: 'd4', evolving: true },
      featureId: 'traqueur-r3',
    });
    expect(melee.situational[0].conditionLabel).toMatch(/animaux/);
    expect(ranged.situational).toHaveLength(1);
  });

  it('libellé de condition DYNAMIQUE : les ennemis jurés choisis sont ajoutés', () => {
    const withChoices = makeCharacter({
      featureIds: ['traqueur-r3'],
      featureChoices: { 'traqueur-r3': [['dragons', 'undead']] },
    });
    const label = weaponDamageBonuses(withChoices, 'melee', epeeLongue).situational[0].conditionLabel;
    expect(label).toBe('contre les animaux (même géants), Dragons, Morts-vivants');
  });

  it('sans ennemi juré choisi : libellé de base seul', () => {
    const label = weaponDamageBonuses(traqueur, 'melee', epeeLongue).situational[0].conditionLabel;
    expect(label).toBe('contre les animaux (même géants)');
  });
});
