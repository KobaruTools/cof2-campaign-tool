import { describe, expect, it } from 'vitest';
import {
  abilityBonusSourcesFromEquipment,
  abilityBonusesFromEquipment,
  agiTestArmorAdjustment,
  armorEncumbrancePenalty,
  autoEquipStartingGear,
  derivedBonusSourcesFromEquipment,
  derivedBonusesFromEquipment,
  equipConflicts,
  isHeavyArmorWorn,
  isStaffWielded,
  setWornAt,
  wornMeleeWeapon,
  wornMeleeWeaponLine,
  isTwoHandedMeleeWeaponWielded,
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

describe('isTwoHandedMeleeWeaponWielded (PER-74)', () => {
  it("est vrai avec une arme de CONTACT tenue à deux mains, main principale ou secondaire", () => {
    expect(
      isTwoHandedMeleeWeaponWielded([{ itemId: 'epee-a-deux-mains', quantity: 1, worn: { slot: 'mainHand' } }]),
    ).toBe(true);
    expect(
      isTwoHandedMeleeWeaponWielded([
        { itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } },
        { itemId: 'pique', quantity: 1, worn: { slot: 'offHand' } },
      ]),
    ).toBe(true);
  });

  it("suit la PRISE d'une arme polyvalente (épée bâtarde)", () => {
    expect(
      isTwoHandedMeleeWeaponWielded([
        { itemId: 'epee-batarde', quantity: 1, worn: { slot: 'mainHand', grip: 'twoHands' } },
      ]),
    ).toBe(true);
    expect(
      isTwoHandedMeleeWeaponWielded([
        { itemId: 'epee-batarde', quantity: 1, worn: { slot: 'mainHand', grip: 'oneHand' } },
      ]),
    ).toBe(false);
  });

  it("est faux pour une arme À DISTANCE de catégorie `twoHands` (arc, arbalète, mousquet)", () => {
    for (const itemId of ['arc-long', 'arbalete-lourde', 'mousquet']) {
      expect(isTwoHandedMeleeWeaponWielded([{ itemId, quantity: 1, worn: { slot: 'mainHand' } }])).toBe(false);
    }
  });

  it("est faux sans arme portée, et pour une arme à deux mains RANGÉE (non portée)", () => {
    expect(isTwoHandedMeleeWeaponWielded([])).toBe(false);
    expect(isTwoHandedMeleeWeaponWielded()).toBe(false);
    expect(isTwoHandedMeleeWeaponWielded([{ itemId: 'epee-a-deux-mains', quantity: 1 }])).toBe(false);
  });

  it("ignore les objets personnalisés (impossible de savoir s'ils frappent au contact)", () => {
    expect(
      isTwoHandedMeleeWeaponWielded([
        { custom: true, name: 'Espadon exotique', quantity: 1, worn: { slot: 'mainHand', grip: 'twoHands' } },
      ]),
    ).toBe(false);
  });
});

