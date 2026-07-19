import { describe, expect, it } from 'vitest';
import {
  agiTestArmorAdjustment,
  armorEncumbrancePenalty,
  autoEquipStartingGear,
  equipConflicts,
  setWornAt,
  wornWeaponIsTwoHanded,
} from './equipment';
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

describe('armorEncumbrancePenalty', () => {
  it("vaut 0 sans aucune armure portée", () => {
    expect(armorEncumbrancePenalty([])).toBe(0);
    expect(
      armorEncumbrancePenalty([{ itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } }]),
    ).toBe(0);
  });

  it("vaut la DEF mondaine d'une armure portée sans magie (cuir simple → 2)", () => {
    expect(
      armorEncumbrancePenalty([{ itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } }]),
    ).toBe(2);
  });

  it("suit la DEF mondaine de la cotte de mailles (→ 5)", () => {
    expect(
      armorEncumbrancePenalty([{ itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } }]),
    ).toBe(5);
  });

  it("réduit le malus du bonus magique (chemise de mailles +3 → 1)", () => {
    // DEF +4, magicDef +3 → max(0, 4 − 3) = 1 (exemple du livre, p. 188).
    expect(
      armorEncumbrancePenalty([
        { itemId: 'chemise-de-mailles', quantity: 1, worn: { slot: 'armor' }, magicDef: 3 },
      ]),
    ).toBe(1);
  });

  it("plafonne le malus à 0 pour une armure légère très enchantée (cuir simple +5 → 0)", () => {
    // DEF +2, magicDef +5 → max(0, 2 − 5) = 0.
    expect(
      armorEncumbrancePenalty([
        { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' }, magicDef: 5 },
      ]),
    ).toBe(0);
  });

  it("ignore une armure RANGÉE (non portée)", () => {
    expect(armorEncumbrancePenalty([{ itemId: 'cotte-de-mailles', quantity: 1 }])).toBe(0);
  });

  it("ne compte pas les boucliers (aucun malus d'armure)", () => {
    expect(
      armorEncumbrancePenalty([{ itemId: 'grand-bouclier', quantity: 1, worn: { slot: 'shield' } }]),
    ).toBe(0);
  });

  it("ignore les armures personnalisées (stats inconnues)", () => {
    expect(
      armorEncumbrancePenalty([
        { custom: true, name: 'Armure bricolée', quantity: 1, worn: { slot: 'armor' } },
      ]),
    ).toBe(0);
  });

  it("utilise la DEF EFFECTIVE d'une variante (surcharge d'instance)", () => {
    // Variante de cuir simple (DEF base 2) surchargée à DEF +4.
    expect(
      armorEncumbrancePenalty([
        { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' }, overrides: { name: 'Cuir enchanté', def: 4 } },
      ]),
    ).toBe(4);
  });

  it("ne retient que la PREMIÈRE armure portée rencontrée", () => {
    expect(
      armorEncumbrancePenalty([
        { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } }, // DEF 2
        { itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } }, // DEF 5
      ]),
    ).toBe(2);
  });
});

