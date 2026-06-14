/**
 * Montée de niveau et annulation — logique pure (PER-49 / PER-50).
 *
 * Le mini-wizard de montée de niveau (UI) ne fait que piloter ces helpers :
 *  - `acquirableFeatures` : capacités légalement acquérables (s'appuie sur
 *    `canAcquireFeature`, l'unique source de légalité du moteur) ;
 *  - `applyLevelUp` : promeut le personnage d'un niveau, applique les capacités
 *    choisies et journalise l'entrée d'historique ;
 *  - `undoLastLevelUp` : annule proprement le dernier niveau (retire ses
 *    capacités, dépile l'entrée, redescend d'un niveau).
 *
 * Hors périmètre (volontaire, cf. PER-49) : le décompte exact des points de
 * capacité (2 par niveau, coûts par rang) fait l'objet d'un ticket dédié. Ici
 * on s'appuie uniquement sur la légalité par capacité.
 */
import { features as featureCatalog, featureById, progression } from '@/data';
import type { Feature } from '@/data/schema';
import { canAcquireFeature, featureCost, type RulesContext } from '@/lib/engine';
import type { Character } from './types';

/** Points de capacité gagnés à chaque montée de niveau (p. 38-39). */
export const FEATURE_POINTS_PER_LEVEL = progression.featurePointsPerLevel;

/**
 * Capacités que le personnage peut légalement acquérir à son niveau courant
 * (toutes voies confondues), triées par rang croissant puis par voie. Comme
 * `canAcquireFeature` vérifie l'ordre des rangs, on n'obtient ici que les
 * « prochains rangs » disponibles, jamais une capacité à trous.
 */
export function acquirableFeatures(character: Character, ctx: RulesContext): Feature[] {
  return featureCatalog
    .filter((f) => canAcquireFeature(character, f.id, ctx).legal)
    .sort((a, b) => a.rank - b.rank || a.pathId.localeCompare(b.pathId));
}

/**
 * Coût total en points de capacité d'une liste d'ids (rang 1-2 → 1, rang 3+ →
 * 2 ; p. 39). Les ids inconnus comptent pour 0.
 */
export function totalFeatureCost(featureIds: string[], ctx: RulesContext): number {
  return featureIds.reduce((sum, id) => {
    const feature = ctx.featureById.get(id);
    return sum + (feature ? featureCost(feature, ctx.progression) : 0);
  }, 0);
}

/**
 * Retire une capacité de la sélection en cours et, avec elle, toute capacité
 * sélectionnée de la même voie d'un rang supérieur (sinon on laisserait une
 * voie à trous, choix illégal). Conserve l'ordre d'ajout.
 */
export function deselectFeature(picked: string[], featureId: string): string[] {
  const target = featureById.get(featureId);
  if (!target) return picked.filter((id) => id !== featureId);
  return picked.filter((id) => {
    if (id === featureId) return false;
    const f = featureById.get(id);
    return !(f && f.pathId === target.pathId && f.rank >= target.rank);
  });
}

/**
 * Personnage promu d'un niveau : niveau +1, capacités choisies ajoutées (sans
 * doublon), entrée d'historique journalisée.
 */
export function applyLevelUp(character: Character, chosenFeatureIds: string[]): Character {
  const level = character.level + 1;
  const featureIds = [...character.featureIds];
  for (const id of chosenFeatureIds) {
    if (!featureIds.includes(id)) featureIds.push(id);
  }
  return {
    ...character,
    level,
    featureIds,
    levelUpHistory: [...character.levelUpHistory, { level, chosenFeatureIds }],
  };
}

/** Vrai si le dernier niveau peut être annulé (jamais la création, niveau 1). */
export function canUndoLastLevelUp(character: Character): boolean {
  const last = character.levelUpHistory[character.levelUpHistory.length - 1];
  return !!last && last.level > 1;
}

/**
 * Annule le dernier niveau : retire les capacités acquises à ce niveau, dépile
 * l'entrée d'historique et redescend le personnage au niveau précédent. Sans
 * effet sur l'entrée de création (niveau 1).
 */
export function undoLastLevelUp(character: Character): Character {
  if (!canUndoLastLevelUp(character)) return character;
  const history = character.levelUpHistory;
  const last = history[history.length - 1];
  const removed = new Set(last.chosenFeatureIds);
  return {
    ...character,
    level: last.level - 1,
    featureIds: character.featureIds.filter((id) => !removed.has(id)),
    levelUpHistory: history.slice(0, -1),
  };
}
