import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/lib/campaign/types';
import { firearmsEffective } from './firearms';

function makeCampaign(firearmsAllowed: boolean): Campaign {
  return {
    id: 'camp',
    name: 'Campagne',
    description: null,
    rules: { firearmsAllowed, hitDieOnLevelUp: false },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('firearmsEffective', () => {
  it('sans campagne : retombe sur le choix du personnage (poudre disponible)', () => {
    expect(firearmsEffective({ firearmsAllowed: true }, null)).toBe(true);
    expect(firearmsEffective({ firearmsAllowed: true }, undefined)).toBe(true);
  });

  it('sans campagne : un Arbalétrier (choix false) le reste', () => {
    expect(firearmsEffective({ firearmsAllowed: false }, null)).toBe(false);
  });

  it('campagne autorise + choix Arquebusier : effectif autorisé', () => {
    expect(firearmsEffective({ firearmsAllowed: true }, makeCampaign(true))).toBe(true);
  });

  it('campagne interdit la poudre : un Arquebusier bascule à false (rétro-actif)', () => {
    expect(firearmsEffective({ firearmsAllowed: true }, makeCampaign(false))).toBe(false);
  });

  it('campagne autorise mais joueur a choisi Arbalétrier : reste false', () => {
    expect(firearmsEffective({ firearmsAllowed: false }, makeCampaign(true))).toBe(false);
  });

  it('les deux interdisent : false', () => {
    expect(firearmsEffective({ firearmsAllowed: false }, makeCampaign(false))).toBe(false);
  });
});
