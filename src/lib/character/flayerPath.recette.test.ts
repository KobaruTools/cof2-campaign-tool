/**
 * PER-74 — Voie de prestige de l'ÉCORCHEUR (p. 150-151), 8ᵉ voie de la catégorie COMBATTANT.
 *
 * Le test charge la RECETTE livrée (`examples/characters/recette-per74-ecorcheur.json`) plutôt que
 * de fabriquer un personnage à la main (patron `warDancerPath.recette.test.ts`) — aucun conflit avec
 * les autres sessions.
 *
 * Cette voie est presque entièrement VERBATIM : seul le rang 4 (+5 intimidation) est chiffré. Les
 * rangs 5, 6, 7 et 8 infligent des DM à un ADVERSAIRE (riposte d'armure, hémorragie, DM sur attaque
 * ratée) ou pénalisent la guérison DE LA CIBLE — hors périmètre du moteur (patron « Riposte », maître
 * d'armes r5, déjà non mécanisé). Les deux DoT nommés (saignement r4, hémorragie interne r7) sont
 * catalogués comme effets SITUATIONNELS (PER-288), data-only, comme les nuées de criquets/insectes.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { migrateCharacter } from '@/lib/engine/migrations';
import { featureById, pathById } from '@/data';
import { activeFeatureIdsForMods, effectContext, testBonusSources } from './effects';
import { SITUATIONAL_EFFECTS } from '@/data/schema';
import type { Character } from './types';

const PATH_ID = 'prestige-ecorcheur';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R6 = `${PATH_ID}-r6`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;
const RANKS = [R4, R5, R6, R7, R8];

const recette = (): Character =>
  migrateCharacter(
    JSON.parse(readFileSync(join(process.cwd(), 'examples', 'characters', 'recette-per74-ecorcheur.json'), 'utf-8')),
  ) as Character;

describe("PER-74 — Voie de l'écorcheur : données (p. 150-151)", () => {
  it('la voie est sourcée p. 150 et habillée COMBATTANT (rouge)', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.sourcePage).toBe(150);
    expect(path.type).toBe('prestige');
    if (path.type !== 'prestige') throw new Error('voie de prestige attendue');
    expect(path.category).toBe('fighter');
  });

  it('les 5 rangs sont sourcés p. 150/151, seuls r5/r7/r8 portent un balisage (les seuls à contenir un dé)', () => {
    const expectedSourcePage: Record<string, number> = { [R4]: 150, [R5]: 150, [R6]: 151, [R7]: 151, [R8]: 151 };
    for (const id of RANKS) expect(featureById.get(id)?.sourcePage).toBe(expectedSourcePage[id]);
    for (const id of [R4, R6]) expect(featureById.get(id)?.richText).toBeUndefined();
    for (const id of [R5, R7, R8]) expect(featureById.get(id)?.richText).toContain('{1d4');
  });

  it("r5 : le dé PASSE d'un 1d4 fixe à un 1d4° évolutif au rang 7 de la voie", () => {
    const text = featureById.get(R5)?.richText ?? '';
    expect(text).toContain('{1d4}');
    expect(text).toContain('{1d4°}');
  });
});

describe('PER-74 — r4 Armes dentelées : +5 intimidation chiffré + saignement catalogué', () => {
  it('effet test-bonus intimidation +5 (non conditionnel, pas de conditional-stat-bonus)', () => {
    const effects = featureById.get(R4)?.effects ?? [];
    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({ kind: 'test-bonus', domains: ['intimidation'], value: 5 });
  });

  it("+5 aux tests d'intimidation agrégé sur la recette", () => {
    const c = recette();
    const tests = testBonusSources(activeFeatureIdsForMods(c), effectContext(c));
    const source = tests.find((t) => t.domain === 'intimidation')?.sources.find((s) => s.featureId === R4);
    expect(source?.value).toBe(5);
  });

  it("le saignement est catalogué en effet situationnel 'bleeding' (DoT pur, non chiffré)", () => {
    expect(featureById.get(R4)?.situationalEffectIds).toEqual(['bleeding']);
    const entry = SITUATIONAL_EFFECTS['bleeding'];
    expect(entry.label).toBe('Saignement');
    expect(entry.sourcePage).toBe(150);
    expect(entry.modifiers).toBeUndefined();
    expect(entry.effect).toContain('2 DM');
  });
});

describe('PER-74 — r7 Hémorragie interne : DoT catalogué déclenché par un critique', () => {
  it("catalogué en effet situationnel 'internal-hemorrhage' (DoT pur, non chiffré)", () => {
    expect(featureById.get(R7)?.situationalEffectIds).toEqual(['internal-hemorrhage']);
    const entry = SITUATIONAL_EFFECTS['internal-hemorrhage'];
    expect(entry.label).toBe('Hémorragie interne');
    expect(entry.sourcePage).toBe(151);
    expect(entry.modifiers).toBeUndefined();
    expect(entry.effect).toContain('3 rounds');
  });
});

describe('PER-74 — r5/r6/r8 : DM ou pénalité subis par un tiers, aucun effet chiffré (patron « Riposte »)', () => {
  it('aucun des trois rangs ne porte de effects ni de situationalEffectIds', () => {
    for (const id of [R5, R6, R8]) {
      const f = featureById.get(id);
      expect(f?.effects ?? [], id).toHaveLength(0);
      expect(f?.situationalEffectIds ?? [], id).toHaveLength(0);
    }
  });

  it('r8 : le dé de dégât sur attaque ratée reste verbatim (aucun weapon-damage-bonus)', () => {
    expect((featureById.get(R8)?.effects ?? []).some((e) => e.kind === 'weapon-damage-bonus')).toBe(false);
  });
});
