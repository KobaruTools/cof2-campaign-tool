/**
 * Choix portés par les capacités (PER-66) — couche pure de lecture/écriture des
 * choix persistés sur le personnage (`Character.featureChoices`) et de
 * résolution de leur DOMAINE depuis le catalogue de règles.
 *
 * Séparation des couches :
 *  - DÉFINITION du choix : `Feature.choices` (nature + domaine autorisé) ;
 *  - VALEUR retenue : `Character.featureChoices` (un `FeatureChoiceSelection`
 *    par choix, aligné par position) ;
 *  - ce module fait le pont : il aligne les deux, calcule la liste réelle des
 *    valeurs admissibles (capacités empruntées, caractéristiques) et expose les
 *    capacités empruntées au moteur d'effets (`borrowedFeatureIds`).
 *
 * Comme `effects.ts`, ce module se couple directement à `@/data` (catalogue
 * figé) plutôt que de recevoir un contexte injecté : c'est un helper de contenu,
 * pas le moteur de calcul (qui, lui, reste pur et sans dépendance aux données).
 */
import { classById, classes, featureById, pathById, paths, priestGodById } from '@/data';
import {
  ABILITY_IDS,
  type AbilityId,
  type Feature,
  type FeatureChoice,
  type OptionFeatureChoice,
  type Path,
  type PathFeatureChoice,
} from '@/data/schema';
import type { Character, FeatureChoiceSelection } from './types';

/**
 * Id de la capacité DIVINE d'un prêtre spécialiste (issue d'un autre profil, p. 122),
 * ou `undefined`. Bien qu'elle figure dans `featureIds`, cette capacité empruntée NE
 * fait PAS du prêtre un hybride et ne compte pas comme une voie d'une autre famille
 * (détection d'hybridation, PV de niveau 1…) : les appelants l'excluent.
 */
export function priestDivineFeatureId(character: Character): string | undefined {
  const v = character.priestVocation;
  if (v?.mode !== 'specialist') return undefined;
  return priestGodById.get(v.godId)?.divineFeatureId;
}

/** Slot occupé par la capacité divine d'un prêtre spécialiste (p. 122). */
export interface DivineSlot {
  /** Id de la capacité divine acquise (d'un autre profil). */
  featureId: string;
  /** Voie de prêtre d'accueil dont elle occupe le slot. */
  hostPathId: string;
  /** Rang du slot (= rang natif de la capacité divine). */
  rank: number;
}

/**
 * Slot occupé par la capacité divine, si le prêtre est spécialiste, que la voie
 * d'accueil est désignée et que la capacité est acquise. Sert au moteur de
 * PROGRESSION : la divine compte pour sa voie d'ACCUEIL (et non pour sa voie
 * d'origine), de sorte que la voie d'accueil progresse au rang suivant et que la
 * voie d'origine n'est pas « entamée ». `null` sinon.
 */
export function priestDivineSlot(character: Character): DivineSlot | null {
  const v = character.priestVocation;
  if (v?.mode !== 'specialist' || !v.hostPathId) return null;
  const featureId = priestGodById.get(v.godId)?.divineFeatureId;
  const feature = featureId ? featureById.get(featureId) : undefined;
  if (!feature || !character.featureIds.includes(feature.id)) return null;
  return { featureId: feature.id, hostPathId: v.hostPathId, rank: feature.rank };
}

/**
 * Capacité divine d'un prêtre spécialiste restant à acquérir lors d'une montée de
 * niveau : une divine de RANG ≥ 2 (la divine de rang 1 est, elle, acquise dès la
 * création — voir wizard) pas encore présente dans `featureIds`. Au level-up elle
 * s'obtient en PRIORITÉ ABSOLUE (p. 122 : « première capacité de son rang »).
 * `null` si généraliste, divine de rang 1, ou divine déjà acquise.
 */
export interface PendingDivine {
  /** Capacité divine (dans sa voie d'origine, un autre profil). */
  feature: Feature;
  /** Rang du slot qu'elle occupera dans la voie d'accueil. */
  rank: number;
  /** Nom du dieu (affichage). */
  godName: string;
}

