import { describe, expect, it } from 'vitest';
import {
  SITUATIONAL_EFFECT_IDS,
  SITUATIONAL_EFFECTS,
  SITUATIONAL_EFFECT_LABELS,
} from './schema';
import { featureById } from './index';

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

  it('tout situationalEffectIds posé sur une capacité pointe une entrée connue du catalogue', () => {
    const known = new Set<string>(SITUATIONAL_EFFECT_IDS);
    for (const f of featureById.values()) {
      for (const id of f.situationalEffectIds ?? []) {
        expect(known.has(id), `${f.id} → ${id}`).toBe(true);
      }
    }
  });
});