describe('isStaffWielded (PER-74, Sceptre défensif — archimage r4, p. 154)', () => {
  it('est vrai avec un bâton en main principale ou secondaire', () => {
    expect(isStaffWielded([{ itemId: 'baton', quantity: 1, worn: { slot: 'mainHand' } }])).toBe(true);
    expect(isStaffWielded([{ itemId: 'baton-ferre', quantity: 1, worn: { slot: 'offHand' } }])).toBe(true);
  });

  it('un reskin (« Bâton noueux » du druide) garde son id de catalogue et compte aussi', () => {
    expect(
      isStaffWielded([
        { itemId: 'baton-ferre', quantity: 1, worn: { slot: 'mainHand' }, overrides: { name: 'Bâton noueux' } },
      ]),
    ).toBe(true);
  });

  it('est faux pour une autre arme, et sans bâton porté (ou rangé)', () => {
    expect(isStaffWielded([{ itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } }])).toBe(false);
    expect(isStaffWielded([])).toBe(false);
    expect(isStaffWielded([{ itemId: 'baton', quantity: 1 }])).toBe(false);
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

  it('signale un carquois ET un sac à dos portés ensemble (PER-220, non bloquant)', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'carquois-de-20-fleches', quantity: 1, worn: { slot: 'accessory' } },
      { itemId: 'sac-a-dos', quantity: 1, worn: { slot: 'accessory' } },
    ];
    expect(equipConflicts(lines).map((c) => c.kind)).toEqual(['quiver-with-backpack']);
  });

  it('ne signale rien pour un carquois seul, ou carquois + sac à dos rangé', () => {
    expect(
      equipConflicts([{ itemId: 'carquois-de-20-fleches', quantity: 1, worn: { slot: 'accessory' } }]),
    ).toEqual([]);
    expect(
      equipConflicts([
        { itemId: 'carquois-de-20-fleches', quantity: 1, worn: { slot: 'accessory' } },
        { itemId: 'sac-a-dos', quantity: 1 }, // rangé
      ]),
    ).toEqual([]);
  });

  it('compte une torche tenue en main comme occupant une main (PER-220)', () => {
    // Torche (gear equipSlot 'hand') en main principale + arme à deux mains = 3 mains.
    const lines: EquipmentLine[] = [
      { itemId: 'torche', quantity: 1, worn: { slot: 'mainHand' } },
      { itemId: 'epee-a-deux-mains', quantity: 1, worn: { slot: 'mainHand' } },
    ];
    // Deux objets en main principale : setWornAt gère l'exclusivité, mais equipConflicts
    // additionne bien les mains occupées → l'espadon seul occupe déjà 2 mains, + torche = 3.
    expect(equipConflicts(lines).map((c) => c.kind)).toContain('hands-overbooked');
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

  it("réduit le malus par un diviseur (Armure sur mesure : moitié, arrondi à l'inférieur)", () => {
    // Armure de plaques DEF 6 → malus 6, moitié = 3 (guerre-r1, p. 84).
    expect(
      armorEncumbrancePenalty([{ itemId: 'armure-de-plaques', quantity: 1, worn: { slot: 'armor' } }], 2),
    ).toBe(3);
    // Plaque complète DEF 7 → malus 7, moitié = 3 (arrondi à l'inférieur).
    expect(
      armorEncumbrancePenalty([{ itemId: 'plaque-complete', quantity: 1, worn: { slot: 'armor' } }], 2),
    ).toBe(3);
  });

  it("un diviseur de 1 (défaut) laisse le malus inchangé", () => {
    const lines: EquipmentLine[] = [{ itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } }];
    expect(armorEncumbrancePenalty(lines, 1)).toBe(5);
    expect(armorEncumbrancePenalty(lines)).toBe(5);
  });
});

describe('isHeavyArmorWorn', () => {
  it("est vrai pour une armure de plaques ou une plaque complète PORTÉE", () => {
    expect(isHeavyArmorWorn([{ itemId: 'armure-de-plaques', quantity: 1, worn: { slot: 'armor' } }])).toBe(true);
    expect(isHeavyArmorWorn([{ itemId: 'plaque-complete', quantity: 1, worn: { slot: 'armor' } }])).toBe(true);
  });

  it("est faux pour une armure légère/moyenne, une armure lourde RANGÉE, ou sans armure", () => {
    expect(isHeavyArmorWorn([{ itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } }])).toBe(false);
    expect(isHeavyArmorWorn([{ itemId: 'armure-de-plaques', quantity: 1 }])).toBe(false); // rangée
    expect(isHeavyArmorWorn([])).toBe(false);
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

describe('wornMeleeWeaponLine / wornMeleeWeapon (arme au contact courante, PER-225)', () => {
  it('retourne la ligne de l’arme de contact tenue en MAIN PRINCIPALE', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'rapiere', quantity: 1, worn: { slot: 'mainHand' } },
      { itemId: 'dague', quantity: 1, worn: { slot: 'offHand' } },
    ];
    expect(wornMeleeWeaponLine(lines)).toEqual(lines[0]);
    expect(wornMeleeWeapon(lines)?.id).toBe('rapiere');
  });

  it('retombe sur la MAIN SECONDAIRE si aucune arme de contact en main principale', () => {
    const lines: EquipmentLine[] = [
      { itemId: 'petit-bouclier', quantity: 1, worn: { slot: 'mainHand' } },
      { itemId: 'dague', quantity: 1, worn: { slot: 'offHand' } },
    ];
    expect(wornMeleeWeaponLine(lines)?.itemId).toBe('dague');
  });

  it('null si aucune arme de contact PORTÉE (arme seulement rangée dans le sac)', () => {
    expect(wornMeleeWeaponLine([{ itemId: 'rapiere', quantity: 1 }])).toBeNull();
    expect(wornMeleeWeapon([{ itemId: 'rapiere', quantity: 1 }])).toBeNull();
  });

  it('ignore les objets personnalisés (pas d’item de catalogue)', () => {
    const lines: EquipmentLine[] = [
      { custom: true, name: 'Lame exotique', quantity: 1, worn: { slot: 'mainHand' } },
    ];
    expect(wornMeleeWeaponLine(lines)).toBeNull();
  });
});

