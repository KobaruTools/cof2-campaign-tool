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

  it("« Nuée de criquets » déclare sa durée « 5 + CHA » (PER-446)", () => {
    expect(SITUATIONAL_EFFECTS['locust-swarm'].durationFrom).toEqual({ ability: 'CHA', base: 5 });
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

  it("« Blessures affreuses » est cataloguée (écorcheur r6, p. 151) : pénalité de guérison, référencée", () => {
    const entry = SITUATIONAL_EFFECTS['grievous-wounds'];
    expect(entry.label).toBe('Blessures affreuses');
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(151);
    expect(entry.modifiers).toBeUndefined();
    const r6 = featureById.get('prestige-ecorcheur-r6');
    expect(r6?.situationalEffectIds).toEqual(['grievous-wounds']);
  });

  it('« Maudit » est catalogué (sorcier, voie du démon r1, p. 108) : dé malus, référencé', () => {
    const entry = SITUATIONAL_EFFECTS['cursed'];
    expect(entry.label).toBe('Maudit');
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(108);
    expect(entry.modifiers?.allTestsMalusDie).toBe(true);
    expect(entry.stacking).toBeUndefined();
    const r1 = featureById.get('demon-r1');
    expect(r1?.situationalEffectIds).toEqual(['cursed']);
  });

  it('« En flammes » est catalogué (magicien, magie destructrice r3, p. 104) : DoT pur, référencé', () => {
    const entry = SITUATIONAL_EFFECTS['burning'];
    expect(entry.label).toBe('En flammes');
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(104);
    expect(entry.modifiers).toBeUndefined();
    const r3 = featureById.get('magie-destructrice-r3');
    expect(r3?.situationalEffectIds).toEqual(['burning']);
  });

  it('« Hypnotisé » est catalogué (voie de la vision r6, p. 165) : comportemental pur, référencé', () => {
    const entry = SITUATIONAL_EFFECTS['hypnotized'];
    expect(entry.label).toBe('Hypnotisé');
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(165);
    expect(entry.modifiers).toBeUndefined();
    const r6 = featureById.get('prestige-vision-r6');
    expect(r6?.situationalEffectIds).toEqual(['hypnotized']);
  });

  it('« Dansant » est catalogué (barde, musicien r5, p. 67) : dé malus attaque + -5 DEF, référencé (PER-105)', () => {
    const entry = SITUATIONAL_EFFECTS['dancing'];
    expect(entry.label).toBe('Dansant');
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(67);
    expect(entry.modifiers?.attackTestsMalusDie).toBe(true);
    expect(entry.modifiers?.derived).toEqual({ def: -5 });
    const r5 = featureById.get('musicien-r5');
    expect(r5?.situationalEffectIds).toEqual(['dancing']);
  });

  it('« Ébranlé » est catalogué (barbare, rage r1, p. 82) : dé malus attaque au contact, référencé (PER-105)', () => {
    const entry = SITUATIONAL_EFFECTS['daunted'];
    expect(entry.label).toBe('Ébranlé');
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(82);
    expect(entry.modifiers?.attackTestsMalusDie).toBe(true);
    expect(entry.modifiers?.derived).toBeUndefined();
    const r1 = featureById.get('rage-r1');
    expect(r1?.situationalEffectIds).toEqual(['daunted']);
  });

  it('« Forces sapées » est catalogué (magicien, magie destructrice r2, p. 103) : malus partiel chiffré, référencé (PER-105)', () => {
    const entry = SITUATIONAL_EFFECTS['sapped'];
    expect(entry.label).toBe('Forces sapées');
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(103);
    expect(entry.modifiers?.derived).toEqual({ meleeAttack: -2 });
    expect(entry.modifiers?.damageDealt).toBe(-2);
    expect(entry.stacking).toBeUndefined();
    const r2 = featureById.get('magie-destructrice-r2');
    expect(r2?.situationalEffectIds).toEqual(['sapped']);
  });

  it('« Plus vite que son ombre » est catalogué (pistolero r1, p. 65) : +5 Initiative chiffré, référencé (PER-121)', () => {
    const entry = SITUATIONAL_EFFECTS['quick-draw'];
    expect(entry.label).toBe('Plus vite que son ombre');
    expect(entry.effect.trim().length).toBeGreaterThan(0);
    expect(entry.sourcePage).toBe(65);
    expect(entry.modifiers?.derived).toEqual({ initiative: 5 });
    expect(entry.stacking).toBeUndefined();
    const r1 = featureById.get('pistolero-r1');
    expect(r1?.situationalEffectIds).toEqual(['quick-draw']);
  });

  it('« Feinté », « Visé » et « Provoqué » sont catalogués comme marqueurs PURS (PER-105, sans modifiers)', () => {
    for (const [id, label, featureId, page] of [
      ['feinted', 'Feinté', 'escrime-r2', 66],
      ['sighted', 'Visé', 'pistolero-r2', 65],
      ['goaded', 'Provoqué', 'soldat-r3', 90],
    ] as const) {
      const entry = SITUATIONAL_EFFECTS[id];
      expect(entry.label, id).toBe(label);
      expect(entry.effect.trim().length, id).toBeGreaterThan(0);
      expect(entry.sourcePage, id).toBe(page);
      expect(entry.modifiers, id).toBeUndefined();
      const feature = featureById.get(featureId);
      expect(feature?.situationalEffectIds, featureId).toEqual([id]);
    }
  });

  it('« Strangulation » (sombre magie r3, p. 111) ne référence AUCUN effet situationnel : réductible à Affaibli (PER-105/288)', () => {
    const r3 = featureById.get('sombre-magie-r3');
    expect(r3?.situationalEffectIds ?? []).toEqual([]);
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
