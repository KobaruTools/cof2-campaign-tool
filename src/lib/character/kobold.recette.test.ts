/**
 * PER-332 — kobold : voie de peuple STANDARD (contenu payant du Compagnon, p. 24-25). INTÉGRATION réelle.
 *
 * NON CI-safe (importe `private/companion-content`) → recette LOCALE, comme les autres tests de contenu
 * payant (cf. `gobelin.recette.test.ts`, `frouin.recette.test.ts`). La restriction d'armes de taille
 * petite (générique) est, elle, couverte par le test CI-safe `smallSizeWeapons.test.ts` sur le halfelin.
 *
 * Attendus moteur validés (décisions AskUserQuestion, handoff PER-332) :
 *  - caracs de peuple : +1 AGI, +1 PER, −1 FOR, −1 CON (tous FIXES) ; taille « petite » ;
 *  - r1 Ruse kobold : +3 en fabrication de pièges (`trap-making`) ET en détection (`trap-detection`) ;
 *    morsure [1d4 + FOR] LÉTALE non évolutive remplaçant les mains nues ; vision 30 m (verbatim) ;
 *  - r2 Chétif : +1 DEF (FIXE, non scalant) ; +3 discrétion ;
 *  - r3 Piège improvisé : capacité active (action limitée), verbatim seul (aucun effet de stat) ;
 *  - r4 Attaque vicieuse : INTERRUPTEUR +2 en attaque au contact (inactif par défaut) + badge situationnel
 *    +1d4° DM sous la carte d'attaque au contact ;
 *  - r5 Ruse instinctive : +1 AGI + +1 PER (fixes).
 */
import { describe, expect, it } from 'vitest';
import { registerContentBundle, featureById, equipmentById } from '@/data';
import { companionContent } from '../../../private/companion-content';
import { createBlankCharacter } from '@/lib/character/factory';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import {
  effectiveAbilities,
  testBonusSources,
  effectContext,
  featureModSources,
  activeFeatureIdsForMods,
} from '@/lib/character/effects';
import { weaponDamageBonuses } from '@/lib/character/weaponDamageBonus';
import { unarmedStrike } from '@/lib/character/unarmedStrike';
import { characterSizeCategory } from '@/lib/character/size';
import { deriveStats } from '@/lib/engine/derived';
import type { Weapon } from '@/data/schema';
import type { Character } from '@/lib/character/types';

registerContentBundle(companionContent);

const now = '2026-01-01T00:00:00.000Z';
const R = ['kobold-r1', 'kobold-r2', 'kobold-r3', 'kobold-r4', 'kobold-r5'];

