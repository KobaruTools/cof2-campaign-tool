/**
 * Agrégation des effets structurés des capacités vers le sac de modificateurs
 * plats du moteur (`DerivedMods`) — couche de câblage data → moteur (PER-63,
 * étendue PER-67).
 *
 * Le moteur (`deriveStats`) reste pur : il ne connaît pas les capacités et se
 * contente de sommer un `mods` qu'on lui fournit. Ce module construit ce `mods`
 * à partir des `effects` des capacités acquises. C'est l'unique point
 * d'alimentation, consommé par la fiche et le récap du wizard.
 *
 * Trois sortes d'effets sont gérées :
 *  - bonus plat constant (`stat-bonus` à valeur numérique) — toujours appliqué ;
 *  - bonus SCALANT (`stat-bonus`/`conditional-stat-bonus` à `ScalingValue`) —
 *    résolu depuis le personnage (niveau, caractéristique, rang dans la voie) ;
 *  - bonus CONDITIONNEL / TEMPORAIRE (`conditional-stat-bonus`) — compté seulement
 *    si l'interrupteur manuel du personnage l'active (`Character.effectToggles`).
 *
 * Les deux derniers exigent un contexte (`EffectContext`). Sans contexte, seul le
 * cas plat constant est sommé (suffit aux appels « catalogue seul »).
 */
import { classById, featureById, pathById, priestGodById, progression, testDomains } from '@/data';
import { familiarFromOptionId, FANTASTIC_FAMILIAR_R3_ID } from '@/data/fantastic-familiars';
import type {
  AbilityId,
  AbilitySubstitution,
  ConditionalStatBonusEffect,
  CriticalRange,
  DamageReduction,
  DerivedStatId,
  Die,
  EffectValue,
  FamiliarOriginalPower,
  FantasticFamiliar,
  Feature,
  FeatureEffect,
  FinesseAttackEffect,
  FinesseAttackMode,
  ImmunityId,
  ResistibleDamageType,
  SourcePage,
  UsageCounter,
  UsageResetTrigger,
  Weapon,
  WeaponCriticalCondition,
} from '@/data/schema';
import { ABILITY_IDS, FINESSE_ATTACK_MODES, IMMUNITY_LABELS, RESISTIBLE_DAMAGE_TYPES } from '@/data/schema';
import { scalingDie, type DerivedMods } from '@/lib/engine';
import {
  borrowedFeatureIds,
  borrowedHostPathByFeatureId,
  borrowedNoManaFeatureIds,
  effectiveFeatureIdsForMods,
  getOptionSelections,
  grantedFeatureIds,
  grantedNoManaFeatureIds,
  suppressedTestBonusFeatureIds,
  weaponFamiliesMatchChoice,
} from './choices';
import { archmageStaffGrantedSpellIds } from './archmagePath';
import { crystalAbilityBonuses } from './crystals';
import { declineForFeature, resolveFeatureElement } from './dragonElement';
import {
  armorDisabledFeatureIds,
  DON_ETRANGE_ARMOR_USAGE_KEY,
  DON_ETRANGE_ID,
  isArmorWorn,
  dualWieldDisabledFeatureIds,
  rangedWeaponDisabledFeatureIds,
  pathArmorDisabledFeatureIds,
  shieldDisabledFeatureIds,
} from './armorRestrictions';
import {
  abilityBonusesFromEquipment,
  isHeavyArmorWorn,
  isStaffWielded,
  isTwoHandedMeleeWeaponWielded,
  lineDisplayName,
  oneHandableWeaponFamilies,
  testBonusSourcesFromEquipment,
  wornMeleeWeapon,
  wornMeleeWeaponLine,
  wornRangedWeapon,
} from './equipment';
import { magicDamageReductions, magicImmunities } from './magicItemEffects';
import { extraMasteredWeaponIds, isWeaponMastered, masteredClassIds } from './mastery';
import { baseAncestrySize } from './size';
import { currentHp } from './gauges';
import { ridingMountOptionIds } from './mounts';
import { rulesContext } from './rulesContext';
import type { Character, EquipmentLine, FeatureChoiceSelection } from './types';

/**
 * Contexte de résolution des effets : tout ce qui ne se déduit pas du seul
 * catalogue. `pathRanks` (rang max atteint par voie) est calculé en interne à
 * partir de la liste de capacités fournie ; on ne porte ici que le strictement
 * non dérivable.
 */
export interface EffectContext {
  /** Niveau du personnage — pour les valeurs scalantes `by: 'level'`. */
  level: number;
  /** Caractéristiques — pour les valeurs scalantes `scale: 'ability'`. */
  abilities: Record<AbilityId, number>;
  /**
   * Interrupteurs manuels (cf. `Character.effectToggles`) : `toggles[id][i]`
   * aligné sur `feature.effects[i]`. Absent → état par défaut de l'effet.
   */
  toggles: Record<string, boolean[]>;
  /**
   * Options retenues (cf. `Character.featureChoices`) : `featureChoices[id][i]`
   * aligné sur `feature.choices[i]`. Sert aux effets PILOTÉS PAR UN CHOIX, comme
   * l'échange de caractéristique pour les PV (`hpAbilitySwapSources`). Optionnel :
   * absent → aucun choix pris en compte (appels « catalogue seul »).
   */
  featureChoices?: Record<string, FeatureChoiceSelection[]>;
  /**
   * Mapping `id de capacité EMPRUNTÉE → pathId de la VOIE A` qui l'a fait emprunter (cf.
   * `borrowedHostPathByFeatureId`). Sert à résoudre le `rang`/les paliers `by: 'path-rank'` d'une
   * capacité empruntée contre la voie A (encadré « Appel à une autre capacité ») et non contre sa
   * voie d'origine, que le personnage ne possède pas. Absent → chaque capacité utilise sa propre voie.
   */
  borrowedHostPaths?: Map<string, string>;
  /**
   * Ids de capacités dont le « bonus de compétence associé » (`test-bonus`) est SUPPRIMÉ, IGNORÉ par
   * `rawTestContributions` : capacités OCTROYÉES (`grantedFeature`, PER-323 — le cambion obtient le
   * sort Ténèbres mais pas l'érudition occulte, cf. `suppressedTestBonusFeatureIds` de choices.ts) ET
   * sorts liés au Bâton magique de l'archimage (PER-74, R5, audit généralisé 2026-08-11 — même clause
   * annexe que pour `suppressedStatBonusFeatureIds` ci-dessous, mais portant un `test-bonus` : Ténèbres,
   * Injonction, Mirage, Morsure de la forge). Fusion des deux sources faite au point de construction
   * de ce contexte (`effectContext`). Absent → aucune suppression.
   */
  suppressedTestBonusFeatureIds?: Set<string>;
  /**
   * Ids de sorts GRANTÉS par le Bâton magique de l'archimage (`archmageStaffGrantedSpellIds`, R5, p. 154)
   * dont le bonus permanent INCONDITIONNEL (`stat-bonus`) est IGNORÉ par `effectContributions` : le sort
   * est bien lié au bâton, mais pas l'à-côté permanent de sa voie d'origine (« en plus de ce sort, gagne
   * un bonus permanent... », ex. Murmures dans le vent). Absent → aucune suppression.
   */
  suppressedStatBonusFeatureIds?: Set<string>;
  /**
   * Nombre de rangs ACQUIS dans chaque voie (pathId → compte) — pour les valeurs scalantes
   * `scale: 'path-rank-count'` (« RD de 1 par rang de la voie »). Distinct de `pathRanks` (NUMÉRO
   * du rang max) : compté sur `character.featureIds` (cf. `pathRankCountsFromFeatures`). Absent →
   * traité comme 0 (appels « catalogue seul » sans contexte de progression).
   */
  pathRankCounts?: Record<string, number>;
  /**
   * Une armure est-elle RÉELLEMENT portée par le personnage (slot `armor`) ? Sert aux
   * effets `armor-def-bonus` résolus AUTOMATIQUEMENT depuis l'équipement (Armure de vent,
   * PER-132) — sans interrupteur manuel. Absent → traité comme « aucune armure portée »
   * (les appels « catalogue seul » n'ont pas d'équipement ; `effectContext` le renseigne).
   */
  armorWorn?: boolean;
  /**
   * Une armure LOURDE (plaque / plaque complète, cf. `isHeavyArmorWorn`) est-elle réellement
   * portée ? Sert aux effets `heavy-armor-def-bonus` résolus AUTOMATIQUEMENT (Armure sur mesure,
   * `guerre-r1`, PER-236). Absent → traité comme « pas d'armure lourde ».
   */
  heavyArmorWorn?: boolean;
  /**
   * Une arme de CONTACT est-elle TENUE À DEUX MAINS (cf. `isTwoHandedMeleeWeaponWielded`, prise
   * réelle comprise) ? Sert aux effets `two-handed-weapon-def-bonus` résolus AUTOMATIQUEMENT
   * (« Tenir à distance », voie des armes à deux mains r6, PER-74). Absent → traité comme « aucune
   * arme à deux mains en main » (les appels « catalogue seul » n'ont pas d'équipement).
   */
  twoHandedMeleeWielded?: boolean;
  /**
   * Un bâton (ou bâton ferré, même famille de maîtrise) est-il TENU EN MAIN (cf. `isStaffWielded`) ?
   * Sert à l'effet `staff-def-bonus` résolu AUTOMATIQUEMENT (Sceptre défensif, voie de l'archimage
   * r4, PER-74). Absent → traité comme « aucun bâton en main ».
   */
  staffWielded?: boolean;
  /**
   * Ids des OPTIONS dont provient la monture actuellement CHEVAUCHÉE (cf. `ridingMountOptionIds`).
   * Sert les interrupteurs qu'une monture NOMMÉE force à l'état actif (chevalier dragon r4 : « ou
   * chevauche son drake », cf. `EffectActivation.autoActiveWhenRidingOptionIds`). Absent → traité
   * comme « à pied » (les appels « catalogue seul » n'ont pas d'état de jeu).
   */
  ridingOptionIds?: string[];
  /**
   * Élément de prédilection RÉSOLU (`ResistibleDamageType.id`) de chaque capacité portant un
   * `Feature.elementFromChoice`, par id de capacité (PER-74, Métamorphose élémentaire, élémentaliste
   * r8, p. 157) — précalculé depuis le `Character` complet (`resolveFeatureElement`) pour que les
   * agrégateurs PURS ne dépendant que de `ctx` (`effectContributions`/`modsFromFeatures`) puissent
   * filtrer un `StatBonus.requiresElement` sans avoir besoin du personnage. Absent/capacité sans
   * choix fait → pas d'entrée (les bonus `requiresElement` de cette capacité ne comptent pas).
   */
  resolvedElements?: Partial<Record<string, ResistibleDamageType>>;
}

/**
 * Ids des capacités qui ALIMENTENT effectivement les stats dérivées et les caractéristiques :
 * capacités acquises + empruntées (`effectiveFeatureIdsForMods`) MOINS celles DÉSACTIVÉES par le
 * port d'armure (PER-83, cf. `armorDisabledFeatureIds`). C'est la SOURCE UNIQUE de capacités « qui
 * comptent » consommée par la fiche (`buildCharacterDerivedView`) et le récap du wizard : une
 * capacité gênée par l'armure portée ne contribue plus à aucun total (bonus de DEF/Init/PV,
 * modificateur de caractéristique, test, immunité…) tant que l'armure est portée ; la retirer la
 * réactive. Le RENDU « désactivée » (rang désaturé + infobulle) est déjà porté par PER-86 dans
 * `FeaturesByPath` — ici on n'assure que le RETRAIT effectif dans les calculs.
 */
export function activeFeatureIdsForMods(character: Character): string[] {
  const ids = effectiveFeatureIdsForMods(character);
  // Capacités désactivées par le port d'armure (PER-83), par l'absence de bouclier (PER-142, Voie du
  // bouclier) OU par l'absence de l'arme à distance requise (PER-74, Voie de l'archer arcanique :
  // arc/arbalète en main) : dans tous ces cas leurs effets ne comptent plus.
  const disabled = armorDisabledFeatureIds(character, rulesContext);
  for (const id of shieldDisabledFeatureIds(character, rulesContext)) disabled.add(id);
  for (const id of rangedWeaponDisabledFeatureIds(character, rulesContext)) disabled.add(id);
  // PER-74 — capacités de la Voie du combat à deux armes désactivées sans une arme dans chaque main
  // (p. 73), Combattant héroïque excepté (`dualWieldExemptFeatureIds`).
  for (const id of dualWieldDisabledFeatureIds(character, rulesContext)) disabled.add(id);
  // PER-74 — capacités d'une voie (ou d'UN RANG, `Feature.maxArmorId`) qui fixe son propre plafond
  // d'armure (Voie du danseur de guerre p. 150 ; Métamorphose de l'ours p. 152), désactivées tant
  // qu'une armure plus encombrante est portée. Complète PER-83, qui n'agit que sur les voies de
  // PROFIL (une voie de prestige n'a pas de profil d'origine).
  for (const id of pathArmorDisabledFeatureIds(character, rulesContext)) disabled.add(id);
  // PER-74 — capacités de voie de PROFIL désactivées par une transformation ACTIVE qui prive de leur
  // usage (Métamorphose de l'ours, p. 152 : « ne peut plus utiliser ses capacités de profil »).
  for (const id of profileFeaturesDisabledByTransformation(character).keys()) disabled.add(id);
  // Exclusion générale par `disablesFeatures`/`mutuallyExclusiveWith` d'un interrupteur ACTIF (ex.
  // rage/furie du berserk, p. 82 : les capacités des voies non cumulables ne comptent plus tant que
  // la rage ou la furie est active).
  for (const id of disabledFeatureIds(character)) disabled.add(id);
  // PER-328 — emprunts de « Lames et sorcellerie » désactivés tant que « À l'abri du plein soleil »
  // est éteint : leurs effets ne comptent plus (comme le grisage côté `disabledFeatureReasons`).
  for (const id of borrowedFeaturesDisabledByInactiveToggle(character).keys()) disabled.add(id);
  return disabled.size ? ids.filter((id) => !disabled.has(id)) : ids;
}

/**
 * PER-74 — id de la capacité ACTIVE qui rend les attaques à distance MAGIQUES (effet
 * `ranged-attack-magical`), ou `null` sinon. « Active » au sens de `activeFeatureIdsForMods` : la Voie
 * de l'archer arcanique étant gatée `requiresRangedKinds`, « Flèche magique » (r4) n'est retenue que
 * si un arc/une arbalète est en main → le badge « Magique » de la carte d'attaque à distance
 * n'apparaît qu'avec l'arme adéquate équipée. On renvoie la PREMIÈRE source (une seule dans le livre).
 */
export function rangedAttackMagicalSourceId(character: Character): string | null {
  for (const id of activeFeatureIdsForMods(character)) {
    const feature = featureById.get(id);
    if (feature?.effects?.some((e) => e.kind === 'ranged-attack-magical')) return id;
  }
  return null;
}

/**
 * PER-74 — élément de DM AJOUTÉ aux attaques à distance (effet `ranged-attack-elemental`, ex. Flèche
 * élémentaire r7), choisi « à la table » (`effectInputs[featureId]`). Renvoie `{ featureId, element }`
 * si la capacité est ACTIVE (arc/arbalète en main, gating `requiresRangedKinds`) ET qu'un élément
 * VALIDE est retenu, sinon `null` (aucune puce). Comme le `scopeChoice` d'une RD, l'absence de choix =
 * pas d'effet affiché (l'élément change à chaque combat).
 */
export interface RangedAttackElementView {
  /** Capacité source (Flèche élémentaire r7). */
  featureId: string;
  /** Élément retenu « à la table ». */
  element: ResistibleDamageType;
  /**
   * Notation du dé de DM bonus RÉSOLU AU NIVEAU (ex. `1d4°` → `d12°` au niveau 16 pour un dé évolutif),
   * pour la puce ; absent si l'effet n'en déclare pas. Le marqueur `°` est conservé (dé évolutif).
   */
  bonusDie?: string;
}

/**
 * PER-324 — décalage de cran du dé évolutif (« dé évolutif +1 cran », table p. 43) porté par le
 * personnage : somme des `value` des effets `scaling-die-tier-bonus` de ses capacités ACTIVES (au
 * sens de `activeFeatureIdsForMods`). Retourne 0 quand aucune capacité active ne le porte — soit le
 * comportement identique (aucun décalage). Cette valeur se threade partout où `scalingDie` est résolu
 * pour ce personnage.
 */
export function scalingDieTierBonus(character: Character): number {
  let total = 0;
  for (const id of activeFeatureIdsForMods(character)) {
    const effects = featureById.get(id)?.effects;
    if (!effects) continue;
    for (const e of effects) {
      if (e.kind === 'scaling-die-tier-bonus') total += e.value;
    }
  }
  return total;
}

/** Bonus de soin par DR dépensé au repos, ACTIF (interrupteur ON), résolu au niveau du personnage. */
export interface RestRecoveryHealBonus {
  featureId: string;
  /** Nom de la capacité source (français) — pour le libellé de la modale de repos. */
  name: string;
  /** Nombre de dés (généralement 1). */
  count: number;
  /** Dé RÉSOLU au niveau (+ décalage de cran) : ex. `d4` → `d6` avec le bonus demi-elfe. */
  die: Die;
  /** Dé évolutif ? (conserve le marqueur `°` dans l'UI). */
  evolving: boolean;
  /** Contexte requis (repris de l'interrupteur), ex. « en milieu naturel ». */
  conditionLabel?: string;
  sourcePage?: number;
}

/**
 * Bonus de soin par dé de récupération dépensé, ACTIFS au repos (Survie, rôdeur p. 72 : « s'il dépense
 * 1 DR, il guérit 1d4° PV supplémentaire » ; et sa version EMPRUNTÉE, Le Compagnon). Une capacité
 * possédée OU empruntée portant `recoveryDieHealBonus` n'est retenue que si son effet conditionnel est
 * ACTIF (interrupteur « en milieu naturel » ON, `hasActiveConditionalEffect`) — c'est le « uniquement si
 * la skill est cochée » du gating. Le dé évolutif est résolu au niveau du personnage (+ décalage de
 * cran, cf. `scalingDieTierBonus`). Le résultat du dé est LANCÉ à la table et saisi dans la modale de
 * repos ; le moteur l'ajoute au soin de la dépense de DR (repos court ET long). Vide = repos standard.
 */
export function restRecoveryDieHealBonuses(character: Character): RestRecoveryHealBonus[] {
  const out: RestRecoveryHealBonus[] = [];
  const tierBonus = scalingDieTierBonus(character);
  const seen = new Set<string>();
  for (const id of [...character.featureIds, ...borrowedFeatureIds(character)]) {
    if (seen.has(id)) continue;
    seen.add(id);
    const feature = featureById.get(id);
    const bonus = feature?.recoveryDieHealBonus;
    if (!feature || !bonus) continue;
    if (!hasActiveConditionalEffect(character, id)) continue; // Gate : interrupteur ON.
    const die = bonus.dice.evolving
      ? scalingDie(character.level, progression, tierBonus)
      : bonus.dice.die;
    out.push({
      featureId: id,
      name: feature.name,
      count: bonus.dice.count,
      die,
      evolving: !!bonus.dice.evolving,
      conditionLabel: bonus.conditionLabel,
      sourcePage: bonus.sourcePage,
    });
  }
  return out;
}

/**
 * Résout une notation de dé SIMPLE (sans palier `|C@R`) à un niveau donné : un dé évolutif `°` prend
 * sa face au niveau courant (`scalingDie`, p. 43), un dé fixe reste tel quel. Le nombre de dés `1` est
 * omis (convention d'affichage). Notation inattendue → renvoyée telle quelle.
 */
function resolveSimpleBonusDie(notation: string, level: number, tierBonus = 0): string {
  const m = /^(\d*)d(\d+)(°?)$/.exec(notation.trim());
  if (!m) return notation;
  const [, countStr, faces, marker] = m;
  const evolving = marker === '°';
  const die: Die = evolving ? scalingDie(level, progression, tierBonus) : (`d${faces}` as Die);
  const count = countStr && countStr !== '1' ? countStr : '';
  return `${count}${die}${evolving ? '°' : ''}`;
}

export function rangedAttackElement(character: Character): RangedAttackElementView | null {
  for (const id of activeFeatureIdsForMods(character)) {
    const feature = featureById.get(id);
    const effect = feature?.effects?.find((e) => e.kind === 'ranged-attack-elemental');
    if (effect?.kind !== 'ranged-attack-elemental' || !feature) continue;
    const chosen = character.effectInputs?.[id];
    if (typeof chosen === 'string' && (effect.choices as string[]).includes(chosen)) {
      return {
        featureId: id,
        element: chosen as ResistibleDamageType,
        bonusDie: effect.bonusDie
          ? resolveSimpleBonusDie(effect.bonusDie, character.level, scalingDieTierBonus(character))
          : undefined,
      };
    }
  }
  return null;
}

/**
 * PER-74 — ATTAQUE EN FINESSE ACTIVE (effet `finesse-attack`, ex. Vive attaque du duelliste r4, p. 140),
 * choisie « à la table » (`effectInputs[featureId]`). Renvoie le mode retenu (`'attack'` = AGI à la
 * touche, `'damage'` = AGI aux DM) si (a) une arme de contact ÉLIGIBLE est tenue en main (id ∈
 * `weaponIds`), (b) la capacité est ACTIVE, et (c) un mode valide est enregistré ; sinon `null` (finesse
 * inactive). L'arme retenue est l'arme de contact CANONIQUE (main principale prioritaire), cohérente avec
 * la carte « Attaque au contact » qui en affiche les DM.
 *
 * Cas AUTOMATIQUE (`effect.automatic`, ex. Précision du barde p. 66 / Attaque en finesse du voleur
 * p. 77) : la capacité n'offre qu'un seul mode (la touche, « mais pas aux DM ») donc aucun arbitrage —
 * la substitution s'applique d'office dès qu'elle est AVANTAGEUSE (AGI > FOR), sans réglage à la table.
 */
export interface FinesseAttackView {
  /** Capacité source (Vive attaque r4). */
  featureId: string;
  /** Mode retenu : substitution à la TOUCHE ou aux DM (jamais les deux). */
  mode: FinesseAttackMode;
  /** Caractéristique de substitution (AGI). */
  ability: AbilityId;
  /** Caractéristique remplacée (FOR). */
  replaces: AbilityId;
  /** Substitution appliquée d'office (pas de choix « à la table ») ? */
  automatic: boolean;
}

/**
 * L'arme de contact TENUE EN MAIN ouvre-t-elle droit à la finesse de `effect` ? Le livre gate la
 * substitution sur l'ARME EMPLOYÉE, pas sur la simple possession : « lorsqu'il emploie une arme
 * légère à une main » (p. 66/77). Trois conditions, toutes lues sur l'équipement PORTÉ :
 *  1. une arme de contact est bien EN MAIN (`wornMeleeWeaponLine` : main principale, sinon secondaire
 *     — les lignes rangées de l'inventaire ne comptent pas) ;
 *  2. son id est dans la liste éligible de la capacité (énumération du livre : dague, épée courte,
 *     rapière… ; le stylet est « considéré comme une arme légère », p. 183) ;
 *  3. elle est employée À UNE MAIN — donc ni une arme à deux mains, ni une arme empoignée à deux
 *     mains (« Deux mains », `worn.grip`). SEULE dérogation : les armes de `twoHandedWeaponIds`
 *     (vivelame), et uniquement si le personnage MAÎTRISE l'arme (« s'il maîtrise les armes de
 *     contact à deux mains », p. 183).
 */
function finesseWeaponEligible(character: Character, effect: FinesseAttackEffect): boolean {
  const line = wornMeleeWeaponLine(character.equipment);
  const weapon = wornMeleeWeapon(character.equipment);
  if (!line || !weapon) return false;
  const usedInTwoHands = weapon.weaponCategory === 'twoHands' || line.worn?.grip === 'twoHands';
  if (!usedInTwoHands) return effect.weaponIds.includes(weapon.id);
  if (!effect.twoHandedWeaponIds?.includes(weapon.id)) return false;
  // Arme maniable à une OU deux mains (lance, danseur de guerre r4, p. 150) : aucune dérogation à
  // accorder — le personnage pourrait l'employer à une main. La condition de maîtrise ne vise que les
  // armes qui ne s'emploient QUE à deux mains (vivelame, p. 183).
  if (weapon.weaponCategory === 'oneOrTwoHands') return true;
  return isWeaponMastered(
    weapon,
    masteredClassIds(character, rulesContext),
    rulesContext,
    character.firearmsAllowed,
    extraMasteredWeaponIds(character, character.firearmsAllowed),
  );
}

/**
 * Toutes les attaques en finesse ACTIVES, dans l'ordre des capacités. Plusieurs peuvent coexister :
 * le livre l'autorise explicitement (p. 140, « sauf s'il dispose d'une autre capacité qui le lui
 * permet, par exemple attaque en finesse ») — un voleur-duelliste substitue l'AGI à la touche via
 * Attaque en finesse ET aux DM via Vive attaque. Chaque consommateur prend donc le mode qui le
 * concerne (`finesseAttackForMode`) plutôt qu'une substitution unique.
 */
