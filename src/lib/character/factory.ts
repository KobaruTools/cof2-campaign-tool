/**
 * Fabrique de personnages — création d'un personnage neuf et duplication.
 */
import type { CaracId } from '@/data/schema';
import { CARAC_IDS } from '@/data/schema';
import { SCHEMA_VERSION, type Character } from './types';

function caracsZero(): Record<CaracId, number> {
  return CARAC_IDS.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<CaracId, number>,
  );
}

/** Identifiant unique (uuid v4 via l'API Web Crypto, dispo navigateur + Node 19+). */
export function nouvelId(): string {
  return crypto.randomUUID();
}

/**
 * Crée un personnage vierge de niveau 1. `now` est injectable pour des tests
 * déterministes ; par défaut l'horodatage courant (ISO).
 */
export function createBlankCharacter(
  options: { name?: string; now?: string } = {},
): Character {
  const now = options.now ?? new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: nouvelId(),
    name: options.name ?? 'Nouveau personnage',
    identity: {},
    peupleId: '',
    profilId: '',
    niveau: 1,
    caracteristiques: caracsZero(),
    voieDePeupleId: null,
    capaciteIds: [],
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Duplique un personnage en copie indépendante : nouvel id, suffixe « (copie) »,
 * horodatages réinitialisés. Copie profonde des structures mutables.
 */
export function duplicateCharacter(source: Character, now?: string): Character {
  const ts = now ?? new Date().toISOString();
  return {
    ...structuredClone(source),
    id: nouvelId(),
    name: `${source.name} (copie)`,
    createdAt: ts,
    updatedAt: ts,
  };
}
