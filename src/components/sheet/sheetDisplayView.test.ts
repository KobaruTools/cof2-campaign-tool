import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import { createBlankCharacter } from '@/lib/character/factory';
import type { Character } from '@/lib/character/types';
import {
  abilityBonusDiceFromFeatures,
  abilityBonusDiceSources,
  abilityModSources,
  abilityModsFromFeatures,
  abilityTestBonusByAbility,
  abilityTestBonusSources,
  activeAbilityOverrideSources,
  activeConditionalTestDice,
  activeFormAbilityBonusSources,
  armorPenaltyDivisor,
  testBonusSources,
  universalTestBonus,
} from '@/lib/character/effects';
import { armorEncumbrancePenalty } from '@/lib/character/equipment';
import { orphanSourceTerms } from '@/lib/character/orphanPoints';
import { defenseFromEquipment } from '@/components/wizard/helpers';
import { buildCharacterDerivedView } from './characterDerivedView';
import { buildSheetDisplayView } from './sheetDisplayView';

/** Personnage de test : fabrique réelle + surcharges ciblées (niveau 5 par défaut). */
function char(over: Partial<Character> = {}): Character {
  return { ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }), level: 5, ...over };
}

describe('buildSheetDisplayView', () => {
  it('câble chaque champ sur la dérivation correspondante de la fiche', () => {
    const c = char();
    const derived = buildCharacterDerivedView(c);
    const view = buildSheetDisplayView(c, derived);
    const { modFeatureIds, effectContext } = derived;

    // Le vrai risque de ce module est un câblage croisé (arguments inversés, champ
    // rattaché à la mauvaise dérivation) : on compare donc champ par champ aux appels directs.
    expect(view.abilityMods).toEqual(abilityModsFromFeatures(modFeatureIds, c.featureChoices));
    expect(view.abilityModSources).toEqual(abilityModSources(modFeatureIds, c.featureChoices));
    expect(view.abilityOverrides).toEqual(activeAbilityOverrideSources(c));
    expect(view.abilityFormBonuses).toEqual(activeFormAbilityBonusSources(c));
    expect(view.bonusDieSources).toEqual(
      abilityBonusDiceFromFeatures(modFeatureIds, c.featureChoices),
    );
    expect(view.bonusDieSourcesDetailed).toEqual(
      abilityBonusDiceSources(modFeatureIds, c.featureChoices),
    );
    expect(view.testBonuses).toEqual(testBonusSources(modFeatureIds, effectContext));
    expect(view.testDice).toEqual(activeConditionalTestDice(c));
    expect(view.abilityTestBonus).toEqual(abilityTestBonusSources(modFeatureIds, effectContext));
    expect(view.perAbilityTestBonus).toEqual(
      abilityTestBonusByAbility(modFeatureIds, effectContext),
    );
    expect(view.universalBonus).toEqual(universalTestBonus(modFeatureIds));
    expect(view.armorPenalty).toBe(
      armorEncumbrancePenalty(c.equipment, armorPenaltyDivisor(modFeatureIds)),
    );
    expect(view.armorMaxAgi).toBe(defenseFromEquipment(c.equipment).maxAgi);
  });

  it('fusionne les points orphelins et les bonus à la touche dans les sources de l’infobulle', () => {
    const c = char();
    const derived = buildCharacterDerivedView(c);
    const view = buildSheetDisplayView(c, derived);

    // Union des deux apports, sans perte : chaque terme d'une source doit s'y retrouver.
    for (const [key, terms] of Object.entries(orphanSourceTerms(c))) {
      expect(view.extraModSources[key as keyof typeof view.extraModSources]).toEqual(
        expect.arrayContaining(terms ?? []),
      );
    }
    for (const [key, terms] of Object.entries(derived.attackBonusModSources)) {
      expect(view.extraModSources[key as keyof typeof view.extraModSources]).toEqual(
        expect.arrayContaining(terms ?? []),
      );
    }
  });

  it('ne signale des sorts que si une capacité connue en est un', () => {
    const blank = char();
    expect(buildSheetDisplayView(blank, buildCharacterDerivedView(blank)).hasSpells).toBe(false);

    // Premier sort du catalogue, quel qu'il soit : la propriété testée est `isSpell`, pas
    // une voie particulière — le test ne se périme donc pas si le contenu bouge.
    const spell = [...featureById.values()].find((f) => f.isSpell);
    expect(spell).toBeDefined();
    const caster = char({ featureIds: [spell!.id] });
    expect(buildSheetDisplayView(caster, buildCharacterDerivedView(caster)).hasSpells).toBe(true);
  });
});
