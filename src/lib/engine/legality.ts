/**
 * Légalité des choix et conformité aux règles — module pur (PRD §5.4, §5.5).
 *
 * Deux usages :
 *  - `canAcquireFeature` : utilisé par le **wizard bloquant** — ne propose
 *    qu'un choix légal (rang dans l'ordre, niveau requis, accès prestige,
 *    plafond de voies).
 *  - `checkCompliance` : utilisé par la **fiche permissive** — liste les
 *    écarts aux règles sous forme d'avertissements NON bloquants.
 *
 * Règles : `creation-progression.md` §11-13 (p. 39-42) et `progression.ts`.
 *
 * Hors périmètre de ce module (volontaire) : le budget exact de points de
 * capacité (gratuit vs acheté, bonus de mage, points orphelins). Il dépend de
 * l'historique de création/montée de niveau que le wizard renseignera ; tant
 * qu'il n'est pas fiable, on n'émet aucun avertissement « points » pour éviter
 * les faux positifs. Voir TODO en bas.
 */
import { ABILITY_MAX, ABILITY_MIN } from '@/data/schema';
import type {
  Feature,
  AbilityId,
  Family,
  FamilyId,
  CharacterClass,
  ProgressionRules,
  Path,
} from '@/data/schema';
import type { Character } from '@/lib/character/types';

/** Données de règles injectées (testable avec des fixtures). */
export interface RulesContext {
  featureById: Map<string, Feature>;
  pathById: Map<string, Path>;
  classById: Map<string, CharacterClass>;
  familyById: Map<FamilyId, Family>;
  progression: ProgressionRules;
}

export interface LegalityResult {
  legal: boolean;
  reasons: string[];
}

export type WarningCode =
  | 'MISSING_RANK'
  | 'RANK_LEVEL_TOO_LOW'
  | 'ABILITY_OUT_OF_RANGE'
  | 'TOO_MANY_PATHS'
  | 'MULTIPLE_PRESTIGE'
  | 'PRESTIGE_LEVEL_TOO_LOW'
  | 'UNKNOWN_FEATURE';

export interface Warning {
  code: WarningCode;
  message: string;
  featureId?: string;
  pathId?: string;
}

/** Plafond de voies hors voie de peuple (p. 42 : « six voies, plus la voie de peuple »). */
export const MAX_NON_ANCESTRY_PATHS = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coût d'une capacité en points (rang 1-2 → 1, rang 3+ → 2 — p. 39). */
export function featureCost(feature: Feature, progression: ProgressionRules): number {
  return progression.costPerRank[feature.rank] ?? (feature.rank <= 2 ? 1 : 2);
}

function characterFamily(character: Character, ctx: RulesContext): Family | undefined {
  const characterClass = ctx.classById.get(character.classId);
  if (!characterClass) return undefined;
  return ctx.familyById.get(characterClass.familyId);
}

/**
 * Niveau minimum requis pour acquérir une capacité d'un rang donné.
 * Exception mage (p. 39) : un personnage de la famille des mages peut obtenir
 * une capacité de rang 2 dès le niveau 1 (le « 2* » de la table) ; cette
 * exception ne s'étend pas au rang 3.
 */
export function minLevelForRank(
  rank: number,
  family: Family | undefined,
  progression: ProgressionRules,
): number {
  if (rank === 2 && family?.id === 'mages') return 1;
  return progression.minLevelPerRank[rank] ?? 1;
}

/** Rangs effectivement possédés dans une voie, triés croissant. */
export function ownedRanks(character: Character, pathId: string, ctx: RulesContext): number[] {
  return character.featureIds
    .map((id) => ctx.featureById.get(id))
    .filter((c): c is Feature => !!c && c.pathId === pathId)
    .map((c) => c.rank)
    .sort((a, b) => a - b);
}

/** Voies (hors voie de peuple/voie du mage) actuellement entamées. */
function nonAncestryPaths(character: Character, ctx: RulesContext): Set<string> {
  const paths = new Set<string>();
  for (const id of character.featureIds) {
    const feature = ctx.featureById.get(id);
    if (!feature) continue;
    const path = ctx.pathById.get(feature.pathId);
    if (!path) continue;
    if (path.type === 'class' || path.type === 'prestige') paths.add(path.id);
  }
  return paths;
}

/** Voies de prestige actuellement entamées. */
function startedPrestigePaths(character: Character, ctx: RulesContext): Set<string> {
  const paths = new Set<string>();
  for (const id of character.featureIds) {
    const feature = ctx.featureById.get(id);
    const path = feature && ctx.pathById.get(feature.pathId);
    if (path && path.type === 'prestige') paths.add(path.id);
  }
  return paths;
}

// ---------------------------------------------------------------------------
// Légalité d'acquisition (wizard bloquant)
// ---------------------------------------------------------------------------

/**
 * Détermine si le personnage peut acquérir la capacité donnée, à son niveau
 * actuel. Retourne toutes les raisons d'illégalité (vide si légal).
 */