export function finesseAttackChoices(character: Character): FinesseAttackView[] {
  const out: FinesseAttackView[] = [];
  let abilities: Record<AbilityId, number> | null = null;
  for (const id of activeFeatureIdsForMods(character)) {
    const feature = featureById.get(id);
    const effect = feature?.effects?.find((e) => e.kind === 'finesse-attack');
    if (effect?.kind !== 'finesse-attack' || !feature) continue;
    if (!finesseWeaponEligible(character, effect)) continue;
    const modes: readonly FinesseAttackMode[] = effect.modes ?? FINESSE_ATTACK_MODES;
    const common = { featureId: id, ability: effect.ability, replaces: effect.replaces };
    if (effect.automatic) {
      // Substitution d'office : seulement si elle est avantageuse (« peut remplacer » → le joueur ne
      // troquerait pas une bonne carac contre une moins bonne). Caracs EFFECTIVES (objets + capacités).
      abilities ??= effectiveAbilities(character);
      if (abilities[effect.ability] <= abilities[effect.replaces]) continue;
      out.push({ ...common, mode: modes[0], automatic: true });
      continue;
    }
    const chosen = character.effectInputs?.[id];
    if (chosen !== 'attack' && chosen !== 'damage') continue;
    if (!modes.includes(chosen)) continue;
    out.push({ ...common, mode: chosen, automatic: false });
  }
  return out;
}

/** Attaque en finesse active portant sur `mode` (touche ou DM), ou `null`. */
export function finesseAttackForMode(character: Character, mode: FinesseAttackMode): FinesseAttackView | null {
  return finesseAttackChoices(character).find((f) => f.mode === mode) ?? null;
}

/** Première attaque en finesse active, tous modes confondus (compat historique / recettes). */
export function finesseAttackChoice(character: Character): FinesseAttackView | null {
  return finesseAttackChoices(character)[0] ?? null;
}

/**
 * Caractéristiques EFFECTIVES = valeur saisie (base + peuple) + modificateurs
 * PERMANENTS apportés par les capacités (`ability-bonus`, ex. Endurer/metal-r5 :
 * +1 CON). C'est la valeur réelle de la caractéristique du personnage (celle que
 * la fiche affiche comme « total »), donc celle qui doit alimenter les statistiques
 * dérivées (PV, dés de récupération, DEF, attaques…) et les effets scalants.
 *
 * Les capacités sont prises sur le même périmètre que les modificateurs dérivés
 * (`effectiveFeatureIdsForMods` : acquises + empruntées par choix), pour rester
 * cohérent avec l'inventaire affiché par `abilityModSources`.
 *
 * S'y ajoute enfin l'apport des OBJETS PORTÉS (PER-272, `abilityBonusesFromEquipment`) :
 * un objet enchanté modifie la caractéristique elle-même, donc tout ce qui en découle
 * (DEF via l'AGI, PV via la CON, initiative via la PER, tests, attaques…) sans que
 * chaque consommateur ait à le savoir.
 */
export function effectiveAbilities(character: Character): Record<AbilityId, number> {
  const mods = abilityModsFromFeatures(activeFeatureIdsForMods(character), character.featureChoices);
  const out: Record<AbilityId, number> = { ...character.abilities };
  for (const [ability, value] of Object.entries(mods) as [AbilityId, number][]) {
    out[ability] = (out[ability] ?? 0) + value;
  }
  // SURCHARGE de transformation (PER-74) : un interrupteur de forme ACTIF impose des caracs ABSOLUES
  // (ex. loup : FOR +3 / AGI +1), qui ÉCRASENT la valeur saisie ET les modificateurs permanents.
  const overrides = activeAbilityOverrides(character);
  for (const [ability, value] of Object.entries(overrides) as [AbilityId, number][]) {
    out[ability] = value;
  }
  // BONUS DE FORME EN DELTA (PER-74, ex. Forme puissante r8 : +2 FOR « loup ou hybride ») : appliqué
  // APRÈS l'override absolu — sous forme de loup, FOR imposée à 3 devient 5 ; sous forme hybride (pas
  // d'override), le delta s'ajoute à la valeur de base. Ne compte que si une forme référencée est active.
  const formBonuses = activeFormAbilityBonuses(character);
  for (const [ability, value] of Object.entries(formBonuses) as [AbilityId, number][]) {
    out[ability] = (out[ability] ?? 0) + value;
  }
  // APPORT DE L'ÉQUIPEMENT PORTÉ (PER-272, ex. bottes de vivacité +1 AGI, heaume maudit −2 PER) :
  // appliqué EN DERNIER, en delta, comme les bonus de forme — un anneau enchanté agit aussi sous
  // forme animale (la transformation impose la carac de la bête, l'objet enchanté s'ajoute par-dessus).
  // Le plafond d'AGI de l'armure (p. 188) s'applique en AVAL, sur cette valeur finale (cf. `deriveStats`).
  const itemBonuses = abilityBonusesFromEquipment(character.equipment);
  for (const [ability, value] of Object.entries(itemBonuses) as [AbilityId, number][]) {
    out[ability] = (out[ability] ?? 0) + value;
  }
  // CRISTAUX ACTIFS (PER-74, voie des cristaux, p. 156) : bonus en delta, tant qu'activés
  // (`Character.activeCrystalIds`) — même couche que les objets portés/bonus de forme.
  const crystalBonuses = crystalAbilityBonuses(character);
  for (const [ability, value] of Object.entries(crystalBonuses) as [AbilityId, number][]) {
    out[ability] = (out[ability] ?? 0) + value;
  }
  return out;
}

/**
 * Source d'une SURCHARGE de caractéristique par transformation active (PER-74) — capacité + valeur
 * imposée + page, pour l'affichage (grid + détail de la carac). Une seule forme peut être active à la
 * fois (interrupteurs mutuellement exclusifs), mais la structure gère plusieurs caracs surchargées.
 */
export interface AbilityOverrideSource {
  featureId: string;
  /** Nom de la capacité (français, ex. « Transformation en loup »). */
  name: string;
  /** Valeur ABSOLUE imposée à la caractéristique. */
  value: number;
  /** Page source CO2. */
  page: SourcePage;
}

/**
 * SURCHARGES de caractéristiques imposées par les transformations ACTIVES (PER-74), par caractéristique,
 * avec leur capacité source. Parcourt les capacités acquises ; pour chaque `conditional-stat-bonus`
 * porteur d'`abilityOverrides` dont l'interrupteur est ACTIF (`isEffectActive`), enregistre la valeur
 * absolue. En cas de conflit (plusieurs formes actives — normalement impossible via `mutuallyExclusiveWith`),
 * la dernière rencontrée l'emporte. Vide = aucune transformation active.
 */
export function activeAbilityOverrideSources(
  character: Character,
): Partial<Record<AbilityId, AbilityOverrideSource>> {
  const out: Partial<Record<AbilityId, AbilityOverrideSource>> = {};
  // PER-74 : une transformation à plafond d'armure propre (`Feature.maxArmorId`, Métamorphose de
  // l'ours p. 152) n'impose plus ses surcharges tant que l'armure portée dépasse ce plafond — même
  // interrupteur allumé, la forme ne « prend » pas (patron des autres restrictions d'armure, PER-83/86).
  const armorDisabled = pathArmorDisabledFeatureIds(character, rulesContext);
  for (const id of character.featureIds) {
    if (armorDisabled.has(id)) continue;
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    feature.effects.forEach((e, index) => {
      if (e.kind !== 'conditional-stat-bonus' || !e.abilityOverrides) return;
      if (!isEffectActive(character, id, index)) return;
      for (const [ability, value] of Object.entries(e.abilityOverrides) as [AbilityId, number][]) {
        out[ability] = { featureId: id, name: feature.name, value, page: feature.sourcePage };
      }
    });
  }
  // Surcharge DYNAMIQUE (PER-375/PER-435, Forme animale/changeforme) : l'animal est choisi en jeu, pas
  // fixé dans les données — `Character.transformationAbilities` porte le snapshot dénormalisé au choix
  // (voir sa doc, `types.ts`). Actif ⟺ l'interrupteur `activeWhenInputSet` correspondant l'est encore
  // (le joueur a pu changer/retirer sa forme depuis) ; on retrouve cet interrupteur en cherchant, sur
  // LA capacité elle-même, l'effet dont `activeWhenInputSet` vaut cette clé.
  for (const [inputKey, abilities] of Object.entries(character.transformationAbilities ?? {})) {
    const feature = featureById.get(inputKey);
    if (!feature?.effects) continue;
    const index = feature.effects.findIndex(
      (e) => e.kind === 'conditional-stat-bonus' && e.activation.activeWhenInputSet === inputKey,
    );
    if (index < 0 || !isEffectActive(character, inputKey, index)) continue;
    for (const [ability, value] of Object.entries(abilities) as [AbilityId, number][]) {
      out[ability] = { featureId: inputKey, name: feature.name, value, page: feature.sourcePage };
    }
  }
  return out;
}

/** Valeurs absolues des caractéristiques surchargées par les transformations actives (PER-74). */
export function activeAbilityOverrides(character: Character): Partial<Record<AbilityId, number>> {
  const sources = activeAbilityOverrideSources(character);
  const out: Partial<Record<AbilityId, number>> = {};
  for (const [ability, src] of Object.entries(sources) as [AbilityId, AbilityOverrideSource][]) {
    out[ability] = src.value;
  }
  return out;
}

/**
 * La surcharge DYNAMIQUE `character.transformationDerivedStats[inputKey]` (Forme animale, retour
 * propriétaire 2026-08-19 — même patron que `transformationAbilities`, voir sa doc dans
 * `activeAbilityOverrideSources`) est-elle ACTIVE ? Actif ⟺ l'interrupteur `activeWhenInputSet`
 * correspondant, porté par LA capacité elle-même, l'est encore (le joueur a pu changer/retirer sa
 * forme depuis).
 */
function isTransformationDerivedStatsInputActive(character: Character, inputKey: string): boolean {
  const feature = featureById.get(inputKey);
  if (!feature?.effects) return false;
  const index = feature.effects.findIndex(
    (e) => e.kind === 'conditional-stat-bonus' && e.activation.activeWhenInputSet === inputKey,
  );
  return index >= 0 && isEffectActive(character, inputKey, index);
}

/**
 * DEF imposée par une transformation ACTIVE : soit un nombre FIXE imprimé dans les données
 * (`Feature.effects[].defenseOverride`, PER-374, formes élémentaires : « Défense 25 »), soit la DEF
 * de la créature CHOISIE en jeu (`character.transformationDerivedStats`, Forme animale, retour
 * propriétaire 2026-08-19), indépendante de la formule habituelle 10 + AGI + équipement. `null` =
 * aucune surcharge active. Une seule forme peut être active à la fois (interrupteurs mutuellement
 * exclusifs) ; en cas de conflit la dernière rencontrée l'emporte, comme `activeAbilityOverrideSources`.
 */
export function activeDefenseOverride(character: Character): number | null {
  let out: number | null = null;
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    feature?.effects?.forEach((e, index) => {
      if (e.kind !== 'conditional-stat-bonus' || e.defenseOverride === undefined) return;
      if (!isEffectActive(character, id, index)) return;
      out = e.defenseOverride;
    });
  }
  for (const [inputKey, stats] of Object.entries(character.transformationDerivedStats ?? {})) {
    if (stats.defense === undefined || !isTransformationDerivedStatsInputActive(character, inputKey)) continue;
    out = stats.defense;
  }
  return out;
}

/**
 * Initiative imposée par une transformation ACTIVE : symétrique de `activeDefenseOverride`, soit un
 * nombre FIXE imprimé dans les données (`Feature.effects[].initiativeOverride`), soit l'Initiative de
 * la créature CHOISIE en jeu (`character.transformationDerivedStats`, Forme animale, retour
 * propriétaire 2026-08-19). `null` = aucune surcharge active.
 */
export function activeInitiativeOverride(character: Character): number | null {
  let out: number | null = null;
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    feature?.effects?.forEach((e, index) => {
      if (e.kind !== 'conditional-stat-bonus' || e.initiativeOverride === undefined) return;
      if (!isEffectActive(character, id, index)) return;
      out = e.initiativeOverride;
    });
  }
  for (const [inputKey, stats] of Object.entries(character.transformationDerivedStats ?? {})) {
    if (stats.initiative === undefined || !isTransformationDerivedStatsInputActive(character, inputKey)) continue;
    out = stats.initiative;
  }
  return out;
}

/** Une capacité apportant un bonus de carac EN DELTA conditionné à une forme active (PER-74). */
export interface AbilityFormBonusSource {
  featureId: string;
  /** Nom de la capacité (français, ex. « Forme puissante »). */
  name: string;
  value: number;
}

/**
 * Sources des bonus de carac EN DELTA conditionnés à une forme active (PER-74, effet
 * `active-form-ability-bonus`, ex. Forme puissante r8). Pour chaque effet dont AU MOINS UN des
 * interrupteurs de forme référencés (`whenAnyActive`) est actif, enregistre le delta par caractéristique
 * avec sa capacité source. Vide si aucune forme référencée n'est active. Alimente le total
 * (`effectiveAbilities`) ET le détail affiché de la caractéristique (breakdown de la grille).
 */
export function activeFormAbilityBonusSources(
  character: Character,
): Partial<Record<AbilityId, AbilityFormBonusSource[]>> {
  const out: Partial<Record<AbilityId, AbilityFormBonusSource[]>> = {};
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind !== 'active-form-ability-bonus') continue;
      const active = e.whenAnyActive.some((ref) => isEffectActive(character, ref.featureId, ref.index));
      if (!active) continue;
      // Gating par ÉLÉMENT RÉSOLU de LA CAPACITÉ PORTEUSE (PER-74) : un delta propre à une seule
      // branche d'une capacité à interrupteur partagé (élémentaliste r8) — cf.
      // `ActiveFormAbilityBonusEffect.requiresElement`.
      if (e.requiresElement && resolveFeatureElement(character, feature)?.id !== e.requiresElement) continue;
      for (const [ability, value] of Object.entries(e.abilities) as [AbilityId, number][]) {
        if (!value) continue;
        (out[ability] ??= []).push({ featureId: id, name: feature.name, value });
      }
    }
  }
  return out;
}

/** Deltas de caractéristiques (sommés par carac) apportés par les bonus de forme actifs (PER-74). */
export function activeFormAbilityBonuses(character: Character): Partial<Record<AbilityId, number>> {
  const out: Partial<Record<AbilityId, number>> = {};
  for (const [ability, sources] of Object.entries(activeFormAbilityBonusSources(character)) as [
    AbilityId,
    AbilityFormBonusSource[],
  ][]) {
    out[ability] = sources.reduce((sum, s) => sum + s.value, 0);
  }
  return out;
}

/**
 * Construit le contexte d'effets d'un personnage. Les caractéristiques exposées
 * sont EFFECTIVES (cf. `effectiveAbilities`) : les valeurs scalantes (« PV += FOR »)
 * et l'échange de carac des PV (`hpAbilitySwapSources`) s'appuient sur la vraie
 * caractéristique, modificateurs permanents de capacités inclus.
 */
export function effectContext(character: Character): EffectContext {
  return {
    level: character.level,
    abilities: effectiveAbilities(character),
    toggles: character.effectToggles,
    featureChoices: character.featureChoices,
    borrowedHostPaths: borrowedHostPathByFeatureId(character),
    // Fusion PER-323 (grantedFeature.suppressTestBonus) + Bâton magique de l'archimage (PER-74, audit
    // généralisé 2026-08-11) : les deux mécanismes suppriment un `test-bonus` annexe pour des raisons
    // distinctes, mais convergent vers le même Set de consommation (cf. doc du champ ci-dessus).
    suppressedTestBonusFeatureIds: new Set([
      ...suppressedTestBonusFeatureIds(character),
      ...archmageStaffGrantedSpellIds(character),
    ]),
    suppressedStatBonusFeatureIds: archmageStaffGrantedSpellIds(character),
    pathRankCounts: pathRankCountsFromFeatures(character.featureIds),
    armorWorn: isArmorWorn(character.equipment),
    heavyArmorWorn: isHeavyArmorWorn(character.equipment),
    // PER-74 : la prise à une main d'un colosse (Poigne de fer) éteint la condition « à deux mains ».
    twoHandedMeleeWielded: isTwoHandedMeleeWeaponWielded(
      character.equipment,
      oneHandableWeaponFamilies(character.featureIds),
      baseAncestrySize(character.ancestryId) === 'petite',
    ),
    staffWielded: isStaffWielded(character.equipment),
    ridingOptionIds: ridingMountOptionIds(character),
    resolvedElements: resolvedElementsFromFeatures(character),
  };
}

/**
 * Élément de prédilection RÉSOLU de chaque capacité ACQUISE portant un `elementFromChoice` (PER-74),
 * par id de capacité — cf. `EffectContext.resolvedElements`.
 */
function resolvedElementsFromFeatures(character: Character): Partial<Record<string, ResistibleDamageType>> {
  const out: Partial<Record<string, ResistibleDamageType>> = {};
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature?.elementFromChoice) continue;
    const element = resolveFeatureElement(character, feature);
    if (element) out[id] = element.id;
  }
  return out;
}

/**
 * Diviseur du MALUS D'ARMURE apporté par les capacités possédées (effet `armor-penalty-reduction`,
 * PER-236). Ex. Armure sur mesure (`guerre-r1`) : « n'ajoute que la moitié de sa DEF » → diviseur 2.
 * Retient le diviseur le PLUS FAVORABLE (max) parmi les effets présents ; 1 si aucun (malus intact).
 * Fonction pure sur des ids de capacité — l'appelant filtre les capacités actives (armure) en amont.
 */
export function armorPenaltyDivisor(featureIds: string[]): number {
  let divisor = 1;
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const effect of feature.effects) {
      if (effect.kind === 'armor-penalty-reduction' && effect.divisor > divisor) divisor = effect.divisor;
    }
  }
  return divisor;
}

/**
 * Rang le plus élevé atteint dans chaque voie (pathId → rang), d'après les
 * capacités fournies — pour les valeurs scalantes `by: 'path-rank'` (« passe à
 * +2 au rang 5 de la voie »). Les ids inconnus sont ignorés.
 */
export function pathRanksFromFeatures(featureIds: string[]): Record<string, number> {
  const ranks: Record<string, number> = {};
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    ranks[feature.pathId] = Math.max(ranks[feature.pathId] ?? 0, feature.rank);
  }
  return ranks;
}

/**
 * NOMBRE de rangs ACQUIS dans chaque voie (pathId → compte) — pour les valeurs scalantes
 * `scale: 'path-rank-count'` (« RD de 1 par rang de la voie »). Distinct de
 * `pathRanksFromFeatures` (NUMÉRO du rang max) : on COMPTE les capacités acquises, ce qui
 * DIVERGE pour les voies non numérotées à partir de 1 — la voie du familier fantastique
 * (3→7) a 5 rangs mais un rang max de 7. Les ids inconnus sont ignorés.
 */
export function pathRankCountsFromFeatures(featureIds: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    counts[feature.pathId] = (counts[feature.pathId] ?? 0) + 1;
  }
  return counts;
}

/**
 * Maximum EFFECTIF d'un compteur d'usages : constante `max`, rang ATTEINT dans la voie hôte
 * (`maxByPathRank`, PER-119), ou `base` + nombre de capacités ACQUISES de rang `rank` dans une voie
 * de profil des `classIds` (`maxByRankCount`, PER-130 — ex. réserve de rage = 1 + une par capacité de
 * rang 4 de barbare). SOURCE UNIQUE, partagée par la fiche (FeaturesByPath) et la consommation au
 * toggle (page personnage).
 */
export function usageCounterMaximum(
  counter: UsageCounter,
  character: Character,
  feature: Feature,
): number {
  if (counter.maxByPathRank) return pathRanksFromFeatures(character.featureIds)[feature.pathId] ?? 0;
  if (counter.maxByPathRankSteps) {
    // Palier de plus haut `minRank` atteint dans la voie hôte (0 sous le premier palier). PER-159.
    const reached = pathRanksFromFeatures(character.featureIds)[feature.pathId] ?? 0;
    let resolved = 0;
    for (const step of counter.maxByPathRankSteps) if (reached >= step.minRank) resolved = step.max;
    return resolved;
  }
  if (counter.maxByLevel !== undefined) return character.level * counter.maxByLevel;
  if (counter.maxByRankCount) {
    const { classIds, rank, base, addPathRank, excludeHostPath } = counter.maxByRankCount;
    let count = 0;
    for (const id of character.featureIds) {
      const f = featureById.get(id);
      if (!f || f.rank !== rank) continue;
      // PER-73 : « dans une AUTRE voie » → on exclut la voie hôte du comptage.
      if (excludeHostPath && f.pathId === feature.pathId) continue;
      const p = pathById.get(f.pathId);
      if (p?.type === 'class' && p.classIds.some((c) => classIds.includes(c))) count++;
    }
    // PER-73 : terme « une fois par rang acquis dans la voie » → on ajoute le rang de la voie hôte.
    const pathRankTerm = addPathRank ? pathRanksFromFeatures(character.featureIds)[feature.pathId] ?? 0 : 0;
    return base + count + pathRankTerm;
  }
  return counter.max ?? 0;
}

/**
 * Résout une `EffectValue` en nombre. Une valeur scalante a besoin du contexte
 * (et du rang atteint dans la voie hôte) ; sans contexte, seule une constante est
 * résoluble → `null` pour signaler « non résoluble ici ».
 */
export function resolveValue(
  value: EffectValue,
  pathId: string,
  pathRanks: Record<string, number>,
  ctx?: EffectContext,
): number | null {
  if (typeof value === 'number') return value;
  if (!ctx) return null;
  switch (value.scale) {
    case 'ability':
      return ctx.abilities[value.ability] * (value.factor ?? 1);
    case 'level':
      return ctx.level * (value.factor ?? 1);
    case 'path-rank':
      // Rang BRUT atteint dans la voie hôte (0 si absente) — cf. `pathRanks`.
      return (pathRanks[pathId] ?? 0) * (value.factor ?? 1);
    case 'path-rank-count':
      // NOMBRE de rangs acquis dans la voie hôte (0 si absente) — cf. `ctx.pathRankCounts`.
      // Diverge de `path-rank` sur la voie du familier fantastique (numérotée 3→7).
      return (ctx.pathRankCounts?.[pathId] ?? 0) * (value.factor ?? 1);
    case 'min': {
      // Minimum des composants — plafonne une valeur par une autre (ex. min(CHA, rang)).
      let acc: number | null = null;
      for (const part of value.parts) {
        const v = resolveValue(part, pathId, pathRanks, ctx);
        if (v === null) return null;
        acc = acc === null ? v : Math.min(acc, v);
      }
      return acc;
    }
    case 'stepped': {
      // Palier de plus haut seuil atteint (0 sous le premier).
      const ref = value.by === 'level' ? ctx.level : (pathRanks[pathId] ?? 0);
      let resolved = 0;
      for (const step of value.steps) {
        if (ref >= step.min) resolved = step.value;
      }
      return resolved;
    }
    case 'milestone-count': {
      // Paliers de FAMILLE (cross-voie) : `per` par voie de profil (des `classIds`,
      // + la voie du mage si `includeMagePath`) ayant atteint `rank`.
      let count = 0;
      for (const [pid, maxRank] of Object.entries(pathRanks)) {
        if (maxRank < value.rank) continue;
        const path = pathById.get(pid);
        if (!path) continue;
        if (path.type === 'class' && path.classIds.some((c) => value.classIds.includes(c))) count++;
        else if (path.type === 'mage' && value.includeMagePath) count++;
      }
      return count * value.per;
    }
    case 'sum': {
      // Somme des composantes (base plate + palier in-voie + paliers de famille).
      let total = 0;
      for (const part of value.parts) {
        const v = resolveValue(part, pathId, pathRanks, ctx);
        if (v === null) return null;
        total += v;
      }
      return total;
    }
  }
}

/**
 * Un effet conditionnel est-il actif ? L'interrupteur manuel du personnage prime ;
 * à défaut, on retombe sur l'état par défaut déclaré (`activeByDefault`).
 */
