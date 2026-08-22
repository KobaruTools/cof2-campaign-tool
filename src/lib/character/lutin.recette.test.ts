/**
 * PER-333 — lutins (fées & farfadets) : UN peuple, DEUX voies de peuple au choix (contenu payant du
 * Compagnon, p. 26-28). INTÉGRATION réelle.
 *
 * NON CI-safe (importe `private/companion-content`) → recette LOCALE, comme les autres tests de contenu
 * payant (cf. `kobold.recette.test.ts`, `gobelin.recette.test.ts`).
 *
 * Attendus moteur validés (décisions AskUserQuestion, handoff PER-333) :
 *  - peuple : +1 AGI (fixe), +1 CHA OU PER (choix fée/farfadet), -1 CON, -2 FOR ; taille « très petite » ;
 *  - trait « Créature très petite » (inné, hors voie) : +2 DEF, +5 discrétion ; PLAFOND de DM d'arme
 *    1d4 (une main) / 1d6 (deux mains), au contact comme à distance, LEVÉ sous « Fée révérée » ;
 *  - fée r1 / farfadet r1 : RD contre les armes non-fer-froid = rang atteint dans la voie ;
 *  - fée r2 Pirouette : verbatim (aucun effet) ;
 *  - fée r3 Poudre de fée : emprunt feature-from-path rang 1 ou 2 magicien/ensorceleur (sans DEF) + 3
 *    usages/jour ; rang 1 = coût normal, armure libre ; rang 2 = gratuit (0 PM), mais non lançable en
 *    armure (avertissement) ;
 *  - fée r4 Fée révérée : +3 FOR sous forme humaine (interrupteur) + 3 usages/jour ;
 *  - fée r5 : +1 PER, +1 CHA ;
 *  - farfadet r2 : octroi de Langage des animaux (druide, animaux-r1) ;
 *  - farfadet r3 Invisibilité (L) : octroi d'Invisibilité (magie-universelle-r3) sans mana + 3/jour ;
 *  - farfadet r4 Monture féerique : profil de monture (DEF 16, Init 16, PV niveau×4, attaque magique) ;
 *  - farfadet r5 : +1 CHA, +1 VOL.
 */
import { describe, expect, it } from 'vitest';
import { registerContentBundle, featureById } from '@/data';
import { companionContent } from '../../../private/companion-content';
import { createBlankCharacter } from '@/lib/character/factory';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import {
  effectiveAbilities,
  testBonusSources,
  effectContext,
  damageReductionSources,
  isSpellcaster,
} from '@/lib/character/effects';
import {
  effectiveFeatureIdsForMods,
  grantedFeatureIds,
  grantedNoManaFeatureIds,
  borrowedNoManaFeatureIds,
  freeCastBorrowedFeatureIds,
  isChoiceActionable,
} from '@/lib/character/choices';
import { poudreDeFeeSpellBlockedByArmor } from '@/lib/character/armorRestrictions';
import { characterSizeCategory } from '@/lib/character/size';
import { deriveStats } from '@/lib/engine/derived';
import type { PathFeatureChoice } from '@/data/schema';
import type { Character, EquipmentLine } from '@/lib/character/types';

registerContentBundle(companionContent);

const now = '2026-01-01T00:00:00.000Z';
const FEE = ['lutin-fee-r1', 'lutin-fee-r2', 'lutin-fee-r3', 'lutin-fee-r4', 'lutin-fee-r5'];
const FAR = ['lutin-farfadet-r1', 'lutin-farfadet-r2', 'lutin-farfadet-r3', 'lutin-farfadet-r4', 'lutin-farfadet-r5'];

const worn = (itemId: string, grip: 'oneHand' | 'twoHands' = 'oneHand'): EquipmentLine => ({
  itemId,
  quantity: 1,
  worn: { slot: 'mainHand', grip },
});