export function canAcquireFeature(
  character: Character,
  featureId: string,
  ctx: RulesContext,
): LegalityResult {
  const reasons: string[] = [];
  const feature = ctx.featureById.get(featureId);
  if (!feature) return { legal: false, reasons: [`Capacité inconnue : ${featureId}`] };

  if (character.featureIds.includes(featureId)) {
    reasons.push('Capacité déjà acquise.');
  }

  const path = ctx.pathById.get(feature.pathId);
  if (!path) {
    return { legal: false, reasons: [`Voie inconnue : ${feature.pathId}`] };
  }
  const family = characterFamily(character, ctx);

  // Ordre des rangs : tous les rangs inférieurs de la voie doivent être acquis.
  const ranks = ownedRanks(character, path.id, ctx);
  for (let r = (path.type === 'prestige' ? 4 : 1); r < feature.rank; r++) {
    if (!ranks.includes(r)) {
      reasons.push(`Rang ${r} de « ${path.name} » non acquis (rangs dans l'ordre).`);
    }
  }

  // Niveau requis par le rang.
  const requiredLevel = minLevelForRank(feature.rank, family, ctx.progression);
  if (character.level < requiredLevel) {
    reasons.push(`Niveau ${requiredLevel} requis pour un rang ${feature.rank} (niveau actuel ${character.level}).`);
  }

  // Règles spécifiques aux voies de prestige (p. 42).
  if (path.type === 'prestige') {
    if (character.level < ctx.progression.prestigeAccessLevel) {
      reasons.push(`Voie de prestige accessible au niveau ${ctx.progression.prestigeAccessLevel}.`);
    }
    const startedPrestige = startedPrestigePaths(character, ctx);
    if (startedPrestige.size > 0 && !startedPrestige.has(path.id)) {
      reasons.push('Une seule voie de prestige est autorisée sur toute la carrière.');
    }
  }

  // Plafond de voies (si l'on ouvre une nouvelle voie hors peuple).
  if (path.type === 'class' || path.type === 'prestige') {
    const paths = nonAncestryPaths(character, ctx);
    if (!paths.has(path.id) && paths.size >= MAX_NON_ANCESTRY_PATHS) {
      reasons.push(`Plafond de ${MAX_NON_ANCESTRY_PATHS} voies (hors voie de peuple) atteint.`);
    }
  }

  return { legal: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// Conformité (fiche permissive)
// ---------------------------------------------------------------------------

/**
 * Liste les écarts aux règles du personnage courant (avertissements non
 * bloquants). N'empêche jamais la sauvegarde — c'est l'UI qui les affiche.
 */
export function checkCompliance(character: Character, ctx: RulesContext): Warning[] {
  const warnings: Warning[] = [];
  const family = characterFamily(character, ctx);

  // Caractéristiques hors de la plage du livre (informatif).
  (Object.keys(character.abilities) as AbilityId[]).forEach((id) => {
    const v = character.abilities[id];
    if (v < ABILITY_MIN || v > ABILITY_MAX) {
      warnings.push({
        code: 'ABILITY_OUT_OF_RANGE',
        message: `${id} = ${v} hors de la plage du livre (${ABILITY_MIN} à ${ABILITY_MAX}).`,
      });
    }
  });

  // Regroupe les capacités possédées par voie.
  const ranksByPath = new Map<string, number[]>();
  for (const id of character.featureIds) {
    const feature = ctx.featureById.get(id);
    if (!feature) {
      warnings.push({ code: 'UNKNOWN_FEATURE', message: `Capacité inconnue : ${id}.`, featureId: id });
      continue;
    }
    const list = ranksByPath.get(feature.pathId) ?? [];
    list.push(feature.rank);
    ranksByPath.set(feature.pathId, list);
  }

  // Par voie : rangs manquants (trous) + niveau requis dépassé.
  for (const [pathId, ranks] of ranksByPath) {
    const path = ctx.pathById.get(pathId);
    if (!path) continue;
    const min = path.type === 'prestige' ? 4 : 1;
    const max = Math.max(...ranks);
    for (let r = min; r < max; r++) {
      if (!ranks.includes(r)) {
        warnings.push({
          code: 'MISSING_RANK',
          message: `« ${path.name} » : rang ${r} manquant alors que le rang ${max} est acquis (pas de voie à trous).`,
          pathId,
        });
      }
    }
    for (const r of ranks) {
      const requiredLevel = minLevelForRank(r, family, ctx.progression);
      if (character.level < requiredLevel) {
        warnings.push({
          code: 'RANK_LEVEL_TOO_LOW',
          message: `« ${path.name} » rang ${r} : niveau ${requiredLevel} requis (niveau actuel ${character.level}).`,
          pathId,
        });
      }
    }
  }

  // Plafond de voies.
  const nonAncestry = nonAncestryPaths(character, ctx);
  if (nonAncestry.size > MAX_NON_ANCESTRY_PATHS) {
    warnings.push({
      code: 'TOO_MANY_PATHS',
      message: `${nonAncestry.size} voies entamées (hors voie de peuple) ; le maximum est ${MAX_NON_ANCESTRY_PATHS}.`,
    });
  }

  // Voies de prestige : unicité et niveau d'accès.
  const prestige = startedPrestigePaths(character, ctx);
  if (prestige.size > 1) {
    warnings.push({
      code: 'MULTIPLE_PRESTIGE',
      message: `${prestige.size} voies de prestige entamées ; une seule est autorisée.`,
    });
  }
  if (prestige.size > 0 && character.level < ctx.progression.prestigeAccessLevel) {
    warnings.push({
      code: 'PRESTIGE_LEVEL_TOO_LOW',
      message: `Voie de prestige entamée avant le niveau ${ctx.progression.prestigeAccessLevel}.`,
    });
  }

  return warnings;
}

// TODO(moteur, J5/J7) : avertissement de budget de points de capacité
// (sur/sous-dépense) une fois que l'historique de création/montée de niveau
// distingue les capacités gratuites (2 voies de rang 1, voie de peuple rang 1,
// bonus de rang 2 des mages) des capacités achetées.
