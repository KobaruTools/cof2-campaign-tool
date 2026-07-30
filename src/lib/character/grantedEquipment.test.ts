import { describe, expect, it } from 'vitest';
import { equipmentById } from '@/data';
import { createBlankCharacter } from './factory';
import { formatWeaponDamage } from './weaponDamage';
import type { Character, EquipmentLine } from './types';
import {
  grantedItemId,
  grantedItems,
  missingGrantedItems,
  withGrantedEquipment,
} from './grantedEquipment';

/** Arquebusier au rang 5 de la voie de l'artilleur (la capacité qui octroie la couleuvrine). */
function gunner(equipment: EquipmentLine[] = [], over: Partial<Character> = {}): Character {
  return {
    ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }),
    ancestryId: 'humain',
    ancestryPathId: 'humain',
    classId: 'arquebusier',
    level: 13,
    featureIds: ['artilleur-r1', 'artilleur-r2', 'artilleur-r3', 'artilleur-r4', 'artilleur-r5'],
    equipment,
    ...over,
  };
}

describe('catalogue — couleuvrine et sa contrepartie sans poudre (p. 62-63)', () => {
  it('la couleuvrine est une arme à poudre octroyée, non achetable, à 2 rounds de rechargement', () => {
    const item = equipmentById.get('couleuvrine');
    expect(item).toMatchObject({ category: 'weapon', price: null });
    expect(item?.category === 'weapon' && item.rangedKind).toBe('firearm');
    expect(item?.category === 'weapon' && item.reload).toEqual({
      action: 'L',
      rounds: 2,
      countsTowardLoadedLimit: false,
    });
    // « [5d4° + INT] DM » (p. 63) : dé ÉVOLUTIF + carac ajoutée par l'arme, par dérogation à la
    // règle générale des armes à distance (p. 185).
    expect(item?.category === 'weapon' && item.damage).toEqual({
      count: 5,
      die: 'd4',
      evolving: true,
    });
    expect(item?.category === 'weapon' && item.damageAbility).toBe('INT');
  });

  it('la baliste la remplace quand la poudre est interdite (p. 62)', () => {
    const item = equipmentById.get('couleuvrine');
    expect(item?.category === 'weapon' && item.equivalentCrossbowId).toBe('baliste');
    const baliste = equipmentById.get('baliste');
    expect(baliste?.category === 'weapon' && baliste.rangedKind).toBe('crossbow');
    // Même profil : c'est le même emplacement de construction (variante « Arbalétrier »).
    expect(baliste?.category === 'weapon' && baliste.reload).toEqual({
      action: 'L',
      rounds: 2,
      countsTowardLoadedLimit: false,
    });
  });
});

describe('grantedItemId — substitution sans poudre', () => {
  it('poudre autorisée → l’objet déclaré', () => {
    expect(grantedItemId('couleuvrine', true)).toBe('couleuvrine');
  });

  it('poudre interdite → l’équivalent arbalète', () => {
    expect(grantedItemId('couleuvrine', false)).toBe('baliste');
  });

  it('un objet qui n’est pas une arme à poudre n’est jamais substitué', () => {
    expect(grantedItemId('arbalete-lourde', false)).toBe('arbalete-lourde');
  });

  it('un id inconnu du catalogue ne produit rien (aucune invention)', () => {
    expect(grantedItemId('canon-de-siege-inexistant', true)).toBeNull();
  });
});

describe('grantedItems / missingGrantedItems', () => {
  it('le rang 5 de l’artilleur octroie une couleuvrine', () => {
    expect(grantedItems(gunner(), true)).toEqual([
      { featureId: 'artilleur-r5', itemId: 'couleuvrine', name: 'Couleuvrine' },
    ]);
  });

  it('en Arbalétrier (poudre interdite), c’est une baliste', () => {
    expect(grantedItems(gunner(), false)).toEqual([
      { featureId: 'artilleur-r5', itemId: 'baliste', name: 'Baliste' },
    ]);
  });

  it('aucun octroi sans la capacité', () => {
    expect(grantedItems({ featureIds: ['artilleur-r1', 'artilleur-r2'] }, true)).toEqual([]);
  });

  it('l’octroi est honoré dès qu’une ligne du bon objet existe (variante comprise)', () => {
    const renamed: EquipmentLine = {
      itemId: 'couleuvrine',
      quantity: 1,
      overrides: { name: 'Gueule-de-fer' },
      magicDef: 1,
    };
    expect(missingGrantedItems(gunner([renamed]), true)).toEqual([]);
  });

  it('manquant tant que l’objet n’est pas là — et l’objet de l’AUTRE cadre ne compte pas', () => {
    expect(missingGrantedItems(gunner(), true).map((g) => g.itemId)).toEqual(['couleuvrine']);
    // Une baliste en inventaire ne satisfait pas l'octroi quand la poudre est autorisée.
    expect(
      missingGrantedItems(gunner([{ itemId: 'baliste', quantity: 1 }]), true).map((g) => g.itemId),
    ).toEqual(['couleuvrine']);
  });
});

