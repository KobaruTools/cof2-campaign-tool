import { describe, expect, it } from 'vitest';
import type { Database } from '@/lib/supabase/types';
import { parseRules, rowToCampaign } from './repo';

type CampaignRow = Database['public']['Tables']['campaigns']['Row'];

/** Ligne SQL minimale, surchargeable par test. */
const row = (over: Partial<CampaignRow> = {}): CampaignRow => ({
  id: 'c1',
  owner_id: 'u1',
  name: 'La Tour Écarlate',
  description: null,
  rules: { firearmsAllowed: true },
  created_at: '2026-07-01T10:00:00Z',
  updated_at: '2026-07-02T11:00:00Z',
  ...over,
});

describe('parseRules', () => {
  it('lit firearmsAllowed quand présent', () => {
    expect(parseRules({ firearmsAllowed: false })).toEqual({ firearmsAllowed: false });
  });

  it('retombe sur le défaut (armes à feu OK) pour un objet vide', () => {
    expect(parseRules({})).toEqual({ firearmsAllowed: true });
  });

  it('ignore une valeur non booléenne et retombe sur le défaut', () => {
    expect(parseRules({ firearmsAllowed: 'yes' as unknown as boolean })).toEqual({
      firearmsAllowed: true,
    });
  });

  it('tolère null / un tableau (jsonb inattendu) sans lever', () => {
    expect(parseRules(null)).toEqual({ firearmsAllowed: true });
    expect(parseRules([1, 2] as unknown as Record<string, never>)).toEqual({
      firearmsAllowed: true,
    });
  });
});

describe('rowToCampaign', () => {
  it('mappe les colonnes vers l’entité Campaign', () => {
    expect(rowToCampaign(row())).toEqual({
      id: 'c1',
      name: 'La Tour Écarlate',
      description: null,
      rules: { firearmsAllowed: true },
      createdAt: '2026-07-01T10:00:00Z',
      updatedAt: '2026-07-02T11:00:00Z',
    });
  });

  it('conserve une description non nulle et parse des règles partielles', () => {
    const c = rowToCampaign(row({ description: 'Notes du MJ', rules: {} }));
    expect(c.description).toBe('Notes du MJ');
    expect(c.rules).toEqual({ firearmsAllowed: true });
  });
});
