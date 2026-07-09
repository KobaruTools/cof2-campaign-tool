import { describe, expect, it } from 'vitest';
import { autoEquipStartingGear } from './equipment';
import type { EquipmentLine } from './types';

describe('autoEquipStartingGear', () => {
  it("équipe l'armure, le bouclier et la première arme présents", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'epee-longue', quantity: 1 },
      { itemId: 'cuir-simple', quantity: 1 },
      { itemId: 'petit-bouclier', quantity: 1 },
      { custom: true, name: 'Cape', quantity: 1 },
    ];
    const out = autoEquipStartingGear(lines);
    expect(out.find((l) => 'itemId' in l && l.itemId === 'cuir-simple')?.worn).toEqual({ slot: 'armor' });
    expect(out.find((l) => 'itemId' in l && l.itemId === 'petit-bouclier')?.worn).toEqual({ slot: 'shield' });
    expect(out.find((l) => 'itemId' in l && l.itemId === 'epee-longue')?.worn).toEqual({ slot: 'mainHand' });
    expect(out.find((l) => 'custom' in l)?.worn).toBeUndefined();
  });

  it('choisit la MEILLEURE armure et le MEILLEUR bouclier (plus haut bonus de DEF)', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'cuir-simple', quantity: 1 }, // def 2
      { itemId: 'cotte-de-mailles', quantity: 1 }, // def 5
      { itemId: 'petit-bouclier', quantity: 1 }, // def 1
      { itemId: 'grand-bouclier', quantity: 1 }, // def 2
    ];
    const out = autoEquipStartingGear(lines);
    expect(out.find((l) => 'itemId' in l && l.itemId === 'cotte-de-mailles')?.worn).toEqual({ slot: 'armor' });
    expect(out.find((l) => 'itemId' in l && l.itemId === 'cuir-simple')?.worn).toBeUndefined();
    expect(out.find((l) => 'itemId' in l && l.itemId === 'grand-bouclier')?.worn).toEqual({ slot: 'shield' });
    expect(out.find((l) => 'itemId' in l && l.itemId === 'petit-bouclier')?.worn).toBeUndefined();
  });

  it("renseigne la prise 'oneHand' pour une arme à une ou deux mains", () => {
    // epee-batarde est oneOrTwoHands dans le catalogue ; à défaut on saute ce test.
    const lines: EquipmentLine[] = [{ itemId: 'epee-batarde', quantity: 1 }];
    const out = autoEquipStartingGear(lines);
    const worn = out.find((l) => 'itemId' in l && l.itemId === 'epee-batarde')?.worn;
    expect(worn).toEqual({ slot: 'mainHand', grip: 'oneHand' });
  });

  it('est idempotent : ne retouche pas une liste déjà équipée', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } },
      { itemId: 'cotte-de-mailles', quantity: 1 },
    ];
    const out = autoEquipStartingGear(lines);
    expect(out).toBe(lines); // même référence, aucune copie
  });

  it('ignore les objets personnalisés et les ids inconnus', () => {
    const lines: EquipmentLine[] = [
      { custom: true, name: 'Armure bricolée', quantity: 1 },
      { itemId: 'objet-inexistant', quantity: 1 },
    ];
    const out = autoEquipStartingGear(lines);
    expect(out.every((l) => l.worn === undefined)).toBe(true);
    expect(out).toBe(lines); // rien à équiper → liste inchangée
  });

  it('ne mute pas la liste source', () => {
    const lines: EquipmentLine[] = [{ itemId: 'cuir-simple', quantity: 1 }];
    autoEquipStartingGear(lines);
    expect(lines[0].worn).toBeUndefined();
  });
});
