import { describe, expect, it } from 'vitest';
import { equipmentById } from '@/data';
import type { Campaign } from '@/lib/campaign/types';
import { firearmsEffective, isFirearmItem, isFirearmItemId } from './firearms';

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

// Identité « arme à poudre » DATA-DRIVEN (PER-197) : dérivée du sous-type d'arme à
// distance `rangedKind: 'firearm'` (PER-115), et NON d'une liste d'ids codée en dur.
describe('isFirearmItem', () => {
  it('vrai pour les armes à distance de sous-type « firearm » (mousquet, pétoire)', () => {
    expect(isFirearmItem(equipmentById.get('mousquet'))).toBe(true);
    expect(isFirearmItem(equipmentById.get('petoire'))).toBe(true);
  });

  it('faux pour une arbalète (même famille duale, mais sous-type crossbow)', () => {
    expect(isFirearmItem(equipmentById.get('arbalete-legere'))).toBe(false);
    expect(isFirearmItem(equipmentById.get('arbalete-de-poing'))).toBe(false);
  });

  it('faux pour une arme de contact (aucun rangedKind)', () => {
    expect(isFirearmItem(equipmentById.get('epee-longue'))).toBe(false);
  });

  it('faux pour un objet absent (undefined)', () => {
    expect(isFirearmItem(undefined)).toBe(false);
  });
});

describe('isFirearmItemId', () => {
  it('résout l’id de base du catalogue puis lit le sous-type', () => {
    expect(isFirearmItemId('mousquet')).toBe(true);
    expect(isFirearmItemId('petoire')).toBe(true);
    expect(isFirearmItemId('arbalete-legere')).toBe(false);
    expect(isFirearmItemId('epee-longue')).toBe(false);
  });

  it('faux pour un id inconnu', () => {
    expect(isFirearmItemId('id-inexistant')).toBe(false);
  });
});
