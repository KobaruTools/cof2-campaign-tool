/**
 * PER-325 — primitive `oneHandDamageOverride` + hook de trait de peuple inné (`ancestryTraitFeatureIds`).
 *
 * Une arme de contact intrinsèquement à deux mains tenue À UNE MAIN sous une capacité `twoHandedInOneHand`
 * peut voir son dé RÉDUIT (`oneHandDamage`, demi-ogre « Taille grande » : épées → 1d12) ; une capacité
 * couvrante de rang supérieur SANS `oneHandDamage` (demi-ogre r4) LÈVE la réduction → dé natif.
 *
 * Test CI-safe : capacités SYNTHÉTIQUES (aucun import de `private/`), arme du catalogue de base
 * (`epee-a-deux-mains`, `swords` + `twoHands` + 2d6). L'intégration réelle du demi-ogre est couverte
 * par le test recette (contenu payant, non tracké).
 */
import { describe, expect, it } from 'vitest';
import { registerContentBundle } from '@/data';
import {
  ancestryTraitFeatureIds,
  oneHandableWeaponFamilies,
  oneHandDamageOverride,
} from '@/lib/character/equipment';
import type { EquipmentLine } from '@/lib/character/types';

registerContentBundle({
  features: [
    {
      // Réduit le dé à une main (comme le trait « Taille grande » du demi-ogre).
      id: 'test-oh-reduce',
      name: 'Réduction de test',
      pathId: 'test-oh',
      rank: 0,
      isSpell: false,
      actionTypes: [],
      text: 'Épées maniables à une main, dé réduit.',
      sourcePage: 0,
      twoHandedInOneHand: { weaponFamilies: ['swords'], oneHandDamage: { count: 1, die: 'd12' } },
    },
    {
      // Élargit + rend le plein dé natif (comme demi-ogre r4) : pas de `oneHandDamage`.
      id: 'test-oh-native',
      name: 'Plein dé de test',
      pathId: 'test-oh',
      rank: 4,
      isSpell: false,
      actionTypes: [],
      text: 'Toutes armes 2M à une main, plein dé.',
      sourcePage: 0,
      twoHandedInOneHand: { weaponFamilies: ['swords', 'axes'] },
    },
  ],
});

const epee = (grip: 'oneHand' | 'twoHands'): EquipmentLine => ({
  itemId: 'epee-a-deux-mains',
  quantity: 1,
  worn: { slot: 'mainHand', grip },
});

describe('PER-325 — ancestryTraitFeatureIds (trait de peuple inné)', () => {
  it('demi-ogre → son trait « Taille grande »', () => {
    expect(ancestryTraitFeatureIds('demi-ogre')).toEqual(['demi-ogre-taille-grande']);
  });
  it('peuple sans trait inné, ou ancestryId absent → liste vide', () => {
    expect(ancestryTraitFeatureIds('humain')).toEqual([]);
    expect(ancestryTraitFeatureIds(undefined)).toEqual([]);
  });
});

describe('PER-325 — oneHandDamageOverride', () => {
  it('épée à 2M tenue à une main sous une capacité réductrice → 1d12', () => {
    expect(oneHandDamageOverride(epee('oneHand'), ['test-oh-reduce'])).toEqual({ count: 1, die: 'd12' });
  });

  it('une capacité couvrante SANS oneHandDamage (rang supérieur) LÈVE la réduction → dé natif (null)', () => {
    expect(oneHandDamageOverride(epee('oneHand'), ['test-oh-reduce', 'test-oh-native'])).toBeNull();
  });

  it('tenue à DEUX mains → aucune surcharge (null)', () => {
    expect(oneHandDamageOverride(epee('twoHands'), ['test-oh-reduce'])).toBeNull();
  });

  it('aucune capacité de maniement → null', () => {
    expect(oneHandDamageOverride(epee('oneHand'), [])).toBeNull();
  });

  it('les familles maniables s’unionnent entre capacités', () => {
    const fams = oneHandableWeaponFamilies(['test-oh-reduce', 'test-oh-native']);
    expect(fams).toContain('swords');
    expect(fams).toContain('axes');
  });
});
