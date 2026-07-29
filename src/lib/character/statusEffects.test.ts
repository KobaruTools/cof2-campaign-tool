import { describe, expect, it } from 'vitest';
import { SITUATIONAL_EFFECT_IDS, STATUS_EFFECTS, STATUS_EFFECT_IDS } from '@/data/schema';
import {
  clampIntensity,
  isStackingStatus,
  resolveStatusModifiers,
  statusEntry,
  statusMaxIntensity,
} from './statusEffects';

describe('catalogues — cohérence des modificateurs (PER-277)', () => {
  it('conserve le verbatim inchangé (part comportementale)', () => {
    expect(STATUS_EFFECTS.weakened.effect).toBe('Dé malus à tous les tests.');
    expect(STATUS_EFFECTS.blinded.effect).toContain('-10 en attaque à distance');
  });

  it('les 10 états du glossaire sont BINAIRES (aucun cumul)', () => {
    for (const id of STATUS_EFFECT_IDS) {
      expect(isStackingStatus(id)).toBe(false);
      expect(statusMaxIntensity(id)).toBe(1);
    }
  });

  it('marque Aveuglé : -5 (Init/DEF/contact/magie), -10 à distance', () => {
    expect(STATUS_EFFECTS.blinded.modifiers?.derived).toEqual({
      initiative: -5,
      def: -5,
      meleeAttack: -5,
      magicAttack: -5,
      rangedAttack: -10,
    });
  });

  it('Affaibli = dé malus à tous les tests, sans modificateur dérivé', () => {
    expect(STATUS_EFFECTS.weakened.modifiers).toEqual({ allTestsMalusDie: true });
  });

  it('Immobilisé = dé malus aux tests d’attaque seulement', () => {
    expect(STATUS_EFFECTS.immobilized.modifiers).toEqual({ attackTestsMalusDie: true });
  });

  it('les états purement comportementaux n’ont aucune part chiffrée', () => {
    for (const id of ['winded', 'crippled', 'paralyzed', 'slowed'] as const) {
      expect(STATUS_EFFECTS[id].modifiers).toBeUndefined();
    }
  });

  it('Attaque invalidante = cumulatif -1/palier, plafond 3', () => {
    const entry = SITUATIONAL_EFFECT_IDS.map((id) => id)[0];
    expect(entry).toBe('invalidating-attack');
    expect(statusEntry('invalidating-attack')?.modifiers).toEqual({
      allTestsFlat: -1,
      damageDealt: -1,
    });
    expect(isStackingStatus('invalidating-attack')).toBe(true);
    expect(statusMaxIntensity('invalidating-attack')).toBe(3);
  });
});

describe('clampIntensity', () => {
  it('borne un état binaire à 1', () => {
    expect(clampIntensity('blinded', 5)).toBe(1);
    expect(clampIntensity('blinded', 0)).toBe(1);
  });

  it('borne un état cumulatif dans [1, plafond]', () => {
    expect(clampIntensity('invalidating-attack', 0)).toBe(1);
    expect(clampIntensity('invalidating-attack', 2)).toBe(2);
    expect(clampIntensity('invalidating-attack', 9)).toBe(3);
  });

  it('tronque les valeurs non entières et neutralise NaN', () => {
    expect(clampIntensity('invalidating-attack', 2.9)).toBe(2);
    expect(clampIntensity('invalidating-attack', Number.NaN)).toBe(1);
  });
});

describe('resolveStatusModifiers', () => {
  it('sans état = tout à zéro', () => {
    expect(resolveStatusModifiers([])).toEqual({
      derived: {},
      allTestsMalusDie: false,
      attackTestsMalusDie: false,
      allTestsFlat: 0,
      damageDealt: 0,
    });
  });

  it('un état binaire injecte ses modificateurs dérivés tels quels', () => {
    const r = resolveStatusModifiers([{ id: 'blinded' }]);
    expect(r.derived).toEqual({
      initiative: -5,
      def: -5,
      meleeAttack: -5,
      magicAttack: -5,
      rangedAttack: -10,
    });
    expect(r.allTestsMalusDie).toBe(false);
  });

  it('somme les modificateurs dérivés de plusieurs états sur la même stat', () => {
    // Étourdi (DEF -5) + Renversé (DEF -5, attaques -5) → DEF -10.
    const r = resolveStatusModifiers([{ id: 'dazed' }, { id: 'prone' }]);
    expect(r.derived.def).toBe(-10);
    expect(r.derived.meleeAttack).toBe(-5);
  });

  it('agrège les drapeaux de dé malus (OU logique)', () => {
    const r = resolveStatusModifiers([{ id: 'weakened' }, { id: 'immobilized' }]);
    expect(r.allTestsMalusDie).toBe(true);
    expect(r.attackTestsMalusDie).toBe(true);
    expect(r.derived).toEqual({});
  });

  it('multiplie les malus plats cumulatifs par l’intensité (clampée)', () => {
    const r = resolveStatusModifiers([{ id: 'invalidating-attack', intensity: 3 }]);
    expect(r.allTestsFlat).toBe(-3);
    expect(r.damageDealt).toBe(-3);
  });

  it('clampe l’intensité au plafond du catalogue', () => {
    const r = resolveStatusModifiers([{ id: 'invalidating-attack', intensity: 10 }]);
    expect(r.allTestsFlat).toBe(-3);
  });

  it('intensité par défaut = 1 pour un cumulatif non précisé', () => {
    const r = resolveStatusModifiers([{ id: 'invalidating-attack' }]);
    expect(r.allTestsFlat).toBe(-1);
    expect(r.damageDealt).toBe(-1);
  });

  it('ignore une intensité fournie sur un état binaire', () => {
    const r = resolveStatusModifiers([{ id: 'dazed', intensity: 4 }]);
    expect(r.derived.def).toBe(-5);
  });

  it('n’expose pas les stats dérivées dont le total est nul', () => {
    const r = resolveStatusModifiers([{ id: 'winded' }]);
    expect(r.derived).toEqual({});
  });
});
