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
 * conservé). Tolère l'ancien format (une chaîne simple → tableau d'un élément) et
 * l'absence (→ tableau vide). À utiliser pour tout choix `option`, répétable ou non
 * (un choix simple renvoie alors 0 ou 1 id).
 *
 * Dédoublonnage SÉLECTIF (PER-72) : les options marquées `repeatable` (ex. « +1 DM »
 * de Spécialisation) conservent leurs DOUBLONS — chaque instance compte ; les autres
 * options (catégories distinctes) restent dédoublonnées, ordre conservé.
 */
export function getOptionSelections(
  character: Character,
  featureId: string,
  index: number,
): string[] {
  const sel = getSelection(character, featureId, index);
  const raw = sel == null ? [] : Array.isArray(sel) ? sel : [sel];
  const ids = raw.filter((id): id is string => typeof id === 'string');
  const def = featureChoiceDefs(featureId)[index];
  const repeatableIds = new Set(
    def?.kind === 'option' ? def.options.filter((o) => o.repeatable).map((o) => o.id) : [],
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (repeatableIds.has(id)) {
      out.push(id); // option répétable : doublons conservés
    } else if (!seen.has(id)) {
      seen.add(id);
      out.push(id); // option distincte : une seule fois
    }
  }
  return out;
}

/**
 * L'arme portée (via ses `weaponFamilies`) partage-t-elle au moins une des FAMILLES de prédilection
 * retenues sur le choix `option` à l'index 0 de `choiceFeatureId` (PER-136/PER-226) ? Helper partagé
 * par la plage de critique (`weaponCriticalConditionMet`, effects.ts) et les bonus d'attaque/DM
 * conditionnés à l'arme (weaponDamageBonus/attackBonus), pour éviter la duplication du même filtrage.
 * Prend les familles en `string[]` (pas de dépendance au type `Weapon`).
 */
export function weaponFamiliesMatchChoice(
  character: Character,
  families: readonly string[] | undefined,
  choiceFeatureId: string,
): boolean {
  if (!families?.length) return false;
  const selected = getOptionSelections(character, choiceFeatureId, 0);
  return families.some((f) => selected.includes(f));
}

/**
 * Sélection d'un choix `custom-skill` (PER-73) décomposée : le NOM libre saisi (gagne-pain) et
 * les ids de domaines de test retenus. La sélection est persistée en `[nom, ...domaines]`. Tolère
 * une saisie absente ou partielle : nom vide, domaines manquants ; les entrées vides sont filtrées.
 */
export function getCustomSkillSelection(
  character: Character,
  featureId: string,
  index: number,
): { name: string; domains: string[] } {
  const sel = getSelection(character, featureId, index);
  const arr = Array.isArray(sel) ? sel : [];
  const name = typeof arr[0] === 'string' ? arr[0] : '';
  const domains = arr
    .slice(1)
    .filter((d): d is string => typeof d === 'string' && d.length > 0);
  return { name, domains };
}

/**
 * Décompose les sélections d'un choix `option` répétable (PER-72) en deux axes : les options
 * DISTINCTES retenues (hors `repeatable`, ex. catégories d'armes) et le NOMBRE d'instances de
 * chaque option `repeatable` (ex. « +1 DM » ×N). `used` = total consommé sur le budget `repeat`
 * (= longueur de `getOptionSelections`). Sert au contrôle d'édition et à l'affichage.
 */
export function splitRepeatableSelections(
  character: Character,
  featureId: string,
  index: number,
): { distinct: string[]; repeatCounts: Record<string, number>; used: number } {
  const ids = getOptionSelections(character, featureId, index);
  const def = featureChoiceDefs(featureId)[index];
  const repeatableIds = new Set(
    def?.kind === 'option' ? def.options.filter((o) => o.repeatable).map((o) => o.id) : [],
  );
  const distinct: string[] = [];
  const repeatCounts: Record<string, number> = {};
  for (const id of ids) {
    if (repeatableIds.has(id)) repeatCounts[id] = (repeatCounts[id] ?? 0) + 1;
    else distinct.push(id);
  }
  return { distinct, repeatCounts, used: ids.length };
}

