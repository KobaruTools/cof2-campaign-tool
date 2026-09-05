import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import { artilleurFeatureDisplay } from './artilleurDisplay';

describe('artilleurFeatureDisplay (PER-178 — variante « Arbalétrier »)', () => {
  it('armes à feu autorisées (ou réglage absent) : texte source verbatim, quelle que soit la capacité', () => {
    const r1 = featureById.get('artilleur-r1')!;
    const r4 = featureById.get('artilleur-r4')!;
    const r5 = featureById.get('artilleur-r5')!;
    expect(artilleurFeatureDisplay(r1, true)).toBe(r1);
    expect(artilleurFeatureDisplay(r4, undefined)).toBe(r4);
    expect(artilleurFeatureDisplay(r5, true)).toBe(r5);
  });

  it('armes à feu interdites : les capacités hors voie de l’artilleur ne sont jamais touchées', () => {
    const other = featureById.get('explosifs-r1')!;
    expect(artilleurFeatureDisplay(other, false)).toBe(other);
  });

  it('Mécanismes (r1) : la liste d’exemple perd couleuvrine et canon, le reste est inchangé', () => {
    const r1 = featureById.get('artilleur-r1')!;
    const display = artilleurFeatureDisplay(r1, false);
    expect(display.text).not.toContain('couleuvrine');
    expect(display.text).not.toContain('canon');
    expect(display.text).toContain('baliste, trébuchet, catapulte');
    expect(display.richText).not.toContain('couleuvrine');
    // Le reste de la capacité (id, rang, effets) ne bouge pas.
    expect(display.id).toBe(r1.id);
    expect(display.effects).toBe(r1.effects);
  });

  it('Canon double (r4) devient Carreau double : reformulé pour l’arbalète, jamais un texte inerte', () => {
    const r4 = featureById.get('artilleur-r4')!;
    const display = artilleurFeatureDisplay(r4, false);
    expect(display.name).toBe('Carreau double');
    expect(display.text).toContain('arbalètes');
    expect(display.text).not.toContain('poudre');
    expect(display.text).toContain('mais pas une baliste');
    expect(display.weaponModification?.label).toBe('Arbalètes dotées d’un second mécanisme');
    // La donnée source de la portée mécanique (`scope`) reste verbatim : c'est `isModifiableWeapon`
    // qui étend l'éligibilité aux arbalètes, pas ce reskin d'affichage.
    expect(display.weaponModification?.scope).toBe('firearm');
  });

  it('Couleuvrine (r5) devient Baliste : mêmes DM/portée, texte cohérent avec l’objet baliste', () => {
    const r5 = featureById.get('artilleur-r5')!;
    const display = artilleurFeatureDisplay(r5, false);
    expect(display.name).toBe('Baliste');
    expect(display.text).toContain('baliste');
    expect(display.text).not.toContain('couleuvrine');
    expect(display.text).toContain('[5d4° + INT] DM');
    // L'octroi d'équipement reste verbatim (`couleuvrine`) : la substitution d'objet est déjà gérée
    // par `grantedItemId` (cf. `grantedEquipment.ts`), qui résout la baliste à la place.
    expect(display.grantsEquipment).toEqual(r5.grantsEquipment);
  });
});
