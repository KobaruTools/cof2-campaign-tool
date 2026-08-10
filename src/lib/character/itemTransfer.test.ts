import { describe, expect, it } from 'vitest';
import type { EquipmentLine } from './types';
import {
  canGiveEquipmentLine,
  isSplittableEquipmentLine,
  maxGivableQuantity,
  planItemTransfer,
} from './itemTransfer';

const potions = (quantity: number): EquipmentLine => ({ itemId: 'potion-de-soins', quantity });
const custom = (name: string, quantity: number, over: Partial<EquipmentLine> = {}): EquipmentLine =>
  ({ custom: true, name, quantity, ...over }) as EquipmentLine;

describe('itemTransfer — don d’objet entre joueurs (PER-388)', () => {
  it('un objet non porté peut être donné, un objet porté doit être déséquipé avant', () => {
    expect(canGiveEquipmentLine(potions(1))).toBe(true);
    expect(canGiveEquipmentLine({ ...potions(1), worn: { slot: 'accessory' } })).toBe(false);
  });

  it('maxGivableQuantity = toute la pile', () => {
    expect(maxGivableQuantity(potions(5))).toBe(5);
  });

  it('une pile simple (sans instanceId/charges/loaded) est partageable partiellement', () => {
    expect(isSplittableEquipmentLine(potions(5))).toBe(true);
  });

  it('un objet à charges, à instanceId ou à munitions chargées ne se donne qu’en entier', () => {
    expect(isSplittableEquipmentLine({ itemId: 'arbalete', quantity: 1, instanceId: 'w1' })).toBe(false);
    expect(
      isSplittableEquipmentLine({ itemId: 'baguette', quantity: 1, charges: { max: 3 } }),
    ).toBe(false);
    expect(
      isSplittableEquipmentLine({ itemId: 'arbalete', quantity: 1, loaded: ['normal'] }),
    ).toBe(false);
    expect(custom('Talisman', 1, { charges: { max: 2 } })).toSatisfy(
      (l: EquipmentLine) => !isSplittableEquipmentLine(l),
    );
  });

  it('donne toute la pile : la ligne disparaît chez le donneur', () => {
    const plan = planItemTransfer([potions(3)], 0, 3);
    expect(plan?.giverEquipment).toEqual([]);
    expect(plan?.itemForReceiver).toEqual(potions(3));
  });

  it('donne une partie de la pile : la ligne du donneur décroît, le receveur reçoit le reste', () => {
    const plan = planItemTransfer([potions(5)], 0, 2);
    expect(plan?.giverEquipment).toEqual([potions(3)]);
    expect(plan?.itemForReceiver).toEqual(potions(2));
  });

  it('préserve les autres lignes de l’inventaire du donneur', () => {
    const other = custom('Corde', 1);
    const plan = planItemTransfer([other, potions(5)], 1, 2);
    expect(plan?.giverEquipment).toEqual([other, potions(3)]);
  });

  it('refuse un objet porté', () => {
    const worn: EquipmentLine = { itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } };
    expect(planItemTransfer([worn], 0, 1)).toBeNull();
  });

  it('refuse une quantité hors bornes (nulle, négative, non entière, ou supérieure à la pile)', () => {
    expect(planItemTransfer([potions(3)], 0, 0)).toBeNull();
    expect(planItemTransfer([potions(3)], 0, -1)).toBeNull();
    expect(planItemTransfer([potions(3)], 0, 1.5)).toBeNull();
    expect(planItemTransfer([potions(3)], 0, 4)).toBeNull();
  });

  it('refuse un don PARTIEL d’un objet non partageable (charges, instance, munitions)', () => {
    const wand: EquipmentLine = { itemId: 'baguette', quantity: 2, charges: { max: 3 } };
    expect(planItemTransfer([wand], 0, 1)).toBeNull();
    // L'entier reste possible.
    expect(planItemTransfer([wand], 0, 2)).not.toBeNull();
  });

  it('refuse un index hors bornes', () => {
    expect(planItemTransfer([potions(1)], 5, 1)).toBeNull();
  });

  it('dépouille l’objet transmis du port et de l’instanceId du donneur (sans sens chez un autre)', () => {
    const line: EquipmentLine = {
      itemId: 'epee-longue',
      quantity: 1,
      instanceId: 'w1',
    };
    const plan = planItemTransfer([line], 0, 1);
    expect(plan?.itemForReceiver).toEqual({ itemId: 'epee-longue', quantity: 1 });
    expect(plan?.itemForReceiver).not.toHaveProperty('instanceId');
  });

  it('objet personnalisé : mêmes règles, y compris la préservation des autres champs (type, icon…)', () => {
    const line = custom('Grimoire', 1, { type: 'gear', icon: 'book' as EquipmentLine['icon'] });
    const plan = planItemTransfer([line], 0, 1);
    expect(plan?.itemForReceiver).toMatchObject({ custom: true, name: 'Grimoire', quantity: 1, type: 'gear' });
  });
});