describe('agiTestArmorAdjustment', () => {
  it("ne change rien sans plafond ni malus", () => {
    expect(agiTestArmorAdjustment(3, null, 0)).toEqual({ cappedAgi: 3, capped: false, penalty: 0, value: 3 });
  });

  it("plafonne l'AGI D'ABORD, puis retranche le malus (cotte de mailles : AGI +4, max +3, malus 5)", () => {
    // AGI +4 plafonnée à +3 (PER-78), puis −5 de malus → −2 (et non +4 − 5 = −1).
    const adj = agiTestArmorAdjustment(4, 3, 5);
    expect(adj.cappedAgi).toBe(3);
    expect(adj.capped).toBe(true);
    expect(adj.penalty).toBe(5);
    expect(adj.value).toBe(-2);
  });

  it("n'abaisse pas une AGI déjà sous le plafond, mais applique le malus", () => {
    const adj = agiTestArmorAdjustment(1, 3, 5);
    expect(adj.capped).toBe(false);
    expect(adj.cappedAgi).toBe(1);
    expect(adj.value).toBe(-4); // 1 − 5
  });

  it("un malus nul laisse la seule AGI plafonnée", () => {
    expect(agiTestArmorAdjustment(5, 2, 0)).toEqual({ cappedAgi: 2, capped: true, penalty: 0, value: 2 });
  });

  it("planche un malus négatif à 0 (garde-fou)", () => {
    expect(agiTestArmorAdjustment(3, null, -4).penalty).toBe(0);
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

  it('une main ne tient qu’une arme : équiper en main principale libère l’autre arme en main principale', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } },
      { itemId: 'dague', quantity: 1 },
    ];
    const out = setWornAt(lines, 1, { slot: 'mainHand' });
    expect(out[1].worn).toEqual({ slot: 'mainHand' });
    expect(out[0].worn).toBeUndefined();
  });

  it('le combat à deux armes reste possible : main secondaire n’affecte pas la main principale', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } },
      { itemId: 'dague', quantity: 1 },
    ];
    const out = setWornAt(lines, 1, { slot: 'offHand' });
    expect(out[0].worn).toEqual({ slot: 'mainHand' });
    expect(out[1].worn).toEqual({ slot: 'offHand' });
  });

  it('équiper une armure ne libère pas une arme en main (slots distincts)', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } },
      { itemId: 'cuir-simple', quantity: 1 },
    ];
    const out = setWornAt(lines, 1, { slot: 'armor' });
    expect(out[0].worn).toEqual({ slot: 'mainHand' });
    expect(out[1].worn).toEqual({ slot: 'armor' });
  });

  it('équiper une arme à DEUX MAINS (intrinsèque) libère le bouclier porté (PER-219)', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'petit-bouclier', quantity: 1, worn: { slot: 'shield' } },
      { itemId: 'epee-a-deux-mains', quantity: 1 },
    ];
    const out = setWornAt(lines, 1, { slot: 'mainHand' });
    expect(out[1].worn).toEqual({ slot: 'mainHand' });
    expect(out[0].worn).toBeUndefined(); // bouclier déséquipé d'office
  });

  it('équiper une arme à deux mains libère une arme en main secondaire (PER-219)', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'dague', quantity: 1, worn: { slot: 'offHand' } },
      { itemId: 'epee-a-deux-mains', quantity: 1 },
    ];
    const out = setWornAt(lines, 1, { slot: 'mainHand' });
    expect(out[1].worn).toEqual({ slot: 'mainHand' });
    expect(out[0].worn).toBeUndefined();
  });

  it('passer une arme « une ou deux mains » à la prise DEUX MAINS libère bouclier ET main secondaire (PER-219)', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'petit-bouclier', quantity: 1, worn: { slot: 'shield' } },
      { itemId: 'dague', quantity: 1, worn: { slot: 'offHand' } },
      { itemId: 'epee-batarde', quantity: 1, worn: { slot: 'mainHand', grip: 'oneHand' } },
    ];
    const out = setWornAt(lines, 2, { slot: 'mainHand', grip: 'twoHands' });
    expect(out[2].worn).toEqual({ slot: 'mainHand', grip: 'twoHands' });
    expect(out[0].worn).toBeUndefined();
    expect(out[1].worn).toBeUndefined();
  });

  it("prendre une arme « une ou deux mains » à UNE main ne libère pas le bouclier (PER-219)", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'petit-bouclier', quantity: 1, worn: { slot: 'shield' } },
      { itemId: 'epee-batarde', quantity: 1 },
    ];
    const out = setWornAt(lines, 1, { slot: 'mainHand', grip: 'oneHand' });
    expect(out[1].worn).toEqual({ slot: 'mainHand', grip: 'oneHand' });
    expect(out[0].worn).toEqual({ slot: 'shield' }); // bouclier conservé
  });

  it("équiper une arme à deux mains ne touche pas à l'armure portée (PER-219)", () => {
    const lines: EquipmentLine[] = [
      { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } },
      { itemId: 'epee-a-deux-mains', quantity: 1 },
    ];
    const out = setWornAt(lines, 1, { slot: 'mainHand' });
    expect(out[0].worn).toEqual({ slot: 'armor' });
  });

  it('un objet personnalisé à deux mains libère aussi bouclier et main secondaire (PER-219)', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'petit-bouclier', quantity: 1, worn: { slot: 'shield' } },
      { custom: true, name: 'Espadon exotique', quantity: 1 },
    ];
    const out = setWornAt(lines, 1, { slot: 'mainHand', grip: 'twoHands' });
    expect(out[1].worn).toEqual({ slot: 'mainHand', grip: 'twoHands' });
    expect(out[0].worn).toBeUndefined();
  });
});