describe('abilityBonusesFromEquipment (apports de caractéristiques des objets, PER-272)', () => {
  it("ne compte que les objets PORTÉS (le sac n'apporte rien)", () => {
    const lines: EquipmentLine[] = [
      { custom: true, name: 'Bottes de vivacité', quantity: 1, worn: { slot: 'accessory' }, abilityBonuses: { AGI: 1 } },
      { custom: true, name: 'Anneau rangé', quantity: 1, abilityBonuses: { INT: 3 } },
    ];
    expect(abilityBonusesFromEquipment(lines)).toEqual({ AGI: 1 });
  });

  it('CUMULE les apports de tous les objets portés, sur la même carac comme sur des caracs différentes', () => {
    const lines: EquipmentLine[] = [
      { custom: true, name: 'Bottes de vivacité', quantity: 1, worn: { slot: 'accessory' }, abilityBonuses: { AGI: 1 } },
      { custom: true, name: 'Cape du vent', quantity: 1, worn: { slot: 'accessory' }, abilityBonuses: { AGI: 2, PER: 1 } },
    ];
    expect(abilityBonusesFromEquipment(lines)).toEqual({ AGI: 3, PER: 1 });
  });

  it('gère les MALUS (score négatif) et leur compensation par un bonus', () => {
    const lines: EquipmentLine[] = [
      { custom: true, name: 'Heaume maudit', quantity: 1, worn: { slot: 'armor' }, abilityBonuses: { PER: -2, FOR: 1 } },
      { custom: true, name: 'Lunettes du guetteur', quantity: 1, worn: { slot: 'accessory' }, abilityBonuses: { PER: 1 } },
    ];
    expect(abilityBonusesFromEquipment(lines)).toEqual({ PER: -1, FOR: 1 });
  });

  it("porte l'apport sur une VARIANTE d'objet du livre (arme/armure enchantée) comme sur un objet libre", () => {
    const lines: EquipmentLine[] = [
      {
        itemId: 'epee-longue',
        quantity: 1,
        worn: { slot: 'mainHand' },
        overrides: { name: 'Lame du duelliste' },
        abilityBonuses: { AGI: 1 },
      },
    ];
    expect(abilityBonusesFromEquipment(lines)).toEqual({ AGI: 1 });
    // Le détail nomme la VARIANTE (`overrides.name`), pas l'objet du catalogue.
    expect(abilityBonusSourcesFromEquipment(lines).AGI).toEqual([{ name: 'Lame du duelliste', value: 1 }]);
  });

  it('ignore un apport à 0 et une ligne sans apport (aucun terme parasite dans le détail)', () => {
    const lines: EquipmentLine[] = [
      { custom: true, name: 'Babiole', quantity: 1, worn: { slot: 'accessory' }, abilityBonuses: { CHA: 0 } },
      { custom: true, name: 'Corde', quantity: 1, worn: { slot: 'accessory' } },
    ];
    expect(abilityBonusesFromEquipment(lines)).toEqual({});
    expect(abilityBonusSourcesFromEquipment(lines)).toEqual({});
  });

  it('liste chaque objet source par caractéristique, dans l’ordre de l’inventaire', () => {
    const lines: EquipmentLine[] = [
      { custom: true, name: 'Bottes de vivacité', quantity: 1, worn: { slot: 'accessory' }, abilityBonuses: { AGI: 1 } },
      { custom: true, name: 'Cape du vent', quantity: 1, worn: { slot: 'accessory' }, abilityBonuses: { AGI: 2 } },
    ];
    expect(abilityBonusSourcesFromEquipment(lines).AGI).toEqual([
      { name: 'Bottes de vivacité', value: 1 },
      { name: 'Cape du vent', value: 2 },
    ]);
  });

  it('accepte un inventaire absent ou vide', () => {
    expect(abilityBonusesFromEquipment()).toEqual({});
    expect(abilityBonusesFromEquipment([])).toEqual({});
  });
});