function isConditionalActive(
  effect: ConditionalStatBonusEffect,
  featureId: string,
  index: number,
  ctx?: EffectContext,
): boolean {
  // Gating par option de choix de la même capacité (ex. drakonide « Fureur » vs « Ailes ») : si
  // l'option requise n'est PAS retenue, l'effet est inactif quoi qu'il arrive (même déclencheur riding
  // ou état ON résiduel). Miroir, côté `EffectContext`, de `conditionalOptionGateMet`.
  const gate = effect.requiresChoiceOption;
  if (gate) {
    const sel = ctx?.featureChoices?.[featureId]?.[gate.choiceIndex];
    const met = Array.isArray(sel) ? sel.includes(gate.optionId) : sel === gate.optionId;
    if (!met) return false;
  }
  if (ridingForcesActivation(effect, ctx?.ridingOptionIds)) return true;
  // PER-328bis — second déclencheur déduit d'un AUTRE effet (« dans le noir » → « à l'abri du soleil »).
  if (
    linkedFeatureEffectForcesActivation(effect, (fid, i) => {
      const sourceEffect = featureById.get(fid)?.effects?.[i];
      return sourceEffect?.kind === 'conditional-stat-bonus' && isConditionalActive(sourceEffect, fid, i, ctx);
    })
  ) {
    return true;
  }
  const toggled = ctx?.toggles[featureId]?.[index];
  return toggled ?? effect.activation.activeByDefault ?? false;
}

/**
 * PER-74 — l'interrupteur est-il FORCÉ ACTIF par la monture chevauchée ? Second déclencheur DÉDUIT de
 * l'état de jeu (chevalier dragon r4 : « … ou chevauche son drake »), en OU avec l'interrupteur manuel :
 * la monture qualifiante suffit à rendre l'effet actif, sans jamais écrire dans `effectToggles`, si bien
 * que l'état libre du joueur (porter les insignes) garde sa valeur quand il descend de sa monture.
 * Facteur commun aux DEUX portes d'activation — `isConditionalActive` (agrégations à `EffectContext`)
 * et `isEffectActive` (interrogations directes depuis un `Character`).
 */
function ridingForcesActivation(
  effect: ConditionalStatBonusEffect,
  ridingOptionIds: string[] | undefined,
): boolean {
  const required = effect.activation.autoActiveWhenRidingOptionIds;
  if (!required?.length || !ridingOptionIds?.length) return false;
  return ridingOptionIds.some((id) => required.includes(id));
}

/**
 * PER-328bis — l'interrupteur est-il FORCÉ ACTIF par un AUTRE effet (`autoActiveWhenFeatureEffectActive`),
 * lui-même actif ? Même patron OU-À-LA-LECTURE que `ridingForcesActivation`, mais la source est un effet
 * conditionnel quelconque (potentiellement d'une autre capacité) plutôt qu'une monture chevauchée.
 * `isSourceActive` délègue la résolution à l'appelant (`isEffectActive` ou `isConditionalActive`), qui
 * seul sait comment interroger la source dans son propre contexte (`Character` complet vs `EffectContext`).
 * À SENS UNIQUE : ne modifie jamais `effectToggles`, donc n'affecte que la LECTURE — désactiver la
 * source laisse l'interrupteur propre de cet effet reprendre sa valeur (cf. doc du champ, schema.ts).
 */
function linkedFeatureEffectForcesActivation(
  effect: ConditionalStatBonusEffect,
  isSourceActive: (featureId: string, effectIndex: number) => boolean,
): boolean {
  const link = effect.activation.autoActiveWhenFeatureEffectActive;
  if (!link) return false;
  return isSourceActive(link.featureId, link.effectIndex);
}

/**
 * Contributions d'un effet au `mods` : une par (stat, valeur) résoluble. Vide si
 * l'effet ne compte pas (conditionnel inactif) ; un bonus non résoluble (sans
 * contexte) est simplement omis. Un effet conditionnel porte PLUSIEURS bonus
 * pilotés par un seul interrupteur (ex. Familier : +2 Init. et +2 DEF).
 */
function effectContributions(
  effect: FeatureEffect,
  featureId: string,
  pathId: string,
  index: number,
  pathRanks: Record<string, number>,
  ctx?: EffectContext,
): Array<{ stat: DerivedStatId; value: number }> {
  if (effect.kind === 'conditional-stat-bonus') {
    if (!isConditionalActive(effect, featureId, index, ctx)) return [];
    const out: Array<{ stat: DerivedStatId; value: number }> = [];
    for (const b of effect.bonuses) {
      // Gating par ÉLÉMENT RÉSOLU (PER-74) : un bonus PROPRE à une branche, au sein d'un effet
      // partagé par les 4 branches (un seul interrupteur) — cf. `StatBonus.requiresElement`.
      if (b.requiresElement && ctx?.resolvedElements?.[featureId] !== b.requiresElement) continue;
      const v = resolveValue(b.value, pathId, pathRanks, ctx);
      if (v !== null) out.push({ stat: b.stat, value: v });
    }
    return out;
  }
  // Bonus PERMANENT à une stat dérivée dont la VALEUR est la carac CHOISIE sur la capacité (choix
  // `ability`) — ex. Provoquer la chance (elfe pâle r4) : PC += PER ou VOL au choix. Non résoluble
  // sans contexte (caracs effectives inconnues) ni sans sélection.
  if (effect.kind === 'stat-bonus-from-ability-choice') {
    if (!ctx) return [];
    const chosen = ctx.featureChoices?.[featureId]?.[effect.choiceIndex];
    if (typeof chosen !== 'string' || !(ABILITY_IDS as readonly string[]).includes(chosen)) return [];
    const value = ctx.abilities[chosen as AbilityId] * (effect.factor ?? 1);
    return [{ stat: effect.stat, value }];
  }
  // Bonus de DEF conditionné à l'armure RÉELLEMENT portée (PER-132) — résolu automatiquement
  // depuis `ctx.armorWorn`, sans interrupteur manuel. Non résoluble sans contexte (catalogue seul).
  if (effect.kind === 'armor-def-bonus') {
    if (!ctx) return [];
    const branch = ctx.armorWorn ? effect.whenArmored : effect.whenUnarmored;
    const v = resolveValue(branch, pathId, pathRanks, ctx);
    return v === null ? [] : [{ stat: 'def', value: v }];
  }
  // Bonus de DEF conditionné à l'ARMURE LOURDE portée (PER-236, Armure sur mesure) — résolu
  // automatiquement depuis `ctx.heavyArmorWorn`. Non résoluble sans contexte, et nul hors armure lourde.
  if (effect.kind === 'heavy-armor-def-bonus') {
    if (!ctx?.heavyArmorWorn) return [];
    const v = resolveValue(effect.value, pathId, pathRanks, ctx);
    return v === null ? [] : [{ stat: 'def', value: v }];
  }
  // Bonus de DEF conditionné à une arme de CONTACT tenue à DEUX MAINS (PER-74, « Tenir à distance »)
  // — résolu automatiquement depuis `ctx.twoHandedMeleeWielded` (prise réelle comprise), sans
  // interrupteur. Non résoluble sans contexte, et nul sans arme à deux mains en main.
  if (effect.kind === 'two-handed-weapon-def-bonus') {
    if (!ctx?.twoHandedMeleeWielded) return [];
    const v = resolveValue(effect.value, pathId, pathRanks, ctx);
    return v === null ? [] : [{ stat: 'def', value: v }];
  }
  // Bonus de DEF conditionné à un BÂTON tenu en main (PER-74, Sceptre défensif, archimage r4) —
  // résolu automatiquement depuis `ctx.staffWielded`, sans interrupteur. Non résoluble sans
  // contexte, et nul sans bâton en main.
  if (effect.kind === 'staff-def-bonus') {
    if (!ctx?.staffWielded) return [];
    const v = resolveValue(effect.value, pathId, pathRanks, ctx);
    return v === null ? [] : [{ stat: 'def', value: v }];
  }
  // Les genres ciblant une CARACTÉRISTIQUE (`ability-bonus`, `ability-bonus-die`) ne
  // contribuent pas au sac de stats DÉRIVÉES — ils sont agrégés à part (cf. plus bas).
  if (effect.kind !== 'stat-bonus') return [];
  // Bâton magique de l'archimage (PER-74, R5, p. 154) : le bonus permanent d'un sort emprunté au
  // bâton (« en plus de ce sort, gagne... ») ne se mécanise pas — seul le sort lui-même est lié.
  if (ctx?.suppressedStatBonusFeatureIds?.has(featureId)) return [];
  const value = resolveValue(effect.value, pathId, pathRanks, ctx);
  return value === null ? [] : [{ stat: effect.stat, value }];
}

/**
 * Somme les bonus des capacités acquises en un `DerivedMods`. Les ids inconnus et
 * les capacités sans `effects` sont ignorés. N'interprète jamais le `text`.
 *
 * Sans `ctx` : seuls les bonus PLATS CONSTANTS comptent (les valeurs scalantes et
 * les effets conditionnels sont ignorés — ils exigent le contexte du personnage).
 * Avec `ctx` : les valeurs scalantes sont résolues et les effets conditionnels
 * actifs (interrupteur ou défaut) sont inclus.
 */
export function modsFromFeatures(featureIds: string[], ctx?: EffectContext): DerivedMods {
  const mods: DerivedMods = {};
  const pathRanks = pathRanksFromFeatures(featureIds);
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    // Capacité empruntée : son `rang`/ses paliers `by: 'path-rank'` se résolvent contre la VOIE A
    // (encadré « Appel à une autre capacité »), pas contre sa voie d'origine absente du personnage.
    const rankPathId = ctx?.borrowedHostPaths?.get(id) ?? feature.pathId;
    feature.effects.forEach((effect, i) => {
      for (const c of effectContributions(effect, id, rankPathId, i, pathRanks, ctx)) {
        mods[c.stat] = (mods[c.stat] ?? 0) + c.value;
      }
    });
  }
  // Échange de caractéristique pour les PV piloté par un choix (ex. Grosse tête) :
  // s'agrège au modificateur `maxHp` au même titre qu'un bonus de capacité.
  for (const s of hpAbilitySwapSources(featureIds, ctx)) {
    mods.maxHp = (mods.maxHp ?? 0) + s.value;
  }
  // Bonus de stats dérivées pilotés par une OPTION retenue (ex. Éclaireur : +1 DR / −1 PC).
  for (const { stat, source } of optionStatBonusSources(featureIds, ctx)) {
    mods[stat] = (mods[stat] ?? 0) + source.value;
  }
  return mods;
}

/**
 * Bonus de stats DÉRIVÉES octroyés par les OPTIONS retenues (champ
 * `FeatureChoiceOption.statBonuses`, PER-111). Ex. Éclaireur (traqueur-r1) : option « +1 DR au
 * lieu du +1 PC de famille » → `recoveryDiceCount +1`, `luckPoints −1`. Lit les options retenues
 * (`ctx.featureChoices`, aligné par position sur `Feature.choices`) ; gère le choix simple (id
 * unique) comme le répétable (tableau d'ids). Sans `ctx`/sans choix : rien. Résout les valeurs
 * scalantes ; une contribution nulle est omise (pas de terme « +0 » parasite).
 */
export function optionStatBonusSources(
  featureIds: string[],
  ctx?: EffectContext,
): Array<{ stat: DerivedStatId; source: FeatureModSource }> {
  if (!ctx?.featureChoices) return [];
  const out: Array<{ stat: DerivedStatId; source: FeatureModSource }> = [];
  const pathRanks = pathRanksFromFeatures(featureIds);
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.choices) continue;
    const selections = ctx.featureChoices[id] ?? [];
    feature.choices.forEach((choice, i) => {
      if (choice.kind !== 'option') return;
      const sel = selections[i];
      const chosenIds = Array.isArray(sel) ? sel : typeof sel === 'string' ? [sel] : [];
      for (const optId of chosenIds) {
        const option = choice.options.find((o) => o.id === optId);
        if (!option?.statBonuses) continue;
        for (const b of option.statBonuses) {
          const value = resolveValue(b.value, feature.pathId, pathRanks, ctx);
          if (value !== null && value !== 0) {
            out.push({ stat: b.stat, source: { featureId: id, name: feature.name, value } });
          }
        }
      }
    });
  }
  return out;
}

/**
 * Caractéristique servant de base au calcul de la DEF (PER-131). Par défaut l'AGI (p. 31) ;
 * une OPTION retenue peut la remplacer via son champ `defAbility` (ex. Peau de pierre du
 * barbare, pagne-r2 : option « con-for-def » → CON au lieu de l'AGI, p. 80). On renvoie la
 * caractéristique de substitution du premier choix qui en déclare une, sinon l'AGI. Le plafond
 * d'armure s'applique ensuite à la caractéristique retenue (côté `defense`). Sans `ctx`/sans
 * choix (catalogue seul), on retombe sur l'AGI. Lit les options retenues (`ctx.featureChoices`,
 * aligné par position sur `Feature.choices`) ; gère le choix simple comme le répétable.
 */
export function defenseAbility(featureIds: string[], ctx?: EffectContext): AbilityId {
  if (!ctx?.featureChoices) return 'AGI';
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.choices) continue;
    const selections = ctx.featureChoices[id] ?? [];
    for (let i = 0; i < feature.choices.length; i++) {
      const choice = feature.choices[i];
      if (choice.kind !== 'option') continue;
      const sel = selections[i];
      const chosenIds = Array.isArray(sel) ? sel : typeof sel === 'string' ? [sel] : [];
      for (const optId of chosenIds) {
        const option = choice.options.find((o) => o.id === optId);
        if (option?.defAbility) return option.defAbility;
      }
    }
  }
  return 'AGI';
}

/**
 * Caractéristique servant de BASE au calcul des PM. Par défaut la VOL ; une capacité
 * `mana-ability-override` (ex. Charisme héroïque : « CHA au lieu de la VOL ») permet
 * d'utiliser une autre caractéristique si elle est STRICTEMENT plus avantageuse (choix
 * systématique du joueur). On renvoie la carac retenue et, si elle remplace la VOL, le
 * nom de la capacité source (pour le détail des PM). La réserve se calcule alors sur
 * cette carac (et non par un bonus ajouté à la VOL) — d'où un détail « Charisme (CHA) »
 * au lieu de « Volonté + bonus ».
 */
export function manaCastingAbility(
  featureIds: string[],
  abilities: Record<AbilityId, number>,
): { ability: AbilityId; source?: string } {
  let best: AbilityId = 'VOL';
  let source: string | undefined;
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind !== 'mana-ability-override') continue;
      if (abilities[e.ability] > abilities[best]) {
        best = e.ability;
        source = feature.name;
      }
    }
  }
  return best === 'VOL' ? { ability: 'VOL' } : { ability: best, source };
}

/**
 * Le personnage est-il LANCEUR DE SORTS (a-t-il une réserve de PM) ? Vrai dès qu'il possède au moins
 * un sort connu qui alimente le réservoir — même critère que `spellCount` (`manaPoints` renvoie null
 * quand il vaut 0). Les sorts SANS +1 PM (octrois fixes `noMana` du cambion, ou sort emprunté
 * `noManaCost` de « Sang féerique ») sont exclus : un non-lanceur qui prend « Sang féerique » ne devient
 * PAS lanceur pour autant. Sert à trancher, pour ce sort, entre le mode « incantations gratuites
 * uniquement » (non-lanceur) et le mode « peut aussi dépenser des PM » (lanceur), p. 10.
 */
export function isSpellcaster(character: Character): boolean {
  const noMana = new Set<string>([
    ...grantedNoManaFeatureIds(character),
    ...borrowedNoManaFeatureIds(character),
  ]);
  const ids = [
    ...character.featureIds,
    ...borrowedFeatureIds(character),
    ...grantedFeatureIds(character),
  ];
  return ids.some((id) => !noMana.has(id) && featureById.get(id)?.isSpell === true);
}

/**
 * Échange de caractéristique pour les PV octroyé par une OPTION retenue (champ
 * `hpFromAbility`). La règle (ex. Grosse tête, golem-r1, p. 100) remplace la
 * contribution de CON d'UN niveau par celle d'une autre caractéristique. Comme la
 * CON s'applique uniformément et rétroactivement à chaque niveau (cf. `maxHp`),
 * l'effet net est CONSTANT quel que soit le niveau de la prise : `+(carac − CON)`,
 * appliqué une seule fois — d'où l'absence d'historique du niveau de prise.
 *
 * Lit les options retenues (`ctx.featureChoices`, aligné par position sur
 * `Feature.choices`). Sans `ctx` (catalogue seul) ou sans choix : aucune source
 * (la valeur dépend des caractéristiques courantes et du choix du joueur). Un
 * échange net nul (carac = CON) est omis pour ne pas afficher de terme « +0 ».
 */
export function hpAbilitySwapSources(
  featureIds: string[],
  ctx?: EffectContext,
): FeatureModSource[] {
  if (!ctx?.featureChoices) return [];
  const out: FeatureModSource[] = [];
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.choices) continue;
    const selections = ctx.featureChoices[id] ?? [];
    feature.choices.forEach((choice, i) => {
      if (choice.kind !== 'option') return;
      const sel = selections[i];
      const chosenIds = Array.isArray(sel) ? sel : sel ? [sel] : [];
      for (const opt of choice.options) {
        if (!opt.hpFromAbility || !chosenIds.includes(opt.id)) continue;
        const delta = ctx.abilities[opt.hpFromAbility] - ctx.abilities.CON;
        if (delta !== 0) out.push({ featureId: id, name: feature.name, value: delta });
      }
    });
  }
  return out;
}

/** Contribution d'une capacité précise à un modificateur de stat dérivée. */
export interface FeatureModSource {
  featureId: string;
  /** Nom de la capacité (français), pour le détail affiché au joueur. */
  name: string;
  value: number;
  /** Effet conditionnel / temporaire (vs bonus permanent) ? Pour le détail UI. */
  conditional?: boolean;
}

/**
 * Détaille, par stat dérivée, QUELLES capacités apportent le modificateur (et
 * combien). Même balayage que `modsFromFeatures` (et mêmes règles de contexte) —
 * sert à afficher l'inventaire sous la ligne « Capacités / divers » du détail.
 */
export function featureModSources(
  featureIds: string[],
  ctx?: EffectContext,
): Partial<Record<DerivedStatId, FeatureModSource[]>> {
  const sources: Partial<Record<DerivedStatId, FeatureModSource[]>> = {};
  const pathRanks = pathRanksFromFeatures(featureIds);
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    feature.effects.forEach((effect, i) => {
      for (const c of effectContributions(effect, id, feature.pathId, i, pathRanks, ctx)) {
        (sources[c.stat] ??= []).push({
          featureId: id,
          name: feature.name,
          value: c.value,
          conditional: effect.kind === 'conditional-stat-bonus',
        });
      }
    });
  }
  // Même source que `modsFromFeatures` pour l'échange de carac des PV : détaillé
  // sous « Capacités / divers » des PV (le total de la ligne vient de `mods.maxHp`).
  for (const s of hpAbilitySwapSources(featureIds, ctx)) {
    (sources.maxHp ??= []).push(s);
  }
  // Bonus de stats dérivées pilotés par une option retenue (ex. Éclaireur : +1 DR / −1 PC).
  for (const { stat, source } of optionStatBonusSources(featureIds, ctx)) {
    (sources[stat] ??= []).push(source);
  }
  return sources;
}

// ---------------------------------------------------------------------------
// Interrupteurs des effets conditionnels (PER-67) — lecture / écriture
// ---------------------------------------------------------------------------

/** Un effet conditionnel d'une capacité, avec sa position dans `Feature.effects`. */
export interface ConditionalEffectEntry {
  index: number;
  effect: ConditionalStatBonusEffect;
}

/**
 * Effets conditionnels / temporaires portés par une capacité (vide si aucune /
 * id inconnu), avec leur index d'origine dans `Feature.effects` — clé
 * d'alignement avec `Character.effectToggles`.
 */
export function conditionalEffectsOf(featureId: string): ConditionalEffectEntry[] {
  const effects = featureById.get(featureId)?.effects ?? [];
  const entries: ConditionalEffectEntry[] = [];
  effects.forEach((effect, index) => {
    if (effect.kind === 'conditional-stat-bonus') entries.push({ index, effect });
  });
  return entries;
}

/** Un bonus d'effet conditionnel, résolu à sa valeur courante pour l'affichage. */
export interface ResolvedConditionalBonus {
  stat: DerivedStatId;
  value: number;
}

/**
 * Bonus COURANTS (résolus) d'un effet conditionnel d'une capacité pour ce
 * personnage — pour l'affichage de l'interrupteur (ex. « −2 DEF », « +2 Init., +2
 * DEF »). Résout les valeurs scalantes (caractéristique, niveau, rang, paliers de
 * famille). `null` si l'index ne pointe pas un effet conditionnel connu.
 */
export function conditionalEffectBonuses(
  character: Character,
  featureId: string,
  index: number,
): ResolvedConditionalBonus[] | null {
  const feature = featureById.get(featureId);
  const effect = feature?.effects?.[index];
  if (!feature || !effect || effect.kind !== 'conditional-stat-bonus') return null;
  const pathRanks = pathRanksFromFeatures(character.featureIds);
  const ctx = effectContext(character);
  // Gating par ÉLÉMENT RÉSOLU (PER-74) : un bonus propre à une seule branche d'une capacité à
  // interrupteur partagé (élémentaliste r8) ne doit apparaître dans le libellé de l'interrupteur
  // QUE pour la branche retenue — cf. `StatBonus.requiresElement` / `effectContributions`.
  const bonuses = effect.bonuses.filter(
    (b) => !b.requiresElement || resolveFeatureElement(character, feature)?.id === b.requiresElement,
  );
  return bonuses.map((b) => ({
    stat: b.stat,
    value: resolveValue(b.value, feature.pathId, pathRanks, ctx) ?? 0,
  }));
}

/**
 * Domaines de test bénéficiant d'un DÉ BONUS CONDITIONNEL actuellement ACTIF (champ
 * `ConditionalStatBonusEffect.testDieDomains`, PER-108). Ex. Travail d'équipe (rôdeur,
 * compagnon-animal-r2) : tant que l'interrupteur « le loup au contact » est actif, les tests
 * pour pister et de vigilance gagnent un dé bonus. Renvoie une map domaine → nom(s) de
 * capacité(s) source(s), pour le badge double-d20 de l'encadré « Compétences & tests ».
 */
export function activeConditionalTestDice(character: Character): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    feature.effects.forEach((effect, i) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.testDieDomains?.length) return;
      if (!isEffectActive(character, id, i)) return;
      for (const d of effect.testDieDomains) {
        const arr = out.get(d) ?? [];
        arr.push(feature.name);
        out.set(d, arr);
      }
    });
  }
  return out;
}

/**
 * Dés bonus PERMANENTS par domaine de test (genre `test-die`, ex. L'amour du risque r6 sur
 * « Résister à la peur »). Map domaine → noms des capacités sources. TOUJOURS inclus (aucun
 * interrupteur) ; à FUSIONNER avec `activeConditionalTestDice` pour l'affichage des lignes de
 * « Compétences & tests » (même rendu `BonusDieBadge` par domaine).
 */
export function permanentTestDieDomains(featureIds: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const effect of feature.effects) {
      if (effect.kind !== 'test-die') continue;
      for (const d of effect.domains) {
        out.set(d, [...(out.get(d) ?? []), feature.name]);
      }
    }
  }
  return out;
}

/** Une capacité qui ajoute un bonus à TOUS les tests de caractéristique (conditionnel). */
export interface AbilityTestBonusSource {
  featureId: string;
  /** Nom de la capacité (français), pour le détail affiché. */
  name: string;
  value: number;
  /**
   * Bonus de **MAGIE** (PER-134) et non de compétence : il ne se cumule pas avec le bonus de
   * magie d'un objet magique sur le même test (on retient le meilleur — note des Tatouages,
   * p. 80). Ces sources sont arbitrées par `resolveTestBonus` et NE DOIVENT PAS être
   * additionnées librement : cf. `freelyStackingAbilityTestBonuses`. Absent = bonus ordinaire,
   * cumulable.
   */
  magic?: boolean;
}

/**
 * Bonus COURANTS à TOUS les tests de caractéristique (PER-89), apportés par les
 * effets `conditional-stat-bonus` ACTIFS qui portent un `abilityTestBonus` (ex.
 * Bénédiction, prêtre, priere-r1). Le bonus s'applique uniformément aux 7
 * caractéristiques : il ne modifie PAS leur valeur (donc ni PV, ni DEF, ni les
 * formules), seulement le jet « d20 + carac » d'un test. Sans `ctx`, les effets
 * conditionnels et les valeurs scalantes sont ignorés (appels « catalogue seul »).
 */
export function abilityTestBonusSources(
  featureIds: string[],
  ctx?: EffectContext,
): AbilityTestBonusSource[] {
  const pathRanks = pathRanksFromFeatures(featureIds);
  const out: AbilityTestBonusSource[] = [];
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    feature.effects.forEach((effect, i) => {
      if (effect.kind !== 'conditional-stat-bonus' || effect.abilityTestBonus === undefined) return;
      if (!isConditionalActive(effect, id, i, ctx)) return;
      const v = resolveValue(effect.abilityTestBonus, feature.pathId, pathRanks, ctx);
      if (v !== null && v !== 0) out.push({ featureId: id, name: feature.name, value: v });
    });
  }
  return out;
}

