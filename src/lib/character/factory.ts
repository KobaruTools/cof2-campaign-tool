/**
 * Fabrique de personnages — création d'un personnage neuf et duplication.
 */
import type { AbilityId } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import { DEFAULT_CAMPAIGN_ID, DEFAULT_PLAYER_ID } from '@/lib/campaign/types';
import { SCHEMA_VERSION, type Character } from './types';

function abilitiesZero(): Record<AbilityId, number> {
  return ABILITY_IDS.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<AbilityId, number>,
  );
}

/** Identifiant unique (uuid v4 via l'API Web Crypto, dispo navigateur + Node 19+). */
export function newId(): string {
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
    id: newId(),
    name: options.name ?? 'Nouveau personnage',
    identity: {},
    // FK de la hiérarchie campagne (PER-179) : par défaut la campagne/le joueur
    // « par défaut » (le bootstrap en garantit l'existence). Le rattachement à une
    // campagne précise depuis le routing est traité par PER-180.
    campaignId: DEFAULT_CAMPAIGN_ID,
    playerId: DEFAULT_PLAYER_ID,
    status: 'active',
    ancestryId: '',
    classId: '',
    level: 1,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    abilities: abilitiesZero(),
    baseAbilities: abilitiesZero(),
    ancestryChoices: [],
    ancestryPathId: null,
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
    id: newId(),
    name: `${source.name} (copie)`,
    createdAt: ts,
    updatedAt: ts,
  };
}
