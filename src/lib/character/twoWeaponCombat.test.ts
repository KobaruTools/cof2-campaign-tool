import { describe, expect, it } from 'vitest';
import { createBlankCharacter } from './factory';
import { setFeatureChoice } from './choices';
import type { Character, EquipmentLine, EquipSlot, WeaponGrip } from './types';
import { twoWeaponCombatStatus } from './twoWeaponCombat';

function makeChar(over: Partial<Character>): Character {
  return {
    ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }),
    ancestryId: 'humain',
    ancestryPathId: 'humain',
    classId: 'rodeur',
    ...over,
  };
}

/** Ligne d'équipement du catalogue, portée à un emplacement donné (prise optionnelle). */
function worn(itemId: string, slot: EquipSlot, grip?: WeaponGrip): EquipmentLine {
  return { itemId, quantity: 1, worn: grip ? { slot, grip } : { slot } };
}

/** Rôdeur avec Combattant héroïque (r4) et l'option de caractéristique retenue. */
function heroicFighter(option: 'AGI' | 'FOR', equipment: EquipmentLine[]): Character {
  const base = makeChar({ featureIds: ['combat-a-deux-armes-r4'], equipment });
  return { ...base, featureChoices: setFeatureChoice(base, 'combat-a-deux-armes-r4', 0, option) };
}

describe('twoWeaponCombatStatus — détection du combat à deux armes (p. 215)', () => {
  it('aucune arme portée → pas de combat à deux armes', () => {
    const status = twoWeaponCombatStatus(makeChar({ equipment: [] }));
    expect(status.dualWielding).toBe(false);
    expect(status.penaltyDie).toBe(false);
  });

  it('une seule arme en main principale → pas de combat à deux armes', () => {
    const status = twoWeaponCombatStatus(makeChar({ equipment: [worn('epee-longue', 'mainHand')] }));
    expect(status.dualWielding).toBe(false);
    expect(status.penaltyDie).toBe(false);
  });

  it('une arme en main + un bouclier → pas de combat à deux armes (le bouclier n’est pas une arme)', () => {
    const status = twoWeaponCombatStatus(
      makeChar({ equipment: [worn('epee-longue', 'mainHand'), worn('petit-bouclier', 'shield')] }),
    );
    expect(status.dualWielding).toBe(false);
  });

  it('une arme à deux mains + une arme en main secondaire → pas de combat à deux armes (les deux mains sont prises)', () => {
    const status = twoWeaponCombatStatus(
      makeChar({ equipment: [worn('baton-ferre', 'mainHand'), worn('dague', 'offHand')] }),
    );
    expect(status.dualWielding).toBe(false);
  });

  it('une arme « une ou deux mains » tenue à DEUX mains + arme en main secondaire → pas de combat à deux armes', () => {
    const status = twoWeaponCombatStatus(
      makeChar({ equipment: [worn('epieu', 'mainHand', 'twoHands'), worn('dague', 'offHand')] }),
    );
    expect(status.dualWielding).toBe(false);
  });

  it('deux armes rangées (non portées) → pas de combat à deux armes', () => {
    const status = twoWeaponCombatStatus(
      makeChar({
        equipment: [
          { itemId: 'epee-longue', quantity: 1 },
          { itemId: 'dague', quantity: 1 },
        ],
      }),
    );
    expect(status.dualWielding).toBe(false);
  });
});

describe('twoWeaponCombatStatus — dé malus et exception Combattant héroïque (p. 73)', () => {
  it('deux armes DIFFÉRENTES en main, sans capacité → dé malus, sans exemption', () => {
    const status = twoWeaponCombatStatus(
      makeChar({ equipment: [worn('epee-longue', 'mainHand'), worn('dague', 'offHand')] }),
    );
    expect(status.dualWielding).toBe(true);
    expect(status.heroicSameWeaponExempt).toBe(false);
    expect(status.penaltyDie).toBe(true);
  });

  it('deux armes IDENTIQUES en main, sans capacité → dé malus (l’exemption exige Combattant héroïque)', () => {
    const status = twoWeaponCombatStatus(
      makeChar({ equipment: [worn('epee-longue', 'mainHand'), worn('epee-longue', 'offHand')] }),
    );
    expect(status.dualWielding).toBe(true);
    expect(status.heroicSameWeaponExempt).toBe(false);
    expect(status.penaltyDie).toBe(true);
  });

  it('Combattant héroïque (FOR) + MÊME arme dans les deux mains → pas de dé malus (« deux épées longues »)', () => {
    const status = twoWeaponCombatStatus(
      heroicFighter('FOR', [worn('epee-longue', 'mainHand'), worn('epee-longue', 'offHand')]),
    );
    expect(status.dualWielding).toBe(true);
    expect(status.heroicSameWeaponExempt).toBe(true);
    expect(status.penaltyDie).toBe(false);
  });

  it('Combattant héroïque (FOR) mais armes DIFFÉRENTES → dé malus (l’exemption vaut pour la même arme)', () => {
    const status = twoWeaponCombatStatus(
      heroicFighter('FOR', [worn('epee-longue', 'mainHand'), worn('epee-courte', 'offHand')]),
    );
    expect(status.heroicSameWeaponExempt).toBe(false);
    expect(status.penaltyDie).toBe(true);
  });

  it('Combattant héroïque (AGI) + même arme → dé malus (l’exemption est réservée à l’option FOR)', () => {
    const status = twoWeaponCombatStatus(
      heroicFighter('AGI', [worn('epee-longue', 'mainHand'), worn('epee-longue', 'offHand')]),
    );
    expect(status.heroicSameWeaponExempt).toBe(false);
    expect(status.penaltyDie).toBe(true);
  });

  it('Combattant héroïque acquis mais choix non fait (null) → dé malus (pas d’exemption)', () => {
    const status = twoWeaponCombatStatus(
      makeChar({
        featureIds: ['combat-a-deux-armes-r4'],
        equipment: [worn('epee-longue', 'mainHand'), worn('epee-longue', 'offHand')],
      }),
    );
    expect(status.heroicSameWeaponExempt).toBe(false);
    expect(status.penaltyDie).toBe(true);
  });
});
