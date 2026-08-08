import { describe, expect, it } from 'vitest';
import type { Database, Json } from '@/lib/supabase/types';
import { parseGmInventory, parseLoot, parseRules, parseRumors, rowToCampaign } from './repo';
import type { CampaignRules } from './types';

type CampaignRow = Database['public']['Tables']['campaigns']['Row'];

/** Ligne SQL minimale, surchargeable par test. */
const row = (over: Partial<CampaignRow> = {}): CampaignRow => ({
  id: 'c1',
  owner_id: 'u1',
  name: 'La Tour Écarlate',
  description: null,
  rules: { firearmsAllowed: true },
  rumors: [],
  loot: [],
  gm_inventory: { categories: [], items: [] },
  created_at: '2026-07-01T10:00:00Z',
  updated_at: '2026-07-02T11:00:00Z',
  ...over,
});

describe('parseRules', () => {
  it('lit firearmsAllowed quand présent', () => {
    expect(parseRules({ firearmsAllowed: false })).toEqual({
      firearmsAllowed: false,
      hitDieOnLevelUp: false,
    });
  });

  it('lit hitDieOnLevelUp (règle maison PER-87) quand présent', () => {
    expect(parseRules({ hitDieOnLevelUp: true })).toEqual({
      firearmsAllowed: true,
      hitDieOnLevelUp: true,
    });
  });

  it('retombe sur le défaut (armes à feu OK, dé de vie off) pour un objet vide', () => {
    expect(parseRules({})).toEqual({ firearmsAllowed: true, hitDieOnLevelUp: false });
  });

  it('ignore une valeur non booléenne et retombe sur le défaut', () => {
    expect(parseRules({ firearmsAllowed: 'yes' as unknown as boolean })).toEqual({
      firearmsAllowed: true,
      hitDieOnLevelUp: false,
    });
  });

  it('tolère null / un tableau (jsonb inattendu) sans lever', () => {
    expect(parseRules(null)).toEqual({ firearmsAllowed: true, hitDieOnLevelUp: false });
    expect(parseRules([1, 2] as unknown as Record<string, never>)).toEqual({
      firearmsAllowed: true,
      hitDieOnLevelUp: false,
    });
  });
});

describe('rowToCampaign', () => {
  it('mappe les colonnes vers l’entité Campaign', () => {
    expect(rowToCampaign(row())).toEqual({
      id: 'c1',
      name: 'La Tour Écarlate',
      description: null,
      rules: { firearmsAllowed: true, hitDieOnLevelUp: false },
      rumors: [],
      loot: [],
      gmInventory: { categories: [], items: [] },
      createdAt: '2026-07-01T10:00:00Z',
      updatedAt: '2026-07-02T11:00:00Z',
    });
  });

  it('conserve une description non nulle et parse des règles partielles', () => {
    const c = rowToCampaign(row({ description: 'Notes du MJ', rules: {} }));
    expect(c.description).toBe('Notes du MJ');
    expect(c.rules).toEqual({ firearmsAllowed: true, hitDieOnLevelUp: false });
  });
});

describe('parseRumors', () => {
  it('lit les rumeurs bien formées', () => {
    const raw = [
      { id: 'r1', text: 'Le maire cache un secret', served: false },
      { id: 'r2', text: 'Une comète annonce un malheur', served: true },
    ];
    expect(parseRumors(raw as unknown as Json)).toEqual(raw);
  });

  it('retombe sur une réserve vide pour une valeur non-tableau (null, ancien format)', () => {
    expect(parseRumors(null)).toEqual([]);
    expect(parseRumors({ served: true } as unknown as Json)).toEqual([]);
  });

  it('ignore les éléments mal formés et normalise served', () => {
    const raw = [
      { id: 'ok', text: 'valide' }, // served absent → false
      { id: 42, text: 'id non-chaîne' }, // rejeté
      { text: 'sans id' }, // rejeté
      'chaîne nue', // rejeté
      { id: 'ok2', text: 'servi', served: 'yes' }, // served non-booléen → false
    ];
    expect(parseRumors(raw as unknown as Json)).toEqual([
      { id: 'ok', text: 'valide', served: false },
      { id: 'ok2', text: 'servi', served: false },
    ]);
  });
});