/** Vrai si le choix `option` porte au moins une option `repeatable` (ex. Spécialisation). */
export function hasRepeatableOption(choice: OptionFeatureChoice): boolean {
  return choice.options.some((o) => o.repeatable);
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
  const { classIds, rank, base, requiresFeatureId } = choice.repeat;
  // Picks de base toujours accordés (ex. la catégorie de prédilection de base, maitre-d-armes-r1).
  let count = base ?? 0;
  // Picks de progression : débloqués seulement si la capacité requise est acquise (ex. Spécialisation).
  if (requiresFeatureId && !character.featureIds.includes(requiresFeatureId)) return count;
  // Rang le plus haut atteint par le personnage dans chaque voie de profil visée.
  const maxRankByPath = new Map<string, number>();
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    const path = pathById.get(feature.pathId);
    if (path?.type !== 'class' || !path.classIds.some((c) => classIds.includes(c))) continue;
    maxRankByPath.set(path.id, Math.max(maxRankByPath.get(path.id) ?? 0, feature.rank));
  }
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
export function isChoiceActionable(
  character: Character,
  featureId: string,
  choice: FeatureChoice,
): boolean {
  // Choix conditionnel à une option sœur (PER-73, ex. `custom-skill` d'humain-r1 visible seulement
  // si l'origine « Libre » est retenue) : masqué tant que l'option gouvernante n'est pas choisie.
  if (choice.visibleIfOption) {
    const gov = getSelection(character, featureId, choice.visibleIfOption.choiceIndex);
    const ids = Array.isArray(gov) ? gov : gov ? [gov] : [];
    if (!ids.includes(choice.visibleIfOption.optionId)) return false;
  }
  if (choice.kind === 'option' && choice.repeat) return repeatableChoiceCount(character, choice) > 0;
  return true;
}

/** Vrai si la capacité porte au moins un choix à proposer actuellement (cf. `isChoiceActionable`). */
export function hasActionableChoice(character: Character, featureId: string): boolean {
  return featureChoiceDefs(featureId).some((choice) => isChoiceActionable(character, featureId, choice));
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
 * Vrai si la capacité porte elle-même un choix `feature-from-path` — capacité
 * « emprunteuse », qui permet de faire appel à une autre capacité. Pivot de la
 * règle des poupées russes (p. 41).
 */
export function featureOffersBorrow(featureId: string): boolean {
  return featureChoiceDefs(featureId).some((c) => c.kind === 'feature-from-path');
}

/**
 * Vrai si la capacité octroie un bonus de DEF *à soi* (plat inconditionnel ou
 * conditionnel/temporaire). Détecté sur les `effects` structurés uniquement — un
 * « test d'attaque magique contre la DEF de la cible » (prose) n'en est pas un, et
 * une réduction de dommages (`damageReduction`) n'est pas de la DEF. Pivot de la
 * restriction `excludeDefBonus` de Talent pour la magie (elfe haut, p. 50).
 */
export function featureGrantsDefBonus(featureId: string): boolean {
  const effects = featureById.get(featureId)?.effects;
  if (!effects) return false;
  return effects.some(
    (e) =>
      (e.kind === 'stat-bonus' && e.stat === 'def') ||
      (e.kind === 'conditional-stat-bonus' && e.bonuses.some((b) => b.stat === 'def')),
  );
}

/**
 * Domaine BRUT d'un choix `feature-from-path` (rangs, profils, voies, portée
 * relative au personnage), AVANT application de la règle des poupées russes,
 * trié par voie puis rang. Le domaine se limite aux voies de PROFIL
 * (`type: 'class'`) — les emprunts du livre se font toujours « dans une voie de
 * tel profil ». La capacité hôte (celle qui porte le choix) et les capacités
 * déjà acquises par le personnage sont exclues (un emprunt redondant n'aurait
 * pas de sens).
 */
function featuresInChoiceDomain(
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
        classPathIds.has(f.pathId) &&
        // Talent pour la magie : pas de capacité qui octroie un bonus de DEF (p. 50).
        !(choice.excludeDefBonus && featureGrantsDefBonus(f.id)),
    )
    .sort((a, b) => a.pathId.localeCompare(b.pathId) || a.rank - b.rank);
}

/**
 * Capacités légalement empruntables pour un choix `feature-from-path` : le
 * domaine (cf. `featuresInChoiceDomain`) PRIVÉ des capacités « emprunteuses ».
 *
 * Règle des **poupées russes** (p. 41, verbatim) : « lorsqu'une capacité permet
 * de choisir une autre capacité […], il n'est pas possible de choisir une
 * capacité qui permet elle-même de faire appel à une autre capacité » — pas de
 * chaînage, un seul niveau d'emprunt. Point de passage UNIQUE : le wizard
 * (bloquant) comme la fiche (permissive) consomment cette liste (cf.
 * `FeatureChoiceField`), la règle s'applique donc partout.
 */