/**
 * Bonus CHIFFRÉS aux tests d'UNE caractéristique précise (PER-125), octroyés par les OPTIONS
 * retenues (`FeatureChoiceOption.abilityTestBonus`, ex. Tatouages/barbare pagne-r3 : Taureau →
 * +3 aux tests de FOR), regroupés par caractéristique cible. À DISTINGUER de
 * `abilityTestBonusSources` (buff UNIFORME à TOUTES les caracs, ex. Bénédiction) : ici le bonus
 * vise UNE carac. Lit les options retenues (`ctx.featureChoices`, aligné par position) ; gère le
 * choix simple comme le répétable. Sans `ctx`/sans choix : rien.
 *
 * Les sources marquées `magic` (Tatouages) sont rendues telles quelles ici, mais elles obéissent
 * à un non-cumul (PER-134) : ne les additionner qu'à travers `resolveTestBonus`, jamais
 * directement — cf. `freelyStackingAbilityTestBonuses`.
 */
export function abilityTestBonusByAbility(
  featureIds: string[],
  ctx?: EffectContext,
): Partial<Record<AbilityId, AbilityTestBonusSource[]>> {
  const out: Partial<Record<AbilityId, AbilityTestBonusSource[]>> = {};
  const pathRanks = pathRanksFromFeatures(featureIds);
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    // (a) Options retenues (Tatouages, PER-125) — nécessite les choix du personnage.
    if (ctx?.featureChoices && feature.choices) {
      const selections = ctx.featureChoices[id] ?? [];
      feature.choices.forEach((choice, i) => {
        if (choice.kind !== 'option') return;
        const sel = selections[i];
        const chosenIds = Array.isArray(sel) ? sel : typeof sel === 'string' ? [sel] : [];
        for (const optId of chosenIds) {
          const option = choice.options.find((o) => o.id === optId);
          if (!option?.abilityTestBonus || option.abilityTestBonus.value === 0) continue;
          const { ability, value, magic } = option.abilityTestBonus;
          (out[ability] ??= []).push({
            featureId: id,
            name: feature.name,
            value,
            ...(magic ? { magic: true } : {}),
          });
        }
      });
    }
    // (b) Bonus CONDITIONNEL à UNE carac, piloté par un interrupteur actif (PER-137) — ex. Prescience
    // (divination-r5) : « +10 à tous les tests de PER » tant que la vision est active.
    feature.effects?.forEach((effect, i) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.abilityTestBonusFor) return;
      if (!isConditionalActive(effect, id, i, ctx)) return;
      const v = resolveValue(effect.abilityTestBonusFor.value, feature.pathId, pathRanks, ctx);
      if (v !== null && v !== 0)
        (out[effect.abilityTestBonusFor.ability] ??= []).push({ featureId: id, name: feature.name, value: v });
    });
  }
  return out;
}

/**
 * Bonus aux tests de carac (résolu) d'un effet conditionnel d'une capacité, pour
 * le libellé de son interrupteur (ex. « +1 tests de carac »). `null` si l'index ne
 * pointe pas un effet conditionnel connu ou si l'effet ne touche pas les tests de
 * carac.
 */
export function conditionalAbilityTestBonus(
  character: Character,
  featureId: string,
  index: number,
): number | null {
  const feature = featureById.get(featureId);
  const effect = feature?.effects?.[index];
  if (!feature || effect?.kind !== 'conditional-stat-bonus' || effect.abilityTestBonus === undefined)
    return null;
  const pathRanks = pathRanksFromFeatures(character.featureIds);
  return resolveValue(effect.abilityTestBonus, feature.pathId, pathRanks, effectContext(character));
}

/**
 * L'option requise par `requiresChoiceOption` d'un effet conditionnel est-elle retenue ? Renvoie true
 * s'il n'y a pas de gating. Le choix visé est porté par la MÊME capacité (`featureId`) : on lit
 * directement sa sélection dans `Character.featureChoices` (`string | string[] | null`). Partagé par
 * `isEffectActive` (moteur) et le filtrage des interrupteurs affichés (`FeatureEffectToggles`).
 */
export function conditionalOptionGateMet(
  character: Character,
  featureId: string,
  effect: ConditionalStatBonusEffect,
): boolean {
  const gate = effect.requiresChoiceOption;
  if (!gate) return true;
  const sel = character.featureChoices?.[featureId]?.[gate.choiceIndex];
  return Array.isArray(sel) ? sel.includes(gate.optionId) : sel === gate.optionId;
}

/** L'interrupteur du i-ème effet d'une capacité est-il actif pour ce personnage ? */
export function isEffectActive(character: Character, featureId: string, index: number): boolean {
  const effects = featureById.get(featureId)?.effects;
  const effect = effects?.[index];
  if (!effect || effect.kind !== 'conditional-stat-bonus') return false;
  // Gating par option de choix de la même capacité (ex. drakonide « Fureur » vs « Ailes ») : si
  // l'option requise n'est PAS retenue, l'effet est inactif quoi qu'il arrive (même si un ancien état
  // ON traîne dans `effectToggles`). Prioritaire sur toute (ré)activation, y compris `riding`.
  if (!conditionalOptionGateMet(character, featureId, effect)) return false;
  // PER-74 — second déclencheur déduit de l'état de jeu (« … ou chevauche son drake »).
  if (ridingForcesActivation(effect, ridingMountOptionIds(character))) return true;
  // PER-328bis — second déclencheur déduit d'un AUTRE effet (« dans le noir » → « à l'abri du soleil »).
  if (linkedFeatureEffectForcesActivation(effect, (fid, i) => isEffectActive(character, fid, i))) return true;
  // PER-375/PER-435 — interrupteur DÉRIVÉ d'une saisie choisie (Forme animale) : ni manuel ni forcé par
  // un AUTRE effet, sa valeur EST la présence de la saisie, `effectToggles` n'entre jamais en jeu.
  if (effect.activation.activeWhenInputSet) {
    return Boolean(character.effectInputs?.[effect.activation.activeWhenInputSet]);
  }
  const toggled = character.effectToggles[featureId]?.[index];
  return toggled ?? effect.activation.activeByDefault ?? false;
}

/** Au moins un des effets conditionnels de la capacité est-il actif (interrupteur ON) ? */
export function hasActiveConditionalEffect(character: Character, featureId: string): boolean {
  return conditionalEffectsOf(featureId).some(({ index }) => isEffectActive(character, featureId, index));
}

/**
 * PER-161 — éteint tous les interrupteurs d'effets TEMPORAIRES actifs (états de durée / combat :
 * Sanctuaire, Rage, Armure de pierre…), en préservant les effets CONDITIONNELS (`activation.kind:
 * 'condition'`, ex. « une arme dans chaque main ») qui décrivent une situation, pas une durée. Appelé
 * par tout repos (court/long), qui met fin aux états transitoires. Fonction pure : renvoie une copie.
 */
export function clearTemporaryEffectToggles(character: Character): Record<string, boolean[]> {
  const toggles = character.effectToggles ?? {};
  const next: Record<string, boolean[]> = { ...toggles };
  for (const featureId of character.featureIds) {
    const effects = featureById.get(featureId)?.effects;
    if (!effects) continue;
    effects.forEach((effect, index) => {
      if (effect.kind !== 'conditional-stat-bonus' || effect.activation.kind !== 'temporary') return;
      const active = toggles[featureId]?.[index] ?? effect.activation.activeByDefault ?? false;
      if (!active) return;
      const arr = [...(next[featureId] ?? [])];
      while (arr.length <= index) arr.push(false);
      arr[index] = false;
      next[featureId] = arr;
    });
  }
  return next;
}

/**
 * PER-164 — purge les saisies libres (`effectInputs`) ORPHELINES qu'un repos laisserait derrière lui.
 * Quand un repos éteint l'interrupteur d'un effet TEMPORAIRE actif (via `clearTemporaryEffectToggles`),
 * la saisie libre corrélée à la MÊME capacité (ex. l'animal de Forme animale / `animaux-r5`) doit être
 * effacée aussi — sinon on retrouve au réveil l'ancien animal alors que l'effet n'est plus actif. Ne
 * touche QUE les capacités dont un interrupteur temporaire était effectivement actif ; les saisies
 * d'effets SITUATIONNELS sans interrupteur temporaire (ex. élément résisté de Maîtrise des éléments — le
 * sélecteur tient lieu d'activation, non éteint par un repos) sont PRÉSERVÉES. Même critère « temporaire
 * & actif » que `clearTemporaryEffectToggles`, pour rester en phase. Fonction pure : renvoie une copie.
 */
export function clearTemporaryEffectInputs(character: Character): Record<string, string> {
  const inputs = character.effectInputs ?? {};
  const toggles = character.effectToggles ?? {};
  const next: Record<string, string> = { ...inputs };
  for (const featureId of character.featureIds) {
    if (next[featureId] === undefined) continue;
    const effects = featureById.get(featureId)?.effects;
    if (!effects) continue;
    const hadActiveTemporary = effects.some((effect, index) => {
      if (effect.kind !== 'conditional-stat-bonus' || effect.activation.kind !== 'temporary') return false;
      return toggles[featureId]?.[index] ?? effect.activation.activeByDefault ?? false;
    });
    if (hadActiveTemporary) delete next[featureId];
  }
  return next;
}

/**
 * Fixe l'interrupteur du i-ème effet d'une capacité à `active` DANS un dictionnaire
 * d'interrupteurs (le tableau est complété par des `false` jusqu'à l'index visé).
 * Fonction pure : renvoie une nouvelle copie, n'en mute aucune. Brique partagée par
 * `setEffectToggle` (depuis un personnage) et la cascade d'exclusion.
 */
function setToggleIn(
  toggles: Record<string, boolean[]>,
  featureId: string,
  index: number,
  active: boolean,
): Record<string, boolean[]> {
  const next = { ...toggles };
  const current = next[featureId] ? next[featureId].slice() : [];
  while (current.length <= index) current.push(false);
  current[index] = active;
  next[featureId] = current;
  return next;
}

/**
 * Renvoie une copie de `effectToggles` avec l'interrupteur du i-ème effet d'une
 * capacité fixé à `active`. Le tableau est complété par des `false` si besoin
 * pour atteindre l'index visé. Fonction pure (ne mute pas le personnage).
 *
 * Applique l'EXCLUSION MUTUELLE : ACTIVER un interrupteur qui déclare
 * `disablesFeatures` éteint au passage TOUS les interrupteurs des capacités qu'il
 * désactive (sécurité redondante — l'UI empêche déjà de les rallumer ; la situation
 * « les deux actifs » ne devrait jamais survenir).
 */
export function setEffectToggle(
  character: Character,
  featureId: string,
  index: number,
  active: boolean,
): Record<string, boolean[]> {
  let next = setToggleIn(character.effectToggles, featureId, index, active);
  const ownEffects = featureById.get(featureId)?.effects ?? [];
  if (!active) {
    // Cascade de DÉSACTIVATION intra-capacité, À SENS UNIQUE (PER-109) : éteindre cet effet éteint
    // aussi ceux qui en dépendent (`deactivatesWithEffectIndex`). Ex. Parade croisée : couper
    // « une arme dans chaque main » coupe « bonus doublé », pas l'inverse.
    ownEffects.forEach((e, ei) => {
      if (e.kind === 'conditional-stat-bonus' && e.deactivatesWithEffectIndex === index) {
        next = setToggleIn(next, featureId, ei, false);
      }
    });
    return next;
  }
  const effect = ownEffects[index];
  if (effect?.kind !== 'conditional-stat-bonus') return next;
  // ACTIVER éteint les interrupteurs des capacités exclues. Deux familles, MÊME cascade d'extinction :
  //  - `disablesFeatures` : exclusion mutuelle AVEC désactivation/grisage (cf. disabledFeatureReasons) ;
  //  - `mutuallyExclusiveWith` (PER-130) : simple basculement ON/OFF, SANS désactiver (Rage ↔ Furie).
  const turnOffTargets = [...(effect.disablesFeatures ?? []), ...(effect.mutuallyExclusiveWith ?? [])];
  for (const targetId of turnOffTargets) {
    const targetEffects = featureById.get(targetId)?.effects ?? [];
    targetEffects.forEach((te, ti) => {
      if (te.kind === 'conditional-stat-bonus') next = setToggleIn(next, targetId, ti, false);
    });
  }
  return next;
}

/**
 * Pourquoi une capacité est grisée. `excluded` : exclusion mutuelle conditionnelle —
 * un interrupteur ACTIF d'une autre capacité la désactive (« ne se cumule pas avec X »).
 * `replaced` : remplacement INCONDITIONNEL — une capacité acquise la supplante dès
 * l'acquisition (Grand félin remplace Panthère). `byFeatureId`/`byFeatureName` : la
 * capacité source (pour le message d'UI).
 */
export interface DisabledFeatureReason {
  byFeatureId: string;
  byFeatureName: string;
  kind: 'excluded' | 'replaced' | 'transformed' | 'borrow-inactive';
  /**
   * Message d'UI DÉDIÉ, quand le libellé générique du `kind` ne convient pas (PER-328 : un emprunt
   * désactivé « en plein soleil » n'est pas une exclusion mutuelle classique). Prioritaire sur le
   * message déduit du `kind`. Absent = message générique.
   */
  note?: string;
}

/**
 * Capacités actuellement grisées, avec LA RAISON (source + nature) — pour le grisage
 * et le message d'UI. Deux origines :
 *  - EXCLUSION MUTUELLE (`disablesFeatures`) : un interrupteur ACTIF d'une capacité
 *    acquise désactive la cible (« ne se cumule pas avec X »).
 *  - REMPLACEMENT (`replacesFeatures`) : une capacité acquise en supplante une autre
 *    dès l'acquisition, sans interrupteur (Grand félin/fauve-r4 → Panthère/fauve-r2).
 * Le remplacement prime sur l'exclusion pour le message (cause structurelle, pas un
 * état transitoire). Une cible peut être visée par plusieurs sources → première gagne.
 */
export function disabledFeatureReasons(character: Character): Map<string, DisabledFeatureReason> {
  const reasons = new Map<string, DisabledFeatureReason>();
  // 1) Exclusions par interrupteur actif.
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    feature?.effects?.forEach((effect, index) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.disablesFeatures) return;
      if (!isEffectActive(character, id, index)) return;
      for (const targetId of effect.disablesFeatures) {
        if (!reasons.has(targetId)) {
          reasons.set(targetId, { byFeatureId: id, byFeatureName: feature?.name ?? id, kind: 'excluded' });
        }
      }
    });
  }
  // 1bis) Transformation active qui prive des capacités de PROFIL (PER-74, Métamorphose de l'ours).
  for (const [targetId, source] of profileFeaturesDisabledByTransformation(character)) {
    if (!reasons.has(targetId)) reasons.set(targetId, { ...source, kind: 'transformed' });
  }
  // 2) Remplacements inconditionnels (priment sur l'exclusion) : la cible doit être acquise.
  const owned = new Set(character.featureIds);
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature?.replacesFeatures) continue;
    for (const targetId of feature.replacesFeatures) {
      if (!owned.has(targetId)) continue;
      reasons.set(targetId, { byFeatureId: id, byFeatureName: feature.name, kind: 'replaced' });
    }
  }
  // 3) PER-328 — emprunts (`feature-from-path`) désactivés tant que l'interrupteur d'autorisation de
  // leur capacité hôte est ÉTEINT (« Lames et sorcellerie » : inutilisables en plein soleil).
  for (const [targetId, reason] of borrowedFeaturesDisabledByInactiveToggle(character)) {
    if (!reasons.has(targetId)) reasons.set(targetId, reason);
  }
  // 4) PER-370 (retour propriétaire 2026-08-15) — sorts associés à l'armure sacrée (r5/r7) désactivés
  // tant que l'armure n'est pas déployée (interrupteur porté par un AUTRE hôte, r4/r6/r8).
  for (const [targetId, reason] of armureSacreeBorrowedFeaturesDisabledWhenStowed(character)) {
    if (!reasons.has(targetId)) reasons.set(targetId, reason);
  }
  return reasons;
}

/**
 * PER-328 (elfe des profondeurs r2 « Lames et sorcellerie », p. 17) — capacités EMPRUNTÉES via un choix
 * `feature-from-path` désactivées tant qu'un interrupteur `disablesBorrowedWhenInactive` de leur capacité
 * HÔTE est INACTIF (« il n'est pas capable d'utiliser ces capacités en plein soleil » → interrupteur
 * « À l'abri du plein soleil » décoché). Retourne, par id d'emprunt désactivé, la raison affichable
 * (source = capacité hôte, message dédié). Vide si aucun hôte flaggé n'a d'interrupteur éteint. Consommé
 * par `disabledFeatureReasons` (grisage + message) ET par `activeFeatureIdsForMods` (effets non comptés).
 */
export function borrowedFeaturesDisabledByInactiveToggle(
  character: Character,
): Map<string, DisabledFeatureReason> {
  const out = new Map<string, DisabledFeatureReason>();
  for (const hostId of character.featureIds) {
    const host = featureById.get(hostId);
    if (!host?.effects) continue;
    const gatingIndex = host.effects.findIndex(
      (e) => e.kind === 'conditional-stat-bonus' && e.disablesBorrowedWhenInactive,
    );
    if (gatingIndex < 0) continue;
    if (isEffectActive(character, hostId, gatingIndex)) continue; // interrupteur ON → emprunts autorisés
    const effect = host.effects[gatingIndex] as ConditionalStatBonusEffect;
    const selections = character.featureChoices?.[hostId] ?? [];
    host.choices?.forEach((def, i) => {
      if (def.kind !== 'feature-from-path') return;
      const sel = selections[i];
      if (typeof sel !== 'string' || !featureById.has(sel)) return;
      if (out.has(sel)) return;
      out.set(sel, {
        byFeatureId: hostId,
        byFeatureName: host.name,
        kind: 'borrow-inactive',
        note: `Désactivée tant que « ${effect.activation.label} » n'est pas activé sur ${host.name} : cette capacité empruntée est inutilisable en plein soleil.`,
      });
    });
  }
  return out;
}

/**
 * PER-74 — ids des capacités de voie de PROFIL (`Path.type === 'class'`) désactivées par une
 * transformation ACTIVE dont l'effet porte `disablesProfileFeatures` (Métamorphose, voie de l'ours
 * p. 152 : « ne peut plus utiliser ses capacités de profil »). À DISTINGUER de `disablesFeatures`
 * (liste explicite) : ici la cible est TOUTE voie de type 'class' possédée, découverte dynamiquement
 * — les voies d'ascendance et de prestige ne sont jamais visées. Retourne l'id/nom de la capacité
 * SOURCE (la transformation) par cible, pour le message d'UI. Vide si aucune transformation active
 * ne porte ce drapeau.
 */
export function profileFeaturesDisabledByTransformation(
  character: Character,
): Map<string, { byFeatureId: string; byFeatureName: string }> {
  const disabled = new Map<string, { byFeatureId: string; byFeatureName: string }>();
  const sources: { byFeatureId: string; byFeatureName: string; exceptPathIds: Set<string> }[] = [];
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    feature?.effects?.forEach((effect, index) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.disablesProfileFeatures) return;
      if (!isEffectActive(character, id, index)) return;
      const spec = effect.disablesProfileFeatures;
      const exceptPathIds = new Set(spec === true ? [] : spec.exceptPathIds);
      sources.push({ byFeatureId: id, byFeatureName: feature?.name ?? id, exceptPathIds });
    });
  }
  if (!sources.length) return disabled;
  for (const targetId of character.featureIds) {
    const targetFeature = featureById.get(targetId);
    if (!targetFeature) continue;
    if (pathById.get(targetFeature.pathId)?.type !== 'class') continue;
    // Une source dont la liste d'exceptions COUVRE la voie de la cible (Forme d'arbre : protecteur/
    // végétaux) ne la désactive pas — on cherche la première source qui ne l'excepte PAS.
    const source = sources.find((s) => !s.exceptPathIds.has(targetFeature.pathId));
    if (source) disabled.set(targetId, { byFeatureId: source.byFeatureId, byFeatureName: source.byFeatureName });
  }
  return disabled;
}

/**
 * Capacités actuellement DÉSACTIVÉES (grisées) : exclusion mutuelle par interrupteur
 * actif OU remplacement inconditionnel. L'UI grise ces capacités et rend leur
 * interrupteur non-interactif (le détail reste consultable). Cf. `disabledFeatureReasons`
 * pour la raison affichable.
 */
export function disabledFeatureIds(character: Character): Set<string> {
  return new Set(disabledFeatureReasons(character).keys());
}

/**
 * Élague les interrupteurs orphelins : retire les entrées dont la capacité n'est
 * plus acquise. À appeler quand on retire une capacité. Fonction pure.
 */
export function pruneEffectToggles(
  effectToggles: Record<string, boolean[]>,
  featureIds: string[],
): Record<string, boolean[]> {
  const owned = new Set(featureIds);
  const next: Record<string, boolean[]> = {};
  for (const [id, toggles] of Object.entries(effectToggles)) {
    if (owned.has(id)) next[id] = toggles;
  }
  return next;
}

/**
 * Élague les saisies libres (`effectInputs`, PER-70) dont la capacité n'est plus
 * acquise — mêmes raisons que `pruneEffectToggles` (pas de note fantôme).
 */
export function pruneEffectInputs(
  effectInputs: Record<string, string>,
  featureIds: string[],
): Record<string, string> {
  const owned = new Set(featureIds);
  const next: Record<string, string> = {};
  for (const [id, value] of Object.entries(effectInputs)) {
    if (owned.has(id)) next[id] = value;
  }
  return next;
}

/**
 * Clé d'état du VERROU « une dépense par récupération rapide » (PER-160) d'un compteur, dérivée de
 * sa clé de compteur. Une valeur > 0 sous cette clé signifie « verrouillé jusqu'au prochain repos court ».
 */
export function shortRestLockKey(counterKey: string): string {
  return `${counterKey}::sr-lock`;
}

/**
 * PER-163 — clé d'état de l'USAGE QUOTIDIEN d'un pouvoir emprunté (Artefact étrange). Portée par la
 * capacité HÔTE (`artefacts-r5`) et le sort emprunté (`spellId`). Convention « absence = plein » : la
 * clé absente signifie « disponible aujourd'hui » ; une valeur 0 signifie « déjà utilisé ». Rechargée
 * au repos long (`resetOn: 'day'`).
 */
export function borrowedPowerUsedKey(hostId: string, spellId: string): string {
  return `${hostId}::borrowed::${spellId}::used`;
}

/**
 * PER-163 — clé d'état d'INTÉGRITÉ d'un pouvoir emprunté (Artefact étrange). Convention « absence =
 * plein » : la clé absente signifie « intact » ; une valeur 0 signifie « cassé » (panne 1-2 au d6).
 * Réparée à la récupération rapide (`'short-rest'`, donc aussi au repos long). Distincte de l'usage
 * quotidien : un pouvoir peut être cassé sans avoir consommé son usage, et inversement.
 */
export function borrowedPowerIntegrityKey(hostId: string, spellId: string): string {
  return `${hostId}::borrowed::${spellId}::integrity`;
}

/**
 * PER-206 — clé d'état d'un ÉTAT PRÉJUDICIABLE déjà infligé (Botte secrète, spadassin-r5). Portée par
 * la capacité HÔTE et l'id de l'état (`STATUS_EFFECT_IDS`). Convention « absence = disponible » : clé
 * absente ⇒ état non encore infligé ce combat ; valeur 0 ⇒ déjà infligé. Réinitialisée selon
 * `inflictableStates.resetOn` (défaut `'combat'`, donc à toute récupération rapide / repos long).
 */
export function inflictedStateKey(hostId: string, stateId: string): string {
  return `${hostId}::state::${stateId}`;
}

/**
 * PER-74 — clé d'état du compteur d'usage d'un pouvoir conféré par le familier fantastique, porté par
 * la capacité HÔTE (rang 4 « Pouvoir mineur » ou rang 7 « Pouvoir supérieur »). Convention « absence =
 * plein » : clé absente ⇒ toutes les charges disponibles ; la valeur stockée est le nombre d'usages
 * RESTANTS. Rechargée selon la fréquence du familier choisi (`usageLimit.reset` : 'day' ou 'combat').
 */
export function familiarPowerUsedKey(hostFeatureId: string): string {
  return `${hostFeatureId}::familiar-power`;
}

/** Capacités hôtes de la voie du familier fantastique conférant un pouvoir → slot de l'entité (PER-74). */
const FAMILIAR_POWER_HOSTS: Record<string, 'minor' | 'superior'> = {
  'prestige-familier-fantastique-r4': 'minor',
  'prestige-familier-fantastique-r7': 'superior',
};

/**
 * Familier fantastique retenu au R3 (choix `option` index 0 de `FANTASTIC_FAMILIAR_R3_ID`), joint à son
 * entité via `familiarFromOptionId`. `undefined` si aucun familier retenu. Brique commune PER-74 (bonus
 * de carac du R7 ET pouvoirs conférés R4/R7).
 */
function selectedFamiliar(
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): FantasticFamiliar | undefined {
  const sel = featureChoices?.[FANTASTIC_FAMILIAR_R3_ID]?.[0];
  return familiarFromOptionId(typeof sel === 'string' ? sel : undefined);
}

