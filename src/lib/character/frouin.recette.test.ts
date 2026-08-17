/**
 * PER-330 — frouïn : voie de peuple STANDARD (contenu payant du Compagnon). INTÉGRATION réelle.
 *
 * NON CI-safe (importe `private/companion-content`) → recette LOCALE, comme les autres tests de contenu
 * payant. La restriction d'armes de taille petite (générique) est, elle, couverte par le test CI-safe
 * `smallSizeWeapons.test.ts` sur le halfelin.
 *
 * Attendus moteur validés rang par rang par le propriétaire :
 *  - r1 Avarié : +3 disease/poison-resistance ; AURA PASSIVE `frouin-stench` (PER-438, −1 social,
 *    jamais posée, excludesCarrier, domaines DISJOINTS du test-bonus du porteur → aucun double compte) ;
 *  - r2 Minus : +3 discrétion ; +1 DEF au rang 2, +2 au rang 4 (stepped path-rank) ;
 *  - r3 Parano : +3 Init ; +3 vigilance ; badge DEF situationnel « attaques sournoises » ;
 *  - r5 Champion de la survie : +1 CON fixe + +1 à la carac choisie (AGI/PER).
 */
import { describe, expect, it } from 'vitest';
import { registerContentBundle, featureById } from '@/data';
import { BENEFICIAL_EFFECTS } from '@/data/schema';
import { companionContent } from '../../../private/companion-content';
import { createBlankCharacter } from '@/lib/character/factory';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { effectiveAbilities, testBonusSources, effectContext } from '@/lib/character/effects';
import {
  passiveAuraCarrierIds,
  passiveAuraFeatureId,
  passiveAuraStatusesFor,
} from '@/lib/character/partyAuras';
import { characterSizeCategory } from '@/lib/character/size';
import { deriveStats } from '@/lib/engine/derived';
import type { Character } from '@/lib/character/types';

registerContentBundle(companionContent);

const now = '2026-01-01T00:00:00.000Z';
const R = ['frouin-r1', 'frouin-r2', 'frouin-r3', 'frouin-r4', 'frouin-r5'];

function frouin(featureIds: string[], choices: Record<string, string[]> = {}): Character {
  return {
    ...createBlankCharacter({ now }),
    ancestryId: 'frouin',
    ancestryPathId: 'frouin',
    classId: 'voleur',
    level: 6,
    abilities: { FOR: -1, AGI: 3, CON: 2, PER: 1, INT: 0, CHA: -1, VOL: 0 },
    baseAbilities: { FOR: -1, AGI: 3, CON: 2, PER: 1, INT: 0, CHA: -1, VOL: 0 },
    featureIds,
    featureChoices: choices,
    createdAt: now,
    updatedAt: now,
  };
}

const domainTotal = (c: Character, domain: string) =>
  testBonusSources(c.featureIds, effectContext(c)).find((t) => t.domain === domain)?.total;
const defOf = (c: Character) => deriveStats(buildCharacterDerivedView(c).derivedInput!).defense;
const initOf = (c: Character) => deriveStats(buildCharacterDerivedView(c).derivedInput!).initiative;