export function pendingDivineAcquisition(character: Character): PendingDivine | null {
  const v = character.priestVocation;
  if (v?.mode !== 'specialist') return null;
  const god = priestGodById.get(v.godId);
  const feature = god ? featureById.get(god.divineFeatureId) : undefined;
  if (!feature || feature.rank < 2) return null;
  if (character.featureIds.includes(feature.id)) return null;
  return { feature, rank: feature.rank, godName: god!.name };
}

/**
 * Voies de prêtre (profil principal) pouvant ACCUEILLIR la capacité divine de rang
 * `divineRank` : celles dont le rang `divineRank - 1` est acquis (donc tous les rangs
 * inférieurs, les voies étant linéaires) et dont le rang `divineRank` est encore
 * libre. La divine viendra occuper ce slot (p. 122).
 */
export function eligibleDivineHostPaths(character: Character, divineRank: number): Path[] {
  const mainPathIds = classById.get(character.classId)?.pathIds ?? [];
  const hosts: Path[] = [];
  for (const pathId of mainPathIds) {
    const path = pathById.get(pathId);
    if (!path) continue;
    const ranks: number[] = [];
    for (const id of character.featureIds) {
      const f = featureById.get(id);
      if (f?.pathId === pathId) ranks.push(f.rank);
    }
    if (ranks.includes(divineRank - 1) && !ranks.includes(divineRank)) hosts.push(path);
  }
  return hosts;
}

/** Définitions de choix portées par une capacité (vide si aucune / id inconnu). */
export function featureChoiceDefs(featureId: string): FeatureChoice[] {
  return featureById.get(featureId)?.choices ?? [];
}

/** Sélections persistées pour une capacité (vide si aucune). */
export function getSelections(character: Character, featureId: string): FeatureChoiceSelection[] {
  return character.featureChoices[featureId] ?? [];
}

/** Sélection persistée pour le i-ème choix d'une capacité (`null` si pas faite). */
export function getSelection(
  character: Character,
  featureId: string,
  index: number,
): FeatureChoiceSelection {
  return getSelections(character, featureId)[index] ?? null;
}

/**
 * Sélections d'un choix `option` RÉPÉTABLE, normalisées en tableau d'ids (ordre
 * conservé, doublons retirés). Tolère l'ancien format (une chaîne simple → tableau
 * d'un élément) et l'absence (→ tableau vide). À utiliser pour tout choix `option`,
 * répétable ou non (un choix simple renvoie alors 0 ou 1 id).
 */
export function getOptionSelections(
  character: Character,
  featureId: string,
  index: number,
): string[] {
  const sel = getSelection(character, featureId, index);
  const raw = sel == null ? [] : Array.isArray(sel) ? sel : [sel];
  return [...new Set(raw.filter((id): id is string => typeof id === 'string'))];
}

/**
 * Nombre d'options DISTINCTES qu'un choix `option` octroie au personnage : 1 pour
 * un choix simple, ou — pour un choix répétable (`repeat`) — le nombre de voies de
 * profil (des profils visés) dont le personnage a atteint le rang requis. Ex. Golem
 * supérieur (`by: 'paths-at-rank'`, `classIds: ['forgesort']`, `rank: 5`) : une
 * amélioration par voie de forgesort au rang 5 (p. 100).
 */
export function repeatableChoiceCount(character: Character, choice: OptionFeatureChoice): number {
  if (!choice.repeat) return 1;
  const { classIds, rank } = choice.repeat;
  // Rang le plus haut atteint par le personnage dans chaque voie de profil visée.
  const maxRankByPath = new Map<string, number>();
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    const path = pathById.get(feature.pathId);
    if (path?.type !== 'class' || !path.classIds.some((c) => classIds.includes(c))) continue;
    maxRankByPath.set(path.id, Math.max(maxRankByPath.get(path.id) ?? 0, feature.rank));
  }
  let count = 0;
  for (const max of maxRankByPath.values()) if (max >= rank) count++;
  return count;
}

