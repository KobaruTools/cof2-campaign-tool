import { describe, expect, it } from 'vitest';
import type { CustomItem, EquipmentLine, EquipmentRef, ItemCharges } from './types';
import {
  hasItemCharges,
  itemChargeState,
  rechargeItemsOnRest,
  refillItemCharges,
  restoreItemCharge,
  spendItemCharge,
} from './itemCharges';

/** Objet LIBRE à charges — le cas d'usage principal (une baguette n'est pas au catalogue). */
function wand(charges?: ItemCharges, chargesSpent?: number): CustomItem {
  return {
    custom: true,
    name: 'Baguette de foudre',
    quantity: 1,
    type: 'gear',
    ...(charges ? { charges } : {}),
    ...(chargesSpent !== undefined ? { chargesSpent } : {}),
  };
}

/** Variante d'un objet du LIVRE portant des charges (l'autre porteur possible du champ). */
function chargedRef(charges: ItemCharges, chargesSpent?: number): EquipmentRef {
  return {
    itemId: 'epee-longue',
    quantity: 1,
    charges,
    ...(chargesSpent !== undefined ? { chargesSpent } : {}),
  };
}

describe('itemChargeState — lecture normalisée', () => {
  it('un objet sans charges n’a pas d’état (la quasi-totalité de l’inventaire)', () => {
    expect(itemChargeState(wand())).toBeNull();
    expect(hasItemCharges(wand())).toBe(false);
    expect(itemChargeState({ itemId: 'epee-longue', quantity: 1 })).toBeNull();
  });

  it('absent = objet PLEIN (aucune donnée de charge au repos)', () => {
    const state = itemChargeState(wand({ max: 5 }));
    expect(state).toMatchObject({ max: 5, spent: 0, remaining: 5, full: true, empty: false });
  });

  it('compte les charges restantes', () => {
    expect(itemChargeState(wand({ max: 5 }, 3))).toMatchObject({
      spent: 3,
      remaining: 2,
      full: false,
      empty: false,
    });
  });

  it('objet épuisé', () => {
    expect(itemChargeState(wand({ max: 3 }, 3))).toMatchObject({
      remaining: 0,
      empty: true,
      full: false,
    });
  });

  it('fonctionne aussi sur une variante d’un objet du livre', () => {
    expect(itemChargeState(chargedRef({ max: 2 }, 1))).toMatchObject({ remaining: 1 });
  });

  it('expose la politique de rechargement', () => {
    expect(itemChargeState(wand({ max: 2, onShortRest: true }))).toMatchObject({
      onShortRest: true,
      onLongRest: false,
    });
    expect(itemChargeState(wand({ max: 2, onLongRest: true }))).toMatchObject({
      onShortRest: false,
      onLongRest: true,
    });
    // Les deux réglages sont indépendants et cumulables (« et/ou »).
    expect(itemChargeState(wand({ max: 2, onShortRest: true, onLongRest: true }))).toMatchObject({
      onShortRest: true,
      onLongRest: true,
    });
  });

  // La fiche est permissive et l'inventaire peut venir d'un localStorage antérieur, d'un import
  // JSON ou d'un cloud partagé : aucune forme ne doit casser le rendu (cf. `normalizeShots`).
  it('un maximum nul, négatif ou non numérique = objet SANS charges', () => {
    expect(itemChargeState(wand({ max: 0 }))).toBeNull();
    expect(itemChargeState(wand({ max: -3 }))).toBeNull();
    expect(itemChargeState(wand({ max: NaN }))).toBeNull();
    expect(itemChargeState(wand({ max: '4' as unknown as number }))).toBeNull();
  });

  it('un maximum fractionnaire est tronqué', () => {
    expect(itemChargeState(wand({ max: 4.9 }))).toMatchObject({ max: 4 });
  });

  it('des charges dépensées aberrantes sont bornées, jamais négatives', () => {
    expect(itemChargeState(wand({ max: 3 }, 99))).toMatchObject({ spent: 3, remaining: 0 });
    expect(itemChargeState(wand({ max: 3 }, -5))).toMatchObject({ spent: 0, remaining: 3 });
    expect(itemChargeState(wand({ max: 3 }, NaN))).toMatchObject({ spent: 0 });
    expect(itemChargeState(wand({ max: 3 }, '2' as unknown as number))).toMatchObject({ spent: 0 });
  });

  it('BAISSER le maximum sur un objet à moitié vide ne produit rien d’absurde', () => {
    // Baguette 8 charges dont 5 dépensées, ramenée à 3 charges : 0/3, pas -2/3.
    const state = itemChargeState(wand({ max: 3 }, 5));
    expect(state).toMatchObject({ max: 3, spent: 3, remaining: 0, empty: true });
  });
});

