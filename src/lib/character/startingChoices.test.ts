import { describe, expect, it } from 'vitest';
import { isStartingChoiceLine, startingChoiceOptionsFor } from './startingChoices';
import type { EquipmentLine } from './types';

describe('startingChoiceOptionsFor', () => {
  it('reconnaît le choix « Épée ou hache à deux mains » du guerrier et rend ses 2 options', () => {
    const line: EquipmentLine = {
      custom: true,
      name: 'Épée ou hache à deux mains (DM 2d6)',
      quantity: 1,
    };
    const options = startingChoiceOptionsFor(line);
    expect(options?.map((o) => o.items[0].itemId)).toEqual(['epee-a-deux-mains', 'hache-a-deux-mains']);
  });

  it('reconnaît le choix « Dague ou hachette de lancer » du guerrier', () => {
    const line: EquipmentLine = { custom: true, name: 'Dague ou hachette de lancer', quantity: 1 };
    expect(startingChoiceOptionsFor(line)?.map((o) => o.items[0].itemId)).toEqual(['dague', 'hachette']);
  });

  it('reconnaît le choix du barbare et aplati le LOT (arme + bouclier) en options concrètes', () => {
    const line: EquipmentLine = {
      custom: true,
      name: 'Hache à deux mains (DM 2d6) ou Arme à une main (d8) et bouclier (+2 en DEF)',
      quantity: 1,
    };
    const options = startingChoiceOptionsFor(line);
    expect(options).toHaveLength(3);
    // La 2e/3e option sont des LOTS de deux objets (arme d8 + grand bouclier).
    expect(options?.[1].items.map((i) => i.itemId)).toEqual(['epee-longue', 'grand-bouclier']);
    expect(options?.[2].items.map((i) => i.itemId)).toEqual(['hache', 'grand-bouclier']);
  });

  it('ignore la Bourse, un objet du catalogue et un objet libre quelconque', () => {
    expect(startingChoiceOptionsFor({ custom: true, name: 'Bourse de 2d6 pa', quantity: 1 })).toBeUndefined();
    expect(startingChoiceOptionsFor({ itemId: 'epee-longue', quantity: 1 })).toBeUndefined();
    expect(startingChoiceOptionsFor({ custom: true, name: 'Cape de voyage', quantity: 1 })).toBeUndefined();
    expect(isStartingChoiceLine({ custom: true, name: 'Cape de voyage', quantity: 1 })).toBe(false);
  });
});