/**
 * Un choix est-il À PROPOSER actuellement (UI + validation) ? Un choix `option`
 * répétable ne l'est que lorsqu'un palier de progression est atteint
 * (`repeatableChoiceCount > 0`) : tant que rien n'est débloqué (ex. catégorie
 * d'animaux de « Langage des animaux » avant un rang 4 de druide), il n'y a rien
 * à retenir, donc on masque le contrôle plutôt que d'embrouiller l'utilisateur.
 * Les autres natures (ability / feature-from-path / option simple) sont toujours
 * proposées.
 */
export function isChoiceActionable(character: Character, choice: FeatureChoice): boolean {
  if (choice.kind === 'option' && choice.repeat) return repeatableChoiceCount(character, choice) > 0;
  return true;
}

/** Vrai si la capacité porte au moins un choix à proposer actuellement (cf. `isChoiceActionable`). */
export function hasActionableChoice(character: Character, featureId: string): boolean {
  return featureChoiceDefs(featureId).some((choice) => isChoiceActionable(character, choice));
}

/**
 * Renvoie une copie de `featureChoices` avec la sélection du i-ème choix d'une
 * capacité fixée à `value`. Le tableau est complété par des `null` si besoin
 * pour atteindre l'index visé (choix antérieurs pas encore faits). Fonction pure
 * (ne mute pas le personnage) : l'appelant fait `update({ featureChoices })`.
 */
export function setFeatureChoice(
  character: Character,
  featureId: string,
  index: number,
  value: FeatureChoiceSelection,
): Record<string, FeatureChoiceSelection[]> {
  const next = { ...character.featureChoices };
  const current = next[featureId] ? next[featureId].slice() : [];
  while (current.length <= index) current.push(null);
  current[index] = value;
  next[featureId] = current;
  return next;
}

/**
 * Élague les choix orphelins : retire les entrées dont la capacité n'est plus
 * acquise. À appeler quand on retire une capacité, pour ne pas conserver de
 * choix fantôme. Fonction pure.
 */
export function pruneFeatureChoices(
  featureChoices: Record<string, FeatureChoiceSelection[]>,
  featureIds: string[],
): Record<string, FeatureChoiceSelection[]> {
  const owned = new Set(featureIds);
  const next: Record<string, FeatureChoiceSelection[]> = {};
  for (const [id, selections] of Object.entries(featureChoices)) {
    if (owned.has(id)) next[id] = selections;
  }
  return next;
}

// ---------------------------------------------------------------------------
// Résolution des domaines
// ---------------------------------------------------------------------------

/** Caractéristiques admissibles pour un choix `ability` (toutes par défaut). */
export function allowedAbilitiesForChoice(choice: {
  allowed?: AbilityId[];
}): readonly AbilityId[] {
  return choice.allowed ?? ABILITY_IDS;
}

/**
 * Capacités légalement empruntables pour un choix `feature-from-path`, d'après
 * ses contraintes (rangs, profils, voies, portée relative au personnage),
 * triées par voie puis rang. Le domaine se limite aux voies de PROFIL
 * (`type: 'class'`) — les emprunts du livre se font toujours « dans une voie de
 * tel profil ». La capacité hôte (celle qui porte le choix) et les capacités
 * déjà acquises par le personnage sont exclues (un emprunt redondant n'aurait
 * pas de sens).
 */
export function eligibleFeaturesForChoice(
  character: Character,
  hostFeatureId: string,
  choice: PathFeatureChoice,
): Feature[] {
  const allowedRanks = new Set(choice.allowedRanks);
  const owned = new Set(character.featureIds);

  // Ensemble des voies de profil admissibles selon les contraintes.
  const classPathIds = new Set<string>();
  for (const path of paths) {
    if (path.type !== 'class') continue;
    if (choice.pathIds && !choice.pathIds.includes(path.id)) continue;
    if (choice.classIds && !path.classIds.some((c) => choice.classIds!.includes(c))) continue;
    if (choice.familyScope === 'same-family') {
      const family = classById.get(character.classId)?.familyId;
      const sameFamilyClasses = new Set(
        classes.filter((c) => c.familyId === family).map((c) => c.id),
      );
      if (!path.classIds.some((c) => sameFamilyClasses.has(c))) continue;
    }
    classPathIds.add(path.id);
  }

  const hostPathId = featureById.get(hostFeatureId)?.pathId;
  return [...featureById.values()]
    .filter(
      (f) =>
        f.id !== hostFeatureId &&
        f.pathId !== hostPathId &&
        !owned.has(f.id) &&
        allowedRanks.has(f.rank) &&
        classPathIds.has(f.pathId),
    )
    .sort((a, b) => a.pathId.localeCompare(b.pathId) || a.rank - b.rank);
}

