/**
 * Dérivations d'AFFICHAGE de la fiche (PER-258) : tout ce que les blocs de la fiche
 * (`AbilitiesGrid`, `DerivedStatsGrid`, `TestDomainsPanel`) attendent en props et qui
 * se déduit du personnage sans aucune écriture — modificateurs permanents de
 * caractéristiques, dés bonus, bonus par domaine de test, malus d'armure, sources de
 * l'infobulle « i » des stats dérivées.
 *
 * Distinct de deux voisins, à ne pas confondre :
 *  - `characterDerivedView` = entrée du MOTEUR + badges (partagée avec l'écran de MJ) ;
 *  - `useCharacterGameState` = actions d'ÉCRITURE de l'état de jeu (PER-257).
 * Ici, rien que de la lecture : une fonction pure, sans React, testable.
 *
 * Extrait pour que le panneau latéral de l'écran de MJ monte les mêmes blocs que la
 * fiche sans recopier ses calculs. La fiche (`character/[id]/page.tsx`) l'a adopté à son
 * tour (PER-262) : ce module est l'unique source de ces dérivations pour les deux vues.
 */
import { featureById } from '@/data';
import { ABILITY_IDS } from '@/data/schema';
import { abilityBonusSourcesFromEquipment, armorEncumbrancePenalty } from '@/lib/character/equipment';
import { defenseFromEquipment } from '@/components/wizard/helpers';
import {
  abilityBonusDiceFromFeatures,
  abilityBonusDiceSources,
  abilityModSources,
  abilityModsFromFeatures,
  abilityTestBonusByAbility,
  abilityTestBonusSources,
  activeAbilityOverrideSources,
  activeAllTestsDieSources,
  activeConditionalTestDice,
  activeFormAbilityBonusSources,
  armorPenaltyDivisor,
  lowHpTestDieSources,
  magicTestBonusSources,
  permanentTestDieDomains,
  testBonusSources,
  universalTestBonus,
} from '@/lib/character/effects';
import { orphanSourceTerms } from '@/lib/character/orphanPoints';
import type { Character } from '@/lib/character/types';
import type { ModSources } from '@/lib/ui/derivedStatBreakdown';
import type { CharacterDerivedView } from './characterDerivedView';

export interface SheetDisplayView {
  /**
   * Sources supplémentaires de l'infobulle « i » des stats dérivées : points de capacité
   * orphelins convertis (p. 40) + bonus à la touche conditionnés à l'arme portée (PER-226),
   * fusionnés par stat. Le TOTAL de ces derniers est déjà FONDU dans le score (via
   * `derivedInput.mods`) ; on n'ajoute ici que l'attribution de la source.
   */
  extraModSources: ModSources;
  /** Modificateurs PERMANENTS de caractéristiques apportés par les capacités. */
  abilityMods: ReturnType<typeof abilityModsFromFeatures>;
  /** Capacités à l'origine de ces modificateurs (détail d'une caractéristique). */
  abilityModSources: ReturnType<typeof abilityModSources>;
  /** Valeurs ABSOLUES imposées par une transformation active (PER-74, forme de loup). */
  abilityOverrides: ReturnType<typeof activeAbilityOverrideSources>;
  /** Bonus de carac EN DELTA conditionnés à une forme active (PER-74, Forme puissante). */
  abilityFormBonuses: ReturnType<typeof activeFormAbilityBonusSources>;
  /**
   * Bonus/malus de carac apportés par les OBJETS PORTÉS (PER-272), avec l'objet source.
   * Déjà FONDUS dans les caractéristiques effectives (donc dans toutes les stats dérivées) :
   * on ne les expose ici que pour l'attribution de la source dans le détail d'une carac.
   */
  abilityEquipmentBonuses: ReturnType<typeof abilityBonusSourcesFromEquipment>;
  /** Caractéristiques bénéficiant d'un dé bonus permanent (badge double-d20). */
  bonusDieSources: ReturnType<typeof abilityBonusDiceFromFeatures>;
  /** Même information avec la capacité source, pour les pastilles du détail d'une carac. */
  bonusDieSourcesDetailed: ReturnType<typeof abilityBonusDiceSources>;
  /** Bonus de compétence par domaine de test (PER-89), règle de cumul p. 203. */
  testBonuses: ReturnType<typeof testBonusSources>;
  /** Dés bonus CONDITIONNELS actifs sur des domaines (Travail d'équipe, via interrupteur). */
  testDice: ReturnType<typeof activeConditionalTestDice>;
  /** Buffs ACTIFS à tous les tests de caractéristique (Bénédiction, via interrupteur). */
  abilityTestBonus: ReturnType<typeof abilityTestBonusSources>;
  /** Bonus aux tests d'UNE caractéristique précise, par option retenue (Tatouages, PER-125). */
  perAbilityTestBonus: ReturnType<typeof abilityTestBonusByAbility>;
  /**
   * Sources de bonus de MAGIE aux tests (PER-275 / PER-134) : capacités marquées (Tatouages) et
   * objets magiques PORTÉS. Elles NE se cumulent pas entre elles — leur arbitrage, et l'addition
   * au bonus de compétence du domaine, appartiennent à `resolveTestBonus`. Recouvre donc en
   * partie `perAbilityTestBonus` : n'additionner de celui-ci que
   * `freelyStackingAbilityTestBonuses`, sous peine de compter un tatouage deux fois.
   */
  magicTestBonuses: ReturnType<typeof magicTestBonusSources>;
  /** Plancher de compétence universel (Éclectique, PER-102). */
  universalBonus: ReturnType<typeof universalTestBonus>;
  /** Malus d'armure appliqué aux tests d'AGI (p. 188, PER-209) — divisé si Armure sur mesure. */
  armorPenalty: number;
  /** Plafond d'AGI imposé par l'armure portée (p. 188), ou `null` si aucun. */
  armorMaxAgi: number | null;
  /** Le personnage connaît-il au moins un sort ? Gate la Concentration accrue (p. 228). */
  hasSpells: boolean;
}