/** Pouvoir conféré par le familier choisi, résolu pour une capacité hôte (R4/R7). PER-74. */
export interface ResolvedFamiliarPower {
  slot: 'minor' | 'superior';
  /** Texte verbatim du pouvoir (repli d'affichage si non résolu vers une capacité peuplée). */
  text: string;
  /** Nom de la capacité conférée si le livre la nomme (ex. « Image décalée »). */
  name?: string;
  /** Capacité RÉELLE peuplée référencée → rendu en carte + puce du profil. Absent = résolution différée. */
  featureId?: string;
  /** Pouvoir PROPRE au familier (pas une capacité de profil) → rendu en carte « pouvoir original ». */
  original?: FamiliarOriginalPower;
  /** Limite d'usage mécanisée (sans mana). Absent = pas de compteur (pouvoir à volonté / non chiffré). */
  usage?: { max: number; reset: UsageResetTrigger };
}

/**
 * Pouvoir que le familier CHOISI au R3 confère au maître, pour une capacité hôte de la voie du familier
 * fantastique (R4 → pouvoir mineur, R7 → pouvoir supérieur). `null` si `hostFeatureId` n'est pas un hôte
 * concerné ou si aucun familier n'est retenu. Résout le `featureId` de la capacité peuplée quand il existe
 * (rendu carte) ; sinon on ne dispose que du texte verbatim (repli). PER-74.
 */
export function resolveFamiliarGrantedPower(
  hostFeatureId: string,
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): ResolvedFamiliarPower | null {
  const slot = FAMILIAR_POWER_HOSTS[hostFeatureId];
  if (!slot) return null;
  const familiar = selectedFamiliar(featureChoices);
  if (!familiar) return null;
  const power = slot === 'minor' ? familiar.minorPower : familiar.superiorPower;
  return {
    slot,
    text: power.text,
    name: power.grants?.name ?? power.original?.name,
    featureId: power.grants?.featureId,
    original: power.original,
    usage: power.usageLimit,
  };
}

/**
 * Hôte du SORT APPRIS au rang 5 de la voie du familier (PER-74, « le personnage apprend un sort de rang
 * 1 ou 2 de son choix », p. 133). Le sort est choisi par un `feature-from-path` scoppé au profil du
 * familier (cf. `familiarSpellProfile`) : c'est une capacité EMPRUNTÉE ordinaire, mais utilisée SANS mana
 * et plafonnée à un compteur QUOTIDIEN (2× si rang 1, 1× si rang 2) — arbitrage proprio 2026-07-25.
 */
export const FAMILIAR_LEARNED_SPELL_HOST = 'prestige-familier-fantastique-r5';

/**
 * Id du sort appris au rang 5 (sélection `feature-from-path` de `FAMILIAR_LEARNED_SPELL_HOST`).
 * `undefined` si le rang 5 n'est pas acquis ou si aucun sort n'a encore été choisi.
 */
export function familiarLearnedSpellId(character: Character): string | undefined {
  if (!character.featureIds.includes(FAMILIAR_LEARNED_SPELL_HOST)) return undefined;
  const sel = character.featureChoices?.[FAMILIAR_LEARNED_SPELL_HOST]?.[0];
  return typeof sel === 'string' ? sel : undefined;
}

/**
 * Nombre d'usages QUOTIDIENS du sort appris au rang 5 (PER-74) : 2 si le sort choisi est de rang 1,
 * 1 s'il est de rang 2 (« deux fois par jour dans le cas d'un rang 1 et une seule fois dans le cas d'un
 * rang 2 », p. 133). `undefined` si aucun sort appris. Le compteur EST la contrainte (pas de coût mana).
 */
export function familiarLearnedSpellUsageMax(character: Character): number | undefined {
  const spellId = familiarLearnedSpellId(character);
  if (!spellId) return undefined;
  const rank = featureById.get(spellId)?.rank;
  if (rank === undefined) return undefined;
  return rank <= 1 ? 2 : 1;
}

/**
 * PER-324 — Hôte du SORT emprunté par « Sang féerique » (demi-elfe, rang 4, p. 10). Le sort est choisi
 * par un `feature-from-path` scoppé à l'ascendance elfe (ensorceleur / druide) : capacité EMPRUNTÉE
 * ordinaire, mais utilisée via des INCANTATIONS GRATUITES quotidiennes (3× si le sort est de rang 1,
 * 2× si rang 2, 1× si rang 3). Un lanceur de sorts peut EN PLUS le lancer en dépensant des PM.
 */
export const DEMI_ELFE_FEY_BLOOD_HOST = 'demi-elfe-r4';

/** Clé d'état du compteur d'incantations gratuites de « Sang féerique » (PER-324). Convention « absence = plein ». */
export const DEMI_ELFE_FEY_BLOOD_USAGE_KEY = 'demi-elfe-r4::fey-blood-spell';

/**
 * Id du sort emprunté par « Sang féerique » (sélection `feature-from-path` de `DEMI_ELFE_FEY_BLOOD_HOST`).
 * `undefined` si le rang 4 n'est pas acquis ou si aucun sort n'a encore été choisi.
 */
export function demiElfeFeyBloodSpellId(character: Character): string | undefined {
  if (!character.featureIds.includes(DEMI_ELFE_FEY_BLOOD_HOST)) return undefined;
  const sel = character.featureChoices?.[DEMI_ELFE_FEY_BLOOD_HOST]?.[0];
  return typeof sel === 'string' ? sel : undefined;
}

/**
 * Nombre d'INCANTATIONS GRATUITES quotidiennes du sort de « Sang féerique » (PER-324) : 3 si le sort
 * choisi est de rang 1, 2 s'il est de rang 2, 1 s'il est de rang 3 (p. 10). Ces incantations valent
 * pour TOUS (lanceur ou non — « il peut le lancer 3/2/1 fois par jour ») ; un lanceur peut EN PLUS
 * dépenser des PM. `undefined` si le rang 4 n'est pas acquis ou si aucun sort n'a encore été choisi.
 */
export function demiElfeFeyBloodUsageMax(character: Character): number | undefined {
  const spellId = demiElfeFeyBloodSpellId(character);
  if (!spellId) return undefined;
  const rank = featureById.get(spellId)?.rank;
  if (rank === undefined) return undefined;
  return rank <= 1 ? 3 : rank === 2 ? 2 : 1;
}

/**
 * PER-370 — Hôte du sort associé à l'armure sacrée au rang 5 « Pouvoir unique (L) » (voie de l'armure
 * sacrée, p. 166) : sort de rang 1 à 4 de N'IMPORTE QUELLE voie, choisi via `feature-from-path`
 * (`spellsOnly`, sans restriction de profil/famille). Lancé au coût en mana NORMAL de son rang (retour
 * propriétaire 2026-08-15, abroge l'arbitrage « sans coût en mana » du 2026-08-13) : le compteur
 * ci-dessous est une limite EN PLUS de la dépense de PM, rechargé à chaque combat.
 */
export const ARMURE_SACREE_MINOR_POWER_HOST = 'prestige-armure-sacree-r5';

/** Clé d'état du compteur du pouvoir unique de l'armure sacrée (PER-370). Convention « absence = plein ». */
export const ARMURE_SACREE_MINOR_POWER_USAGE_KEY = 'prestige-armure-sacree-r5::sacred-armor-power';

/**
 * Id du sort associé à l'armure sacrée au rang 5 (sélection `feature-from-path` de
 * `ARMURE_SACREE_MINOR_POWER_HOST`). `undefined` si le rang 5 n'est pas acquis ou si aucun sort n'a
 * encore été choisi.
 */
export function armureSacreeMinorPowerSpellId(character: Character): string | undefined {
  if (!character.featureIds.includes(ARMURE_SACREE_MINOR_POWER_HOST)) return undefined;
  const sel = character.featureChoices?.[ARMURE_SACREE_MINOR_POWER_HOST]?.[0];
  return typeof sel === 'string' ? sel : undefined;
}

/**
 * Usages PAR COMBAT du pouvoir unique (r5) : 4 si le sort choisi est de rang 1, 3 si rang 2, 2 si
 * rang 3, 1 si rang 4 (« il peut utiliser ce sort plus souvent s'il est moins puissant », p. 166).
 * `undefined` si le rang 5 n'est pas acquis ou si aucun sort n'a encore été choisi.
 */
export function armureSacreeMinorPowerUsageMax(character: Character): number | undefined {
  const spellId = armureSacreeMinorPowerSpellId(character);
  if (!spellId) return undefined;
  const rank = featureById.get(spellId)?.rank;
  if (rank === undefined) return undefined;
  if (rank <= 1) return 4;
  if (rank === 2) return 3;
  if (rank === 3) return 2;
  return 1;
}

/**
 * PER-370 — Hôte du sort associé à l'armure sacrée au rang 7 « Pouvoir puissant (L) » : même mécanique
 * que le rang 5 (sort de son choix, N'IMPORTE QUELLE voie, coût en mana normal de son rang, cf. r5) mais
 * pool QUOTIDIEN. Le plafond RAW « pas plus d'une fois par combat » (p. 166) reste DESCRIPTIF dans le
 * texte, non appliqué par le moteur (arbitrage propriétaire 2026-08-13 : pool quotidien seul).
 */
export const ARMURE_SACREE_MAJOR_POWER_HOST = 'prestige-armure-sacree-r7';

/** Clé d'état du compteur du pouvoir puissant de l'armure sacrée (PER-370). Convention « absence = plein ». */
export const ARMURE_SACREE_MAJOR_POWER_USAGE_KEY = 'prestige-armure-sacree-r7::sacred-armor-power';

/**
 * Id du sort associé à l'armure sacrée au rang 7 (sélection `feature-from-path` de
 * `ARMURE_SACREE_MAJOR_POWER_HOST`). `undefined` si le rang 7 n'est pas acquis ou si aucun sort n'a
 * encore été choisi.
 */
export function armureSacreeMajorPowerSpellId(character: Character): string | undefined {
  if (!character.featureIds.includes(ARMURE_SACREE_MAJOR_POWER_HOST)) return undefined;
  const sel = character.featureChoices?.[ARMURE_SACREE_MAJOR_POWER_HOST]?.[0];
  return typeof sel === 'string' ? sel : undefined;
}

/**
 * Usages QUOTIDIENS du pouvoir puissant (r7) : 3 si le sort choisi est de rang 5, 2 si rang 6, 1 si
 * rang 7 (p. 166). `undefined` si le rang 7 n'est pas acquis ou si aucun sort n'a encore été choisi.
 */
export function armureSacreeMajorPowerUsageMax(character: Character): number | undefined {
  const spellId = armureSacreeMajorPowerSpellId(character);
  if (!spellId) return undefined;
  const rank = featureById.get(spellId)?.rank;
  if (rank === undefined) return undefined;
  if (rank <= 5) return 3;
  if (rank === 6) return 2;
  return 1;
}

/**
 * PER-370 (retour propriétaire 2026-08-15) — rangs de DÉPLOIEMENT de l'armure sacrée, du plus bas au
 * plus haut. Remplacement INCONDITIONNEL (`replacesFeatures`) : le rang le plus haut POSSÉDÉ est
 * toujours le seul effectif (jamais deux à la fois).
 */
const ARMURE_SACREE_DEPLOY_RANK_IDS = [
  'prestige-armure-sacree-r4',
  'prestige-armure-sacree-r6',
  'prestige-armure-sacree-r8',
];

/**
 * PER-370 (retour propriétaire 2026-08-15) — sorts associés à l'armure sacrée (r5 « Pouvoir unique »,
 * r7 « Pouvoir puissant ») désactivés tant que l'armure n'est pas DÉPLOYÉE. Cas DISTINCT de
 * `borrowedFeaturesDisabledByInactiveToggle` : là-bas l'interrupteur d'autorisation est porté par la
 * capacité hôte du choix lui-même ; ici l'interrupteur « déployée/rangée » pertinent est celui du rang
 * d'armure ACTUELLEMENT EFFECTIF (r4/r6/r8 — un hôte DIFFÉRENT de r5/r7). Retourne les sélections
 * `feature-from-path` de r5 ET r7 désactivées, avec le rang d'armure comme source. Vide si aucun rang
 * d'armure n'est possédé, ou si son interrupteur « déployée » est actif (l'armure est portée).
 */
export function armureSacreeBorrowedFeaturesDisabledWhenStowed(
  character: Character,
): Map<string, DisabledFeatureReason> {
  const out = new Map<string, DisabledFeatureReason>();
  const activeArmorId = [...ARMURE_SACREE_DEPLOY_RANK_IDS]
    .reverse()
    .find((id) => character.featureIds.includes(id));
  if (!activeArmorId) return out;
  const armor = featureById.get(activeArmorId);
  const idx = armor?.effects?.findIndex((e) => e.kind === 'conditional-stat-bonus') ?? -1;
  if (idx < 0 || isEffectActive(character, activeArmorId, idx)) return out; // armure déployée → rien à griser
  const effect = armor?.effects?.[idx] as ConditionalStatBonusEffect | undefined;
  const label = effect?.activation.label ?? armor?.name ?? 'l’armure';
  for (const hostId of [ARMURE_SACREE_MINOR_POWER_HOST, ARMURE_SACREE_MAJOR_POWER_HOST]) {
    if (!character.featureIds.includes(hostId)) continue;
    const sel = character.featureChoices?.[hostId]?.[0];
    if (typeof sel !== 'string' || !featureById.has(sel)) continue;
    out.set(sel, {
      byFeatureId: activeArmorId,
      byFeatureName: armor?.name ?? activeArmorId,
      kind: 'borrow-inactive',
      note: `Désactivée tant que « ${label} » n'est pas activé : ce sort associé à l'armure sacrée est inutilisable armure rangée (p. 166).`,
    });
  }
  return out;
}

/**
 * PER-370 — caractéristique de MAGIE effective d'une voie de MYSTIQUE (p. 166 : « les sorts des voies
 * de mystique sont tous indexés sur le CHA. Toutefois, si un druide (ou un moine) choisit une de ces
 * voies, il utilisera sa PER. […] certaines voies utilisent la VOL ou la PER : […] un prêtre aura
 * l'obligation d'utiliser la caractéristique indiquée »). Ordre de résolution : override VERBATIM de
 * LA VOIE (`PrestigePath.mysticSpellAbility`, rare) > repli structurel druide/moine (PER) > CHA par
 * défaut. Général à TOUTE voie `category: 'mystic'`, pas seulement l'armure sacrée.
 */
export function mysticSpellAbility(character: Character, path: { mysticSpellAbility?: 'PER' | 'VOL' }): AbilityId {
  if (path.mysticSpellAbility) return path.mysticSpellAbility;
  return character.classId === 'druide' || character.classId === 'moine' ? 'PER' : 'CHA';
}

/**
 * PER-372 — substitution CHA→X annoncée par les prérequis d'une voie de MYSTIQUE ouverte en variante
 * aux MAGES (`PrestigePath.mageAlternateAbility`, p. 167 : « Cette voie peut aussi être choisie par un
 * mage… Remplacer le Charisme par l'Intelligence »). Contrairement à `mysticBorrowedSpellSubstitutions`
 * (sorts EMPRUNTÉS d'ailleurs), ceci vise le rendu NATIF des capacités de la voie elle-même. Actif
 * SEULEMENT si le personnage appartient à la famille `'mages'` (`CharacterClass.familyId`) — un
 * mystique qui prend la voie normalement n'est pas concerné et garde CHA. `undefined` si la capacité
 * n'appartient pas à une voie de prestige mystique, si la voie n'annonce aucune variante mage, ou si le
 * personnage n'est pas un mage.
 */
export function mageAlternateAbilitySubstitutions(
  character: Character,
  feature: Feature,
): AbilitySubstitution[] | undefined {
  const path = pathById.get(feature.pathId);
  if (!path || path.type !== 'prestige' || path.category !== 'mystic') return undefined;
  const to = path.mageAlternateAbility;
  if (!to) return undefined;
  if (classById.get(character.classId)?.familyId !== 'mages') return undefined;
  return [{ from: 'CHA', to, unconditional: true }];
}

/**
 * PER-401 — carac D'ORIGINE d'une capacité DIVINE (prêtre spécialiste, p. 122) dont la formule
 * scale sur la caractéristique du profil DONNEUR plutôt que sur le CHA du prêtre (retour propriétaire :
 * la capacité devient NATIVE du prêtre, elle doit suivre sa carac principale, meilleure des deux — comme
 * le forgesort qui reproduit un sort d'ailleurs, PER-163). Exclu volontairement : `brute-r2` (« +10 sur
 * un TEST de FOR » n'est pas une valeur qui scale sur une carac, juste un bonus à un test DE cette carac
 * — rien à substituer) et `pagne-r2` (choix AGI/CON pour la DEF, mécanique différente, laissée telle
 * quelle). `poing-r1` (Sélenne) a son propre `FOR\AGI` best-of câblé dans le token richText : la
 * substitution FOR→CHA ci-dessous s'y AJOUTE (résolue par `resolveExpr`, `abilityBest`) pour couvrir le
 * cas à trois carac (FOR/AGI/CHA).
 */
const DIVINE_FEATURE_ABILITY_SUBSTITUTIONS: Partial<Record<string, AbilityId>> = {
  'archer-r1': 'PER', // Archer émérite (Arwendée) — PER aux DM à l'arc
  'protecteur-r1': 'PER', // Baies magiques (Dénora) — nombre de fruits = PER
  'explosifs-r2': 'INT', // Démolition (Jeweln) — DM structure 3d4°+INT
  'demon-r2': 'INT', // Beauté de la succube (Suëlle) — DM 1d4°+INT, durée INT minutes
  'magie-elementaire-r4': 'INT', // Respiration aquatique (Linnarré) — nb compagnons = INT
  'metal-r1': 'INT', // Morsure de la forge (Arshran) — durée INT minutes
  'magie-universelle-r1': 'INT', // Lumière (Solar) — durée INT heures
  'magie-des-arcanes-r2': 'INT', // Lévitation (Oumaros) — durée INT minutes
  'mort-r2': 'INT', // Masque mortuaire (Morn) — durée INT minutes
  'vegetaux-r2': 'PER', // Prison végétale (Périnde) — durée PER minutes
  'poing-r1': 'FOR', // Poings de fer (Sélenne) — s'ajoute au best-of FOR/AGI existant
};

/**
 * PER-401 — substitutions à appliquer au rendu de la capacité DIVINE du prêtre spécialiste courant :
 * `undefined` si `feature` n'est pas SA capacité divine actuelle (rien à faire pour les autres
 * personnages qui possèdent la même capacité nativement — rôdeur, forgesort, moine…).
 */
export function priestDivineAbilitySubstitutions(
  character: Character,
  feature: Feature,
): AbilitySubstitution[] | undefined {
  if (character.priestVocation?.mode !== 'specialist') return undefined;
  const god = priestGodById.get(character.priestVocation.godId);
  if (!god || god.divineFeatureId !== feature.id) return undefined;
  const from = DIVINE_FEATURE_ABILITY_SUBSTITUTIONS[feature.id];
  return from ? [{ from, to: 'CHA' }] : undefined;
}

/**
 * PER-370 — substitutions de caractéristique à appliquer au rendu d'un SORT emprunté/associé via une
 * voie de MYSTIQUE (r5/r7 de l'armure sacrée, et toute voie mystique future avec un sort associé) :
 * le sort se lance TOUJOURS avec la caractéristique de la voie mystique (`mysticSpellAbility`), quelle
 * que soit sa caractéristique d'origine — substitutions `unconditional` (contrairement au forgesort,
 * PER-163, qui ne substitue que si c'est avantageux). `undefined` si la capacité empruntée n'est pas un
 * sort, ou si la voie hôte n'est pas de catégorie mystique (aucun effet hors ce contexte).
 */
export function mysticBorrowedSpellSubstitutions(
  character: Character,
  hostFeatureId: string,
  borrowedFeature: Feature,
): AbilitySubstitution[] | undefined {
  if (!borrowedFeature.isSpell) return undefined;
  const hostPath = pathById.get(featureById.get(hostFeatureId)?.pathId ?? '');
  if (!hostPath || hostPath.type !== 'prestige' || hostPath.category !== 'mystic') return undefined;
  const target = mysticSpellAbility(character, hostPath);
  return ABILITY_IDS.filter((a) => a !== target).map((from) => ({ from, to: target, unconditional: true }));
}

/**
 * PER-161 — la RÉACTIVATION de l'interrupteur du i-ème effet TEMPORAIRE d'une capacité est-elle
 * verrouillée jusqu'au prochain repos court ? Vrai quand l'effet est un `conditional-stat-bonus`
 * temporaire dont le compteur porteur a `oncePerShortRest` ET dont le verrou de repos court est posé
 * (ex. Sanctuaire / priere-r2 : lancer le sort le rend inattaquable puis interdit de le relancer avant
 * une récupération rapide). L'UI grise alors l'interrupteur POUR L'ACTIVATION uniquement — l'éteindre
 * (fin du sort) reste toujours possible. Sans effet sur les états sans verrou (ex. Rage : pas de
 * `oncePerShortRest` → interrupteur toujours (ré)activable).
 */
export function isTemporaryActivationShortRestLocked(
  character: Character,
  featureId: string,
  index: number,
): boolean {
  const feature = featureById.get(featureId);
  const effect = feature?.effects?.[index];
  if (effect?.kind !== 'conditional-stat-bonus' || effect.activation.kind !== 'temporary') return false;
  const counter = feature?.usageCounter;
  if (!counter?.oncePerShortRest) return false;
  const key = counter.sharedKey ?? featureId;
  return (character.usageCounters?.[shortRestLockKey(key)] ?? 0) > 0;
}

/**
 * PER-162 — surcoût en mana CROISSANT courant d'un sort (en PM) : `lancements × step`, où le nombre
 * de lancements depuis le dernier reset est lu dans `usageCounters` sous l'id de la capacité (absence
 * ⇒ 0). Retourne 0 si la capacité ne porte pas d'`escalatingManaCost`. À ajouter par-dessus le coût
 * de base (`spellManaCost`) pour obtenir le coût effectif affiché.
 */
export function escalatingManaSurcharge(character: Character, feature: Feature): number {
  const esc = feature.escalatingManaCost;
  if (!esc) return 0;
  const casts = Math.max(0, character.usageCounters?.[feature.id] ?? 0);
  return casts * (esc.step ?? 1);
}

/**
 * Élague les compteurs d'usages (`usageCounters`, PER-70) dont la capacité n'est
 * plus acquise — mêmes raisons que `pruneEffectToggles` (pas de décompte fantôme).
 */
export function pruneUsageCounters(
  usageCounters: Record<string, number>,
  featureIds: string[],
): Record<string, number> {
  const owned = new Set(featureIds);
  // Clés VALIDES : pour chaque capacité possédée portant un compteur, sa clé d'état —
  // `sharedKey` si réserve partagée (PER-119), sinon l'id de la capacité. On conserve aussi
  // les clés = id possédé (rétrocompat des compteurs propres sans champ `sharedKey`).
  const validKeys = new Set<string>(owned);
  for (const id of featureIds) {
    const counter = featureById.get(id)?.usageCounter;
    if (!counter) continue;
    const key = counter.sharedKey ?? id;
    validKeys.add(key);
    // Verrou « 1 dépense par repos court » (PER-160) : sa clé d'état dérivée est aussi valide.
    if (counter.oncePerShortRest) validKeys.add(shortRestLockKey(key));
  }
  // PER-163 : pouvoirs empruntés (Artefact étrange) — leurs clés d'état dérivées (usage + intégrité)
  // sont valides tant que la capacité HÔTE est possédée (indépendamment d'un `usageCounter`).
  for (const id of featureIds) {
    for (const spellId of featureById.get(id)?.borrowedPowers ?? []) {
      validKeys.add(borrowedPowerUsedKey(id, spellId));
      validKeys.add(borrowedPowerIntegrityKey(id, spellId));
    }
    // PER-206 : états préjudiciables infligeables (Botte secrète) — un marqueur par état, valide tant
    // que la capacité HÔTE est possédée.
    for (const stateId of featureById.get(id)?.inflictableStates?.stateIds ?? []) {
      validKeys.add(inflictedStateKey(id, stateId));
    }
    // PER-74 : compteur d'usage du pouvoir conféré par le familier (R4/R7) — clé fonction du seul id
    // hôte (indépendante du familier choisi), valide tant que la capacité hôte est possédée.
    if (FAMILIAR_POWER_HOSTS[id]) validKeys.add(familiarPowerUsedKey(id));
    // PER-74 : compteur d'usage QUOTIDIEN du sort appris au rang 5 — clé fonction du seul id hôte (R5),
    // valide tant que le rang 5 est acquis (le sort choisi peut changer sans invalider la clé).
    if (id === FAMILIAR_LEARNED_SPELL_HOST) validKeys.add(familiarPowerUsedKey(id));
    // PER-324 : compteur d'incantations gratuites de « Sang féerique » — clé dédiée, valide tant que
    // le rang 4 est acquis (le sort choisi peut changer sans invalider la clé).
    if (id === DEMI_ELFE_FEY_BLOOD_HOST) validKeys.add(DEMI_ELFE_FEY_BLOOD_USAGE_KEY);
    // PER-370 : compteurs d'usage du pouvoir associé à l'armure sacrée (r5/r7) — clés dédiées, valides
    // tant que le rang correspondant est acquis (le sort choisi peut changer sans invalider la clé).
    if (id === ARMURE_SACREE_MINOR_POWER_HOST) validKeys.add(ARMURE_SACREE_MINOR_POWER_USAGE_KEY);
    if (id === ARMURE_SACREE_MAJOR_POWER_HOST) validKeys.add(ARMURE_SACREE_MAJOR_POWER_USAGE_KEY);
  }
  // PER-162 : le surcoût croissant stocke ses lancements sous l'id de la capacité — déjà couvert par
  // `owned`, donc rien à ajouter ici (mentionné pour mémoire ; la clé survit à l'élagage).
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(usageCounters)) {
    if (validKeys.has(key)) next[key] = value;
  }
  return next;
}