// ---------------------------------------------------------------------------
// Lecture moteur
// ---------------------------------------------------------------------------

/**
 * Ids des capacités EMPRUNTÉES via des choix `feature-from-path` (sélections non
 * nulles, ids connus, capacité hôte effectivement acquise). Ces capacités sont
 * réellement acquises par le personnage : leurs `effects` structurés doivent
 * donc compter dans le moteur, au même titre que les capacités de `featureIds`.
 */
export function borrowedFeatureIds(character: Character): string[] {
  const owned = new Set(character.featureIds);
  const borrowed: string[] = [];
  for (const [hostId, selections] of Object.entries(character.featureChoices ?? {})) {
    if (!owned.has(hostId)) continue;
    const defs = featureChoiceDefs(hostId);
    selections.forEach((sel, i) => {
      // Un emprunt (`feature-from-path`) est toujours une chaîne (jamais répétable).
      if (defs[i]?.kind === 'feature-from-path' && typeof sel === 'string' && featureById.has(sel)) {
        borrowed.push(sel);
      }
    });
  }
  return borrowed;
}

/**
 * Ids effectifs pour l'agrégation des effets : capacités acquises + capacités
 * empruntées par choix, dédoublonnés. À passer à `modsFromFeatures` /
 * `featureModSources` pour que les bonus plats d'une capacité empruntée
 * s'appliquent.
 */
export function effectiveFeatureIdsForMods(character: Character): string[] {
  return [...new Set([...character.featureIds, ...borrowedFeatureIds(character)])];
}

// ---------------------------------------------------------------------------
// État « choix à faire »
// ---------------------------------------------------------------------------

/**
 * Indices des choix d'une capacité acquise qui ne sont PAS encore résolus
 * (sélection absente ou `null`). Vide si la capacité n'impose aucun choix ou si
 * tous sont faits.
 */
export function unmadeChoiceIndexes(character: Character, featureId: string): number[] {
  const defs = featureChoiceDefs(featureId);
  const selections = getSelections(character, featureId);
  const pending: number[] = [];
  defs.forEach((choice, i) => {
    const sel = selections[i] ?? null;
    // Choix répétable (`option` + `repeat`) : « à faire » UNIQUEMENT s'il reste des
    // catégories à retenir, c.-à-d. si un palier est atteint (`allowed > 0`) et qu'aucune
    // option n'a encore été retenue. Tant qu'aucun palier n'est atteint (ex. Langage des
    // animaux au rang 1 → 0 autorisée), rien n'est dû : le choix n'est pas « à faire »
    // (sinon le wizard reste bloqué sur une étape sans option valide). Un répétable
    // PARTIEL n'est pas non plus « à faire » — le « il en reste » est une indication.
    if (choice.kind === 'option' && choice.repeat) {
      const allowed = repeatableChoiceCount(character, choice);
      if (allowed > 0 && getOptionSelections(character, featureId, i).length === 0) pending.push(i);
      return;
    }
    // Autres natures : non fait = aucune valeur (ou tableau vide normalisé).
    if (sel == null || (Array.isArray(sel) && sel.length === 0)) pending.push(i);
  });
  return pending;
}

/** Vrai si la capacité acquise porte au moins un choix non encore fait. */
export function hasUnmadeChoice(character: Character, featureId: string): boolean {
  return unmadeChoiceIndexes(character, featureId).length > 0;
}

/**
 * Ids des capacités acquises dont au moins un choix reste à faire — utile pour
 * un avertissement de conformité (fiche) ou pour bloquer une étape (wizard).
 */
export function featuresWithUnmadeChoices(character: Character): string[] {
  return character.featureIds.filter((id) => hasUnmadeChoice(character, id));
}
