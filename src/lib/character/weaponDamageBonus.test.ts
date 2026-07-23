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
    companionDepletion: {},
    companionInstances: {},
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
const epeeLongue = weapon('epee-longue'); // arme de contact, famille 'swords'
const masse = weapon('masse'); // arme de contact, famille 'maces' (contrôle négatif)

describe('weaponDamageBonuses — règle de base (aucune capacité)', () => {
  it('sans capacité : aucun bonus, quel que soit le mode/arme', () => {
    const c = makeCharacter();
    expect(weaponDamageBonuses(c, 'ranged', arcLong)).toEqual({ addedAbilities: [], addedFlat: [], situational: [] });
    expect(weaponDamageBonuses(c, 'melee', epeeLongue)).toEqual({ addedAbilities: [], addedFlat: [], situational: [] });
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
    expect(weaponDamageBonuses(traqueur, 'melee', epeeLongue)).toEqual({
      addedAbilities: [],
      addedFlat: [],
      situational: [],
    });
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

describe('weaponDamageBonuses — Spécialisation du maître d\'armes (+N DM plat, PER-226)', () => {
  // Guerrier maître d'armes r1+r3, prédilection « Épées » + « +1 DM » ×2 (budget de Spécialisation).
  const maitre = makeCharacter({
    classId: 'guerrier',
    featureIds: ['maitre-d-armes-r1', 'maitre-d-armes-r3'],
    featureChoices: { 'maitre-d-armes-r1': [['swords', 'dm-bonus', 'dm-bonus']] },
  });

  it('arme de prédilection en main (épée) → +3 DM plat permanent (socle 1 + 2 jalons)', () => {
    const r = weaponDamageBonuses(maitre, 'melee', epeeLongue);
    expect(r.addedFlat).toHaveLength(1);
    expect(r.addedFlat[0]).toMatchObject({ value: 3, featureId: 'maitre-d-armes-r3' });
  });

  it('arme HORS prédilection (masse) → aucun +DM', () => {
    expect(weaponDamageBonuses(maitre, 'melee', masse).addedFlat).toEqual([]);
  });

  it('aucune arme en main → aucun +DM', () => {
    expect(weaponDamageBonuses(maitre, 'melee', null).addedFlat).toEqual([]);
  });

  it('sans « +1 DM » retenu (aucun jalon) → +1 DM socle (verbatim : « il gagne un bonus de +1 DM » dès r3)', () => {
    const sansBonus = makeCharacter({
      classId: 'guerrier',
      featureIds: ['maitre-d-armes-r1', 'maitre-d-armes-r3'],
      featureChoices: { 'maitre-d-armes-r1': [['swords']] },
    });
    const r = weaponDamageBonuses(sansBonus, 'melee', epeeLongue);
    expect(r.addedFlat).toHaveLength(1);
    expect(r.addedFlat[0]).toMatchObject({ value: 1, featureId: 'maitre-d-armes-r3' });
  });

  it('r1 SANS Spécialisation (r3) → aucun +DM (le socle exige r3)', () => {
    const sansR3 = makeCharacter({
      classId: 'guerrier',
      featureIds: ['maitre-d-armes-r1'],
      featureChoices: { 'maitre-d-armes-r1': [['swords']] },
    });
    expect(weaponDamageBonuses(sansR3, 'melee', epeeLongue).addedFlat).toEqual([]);
  });

  it('plafonné à +6 même si davantage de « +1 DM » sont retenus', () => {
    const surbudget = makeCharacter({
      classId: 'guerrier',
      featureIds: ['maitre-d-armes-r1', 'maitre-d-armes-r3'],
      featureChoices: {
        'maitre-d-armes-r1': [['swords', ...Array<string>(8).fill('dm-bonus')]],
      },
    });
    expect(weaponDamageBonuses(surbudget, 'melee', epeeLongue).addedFlat[0]).toMatchObject({ value: 6 });
  });
});

describe('weaponDamageBonuses — Spécialisation de l\'arbalétrier (+N DM plat, PER-236)', () => {
  // Arquebusier r1+r3, prédilection FIXÉE aux arbalètes + « +1 DM » ×2 (budget de Spécialisation).
  const arbaletrier = makeCharacter({
    classId: 'arquebusier',
    featureIds: ['maitre-des-arbaletes-r1', 'maitre-des-arbaletes-r3'],
    featureChoices: { 'maitre-des-arbaletes-r1': [['dm-bonus', 'dm-bonus']] },
  });

  it('arbalète en main → +3 DM plat permanent à distance (socle 1 + 2 jalons)', () => {
    const r = weaponDamageBonuses(arbaletrier, 'ranged', arbaleteLegere);
    expect(r.addedFlat).toHaveLength(1);
    expect(r.addedFlat[0]).toMatchObject({ value: 3, featureId: 'maitre-des-arbaletes-r3' });
  });

  it('arc en main (autre arme à distance) → aucun +DM', () => {
    expect(weaponDamageBonuses(arbaletrier, 'ranged', arcLong).addedFlat).toEqual([]);
  });

  it('aucune arme à distance en main → aucun +DM', () => {
    expect(weaponDamageBonuses(arbaletrier, 'ranged', null).addedFlat).toEqual([]);
  });

  it('sans « +1 DM » retenu → +1 DM socle (verbatim : « il gagne un bonus de +1 DM » dès r3)', () => {
    const sansBonus = makeCharacter({
      classId: 'arquebusier',
      featureIds: ['maitre-des-arbaletes-r1', 'maitre-des-arbaletes-r3'],
    });
    const r = weaponDamageBonuses(sansBonus, 'ranged', arbaleteLegere);
    expect(r.addedFlat).toHaveLength(1);
    expect(r.addedFlat[0]).toMatchObject({ value: 1, featureId: 'maitre-des-arbaletes-r3' });
  });

  it('r1 SANS Spécialisation (r3) → aucun +DM (le socle exige r3)', () => {
    const sansR3 = makeCharacter({
      classId: 'arquebusier',
      featureIds: ['maitre-des-arbaletes-r1'],
    });
    expect(weaponDamageBonuses(sansR3, 'ranged', arbaleteLegere).addedFlat).toEqual([]);
  });

  it('plafonné à +6 même si davantage de « +1 DM » sont retenus', () => {
    const surbudget = makeCharacter({
      classId: 'arquebusier',
      featureIds: ['maitre-des-arbaletes-r1', 'maitre-des-arbaletes-r3'],
      featureChoices: { 'maitre-des-arbaletes-r1': [Array<string>(8).fill('dm-bonus')] },
    });
    expect(weaponDamageBonuses(surbudget, 'ranged', arbaleteLegere).addedFlat[0]).toMatchObject({ value: 6 });
  });
});

describe('weaponDamageBonuses — Cavalier émérite en selle (+1, +2 au rang 5, PER-139)', () => {
  // Chevalier de la voie du cavalier. L'interrupteur « en selle » est l'effet index 0 de
  // cavalier-r2 ; le +DM au contact le suit (`requiresActiveEffectIndex: 0`).
  const chevalier = (ranks: string[], mounted: boolean) =>
    makeCharacter({
      classId: 'chevalier',
      featureIds: ranks,
      effectToggles: mounted ? { 'cavalier-r2': [true] } : {},
    });

  it('interrupteur « en selle » éteint (défaut) → aucun bonus', () => {
    const c = chevalier(['cavalier-r1', 'cavalier-r2'], false);
    expect(weaponDamageBonuses(c, 'melee', epeeLongue).addedFlat).toEqual([]);
  });

  it('en selle, rang 2 → +1 DM plat au contact (source cavalier-r2)', () => {
    const c = chevalier(['cavalier-r1', 'cavalier-r2'], true);
    const r = weaponDamageBonuses(c, 'melee', epeeLongue);
    expect(r.addedFlat).toHaveLength(1);
    expect(r.addedFlat[0]).toMatchObject({ value: 1, featureId: 'cavalier-r2' });
  });

  it('en selle, rang 4 → toujours +1 DM (le +2 n\'arrive qu\'au rang 5)', () => {
    const c = chevalier(['cavalier-r1', 'cavalier-r2', 'cavalier-r3', 'cavalier-r4'], true);
    expect(weaponDamageBonuses(c, 'melee', epeeLongue).addedFlat[0]).toMatchObject({ value: 1 });
  });

  it('en selle, rang 5 → +2 DM', () => {
    const c = chevalier(['cavalier-r1', 'cavalier-r2', 'cavalier-r3', 'cavalier-r4', 'cavalier-r5'], true);
    const r = weaponDamageBonuses(c, 'melee', epeeLongue);
    expect(r.addedFlat).toHaveLength(1);
    expect(r.addedFlat[0]).toMatchObject({ value: 2, featureId: 'cavalier-r2' });
  });

  it('en selle mais mode distance → aucun bonus (contact seulement)', () => {
    const c = chevalier(['cavalier-r1', 'cavalier-r2', 'cavalier-r3', 'cavalier-r4', 'cavalier-r5'], true);
    expect(weaponDamageBonuses(c, 'ranged', arcLong).addedFlat).toEqual([]);
  });

  it('en selle mais aucune arme de contact en main → aucun bonus (suit l\'arme maniée)', () => {
    const c = chevalier(['cavalier-r1', 'cavalier-r2'], true);
    expect(weaponDamageBonuses(c, 'melee', null).addedFlat).toEqual([]);
  });
});

describe('weaponDamageBonuses — barbare rage/furie du berserk (+Nd4° situationnel au contact, PER-236)', () => {
  // L'interrupteur d'état (rage / furie) est l'effet conditional-stat-bonus index 0 ; le dé de DM au
  // contact le suit (`requiresActiveEffectIndex: 0`). Rage et furie sont des états exclusifs.
  const barbare = (features: string[], toggles: Record<string, boolean[]>) =>
    makeCharacter({ classId: 'barbare', featureIds: features, effectToggles: toggles });

  it('rage éteinte (défaut) → aucun bonus situationnel', () => {
    expect(weaponDamageBonuses(barbare(['rage-r3'], {}), 'melee', epeeLongue).situational).toEqual([]);
  });

  it('rage active → +1d4° situationnel au contact (source rage-r3)', () => {
    const r = weaponDamageBonuses(barbare(['rage-r3'], { 'rage-r3': [true] }), 'melee', epeeLongue);
    expect(r.situational).toHaveLength(1);
    expect(r.situational[0]).toMatchObject({
      dice: { count: 1, die: 'd4', evolving: true },
      featureId: 'rage-r3',
    });
    expect(r.situational[0].conditionLabel).toMatch(/rage berserk/);
  });

  it('rage active mais mode distance → aucun bonus (contact seulement)', () => {
    expect(weaponDamageBonuses(barbare(['rage-r3'], { 'rage-r3': [true] }), 'ranged', arcLong).situational).toEqual([]);
  });

  it('rage active mais mains nues → aucun bonus (suit l\'arme de contact maniée)', () => {
    expect(weaponDamageBonuses(barbare(['rage-r3'], { 'rage-r3': [true] }), 'melee', null).situational).toEqual([]);
  });

  it('furie active → +2d4° situationnel au contact (source rage-r5)', () => {
    const r = weaponDamageBonuses(barbare(['rage-r3', 'rage-r5'], { 'rage-r5': [true] }), 'melee', epeeLongue);
    const furie = r.situational.find((b) => b.featureId === 'rage-r5');
    expect(furie).toMatchObject({ dice: { count: 2, die: 'd4', evolving: true } });
    // La rage (r3) reste éteinte → pas de double comptage.
    expect(r.situational.some((b) => b.featureId === 'rage-r3')).toBe(false);
  });

  it('dé ÉVOLUTIF résolu au NIVEAU : rage à haut niveau → face montée, count inchangé, marqueur ° gardé', () => {
    // p. 43 : d4° → d6 (niv. 6-8), d8 (9-11), d10 (12-14)… Seule la FACE monte, le nombre de dés non.
    const niv12 = { ...makeCharacter({ classId: 'barbare', level: 12, featureIds: ['rage-r3', 'rage-r5'] }) };
    const rage = weaponDamageBonuses({ ...niv12, effectToggles: { 'rage-r3': [true] } }, 'melee', epeeLongue);
    expect(rage.situational[0].dice).toEqual({ count: 1, die: 'd10', evolving: true });
    const furie = weaponDamageBonuses({ ...niv12, effectToggles: { 'rage-r5': [true] } }, 'melee', epeeLongue);
    expect(furie.situational[0].dice).toEqual({ count: 2, die: 'd10', evolving: true });
  });
});

describe('weaponDamageBonuses — nain « Haches et marteaux » (+1 DM, familles STATIQUES, PER-154)', () => {
  const nain = makeCharacter({
    classId: 'magicien',
    ancestryId: 'nain',
    ancestryPathId: 'nain',
    featureIds: ['nain-r2'],
  });
  const hache = weapon('hache'); // famille 'axes'
  const marteau = weapon('marteau'); // famille 'hammers' (+ 'maces')
  const hachette = weapon('hachette'); // familles 'axes' + 'thrown'

  it('hache → +1 DM plat permanent (source nain-r2)', () => {
    const r = weaponDamageBonuses(nain, 'melee', hache);
    expect(r.addedFlat).toHaveLength(1);
    expect(r.addedFlat[0]).toMatchObject({ value: 1, featureId: 'nain-r2' });
  });

  it('marteau de guerre → +1 DM plat permanent', () => {
    expect(weaponDamageBonuses(nain, 'melee', marteau).addedFlat[0]).toMatchObject({ value: 1 });
  });

  it('masse (contondante hors marteau) → aucun +DM', () => {
    expect(weaponDamageBonuses(nain, 'melee', masse).addedFlat).toEqual([]);
  });

  it('hachette LANCÉE → +1 DM même à distance', () => {
    expect(weaponDamageBonuses(nain, 'ranged', hachette).addedFlat[0]).toMatchObject({ value: 1 });
  });

  it('sans nain-r2 → aucun +DM', () => {
    const c = makeCharacter({ ancestryId: 'nain', ancestryPathId: 'nain', featureIds: [] });
    expect(weaponDamageBonuses(c, 'melee', hache).addedFlat).toEqual([]);
  });
});
