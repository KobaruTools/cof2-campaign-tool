import { describe, expect, it } from 'vitest';
import { defenseFromEquipment, initialEquipment } from './helpers';
import { classById } from '@/data';
import type { EquipmentLine } from '@/lib/character/types';

describe('defenseFromEquipment', () => {
  it('ne compte que l’armure PORTÉE (une armure rangée est ignorée)', () => {
    const equipment: EquipmentLine[] = [
      { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } }, // def 2
      { itemId: 'cotte-de-mailles', quantity: 1 }, // rangée → ignorée
    ];
    expect(defenseFromEquipment(equipment)).toEqual({ defBonus: 2, maxAgi: 6 });
  });

  it('ne cumule jamais deux armures, même si deux sont marquées portées (garde la 1re)', () => {
    // Cas défensif : le modèle vise ≤ 1 armure portée. Si des données incohérentes
    // en présentent deux, le calcul n'en compte qu'une (fin du bug de cumul).
    const equipment: EquipmentLine[] = [
      { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } }, // def 2, agi 6
      { itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } }, // def 5, agi 3
    ];
    expect(defenseFromEquipment(equipment)).toEqual({ defBonus: 2, maxAgi: 6 });
  });

  it('additionne armure portée + bouclier porté ; l’AGI max vient de l’armure', () => {
    const equipment: EquipmentLine[] = [
      { itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } }, // def 5, agi 3
      { itemId: 'grand-bouclier', quantity: 1, worn: { slot: 'shield' } }, // def 2
    ];
    expect(defenseFromEquipment(equipment)).toEqual({ defBonus: 7, maxAgi: 3 });
  });

  it('renvoie zéro quand rien n’est porté', () => {
    const equipment: EquipmentLine[] = [
      { itemId: 'cuir-simple', quantity: 1 },
      { itemId: 'petit-bouclier', quantity: 1 },
    ];
    expect(defenseFromEquipment(equipment)).toEqual({ defBonus: 0, maxAgi: null });
  });

  it('ignore un objet personnalisé porté (aucune stat structurée)', () => {
    const equipment: EquipmentLine[] = [
      { custom: true, name: 'Armure de fortune', quantity: 1, worn: { slot: 'armor' } },
    ];
    expect(defenseFromEquipment(equipment)).toEqual({ defBonus: 0, maxAgi: null });
  });

  it('ne compte pas une arme portée dans la défense', () => {
    const equipment: EquipmentLine[] = [
      { itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } },
      { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } },
    ];
    expect(defenseFromEquipment(equipment)).toEqual({ defBonus: 2, maxAgi: 6 });
  });
});

describe('initialEquipment', () => {
  it('auto-équipe le matériel de départ (une création part protégée)', () => {
    // Le guerrier part avec une armure de cuir + arme(s) : la DEF ne doit pas être
    // nulle à la création (régression évitée avant l'UI d'équipement, PER-77).
    const guerrier = classById.get('guerrier');
    expect(guerrier).toBeDefined();
    const lines = initialEquipment(guerrier!);
    const def = defenseFromEquipment(lines);
    expect(def.defBonus).toBeGreaterThan(0);
  });
});
