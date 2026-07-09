import { describe, expect, it } from 'vitest';
import { autoEquipStartingGear, equipConflicts, setWornAt, wornWeaponIsTwoHanded } from './equipment';
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

describe('wornWeaponIsTwoHanded', () => {
  it("est vrai pour une arme intrinsèquement à deux mains (`twoHands`)", () => {
    expect(
      wornWeaponIsTwoHanded({ itemId: 'epee-a-deux-mains', quantity: 1, worn: { slot: 'mainHand' } }),
    ).toBe(true);
  });

  it("suit la prise choisie pour une arme `oneOrTwoHands`", () => {
    expect(
      wornWeaponIsTwoHanded({ itemId: 'epee-batarde', quantity: 1, worn: { slot: 'mainHand', grip: 'twoHands' } }),
    ).toBe(true);
    expect(
      wornWeaponIsTwoHanded({ itemId: 'epee-batarde', quantity: 1, worn: { slot: 'mainHand', grip: 'oneHand' } }),
    ).toBe(false);
  });

  it("est faux pour une arme à une main ou légère", () => {
    expect(wornWeaponIsTwoHanded({ itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } })).toBe(false);
    expect(wornWeaponIsTwoHanded({ itemId: 'dague', quantity: 1, worn: { slot: 'mainHand' } })).toBe(false);
  });

  it("suit la prise `twoHands` d'un objet personnalisé (pas de catalogue)", () => {
    expect(wornWeaponIsTwoHanded({ custom: true, name: 'Espadon exotique', quantity: 1, worn: { slot: 'mainHand', grip: 'twoHands' } })).toBe(true);
    expect(wornWeaponIsTwoHanded({ custom: true, name: 'Dague exotique', quantity: 1, worn: { slot: 'mainHand' } })).toBe(false);
  });
});

describe('equipConflicts', () => {
  it("ne signale rien pour un chargement classique (armure + bouclier + arme à une main)", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } },
      { itemId: 'petit-bouclier', quantity: 1, worn: { slot: 'shield' } },
      { itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } },
    ];
    expect(equipConflicts(lines)).toEqual([]);
  });

  it("accepte le combat à deux armes (deux armes à une main) SANS avertissement", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } },
      { itemId: 'epee-courte', quantity: 1, worn: { slot: 'offHand' } },
    ];
    expect(equipConflicts(lines)).toEqual([]);
  });

  it("signale bouclier + arme à deux mains (les deux mains sont prises)", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'petit-bouclier', quantity: 1, worn: { slot: 'shield' } },
      { itemId: 'epee-a-deux-mains', quantity: 1, worn: { slot: 'mainHand' } },
    ];
    expect(equipConflicts(lines).map((c) => c.kind)).toEqual(['hands-overbooked']);
  });

  it("signale une arme à deux mains + une arme en main secondaire", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'epee-batarde', quantity: 1, worn: { slot: 'mainHand', grip: 'twoHands' } },
      { itemId: 'dague', quantity: 1, worn: { slot: 'offHand' } },
    ];
    expect(equipConflicts(lines).map((c) => c.kind)).toEqual(['hands-overbooked']);
  });

  it("accepte une arme à une ou deux mains prise à UNE main avec un bouclier", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'epee-batarde', quantity: 1, worn: { slot: 'mainHand', grip: 'oneHand' } },
      { itemId: 'petit-bouclier', quantity: 1, worn: { slot: 'shield' } },
    ];
    expect(equipConflicts(lines)).toEqual([]);
  });

  it("signale plusieurs armures portées à la fois", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } },
      { itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } },
    ];
    expect(equipConflicts(lines).map((c) => c.kind)).toEqual(['multiple-armor']);
  });

  it("signale plusieurs boucliers portés à la fois", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'petit-bouclier', quantity: 1, worn: { slot: 'shield' } },
      { itemId: 'grand-bouclier', quantity: 1, worn: { slot: 'shield' } },
    ];
    expect(equipConflicts(lines).map((c) => c.kind)).toEqual(['multiple-shield']);
  });

  it("ne compte que les objets PORTÉS (le sac n'entre pas en conflit)", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } },
      { itemId: 'cotte-de-mailles', quantity: 1 }, // rangée
      { itemId: 'epee-a-deux-mains', quantity: 1 }, // rangée
      { itemId: 'petit-bouclier', quantity: 1, worn: { slot: 'shield' } },
    ];
    expect(equipConflicts(lines)).toEqual([]);
  });
});

describe('setWornAt', () => {
  it("pose l'état de port sur la ligne visée sans toucher aux autres", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'cuir-simple', quantity: 1 },
      { itemId: 'epee-longue', quantity: 1 },
    ];
    const out = setWornAt(lines, 1, { slot: 'mainHand' });
    expect(out[1].worn).toEqual({ slot: 'mainHand' });
    expect(out[0].worn).toBeUndefined();
  });

  it("retire l'état de port avec `undefined`", () => {
    const lines: EquipmentLine[] = [{ itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } }];
    expect(setWornAt(lines, 0, undefined)[0].worn).toBeUndefined();
  });

  it('ne mute pas la liste source', () => {
    const lines: EquipmentLine[] = [{ itemId: 'epee-longue', quantity: 1 }];
    setWornAt(lines, 0, { slot: 'mainHand' });
    expect(lines[0].worn).toBeUndefined();
  });
});
