import { describe, expect, it } from 'vitest';
import type { AbilityId } from '@/data/schema';
import type { Character, EquipmentLine } from './types';
import {
  boundWeaponAttackDie,
  boundWeaponAuraElement,
  boundWeaponChoiceHost,
  boundWeaponLine,
  boundWeaponPathFor,
  boundWeaponSelectionValue,
  boundWeaponWieldedScope,
  isBoundWeaponLine,
  ownedWeaponsForChoice,
} from './boundWeapon';

/** Rangs 4-8 de la voie de prestige de l'arme liée (p. 147). */
const RANKS = [4, 5, 6, 7, 8].map((r) => `prestige-arme-liee-r${r}`);
const HOST = 'prestige-arme-liee-r4';

const char = (over: Partial<Character> = {}): Character =>
  ({
    level: 16,
    abilities: { AGI: 2, CON: 3, FOR: 4, PER: 1, CHA: 2, INT: 0, VOL: 1 } as Record<AbilityId, number>,
    featureIds: RANKS,
    effectToggles: {},
    featureChoices: {},
    usageCounters: {},
    effectInputs: {},
    equipment: [],
    ...over,
  }) as Character;

/** Personnage lié à `itemId`, avec l'inventaire donné. */
const bound = (equipment: EquipmentLine[], itemId: string, over: Partial<Character> = {}): Character =>
  char({ equipment, featureChoices: { [HOST]: [itemId] }, ...over });

describe('boundWeapon — désignation de l’arme liée (PER-74, p. 147)', () => {
  it('trouve la capacité porteuse du choix depuis les données (aucun id en dur)', () => {
    expect(boundWeaponChoiceHost(char())).toEqual({ featureId: HOST, choiceIndex: 0 });
    // Sans la voie, aucun porteur.
    expect(boundWeaponChoiceHost(char({ featureIds: ['combat-r1'] }))).toBeNull();
  });

  it('ne propose que les ARMES de l’inventaire, dédoublonnées', () => {
    const options = ownedWeaponsForChoice(
      char({
        equipment: [
          { itemId: 'epee-longue', quantity: 1 },
          { itemId: 'cotte-de-mailles', quantity: 1 },
          { itemId: 'epee-longue', quantity: 1 },
          { itemId: 'arc-long', quantity: 1 },
        ],
      }),
    );
    expect(options.map((o) => o.value)).toEqual(['epee-longue', 'arc-long']);
    expect(options.map((o) => o.label)).toEqual(['Épée longue', 'Arc long']);
  });

  it('résout la ligne liée, et la puce ne se pose que sur elle', () => {
    const sword: EquipmentLine = { itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } };
    const bow: EquipmentLine = { itemId: 'arc-long', quantity: 1 };
    const c = bound([sword, bow], 'epee-longue');
    expect(boundWeaponLine(c)).toBe(sword);
    expect(isBoundWeaponLine(c, sword)).toBe(true);
    expect(isBoundWeaponLine(c, bow)).toBe(false);
  });

  it('rend null quand aucun choix n’est fait, ou quand l’arme a quitté l’inventaire', () => {
    expect(boundWeaponLine(char({ equipment: [{ itemId: 'epee-longue', quantity: 1 }] }))).toBeNull();
    expect(boundWeaponLine(bound([{ itemId: 'arc-long', quantity: 1 }], 'epee-longue'))).toBeNull();
  });

  it('gère un objet LIBRE par son nom (`custom:`)', () => {
    const custom: EquipmentLine = { custom: true, name: 'Lame de Gorak', quantity: 1 };
    expect(boundWeaponSelectionValue(custom)).toBe('custom:Lame de Gorak');
    // Un objet libre n'a pas de catégorie connue : il n'est pas proposé au lien.
    expect(ownedWeaponsForChoice(char({ equipment: [custom] }))).toEqual([]);
  });

  it('donne la voie (nom + catégorie) pour colorer la puce', () => {
    const sword: EquipmentLine = { itemId: 'epee-longue', quantity: 1 };
    expect(boundWeaponPathFor(bound([sword], 'epee-longue'), sword)).toEqual({
      pathName: "Voie de l'arme liée",
      category: 'fighter',
    });
  });
});

describe('boundWeapon — mode d’attaque et dé bonus du rang 4', () => {
  const swordWorn: EquipmentLine = { itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } };
  const bowWorn: EquipmentLine = { itemId: 'arc-long', quantity: 1, worn: { slot: 'mainHand' } };

  it('déduit le mode de l’arme liée réellement en main', () => {
    expect(boundWeaponWieldedScope(bound([swordWorn], 'epee-longue'))).toBe('melee');
    expect(boundWeaponWieldedScope(bound([bowWorn], 'arc-long'))).toBe('ranged');
    // Arme liée RANGÉE (pas en main) → aucun mode.
    expect(boundWeaponWieldedScope(bound([{ itemId: 'epee-longue', quantity: 1 }], 'epee-longue'))).toBeNull();
  });

  it('accorde le dé bonus sur le mode de l’arme liée, compteur plein (absence = plein)', () => {
    expect(boundWeaponAttackDie(bound([swordWorn], 'epee-longue'))).toEqual({
      name: 'Fidèle',
      scope: 'melee',
    });
    expect(boundWeaponAttackDie(bound([bowWorn], 'arc-long'))?.scope).toBe('ranged');
  });

  it('retire le dé bonus dès que la charge est dépensée, et le rend à la recharge', () => {
    const spent = bound([swordWorn], 'epee-longue', { usageCounters: { [HOST]: 0 } });
    expect(boundWeaponAttackDie(spent)).toBeNull();
    const recharged = bound([swordWorn], 'epee-longue', { usageCounters: { [HOST]: 1 } });
    expect(boundWeaponAttackDie(recharged)?.name).toBe('Fidèle');
  });

  it('retire le dé bonus quand l’arme liée n’est pas en main (une AUTRE arme est équipée)', () => {
    const other: EquipmentLine = { itemId: 'hache', quantity: 1, worn: { slot: 'mainHand' } };
    expect(boundWeaponAttackDie(bound([other, { itemId: 'epee-longue', quantity: 1 }], 'epee-longue'))).toBeNull();
  });

  it('n’accorde rien sans la voie', () => {
    expect(boundWeaponAttackDie(char({ featureIds: ['combat-r1'], equipment: [swordWorn] }))).toBeNull();
  });
});

describe('boundWeapon — aura élémentaire du rang 7 (choix à la table)', () => {
  it('rend l’élément retenu, et rien tant qu’aucun n’est choisi', () => {
    const c = bound([{ itemId: 'epee-longue', quantity: 1 }], 'epee-longue');
    expect(boundWeaponAuraElement(c)).toBeNull();
    const withFire = { ...c, effectInputs: { 'prestige-arme-liee-r7': 'fire' } } as Character;
    expect(boundWeaponAuraElement(withFire)).toEqual({
      featureId: 'prestige-arme-liee-r7',
      element: 'fire',
    });
  });

  it('ignore une valeur hors des éléments proposés', () => {
    const c = bound([{ itemId: 'epee-longue', quantity: 1 }], 'epee-longue');
    const bogus = { ...c, effectInputs: { 'prestige-arme-liee-r7': 'poison' } } as Character;
    expect(boundWeaponAuraElement(bogus)).toBeNull();
  });
});