/** Libellé générique par défaut d'un compteur d'usages — non identifiant pour une jauge. */
const GENERIC_USAGE_LABEL = 'Usages restants';

/** Une ressource de capacité à réserve limitée, prête à afficher en jauge (PER-150). */
export interface CapacityResourceGauge {
  /** Clé dans `usageCounters` (partagée si réserve cross-voie). */
  key: string;
  /** Libellé identifiant la ressource (label du compteur, ou nom de la capacité). */
  label: string;
  /** Usages RESTANTS courants (borné à [0, max]). */
  current: number;
  /** Maximum effectif (constant ou scalant). */
  max: number;
  /**
   * Profil dont relève la voie porteuse de la ressource (rage → barbare, charges
   * explosives → arquebusier). Sert à colorer la jauge et à choisir l'icône de
   * profil. `undefined` si la voie n'est pas une voie de profil.
   */
  classId?: string;
  /**
   * Réserve ACCUMULATEUR (PER-325, points de violence) : démarre à 0 et monte sans plafond ; `current`
   * n'est PAS borné par `max` (qui n'a pas de sens ici). Rendu par une barre segmentée dédiée. Défaut
   * `false` (réserve classique restant/max).
   */
  accumulator?: boolean;
}

/**
 * Ressources de capacité à réserve limitée du personnage (rage, sept vies du chat,
 * charges explosives…), agrégées pour affichage en jauges dans le bloc « État du
 * personnage » (PER-150).
 *
 * SOURCE UNIQUE : lit directement `usageCounters` (le même état que `FeaturesByPath`
 * et que la consommation au toggle). Les capacités partageant une `sharedKey` (réserve
 * cross-voie, ex. rage — PER-130) sont fusionnées en UNE seule jauge ; on retient le
 * `max` le plus élevé et un libellé de compteur explicite. Aucune donnée dupliquée :
 * le bloc et `FeaturesByPath` COEXISTENT sur la même source (régler ici = régler
 * partout). Ordre d'apparition = ordre des capacités acquises.
 */
export function capacityResourceGauges(character: Character): CapacityResourceGauge[] {
  const byKey = new Map<string, { label: string; max: number; classId?: string; accumulator?: boolean }>();
  const order: string[] = [];
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    const counter = feature?.usageCounter;
    if (!feature || !counter) continue;
    // Usages quotidiens à faible cadence (PER-73) : suivis sur la carte de capacité, pas en jauge d'état.
    // Réserve « à préparation systématique » (pool d'élixirs) : suivie dans l'en-tête de voie, pas ici.
    if (counter.hideFromStatusPanel || counter.poolInPathHeader) continue;
    // Compteur de suivi d'un effet temporaire (Absorption d'Armure de pierre) : jauge affichée
    // seulement tant que l'interrupteur de la capacité est actif (PER-150).
    if (counter.visibleWhenEffectActive && !hasActiveConditionalEffect(character, feature.id)) continue;
    const key = counter.sharedKey ?? feature.id;
    const accumulator = counter.accumulator === true;
    const max = accumulator ? 0 : usageCounterMaximum(counter, character, feature);
    // Libellé identifiant : le label du compteur sauf s'il est générique, auquel cas le nom
    // de la capacité (plus parlant qu'« Usages restants » pour une jauge).
    const label =
      !counter.label || counter.label === GENERIC_USAGE_LABEL ? feature.name : counter.label;
    // Profil porteur de la voie (pour la couleur/icône de la jauge).
    const path = pathById.get(feature.pathId);
    const classId = path?.type === 'class' ? path.classIds[0] : undefined;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { label, max, classId, accumulator });
      order.push(key);
    } else {
      existing.max = Math.max(existing.max, max);
      if (counter.label && counter.label !== GENERIC_USAGE_LABEL) existing.label = counter.label;
      if (!existing.classId && classId) existing.classId = classId;
      if (accumulator) existing.accumulator = true;
    }
  }
  return order.map((key) => {
    const { label, max, classId, accumulator } = byKey.get(key)!;
    // Accumulateur (points de violence) : démarre à 0, jamais borné par `max`. Réserve classique :
    // démarre plein (`?? max`) et reste dans [0, max].
    const current = accumulator
      ? Math.max(0, character.usageCounters?.[key] ?? 0)
      : Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));
    return { key, label, current, max, classId, accumulator };
  });
}

/**
 * Cycle de recharge EFFECTIF d'un compteur d'usages (PER-74) : si sa `conditionalFrequency`
 * pointe une capacité POSSÉDÉE et fournit un `resetOn`, ce dernier remplace le cycle de base
 * (ex. Cape d'ombre : 'day' → 'combat' si le personnage connaît Manteau d'ombre). Sinon, le
 * `resetOn` déclaré (défaut `'day'`).
 */
export function effectiveUsageResetOn(counter: UsageCounter, featureIds: string[]): UsageResetTrigger {
  const cf = counter.conditionalFrequency;
  if (cf?.resetOn && featureIds.includes(cf.featureId)) return cf.resetOn;
  return counter.resetOn ?? 'day';
}

/**
 * Le compteur d'usages est-il MASQUÉ de l'affichage (PER-74) parce qu'une capacité POSSÉDÉE lève
 * toute limite (`conditionalFrequency.unlimited`) ? Ex. Ombre mouvante : usage illimité — donc plus
 * rien à suivre — si le personnage connaît Disparition (assassin). Sinon `false` (compteur affiché).
 */
export function isUsageCounterHidden(counter: UsageCounter | undefined, featureIds: string[]): boolean {
  const cf = counter?.conditionalFrequency;
  return !!cf?.unlimited && featureIds.includes(cf.featureId);
}

/**
 * Réinitialise (remet à plein) les compteurs d'usages dont le `resetOn` figure dans
 * `triggers` — pour les boutons de repos (PER-151). Un compteur sans `resetOn` vaut
 * `'day'` par défaut (cas le plus courant) ; `'manual'` n'est jamais réinitialisé par
 * un repos. Remettre à plein = retirer la clé (absence ⇒ compteur au max). Ne touche
 * pas aux clés inconnues (compteurs d'une capacité non possédée : préservés).
 *
 * `featureChoices` (optionnel) sert au compteur d'usage du pouvoir conféré par le familier fantastique
 * (PER-74) : sa fréquence de reset (jour / combat) dépend du familier CHOISI au R3 — sans les choix, ce
 * compteur n'est pas résolu (les appels historiques restent inchangés).
 */
export function resetUsageCounters(
  usageCounters: Record<string, number>,
  featureIds: string[],
  triggers: Set<UsageResetTrigger>,
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): Record<string, number> {
  const toReset = new Set<string>();
  for (const id of featureIds) {
    const feature = featureById.get(id);
    const counter = feature?.usageCounter;
    if (counter) {
      const key = counter.sharedKey ?? id;
      if (triggers.has(effectiveUsageResetOn(counter, featureIds))) toReset.add(key);
      // Verrou « 1 dépense par repos court » (PER-160) : levé par tout repos court (donc aussi long).
      if (counter.oncePerShortRest && triggers.has('short-rest')) toReset.add(shortRestLockKey(key));
    }
    // PER-162 : surcoût mana croissant — retomber à 0 = retirer la clé (id de la capacité), comme un
    // compteur classique (ici « à plein » signifie « à 0 », baseline du modèle croissant).
    if (feature?.escalatingManaCost && triggers.has(feature.escalatingManaCost.resetOn)) toReset.add(id);
    // PER-163 : pouvoirs empruntés (Artefact étrange) — l'USAGE quotidien se recharge au repos long
    // (`'day'`), l'INTÉGRITÉ (réparation) à la récupération rapide (`'short-rest'`, donc aussi au repos
    // long). « À plein » = clé retirée (disponible / intact), même convention que les compteurs.
    for (const spellId of feature?.borrowedPowers ?? []) {
      if (triggers.has('day')) toReset.add(borrowedPowerUsedKey(id, spellId));
      if (triggers.has('short-rest')) toReset.add(borrowedPowerIntegrityKey(id, spellId));
    }
    // PER-146 : compteur synthétique « 1 usage/jour en armure » du sort emprunté du gnome
    // (« Don étrange », gnome-r1) — NON déclaré sur une `Feature` (conditionné au port d'armure),
    // donc invisible pour la boucle `feature.usageCounter` ci-dessus. Il suit le cycle journalier :
    // on le réinitialise (clé retirée = compteur plein) avec les autres compteurs 'day'.
    if (id === DON_ETRANGE_ID && triggers.has('day')) toReset.add(DON_ETRANGE_ARMOR_USAGE_KEY);
    // PER-206 : marqueurs d'états infligés (Botte secrète) — réinitialisés selon `resetOn` (défaut
    // 'combat', donc à toute récupération rapide / repos long). « À plein » = clé retirée (disponible).
    const states = feature?.inflictableStates;
    if (states && triggers.has(states.resetOn ?? 'combat')) {
      for (const stateId of states.stateIds) toReset.add(inflictedStateKey(id, stateId));
    }
    // PER-74 : compteur d'usage du pouvoir conféré par le familier (R4/R7) — rechargé selon la fréquence
    // du familier CHOISI (`usageLimit.reset` : 'day' → repos long ; 'combat' → récupération rapide/combat).
    if (FAMILIAR_POWER_HOSTS[id]) {
      const usage = resolveFamiliarGrantedPower(id, featureChoices)?.usage;
      if (usage && triggers.has(usage.reset)) toReset.add(familiarPowerUsedKey(id));
    }
    // PER-74 : sort APPRIS au rang 5 — compteur QUOTIDIEN (2×/1× selon le rang du sort), rechargé au
    // repos long (`'day'`). La fréquence est toujours journalière (indépendante du sort choisi).
    if (id === FAMILIAR_LEARNED_SPELL_HOST && triggers.has('day')) toReset.add(familiarPowerUsedKey(id));
    // PER-324 : incantations gratuites de « Sang féerique » (demi-elfe r4) — compteur QUOTIDIEN
    // (3/2/1 selon le rang du sort), rechargé au repos long (`'day'`).
    if (id === DEMI_ELFE_FEY_BLOOD_HOST && triggers.has('day')) toReset.add(DEMI_ELFE_FEY_BLOOD_USAGE_KEY);
    // PER-370 : pouvoir unique de l'armure sacrée (r5) — pool PAR COMBAT (récupération rapide, donc
    // aussi repos long) ; pouvoir puissant (r7) — pool QUOTIDIEN.
    if (id === ARMURE_SACREE_MINOR_POWER_HOST && triggers.has('combat')) toReset.add(ARMURE_SACREE_MINOR_POWER_USAGE_KEY);
    if (id === ARMURE_SACREE_MAJOR_POWER_HOST && triggers.has('day')) toReset.add(ARMURE_SACREE_MAJOR_POWER_USAGE_KEY);
  }
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(usageCounters)) {
    if (!toReset.has(key)) next[key] = value;
  }
  return next;
}

// ---------------------------------------------------------------------------
// Caractéristiques : modificateurs permanents et dés bonus (genres `ability-*`)
// ---------------------------------------------------------------------------

/** Une capacité qui apporte un modificateur permanent à une caractéristique. */
export interface AbilityModSource {
  featureId: string;
  /** Nom de la capacité (français), pour le détail affiché au joueur. */
  name: string;
  value: number;
}

/**
 * Caractéristique cible du +1 du rang 7 de la voie du familier fantastique (PER-74) : celle indiquée
 * par le familier CHOISI au rang 3 (`superiorPower.abilityBonus` de l'entité `FantasticFamiliar`). Lit
 * l'option retenue au rang 3 (`FANTASTIC_FAMILIAR_R3_ID`, choix 0 = un id d'option string) et la joint
 * à l'entité via `familiarFromOptionId`. `undefined` si aucun familier n'est retenu (effet ignoré).
 */
function familiarSuperiorAbility(
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): AbilityId | undefined {
  return selectedFamiliar(featureChoices)?.superiorPower.abilityBonus;
}

/**
 * Modificateurs PERMANENTS de caractéristiques apportés par les capacités acquises.
 * Gère trois genres :
 *  - `ability-bonus` : cible fixe (ex. « +1 CON » d'Endurer) ;
 *  - `ability-bonus-from-choice` : cible lue depuis `featureChoices[id][choiceIndex]`
 *    (ex. Projection mentale : « +1 à la carac la plus faible ») ;
 *  - `ability-bonus-from-familiar` : cible désignée par le familier retenu au rang 3 (rang 7 de
 *    la voie du familier fantastique, PER-74).
 * Ids inconnus ignorés.
 */
export function abilityModsFromFeatures(
  featureIds: string[],
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): Partial<Record<AbilityId, number>> {
  const mods: Partial<Record<AbilityId, number>> = {};
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind === 'ability-bonus') {
        mods[e.ability] = (mods[e.ability] ?? 0) + e.value;
      } else if (e.kind === 'ability-bonus-from-choice' && featureChoices) {
        const chosen = featureChoices[id]?.[e.choiceIndex];
        if (typeof chosen === 'string' && (ABILITY_IDS as readonly string[]).includes(chosen)) {
          mods[chosen as AbilityId] = (mods[chosen as AbilityId] ?? 0) + e.value;
        }
      } else if (e.kind === 'ability-bonus-from-familiar' && featureChoices) {
        const ability = familiarSuperiorAbility(featureChoices);
        if (ability) mods[ability] = (mods[ability] ?? 0) + e.value;
      }
    }
  }
  return mods;
}

/** Détaille, par caractéristique, QUELLES capacités apportent le modificateur. */
export function abilityModSources(
  featureIds: string[],
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): Partial<Record<AbilityId, AbilityModSource[]>> {
  const sources: Partial<Record<AbilityId, AbilityModSource[]>> = {};
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind === 'ability-bonus') {
        (sources[e.ability] ??= []).push({ featureId: id, name: feature.name, value: e.value });
      } else if (e.kind === 'ability-bonus-from-choice' && featureChoices) {
        const chosen = featureChoices[id]?.[e.choiceIndex];
        if (typeof chosen === 'string' && (ABILITY_IDS as readonly string[]).includes(chosen)) {
          (sources[chosen as AbilityId] ??= []).push({ featureId: id, name: feature.name, value: e.value });
        }
      } else if (e.kind === 'ability-bonus-from-familiar' && featureChoices) {
        const ability = familiarSuperiorAbility(featureChoices);
        if (ability) (sources[ability] ??= []).push({ featureId: id, name: feature.name, value: e.value });
      }
    }
  }
  return sources;
}

/** Capacité source d'un dé bonus permanent (pour le détail affiché au joueur). */
export interface BonusDieSource {
  featureId: string;
  /** Nom de la capacité (français). */
  name: string;
}

/**
 * Caractéristiques bénéficiant d'un DÉ BONUS permanent (genre `ability-bonus-die`),
 * chacune avec la/les capacité(s) source(s) — `featureId` + nom, pour rendre une
 * pastille de capacité dans le détail. Le dé bonus ne s'empile pas : une carac présente
 * ici en bénéficie (peu importe le nombre de sources), mais on garde la liste des sources.
 */
export function abilityBonusDiceSources(
  featureIds: string[],
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): Partial<Record<AbilityId, BonusDieSource[]>> {
  const dice: Partial<Record<AbilityId, BonusDieSource[]>> = {};
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind === 'ability-bonus-die') {
        (dice[e.ability] ??= []).push({ featureId: id, name: feature.name });
      } else if (e.kind === 'ability-bonus-die-from-choice' && featureChoices) {
        // Dé bonus dont la carac est lue depuis le choix retenu, éventuellement restreint
        // (ex. Combattant héroïque : dé bonus seulement si AGI est choisie, pas FOR).
        const chosen = featureChoices[id]?.[e.choiceIndex];
        if (
          typeof chosen === 'string' &&
          (ABILITY_IDS as readonly string[]).includes(chosen) &&
          (!e.onlyIfAbility || e.onlyIfAbility.includes(chosen as AbilityId))
        ) {
          (dice[chosen as AbilityId] ??= []).push({ featureId: id, name: feature.name });
        }
      }
    }
  }
  return dice;
}

/**
 * Variante « noms seuls » de {@link abilityBonusDiceSources}, pour l'info-bulle de
 * l'icône double-d20 (badges) qui n'affiche que du texte.
 */
export function abilityBonusDiceFromFeatures(
  featureIds: string[],
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): Partial<Record<AbilityId, string[]>> {
  const detailed = abilityBonusDiceSources(featureIds, featureChoices);
  const dice: Partial<Record<AbilityId, string[]>> = {};
  for (const ability of Object.keys(detailed) as AbilityId[]) {
    dice[ability] = detailed[ability]!.map((s) => s.name);
  }
  return dice;
}

/**
 * Sources d'un DÉ BONUS AUTO à TOUS les tests (genre `low-hp-test-die`, casse-cou r4 « Au pied
 * du mur », p. 138), conféré tant que les PV COURANTS sont ≤ au NIVEAU. Auto-évalué depuis la
 * jauge de PV — AUCUN interrupteur. Renvoie la/les capacité(s) source(s) quand la condition est
 * remplie, sinon une liste vide (PV au-dessus du seuil, ou capacité absente). Le rendu applique
 * ce dé bonus à CHAQUE caractéristique (donc à tous les tests de carac et de compétence), via
 * l'injection dans `bonusDieSources` de la vue d'affichage (`sheetDisplayView`).
 */
export function lowHpTestDieSources(character: Character, maxHp: number): BonusDieSource[] {
  if (currentHp(maxHp, character.depletion) > character.level) return [];
  const out: BonusDieSource[] = [];
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (feature?.effects?.some((e) => e.kind === 'low-hp-test-die')) {
      out.push({ featureId: id, name: feature.name });
    }
  }
  return out;
}

/**
 * Sources d'un DÉ BONUS AUTO à toutes les ATTAQUES (genre `low-hp-attack-die`, flibustier r8 « Pas de
 * quartier », p. 142), conféré tant que les PV COURANTS sont STRICTEMENT INFÉRIEURS au NIVEAU (« moins
 * de niveau PV »). Auto-évalué depuis la jauge de PV — AUCUN interrupteur. Renvoie la/les capacité(s)
 * source(s) quand la condition est remplie, sinon une liste vide. Le rendu applique ce dé bonus aux
 * CARTES d'attaque (contact/distance/magie), via l'injection dans la vue d'affichage (`sheetDisplayView`).
 */
export function lowHpAttackDieSources(character: Character, maxHp: number): BonusDieSource[] {
  if (currentHp(maxHp, character.depletion) >= character.level) return [];
  const out: BonusDieSource[] = [];
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (feature?.effects?.some((e) => e.kind === 'low-hp-attack-die')) {
      out.push({ featureId: id, name: feature.name });
    }
  }
  return out;
}

/**
 * Sources d'un DÉ BONUS à TOUS les tests conféré par un effet `conditional-stat-bonus` ACTIF portant
 * `allTestsDie` (casse-cou r6 « L'amour du risque », p. 139, via l'interrupteur « Lieu dangereux »).
 * Interrupteur MANUEL (≠ `lowHpTestDieSources`, auto). Vide si aucun interrupteur concerné n'est actif.
 * Injecté sur les 7 caracs par `sheetDisplayView` (badge double-d20 sur chaque carac et compétence).
 */
export function activeAllTestsDieSources(character: Character): BonusDieSource[] {
  const out: BonusDieSource[] = [];
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    feature.effects.forEach((effect, i) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.allTestsDie) return;
      if (!isEffectActive(character, id, i)) return;
      out.push({ featureId: id, name: feature.name });
    });
  }
  return out;
}

/**
 * Capacités ACTIVES qui IMPOSENT un dé malus aux attaques à distance ciblant le personnage
 * (`conditional-stat-bonus.imposesRangedTargetMalusDie`, PER-74, Cape d'ombre r7). Effet défensif
 * situationnel SANS valeur numérique (il porte sur le jet de l'adversaire) → rendu en badge sous la
 * carte Défense. Vide si aucun interrupteur concerné n'est actif.
 */
export function activeRangedTargetMalusDieSources(character: Character): BonusDieSource[] {
  const out: BonusDieSource[] = [];
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    feature.effects.forEach((effect, i) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.imposesRangedTargetMalusDie) return;
      if (!isEffectActive(character, id, i)) return;
      out.push({ featureId: id, name: feature.name });
    });
  }
  return out;
}

/**
 * Dés bonus octroyés à la CRÉATURE d'une voie par les options retenues du personnage
 * (option `creatureAbilityBonusDie`, ex. Golem supérieur « Forme de félin » → AGI du
 * golem). Lit `character.featureChoices` aligné par POSITION sur `Feature.choices`,
 * pour les capacités de la voie `pathId`.
 */
