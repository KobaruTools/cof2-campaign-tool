import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import {
  MIGRATIONS,
  MigrationError,
  ValidationError,
  migrateCharacter,
  runMigrations,
  type Migration,
} from './migrations';

/** Personnage tel que sérialisé par le schéma v1 (clés françaises). */
function v1Raw(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: 'abc',
    name: 'Test',
    identity: { sexe: 'F', taille: '1,70 m', poids: '60 kg', age: '30', description: 'desc' },
    peupleId: 'humain',
    profilId: 'barbare',
    niveau: 3,
    caracteristiques: { AGI: 1, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
    voieDePeupleId: 'humain',
    capaciteIds: ['humain-r1', 'rage-r1'],
    levelUpHistory: [{ niveau: 1, choixCapaciteIds: ['humain-r1'] }],
    equipment: [
      { itemId: 'epee-longue', quantite: 1 },
      { custom: true, nom: 'Cape de voyage', quantite: 2 },
    ],
    overrides: { pvMax: 30, def: 12, pointsChance: 4, attaqueContact: 5 },
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function validRaw(): Record<string, unknown> {
  const c: Character = {
    schemaVersion: SCHEMA_VERSION,
    id: 'abc',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'barbare',
    level: 1,
    priestVocation: null,
    portraitVariant: 'default',
    abilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    baseAbilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    ancestryChoices: ['AGI'],
    ancestryPathId: 'humain',
    featureIds: [],
    featureChoices: {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    depletion: {},
    purse: { gold: 0, silver: 0, copper: 0 },
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  return c as unknown as Record<string, unknown>;
}

describe('runMigrations', () => {
  it('passe-plat si déjà à la version cible', () => {
    const raw = { schemaVersion: 1, x: 1 };
    expect(runMigrations(raw, {}, 1)).toEqual(raw);
  });

  it('enchaîne les migrations 1→2→3', () => {
    const migrations: Record<number, Migration> = {
      1: (d) => ({ ...d, schemaVersion: 2, ajoute1: true }),
      2: (d) => ({ ...d, schemaVersion: 3, ajoute2: true }),
    };
    const out = runMigrations({ schemaVersion: 1 }, migrations, 3);
    expect(out).toMatchObject({ schemaVersion: 3, ajoute1: true, ajoute2: true });
  });

  it('rejette une version plus récente que la cible', () => {
    expect(() => runMigrations({ schemaVersion: 99 }, {}, 1)).toThrow(MigrationError);
  });

  it('rejette une version absente', () => {
    expect(() => runMigrations({}, {}, 1)).toThrow(MigrationError);
  });

  it('rejette si une migration intermédiaire manque', () => {
    expect(() => runMigrations({ schemaVersion: 1 }, {}, 3)).toThrow(MigrationError);
  });
});

describe('migrateCharacter', () => {
  it('accepte un personnage valide à la version courante', () => {
    const c = migrateCharacter(validRaw());
    expect(c.id).toBe('abc');
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('refuse un non-objet', () => {
    expect(() => migrateCharacter(null)).toThrow(ValidationError);
    expect(() => migrateCharacter('nope')).toThrow(ValidationError);
  });

  it('refuse un objet sans caractéristiques complètes', () => {
    const raw = validRaw();
    raw.abilities = { AGI: 0 };
    expect(() => migrateCharacter(raw)).toThrow(ValidationError);
  });

  it('refuse un objet sans champ requis', () => {
    const raw = validRaw();
    delete raw.classId;
    expect(() => migrateCharacter(raw)).toThrow(ValidationError);
  });

  it('migre un personnage v1 (clés françaises) vers v2 (clés anglaises)', () => {
    const c = migrateCharacter(v1Raw());
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    // Clés renommées, valeurs (slugs) inchangées.
    expect(c.ancestryId).toBe('humain');
    expect(c.classId).toBe('barbare');
    expect(c.level).toBe(3);
    expect(c.abilities).toEqual({ AGI: 1, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 });
    expect(c.ancestryPathId).toBe('humain');
    expect(c.featureIds).toEqual(['humain-r1', 'rage-r1']);
    // v10 : la taille (« 1,70 m ») est convertie en centimètres.
    expect(c.identity).toEqual({ sex: 'F', height: '170', weight: '60 kg', age: '30', description: 'desc' });
    expect(c.levelUpHistory).toEqual([{ level: 1, chosenFeatureIds: ['humain-r1'] }]);
    expect(c.equipment).toEqual([
      { itemId: 'epee-longue', quantity: 1 },
      { custom: true, name: 'Cape de voyage', quantity: 2 },
    ]);
    expect(c.overrides).toEqual({ maxHp: 30, def: 12, luckPoints: 4, meleeAttack: 5 });
    // v3 : illustration de profil par défaut pour un personnage migré.
    expect(c.portraitVariant).toBe('default');
    // Plus aucune clé française résiduelle.
    expect(c).not.toHaveProperty('peupleId');
    expect(c).not.toHaveProperty('caracteristiques');
  });

  it('migre un personnage v2 vers v3 (portraitVariant par défaut)', () => {
    const v2 = validRaw();
    v2.schemaVersion = 2;
    delete v2.portraitVariant;
    const c = migrateCharacter(v2);
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    expect(c.portraitVariant).toBe('default');
  });

  it('préserve une variante d’illustration déjà choisie en v3', () => {
    const v2 = validRaw();
    v2.schemaVersion = 2;
    v2.portraitVariant = 'alt';
    expect(migrateCharacter(v2).portraitVariant).toBe('alt');
  });

  it('migre un personnage v3 vers v4 (base + choix de peuple reconstruits)', () => {
    const v3 = validRaw();
    v3.schemaVersion = 3;
    delete v3.baseAbilities;
    delete v3.ancestryChoices;
    // Demi-elfe : « +1 PER ou CHA » puis « -1 FOR ou CON ».
    v3.ancestryId = 'demi-elfe';
    v3.abilities = { AGI: 0, CON: 0, FOR: -1, PER: 2, CHA: 0, INT: 0, VOL: 0 };
    const c = migrateCharacter(v3);
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    // Choix reconstruits sur la première option de chaque modificateur.
    expect(c.ancestryChoices).toEqual(['PER', 'FOR']);
    // Invariant : base + modificateurs = valeur finale (inchangée).
    expect(c.abilities).toEqual({ AGI: 0, CON: 0, FOR: -1, PER: 2, CHA: 0, INT: 0, VOL: 0 });
    expect(c.baseAbilities.PER).toBe(1); // 2 - (+1)
    expect(c.baseAbilities.FOR).toBe(0); // -1 - (-1)
    expect(c.baseAbilities.AGI).toBe(0);
  });

  it('v3→v4 sans peuple connu : base = valeurs finales, sans modificateur', () => {
    const v3 = validRaw();
    v3.schemaVersion = 3;
    delete v3.baseAbilities;
    delete v3.ancestryChoices;
    v3.ancestryId = 'inconnu';
    v3.abilities = { AGI: 1, CON: 1, FOR: 1, PER: 1, CHA: 1, INT: 1, VOL: 1 };
    const c = migrateCharacter(v3);
    expect(c.ancestryChoices).toEqual([]);
    expect(c.baseAbilities).toEqual(c.abilities);
  });

  it('migre un personnage v4 vers v5 (featureChoices initialisé à vide)', () => {
    const v4 = validRaw();
    v4.schemaVersion = 4;
    delete v4.featureChoices;
    const c = migrateCharacter(v4);
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    expect(c.featureChoices).toEqual({});
  });

  it('préserve les featureChoices déjà présents lors d’un chargement v5', () => {
    const v5 = validRaw();
    v5.featureChoices = { 'demi-orc-r2': ['brute-r1'], 'maitre-d-armes-r1': ['swords'] };
    const c = migrateCharacter(v5);
    expect(c.featureChoices).toEqual({
      'demi-orc-r2': ['brute-r1'],
      'maitre-d-armes-r1': ['swords'],
    });
  });

  it('refuse un objet sans featureChoices à la version courante', () => {
    const raw = validRaw();
    delete raw.featureChoices;
    raw.schemaVersion = SCHEMA_VERSION; // pas de migration : la validation doit échouer
    expect(() => migrateCharacter(raw)).toThrow(ValidationError);
  });

  it('migre un personnage v5 vers v6 (effectToggles initialisé à vide)', () => {
    const v5 = validRaw();
    v5.schemaVersion = 5;
    delete v5.effectToggles;
    const c = migrateCharacter(v5);
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    expect(c.effectToggles).toEqual({});
  });

  it('préserve les effectToggles déjà présents lors d’un chargement v6', () => {
    const v6 = validRaw();
    v6.effectToggles = { 'rage-r3': [true], 'combat-a-deux-armes-r2': [true] };
    const c = migrateCharacter(v6);
    expect(c.effectToggles).toEqual({
      'rage-r3': [true],
      'combat-a-deux-armes-r2': [true],
    });
  });

  it('refuse un objet sans effectToggles à la version courante', () => {
    const raw = validRaw();
    delete raw.effectToggles;
    raw.schemaVersion = SCHEMA_VERSION; // pas de migration : la validation doit échouer
    expect(() => migrateCharacter(raw)).toThrow(ValidationError);
  });

  it('migre un personnage v6 vers v7 (effectInputs initialisé à vide)', () => {
    const v6 = validRaw();
    v6.schemaVersion = 6;
    delete v6.effectInputs;
    const c = migrateCharacter(v6);
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    expect(c.effectInputs).toEqual({});
  });

  it('préserve les effectInputs déjà présents lors d’un chargement v7', () => {
    const v7 = validRaw();
    v7.effectInputs = { 'animaux-r5': 'loup' };
    const c = migrateCharacter(v7);
    expect(c.effectInputs).toEqual({ 'animaux-r5': 'loup' });
  });

  it('refuse un objet sans effectInputs à la version courante', () => {
    const raw = validRaw();
    delete raw.effectInputs;
    raw.schemaVersion = SCHEMA_VERSION; // pas de migration : la validation doit échouer
    expect(() => migrateCharacter(raw)).toThrow(ValidationError);
  });

  it('migre un personnage v7 vers v8 (usageCounters initialisé à vide)', () => {
    const v7 = validRaw();
    v7.schemaVersion = 7;
    delete v7.usageCounters;
    const c = migrateCharacter(v7);
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    expect(c.usageCounters).toEqual({});
  });

  it('préserve les usageCounters déjà présents lors d’un chargement v8', () => {
    const v8 = validRaw();
    v8.usageCounters = { 'fauve-r5': 3 };
    const c = migrateCharacter(v8);
    expect(c.usageCounters).toEqual({ 'fauve-r5': 3 });
  });

  it('refuse un objet sans usageCounters à la version courante', () => {
    const raw = validRaw();
    delete raw.usageCounters;
    raw.schemaVersion = SCHEMA_VERSION; // pas de migration : la validation doit échouer
    expect(() => migrateCharacter(raw)).toThrow(ValidationError);
  });

  it('migre un personnage v8 vers v9 (priestVocation initialisé à null)', () => {
    const v8 = validRaw();
    v8.schemaVersion = 8;
    delete v8.priestVocation;
    const c = migrateCharacter(v8);
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    expect(c.priestVocation).toBeNull();
  });

  it('préserve la vocation du prêtre déjà présente lors d’un chargement v9', () => {
    const v9 = validRaw();
    v9.priestVocation = { mode: 'specialist', godId: 'morn' };
    const c = migrateCharacter(v9);
    expect(c.priestVocation).toEqual({ mode: 'specialist', godId: 'morn' });
  });

  it('migre un personnage v9 vers v10 (taille des mètres aux centimètres)', () => {
    const v9 = validRaw();
    v9.schemaVersion = 9;
    v9.identity = { height: '1,75' };
    const c = migrateCharacter(v9);
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    expect(c.identity.height).toBe('175');
  });

  it('v9→v10 laisse une taille déjà en centimètres intacte', () => {
    const v9 = validRaw();
    v9.schemaVersion = 9;
    v9.identity = { height: '180' };
    expect(migrateCharacter(v9).identity.height).toBe('180');
  });

  it('v9→v10 ne touche pas une taille absente', () => {
    const v9 = validRaw();
    v9.schemaVersion = 9;
    v9.identity = {};
    expect(migrateCharacter(v9).identity.height).toBeUndefined();
  });

  it('migre un personnage v10 vers v11 (depletion initialisé à vide)', () => {
    const v10 = validRaw();
    v10.schemaVersion = 10;
    delete v10.depletion;
    const c = migrateCharacter(v10);
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    expect(c.depletion).toEqual({});
  });

  it('préserve la depletion déjà présente lors d’un chargement v11', () => {
    const v11 = validRaw();
    v11.depletion = { hp: { lethal: 4, temp: 2 }, mana: 3 };
    const c = migrateCharacter(v11);
    expect(c.depletion).toEqual({ hp: { lethal: 4, temp: 2 }, mana: 3 });
  });

  it('refuse un objet sans depletion à la version courante', () => {
    const raw = validRaw();
    delete raw.depletion;
    raw.schemaVersion = SCHEMA_VERSION; // pas de migration : la validation doit échouer
    expect(() => migrateCharacter(raw)).toThrow(ValidationError);
  });

  it('migre un personnage v11 vers v12 (purse initialisé à vide)', () => {
    const v11 = validRaw();
    v11.schemaVersion = 11;
    delete v11.purse;
    const c = migrateCharacter(v11);
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    expect(c.purse).toEqual({ gold: 0, silver: 0, copper: 0 });
  });

  it('préserve la bourse déjà présente lors d’un chargement v12', () => {
    const v12 = validRaw();
    v12.purse = { gold: 12, silver: 3, copper: 5 };
    const c = migrateCharacter(v12);
    expect(c.purse).toEqual({ gold: 12, silver: 3, copper: 5 });
  });

  it('refuse un objet sans purse à la version courante', () => {
    const raw = validRaw();
    delete raw.purse;
    raw.schemaVersion = SCHEMA_VERSION; // pas de migration : la validation doit échouer
    expect(() => migrateCharacter(raw)).toThrow(ValidationError);
  });

  it('expose les migrations 1→2 … 11→12 dans le registre', () => {
    expect(typeof MIGRATIONS[1]).toBe('function');
    expect(typeof MIGRATIONS[2]).toBe('function');
    expect(typeof MIGRATIONS[3]).toBe('function');
    expect(typeof MIGRATIONS[4]).toBe('function');
    expect(typeof MIGRATIONS[5]).toBe('function');
    expect(typeof MIGRATIONS[6]).toBe('function');
    expect(typeof MIGRATIONS[7]).toBe('function');
    expect(typeof MIGRATIONS[8]).toBe('function');
    expect(typeof MIGRATIONS[9]).toBe('function');
    expect(typeof MIGRATIONS[10]).toBe('function');
    expect(typeof MIGRATIONS[11]).toBe('function');
  });
});