describe('parseLoot', () => {
  it('lit les objets bien formés (objet libre ET variante catalogue)', () => {
    const raw = [
      { id: 'l1', line: { custom: true, name: 'Anneau de brume', quantity: 1, details: 'Invisibilité 1×/jour' }, served: false },
      { id: 'l2', line: { itemId: 'epee-longue', quantity: 1 }, served: true },
    ];
    expect(parseLoot(raw as unknown as Json)).toEqual(raw);
  });

  it('retombe sur une réserve vide pour une valeur non-tableau (null, ancien format)', () => {
    expect(parseLoot(null)).toEqual([]);
    expect(parseLoot({ id: 'x' } as unknown as Json)).toEqual([]);
  });

  it('ignore les éléments mal formés et normalise served', () => {
    const raw = [
      { id: 'ok', line: { custom: true, name: 'valide', quantity: 1 } }, // served absent → false
      { id: 42, line: { custom: true, name: 'id non-chaîne', quantity: 1 } }, // id non-chaîne → rejeté
      { id: 'no-line' }, // line absente → rejeté
      { id: 'bad-line', line: { quantity: 1 } }, // line sans discriminant → rejeté
      { id: 'custom-no-name', line: { custom: true, quantity: 1 } }, // objet libre sans nom → rejeté
      'chaîne nue', // rejeté
      { id: 'ok2', line: { itemId: 'dague', quantity: 1 }, served: 'yes' }, // served non-booléen → false
    ];
    expect(parseLoot(raw as unknown as Json)).toEqual([
      { id: 'ok', line: { custom: true, name: 'valide', quantity: 1 }, served: false },
      { id: 'ok2', line: { itemId: 'dague', quantity: 1 }, served: false },
    ]);
  });
});

describe('parseGmInventory', () => {
  it('lit un inventaire bien formé (catégories + items catégorisés et non)', () => {
    const raw = {
      categories: [
        { id: 'cat1', name: 'Potions', collapsed: false },
        { id: 'cat2', name: 'Reliques', collapsed: true },
      ],
      items: [
        { id: 'i1', line: { custom: true, name: 'Élixir', quantity: 1 }, categoryId: 'cat1' },
        { id: 'i2', line: { itemId: 'epee-longue', quantity: 1 }, categoryId: null },
      ],
    };
    expect(parseGmInventory(raw as unknown as Json)).toEqual(raw);
  });

  it('retombe sur un inventaire vide pour une valeur non-objet (null, ancien format)', () => {
    expect(parseGmInventory(null)).toEqual({ categories: [], items: [] });
    expect(parseGmInventory([1, 2] as unknown as Json)).toEqual({ categories: [], items: [] });
  });

  it('ignore les catégories/items mal formés', () => {
    const raw = {
      categories: [
        { id: 'cat1', name: 'Potions', collapsed: false },
        { id: 42, name: 'id non-chaîne' }, // rejetée
        { name: 'sans id' }, // rejetée
      ],
      items: [
        { id: 'ok', line: { custom: true, name: 'valide', quantity: 1 }, categoryId: 'cat1' },
        { id: 42, line: { custom: true, name: 'id non-chaîne', quantity: 1 } }, // rejeté
        { id: 'no-line' }, // rejeté
        { id: 'bad-line', line: { quantity: 1 } }, // rejeté (sans discriminant)
      ],
    };
    expect(parseGmInventory(raw as unknown as Json)).toEqual({
      categories: [{ id: 'cat1', name: 'Potions', collapsed: false }],
      items: [{ id: 'ok', line: { custom: true, name: 'valide', quantity: 1 }, categoryId: 'cat1' }],
    });
  });

  it('ramène categoryId à null si la catégorie référencée n’existe pas', () => {
    const raw = {
      categories: [],
      items: [{ id: 'orphan', line: { itemId: 'dague', quantity: 1 }, categoryId: 'cat-disparue' }],
    };
    expect(parseGmInventory(raw as unknown as Json)).toEqual({
      categories: [],
      items: [{ id: 'orphan', line: { itemId: 'dague', quantity: 1 }, categoryId: null }],
    });
  });
});

describe('round-trip des règles (écriture → lecture)', () => {
  // `updateCampaign` sérialise `CampaignRules` tel quel vers la colonne jsonb ;
  // `parseRules` doit relire exactement ce qui a été écrit. On verrouille la
  // symétrie sans mocker Supabase (l'écriture réseau reste hors périmètre unitaire).
  it('parseRules relit fidèlement des règles sérialisées', () => {
    const rules: CampaignRules = { firearmsAllowed: false, hitDieOnLevelUp: true };
    expect(parseRules(rules as unknown as Json)).toEqual(rules);
  });
});