function fee(featureIds: string[], overrides: Partial<Character> = {}): Character {
  return {
    ...createBlankCharacter({ now }),
    ancestryId: 'lutin',
    ancestryPathId: 'lutin-fee',
    classId: 'ensorceleur',
    level: 6,
    abilities: { FOR: -2, AGI: 1, CON: -1, PER: 0, INT: 0, CHA: 1, VOL: 0 },
    baseAbilities: { FOR: -2, AGI: 1, CON: -1, PER: 0, INT: 0, CHA: 1, VOL: 0 },
    featureIds,
    equipment: [worn('epee-courte', 'oneHand')],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function farfadet(featureIds: string[], overrides: Partial<Character> = {}): Character {
  return {
    ...createBlankCharacter({ now }),
    ancestryId: 'lutin',
    ancestryPathId: 'lutin-farfadet',
    classId: 'rodeur',
    level: 6,
    abilities: { FOR: -2, AGI: 1, CON: -1, PER: 1, INT: 0, CHA: 0, VOL: 0 },
    baseAbilities: { FOR: -2, AGI: 1, CON: -1, PER: 1, INT: 0, CHA: 0, VOL: 0 },
    featureIds,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// Le vrai moteur agrège les bonus de test sur `effectiveFeatureIdsForMods` (capacités + emprunts +
// octrois + TRAITS DE PEUPLE innés), cf. `testDomainSourceFeatureIds` : c'est là que vit le +5
// discrétion du trait « Créature très petite », qui n'est PAS dans `featureIds`.
const domainTotal = (c: Character, domain: string) =>
  testBonusSources(effectiveFeatureIdsForMods(c), effectContext(c)).find((t) => t.domain === domain)?.total;
const defOf = (c: Character) => deriveStats(buildCharacterDerivedView(c).derivedInput!).defense;
const rdOf = (c: Character, featureId: string) =>
  damageReductionSources(c).find((s) => s.featureId === featureId)?.reduction;

describe('PER-333 — lutin : peuple', () => {
  it('caracs : +1 AGI, +1 CHA|PER (choix), -1 CON, -2 FOR', () => {
    const anc = companionContent.ancestries?.find((a) => a.id === 'lutin');
    expect(anc?.abilityModifiers).toEqual([
      { value: 1, abilities: ['AGI'] },
      { value: 1, abilities: ['CHA', 'PER'] },
      { value: -1, abilities: ['CON'] },
      { value: -2, abilities: ['FOR'] },
    ]);
  });

  it('deux voies de peuple au choix (fée / farfadet)', () => {
    const anc = companionContent.ancestries?.find((a) => a.id === 'lutin');
    expect(anc?.ancestryPathIds).toEqual(['lutin-fee', 'lutin-farfadet']);
  });

  it('taille « très petite »', () => {
    expect(characterSizeCategory('lutin', [])).toBe('tres-petite');
  });
});

describe('PER-333 — lutin : trait « Créature très petite »', () => {
  it('+2 DEF (inné, hors voie)', () => {
    const lutinNoRank = fee([]);
    const control: Character = { ...fee([]), ancestryId: 'humain' };
    expect(defOf(lutinNoRank) - defOf(control)).toBe(2);
  });

  it('+5 discrétion (inné, hors voie)', () => {
    expect(domainTotal(fee([]), 'stealth')).toBe(5);
  });

  it('DM d’arme plafonnés : 1d4 à une main, 1d6 à deux mains (contact et distance)', () => {
    const sword1H = fee([...FEE], { equipment: [worn('epee-courte', 'oneHand')] });
    const sword2H = fee([...FEE], { equipment: [worn('epee-a-deux-mains', 'twoHands')] });
    const bow = fee([...FEE], { equipment: [worn('arc-court', 'twoHands')] });
    expect(buildCharacterDerivedView(sword1H).meleeWeaponDamage?.dice).toBe('1d4');
    expect(buildCharacterDerivedView(sword2H).meleeWeaponDamage?.dice).toBe('1d6');
    expect(buildCharacterDerivedView(bow).rangedWeaponDamage?.dice).toBe('1d6');
  });

  it('plafond LEVÉ sous « Fée révérée » (épée courte redevient 1d6 natif)', () => {
    const reveree = fee([...FEE], {
      equipment: [worn('epee-courte', 'oneHand')],
      effectToggles: { 'lutin-fee-r4': [true] },
    });
    expect(buildCharacterDerivedView(reveree).meleeWeaponDamage?.dice).toBe('1d6');
  });
});

describe('PER-333 — Voie de la fée', () => {
  it('r1 Née d’une fleur : RD non-fer-froid = rang atteint dans la voie', () => {
    expect(rdOf(fee([...FEE]), 'lutin-fee-r1')).toMatchObject({ value: 5, scopes: ['non-cold-iron-weapon'] });
    expect(rdOf(fee(['lutin-fee-r1']), 'lutin-fee-r1')?.value).toBe(1);
  });

  it('r2 Pirouette : interrupteur lumière ON/OFF + compteur 1× rechargé en récup. rapide', () => {
    const f = featureById.get('lutin-fee-r2')!;
    expect(f.effects?.[0]).toMatchObject({
      kind: 'conditional-stat-bonus',
      bonuses: [],
      activation: { kind: 'condition', activeByDefault: false },
    });
    expect(f.usageCounter).toMatchObject({ max: 1, resetOn: 'short-rest' });
  });

  it('r3 Poudre de fée : emprunt rang 1 ou 2 magicien/ensorceleur, sans DEF, gratuit dès rang 2, 3 usages/jour', () => {
    const f = featureById.get('lutin-fee-r3')!;
    const choice = f.choices?.[0] as PathFeatureChoice;
    expect(choice.kind).toBe('feature-from-path');
    expect(choice.allowedRanks).toEqual([1, 2]);
    expect(choice.classIds).toEqual(['magicien', 'ensorceleur']);
    expect(choice.excludeDefBonus).toBe(true);
    expect(choice.borrowFreeCast).toBe(true);
    // « ne lui en coûte pas non plus » = free-cast, mais SEULEMENT pour l'emprunt de rang 2 (verbatim p. 27).
    expect(choice.borrowFreeCastMinRank).toBe(2);
    expect(choice.noManaCost).toBeUndefined();
    // « 3 fois par jour » = vraie ressource journalière (p. 27).
    expect(f.usageCounter).toMatchObject({ max: 3, resetOn: 'day' });
  });

  it('r3 : un emprunt de RANG 2 est gratuit MÊME pour une fée lanceuse (borrowFreeCast + borrowFreeCastMinRank)', () => {
    const borrow = 'air-r2'; // sort d'ensorceleur rang 2 éligible
    const caster = fee(['lutin-fee-r1', 'lutin-fee-r2', 'lutin-fee-r3'], {
      featureChoices: { 'lutin-fee-r3': [borrow] },
    });
    expect(freeCastBorrowedFeatureIds(caster).has(borrow)).toBe(true);
    // Non compté comme un emprunt « demi-elfe » (noManaCost) : pas de note demi-elfe, gratuité inconditionnelle.
    expect(borrowedNoManaFeatureIds(caster).has(borrow)).toBe(false);
  });

  it('r3 : un emprunt de RANG 1 suit le coût normal — PAS de gratuité (verbatim p. 27, seul le rang 2 l’est)', () => {
    const borrow = 'air-r1'; // sort d'ensorceleur rang 1 éligible
    const caster = fee(['lutin-fee-r1', 'lutin-fee-r2', 'lutin-fee-r3', 'air-r2'], {
      featureChoices: { 'lutin-fee-r3': [borrow] },
    });
    expect(isSpellcaster(caster)).toBe(true); // lanceuse (air-r2 donne des PM)
    expect(freeCastBorrowedFeatureIds(caster).has(borrow)).toBe(false);
    expect(borrowedNoManaFeatureIds(caster).has(borrow)).toBe(false);
  });

  it('r3 : un emprunt de rang 2 est non lançable EN ARMURE (avertissement non bloquant, p. 27) ; rang 1 libre', () => {
    const armor: EquipmentLine = { custom: true, name: 'Armure de fortune', quantity: 1, worn: { slot: 'armor' } };
    const r2 = fee(['lutin-fee-r1', 'lutin-fee-r2', 'lutin-fee-r3'], {
      featureChoices: { 'lutin-fee-r3': ['air-r2'] },
      equipment: [armor],
    });
    expect(poudreDeFeeSpellBlockedByArmor(r2)).toEqual(new Set(['air-r2']));

    const r1 = fee(['lutin-fee-r1', 'lutin-fee-r2', 'lutin-fee-r3'], {
      featureChoices: { 'lutin-fee-r3': ['air-r1'] },
      equipment: [armor],
    });
    expect(poudreDeFeeSpellBlockedByArmor(r1)).toEqual(new Set());

    const r2NoArmor = fee(['lutin-fee-r1', 'lutin-fee-r2', 'lutin-fee-r3'], {
      featureChoices: { 'lutin-fee-r3': ['air-r2'] },
    });
    expect(poudreDeFeeSpellBlockedByArmor(r2NoArmor)).toEqual(new Set());
  });

  it('r4 Fée révérée : +3 FOR sous forme humaine (interrupteur), 3/jour', () => {
    const on = fee([...FEE], { effectToggles: { 'lutin-fee-r4': [true] } });
    const off = fee([...FEE], { effectToggles: {} });
    expect(effectiveAbilities(on).FOR - effectiveAbilities(off).FOR).toBe(3);
    expect(featureById.get('lutin-fee-r4')?.usageCounter?.max).toBe(3);
  });

  it('r5 Lady fée : +1 PER et +1 CHA', () => {
    const withR5 = effectiveAbilities(fee([...FEE]));
    const withoutR5 = effectiveAbilities(fee(['lutin-fee-r1', 'lutin-fee-r2', 'lutin-fee-r3', 'lutin-fee-r4']));
    expect(withR5.PER - withoutR5.PER).toBe(1);
    expect(withR5.CHA - withoutR5.CHA).toBe(1);
  });
});

describe('PER-333 — Voie du farfadet', () => {
  const far = farfadet([...FAR]);

  it('r1 Né d’un chou : RD non-fer-froid = rang atteint dans la voie', () => {
    expect(rdOf(far, 'lutin-farfadet-r1')).toMatchObject({ value: 5, scopes: ['non-cold-iron-weapon'] });
  });

  it('r2 : octroie Langage des animaux (druide, animaux-r1) tant qu’elle n’est pas déjà connue', () => {
    expect(grantedFeatureIds(far)).toContain('animaux-r1');
    // Repli caché tant que Langage des animaux n’est pas possédé…
    const r2Choice = featureById.get('lutin-farfadet-r2')!.choices![0] as PathFeatureChoice;
    expect(r2Choice.onlyIfOwnsFeature).toBe('animaux-r1');
    expect(isChoiceActionable(far, 'lutin-farfadet-r2', r2Choice)).toBe(false);
    // …et proposé (rôdeur/druide r1) dès que le farfadet possède déjà Langage des animaux (druide animaux).
    const farDruide = farfadet([...FAR, 'animaux-r1']);
    expect(grantedFeatureIds(farDruide)).not.toContain('animaux-r1'); // octroi supprimé (déjà possédé)
    expect(isChoiceActionable(farDruide, 'lutin-farfadet-r2', r2Choice)).toBe(true);
  });

  it('r3 Invisibilité (L) : octroie Invisibilité (magie-universelle-r3) sans mana, sans barre, repli gaté', () => {
    expect(grantedFeatureIds(far)).toContain('magie-universelle-r3');
    expect(grantedNoManaFeatureIds(far).has('magie-universelle-r3')).toBe(true);
    expect(featureById.get('lutin-farfadet-r3')?.usageCounter).toBeUndefined(); // barre retirée (retour proprio)
    expect(featureById.get('lutin-farfadet-r3')?.actionTypes).toEqual(['L']);
    // Repli : Télékinésie (air-r3) / Confusion (envouteur-r3), gaté sur la possession d’Invisibilité, free-cast.
    const r3Choice = featureById.get('lutin-farfadet-r3')!.choices![0] as PathFeatureChoice;
    expect(r3Choice.featureIds).toEqual(['air-r3', 'envouteur-r3']);
    expect(r3Choice.onlyIfOwnsFeature).toBe('magie-universelle-r3');
    expect(r3Choice.borrowFreeCast).toBe(true);
    expect(isChoiceActionable(far, 'lutin-farfadet-r3', r3Choice)).toBe(false);
    const farInvis = farfadet([...FAR, 'magie-universelle-r3']);
    expect(grantedFeatureIds(farInvis)).not.toContain('magie-universelle-r3');
    expect(isChoiceActionable(farInvis, 'lutin-farfadet-r3', r3Choice)).toBe(true);
  });

  it('r4 Monture féerique : profil de monture (DEF 16, Init 16, PV niveau×4, attaque magique du perso)', () => {
    const mount = featureById.get('lutin-farfadet-r4')?.creatureProfile;
    expect(mount?.companionType).toBe('mount');
    expect(mount?.defense).toBe('16');
    expect(mount?.initiative).toBe('16');
    expect(mount?.hitPoints).toBe('[=niveau × 4]');
    expect(mount?.attack?.fromMaster).toBe('magicAttack');
  });

  it('r5 Seigneur féerique : +1 CHA et +1 VOL', () => {
    const withR5 = effectiveAbilities(far);
    const withoutR5 = effectiveAbilities(
      farfadet(['lutin-farfadet-r1', 'lutin-farfadet-r2', 'lutin-farfadet-r3', 'lutin-farfadet-r4']),
    );
    expect(withR5.CHA - withoutR5.CHA).toBe(1);
    expect(withR5.VOL - withoutR5.VOL).toBe(1);
  });
});
