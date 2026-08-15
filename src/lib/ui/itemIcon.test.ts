import { describe, expect, it } from 'vitest';
import { equipment } from '@/data';
import { ITEM_ICON_IDS, ITEM_SUBCATEGORY_ICON_IDS } from '@/data/item-icons';
import { ITEM_TYPE_ORDER } from '@/lib/character/items';
import {
  ITEM_ICON_LABELS,
  PICKER_ICON_IDS,
  UNPICKABLE_SUBCATEGORY_IDS,
  defaultItemIconId,
  itemIconId,
  itemIconMarkup,
} from '@/lib/ui/itemIcon';

describe('itemIconMarkup', () => {
  it('a un markup pour CHAQUE id du vocabulaire', () => {
    const orphans = ITEM_ICON_IDS.filter((id) => !itemIconMarkup(id));
    expect(orphans).toEqual([]);
  });

  it('a un libellé FR pour chaque id (info-bulle et accessibilité du sélecteur)', () => {
    const missing = ITEM_ICON_IDS.filter((id) => !ITEM_ICON_LABELS[id]);
    expect(missing).toEqual([]);
  });
});

describe('sélecteur d’icône', () => {
  it('propose TOUT le vocabulaire (aucune icône inatteignable)', () => {
    expect(UNPICKABLE_SUBCATEGORY_IDS).toEqual([]);
    expect(new Set(PICKER_ICON_IDS).size).toBe(ITEM_ICON_IDS.length);
  });

  it('ne propose aucun id en double', () => {
    expect(PICKER_ICON_IDS.length).toBe(new Set(PICKER_ICON_IDS).size);
  });
});

describe('itemIconId — cascade de résolution', () => {
  it('1. le choix explicite du joueur gagne sur tout', () => {
    expect(itemIconId({ itemId: 'corde-15-m', quantity: 1, icon: 'gems' })).toBe('gems');
    expect(itemIconId({ itemId: 'epee-longue', quantity: 1, icon: 'ring' })).toBe('ring');
    expect(
      itemIconId({ custom: true, name: 'Cape de voyage', type: 'misc', quantity: 1, icon: 'cloak' }),
    ).toBe('cloak');
  });

  it('2. sinon la sous-catégorie déclarée par la donnée du livre', () => {
    // Le cas d'école : corde et grappin sont tous deux de l'« équipement » et ne se
    // distinguaient pas à l'œil.
    expect(itemIconId({ itemId: 'corde-15-m', quantity: 1 })).toBe('rope');
    expect(itemIconId({ itemId: 'grappin', quantity: 1 })).toBe('grapple');
    expect(itemIconId({ itemId: 'cotte-de-mailles', quantity: 1 })).toBe('heavy-mail');
    expect(itemIconId({ itemId: 'chemise-de-mailles', quantity: 1 })).toBe('mail-shirt');
    expect(itemIconId({ itemId: 'grand-bouclier', quantity: 1 })).toBe('large-shield');
    expect(itemIconId({ itemId: 'pnoulpe', quantity: 1 })).toBe('octopus');
  });

  it('3. sinon le sous-type d’arme DÉRIVÉ des règles (aucune arme annotée)', () => {
    expect(itemIconId({ itemId: 'hache-a-deux-mains', quantity: 1 })).toBe('axe');
    expect(itemIconId({ itemId: 'arbalete-lourde', quantity: 1 })).toBe('crossbow');
    expect(itemIconId({ itemId: 'javelot', quantity: 1 })).toBe('thrown');
  });

  it('4. sinon l’icône du type d’objet', () => {
    // Objet libre : aucune sous-catégorie à hériter.
    expect(itemIconId({ custom: true, name: 'Babiole', type: 'treasure', quantity: 1 })).toBe('treasure');
    expect(itemIconId({ custom: true, name: 'Truc', quantity: 1 })).toBe('misc');
    // Un objet libre de type arme retombe sur l'icône générique d'arme.
    expect(itemIconId({ custom: true, name: 'Sabre de mon oncle', type: 'weapon', quantity: 1 })).toBe('weapon');
    // `itemId` inconnu du catalogue.
    expect(itemIconId({ itemId: 'objet-inconnu-xyz', quantity: 1 })).toBe('misc');
  });

  it('ignore les variantes et les reskins (l’icône suit l’objet de BASE)', () => {
    expect(itemIconId({ itemId: 'baton', quantity: 1, overrides: { name: 'Bâton noueux' } })).toBe('staff');
  });
});

describe('defaultItemIconId', () => {
  it('donne ce que la cascade donnerait SANS choix explicite', () => {
    expect(defaultItemIconId({ itemId: 'corde-15-m', quantity: 1, icon: 'gems' })).toBe('rope');
    expect(defaultItemIconId({ itemId: 'epee-longue', quantity: 1, icon: 'ring' })).toBe('sword');
    expect(
      defaultItemIconId({ custom: true, name: 'X', type: 'consumable', quantity: 1, icon: 'wand' }),
    ).toBe('consumable');
  });
});

describe('catalogue', () => {
  it('donne une icône à CHAQUE objet du catalogue, et jamais le repli de type hors armes', () => {
    const typeIds = new Set<string>(ITEM_TYPE_ORDER);
    for (const item of equipment) {
      const id = itemIconId({ itemId: item.id, quantity: 1 });
      expect(itemIconMarkup(id), `${item.name} → ${id}`).toBeTruthy();
      // Tout objet NON arme doit être annoté en donnée (sinon il retombe sur l'icône de son
      // type, c'est-à-dire l'indistinction qu'on vient de corriger).
      if (item.category !== 'weapon') {
        expect(typeIds.has(id), `${item.name} n'a pas de sous-catégorie (icône = ${id})`).toBe(false);
      }
    }
  });

  it('n’utilise que des ids du vocabulaire fermé', () => {
    const known = new Set<string>(ITEM_ICON_IDS);
    const bad = equipment.filter((i) => i.icon && !known.has(i.icon)).map((i) => i.id);
    expect(bad).toEqual([]);
  });

  it('couvre les 30 sous-catégories du catalogue (les 17 autres sont réservées aux objets libres)', () => {
    const used = new Set(equipment.map((i) => i.icon).filter(Boolean));
    const unused = ITEM_SUBCATEGORY_ICON_IDS.filter((id) => !used.has(id));
    // 47 sous-catégories - 30 portées par le catalogue = 17 icônes « libres ».
    expect(unused.length).toBe(17);
  });
});
