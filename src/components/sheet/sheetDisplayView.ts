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
import { ABILITY_IDS, type AbilityId } from '@/data/schema';
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
  lowHpAttackDieSources,
  lowHpTestDieSources,
  magicTestBonusSources,
  permanentTestDieDomains,
  testBonusSources,
  universalTestBonus,
} from '@/lib/character/effects';
import { boundWeaponAttackDie as boundWeaponAttackDieSource } from '@/lib/character/boundWeapon';
import { orphanSourceTerms } from '@/lib/character/orphanPoints';
import {
  crystalAbilitySources,
  crystalStatSources,
  type CrystalSourceTerm,
} from '@/lib/character/crystals';
import type { Character } from '@/lib/character/types';
import { isCrystalStatus, type StatusSheetImpact } from '@/lib/character/statusEffects';
import type { BreakdownTerm, ModSources } from '@/lib/ui/derivedStatBreakdown';

/**
 * Bonus de carac d'un cristal, enrichi du joueur qui l'a confié (`castBy` — nom du JOUEUR figé à la
 * pose de l'état, jamais celui du personnage). Absent quand le cristal est celui du personnage.
 */
export type CrystalAbilityBonus = CrystalSourceTerm & { castBy?: string };
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
  /**
   * Bonus de caractéristique apportés par les CRISTAUX (PER-360) — les siens et ceux qu'on lui a
   * confiés, chacun avec le joueur qui l'a confié. Comptés par le moteur (`effectiveAbilities`) mais
   * absents de `abilityMods`, qui ne connaît que les capacités : la grille les additionne donc à part.
   */
  abilityCrystalBonuses: Partial<Record<AbilityId, CrystalAbilityBonus[]>>;
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
  /**
   * Sources d'un DÉ BONUS à toutes les ATTAQUES (contact/distance/magie), affichées en badge sur les
   * cartes d'attaque (flibustier r8 « Pas de quartier », auto tant que PV < niveau). Vide sinon.
   */
  attackBonusDieSources: ReturnType<typeof lowHpAttackDieSources>;
  /**
   * Dé bonus en attaque conféré par l'ARME LIÉE (PER-74, r4 « Fidèle ») — restreint au MODE de
   * l'arme liée réellement en main, et seulement tant que sa charge n'est pas dépensée. `null` sinon.
   */
  boundWeaponAttackDie: ReturnType<typeof boundWeaponAttackDieSource>;
  /** Même information avec la capacité source, pour les pastilles du détail d'une carac. */
  bonusDieSourcesDetailed: ReturnType<typeof abilityBonusDiceSources>;
  /** Bonus de compétence par domaine de test (PER-89), règle de cumul p. 203. */
  testBonuses: ReturnType<typeof testBonusSources>;
  /** Dés bonus CONDITIONNELS actifs sur des domaines (Travail d'équipe, via interrupteur). */
  testDice: ReturnType<typeof activeConditionalTestDice>;
  /** Buffs ACTIFS à tous les tests de caractéristique (Bénédiction, via interrupteur). */
  abilityTestBonus: ReturnType<typeof abilityTestBonusSources>;
  /**
   * Modificateurs à tous les tests de caractéristique venus des ÉTATS DE COMBAT posés en session
   * (PER-104) : malus d'un effet situationnel comme bonus d'un buff de groupe. Tenus à part des
   * buffs de capacité (`abilityTestBonus`) parce qu'ils ne renvoient à aucune capacité de la fiche —
   * leur ligne de détail porte le nom de l'état, pas une pastille de capacité. Vide hors session.
   */
  statusTestBonus: StatusSheetImpact['abilityTestSources'];
  /**
   * Même provenance, portée plus étroite (PER-359) : modificateurs d'états limités à CERTAINS
   * DOMAINES de test (Sans peur → résistance à la peur ; Argument de taille → négociation,
   * persuasion, intimidation), keyés par id de domaine. Vide hors session.
   */
  statusDomainBonus: StatusSheetImpact['testDomainSources'];
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
  statusImpact?: StatusSheetImpact,
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
  // Cristaux de la Voie des cristaux (PER-360) : ceux que le personnage a activés et ceux qu'on lui a
  // confiés. Déjà fondus dans le score par le canal des cristaux ; ici on ne fait que NOMMER la source
  // sous « Capacités / divers », avec le joueur qui l'a confié quand le cristal vient d'ailleurs (lu
  // sur l'état posé, seul porteur de cette information).
  const crystalCastBy = new Map<string, string>();
  for (const applied of statusImpact?.statuses ?? []) {
    if (isCrystalStatus(applied.id) && applied.castBy) crystalCastBy.set(applied.id, applied.castBy);
  }
  const crystalTerm = (s: CrystalSourceTerm): BreakdownTerm => ({
    label: s.label,
    value: s.value,
    crystal: { id: s.crystalId, ...(s.received ? { castBy: crystalCastBy.get(s.crystalId) } : {}) },
  });
  for (const [key, list] of Object.entries(crystalStatSources(character))) {
    const k = key as keyof ModSources;
    extraModSources[k] = [...(extraModSources[k] ?? []), ...(list ?? []).map(crystalTerm)];
  }

  // États de combat appliqués par le MJ en session (PER-281) : leurs deltas chiffrés (DEF/Init./
  // attaques) sont fondus dans `derivedInput.mods` par l'appelant ; ici on n'ajoute que la
  // ventilation « État : Aveuglé -5 » au détail « i ». `undefined` hors session → aucun terme.
  if (statusImpact) {
    for (const [key, list] of Object.entries(statusImpact.modSources)) {
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
    abilityCrystalBonuses: Object.fromEntries(
      Object.entries(crystalAbilitySources(character)).map(([ability, list]) => [
        ability,
        (list ?? []).map((s) => ({
          ...s,
          ...(s.received ? { castBy: crystalCastBy.get(s.crystalId) } : {}),
        })),
      ]),
    ),
    abilityOverrides: activeAbilityOverrideSources(character),
    abilityFormBonuses: activeFormAbilityBonusSources(character),
    abilityEquipmentBonuses: abilityBonusSourcesFromEquipment(character.equipment),
    bonusDieSources,
    bonusDieSourcesDetailed,
    // Dé bonus aux ATTAQUES tant que PV < niveau (flibustier r8) — nécessite `maxHp`, sauté sinon.
    attackBonusDieSources: maxHp === undefined ? [] : lowHpAttackDieSources(character, maxHp),
    // Dé bonus de l'arme liée (PER-74) : dépend de l'arme en main et du compteur, pas des PV.
    boundWeaponAttackDie: boundWeaponAttackDieSource(character),
    testBonuses: testBonusSources(modFeatureIds, effectContext),
    testDice,
    abilityTestBonus: abilityTestBonusSources(modFeatureIds, effectContext),
    // Ventilation « tests de caractéristique » des états posés (PER-104). Contrairement aux deltas de
    // stats DÉRIVÉES, elle n'est fondue nulle part ailleurs : les caracs ne sont pas des stats
    // dérivées, `TestDomainsPanel` est le seul à sommer ce canal.
    statusTestBonus: statusImpact?.abilityTestSources ?? [],
    statusDomainBonus: statusImpact?.testDomainSources ?? {},
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
