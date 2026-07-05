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
import { features as featureCatalog, featureById, pathById, progression } from '@/data';
import type { Feature } from '@/data/schema';
import { canAcquireFeature, featureCost, freeFeatureIds, type RulesContext } from '@/lib/engine';
import type { Character, LevelUpEntry, OrphanReward } from './types';

/** Points de capacité gagnés à chaque montée de niveau (p. 38-39). */
export const FEATURE_POINTS_PER_LEVEL = progression.featurePointsPerLevel;

/**
 * Nombre de « changements d'orientation » (p. 43) autorisés à un passage de niveau :
 * le personnage peut oublier une capacité pour la remplacer par une autre, ou **deux**
 * s'il a au moins +2 en INT.
 */
export function maxRetrainings(character: Character): number {
  return character.abilities.INT >= 2 ? 2 : 1;
}

/**
 * Capacités qu'un personnage peut « oublier » au titre du changement d'orientation
 * (p. 43), pour le rang le plus haut de chaque voie uniquement (interdiction des
 * voies à trous : on oublie le rang 5, puis le 4, puis le 3). Exclusions (p. 43) :
 *  - les capacités acquises gratuitement — les deux rangs 1 du profil, « la jeunesse »
 *    qu'on ne peut jamais oublier — via `freeFeatureIds` ;
 *  - **toute la voie de peuple** (et la voie du mage) : capacités « acquises
 *    automatiquement et gratuitement », jamais oubliables, quel que soit leur rang.
 * Triée par voie puis rang. Si le gratuit n'est pas identifiable (historique de
 * niveau 1 absent), rien n'est proposé à l'oubli plutôt que de risquer d'oublier une
 * capacité de départ.
 */
export function forgettableFeatures(character: Character): Feature[] {
  const { ids: free, known } = freeFeatureIds(character);
  if (!known) return [];
  const owned = character.featureIds
    .map((id) => featureById.get(id))
    .filter((f): f is Feature => !!f);
  // Rang le plus haut détenu par voie : seul ce rang est oubliable (LIFO, p. 43).
  const maxRankByPath = new Map<string, number>();
  for (const f of owned) {
    maxRankByPath.set(f.pathId, Math.max(maxRankByPath.get(f.pathId) ?? 0, f.rank));
  }
  // Voie de peuple / du mage : automatique et gratuite → jamais oubliable (p. 43).
  const isPeopleFeature = (f: Feature): boolean => {
    const type = pathById.get(f.pathId)?.type;
    return type === 'ancestry' || type === 'mage';
  };
  return owned
    .filter(
      (f) => !free.has(f.id) && !isPeopleFeature(f) && f.rank === maxRankByPath.get(f.pathId),
    )
    .sort((a, b) => a.pathId.localeCompare(b.pathId) || a.rank - b.rank);
}

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
 * Capacités présentes sur la fiche mais absentes de tout l'historique de
 * création/montée de niveau : elles ont donc été ajoutées « à la main » sur la
 * fiche permissive, hors wizard. Sert à les marquer visuellement (épingle) pour
 * garder une trace de ce qui a été saisi manuellement (PER-53). Si l'historique
 * est entièrement vide (sauvegarde ancienne / fixture), on ne peut rien
 * distinguer : on renvoie un ensemble vide plutôt que de tout marquer.
 */
export function manualFeatureIds(character: Character): Set<string> {
  if (character.levelUpHistory.length === 0) return new Set();
  const fromHistory = new Set<string>();
  for (const entry of character.levelUpHistory) {
    for (const id of entry.chosenFeatureIds) fromHistory.add(id);
  }
  return new Set(character.featureIds.filter((id) => !fromHistory.has(id)));
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
 * doublon), entrée d'historique journalisée. `orphanRewards` (p. 40) : conversions
 * des points de capacité non dépensés, stockées sur l'entrée du niveau.
 * `forgottenFeatureIds` (p. 43, changement d'orientation) : capacités abandonnées
 * ce niveau, RETIRÉES de `featureIds` avant l'ajout des capacités choisies (le
 * remplacement fait partie de `chosenFeatureIds`) et journalisées sur l'entrée.
 */
export function applyLevelUp(
  character: Character,
  chosenFeatureIds: string[],
  orphanRewards: OrphanReward[] = [],
  forgottenFeatureIds: string[] = [],
): Character {
  const level = character.level + 1;
  const forgotten = new Set(forgottenFeatureIds);
  const featureIds = character.featureIds.filter((id) => !forgotten.has(id));
  for (const id of chosenFeatureIds) {
    if (!featureIds.includes(id)) featureIds.push(id);
  }
  const entry: LevelUpEntry = { level, chosenFeatureIds };
  if (orphanRewards.length > 0) entry.orphanRewards = orphanRewards;
  if (forgottenFeatureIds.length > 0) entry.forgottenFeatureIds = forgottenFeatureIds;
  return {
    ...character,
    level,
    featureIds,
    levelUpHistory: [...character.levelUpHistory, entry],
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
  // Capacités acquises ce niveau retirées ; capacités oubliées via changement
  // d'orientation (p. 43) restituées (elles avaient été retirées à la montée).
  const featureIds = character.featureIds.filter((id) => !removed.has(id));
  for (const id of last.forgottenFeatureIds ?? []) {
    if (!featureIds.includes(id)) featureIds.push(id);
  }
  return {
    ...character,
    level: last.level - 1,
    featureIds,
    levelUpHistory: history.slice(0, -1),
  };
}