export function eligibleFeaturesForChoice(
  character: Character,
  hostFeatureId: string,
  choice: PathFeatureChoice,
): Feature[] {
  return featuresInChoiceDomain(character, hostFeatureId, choice).filter(
    (f) => !featureOffersBorrow(f.id),
  );
}

/**
 * Capacités du domaine ÉCARTÉES par la règle des poupées russes (p. 41) : celles
 * qui sont elles-mêmes « emprunteuses ». Sert à l'UI, qui les affiche grisées
 * (non sélectionnables) avec l'explication de la règle, plutôt que de les masquer.
 * Disjointe de `eligibleFeaturesForChoice` ; leur union redonne le domaine brut.
 */
export function ineligibleBorrowersForChoice(
  character: Character,
  hostFeatureId: string,
  choice: PathFeatureChoice,
): Feature[] {
  return featuresInChoiceDomain(character, hostFeatureId, choice).filter((f) =>
    featureOffersBorrow(f.id),
  );
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

/**
 * Mapping `id de capacité EMPRUNTÉE → pathId de la VOIE A` (la voie hôte dont une capacité-choix a
 * fait emprunter cette capacité). Encadré « Appel à une autre capacité » du livre : une capacité
 * empruntée « devient une capacité de la voie A » ; si elle évolue selon le rang ATTEINT dans la
 * voie, c'est le rang dans la **voie A** qui est utilisé. Ce mapping permet au moteur de résoudre
 * le terme `rang` (et les paliers `by: 'path-rank'`) d'une capacité empruntée contre la voie A, et
 * non contre sa voie d'origine (que le personnage ne possède pas). Cf. `effectContext`.
 */
export function borrowedHostPathByFeatureId(character: Character): Map<string, string> {
  const owned = new Set(character.featureIds);
  const map = new Map<string, string>();
  for (const [hostId, selections] of Object.entries(character.featureChoices ?? {})) {
    if (!owned.has(hostId)) continue;
    const host = featureById.get(hostId);
    if (!host) continue;
    const defs = featureChoiceDefs(hostId);
    selections.forEach((sel, i) => {
      if (defs[i]?.kind === 'feature-from-path' && typeof sel === 'string' && featureById.has(sel)) {
        map.set(sel, host.pathId);
      }
    });
  }
  return map;
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
    // Choix non actionnable actuellement (répétable sans palier atteint, ou `custom-skill` dont
    // l'option gouvernante n'est pas retenue) : rien n'est dû, on ne le compte pas « à faire ».
    if (!isChoiceActionable(character, featureId, choice)) return;
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
    // Choix `custom-skill` (PER-73) : « à faire » tant que le NOM (non vide, espaces exclus) ou l'un
    // des `domainCount` domaines manque (le contrôle n'est proposé que si actionnable, cf. ci-dessus).
    if (choice.kind === 'custom-skill') {
      const { name, domains } = getCustomSkillSelection(character, featureId, i);
      if (name.trim().length === 0 || domains.length < choice.domainCount) pending.push(i);
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
 * Vrai si la capacité porte un choix `custom-skill` ENGAGÉ mais INCOMPLET (PER-73) — ex. l'origine
 * « Libre » d'humain-r1 retenue sans nom ou sans ses `domainCount` domaines. Contrairement aux autres
 * choix (permissifs, laissés « à faire » avec un simple avertissement sur la fiche), un `custom-skill`
 * est TOUT-OU-RIEN : une fois l'option gouvernante retenue, il doit être complété. Sert à bloquer le
 * bouton « Terminer » de la modale d'édition de choix (fiche) tant qu'il n'est pas rempli.
 */
export function hasIncompleteCustomSkill(character: Character, featureId: string): boolean {
  const defs = featureChoiceDefs(featureId);
  return unmadeChoiceIndexes(character, featureId).some((i) => defs[i]?.kind === 'custom-skill');
}

/**
 * Ids des capacités dont au moins un choix reste à faire — utile pour un avertissement de
 * conformité (fiche) ou pour bloquer une étape (wizard). Inclut les capacités EMPRUNTÉES
 * (`feature-from-path`) : une capacité empruntée porte ses propres choix (ex. la catégorie
 * d'animaux de « Langage des animaux » débloquée par un rang 4 de druide chez un hybride),
 * qui deviennent dus au même titre qu'un choix natif dès qu'ils sont actionnables.
 */
export function featuresWithUnmadeChoices(character: Character): string[] {
  const ids = [...new Set([...character.featureIds, ...borrowedFeatureIds(character)])];
  return ids.filter((id) => hasUnmadeChoice(character, id));
}