describe('gestes de charge — réducteurs purs', () => {
  it('« Utiliser » dépense une charge', () => {
    const next = spendItemCharge([wand({ max: 3 })], 0);
    expect(itemChargeState(next[0])).toMatchObject({ spent: 1, remaining: 2 });
  });

  it('« Utiliser » ne SUPPRIME jamais la ligne, même épuisée (≠ consommable)', () => {
    const next = spendItemCharge([wand({ max: 1 })], 0);
    expect(next).toHaveLength(1);
    expect(itemChargeState(next[0])).toMatchObject({ empty: true });
  });

  it('« Recharger » rend une charge', () => {
    const next = restoreItemCharge([wand({ max: 5 }, 3)], 0);
    expect(itemChargeState(next[0])).toMatchObject({ spent: 2, remaining: 3 });
  });

  it('« Plein » rend toutes les charges', () => {
    const next = refillItemCharges([wand({ max: 5 }, 4)], 0);
    expect(itemChargeState(next[0])).toMatchObject({ full: true, remaining: 5 });
  });

  it('un objet plein s’écrit par l’ABSENCE du champ (représentation canonique)', () => {
    const next = restoreItemCharge([wand({ max: 2 }, 1)], 0);
    expect(next[0]).not.toHaveProperty('chargesSpent');
    expect(refillItemCharges([wand({ max: 9 }, 9)], 0)[0]).not.toHaveProperty('chargesSpent');
  });

  it('ne mute jamais l’entrée', () => {
    const line = wand({ max: 3 });
    const equipment = [line];
    spendItemCharge(equipment, 0);
    expect(line).not.toHaveProperty('chargesSpent');
    expect(equipment[0]).toBe(line);
  });

  it('conserve les autres propriétés de la ligne', () => {
    const next = spendItemCharge([chargedRef({ max: 2, onLongRest: true })], 0);
    expect(next[0]).toMatchObject({
      itemId: 'epee-longue',
      quantity: 1,
      charges: { max: 2, onLongRest: true },
    });
  });

  // Contrat partagé avec `weaponLoading` : la MÊME référence vaut « aucune écriture » côté appelant.
  describe('no-op : même référence rendue', () => {
    const cases: [string, (e: EquipmentLine[]) => EquipmentLine[]][] = [
      ['dépenser sur un objet épuisé', (e) => spendItemCharge(e, 0)],
      ['recharger un objet plein', (e) => restoreItemCharge(e, 0)],
      ['faire le plein d’un objet plein', (e) => refillItemCharges(e, 0)],
    ];
    it('objet sans charges', () => {
      const equipment = [wand()];
      for (const [, act] of cases) expect(act(equipment)).toBe(equipment);
    });
    it('index hors bornes', () => {
      const equipment = [wand({ max: 2 })];
      expect(spendItemCharge(equipment, 7)).toBe(equipment);
      expect(restoreItemCharge(equipment, -1)).toBe(equipment);
      expect(refillItemCharges(equipment, 7)).toBe(equipment);
    });
    it('objet épuisé qu’on essaie de dépenser', () => {
      const equipment = [wand({ max: 2 }, 2)];
      expect(spendItemCharge(equipment, 0)).toBe(equipment);
    });
    it('objet plein qu’on essaie de recharger', () => {
      const equipment = [wand({ max: 2 })];
      expect(restoreItemCharge(equipment, 0)).toBe(equipment);
      expect(refillItemCharges(equipment, 0)).toBe(equipment);
    });
  });
});

describe('rechargeItemsOnRest — rechargement automatique au repos', () => {
  it('sans réglage, un objet ne se recharge à AUCUN repos (manuel uniquement)', () => {
    const equipment = [wand({ max: 5 }, 4)];
    expect(rechargeItemsOnRest(equipment, 'short')).toBe(equipment);
    expect(rechargeItemsOnRest(equipment, 'long')).toBe(equipment);
  });

  it('« au repos court » se recharge au repos court', () => {
    const next = rechargeItemsOnRest([wand({ max: 5, onShortRest: true }, 4)], 'short');
    expect(itemChargeState(next[0])).toMatchObject({ full: true });
  });

  it('« au repos court » se recharge AUSSI au repos long (une nuit fait au moins une pause)', () => {
    const next = rechargeItemsOnRest([wand({ max: 5, onShortRest: true }, 4)], 'long');
    expect(itemChargeState(next[0])).toMatchObject({ full: true });
  });

  it('« au repos long » ne se recharge PAS au repos court', () => {
    const equipment = [wand({ max: 5, onLongRest: true }, 4)];
    expect(rechargeItemsOnRest(equipment, 'short')).toBe(equipment);
    expect(itemChargeState(rechargeItemsOnRest(equipment, 'long')[0])).toMatchObject({ full: true });
  });

  it('recharge plusieurs objets et laisse les autres intacts', () => {
    const equipment: EquipmentLine[] = [
      wand({ max: 3, onLongRest: true }, 3),
      wand({ max: 2 }, 2), // manuel : ne bouge pas
      chargedRef({ max: 4, onShortRest: true }, 1),
      { itemId: 'epee-longue', quantity: 1 }, // sans charges
    ];
    const next = rechargeItemsOnRest(equipment, 'long');
    expect(itemChargeState(next[0])).toMatchObject({ full: true });
    expect(itemChargeState(next[1])).toMatchObject({ empty: true });
    expect(itemChargeState(next[2])).toMatchObject({ full: true });
    expect(next[3]).toBe(equipment[3]);
  });

  it('renvoie la MÊME référence si rien n’était à recharger', () => {
    // Objets déjà pleins, objets sans charges, inventaire vide.
    const equipment: EquipmentLine[] = [
      wand({ max: 3, onShortRest: true, onLongRest: true }),
      wand(),
    ];
    expect(rechargeItemsOnRest(equipment, 'short')).toBe(equipment);
    expect(rechargeItemsOnRest(equipment, 'long')).toBe(equipment);
    const empty: EquipmentLine[] = [];
    expect(rechargeItemsOnRest(empty, 'long')).toBe(empty);
  });
});
