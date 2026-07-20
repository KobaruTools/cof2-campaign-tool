import { describe, expect, it } from 'vitest';
import { equipmentById } from '@/data';
import type { Weapon } from '@/data/schema';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import { weaponAttackBonuses } from './attackBonus';

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
    abilities: { AGI: 3, CON: 2, FOR: 3, PER: 1, CHA: 0, INT: 0, VOL: 1 },
    baseAbilities: { AGI: 3, CON: 2, FOR: 3, PER: 1, CHA: 0, INT: 0, VOL: 1 },
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

const epeeLongue = weapon('epee-longue'); // famille 'swords'
const masse = weapon('masse'); // famille 'maces' (contrôle négatif)
const couteauxDeLancer = weapon('couteaux-de-lancer'); // arme de jet, famille 'thrown', rangedKind 'thrown'

describe('weaponAttackBonuses — règle de base (aucune capacité)', () => {
  it('sans capacité : total 0, quel que soit le mode/arme', () => {
    const c = makeCharacter({ classId: 'rodeur' });
    expect(weaponAttackBonuses(c, 'melee', epeeLongue)).toEqual({ total: 0, sources: [] });
    expect(weaponAttackBonuses(c, 'ranged', couteauxDeLancer)).toEqual({ total: 0, sources: [] });
  });
});

describe('weaponAttackBonuses — Armes de prédilection du maître d\'armes (+1 att, PER-226)', () => {
  // Guerrier maître d'armes r1, prédilection « Épées ».
  const maitreEpees = makeCharacter({
    featureIds: ['maitre-d-armes-r1'],
    featureChoices: { 'maitre-d-armes-r1': [['swords']] },
  });

  it('arme de prédilection au contact (épée) → +1 en attaque', () => {
    const r = weaponAttackBonuses(maitreEpees, 'melee', epeeLongue);
    expect(r.total).toBe(1);
    expect(r.sources[0]).toMatchObject({ featureId: 'maitre-d-armes-r1', value: 1 });
  });

  it('arme HORS prédilection (masse) → aucun bonus', () => {
    expect(weaponAttackBonuses(maitreEpees, 'melee', masse)).toEqual({ total: 0, sources: [] });
  });

  it('aucune arme en main → aucun bonus', () => {
    expect(weaponAttackBonuses(maitreEpees, 'melee', null)).toEqual({ total: 0, sources: [] });
  });

  it('prédilection « armes de jet » → +1 à DISTANCE avec une arme de jet', () => {
    const maitreJet = makeCharacter({
      featureIds: ['maitre-d-armes-r1'],
      featureChoices: { 'maitre-d-armes-r1': [['thrown']] },
    });
    expect(weaponAttackBonuses(maitreJet, 'ranged', couteauxDeLancer).total).toBe(1);
    // Une épée (contact) ne déclenche pas le bonus « armes de jet ».
    expect(weaponAttackBonuses(maitreJet, 'melee', epeeLongue).total).toBe(0);
  });
});

describe('weaponAttackBonuses — nain « Haches et marteaux » (+1 att, familles STATIQUES, PER-154)', () => {
  // Nain magicien : la maîtrise/le bonus viennent du PEUPLE, pas du profil (« quel que soit son profil »).
  const nain = makeCharacter({
    classId: 'magicien',
    ancestryId: 'nain',
    ancestryPathId: 'nain',
    featureIds: ['nain-r2'],
  });
  const hache = weapon('hache'); // famille 'axes'
  const marteau = weapon('marteau'); // famille 'hammers' (+ 'maces')
  const hachette = weapon('hachette'); // familles 'axes' + 'thrown'

  it('hache au contact → +1 en attaque (source nain-r2)', () => {
    const r = weaponAttackBonuses(nain, 'melee', hache);
    expect(r.total).toBe(1);
    expect(r.sources[0]).toMatchObject({ featureId: 'nain-r2', value: 1 });
  });

  it('marteau de guerre → +1 en attaque', () => {
    expect(weaponAttackBonuses(nain, 'melee', marteau).total).toBe(1);
  });

  it('masse / autre contondante (hors marteau) → aucun bonus', () => {
    expect(weaponAttackBonuses(nain, 'melee', masse).total).toBe(0);
  });

  it('hachette LANCÉE (une « hache ») → +1 même à distance', () => {
    expect(weaponAttackBonuses(nain, 'ranged', hachette).total).toBe(1);
  });

  it('sans nain-r2 → aucun bonus', () => {
    const c = makeCharacter({ ancestryId: 'nain', ancestryPathId: 'nain', featureIds: [] });
    expect(weaponAttackBonuses(c, 'melee', hache).total).toBe(0);
  });
});