describe('PER-330 — frouïn r1 Avarié', () => {
  const c = frouin([...R], { 'frouin-r5': ['AGI'] });

  it('+3 aux résistances maladies et poisons', () => {
    expect(domainTotal(c, 'disease-resistance')).toBe(3);
    expect(domainTotal(c, 'poison-resistance')).toBe(3);
  });

  it('confère l’aura PASSIVE `frouin-stench` (PER-438, −1, jamais posée, porteur exclu)', () => {
    const carriers = passiveAuraCarrierIds([c]);
    expect(carriers).toEqual({ 'frouin-stench': [c.id] });
    // Un ALLIÉ subit l'aura sans que rien n'ait été posé ; le porteur ne se pénalise pas lui-même.
    expect(passiveAuraStatusesFor('allie-1', carriers)).toEqual([
      expect.objectContaining({ id: 'frouin-stench', origin: 'auto' }),
    ]);
    expect(passiveAuraStatusesFor(c.id, carriers)).toEqual([]);
    expect(passiveAuraFeatureId('frouin-stench')).toBe('frouin-r1');

    const stench = BENEFICIAL_EFFECTS['frouin-stench'];
    expect(stench.modifiers?.testDomains?.value).toBe(-1);
    expect(stench.excludesCarrier).toBe(true);
    expect(stench.scope).toBe('group');
  });

  it('les domaines du malus ne recoupent PAS le test-bonus permanent du porteur (aucun double compte)', () => {
    const carrier = featureById.get('frouin-r1');
    const permanent = (carrier?.effects ?? []).flatMap((e) => (e.kind === 'test-bonus' ? e.domains : []));
    const buffDomains = BENEFICIAL_EFFECTS['frouin-stench'].modifiers?.testDomains?.domains ?? [];
    expect(buffDomains.filter((d) => permanent.includes(d))).toEqual([]);
  });
});

describe('PER-330 — frouïn r2 Minus : DEF scalante', () => {
  it('+3 en discrétion', () => {
    expect(domainTotal(frouin([...R]), 'stealth')).toBe(3);
  });

  it('+1 DEF au rang 2, +2 au rang 4', () => {
    const at2 = defOf(frouin(['frouin-r1', 'frouin-r2'])) - defOf(frouin(['frouin-r1']));
    const at4 = defOf(frouin(['frouin-r1', 'frouin-r2', 'frouin-r3', 'frouin-r4'])) -
      defOf(frouin(['frouin-r1', 'frouin-r3', 'frouin-r4']));
    expect(at2).toBe(1);
    expect(at4).toBe(2);
  });
});

describe('PER-330 — frouïn r3 Parano', () => {
  const c = frouin([...R]);

  it('+3 en Initiative et +3 en vigilance', () => {
    expect(initOf(c) - initOf(frouin(['frouin-r1', 'frouin-r2', 'frouin-r4', 'frouin-r5']))).toBe(3);
    expect(domainTotal(c, 'vigilance')).toBe(3);
  });

  it('ajoute un badge DEF situationnel « attaques sournoises »', () => {
    const badges = buildCharacterDerivedView(c).defenseBadges ?? [];
    expect(badges.some((b) => b.key === 'situational-frouin-r3')).toBe(true);
  });
});

describe('PER-330 — frouïn r5 Champion de la survie', () => {
  it('+1 CON (fixe) et +1 à la caractéristique choisie (AGI), la non choisie inchangée', () => {
    const withR5 = frouin([...R], { 'frouin-r5': ['AGI'] });
    const withoutR5 = frouin(['frouin-r1', 'frouin-r2', 'frouin-r3', 'frouin-r4'], { 'frouin-r5': ['AGI'] });
    const ab = effectiveAbilities(withR5);
    const ab0 = effectiveAbilities(withoutR5);
    expect(ab.CON - ab0.CON).toBe(1);
    expect(ab.AGI - ab0.AGI).toBe(1);
    expect(ab.PER - ab0.PER).toBe(0);
  });

  it('le choix PER augmente PER au lieu d’AGI', () => {
    const chosePer = frouin([...R], { 'frouin-r5': ['PER'] });
    const noR5 = frouin(['frouin-r1', 'frouin-r2', 'frouin-r3', 'frouin-r4']);
    expect(effectiveAbilities(chosePer).PER - effectiveAbilities(noR5).PER).toBe(1);
    expect(effectiveAbilities(chosePer).AGI - effectiveAbilities(noR5).AGI).toBe(0);
  });
});

describe('PER-330 — frouïn : taille petite', () => {
  it('le peuple frouïn est de taille « petite »', () => {
    expect(characterSizeCategory('frouin', [])).toBe('petite');
  });
});