export function creatureBonusDiceForPath(pathId: string, character: Character): Set<AbilityId> {
  const out = new Set<AbilityId>();
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature || feature.pathId !== pathId || !feature.choices) continue;
    const selections = character.featureChoices[id] ?? [];
    feature.choices.forEach((choice, i) => {
      if (choice.kind !== 'option') return;
      const sel = selections[i];
      const chosenIds = Array.isArray(sel) ? sel : sel ? [sel] : [];
      for (const opt of choice.options) {
        if (opt.creatureAbilityBonusDie && chosenIds.includes(opt.id)) {
          out.add(opt.creatureAbilityBonusDie);
        }
      }
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bonus de compétence aux domaines de test (PER-89)
// ---------------------------------------------------------------------------

/**
 * Catégorie de cumul d'un bonus de compétence (p. 203), déduite de la voie hôte :
 * profil (`class`), peuple (`ancestry` + voie du `mage`), prestige. Deux bonus de MÊME
 * catégorie ne se cumulent pas (on garde le plus fort) ; entre catégories ils
 * s'additionnent, le total étant plafonné à +15.
 */
export type CompetenceCategory = 'class' | 'ancestry' | 'prestige';

/** Plafond absolu du bonus de compétence sur un test (p. 203). */
export const COMPETENCE_BONUS_CAP = 15;

/** Libellé français d'une catégorie de source, pour le détail affiché. */
export const COMPETENCE_CATEGORY_LABEL: Record<CompetenceCategory, string> = {
  class: 'Voie de profil',
  ancestry: 'Voie de peuple',
  prestige: 'Voie de prestige',
};

/** Catégorie de cumul de la voie hôte d'une capacité (null si voie inconnue). */
function competenceCategoryOf(pathId: string): CompetenceCategory | null {
  const path = pathById.get(pathId);
  if (!path) return null;
  switch (path.type) {
    case 'class':
      return 'class';
    case 'prestige':
      return 'prestige';
    case 'ancestry':
    case 'mage':
      return 'ancestry';
  }
}

/**
 * Valeur par défaut d'un bonus de compétence selon la catégorie (p. 203), quand l'effet
 * n'en porte pas : peuple = +3 fixe ; profil / prestige évolutif = `2 + rang atteint dans
 * la voie`, plafonné au rang 5 (→ +7).
 */
function defaultCompetenceValue(category: CompetenceCategory, pathRank: number): number {
  return category === 'ancestry' ? 3 : 2 + Math.min(pathRank, 5);
}

/** Contribution retenue d'une capacité à un domaine (le max de sa catégorie). */
export interface TestDomainSource {
  featureId: string;
  /** Nom de la capacité (français), pour le détail affiché. */
  name: string;
  /** Catégorie de source (profil / peuple / prestige). */
  category: CompetenceCategory;
  value: number;
}

/** Bonus de compétence total d'un domaine pour un personnage, après cumul. */
/**
 * Contribution à un domaine qui NE compte PAS dans le total (PER-73) : battue par une autre source
 * de la même catégorie (règle du livre « max par catégorie », p. 203 — deux bonus de profil ne se
 * cumulent pas). Conservée pour l'affichage (barrée + « ne se cumule pas avec … ») afin que le
 * joueur voie qu'elle est prise en compte mais dominée. Cas typique : une capacité EMPRUNTÉE dont
 * le bonus est égalé/dépassé par une vraie capacité de voie de profil.
 */
export interface DominatedTestSource {
  /** La contribution dominée (capacité + valeur résolue). */
  source: TestDomainSource;
  /** La source RETENUE qui la domine (même catégorie, valeur ≥). */
  dominatedBy: TestDomainSource;
}

export interface TestDomainBonus {
  /** Id du domaine (cf. `src/data/test-domains.ts`). */
  domain: string;
  /** Total après cumul (max par catégorie, sommés) et plafond +15. */
  total: number;
  /** Le total brut dépassait-il le plafond +15 ? */
  capped: boolean;
  /** Contribution retenue par catégorie (le max de chacune), pour le détail. */
  sources: TestDomainSource[];
  /** Contributions DOMINÉES (non comptées car battues dans leur catégorie), pour l'affichage barré. */
  dominated?: DominatedTestSource[];
}

/** Une contribution BRUTE (avant cumul) à un domaine. */
interface RawTestContribution extends TestDomainSource {
  domain: string;
}

/**
 * Récolte toutes les contributions BRUTES aux domaines de test : effets `test-bonus`
 * statiques ET domaines pilotés par une option retenue (`testBonusDomains`, ex.
 * `humain-r1`). La valeur suit l'effet (si présente, résolue dans le contexte) ou, à
 * défaut, la catégorie de la voie hôte. Sans `ctx`, les domaines pilotés par option et
 * les valeurs scalantes ne sont pas résolus.
 */
function rawTestContributions(featureIds: string[], ctx?: EffectContext): RawTestContribution[] {
  const pathRanks = pathRanksFromFeatures(featureIds);
  const out: RawTestContribution[] = [];
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    const category = competenceCategoryOf(feature.pathId);
    if (!category) continue;
    // Capacité empruntée (« Appel à une autre capacité ») : le rang qui pilote la valeur du bonus
    // (formule 2 + rang) est celui de la VOIE A qui l'a fait emprunter, pas sa voie d'origine. La
    // CATÉGORIE de cumul, elle, reste celle de la voie d'origine de la capacité (profil → ne se
    // cumule donc pas avec les autres bonus de profil ; max par catégorie, p. 203).
    const rankPathId = ctx?.borrowedHostPaths?.get(id) ?? feature.pathId;
    const pathRank = pathRanks[rankPathId] ?? feature.rank;
    const fallback = defaultCompetenceValue(category, pathRank);

    // (a) effets `test-bonus` statiques (barbare, chevalier, mages…). Sauf « bonus de compétence
    // associé » SUPPRIMÉ d'une capacité octroyée (`grantedFeature.suppressTestBonus`, PER-323) : le
    // cambion obtient le sort Ténèbres mais pas son érudition occulte.
    const testBonusSuppressed = ctx?.suppressedTestBonusFeatureIds?.has(id) ?? false;
    for (const effect of feature.effects ?? []) {
      if (effect.kind !== 'test-bonus' || testBonusSuppressed) continue;
      const value =
        effect.value === undefined
          ? fallback
          : resolveValue(effect.value, feature.pathId, pathRanks, ctx);
      if (value === null) continue; // valeur scalante non résoluble sans contexte
      for (const domain of effect.domains)
        out.push({ domain, featureId: id, name: feature.name, category, value });
    }

    // (a ter) bonus dont le DOMAINE vient d'un choix `test-domain` (PER-74, Expertise r4 +5) : la
    // compétence retenue reçoit `value`. Nécessite les choix (ctx) ; sans sélection, rien.
    for (const effect of feature.effects ?? []) {
      if (effect.kind !== 'test-bonus-from-choice') continue;
      const sel = ctx?.featureChoices?.[id]?.[effect.choiceIndex];
      const domain = typeof sel === 'string' ? sel : undefined;
      if (!domain) continue;
      const value = resolveValue(effect.value, feature.pathId, pathRanks, ctx);
      if (value === null) continue;
      out.push({ domain, featureId: id, name: feature.name, category, value });
    }

    // (a bis) bonus de compétence CONDITIONNEL (PER-117) : domaines portés par un
    // conditional-stat-bonus ACTIF (ex. « en milieu naturel » : Survie, Éclaireur). Même valeur
    // déduite de la catégorie (fallback) qu'un test-bonus statique ; comptés seulement si le
    // toggle est actif (ctx requis ; sans ctx, aucun toggle → ignorés).
    (feature.effects ?? []).forEach((effect, i) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.testBonusDomains?.length) return;
      if (!isConditionalActive(effect, id, i, ctx)) return;
      // Valeur EXPLICITE (ex. Vision des ombres r4 : +5 fixe) sinon fallback de catégorie (« rang + 2 »).
      const value =
        effect.testBonusValue === undefined
          ? fallback
          : resolveValue(effect.testBonusValue, feature.pathId, pathRanks, ctx);
      if (value === null) return; // valeur scalante non résoluble sans contexte
      for (const domain of effect.testBonusDomains)
        out.push({ domain, featureId: id, name: feature.name, category, value });
    });

    // (b) domaines octroyés par une OPTION retenue (ex. humain-r1 : origine → 2 domaines).
    const selections = ctx?.featureChoices?.[id] ?? [];
    (feature.choices ?? []).forEach((choice, i) => {
      // (b.1) option preset : domaines portés par l'option retenue.
      if (choice.kind === 'option') {
        const sel = selections[i];
        const chosenIds = Array.isArray(sel) ? sel : sel ? [sel] : [];
        for (const opt of choice.options) {
          if (!opt.testBonusDomains || !chosenIds.includes(opt.id)) continue;
          for (const domain of opt.testBonusDomains)
            out.push({ domain, featureId: id, name: feature.name, category, value: fallback });
        }
        return;
      }
      // (b.2) gagne-pain LIBRE (`custom-skill`, PER-73, ex. humain-r1 « Libre ») : les domaines
      // saisis (persistés en `[nom, ...domaines]`) reçoivent le même bonus de catégorie que ceux
      // d'une option preset. Le nom est décoratif → ignoré ici.
      if (choice.kind === 'custom-skill') {
        // Choix conditionnel à une option sœur (« Libre ») : on n'applique les domaines que si
        // l'option gouvernante est effectivement retenue (sinon la saisie est masquée/obsolète).
        if (choice.visibleIfOption) {
          const gov = selections[choice.visibleIfOption.choiceIndex];
          const govIds = Array.isArray(gov) ? gov : gov ? [gov] : [];
          const need = choice.visibleIfOption.optionId;
          const needIds = Array.isArray(need) ? need : [need];
          if (!needIds.some((id) => govIds.includes(id))) return;
        }
        const sel = selections[i];
        const domains = Array.isArray(sel)
          ? sel.slice(1).filter((d): d is string => typeof d === 'string' && d.length > 0)
          : [];
        for (const domain of domains)
          out.push({ domain, featureId: id, name: feature.name, category, value: fallback });
      }
    });
  }
  return out;
}

/** Bonus de compétence UNIVERSEL appliqué en plancher (Éclectique) — cf. `universalTestBonus`. */
export interface UniversalTestBonus {
  featureId: string;
  /** Nom de la capacité (français), pour le détail affiché. */
  name: string;
  /** Valeur du plancher (nombre de voies au rang seuil, plancher 1). */
  value: number;
}

/**
 * Nombre de voies de PROFIL du profil `classId` dont le rang atteint est ≥ `rank`
 * (cross-voie, voie hôte comprise). Sert aux bonus de famille (ex. Éclectique : +1 par
 * voie de barde au rang 4).
 */
function countClassVoiesAtRank(featureIds: string[], classId: string, rank: number): number {
  const pathRanks = pathRanksFromFeatures(featureIds);
  let count = 0;
  for (const [pathId, maxRank] of Object.entries(pathRanks)) {
    const path = pathById.get(pathId);
    if (path?.type === 'class' && path.classIds.includes(classId) && maxRank >= rank) count++;
  }
  return count;
}

/**
 * Bonus de compétence UNIVERSEL (effet `universal-test-bonus`, ex. Éclectique) du
 * personnage, s'il en porte un. Valeur = 1 (bonus de base) + nombre de voies du profil
 * au rang seuil (« +1 chaque fois qu'il atteint le rang 4 dans une voie de barde »).
 * `null` si aucune capacité ne l'accorde. On ne gère qu'une source à la fois (aucun cas
 * de cumul de deux bonus universels au catalogue).
 */
export function universalTestBonus(featureIds: string[]): UniversalTestBonus | null {
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind !== 'universal-test-bonus') continue;
      const count = countClassVoiesAtRank(featureIds, e.scaleByPathsAtRank.classId, e.scaleByPathsAtRank.rank);
      return { featureId: id, name: feature.name, value: 1 + count };
    }
  }
  return null;
}

/**
 * Ids des COMPÉTENCES (domaines de test) que le personnage a « acquises par une capacité » — le
 * périmètre légal du +5 de l'Expertise (spécialiste r4, p. 129), servant à SIGNALER dans le sélecteur
 * les compétences hors périmètre (grisées mais sélectionnables, avec avertissement — fiche permissive).
 * Réunit les trois sources structurées de bonus de test :
 *  1. domaines PRÉCIS gagnés via une capacité/peuple (`testBonusSources`, ex. Voie de la brute →
 *     négociation/persuasion/intimidation ; Voie du pagne → course/saut/escalade) ;
 *  2. bonus à TOUTE une caractéristique → toutes ses compétences (`abilityTestBonusByAbility`, ex.
 *     Tatouages/Prescience) ;
 *  3. buff UNIFORME à toutes les caracs (`abilityTestBonusSources`, ex. Bénédiction) ou bonus
 *     UNIVERSEL à tous les tests (`universalTestBonus`, Éclectique) → toutes les compétences.
 * Utilise le contexte courant (les bonus conditionnels comptent s'ils sont actifs) ; c'est un indice,
 * pas une contrainte bloquante.
 */
export function acquiredTestDomainIds(character: Character): Set<string> {
  return new Set(testDomainSourceFeatureIds(character).keys());
}

/**
 * Pour chaque COMPÉTENCE acquise par une capacité (cf. {@link acquiredTestDomainIds}), les ids des
 * CAPACITÉS qui l'accordent (ordre de rencontre, dédoublonnés). Sert à afficher, à droite d'une
 * compétence disponible du sélecteur +5 (Expertise r4), une puce au NOM de la capacité source
 * (`CapabilityChip`). Une compétence sans source n'apparaît pas (elle serait « grisée »).
 */
export function testDomainSourceFeatureIds(character: Character): Map<string, string[]> {
  const featureIds = effectiveFeatureIdsForMods(character);
  const ctx = effectContext(character);
  const map = new Map<string, string[]>();
  const add = (domain: string, featureId: string) => {
    const list = map.get(domain);
    if (list) {
      if (!list.includes(featureId)) list.push(featureId);
    } else {
      map.set(domain, [featureId]);
    }
  };
  // (1) Domaines PRÉCIS gagnés via une capacité/peuple.
  for (const src of testBonusSources(featureIds, ctx))
    for (const s of src.sources) add(src.domain, s.featureId);
  // (2) Bonus à TOUTE une carac → toutes ses compétences ; (3) uniforme / universel → toutes.
  const byAbility = abilityTestBonusByAbility(featureIds, ctx);
  const uniformSources = abilityTestBonusSources(featureIds, ctx);
  const universal = universalTestBonus(featureIds);
  for (const d of testDomains) {
    for (const a of d.abilities) for (const s of byAbility[a] ?? []) add(d.id, s.featureId);
    for (const s of uniformSources) add(d.id, s.featureId);
    if (universal) add(d.id, universal.featureId);
  }
  return map;
}

/** Rang hôte de la Capacité fabuleuse (spécialiste r5, p. 129). */
export const FABULOUS_CAPACITY_HOST = 'prestige-specialiste-r5';

/**
 * Cible de la Capacité fabuleuse (spécialiste r5, p. 129), le cas échéant : la capacité pointée par
 * le choix `known-feature` du rang, et le MODE de sublimation qui en découle (dérivation des règles
 * de base MÉCANISÉE, arbitrage proprio 2026-07-27) :
 *  - `promote` : capacité marquée **(L)** → son marqueur d'action devient **(A)** dans sa voie
 *    d'origine (« il lui suffit désormais d'une action d'attaque pour l'utiliser ») ;
 *  - `concentrate` : **SORT lancé en (A)** → il bénéficie de la concentration (−2 PM PERMANENT,
 *    p. 228) SANS passer en (L) (le marqueur reste (A) — l'inverse de la règle de base).
 * Une capacité (L) qui est AUSSI un sort reste en `promote` (elle devient (A) ; c'est la 1re phrase
 * du texte). Résolue seulement si le rang r5 est acquis et le choix renseigné ; sert l'AFFICHAGE
 * (marqueurs + coût de mana), pas les `effects` structurés. `null` si aucune cible valide.
 */
export function fabulousCapacityTarget(
  character: Character,
): { featureId: string; mode: 'promote' | 'concentrate' } | null {
  if (!character.featureIds.includes(FABULOUS_CAPACITY_HOST)) return null;
  const sel = character.featureChoices?.[FABULOUS_CAPACITY_HOST]?.[0];
  if (typeof sel !== 'string') return null;
  const f = featureById.get(sel);
  if (!f || !f.actionTypes || f.actionTypes.length === 0) return null;
  if (f.actionTypes.includes('L')) return { featureId: sel, mode: 'promote' };
  if (f.isSpell && f.actionTypes.includes('A')) return { featureId: sel, mode: 'concentrate' };
  return null;
}

/**
 * Bonus de compétence PAR DOMAINE pour un personnage, AVEC détail de provenance —
 * applique la règle du livre (p. 203) : par domaine, MAX par catégorie de source, maxima
 * ADDITIONNÉS, total plafonné à +15. Un domaine sans contribution n'apparaît pas. Sur le
 * modèle de `featureModSources`. Sans `ctx`, les bonus pilotés par option et les valeurs
 * scalantes sont ignorés (suffit aux appels « catalogue seul »).
 *
 * Le bonus UNIVERSEL (Éclectique, PER-102) NE SE CUMULE PAS avec les bonus de profil/
 * prestige (il PRIME au MAX : si Éclectique > le bonus de voie/prestige, c'est lui qui
 * s'applique), mais il SE CUMULE avec le bonus de PEUPLE. Donc, par domaine :
 * total = peuple + max(Éclectique, profil + prestige). Les domaines SANS aucune
 * contribution ne sont pas matérialisés ici — ils relèvent de la ligne « tous les autres
 * tests : +N » (cf. `universalTestBonus`, rendue à part).
 */
