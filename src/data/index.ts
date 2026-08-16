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
import { ancestries as ancestriesBase } from './ancestries';
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
import {
  FEATURE_CLASSIFICATIONS,
  FEATURE_NATURE_TAGS,
  CONDITIONAL_KINDS,
  type FeatureClassification,
  type FeatureNatureTag,
  type ConditionalKind,
} from './feature-classification';
import {
  mergeEntries,
  mergeAncestryPathLinks,
  markPathsPaid,
  bumpContentVersion,
  type ContentBundle,
  type MergeReport,
} from './contentRegistry';

// --- Règles transverses ------------------------------------------------------
export { families, valueSets, progression, COIN_POUCH_ITEM_NAME, idealsFlaws };

// --- Peuples -----------------------------------------------------------------
// Copie POSSÉDÉE par ce module (et non ré-export direct de `./ancestries`) : c'est
// dans ce tableau que le contenu payant est fusionné en place (voir
// `registerContentBundle`), sans muter le fichier de données de base.
export const ancestries: Ancestry[] = [...ancestriesBase];

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

// --- Montures, véhicules & bardes (PER-216, p. 191) --------------------------
export { mounts, mountById, bardes, bardeById } from './mounts';
export type { MountCatalogEntry, BardeCatalogEntry, MountKind } from './mounts';

// --- Domaines de compétence (PER-89) -----------------------------------------
export { testDomains, testDomainById };

// --- Panthéon d'Osgild — dieux du prêtre spécialiste (p. 126-127) ------------
export { priestGods, priestGodById };

// --- Familiers fantastiques — voie du familier fantastique (p. 133-136) -------
export { fantasticFamiliars, fantasticFamiliarById };

// --- Bestiaire — désormais servi depuis la base de données (PER-241) ---------
// `creatures.ts` reste l'artefact d'extraction (lu par le script d'ingestion
// `scripts/ingest-bestiary.ts`), mais N'EST PLUS ré-exporté ici : le navigateur
// ne l'embarque plus dans son bundle — il lit le bestiaire via le store `bestiary`
// (deux étages, RLS lecture publique du contenu gratuit).

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

// --- Augmentation à l'exécution (contenu payant gaté, PER-321) ---------------
/**
 * Fusionne un lot de contenu (peuples, profils, voies, capacités, équipement) dans
 * les registres de base EN PLACE : les tableaux et `Map` exportés ci-dessus gardent
 * leurs références, si bien que tout consommateur synchrone (`.get(id)`, itération)
 * voit immédiatement les nouvelles entrées sans changer d'une ligne.
 *
 * Politique **additive, base gagne** (voir `mergeEntries`) : le contenu payant ne
 * peut qu'AJOUTER des entrées, jamais écraser une règle du livre de base. Idempotente
 * — la rejouer (ex. cache + réseau) n'ajoute rien. La version de contenu n'est bumpée
 * que si au moins une entrée a réellement été ajoutée (les abonnés ne se re-rendent
 * pas pour rien).
 *
 * SÉCURITÉ LÉGALE : cette fonction est data-agnostique ; elle ne connaît aucun
 * contenu payant. Le lot lui est fourni par le chargeur gaté (auth + entitlement),
 * jamais embarqué dans le bundle.
 */
export function registerContentBundle(bundle: ContentBundle): MergeReport {
  const reports = [
    mergeEntries({ list: ancestries, byId: ancestryById }, bundle.ancestries),
    mergeEntries({ list: classes, byId: classById }, bundle.classes),
    mergeEntries({ list: paths, byId: pathById }, bundle.paths),
    mergeEntries({ list: features, byId: featureById }, bundle.features),
    mergeEntries({ list: equipment, byId: equipmentById }, bundle.equipment),
  ];
  // Liens voie↔peuple (PER-324) : rattachement ADDITIF d'une voie payante à un peuple existant
  // (`ancestryById` porte les mêmes instances que la base — la mutation est vue par tous les
  // consommateurs). Compté dans le total pour qu'un lot qui n'apporterait QUE des liens bump quand même.
  const linksAdded = mergeAncestryPathLinks(ancestryById, bundle.ancestryPathLinks);
  // Badge « Compagnon » (PER-419 retours) : toute voie d'un lot payant est marquée, que son
  // entrée ait été effectivement ajoutée ou ignorée (déjà présente — cas non censé arriver
  // vu la politique additive, mais sans risque de la marquer quand même dans ce cas).
  if (bundle.paths) markPathsPaid(bundle.paths.map((p) => p.id));
  const added = reports.reduce((sum, r) => sum + r.added, 0) + linksAdded;
  const skipped = reports.flatMap((r) => r.skipped);
  if (added > 0) {
    bumpContentVersion();
    stashBundleForHotReload(bundle);
  }
  return { added, skipped };
}

// ── Robustesse DÉVELOPPEMENT / Fast Refresh ─────────────────────────────────────
// Turbopack (bundler par défaut depuis Next 16) réexécute ce module dès qu'un
// fichier qu'il importe transitivement change (schéma, peuples, équipement...), ce
// qui réinitialise `ancestries`/`paths`/`features`/`equipment` à leur valeur de
// base : le contenu payant déjà fusionné (peuples/voies gatés) disparaît alors, et
// comme le boot (`PaidContentBoot`, `useEffect([])`) n'est pas rejoué, rien ne le
// re-fusionne → la fiche affiche « Aucune capacité acquise. ».
//
// On stashe donc chaque bundle réellement fusionné sur `globalThis`, qui — contrairement
// aux `let`/`const` de ce module — SURVIT à la ré-exécution du module par HMR (même
// onglet de navigateur). Au (re)chargement du module, on rejoue immédiatement le stash :
// la fusion réapparaît de façon SYNCHRONE, avant même le premier rendu qui suit le Fast
// Refresh. Idempotent (politique « base gagne » de `mergeEntries`) donc sans risque de
// doublon. AUCUN effet en production (pas de HMR, le stash reste vide).
declare global {
  // eslint-disable-next-line no-var -- `var` requis pour une déclaration `global`.
  var __cof2PaidContentBundles: ContentBundle[] | undefined;
}

let isReplayingStash = false;

function stashBundleForHotReload(bundle: ContentBundle): void {
  if (process.env.NODE_ENV === 'production' || isReplayingStash) return;
  (globalThis.__cof2PaidContentBundles ??= []).push(bundle);
}

if (process.env.NODE_ENV !== 'production') {
  isReplayingStash = true;
  for (const bundle of globalThis.__cof2PaidContentBundles ?? []) {
    registerContentBundle(bundle);
  }
  isReplayingStash = false;
}

export {
  getContentVersion,
  subscribeContent,
  isContentLoading,
  setContentLoading,
  isPaidPathId,
} from './contentRegistry';
export type { ContentBundle };

export type { Family, ProgressionRules, ValueSet, IdealFlaw, Weapon, Armor, Shield, Gear, TestDomain, PriestGod, FantasticFamiliar };
export type { Creature, CreatureAttack, CreatureSpecialAbility, CreatureCategory, CreatureSize, CreatureNature };
export type { FeatureClassification, FeatureNatureTag, ConditionalKind };
