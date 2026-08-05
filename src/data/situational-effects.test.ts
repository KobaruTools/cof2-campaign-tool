import { describe, expect, it } from 'vitest';
import {
  SITUATIONAL_EFFECT_IDS,
  SITUATIONAL_EFFECTS,
  SITUATIONAL_EFFECT_LABELS,
} from './schema';
import { featureById } from './index';
import {
  clampIntensity,
  isStackingStatus,
  resolveStatusModifiers,
  statusMaxIntensity,
  statusSheetImpact,
} from '@/lib/character/statusEffects';

// PER-74 — catalogue des effets situationnels (première entrée : Attaque invalidante, chasseur de prime r7).
describe('SITUATIONAL_EFFECTS (catalogue)', () => {
  it('chaque id a un libellé + un effet verbatim + une page source valide', () => {
    for (const id of SITUATIONAL_EFFECT_IDS) {
      const entry = SITUATIONAL_EFFECTS[id];
      expect(entry, id).toBeDefined();
      expect(entry.label.trim().length, `${id}.label`).toBeGreaterThan(0);
      expect(entry.effect.trim().length, `${id}.effect`).toBeGreaterThan(0);
      expect(entry.sourcePage, `${id}.sourcePage`).toBeGreaterThan(0);
    }
  });

  it('SITUATIONAL_EFFECT_LABELS est dérivé du catalogue', () => {
    for (const id of SITUATIONAL_EFFECT_IDS) {
      expect(SITUATIONAL_EFFECT_LABELS[id]).toBe(SITUATIONAL_EFFECTS[id].label);
    }
  });

  it("« Attaque invalidante » est la première entrée (chasseur de prime r7, p. 140)", () => {
    expect(SITUATIONAL_EFFECT_IDS).toContain('invalidating-attack');
    expect(SITUATIONAL_EFFECTS['invalidating-attack'].sourcePage).toBe(140);
  });

  it('chasseur de prime r7 référence l\'effet situationnel via situationalEffectIds', () => {
    const r7 = featureById.get('prestige-chasseur-de-prime-r7');
    expect(r7?.situationalEffectIds).toEqual(['invalidating-attack']);
  });

  it("« Muet » est catalogué (tueur à gages r4, p. 145) et référencé par la capacité", () => {
    expect(SITUATIONAL_EFFECT_IDS).toContain('silenced');
    expect(SITUATIONAL_EFFECTS['silenced'].label).toBe('Muet');
    expect(SITUATIONAL_EFFECTS['silenced'].sourcePage).toBe(145);
    const r4 = featureById.get('prestige-tueur-a-gages-r4');
    expect(r4?.situationalEffectIds).toEqual(['silenced']);
  });

  it("« Nuée de criquets » est cataloguée (vermines r5, p. 175) : -3 plat, sans stacking, référencée", () => {
    const entry = SITUATIONAL_EFFECTS['locust-swarm'];
    expect(entry.label).toBe('Nuée de criquets');
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(175);
    expect(entry.modifiers?.allTestsFlat).toBe(-3);
    expect(entry.stacking).toBeUndefined();
    const r5 = featureById.get('prestige-vermines-r5');
    expect(r5?.situationalEffectIds).toEqual(['locust-swarm']);
  });

  it("« Nuée d'insectes » est cataloguée (druide animaux r3, p. 114) : -2 plat, sans stacking, référencée", () => {
    const entry = SITUATIONAL_EFFECTS['insect-swarm'];
    expect(entry.label).toBe("Nuée d'insectes");
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(114);
    expect(entry.modifiers?.allTestsFlat).toBe(-2);
    expect(entry.stacking).toBeUndefined();
    const r3 = featureById.get('animaux-r3');
    expect(r3?.situationalEffectIds).toEqual(['insect-swarm']);
  });

  it('les nuées (non cumulatives) portent un malus plat NÉGATIF sans stacking', () => {
    for (const id of ['locust-swarm', 'insect-swarm'] as const) {
      const entry = SITUATIONAL_EFFECTS[id];
      expect(entry.modifiers?.allTestsFlat, id).toBeLessThan(0);
      expect(entry.stacking, id).toBeUndefined();
    }
  });

  it("« Saignement » est catalogué (écorcheur r4, p. 150) : DoT pur, référencé", () => {
    const entry = SITUATIONAL_EFFECTS['bleeding'];
    expect(entry.label).toBe('Saignement');
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(150);
    expect(entry.modifiers).toBeUndefined();
    const r4 = featureById.get('prestige-ecorcheur-r4');
    expect(r4?.situationalEffectIds).toEqual(['bleeding']);
  });

  it("« Hémorragie interne » est cataloguée (écorcheur r7, p. 151) : DoT pur, référencée", () => {
    const entry = SITUATIONAL_EFFECTS['internal-hemorrhage'];
    expect(entry.label).toBe('Hémorragie interne');
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(151);
    expect(entry.modifiers).toBeUndefined();
    const r7 = featureById.get('prestige-ecorcheur-r7');
    expect(r7?.situationalEffectIds).toEqual(['internal-hemorrhage']);
  });

  it('tout situationalEffectIds posé sur une capacité pointe une entrée connue du catalogue', () => {
    const known = new Set<string>(SITUATIONAL_EFFECT_IDS);
    for (const f of featureById.values()) {
      for (const id of f.situationalEffectIds ?? []) {
        expect(known.has(id), `${f.id} → ${id}`).toBe(true);
      }
    }
  });
});

