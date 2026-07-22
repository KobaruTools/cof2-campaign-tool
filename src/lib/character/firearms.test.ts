import { describe, expect, it } from 'vitest';
import { equipmentById } from '@/data';
import type { Campaign } from '@/lib/campaign/types';
import { firearmsEffective, isFirearmChoiceOption, isFirearmItem, isFirearmItemId } from './firearms';

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

// Détection « cette option de choix d'équipement de départ octroie une arme à poudre »
// (PER-234) : DATA-DRIVEN via `isFirearmItemId` sur les objets de l'option, jamais une
// liste de noms. Sert à l'avertissement « poudre indisponible » de la modale de choix.
describe('isFirearmChoiceOption', () => {
  it('vrai si l’option octroie une arme à poudre (pétoire)', () => {
    expect(
      isFirearmChoiceOption({ label: 'Pétoire', items: [{ itemId: 'petoire', quantity: 1 }] }),
    ).toBe(true);
  });

  it('faux pour l’option arbalète de poing (équivalent non-poudre)', () => {
    expect(
      isFirearmChoiceOption({
        label: 'Arbalète de poing',
        items: [{ itemId: 'arbalete-de-poing', quantity: 1 }],
      }),
    ).toBe(false);
  });

  it('vrai si un LOT contient une arme à poudre parmi plusieurs objets', () => {
    expect(
      isFirearmChoiceOption({
        label: 'Pétoire + dague',
        items: [
          { itemId: 'dague', quantity: 1 },
          { itemId: 'petoire', quantity: 1 },
        ],
      }),
    ).toBe(true);
  });
});

// Équivalent arbalète d'une arme à poudre quand la poudre est interdite (p. 62 / p. 185) :
// représenté en DONNÉE sur l'objet arme à feu (PER-234), plus aucune table de noms en dur.
describe('equivalentCrossbowId (données catalogue)', () => {
  it('pétoire → arbalète de poing, mousquet → arbalète lourde', () => {
    const petoire = equipmentById.get('petoire');
    const mousquet = equipmentById.get('mousquet');
    expect(isFirearmItem(petoire) && petoire.equivalentCrossbowId).toBe('arbalete-de-poing');
    expect(isFirearmItem(mousquet) && mousquet.equivalentCrossbowId).toBe('arbalete-lourde');
  });

  it('chaque arme à poudre pointe vers une arbalète existante du catalogue', () => {
    for (const item of equipmentById.values()) {
      if (!isFirearmItem(item)) continue;
      const equiv = item.equivalentCrossbowId ? equipmentById.get(item.equivalentCrossbowId) : undefined;
      expect(equiv?.category === 'weapon' && equiv.rangedKind === 'crossbow').toBe(true);
    }
  });
});
