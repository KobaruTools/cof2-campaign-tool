import { describe, expect, it } from 'vitest';
import { capaciteParId, profilParId, voieParId } from '@/data';
import { familles } from '@/data/familles';
import { progression } from '@/data/progression';
import type { FamilleId } from '@/data/schema';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import {
  coutCapacite,
  niveauMinPourRang,
  peutAcquerirCapacite,
  verifierConformite,
  type MoteurContexte,
} from './legalite';

const ctx: MoteurContexte = {
  capaciteParId,
  voieParId,
  profilParId,
  familleParId: new Map(familles.map((f) => [f.id as FamilleId, f])),
  progression,
};

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    peupleId: 'humain',
    profilId: 'barbare',
    niveau: 1,
    caracteristiques: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    voieDePeupleId: 'humain',
    capaciteIds: [],
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('coutCapacite', () => {
  const cap = (id: string) => capaciteParId.get(id)!;
  it('rang 1 et 2 coûtent 1, rang 3+ coûtent 2', () => {
    expect(coutCapacite(cap('brute-r1'), progression)).toBe(1);
    expect(coutCapacite(cap('brute-r2'), progression)).toBe(1);
    expect(coutCapacite(cap('brute-r3'), progression)).toBe(2);
    expect(coutCapacite(cap('brute-r5'), progression)).toBe(2);
  });
});

describe('niveauMinPourRang', () => {
  const mages = familles.find((f) => f.id === 'mages')!;
  const combattants = familles.find((f) => f.id === 'combattants')!;
  it('suit la table (rang 3 → 3, rang 4 → 5)', () => {
    expect(niveauMinPourRang(3, combattants, progression)).toBe(3);
    expect(niveauMinPourRang(4, combattants, progression)).toBe(5);
  });
  it('exception mage : rang 2 dès le niveau 1', () => {
    expect(niveauMinPourRang(2, mages, progression)).toBe(1);
    expect(niveauMinPourRang(2, combattants, progression)).toBe(2);
  });
});

describe('peutAcquerirCapacite', () => {
  it('légal : ouvrir une voie de profil au rang 1', () => {
    const c = makeCharacter({ profilId: 'guerrier', capaciteIds: [] });
    expect(peutAcquerirCapacite(c, 'combat-r1', ctx).legal).toBe(true);
  });

  it('illégal : capacité déjà acquise', () => {
    const c = makeCharacter({ capaciteIds: ['brute-r1'] });
    const r = peutAcquerirCapacite(c, 'brute-r1', ctx);
    expect(r.legal).toBe(false);
    expect(r.raisons.join(' ')).toMatch(/déjà acquise/);
  });

  it('illégal : rang dans le désordre (rang 3 sans 1 et 2)', () => {
    const c = makeCharacter({ niveau: 3, capaciteIds: [] });
    const r = peutAcquerirCapacite(c, 'brute-r3', ctx);
    expect(r.legal).toBe(false);
    expect(r.raisons.join(' ')).toMatch(/Rang 1.*non acquis|Rang 2.*non acquis/);
  });

  it('illégal : niveau insuffisant pour le rang', () => {
    const c = makeCharacter({ niveau: 1, capaciteIds: ['brute-r1', 'brute-r2'] });
    const r = peutAcquerirCapacite(c, 'brute-r3', ctx);
    expect(r.legal).toBe(false);
    expect(r.raisons.join(' ')).toMatch(/Niveau 3 requis/);
  });

  it('illégal : voie de prestige avant le niveau 5', () => {
    const c = makeCharacter({ niveau: 4 });
    const r = peutAcquerirCapacite(c, 'prestige-expert-r4', ctx);
    expect(r.legal).toBe(false);
    expect(r.raisons.join(' ')).toMatch(/niveau 5/);
  });
});

describe('verifierConformite', () => {
  it('Lhagva niveau 1 (capacités réelles) : aucun avertissement', () => {
    const c = makeCharacter({
      profilId: 'barbare',
      peupleId: 'humain',
      voieDePeupleId: 'humain',
      niveau: 1,
      caracteristiques: { AGI: 1, CON: 2, FOR: 3, PER: 1, CHA: -1, INT: 0, VOL: 1 },
      capaciteIds: ['pourfendeur-r1', 'rage-r1', 'humain-r1'],
    });
    expect(verifierConformite(c, ctx)).toEqual([]);
  });

  it('signale un trou de rang dans une voie', () => {
    const c = makeCharacter({ niveau: 5, capaciteIds: ['brute-r1', 'brute-r3'] });
    const codes = verifierConformite(c, ctx).map((a) => a.code);
    expect(codes).toContain('RANG_MANQUANT');
  });

  it('signale une caractéristique hors plage', () => {
    const c = makeCharacter({
      caracteristiques: { AGI: 0, CON: 7, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
      capaciteIds: [],
    });
    const codes = verifierConformite(c, ctx).map((a) => a.code);
    expect(codes).toContain('CARAC_HORS_PLAGE');
  });

  it('signale une capacité de rang au-dessus du niveau', () => {
    // brute rang 3 (niveau requis 3) sur un personnage de niveau 1
    const c = makeCharacter({ niveau: 1, capaciteIds: ['brute-r1', 'brute-r2', 'brute-r3'] });
    const codes = verifierConformite(c, ctx).map((a) => a.code);
    expect(codes).toContain('NIVEAU_RANG_INSUFFISANT');
  });
});