/**
 * PER-288 — VERROU du contrat « malus plat SANS `stacking` » (intensité = 1). Les entrées « nuées » de
 * PER-289 (criquets -3, insectes -2) porteront un `allTestsFlat` NÉGATIF sans champ `stacking` : elles
 * doivent s'appliquer EXACTEMENT une fois (jamais mises à l'échelle, jamais ignorées). Le contrat repose
 * sur deux garanties composées, verrouillées ici sur le catalogue existant :
 *   1. une entrée SANS `stacking` a une intensité forcée à 1 (clamp) — même si un état appliqué demande
 *      une intensité supérieure ;
 *   2. à intensité 1, `allTestsFlat` vaut sa valeur de base (non multipliée), et `statusSheetImpact` la
 *      reporte sur les trois tests d'attaque.
 * Transitivement : une future entrée non cumulative à `allTestsFlat` s'applique une seule fois.
 */
describe('PER-288 — `allTestsFlat` s’applique sans `stacking` (intensité = 1)', () => {
  it('une entrée NON cumulative force l’intensité à 1 (clamp), quelle que soit la demande', () => {
    // `silenced` est non cumulatif (comme le seront les nuées de PER-289).
    expect(isStackingStatus('silenced')).toBe(false);
    expect(statusMaxIntensity('silenced')).toBe(1);
    expect(clampIntensity('silenced', 3)).toBe(1);
    expect(clampIntensity('silenced', 99)).toBe(1);
  });

  it('resolveStatusModifiers : à intensité 1, le malus plat vaut sa valeur de base (non multipliée)', () => {
    // Une seule instance, intensité omise (défaut = 1) → -1 (le PALIER de base), pas de mise à l’échelle.
    const r = resolveStatusModifiers([{ id: 'invalidating-attack' }]);
    expect(r.allTestsFlat).toBe(-1);
    expect(r.damageDealt).toBe(-1);
    // Le malus plat n’est PAS un modificateur de stat dérivée : `derived` reste vide.
    expect(r.derived).toEqual({});
    expect(r.allTestsMalusDie).toBe(false);
    expect(r.attackTestsMalusDie).toBe(false);
  });

  it('statusSheetImpact : à intensité 1, reporte -1 sur les trois tests d’attaque', () => {
    const r = statusSheetImpact([{ id: 'invalidating-attack' }]);
    expect(r.allTestsFlat).toBe(-1);
    expect(r.damageDealt).toBe(-1);
    const label = 'État : Attaque invalidante';
    for (const key of ['meleeAttack', 'rangedAttack', 'magicAttack'] as const) {
      expect(r.modSources[key], key).toEqual([{ label, value: -1 }]);
      expect(r.mods[key], key).toBe(-1);
    }
  });
});
