import { describe, expect, it } from 'vitest';
import { passiveAuraCarrierIds, passiveAuraFeatureId, passiveAuraStatusesFor } from './partyAuras';
import { createBlankCharacter } from './factory';
import type { Character } from './types';

// `passiveAuraIds` n'est aujourd'hui porté que par du contenu PAYANT (`frouin-r1`, Le Compagnon
// p. 21 — private/companion-content.ts, non chargé en test CI-safe). Ce fichier couvre donc le
// moteur générique (catalogue `frouin-stench`, lui FREE dans `@/data/schema`) sans dépendre d'une
// capacité porteuse réelle ; la détection du PORTEUR réel (`frouin-r1` → `frouin-stench`) est
// recettée en intégration locale, `frouin.recette.test.ts`.
const makeChar = (id: string, featureIds: string[]): Character => ({
  ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }),
  id,
  featureIds,
});

describe('passiveAuraCarrierIds', () => {
  it('personnage sans capacité porteuse d’aura : aucune entrée', () => {
    expect(passiveAuraCarrierIds([makeChar('guerrier-1', ['guerrier-r1'])])).toEqual({});
  });

  it('table vide : aucune entrée', () => {
    expect(passiveAuraCarrierIds([])).toEqual({});
  });
});

describe('passiveAuraStatusesFor', () => {
  const carriers = { 'frouin-stench': ['frouin-1'] };

  it('un AUTRE personnage subit l’aura', () => {
    const statuses = passiveAuraStatusesFor('allie-1', carriers);
    expect(statuses).toEqual([
      {
        id: 'frouin-stench',
        origin: 'auto',
        autoReason: {
          text: 'À cause, entre autres, de l’odeur, la seule présence du frouïn impose -1 à tous les tests d’interaction sociale de ses compagnons (CHA).',
          sourcePage: 21,
        },
      },
    ]);
  });

  it('le PORTEUR ne se pénalise pas lui-même (excludesCarrier)', () => {
    expect(passiveAuraStatusesFor('frouin-1', carriers)).toEqual([]);
  });

  it('aucun porteur à la table : aucune aura pour personne', () => {
    expect(passiveAuraStatusesFor('allie-1', {})).toEqual([]);
  });

  it('personnage seul à la table (lui-même seul porteur potentiel) : pas d’aura', () => {
    expect(passiveAuraStatusesFor('frouin-1', { 'frouin-stench': ['frouin-1'] })).toEqual([]);
  });

  it('plusieurs porteurs : un porteur reste protégé même si un AUTRE porteur est aussi présent', () => {
    const twoCarriers = { 'frouin-stench': ['frouin-1', 'frouin-2'] };
    expect(passiveAuraStatusesFor('frouin-1', twoCarriers)).toEqual([
      expect.objectContaining({ id: 'frouin-stench' }),
    ]);
  });
});

describe('passiveAuraFeatureId', () => {
  it('id inconnu ou capacité porteuse non chargée (contenu payant) : undefined', () => {
    expect(passiveAuraFeatureId('not-an-aura')).toBeUndefined();
    expect(passiveAuraFeatureId('frouin-stench')).toBeUndefined();
  });
});