export function testBonusSources(featureIds: string[], ctx?: EffectContext): TestDomainBonus[] {
  const byDomain = new Map<string, RawTestContribution[]>();
  for (const c of rawTestContributions(featureIds, ctx)) {
    const list = byDomain.get(c.domain);
    if (list) list.push(c);
    else byDomain.set(c.domain, [c]);
  }
  // Subsomption ciblée (PER-73) : « érudition occulte » est une spécialisation d'« érudition ».
  // SEUL cas traité : voie de peuple elfe haut (`erudition`, peuple) + voie du mage (`occult-lore`,
  // peuple). La règle « pas de cumul d'une source identique » (p.203) veut que deux bonus de PEUPLE
  // ne s'additionnent pas sur un même test → max, et non somme. On replie donc les contributions
  // `erudition` de catégorie PEUPLE dans le seau `occult-lore`, UNIQUEMENT si ce seau porte déjà une
  // contribution de peuple (mage-r1). Sans cette garde, on toucherait les cas profil/prestige (ex.
  // elfe haut sorcier) qui sont hors périmètre. Le seau `erudition` reste intact (l'érudition
  // GÉNÉRALE conserve son +3 : le bonus occulte ne remonte pas vers le parent).
  const occultBucket = byDomain.get('occult-lore');
  const eruditionBucket = byDomain.get('erudition');
  if (occultBucket && eruditionBucket && occultBucket.some((c) => c.category === 'ancestry')) {
    for (const c of eruditionBucket)
      if (c.category === 'ancestry') occultBucket.push({ ...c, domain: 'occult-lore' });
  }
  const floor = universalTestBonus(featureIds);
  const result: TestDomainBonus[] = [];
  for (const [domain, contribs] of byDomain) {
    // Max par catégorie : deux bonus de même type ne se cumulent pas (p. 203).
    const winnerByCat = new Map<CompetenceCategory, TestDomainSource>();
    for (const c of contribs) {
      const cur = winnerByCat.get(c.category);
      if (!cur || c.value > cur.value)
        winnerByCat.set(c.category, {
          featureId: c.featureId,
          name: c.name,
          category: c.category,
          value: c.value,
        });
    }
    const ancestryW = winnerByCat.get('ancestry');
    const classW = winnerByCat.get('class');
    const prestigeW = winnerByCat.get('prestige');
    // Peuple : se cumule toujours (exception du livre). Non-peuple : profil + prestige
    // se cumulent entre eux, mais Éclectique NE se cumule PAS — il prend le MAX face à eux.
    const otherNonAncestry = (classW?.value ?? 0) + (prestigeW?.value ?? 0);
    const sources: TestDomainSource[] = [];
    if (ancestryW) sources.push(ancestryW);
    let nonAncestry: number;
    if (floor && floor.value > otherNonAncestry) {
      // Éclectique l'emporte (strictement plus élevé) → il remplace les bonus de profil/prestige.
      sources.push({ featureId: floor.featureId, name: floor.name, category: 'class', value: floor.value });
      nonAncestry = floor.value;
    } else {
      if (classW) sources.push(classW);
      if (prestigeW) sources.push(prestigeW);
      nonAncestry = otherNonAncestry;
    }
    const rawTotal = (ancestryW?.value ?? 0) + nonAncestry;
    // Contributions DOMINÉES (PER-73) : celles qui n'ont pas été retenues (battues dans leur
    // catégorie, ou catégorie remplacée par Éclectique). Conservées pour l'affichage barré, avec la
    // source qui les domine (même catégorie si retenue, sinon la source de profil retenue — Éclectique).
    const keptByCat = new Map<CompetenceCategory, TestDomainSource>(sources.map((s) => [s.category, s]));
    const keptIds = new Set(sources.map((s) => s.featureId));
    const dominated: DominatedTestSource[] = [];
    for (const c of contribs) {
      if (keptIds.has(c.featureId)) continue;
      const dominatedBy = keptByCat.get(c.category) ?? keptByCat.get('class');
      if (!dominatedBy) continue;
      dominated.push({
        source: { featureId: c.featureId, name: c.name, category: c.category, value: c.value },
        dominatedBy,
      });
    }
    result.push({
      domain,
      total: Math.min(rawTotal, COMPETENCE_BONUS_CAP),
      capped: rawTotal > COMPETENCE_BONUS_CAP,
      sources,
      ...(dominated.length ? { dominated } : {}),
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Bonus de MAGIE aux tests (PER-275 objets enchantés + PER-134 non-cumul)
// ---------------------------------------------------------------------------

/**
 * Portée d'un bonus de magie aux tests :
 *  - `ability` : TOUS les tests d'une caractéristique (test de carac nu comme chacun des
 *    domaines qu'elle gouverne) — ex. Tatouages, ou un anneau « +2 aux tests de FOR » ;
 *  - `domain` : un domaine de compétence précis — ex. une cape « +5 en Discrétion ».
 */
export type MagicTestScope =
  | { kind: 'ability'; ability: AbilityId }
  | { kind: 'domain'; domain: string };

/**
 * Une source de **bonus de magie** à un test : une capacité marquée comme telle (Tatouages,
 * p. 80) ou un objet magique PORTÉ (`ItemTestBonuses`, PER-275).
 */
export interface MagicTestSource {
  /** Nom affiché (français) : nom de la capacité ou de l'objet. */
  name: string;
  /**
   * Capacité source, pour la puce de voie du détail. ABSENT quand la source est un OBJET
   * porté : le détail le rend alors en libellé texte, comme les apports de caracs (PER-272).
   */
  featureId?: string;
  /** Apport signé (un objet maudit peut porter un malus). */
  value: number;
  scope: MagicTestScope;
}

/**
 * Toutes les sources de bonus de MAGIE aux tests du personnage, capacités et objets PORTÉS
 * confondus (PER-275 / PER-134) :
 *  - capacités dont l'option retenue porte un `abilityTestBonus` marqué `magic` (Tatouages,
 *    barbare `pagne-r3`, p. 80) → portée carac ;
 *  - objets portés (`ItemTestBonuses`) → portée carac ou domaine selon la cible saisie.
 *
 * Aucun arbitrage ici : la collecte est brute, le non-cumul est appliqué par
 * `resolveTestBonus`, qui a besoin de voir les sources écartées pour les afficher barrées.
 * Sans `ctx`, les options retenues ne sont pas résolues (appels « catalogue seul »).
 */
export function magicTestBonusSources(
  featureIds: string[],
  equipment: EquipmentLine[] = [],
  ctx?: EffectContext,
): MagicTestSource[] {
  const out: MagicTestSource[] = [];
  // (a) Capacités : on repasse par l'agrégation existante des bonus aux tests d'UNE carac et on
  // ne retient que celles marquées « bonus de magie » (les autres, ex. Prescience, restent des
  // bonus ordinaires qui se cumulent librement).
  const byAbility = abilityTestBonusByAbility(featureIds, ctx);
  for (const [ability, sources] of Object.entries(byAbility) as [
    AbilityId,
    AbilityTestBonusSource[],
  ][]) {
    for (const s of sources) {
      if (!s.magic) continue;
      out.push({
        name: s.name,
        featureId: s.featureId,
        value: s.value,
        scope: { kind: 'ability', ability },
      });
    }
  }
  // (b) Objets PORTÉS : un objet magique est magique par nature, aucun marqueur à poser.
  const items = testBonusSourcesFromEquipment(equipment);
  for (const [ability, sources] of Object.entries(items.byAbility) as [
    AbilityId,
    { name: string; value: number }[],
  ][]) {
    for (const s of sources)
      out.push({ name: s.name, value: s.value, scope: { kind: 'ability', ability } });
  }
  for (const [domain, sources] of Object.entries(items.byDomain) as [
    string,
    { name: string; value: number }[],
  ][]) {
    for (const s of sources)
      out.push({ name: s.name, value: s.value, scope: { kind: 'domain', domain } });
  }
  return out;
}

/**
 * Les bonus aux tests d'une caractéristique qui se cumulent LIBREMENT — c'est-à-dire tous sauf
 * les bonus de magie, arbitrés à part par `resolveTestBonus`. Garde-fou d'appel : additionner
 * les deux listes compterait un bonus de magie deux fois, et lui ferait perdre son non-cumul.
 */
export function freelyStackingAbilityTestBonuses(
  sources: AbilityTestBonusSource[] = [],
): AbilityTestBonusSource[] {
  return sources.filter((s) => !s.magic);
}

/** Bonus total d'un test après cumul des bonus de compétence et arbitrage des bonus de magie. */
export interface ResolvedTestBonus {
  /**
   * Bonus PLAT du test : bonus de compétence des voies (p. 203) + bonus de magie retenu s'il
   * est de portée DOMAINE. C'est le chiffre affiché sur la ligne d'un domaine, carac exclue.
   */
  flat: number;
  /**
   * Bonus de magie retenu quand il est de portée CARAC (0 sinon). Il vaut pour le test de carac
   * NU comme pour les domaines de cette carac : à ajouter au moment où l'on inclut la carac —
   * d'où sa séparation de `flat`.
   */
  abilityMagic: number;
  /** La source de magie RETENUE (la plus forte), pour la ligne de détail. `null` si aucune. */
  keptMagic: MagicTestSource | null;
  /** Sources de magie ÉCARTÉES car non cumulables, pour l'affichage barré. */
  dominatedMagic: MagicTestSource[];
  /** Le plafond de +15 a-t-il mordu sur le total (compétence + magie) ? */
  capped: boolean;
}

/**
 * Bonus total d'UN test — la seule fonction à consulter pour chiffrer un test, parce qu'elle
 * seule connaît les deux règles de cumul qui s'y croisent :
 *
 *  1. les **bonus de compétence** des voies sont déjà cumulés par `testBonusSources` (max par
 *     catégorie de source, maxima sommés, p. 203) et arrivent ici via `competence` ;
 *  2. les **bonus de magie** (capacité marquée + objets magiques portés) NE SE CUMULENT PAS
 *     entre eux : on retient le plus fort et on écarte les autres (p. 80, note des Tatouages :
 *     un bonus de magie « ne peut pas se cumuler à un bonus fourni par un objet magique » ;
 *     p. 203 : « les bonus de compétence ne s'additionnent que lorsqu'ils proviennent de
 *     sources différentes » — deux objets magiques sont une même source). Deux objets portés
 *     bonifiant le même test ne se somment donc pas.
 *
 * Les deux familles, elles, S'ADDITIONNENT (p. 203 : le bonus d'un objet magique « peut se
 * cumuler avec n'importe quel bonus de compétence »), sous le plafond commun de +15 — que
 * l'objet magique ne permet pas non plus de dépasser (même page).
 *
 * L'arbitrage se fait PAR TEST (couple carac × domaine) et pas par domaine : un domaine
 * multi-carac (ex. Équitation CON/CHA) est testé sous l'une ou l'autre carac selon l'action, et
 * un bonus de magie de portée carac ne vaut que pour la sienne. `domain` omis = test de carac
 * NU (aucun bonus de compétence, seules les sources de portée carac s'appliquent).
 *
 * Conséquence assumée du « on retient le plus fort » : un MALUS de magie (objet maudit) est
 * écarté dès qu'un bonus de magie plus élevé s'applique au même test — c'est le comportement
 * de toutes les catégories de source du moteur, et il reste visible barré dans le détail.
 */
export function resolveTestBonus({
  competence,
  magic,
  ability,
  domain,
}: {
  /** Bonus de compétence du domaine (cf. `testBonusSources`), absent si le domaine n'en a aucun. */
  competence?: TestDomainBonus;
  /** Toutes les sources de magie du personnage (cf. `magicTestBonusSources`). */
  magic: MagicTestSource[];
  /** Caractéristique sous laquelle le test est lancé. */
  ability: AbilityId;
  /** Domaine testé, ou omis pour un test de carac nu. */
  domain?: string;
}): ResolvedTestBonus {
  const applicable = magic.filter((s) =>
    s.scope.kind === 'ability' ? s.scope.ability === ability : s.scope.domain === domain,
  );
  // Non-cumul : une seule source de magie compte, la plus forte (à égalité, la première
  // rencontrée — les capacités sont collectées avant les objets, donc elles gardent la main).
  let kept: MagicTestSource | null = null;
  for (const s of applicable) if (!kept || s.value > kept.value) kept = s;
  const dominatedMagic = applicable.filter((s) => s !== kept);

  const competenceTotal = competence?.total ?? 0;
  // `competence.total` est DÉJÀ plafonné : quand il l'était, le total plafonné reste +15 quoi
  // qu'on ajoute, et sinon il vaut le total brut — recaper la somme donne le bon résultat dans
  // les deux cas, sans avoir besoin d'exposer le total brut.
  const rawTotal = competenceTotal + (kept?.value ?? 0);
  const cappedTotal = Math.min(rawTotal, COMPETENCE_BONUS_CAP);
  // Le plafond mord sur la somme des deux familles ; on l'impute au terme de portée carac en
  // dernier, pour que le chiffre du domaine (`flat`) reste celui qu'on lit sur sa ligne.
  const flat =
    kept?.scope.kind === 'domain' ? cappedTotal : Math.min(competenceTotal, COMPETENCE_BONUS_CAP);
  return {
    flat,
    abilityMagic: cappedTotal - flat,
    keptMagic: kept,
    dominatedMagic,
    // Le plafond peut avoir mordu dès les seuls bonus de compétence (`competence.capped`) : on
    // ne perd pas ce signalement en ajoutant la magie par-dessus.
    capped: (competence?.capped ?? false) || rawTotal > COMPETENCE_BONUS_CAP,
  };
}

// ---------------------------------------------------------------------------
// Immunités (PER-103)
// ---------------------------------------------------------------------------

/** Une immunité agrégée pour le personnage, avec ses sources. */
export interface ImmunitySource {
  id: ImmunityId;
  /** Libellé français (cf. `IMMUNITY_LABELS`). */
  label: string;
  /** Sources qui l'accordent (nom ; `featureId` pour la voie d'origine d'une capacité, ABSENT pour
   *  un OBJET magique — Action libre, PER-307), pour le détail au survol. */
  sources: { featureId?: string; name: string }[];
}

/**
 * Immunités accordées par les capacités acquises (effet `immunity`) ET par les OBJETS magiques PORTÉS
 * (propriété Action libre → ralenti/immobilisé/paralysé, p. 253, PER-307), dédupliquées par id et
 * accompagnées de leurs sources. Ordre stable suivant `IMMUNITY_LABELS`. Sans `equipment` (appels
 * « catalogue seul »), seules les capacités comptent.
 */
export function aggregateImmunities(
  featureIds: string[],
  equipment: EquipmentLine[] = [],
): ImmunitySource[] {
  // Map immId → (clé de dédup → source). Clé = featureId d'une capacité, ou nom d'objet préfixé
  // pour un objet magique (aucun featureId), afin de ne pas fondre deux sources distinctes.
  const byId = new Map<ImmunityId, Map<string, { featureId?: string; name: string }>>();
  const add = (imm: ImmunityId, key: string, source: { featureId?: string; name: string }) => {
    const map = byId.get(imm) ?? new Map<string, { featureId?: string; name: string }>();
    map.set(key, source);
    byId.set(imm, map);
  };
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind !== 'immunity') continue;
      for (const imm of e.immunities) add(imm, feature.id, { featureId: feature.id, name: feature.name });
    }
  }
  for (const line of equipment) {
    if (!line.worn) continue;
    const name = lineDisplayName(line);
    for (const imm of magicImmunities(line)) add(imm, `item:${name}`, { name });
  }
  return (Object.keys(IMMUNITY_LABELS) as ImmunityId[])
    .filter((immId) => byId.has(immId))
    .map((immId) => ({
      id: immId,
      label: IMMUNITY_LABELS[immId],
      sources: [...byId.get(immId)!.values()],
    }));
}

/** Une réduction de dégâts ACTIVE octroyée par une capacité, avec sa capacité source (PER-126). */
export interface DamageReductionSource {
  /** Capacité source ; ABSENT quand la RD est portée par un OBJET magique (PER-307) — le détail
   *  la rend alors en libellé texte, comme les apports de caracs/tests des objets (PER-272/275). */
  featureId?: string;
  /** Nom de la capacité OU de l'objet source (français). */
  name: string;
  reduction: DamageReduction;
}

/**
 * Réductions de dégâts (RD) ACTIVES du personnage (PER-126), pour l'affichage à côté de la Défense.
 * Une RD est retenue si sa capacité est PASSIVE (aucun effet conditionnel → toujours active, ex. Peau
 * d'acier), ou si la capacité porte un effet conditionnel ACTIF (ex. Armure de pierre / Déphasage, dont
 * la RD suit l'interrupteur). La RD reste « non lue par le moteur » pour les calculs ; il s'agit d'un
 * affichage informatif. La valeur scalante éventuelle est résolue par l'UI (toutes constantes à ce jour).
 */
export function damageReductionSources(character: Character): DamageReductionSource[] {
  const pathRanks = pathRanksFromFeatures(character.featureIds);
  const ctx = effectContext(character);
  const out: DamageReductionSource[] = [];
  // Capacité de Voie du bouclier sans bouclier manié (PER-142) : sa RD (retrait de DM des attaques
  // de zone, Défense au bouclier) ne compte plus tant qu'aucun bouclier n'est porté. Cet agrégateur
  // lit `character` directement (hors `activeFeatureIdsForMods`), d'où le filtrage explicite ici.
  const shieldDisabled = shieldDisabledFeatureIds(character, rulesContext);
  // PER-370 : capacité grisée par exclusion mutuelle OU remplacement inconditionnel (`replacesFeatures`,
  // patron Grand félin/armure sacrée : l'armure d'argent supplante le bronze, sa RD cesse de compter).
  const disabled = disabledFeatureIds(character);
  // Capacités acquises ET empruntées : une capacité empruntée fonctionne comme une capacité normale,
  // sa RD comprise (PER-73). Son rang se résout sur la VOIE A (cf. `borrowedHostPaths`).
  for (const id of effectiveFeatureIdsForMods(character)) {
    if (shieldDisabled.has(id) || disabled.has(id)) continue;
    const feature = featureById.get(id);
    if (!feature?.damageReduction) continue;
    const rankPathId = ctx.borrowedHostPaths?.get(id) ?? feature.pathId;
    const conditionalIndexes = (feature.effects ?? [])
      .map((e, i) => (e.kind === 'conditional-stat-bonus' ? i : -1))
      .filter((i) => i >= 0);
    // Capacité passive (aucun effet conditionnel) → RD permanente. Sinon, RD affichée seulement si
    // l'un de ses interrupteurs conditionnels est actif.
    const active =
      conditionalIndexes.length === 0 || conditionalIndexes.some((i) => isEffectActive(character, id, i));
    if (!active) continue;
    // Une capacité peut porter PLUSIEURS entrées de RD (tableau, PER-137).
    const entries = Array.isArray(feature.damageReduction) ? feature.damageReduction : [feature.damageReduction];
    const rank = pathRanks[rankPathId] ?? 0;
    for (const dr of entries) {
      // Gating CROSS-CAPACITÉ (PER-74) : RD active seulement si l'interrupteur d'une AUTRE capacité
      // (la forme porteuse) est actif — ex. la RD hybride de r7 suit l'interrupteur de r4 (Forme hybride).
      if (
        dr.requiresActiveEffect &&
        !isEffectActive(character, dr.requiresActiveEffect.featureId, dr.requiresActiveEffect.index)
      )
        continue;
      // Gating par RANG de voie (ex. Invulnérable : ÷2 poison/maladie ≤ r4, immunité ≥ r5).
      if (dr.minPathRank !== undefined && rank < dr.minPathRank) continue;
      if (dr.maxPathRank !== undefined && rank > dr.maxPathRank) continue;
      // Gating par ÉLÉMENT RÉSOLU (PER-74) : une entrée propre à une seule branche d'une capacité à
      // interrupteur partagé (élémentaliste r8 : RD 10 sous la forme Air seulement, contre RD 5 pour
      // les 3 autres) — cf. `DamageReduction.requiresElement`.
      if (dr.requiresElement && resolveFeatureElement(character, feature)?.id !== dr.requiresElement) continue;
      // SCOPE choisi à la table (ex. Maîtrise des éléments) : la RD n'est comptée que si un élément
      // valide est sélectionné (`effectInputs[id]`, hors mode édition) ; ce choix devient le scope.
      let scopes = dr.scopes;
      if (dr.scopeChoice) {
        const chosen = character.effectInputs?.[id];
        if (!chosen || !(dr.scopeChoice as string[]).includes(chosen)) continue;
        scopes = [chosen as (typeof dr.scopeChoice)[number]];
      } else if (dr.scopeFromChoice !== undefined) {
        // SCOPE dérivé d'un CHOIX PERMANENT de construction (ex. Ascendance draconique, PER-138) : la
        // portée est l'énergie retenue au choix `option` d'index `scopeFromChoice` (`featureChoices`).
        // RD comptée seulement si le choix est fait et valide.
        const chosen = getOptionSelections(character, id, dr.scopeFromChoice)[0];
        if (!chosen || !(RESISTIBLE_DAMAGE_TYPES as readonly string[]).includes(chosen)) continue;
        scopes = [chosen as ResistibleDamageType];
      } else if (dr.scopeFromElement) {
        // SCOPE dérivé de l'ÉLÉMENT DRACONIQUE de la capacité (PER-74) — un choix porté par une AUTRE
        // capacité (la couleur du drake, sur Monture fantastique). Pendant cross-capacité de
        // `scopeFromChoice`. Sans couleur retenue, la RD n'existe PAS (pas de repli sur le feu :
        // décision propriétaire, une voie non déclinée n'accorde rien tant que la couleur manque).
        const element = resolveFeatureElement(character, feature);
        if (!element) continue;
        scopes = [element.id];
      }
      // Résolution de la valeur scalante (ex. Fils du roc 2 → 3 au niveau 10 ; Résistance au feu 5 → 10
      // au rang 7) pour l'affichage. Une constante est rendue telle quelle ; le plafond d'absorption
      // éventuel reste verbatim (non affiché dans la puce).
      const value =
        dr.value === undefined ? undefined : (resolveValue(dr.value, rankPathId, pathRanks, ctx) ?? dr.value);
      // Nom DÉCLINÉ (PER-74) : la puce de RD du cadre « Défense » doit lire « Résistance à la foudre »
      // sous un drake bleu, pas le titre imprimé « Résistance au feu » au-dessus d'une portée `lightning`.
      const name = declineForFeature(character, feature, feature.name);
      out.push({ featureId: id, name, reduction: { ...dr, value, scopes } });
    }
  }
  // RD portées par les OBJETS magiques PORTÉS (Défense/Défense sup → RD plate ; Résistance [substance] X
  // → RD typée ; Protection → ÷2 sur les critiques/sournoises ; p. 253, PER-307). Émises dans la MÊME
  // forme que les capacités pour être cumulées par `stackedDamageReductions` (une Défense RD 2 s'additionne
  // à une Peau d'acier). Sans `featureId` : l'objet n'appartient à aucune voie.
  for (const line of character.equipment ?? []) {
    if (!line.worn) continue;
    const name = lineDisplayName(line);
    for (const reduction of magicDamageReductions(line)) out.push({ name, reduction });
  }
  return out;
}

/** Une réduction de dégâts AGRÉGÉE par (type, portée), avec ses capacités sources (PER-137). */
export interface StackedDamageReduction {
  kind: DamageReduction['kind'];
  /** Type de dégât couvert ; absent = tous les DM. */
  scope?: ResistibleDamageType;
  /**
   * Valeur agrégée : SOMME des réductions plates de même portée (`flat` — le livre : « cumulable avec
   * d'autres sources de réduction comme la peau d'acier ») ; diviseur (`divide`) ; absent (`immunity`).
   */
  total?: number;
  /**
   * Protection SITUATIONNELLE : verbatim court du type d'AGRESSEUR contre lequel elle joue
   * (cf. `DamageReduction.againstAggressors`, PER-74). Présent = le badge de la carte Défense passe
   * en variante situationnelle. Une entrée situationnelle ne se REGROUPE jamais avec une protection
   * permanente de même portée, ni avec une autre condition d'agresseur.
   */
  againstAggressors?: string;
  /** Sources qui contribuent (nom + valeur individuelle ; `featureId` pour la voie d'origine d'une
   *  capacité, ABSENT pour un objet magique) — pour le breakdown de la carte Défense. */
  sources: { featureId?: string; name: string; value?: number }[];
}

/**
 * Réductions de dégâts ACTIVES du personnage, AGRÉGÉES pour l'affichage (PER-137) : les RD PLATES de
 * MÊME portée s'ADDITIONNENT en une seule entrée (ex. Fils du roc + Peau d'acier → RD 6), avec le
 * détail des sources. Division et immunité ne s'additionnent pas (regroupées par portée, et par valeur
 * pour la division, afin de fusionner les sources identiques sans cumuler les diviseurs). Une RD sur
 * plusieurs types est éclatée en une entrée PAR type. Source unique pour les badges de la carte Défense.
 */
export function stackedDamageReductions(character: Character): StackedDamageReduction[] {
  const entries = damageReductionSources(character).flatMap((s) => {
    const scopes = s.reduction.scopes ?? [];
    const perScope: (ResistibleDamageType | undefined)[] = scopes.length ? scopes : [undefined];
    return perScope.map((scope) => ({
      featureId: s.featureId,
      name: s.name,
      kind: s.reduction.kind,
      scope,
      value: typeof s.reduction.value === 'number' ? s.reduction.value : undefined,
      againstAggressors: s.reduction.againstAggressors,
    }));
  });
  const groups = new Map<string, typeof entries>();
  for (const e of entries) {
    // La condition d'AGRESSEUR (PER-74) entre dans la clé de regroupement : une immunité au poison
    // qui ne joue que contre les morts-vivants ne se fond PAS dans une immunité au poison permanente
    // (elles ne protègent pas de la même chose), et deux conditions distinctes restent distinctes.
    const suffix = e.againstAggressors ? `|vs:${e.againstAggressors}` : '';
    const key =
      e.kind === 'flat'
        ? `flat|${e.scope ?? ''}${suffix}`
        : `${e.kind}|${e.scope ?? ''}|${e.value ?? ''}${suffix}`;
    const arr = groups.get(key);
    if (arr) arr.push(e);
    else groups.set(key, [e]);
  }
  const out: StackedDamageReduction[] = [];
  for (const list of groups.values()) {
    const { kind, scope, againstAggressors } = list[0];
    if (kind === 'flat') {
      out.push({
        kind,
        scope,
        againstAggressors,
        total: list.reduce((acc, e) => acc + (e.value ?? 0), 0),
        sources: list.map((e) => ({ featureId: e.featureId, name: e.name, value: e.value })),
      });
    } else if (kind === 'divide') {
      out.push({
        kind,
        scope,
        againstAggressors,
        total: list[0].value,
        sources: list.map((e) => ({ featureId: e.featureId, name: e.name })),
      });
    } else {
      out.push({
        kind,
        scope,
        againstAggressors,
        sources: list.map((e) => ({ featureId: e.featureId, name: e.name })),
      });
    }
  }
  return out;
}

/** Une plage de critique ACTIVE octroyée par une capacité OU une arme équipée, valeur résolue (PER-133/225). */
export interface CriticalRangeSource {
  /**
   * Capacité d'origine, si la source EST une capacité. ABSENT quand la source est l'arme
   * elle-même (plage intrinsèque de la rapière / vivelame, PER-225) : le badge retombe alors
   * sur le `name` en texte simple, faute de puce de voie.
   */
  featureId?: string;
  /** Nom de la capacité ou de l'arme (français). */
  name: string;
  /** Portée concernée (cf. `CriticalRange`). */
  scope: CriticalRange['scope'];
  /** Élargissement RÉSOLU (points retranchés à 20) : 1 → 19-20, 2 → 18-20. */
  value: number;
}

/**
 * La condition d'ARME d'une plage de critique (PER-136/236) est-elle satisfaite par l'arme PORTÉE
 * passée en argument (arme de contact pour une plage `melee`, arme à distance pour une plage
 * `ranged`, choisie par l'appelant selon `crit.scope`) ? `unarmed` renvoie TOUJOURS `false` ici : la
 * plage à mains nues est décrite par la vue « mains nues » de la carte d'attaque (`unarmedStrike`),
 * pas par `criticalRangeSources` (qui décrit la vue « arme »). `rangedKinds` vérifie que l'arme à
 * distance portée est d'un des sous-types voulus (arbalète, arc… — Science du critique de l'arquebusier,
 * Archer émérite de l'elfe). `weaponFamiliesFromChoice` lit les familles choisies sur la capacité
 * `choiceFeatureId` (choix `option` à l'index 0, ex. Armes de prédilection `maitre-d-armes-r1`) et
 * vérifie que l'arme portée en partage au moins une (`weaponFamilies`).
 */
function weaponCriticalConditionMet(
  condition: WeaponCriticalCondition,
  weapon: Weapon | null,
  character: Character,
): boolean {
  switch (condition.kind) {
    case 'unarmed':
      return false;
    case 'weaponCategory':
      return weapon?.weaponCategory === condition.category;
    // PER-74 — « avec toutes les armes à deux mains » (Critique destructeur, p. 146) : on suit la
    // PRISE réelle et non la seule catégorie, donc une épée bâtarde tenue à deux mains compte.
    case 'twoHandedMelee':
      return isTwoHandedMeleeWeaponWielded(
        character.equipment,
        oneHandableWeaponFamilies(character.featureIds),
        baseAncestrySize(character.ancestryId) === 'petite',
      );
    case 'rangedKinds':
      return (
        !!weapon?.ranged && !!weapon.rangedKind && condition.rangedKinds.includes(weapon.rangedKind)
      );
    case 'weaponFamiliesFromChoice':
      return weaponFamiliesMatchChoice(character, weapon?.weaponFamilies, condition.choiceFeatureId);
  }
}

/**
 * Plages de critique élargies ACTIVES du personnage (PER-133/136), pour l'affichage sous les cartes
 * Attaque au contact / à distance. Une capacité PASSIVE (aucune condition) accorde une plage
 * PERMANENTE (Briseur d'os, Tir précis) ; une capacité dont l'élargissement est CONDITIONNÉ AU TYPE
 * D'ARME (`criticalRange.weaponCondition`, PER-136) est activée AUTOMATIQUEMENT d'après l'arme de
 * contact réellement portée (Science du critique = arme de prédilection, Frappe chirurgicale = arme
 * légère ; Morsure du serpent = mains nues, IGNORÉE ici car rendue par la vue mains nues) ; enfin une
 * capacité à interrupteur d'état indépendant de l'arme (Écuyer « en vie ») n'est retenue que tant que
 * son interrupteur reste actif. La valeur scalante éventuelle (Tir précis : 1 puis 2 au rang 5) est
 * résolue ici. Donnée informative, non lue par le moteur (aucun jet simulé).
 */
export function criticalRangeSources(
  character: Character,
  options?: {
    /**
     * PER-116 — arme de CONTACT à évaluer, en remplacement de l'arme canonique (main principale
     * prioritaire). Sert à calculer la plage de critique de la MAIN SECONDAIRE quand le personnage
     * combat à deux armes : la carte d'attaque au contact affiche une ligne par main, chacune avec
     * SA plage (une rapière 19-20 en main principale et une dague 20 en main secondaire ne peuvent
     * pas partager un badge unique). Absent = arme canonique, comportement historique.
     */
    meleeWeapon?: Weapon | null;
  },
): CriticalRangeSource[] {
  const pathRanks = pathRanksFromFeatures(character.featureIds);
  const ctx = effectContext(character);
  const out: CriticalRangeSource[] = [];
  // Armes réellement PORTÉES (résolveurs canoniques `wornMeleeWeapon`/`wornRangedWeapon`, PER-76/77) :
  // servent à évaluer les conditions d'arme (PER-136/236) ET les plages intrinsèques d'arme (PER-225).
  // L'arme évaluée dépend de la PORTÉE de la plage : au contact → arme de contact, à distance → arme
  // à distance (arbalète de l'arquebusier, arc de l'elfe).
  const meleeWeapon =
    options?.meleeWeapon !== undefined ? options.meleeWeapon : wornMeleeWeapon(character.equipment ?? []);
  const rangedWeapon = wornRangedWeapon(character.equipment ?? []);
  // Capacités DÉSACTIVÉES par un interrupteur actif (ex. rage/furie du berserk, p. 82) : leur plage
  // de critique ne compte plus non plus.
  const disabledIds = disabledFeatureIds(character);
  // Capacités acquises ET empruntées : une capacité empruntée fonctionne comme une capacité normale,
  // sa plage de critique comprise (PER-73). Son rang se résout sur la VOIE A (cf. `borrowedHostPaths`).
  for (const id of effectiveFeatureIdsForMods(character)) {
    if (disabledIds.has(id)) continue;
    const feature = featureById.get(id);
    if (!feature?.criticalRange) continue;
    const crit = feature.criticalRange;
    if (crit.weaponCondition) {
      // PER-136/236 : activation AUTOMATIQUE d'après l'arme portée (contact OU distance selon `scope`),
      // sans interrupteur manuel.
      const conditionWeapon = crit.scope === 'ranged' ? rangedWeapon : meleeWeapon;
      if (!weaponCriticalConditionMet(crit.weaponCondition, conditionWeapon, character)) continue;
    } else {
      // Plage permanente, ou pilotée par un interrupteur d'état indépendant de l'arme (Écuyer « en
      // vie ») : retenue tant qu'aucun interrupteur conditionnel n'est explicitement coupé.
      const conditionalIndexes = (feature.effects ?? [])
        .map((e, i) => (e.kind === 'conditional-stat-bonus' ? i : -1))
        .filter((i) => i >= 0);
      const active =
        conditionalIndexes.length === 0 || conditionalIndexes.some((i) => isEffectActive(character, id, i));
      if (!active) continue;
    }
    const rankPathId = ctx.borrowedHostPaths?.get(id) ?? feature.pathId;
    const value = resolveValue(crit.value, rankPathId, pathRanks, ctx);
    if (value === null || value <= 0) continue;
    out.push({ featureId: id, name: feature.name, scope: crit.scope, value });
  }
  // Plage de critique INTRINSÈQUE de l'arme tenue en main (PER-225) — rapière, vivelame (19-20,
  // p. 183). Source d'affichage SUPPLÉMENTAIRE, cumulée avec les capacités par `combineCriticalRanges`.
  // N'apparaît que si l'arme concernée est réellement portée en main : déséquiper l'arme retire la
  // puce. Sur une arme, `value` est un littéral fixe (pas de rang → pas de valeur scalante). Les deux
  // portées sont couvertes (arme de contact ET arme à distance portées).
  const meleeWeaponCrit = meleeWeapon?.criticalRange;
  if (meleeWeaponCrit && typeof meleeWeaponCrit.value === 'number' && meleeWeaponCrit.value > 0) {
    out.push({ name: meleeWeapon!.name, scope: meleeWeaponCrit.scope, value: meleeWeaponCrit.value });
  }
  const rangedWeaponCrit = rangedWeapon?.criticalRange;
  if (rangedWeaponCrit && typeof rangedWeaponCrit.value === 'number' && rangedWeaponCrit.value > 0) {
    out.push({ name: rangedWeapon!.name, scope: rangedWeaponCrit.scope, value: rangedWeaponCrit.value });
  }
  return out;
}
