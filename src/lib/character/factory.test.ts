import { describe, expect, it } from 'vitest';
import { CARAC_IDS } from '@/data/schema';
import { SCHEMA_VERSION } from './types';
import { createBlankCharacter, duplicateCharacter } from './factory';

describe('createBlankCharacter', () => {
  it('crée un personnage de niveau 1 à la version courante', () => {
    const c = createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' });
    expect(c.schemaVersion).toBe(SCHEMA_VERSION);
    expect(c.niveau).toBe(1);
    expect(c.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(c.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('initialise les 7 caractéristiques à 0', () => {
    const c = createBlankCharacter();
    for (const id of CARAC_IDS) expect(c.caracteristiques[id]).toBe(0);
  });

  it('génère des ids uniques', () => {
    expect(createBlankCharacter().id).not.toBe(createBlankCharacter().id);
  });
});

describe('duplicateCharacter', () => {
  it('copie indépendante avec suffixe « (copie) » et nouvel id', () => {
    const src = createBlankCharacter({ name: 'Lhagva', now: '2026-01-01T00:00:00.000Z' });
    src.capaciteIds.push('rage-r1');
    const copy = duplicateCharacter(src, '2026-02-02T00:00:00.000Z');

    expect(copy.id).not.toBe(src.id);
    expect(copy.name).toBe('Lhagva (copie)');
    expect(copy.createdAt).toBe('2026-02-02T00:00:00.000Z');

    // mutation de la copie sans effet sur l'original (clone profond)
    copy.capaciteIds.push('rage-r2');
    expect(src.capaciteIds).toEqual(['rage-r1']);
  });
});
