/**
 * PER-331 — gobelin : voie de peuple STANDARD (contenu payant du Compagnon, p. 22-23). INTÉGRATION réelle.
 *
 * NON CI-safe (importe `private/companion-content`) → recette LOCALE, comme les autres tests de contenu
 * payant (cf. `frouin.recette.test.ts`). La restriction d'armes de taille petite (générique) est, elle,
 * couverte par le test CI-safe `smallSizeWeapons.test.ts` sur le halfelin.
 *
 * Attendus moteur validés (décisions AskUserQuestion, handoff PER-331) :
 *  - caracs de peuple : +1 AGI, +1 PER, −1 FOR, −1 VOL (tous FIXES) ;
 *  - r1 Vivacité gobeline : +3 Init ; +3 discrétion ; vision 30 m (verbatim) ;
 *  - r2 Attaque groupée : INTERRUPTEUR +2 en attaque au contact (conditionnel, inactif par défaut) ;
 *  - r3 Kafouiller : badge situationnel ambre sous les cartes d'attaque au contact ET à distance ;
 *  - r4 Worg : MONTURE (`creatureProfile` mount) — PV [=niveau × 5], attaque littérale, Init du gobelin ;
 *  - r5 Vif et alerte : +1 AGI + +1 PER (fixes).
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
  isEffectActive,
} from '@/lib/character/effects';
import { weaponDamageBonuses } from '@/lib/character/weaponDamageBonus';
import { setMountedTarget } from '@/lib/character/sheetActions';
import { resolveCreatureMaxHp, resolveCreatureAttackBonus, listCompanions, companionMountEnSelle } from '@/lib/character/companions';
import { characterSizeCategory } from '@/lib/character/size';
import { deriveStats } from '@/lib/engine/derived';
import type { Weapon } from '@/data/schema';
import type { Character } from '@/lib/character/types';

registerContentBundle(companionContent);

const now = '2026-01-01T00:00:00.000Z';
const R = ['gobelin-r1', 'gobelin-r2', 'gobelin-r3', 'gobelin-r4', 'gobelin-r5'];

function gobelin(featureIds: string[], overrides: Partial<Character> = {}): Character {
  return {
    ...createBlankCharacter({ now }),
    ancestryId: 'gobelin',
    ancestryPathId: 'gobelin',
    classId: 'voleur',
    level: 6,
    // Caracs déjà ajustées du peuple (+1 AGI, +1 PER, −1 FOR, −1 VOL). Les +1 AGI/+1 PER du r5 sont
    // AJOUTÉS par le moteur (ability-bonus), donc PAS inclus dans la base.
    abilities: { FOR: -1, AGI: 1, CON: 0, PER: 1, INT: 0, CHA: 0, VOL: -1 },
    baseAbilities: { FOR: -1, AGI: 1, CON: 0, PER: 1, INT: 0, CHA: 0, VOL: -1 },
    featureIds,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const domainTotal = (c: Character, domain: string) =>
  testBonusSources(c.featureIds, effectContext(c)).find((t) => t.domain === domain)?.total;
const initOf = (c: Character) => deriveStats(buildCharacterDerivedView(c).derivedInput!).initiative;
const meleeSourceR2 = (c: Character) =>
  (featureModSources(activeFeatureIdsForMods(c), effectContext(c)).meleeAttack ?? [])
    .find((s) => s.featureId === 'gobelin-r2');

describe('PER-331 — gobelin : caractéristiques de peuple', () => {
  it('+1 AGI, +1 PER, −1 FOR, −1 VOL (tous fixes)', () => {
    const anc = companionContent.ancestries?.find((a) => a.id === 'gobelin');
    expect(anc?.abilityModifiers).toEqual([
      { value: 1, abilities: ['AGI'] },
      { value: 1, abilities: ['PER'] },
      { value: -1, abilities: ['FOR'] },
      { value: -1, abilities: ['VOL'] },
    ]);
  });

  it('le peuple gobelin est de taille « petite »', () => {
    expect(characterSizeCategory('gobelin', [])).toBe('petite');
  });
});

describe('PER-331 — gobelin r1 Vivacité gobeline', () => {
  const c = gobelin([...R]);

  it('+3 en Initiative', () => {
    const withoutR1 = gobelin(['gobelin-r2', 'gobelin-r3', 'gobelin-r4', 'gobelin-r5']);
    expect(initOf(c) - initOf(withoutR1)).toBe(3);
  });

  it('+3 en discrétion', () => {
    expect(domainTotal(c, 'stealth')).toBe(3);
  });
});

describe('PER-331 — gobelin r2 Attaque groupée', () => {
  it('interrupteur inactif par défaut → aucun bonus au contact', () => {
    expect(meleeSourceR2(gobelin([...R]))).toBeUndefined();
  });

  it('interrupteur actif → +2 en attaque au contact', () => {
    const on = gobelin([...R], { effectToggles: { 'gobelin-r2': [true] } });
    expect(meleeSourceR2(on)?.value).toBe(2);
    expect(meleeSourceR2(on)?.conditional).toBe(true);
  });

  it('l’effet est bien un interrupteur conditionnel manuel', () => {
    const effect = featureById.get('gobelin-r2')?.effects?.[0];
    expect(effect?.kind).toBe('conditional-stat-bonus');
    if (effect?.kind === 'conditional-stat-bonus') {
      expect(effect.bonuses).toEqual([{ stat: 'meleeAttack', value: 2 }]);
      expect(effect.activation?.kind).toBe('condition');
    }
  });
});

describe('PER-331 — gobelin r3 Kafouiller', () => {
  const epeeCourte = equipmentById.get('epee-courte') as Weapon;
  const arcCourt = equipmentById.get('arc-court') as Weapon;
  const kafouiller = { conditionLabel: 'contre une créature renversée' };

  it('bonus situationnel +1d4° DM sous la carte d’attaque au CONTACT', () => {
    const melee = weaponDamageBonuses(gobelin([...R]), 'melee', epeeCourte);
    // Bonus SITUATIONNEL (badge séparé), jamais agrégé d'office aux DM permanents.
    expect(melee.situational).toContainEqual(expect.objectContaining(kafouiller));
  });

  it('AUCUN bonus à DISTANCE (contact seul, attackMode melee — retour proprio)', () => {
    const ranged = weaponDamageBonuses(gobelin([...R]), 'ranged', arcCourt);
    expect(ranged.situational).not.toContainEqual(expect.objectContaining(kafouiller));
  });

  it('sans le rang 3, aucun bonus Kafouiller', () => {
    const melee = weaponDamageBonuses(gobelin(['gobelin-r1', 'gobelin-r2']), 'melee', epeeCourte);
    expect(melee.situational).not.toContainEqual(expect.objectContaining(kafouiller));
  });
});

describe('PER-331 — gobelin r4 Worg (monture)', () => {
  const worg = featureById.get('gobelin-r4')?.creatureProfile;

  it('profil de MONTURE avec les caractéristiques imprimées', () => {
    expect(worg?.companionType).toBe('mount');
    expect(worg?.name).toBe('Worg');
    expect(worg?.abilities).toEqual({ AGI: 1, CON: 5, FOR: 5, PER: 2, CHA: -2, INT: -4, VOL: 2 });
    expect(worg?.bonusDieAbilities).toEqual(['AGI', 'CON']);
    expect(worg?.defense).toBe('17');
  });

  it('PV = [niveau × 5] (30 au niveau 6), Init. recopiée du gobelin', () => {
    const c = gobelin([...R]);
    expect(resolveCreatureMaxHp(worg!, effectiveAbilities(c), c.level, 4)).toBe(30);
    expect(worg?.initiative).toEqual({ fromMaster: 'initiative' });
  });

  it('attaque = attaque magique du gobelin + 2 (fromMaster + offset), DM 1d4°+5', () => {
    const c = gobelin([...R]);
    expect(worg?.attack?.fromMaster).toBe('magicAttack');
    expect(worg?.attack?.offset).toBe(2);
    expect(worg?.attack?.damage).toBe('[1d4° + 5]');
    // Le +2 est bien un OFFSET résolu par-dessus la stat du maître, pas perdu.
    const master = deriveStats(buildCharacterDerivedView(c).derivedInput!);
    expect(resolveCreatureAttackBonus(worg!.attack!, master)).toBe(master.magicAttack + 2);
  });

  it('monture chevauchable : bouton « En selle / À pied » + pilotage de mountedKey', () => {
    const c = gobelin([...R]);
    const entry = listCompanions(c).find((e) => e.feature.id === 'gobelin-r4');
    expect(entry?.companionType).toBe('mount');
    // À pied par défaut (interrupteur « en selle » présent → boolean, pas null).
    expect(companionMountEnSelle(c, entry!)).toBe(false);
    // Monter : setMountedTarget pose mountedKey ET synchronise l'interrupteur « en selle » (enSelleLink).
    const mounted = { ...c, ...setMountedTarget(c, entry!.key) };
    expect(mounted.mountedKey).toBe(entry!.key);
    expect(companionMountEnSelle(mounted, entry!)).toBe(true);
    expect(isEffectActive(mounted, 'gobelin-r4', 0)).toBe(true);
  });

  it('morsure gratuite (G) rattachée à l’état « en selle » (carte de capacité conditionnelle)', () => {
    // Capacité d'attaque gratuite portée par le profil, rendue en CARTE par CompanionsPanel seulement en selle.
    // Marqueur d'action « G » (action gratuite) → hexagone à côté du titre (pas de « (G) » textuel).
    expect(worg?.mountedFreeAttack?.actionType).toBe('G');
    expect(worg?.mountedFreeAttack?.name).toBe('Morsure gratuite');
    expect(worg?.mountedFreeAttack?.text).toBeTruthy();
  });
});

describe('PER-331 — gobelin r5 Vif et alerte', () => {
  it('+1 AGI et +1 PER (fixes)', () => {
    const withR5 = gobelin([...R]);
    const withoutR5 = gobelin(['gobelin-r1', 'gobelin-r2', 'gobelin-r3', 'gobelin-r4']);
    const ab = effectiveAbilities(withR5);
    const ab0 = effectiveAbilities(withoutR5);
    expect(ab.AGI - ab0.AGI).toBe(1);
    expect(ab.PER - ab0.PER).toBe(1);
  });
});