describe('derivedBonusesFromEquipment (apports de stats dérivées des objets, PER-273)', () => {
  it("ne compte que les objets PORTÉS (le sac n'apporte rien)", () => {
    const lines: EquipmentLine[] = [
      {
        custom: true,
        name: 'Amulette de vitalité',
        quantity: 1,
        worn: { slot: 'accessory' },
        derivedBonuses: { maxHp: 5 },
      },
      { custom: true, name: 'Talisman rangé', quantity: 1, derivedBonuses: { luckPoints: 1 } },
    ];
    expect(derivedBonusesFromEquipment(lines)).toEqual({ maxHp: 5 });
  });

  it('CUMULE les apports de tous les objets portés, sur la même stat comme sur des stats différentes', () => {
    const lines: EquipmentLine[] = [
      {
        custom: true,
        name: 'Amulette de vitalité',
        quantity: 1,
        worn: { slot: 'accessory' },
        derivedBonuses: { maxHp: 5 },
      },
      {
        custom: true,
        name: 'Talisman du gardien',
        quantity: 1,
        worn: { slot: 'accessory' },
        derivedBonuses: { maxHp: 2, luckPoints: 1, recoveryDiceCount: 1 },
      },
    ];
    expect(derivedBonusesFromEquipment(lines)).toEqual({
      maxHp: 7,
      luckPoints: 1,
      recoveryDiceCount: 1,
    });
  });

  it('gère les MALUS (score négatif) et leur compensation par un bonus', () => {
    const lines: EquipmentLine[] = [
      {
        custom: true,
        name: 'Cape alourdie',
        quantity: 1,
        worn: { slot: 'accessory' },
        derivedBonuses: { initiative: -3, maxHp: 4 },
      },
      {
        custom: true,
        name: 'Bottes ailées',
        quantity: 1,
        worn: { slot: 'accessory' },
        derivedBonuses: { initiative: 1 },
      },
    ];
    expect(derivedBonusesFromEquipment(lines)).toEqual({ initiative: -2, maxHp: 4 });
  });

  it("porte l'apport sur une VARIANTE d'objet du livre comme sur un objet libre", () => {
    const lines: EquipmentLine[] = [
      {
        itemId: 'epee-longue',
        quantity: 1,
        worn: { slot: 'mainHand' },
        overrides: { name: 'Lame du bretteur' },
        derivedBonuses: { meleeAttack: 1 },
      },
    ];
    expect(derivedBonusesFromEquipment(lines)).toEqual({ meleeAttack: 1 });
    // Le détail nomme la VARIANTE (`overrides.name`), pas l'objet du catalogue.
    expect(derivedBonusSourcesFromEquipment(lines).meleeAttack).toEqual([
      { name: 'Lame du bretteur', value: 1 },
    ]);
  });

  it('ignore un apport à 0 et une ligne sans apport (aucun terme parasite dans le détail)', () => {
    const lines: EquipmentLine[] = [
      {
        custom: true,
        name: 'Babiole',
        quantity: 1,
        worn: { slot: 'accessory' },
        derivedBonuses: { luckPoints: 0 },
      },
      { custom: true, name: 'Corde', quantity: 1, worn: { slot: 'accessory' } },
    ];
    expect(derivedBonusesFromEquipment(lines)).toEqual({});
    expect(derivedBonusSourcesFromEquipment(lines)).toEqual({});
  });

  it('liste chaque objet source par stat, dans l’ordre de l’inventaire', () => {
    const lines: EquipmentLine[] = [
      {
        custom: true,
        name: 'Amulette de vitalité',
        quantity: 1,
        worn: { slot: 'accessory' },
        derivedBonuses: { maxHp: 5 },
      },
      {
        custom: true,
        name: 'Broche de garde',
        quantity: 1,
        worn: { slot: 'accessory' },
        derivedBonuses: { maxHp: 2 },
      },
    ];
    expect(derivedBonusSourcesFromEquipment(lines).maxHp).toEqual([
      { name: 'Amulette de vitalité', value: 5 },
      { name: 'Broche de garde', value: 2 },
    ]);
  });

  it('IGNORE une clé « def » présente dans les données (la DEF n’est pas modifiable par un objet)', () => {
    // Décision propriétaire : aucun bonus de DEF plat sur un objet — trop de règles se
    // calculent depuis les valeurs d'armure, et `magicDef` couvre déjà l'enchantement
    // défensif avec ses propres effets. Le type l'interdit à la saisie ; ce test garde le
    // filet côté DONNÉES (fichier importé, personnage forgé à la main).
    const forged = [
      {
        itemId: 'cuir-simple',
        quantity: 1,
        worn: { slot: 'armor' },
        magicDef: 2,
        derivedBonuses: { def: 3, maxHp: 1 },
      },
    ] as unknown as EquipmentLine[];
    // La clé `def` est écartée ; les autres apports du même objet restent pris en compte.
    expect(derivedBonusesFromEquipment(forged)).toEqual({ maxHp: 1 });
    expect(derivedBonusSourcesFromEquipment(forged)).toEqual({
      maxHp: [{ name: 'Cuir simple', value: 1 }],
    });
    // `magicDef`, lui, garde tous ses effets : cuir simple DEF 2 − 2 de magie → malus 0.
    expect(armorEncumbrancePenalty(forged)).toBe(0);
  });

  it('accepte un inventaire absent ou vide', () => {
    expect(derivedBonusesFromEquipment()).toEqual({});
    expect(derivedBonusesFromEquipment([])).toEqual({});
  });
});