describe('withGrantedEquipment — ajout à la montée de niveau', () => {
  it('ajoute l’objet octroyé à la fin de l’inventaire', () => {
    const character = gunner([{ itemId: 'petoire', quantity: 1 }]);
    expect(withGrantedEquipment(character, true)).toEqual([
      { itemId: 'petoire', quantity: 1 },
      { itemId: 'couleuvrine', quantity: 1 },
    ]);
  });

  it('ajoute la baliste dans un univers sans poudre', () => {
    expect(withGrantedEquipment(gunner(), false)).toEqual([{ itemId: 'baliste', quantity: 1 }]);
  });

  it('rien à ajouter → MÊME référence (aucune écriture inutile)', () => {
    const character = gunner([{ itemId: 'couleuvrine', quantity: 1 }]);
    expect(withGrantedEquipment(character, true)).toBe(character.equipment);
    const noGrant = gunner([], { featureIds: ['artilleur-r1'] });
    expect(withGrantedEquipment(noGrant, true)).toBe(noGrant.equipment);
  });
});

describe('couleuvrine — dé évolutif, carac ajoutée, et bricolages refusés', () => {
  it('le dé ÉVOLUTIF est RÉSOLU au niveau (table p. 43), marqueur ° conservé', () => {
    const damage = { count: 5, die: 'd4', evolving: true } as const;
    expect(formatWeaponDamage(damage, 3)).toBe('5d4°'); // niveaux 1-5
    expect(formatWeaponDamage(damage, 7)).toBe('5d6°'); // 6-8
    expect(formatWeaponDamage(damage, 10)).toBe('5d8°'); // 9-11
    expect(formatWeaponDamage(damage, 13)).toBe('5d10°'); // 12-14
    expect(formatWeaponDamage(damage, 16)).toBe('5d12°'); // 15+
    // Sans niveau (catalogue hors personnage), le dé de base est rendu tel quel.
    expect(formatWeaponDamage(damage)).toBe('5d4°');
    // Un dé NON évolutif est insensible au niveau.
    expect(formatWeaponDamage({ count: 1, die: 'd10' }, 16)).toBe('1d10');
  });

  it('la carte d’attaque à distance montre le dé résolu ET le + INT', async () => {
    const { buildCharacterDerivedView } = await import('@/components/sheet/characterDerivedView');
    const character = gunner([{ itemId: 'couleuvrine', quantity: 1, worn: { slot: 'mainHand' } }], {
      level: 10,
    });
    const view = buildCharacterDerivedView(character);
    expect(view.rangedWeaponDamage?.dice).toBe('5d8°');
    // Dérogation à « aucune carac aux DM à distance » (p. 185), portée par l'arme elle-même.
    expect(view.rangedWeaponDamage?.abilities).toEqual(['INT']);
  });

  it('la baliste se comporte exactement pareil (variante Arbalétrier)', async () => {
    const { buildCharacterDerivedView } = await import('@/components/sheet/characterDerivedView');
    const character = gunner([{ itemId: 'baliste', quantity: 1, worn: { slot: 'mainHand' } }], {
      level: 10,
      firearmsAllowed: false,
    });
    const view = buildCharacterDerivedView(character);
    expect(view.rangedWeaponDamage?.dice).toBe('5d8°');
    expect(view.rangedWeaponDamage?.abilities).toEqual(['INT']);
  });

  it('ni chargeur ni second canon sur la couleuvrine et la baliste', async () => {
    const { isModifiableWeapon } = await import('./weaponLoading');
    const { featureById } = await import('@/data');
    const magazine = featureById.get('artilleur-r2')!.weaponModification!;
    const doubleBarrel = featureById.get('artilleur-r4')!.weaponModification!;
    for (const itemId of ['couleuvrine', 'baliste']) {
      expect(isModifiableWeapon({ itemId, quantity: 1 }, magazine), itemId).toBe(false);
      expect(isModifiableWeapon({ itemId, quantity: 1 }, doubleBarrel), itemId).toBe(false);
    }
    // Contrôle : une pétoire, elle, accepte les deux.
    expect(isModifiableWeapon({ itemId: 'petoire', quantity: 1 }, magazine)).toBe(true);
    expect(isModifiableWeapon({ itemId: 'petoire', quantity: 1 }, doubleBarrel)).toBe(true);
  });
});

describe('la couleuvrine dans le suivi des munitions (PER-284)', () => {
  it('deux rounds d’action limitée par coup, et exclue du décompte des trois armes chargées', async () => {
    const { loadingContext, weaponLoadingState, loadedFirearmCount } = await import('./weaponLoading');
    const character = gunner([
      { itemId: 'couleuvrine', quantity: 1, loaded: [] },
      { itemId: 'petoire', quantity: 1 },
      { itemId: 'petoire', quantity: 1 },
      { itemId: 'mousquet', quantity: 1 },
      { itemId: 'mousquet', quantity: 1 },
    ]);
    const state = weaponLoadingState(character.equipment[0], loadingContext(character))!;
    expect(state.capacity).toBe(1);
    // « Il faut ensuite DEUX rounds (L) pour la recharger » → 2 actions limitées pour un coup.
    expect(state.refillCost).toEqual({ action: 'L', count: 2 });
    expect(state.countsTowardLoadedLimit).toBe(false);
    // 4 armes à poudre chargées + la couleuvrine : elle ne compte pas, donc le total reste 4.
    expect(loadedFirearmCount({ ...character, equipment: [...character.equipment] })).toBe(4);
  });
});
