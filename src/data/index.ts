/**
 * Point d'entrée unique des données de règles CO2 (jalon J2).
 *
 * Agrège les fichiers par domaine en collections plates + quelques index de
 * lookup par id. Le moteur de calcul (J3) et l'UI (J4+) consomment ce module,
 * jamais les fichiers individuels.
 *
 * Intégrité référentielle (voieIds/capaciteIds/itemId/...) vérifiée par
 * `scripts/validate-data.ts`.
 */
import type {
  Weapon,
  Armor,
  Shield,
  Feature,
  EquipmentItem,
  Family,
  IdealFlaw,
  Gear,
  Ancestry,
  CharacterClass,
  ProgressionRules,
  ValueSet,
  Path,
  AncestryPath,
  PrestigePath,
  ClassPath,
  MagePath,
  TestDomain,
  PriestGod,
  FantasticFamiliar,
  Creature,
  CreatureAttack,
  CreatureSpecialAbility,
  CreatureCategory,
  CreatureSize,
  CreatureNature,
} from './schema';

import { families } from './families';
import { valueSets } from './value-sets';
import { progression, COIN_POUCH_ITEM_NAME } from './progression';
import { idealsFlaws } from './ideals-flaws';
import { ancestries } from './ancestries';
import { ancestryPaths, magePath, ancestryFeatures } from './ancestry-paths';
import { adventurerClasses, adventurerPaths, adventurerFeatures } from './classes/adventurers';
import { fighterClasses, fighterPaths, fighterFeatures } from './classes/fighters';
import { mageClasses, magePaths, mageFeatures } from './classes/mages';
import { mysticClasses, mysticPaths, mysticFeatures } from './classes/mystics';
import { prestigePaths1, prestigeFeatures1 } from './prestige-paths/part1';
import { prestigePaths2, prestigeFeatures2 } from './prestige-paths/part2';
import { weapons, armors, shields, gear } from './equipment';
import { priestGods, priestGodById } from './priest-gods';
import { testDomains, testDomainById } from './test-domains';
import { fantasticFamiliars, fantasticFamiliarById } from './fantastic-familiars';
import { creatures, creatureById } from './creatures';
import {
  FEATURE_CLASSIFICATIONS,
  FEATURE_NATURE_TAGS,
  CONDITIONAL_KINDS,
  type FeatureClassification,
  type FeatureNatureTag,
  type ConditionalKind,
} from './feature-classification';

// --- Règles transverses ------------------------------------------------------
export { families, valueSets, progression, COIN_POUCH_ITEM_NAME, idealsFlaws };

// --- Peuples -----------------------------------------------------------------
export { ancestries };

// --- Profils (concaténés, ordre des familles) --------------------------------
export const classes: CharacterClass[] = [
  ...adventurerClasses,
  ...fighterClasses,
  ...mageClasses,
  ...mysticClasses,
];

// --- Voies -------------------------------------------------------------------
export const classPaths: ClassPath[] = [
  ...adventurerPaths,
  ...fighterPaths,
  ...magePaths,
  ...mysticPaths,
];

export const prestigePaths: PrestigePath[] = [...prestigePaths1, ...prestigePaths2];

export { ancestryPaths, magePath };

/** Toutes les voies, tous types confondus. */
export const paths: Path[] = [
  ...classPaths,
  ...ancestryPaths,
  magePath,
  ...prestigePaths,
];

// --- Capacités (toutes voies confondues) -------------------------------------
export const features: Feature[] = [
  ...ancestryFeatures,
  ...adventurerFeatures,
  ...fighterFeatures,
  ...mageFeatures,
  ...mysticFeatures,
  ...prestigeFeatures1,
  ...prestigeFeatures2,
];

// --- Équipement --------------------------------------------------------------
export { weapons, armors, shields, gear };
export const equipment: EquipmentItem[] = [...weapons, ...armors, ...shields, ...gear];

// --- Domaines de compétence (PER-89) -----------------------------------------
export { testDomains, testDomainById };

// --- Panthéon d'Osgild — dieux du prêtre spécialiste (p. 126-127) ------------
export { priestGods, priestGodById };

// --- Familiers fantastiques — voie du familier fantastique (p. 133-136) -------
export { fantasticFamiliars, fantasticFamiliarById };

// --- Bestiaire — créatures du livre de base (PER-95, p. 259-303) -------------
export { creatures, creatureById };

// --- Classification analytique des capacités (PER-62) ------------------------
export { FEATURE_CLASSIFICATIONS, FEATURE_NATURE_TAGS, CONDITIONAL_KINDS };

// --- Index de lookup par id --------------------------------------------------
export const ancestryById = new Map<string, Ancestry>(ancestries.map((p) => [p.id, p]));
export const classById = new Map<string, CharacterClass>(classes.map((p) => [p.id, p]));
export const pathById = new Map<string, Path>(paths.map((v) => [v.id, v]));
export const featureById = new Map<string, Feature>(features.map((c) => [c.id, c]));
export const equipmentById = new Map<string, EquipmentItem>(equipment.map((e) => [e.id, e]));
export const featureClassificationById = new Map<string, FeatureClassification>(
  FEATURE_CLASSIFICATIONS.map((c) => [c.id, c]),
);

export type { Family, ProgressionRules, ValueSet, IdealFlaw, Weapon, Armor, Shield, Gear, TestDomain, PriestGod, FantasticFamiliar };
export type { Creature, CreatureAttack, CreatureSpecialAbility, CreatureCategory, CreatureSize, CreatureNature };
export type { FeatureClassification, FeatureNatureTag, ConditionalKind };
