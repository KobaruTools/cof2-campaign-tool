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
    portraitVariant: 'default',
    abilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    baseAbilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    ancestryChoices: ['AGI'],
    ancestryPathId: 'humain',
    featureIds: [],
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
    expect(c.identity).toEqual({ sex: 'F', height: '1,70 m', weight: '60 kg', age: '30', description: 'desc' });
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

  it('expose les migrations 1→2, 2→3 et 3→4 dans le registre', () => {
    expect(typeof MIGRATIONS[1]).toBe('function');
    expect(typeof MIGRATIONS[2]).toBe('function');
    expect(typeof MIGRATIONS[3]).toBe('function');
  });
});
