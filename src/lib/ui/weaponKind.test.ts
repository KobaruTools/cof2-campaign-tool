import { describe, expect, it } from 'vitest';
import { equipment, equipmentById } from '@/data';
import type { Weapon } from '@/data/schema';
import { WEAPON_KIND_ICON_PATHS } from '@/lib/ui/weaponKindIcons';
import { weaponIconKind, weaponIconKindForWeapon, type WeaponIconKind } from '@/lib/ui/weaponKind';

/** Sous-type attendu de l'arme du catalogue `id` (résolution par l'`itemId` de base). */
function kindOf(id: string): WeaponIconKind {
  const item = equipmentById.get(id);
  expect(item, `arme absente du catalogue : ${id}`).toBeDefined();
  expect(item!.category).toBe('weapon');
  return weaponIconKindForWeapon(item as Weapon);
}

describe('weaponIconKind', () => {
  it('donne une icône à CHAQUE arme du catalogue', () => {
    const weapons = equipment.filter((e): e is Weapon => e.category === 'weapon');
    expect(weapons.length).toBeGreaterThan(30);
    for (const weapon of weapons) {
      const kind = weaponIconKindForWeapon(weapon);
      expect(WEAPON_KIND_ICON_PATHS[kind], `${weapon.name} → ${kind}`).toBeTruthy();
    }
  });

  it('résout les familles de contact', () => {
    expect(kindOf('epee-longue')).toBe('sword');
    expect(kindOf('rapiere')).toBe('sword');
    expect(kindOf('vivelame')).toBe('sword');
    expect(kindOf('hache-a-deux-mains')).toBe('axe');
    expect(kindOf('masse')).toBe('mace');
    expect(kindOf('gourdin')).toBe('mace');
    expect(kindOf('pique')).toBe('polearm');
    expect(kindOf('lance-de-cavalerie')).toBe('polearm');
    expect(kindOf('mains-nues')).toBe('unarmed');
  });

  it('sort le marteau des contondantes (hammers avant maces)', () => {
    // Le marteau est `['maces', 'hammers']` : sans priorité il tomberait sur l'icône de masse.
    expect(kindOf('marteau')).toBe('hammer');
  });

  it('distingue le fléau de la masse malgré la famille commune', () => {
    expect(kindOf('fleau')).toBe('flail');
    expect(kindOf('fleau-a-deux-mains')).toBe('flail');
  });

  it('résout les armes sans famille de prédilection par leur id', () => {
    expect(kindOf('baton')).toBe('staff');
    expect(kindOf('baton-ferre')).toBe('staff');
    expect(kindOf('stylet')).toBe('dagger');
    expect(kindOf('faux')).toBe('scythe');
    expect(kindOf('pioche')).toBe('pick');
    expect(kindOf('trident')).toBe('trident');
    expect(kindOf('poele')).toBe('pan');
    expect(kindOf('rouleau-a-patisserie')).toBe('rolling-pin');
  });

  it('résout les armes à distance par leur sous-type de tir', () => {
    expect(kindOf('arc-court')).toBe('bow');
    expect(kindOf('arc-long')).toBe('bow');
    expect(kindOf('arbalete-de-poing')).toBe('crossbow');
    expect(kindOf('arbalete-lourde')).toBe('crossbow');
    expect(kindOf('baliste')).toBe('crossbow'); // arbalète montée (rangedKind: 'crossbow')
    expect(kindOf('fronde')).toBe('sling');
    expect(kindOf('lance-pierre')).toBe('sling');
    expect(kindOf('petoire')).toBe('firearm');
    expect(kindOf('mousquet')).toBe('firearm');
    expect(kindOf('couleuvrine')).toBe('cannon'); // `firearm` comme le mousquet, mais c'est un canon
  });

  it('préfère la famille de contact au jet pour les armes lançables', () => {
    // Toutes ces armes ont `thrown`, mais leur silhouette est celle de leur famille de contact.
    expect(kindOf('hachette')).toBe('axe');
    expect(kindOf('epieu')).toBe('polearm');
    expect(kindOf('lance-de-lancer')).toBe('polearm');
    expect(kindOf('dague')).toBe('dagger');
    expect(kindOf('dague-de-lancer')).toBe('dagger');
    expect(kindOf('couteaux-de-lancer')).toBe('dagger');
    // Seul le javelot reste dans le sous-type « arme de jet ».
    expect(kindOf('javelot')).toBe('thrown');
  });

  it("ne donne aucun sous-type à ce qui n'est pas une arme du catalogue", () => {
    expect(weaponIconKind({ itemId: 'cotte-de-mailles', quantity: 1 })).toBeNull();
    expect(weaponIconKind({ itemId: 'petit-bouclier', quantity: 1 })).toBeNull();
    expect(weaponIconKind({ itemId: 'objet-inconnu-xyz', quantity: 1 })).toBeNull();
    // Objet libre : aucune donnée d'arme à lire, il garde l'icône de son type déclaré.
    expect(
      weaponIconKind({ custom: true, name: 'Épée de mon oncle', type: 'weapon', quantity: 1 }),
    ).toBeNull();
  });

  it("lit l'arme d'une LIGNE d'inventaire, variantes comprises", () => {
    expect(weaponIconKind({ itemId: 'arc-long', quantity: 1 })).toBe('bow');
    // Une variante (nom/prix/DEF surchargés) ne change pas la forme de l'arme.
    expect(
      weaponIconKind({ itemId: 'baton', quantity: 1, overrides: { name: 'Bâton noueux' } }),
    ).toBe('staff');
  });
});