/**
 * Calcule les dérivations d'affichage de `character`, à partir de sa vue dérivée
 * (`buildCharacterDerivedView`) dont on réutilise `modFeatureIds`, `effectContext` et
 * les sources de bonus à la touche — pour ne pas les recalculer.
 */
export function buildSheetDisplayView(
  character: Character,
  derived: CharacterDerivedView,
  maxHp?: number,
): SheetDisplayView {
  const { modFeatureIds, effectContext, attackBonusModSources, itemDerivedModSources } = derived;

  // Sous-termes de breakdown qui ne viennent PAS d'une capacité : points de capacité orphelins
  // convertis (p. 40), apports de stats dérivées des objets portés (PER-273) et bonus à la
  // touche conditionnés à l'arme portée (PER-226). Tous déjà fondus dans le score.
  const extraModSources: ModSources = { ...orphanSourceTerms(character) };
  for (const bag of [itemDerivedModSources, attackBonusModSources]) {
    for (const [key, list] of Object.entries(bag)) {
      const k = key as keyof ModSources;
      extraModSources[k] = [...(extraModSources[k] ?? []), ...(list ?? [])];
    }
  }

  // Dés bonus « à TOUS les tests » injectés sur les 7 caracs → badge double-d20 sur chaque carac
  // (grille de caracs ET en-tête de la carac dans « Compétences & tests »), au SCOPE de la carac
  // (pas répété par ligne de compétence). Deux sources : casse-cou r4 « Au pied du mur » (AUTO tant
  // que PV ≤ niveau — nécessite `maxHp`, sauté si absent/profil incomplet) et casse-cou r6 « L'amour
  // du risque » (interrupteur « Lieu dangereux »). Les deux se cumulent (chaque source garde sa capacité).
  const allTestsDie = [
    ...(maxHp === undefined ? [] : lowHpTestDieSources(character, maxHp)),
    ...activeAllTestsDieSources(character),
  ];
  const bonusDieSourcesDetailed = abilityBonusDiceSources(modFeatureIds, character.featureChoices);
  const bonusDieSources = abilityBonusDiceFromFeatures(modFeatureIds, character.featureChoices);
  if (allTestsDie.length > 0) {
    for (const ability of ABILITY_IDS) {
      bonusDieSourcesDetailed[ability] = [...(bonusDieSourcesDetailed[ability] ?? []), ...allTestsDie];
      bonusDieSources[ability] = [...(bonusDieSources[ability] ?? []), ...allTestsDie.map((s) => s.name)];
    }
  }

  // Dés bonus PAR DOMAINE (rendus par LIGNE dans « Compétences & tests ») = dés CONDITIONNELS actifs
  // (Travail d'équipe via interrupteur) FUSIONNÉS avec les dés PERMANENTS par domaine (genre `test-die`,
  // ex. L'amour du risque r6 « (permanent) sur Résister à la peur »). Les permanents sont toujours là.
  const testDice = activeConditionalTestDice(character);
  for (const [domain, names] of permanentTestDieDomains(modFeatureIds)) {
    testDice.set(domain, [...(testDice.get(domain) ?? []), ...names]);
  }

  return {
    extraModSources,
    abilityMods: abilityModsFromFeatures(modFeatureIds, character.featureChoices),
    abilityModSources: abilityModSources(modFeatureIds, character.featureChoices),
    abilityOverrides: activeAbilityOverrideSources(character),
    abilityFormBonuses: activeFormAbilityBonusSources(character),
    abilityEquipmentBonuses: abilityBonusSourcesFromEquipment(character.equipment),
    bonusDieSources,
    bonusDieSourcesDetailed,
    testBonuses: testBonusSources(modFeatureIds, effectContext),
    testDice,
    abilityTestBonus: abilityTestBonusSources(modFeatureIds, effectContext),
    perAbilityTestBonus: abilityTestBonusByAbility(modFeatureIds, effectContext),
    magicTestBonuses: magicTestBonusSources(modFeatureIds, character.equipment, effectContext),
    universalBonus: universalTestBonus(modFeatureIds),
    // Malus d'armure (p. 188) : DEF mondaine de l'armure portée − bonus magique, plancher 0.
    // Armure sur mesure (chevalier, guerre-r1, PER-236) peut le diviser (ici de moitié).
    armorPenalty: armorEncumbrancePenalty(character.equipment, armorPenaltyDivisor(modFeatureIds)),
    // Plafond d'AGI lu directement sur l'équipement porté (indépendant de la dérogation
    // de défense « Dentelles », seduction-r2).
    armorMaxAgi: defenseFromEquipment(character.equipment).maxAgi,
    hasSpells: modFeatureIds.some((fid) => featureById.get(fid)?.isSpell),
  };
}
