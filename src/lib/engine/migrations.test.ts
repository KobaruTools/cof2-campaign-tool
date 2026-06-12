import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import {
  MigrationError,
  ValidationError,
  migrateCharacter,
  runMigrations,
  type Migration,
} from './migrations';

function validRaw(): Record<string, unknown> {
  const c: Character = {
    schemaVersion: SCHEMA_VERSION,
    id: 'abc',
    name: 'Test',
    identity: {},
    peupleId: 'humain',
    profilId: 'barbare',
    niveau: 1,
    caracteristiques: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    voieDePeupleId: 'humain',
    capaciteIds: [],
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
    raw.caracteristiques = { AGI: 0 };
    expect(() => migrateCharacter(raw)).toThrow(ValidationError);
  });

  it('refuse un objet sans champ requis', () => {
    const raw = validRaw();
    delete raw.profilId;
    expect(() => migrateCharacter(raw)).toThrow(ValidationError);
  });
});