function kobold(featureIds: string[], overrides: Partial<Character> = {}): Character {
  return {
    ...createBlankCharacter({ now }),
    ancestryId: 'kobold',
    ancestryPathId: 'kobold',
    classId: 'voleur',
    level: 6,
    // Caracs déjà ajustées du peuple (+1 AGI, +1 PER, −1 FOR, −1 CON). Les +1 AGI/+1 PER du r5 sont
    // AJOUTÉS par le moteur (ability-bonus), donc PAS inclus dans la base.
    abilities: { FOR: -1, AGI: 1, CON: -1, PER: 1, INT: 0, CHA: 0, VOL: 0 },
    baseAbilities: { FOR: -1, AGI: 1, CON: -1, PER: 1, INT: 0, CHA: 0, VOL: 0 },
    featureIds,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const domainTotal = (c: Character, domain: string) =>
  testBonusSources(c.featureIds, effectContext(c)).find((t) => t.domain === domain)?.total;
const defOf = (c: Character) => deriveStats(buildCharacterDerivedView(c).derivedInput!).defense;
const meleeSourceR4 = (c: Character) =>
  (featureModSources(activeFeatureIdsForMods(c), effectContext(c)).meleeAttack ?? [])
    .find((s) => s.featureId === 'kobold-r4');

describe('PER-332 — kobold : caractéristiques de peuple', () => {
  it('+1 AGI, +1 PER, −1 FOR, −1 CON (tous fixes)', () => {
    const anc = companionContent.ancestries?.find((a) => a.id === 'kobold');
    expect(anc?.abilityModifiers).toEqual([
      { value: 1, abilities: ['AGI'] },
      { value: 1, abilities: ['PER'] },
      { value: -1, abilities: ['FOR'] },
      { value: -1, abilities: ['CON'] },
    ]);
  });

  it('le peuple kobold est de taille « petite »', () => {
    expect(characterSizeCategory('kobold', [])).toBe('petite');
  });
});

describe('PER-332 — kobold r1 Ruse kobold', () => {
  const c = kobold([...R]);

  it('+3 en fabrication de pièges (trap-making) et en détection (trap-detection)', () => {
    expect(domainTotal(c, 'trap-making')).toBe(3);
    expect(domainTotal(c, 'trap-detection')).toBe(3);
  });

  it('morsure [1d4 + FOR] LÉTALE non évolutive remplace les mains nues', () => {
    const view = unarmedStrike(c);
    expect(view.damage.die).toBe('d4');
    expect(view.damage.count).toBe(1);
    expect(view.evolving).toBe(false);
    expect(view.damageAbilities).toEqual(['FOR']);
    expect(view.lethality).toBe('lethal');
  });

  it('sans le rang 1, mains nues par défaut (non létales, sans branche morsure)', () => {
    const view = unarmedStrike(kobold(['kobold-r2', 'kobold-r3', 'kobold-r4', 'kobold-r5']));
    expect(view.lethality).not.toBe('lethal');
  });
});

describe('PER-332 — kobold r2 Chétif', () => {
  it('+1 DEF FIXE (non scalant)', () => {
    const withR2 = kobold([...R]);
    const withoutR2 = kobold(['kobold-r1', 'kobold-r3', 'kobold-r4', 'kobold-r5']);
    expect(defOf(withR2) - defOf(withoutR2)).toBe(1);
  });

  it('+3 en discrétion', () => {
    expect(domainTotal(kobold([...R]), 'stealth')).toBe(3);
  });
});

describe('PER-332 — kobold r3 Piège improvisé', () => {
  it('capacité active à action limitée (L), sans effet de stat', () => {
    const f = featureById.get('kobold-r3');
    expect(f?.actionTypes).toEqual(['L']);
    // Verbatim seul : aucun effet mécanisé côté fiche du PJ.
    expect(f?.effects ?? []).toHaveLength(0);
  });
});

describe('PER-332 — kobold r4 Attaque vicieuse', () => {
  const epeeCourte = equipmentById.get('epee-courte') as Weapon;
  const arcCourt = equipmentById.get('arc-court') as Weapon;
  const vicieuse = { conditionLabel: 'par surprise ou contre un ennemi engagé par un allié au contact' };

  it('interrupteur +2 attaque inactif par défaut', () => {
    expect(meleeSourceR4(kobold([...R]))).toBeUndefined();
  });

  it('interrupteur actif → +2 en attaque au contact', () => {
    const on = kobold([...R], { effectToggles: { 'kobold-r4': [true] } });
    expect(meleeSourceR4(on)?.value).toBe(2);
    expect(meleeSourceR4(on)?.conditional).toBe(true);
  });

  it('badge situationnel +1d4° DM sous la carte d’attaque au CONTACT', () => {
    const melee = weaponDamageBonuses(kobold([...R]), 'melee', epeeCourte);
    expect(melee.situational).toContainEqual(expect.objectContaining(vicieuse));
  });

  it('AUCUN badge à DISTANCE (contact seul, attackMode melee)', () => {
    const ranged = weaponDamageBonuses(kobold([...R]), 'ranged', arcCourt);
    expect(ranged.situational).not.toContainEqual(expect.objectContaining(vicieuse));
  });
});

describe('PER-332 — kobold r5 Ruse instinctive', () => {
  it('+1 AGI et +1 PER (fixes)', () => {
    const withR5 = kobold([...R]);
    const withoutR5 = kobold(['kobold-r1', 'kobold-r2', 'kobold-r3', 'kobold-r4']);
    const ab = effectiveAbilities(withR5);
    const ab0 = effectiveAbilities(withoutR5);
    expect(ab.AGI - ab0.AGI).toBe(1);
    expect(ab.PER - ab0.PER).toBe(1);
  });
});
