/**
 * ARME CHARGÉE / DÉCHARGÉE (PER-284) — module pur (couplé au catalogue figé `@/data`, comme
 * `mastery.ts` et `twoWeaponCombat.ts`, mais sans dépendance à l'UI).
 *
 * Le livre déconseille explicitement de compter les munitions (p. 187, verbatim) : « Nous vous
 * conseillons de ne pas tenir compte des dépenses de munitions, c'est fastidieux et il est
 * souhaitable de ne pas pénaliser les profils qui combattent à distance. » Il n'y a donc AUCUN
 * stock de projectiles dans l'application — ni balles, ni poudre, ni flèches. Décision de
 * cadrage définitive.
 *
 * Ce que le livre compte en revanche très précisément, c'est l'état CHARGÉE / DÉCHARGÉE : la table
 * des armes à distance (p. 185) donne le coût de rechargement de chaque arbalète et arme à poudre,
 * l'encadré « Recharger » (p. 187) en interdit le rechargement au contact d'un adversaire actif, et
 * six capacités n'ont aucun sens sans cet état — Arme à répétition (`artilleur-r2`, p. 62), Tir de
 * barrage (`artilleur-r3`, p. 62 : « tant qu'il n'a pas besoin de recharger »), Canon double
 * (`artilleur-r4`, p. 63), Couleuvrine (`artilleur-r5`, p. 63), Tir de grenaille (`explosifs-r1`,
 * p. 63) et Plus vite que son ombre (`pistolero-r1`, p. 65 : « Si son arme à poudre est CHARGÉE et
 * tenue en main, l'arquebusier peut tirer avec un bonus de +5 à son Initiative »).
 *
 * MODÈLE : le chargement est un COMPTEUR PORTÉ PAR L'ARME, et **une arme occupe une ligne
 * d'inventaire** (décision propriétaire) — la `quantity` de la ligne n'entre dans AUCUN calcul de
 * chargement. C'est ce qui permet de suivre les modifications individuelles de l'arquebusier, qui
 * portent sur « deux armes de son choix » et pas sur un type d'arme : deux pétoires, dont une seule
 * à chargeur, sont deux lignes distinctes avec chacune son compteur.
 *
 * Portée DATA-DRIVEN : une arme se suit dès qu'elle porte un `reload` au catalogue (arbalètes et
 * armes à poudre, cf. `Weapon.reload`), dans l'esprit de `isFirearmItem` (PER-197) — jamais une
 * liste d'ids en dur. Le module ne résout aucun jet : il tient le compteur et expose ce qu'il faut
 * pour l'afficher (l'interface est câblée par PER-285).
 *
 * HORS PÉRIMÈTRE : l'interdiction de recharger « si vous avez un adversaire actif à votre contact »
 * (p. 187) ne devient PAS un état de jeu — l'application n'a aucune notion d'engagement au contact ;
 * elle sera rappelée en toutes lettres par l'interface (PER-285). La couleuvrine, arme octroyée par
 * capacité, relève de PER-286 (seuls `reload.rounds` et son exclusion du décompte des trois armes
 * sont préparés ici).
 */
import { equipmentById, featureById } from '@/data';
import type {
  EffectValue,
  Weapon,
  WeaponModificationLoadout,
  WeaponReload,
} from '@/data/schema';
import { effectContext, pathRanksFromFeatures, resolveValue } from './effects';
import { isCustomItem } from './types';
import type { Character, EquipmentLine, EquipmentRef, LoadedAmmunitionKind } from './types';

/**
 * Capacité d'un CHARGEUR (Arme à répétition, `artilleur-r2`, p. 62, verbatim) : « La capacité du
 * chargeur est égale à [2 + INT] et elle augmente de 1 projectile supplémentaire chaque fois que le
 * personnage atteint le rang 3 dans une voie d'arquebusier. »
 *
 * Exprimée en DONNÉE (`EffectValue`) pour être résolue par le moteur commun (`resolveValue`) et non
 * par un calcul maison : les « paliers » sont exactement le `milestone-count` des voies
 * d'arquebusier au rang 3 (voie hôte comprise, aucune exclusion), celui-là même qui alimente le
 * texte enrichi de la capacité.
 */
const MAGAZINE_CAPACITY: EffectValue = {
  scale: 'sum',
  parts: [
    2,
    { scale: 'ability', ability: 'INT' },
    { scale: 'milestone-count', per: 1, rank: 3, classIds: ['arquebusier'] },
  ],
};

/**
 * Nombre d'armes à poudre chargées d'avance que le livre juge raisonnable (p. 187, verbatim) : « Un
 * arquebusier pourra raisonnablement avoir trois armes chargées en même temps, généralement deux
 * pétoires et un mousquet (plus éventuellement une couleuvrine qui ne compte pas dans ce calcul).
 * Plus d'armes surchargent le personnage. »
 */
export const ADVISED_LOADED_FIREARMS = 3;

/**
 * Contexte de chargement d'UN personnage : tout ce que le calcul de capacité tire du personnage,
 * résolu une seule fois pour tout l'inventaire (la résolution passe par `effectContext`, qui
 * recalcule les caractéristiques effectives — inutile de la refaire arme par arme).
 */
export interface LoadingContext {
  /**
   * Capacité d'un chargeur pour ce personnage (`2 + INT + paliers`, p. 62), plancher 1 : une
   * caractéristique d'INT négative ne saurait rendre un chargeur inutilisable.
   */
  magazineCapacity: number;
}

/** Contexte de chargement du personnage (à construire une fois par rendu / par geste). */
export function loadingContext(character: Character): LoadingContext {
  // `pathId` est sans objet ici : aucune composante de `MAGAZINE_CAPACITY` n'est relative à une voie
  // hôte (`path-rank`) — les paliers se comptent sur TOUTES les voies d'arquebusier.
  const resolved = resolveValue(
    MAGAZINE_CAPACITY,
    '',
    pathRanksFromFeatures(character.featureIds),
    effectContext(character),
  );
  return { magazineCapacity: Math.max(1, resolved ?? 1) };
}

/**
 * L'arme de BASE de cette ligne, si le livre la fait recharger (`reload` renseigné), sinon `null`.
 * Un objet personnalisé n'est jamais une arme du catalogue. Comme `rangedKind`, `reload` n'est
 * jamais surchargé par une variante (cf. `effectiveItem`) : l'identité « arme à recharger » se lit
 * toujours sur la base.
 */
export function reloadableWeapon(line: EquipmentLine): Weapon | null {
  if (isCustomItem(line)) return null;
  const item = equipmentById.get(line.itemId);
  if (item?.category !== 'weapon' || !item.reload) return null;
  return item;
}

/**
 * Capacité de l'arme, en coups prêts. Deux termes qui S'ADDITIONNENT :
 *  - la RÉSERVE : 1 par défaut (l'arme du livre se tire une fois puis se recharge, p. 185), ou la
 *    capacité du chargeur s'il y en a un (Arme à répétition, `2 + INT + paliers`, p. 62) ;
 *  - le SECOND CANON : +1 coup (Canon double, p. 63 — « il reste possible de décharger un seul canon
 *    à la fois », donc bien un coup de plus, chambré à part).
 *
 * D'où : arme nue 1, second canon 2, chargeur de 6 → 6, et **chargeur de 6 + second canon → 7**.
 *
 * INTERPRÉTATION MAISON (décision propriétaire) : le livre ne dit pas comment un chargeur et un
 * second canon se combinent — il traite les deux bricolages séparément. On retient l'addition, par
 * cohérence avec le second canon seul, qui vaut déjà « un coup de plus ».
 */
export function weaponCapacity(line: EquipmentRef, ctx: LoadingContext): number {
  return (line.magazine ? ctx.magazineCapacity : 1) + (line.doubleBarrel ? 1 : 0);
}

/**
 * Munitions d'une ligne, NORMALISÉES et bornées à la capacité courante. Point de lecture UNIQUE du
 * champ `loaded`, et seul endroit qui tolère une forme inattendue — la fiche est permissive et
 * l'inventaire d'un personnage peut venir d'un import JSON, d'un `localStorage` écrit par une version
 * antérieure, ou d'un cloud partagé :
 *  - absent → arme PLEINE de munitions normales (convention « rien à stocker au repos ») ;
 *  - tableau → tel quel, tronqué à la capacité (chargeur retiré, INT en baisse) ;
 *  - NOMBRE → autant de munitions normales. `loaded` a d'abord été un simple compteur pendant la
 *    conception de PER-284 : une fiche déjà enregistrée sous cette forme se relit sans planter, et
 *    repasse en file dès le premier geste de chargement ;
 *  - toute autre valeur → traitée comme absente, plutôt que de casser le rendu de la fiche.
 */
function normalizeShots(loaded: unknown, capacity: number): LoadedAmmunitionKind[] {
  const full = () => Array.from({ length: capacity }, (): LoadedAmmunitionKind => 'normal');
  if (loaded === undefined || loaded === null) return full();
  if (Array.isArray(loaded)) {
    return loaded
      .filter((k): k is LoadedAmmunitionKind => k === 'normal' || k === 'grapeshot')
      .slice(0, capacity);
  }
  if (typeof loaded === 'number' && Number.isFinite(loaded)) {
    const count = Math.max(0, Math.min(Math.floor(loaded), capacity));
    return Array.from({ length: count }, (): LoadedAmmunitionKind => 'normal');
  }
  return full();
}

/**
 * Action à dépenser pour remettre UN coup dans l'arme. C'est celle de la table p. 185 (`M` pour les
 * arbalètes de poing et légère, `L` pour l'arbalète lourde, la pétoire et le mousquet), SAUF sur une
 * arme à chargeur : le livre y impose sa propre cadence (p. 62, verbatim) — « Chaque chargeur doit
 * être ensuite rechargé au rythme d'une action limitée (L) par projectile. »
 */
function reloadActionOf(line: EquipmentRef, reload: WeaponReload): WeaponReload['action'] {
  return line.magazine ? 'L' : reload.action;
}

/** Coût d'un rechargement, en nombre d'actions d'un type donné. */
export interface ReloadCost {
  action: WeaponReload['action'];
  /** Nombre d'actions à dépenser (coups à remettre × rounds par coup). */
  count: number;
}

/** État de chargement d'une arme — tout ce dont l'affichage et les gestes ont besoin. */
export interface WeaponLoadingState {
  /** L'arme de base de la ligne (variante comprise : `reload` n'est jamais surchargé). */
  weapon: Weapon;
  /** Coût de rechargement au catalogue (p. 185). */
  reload: WeaponReload;
  /** Action réellement dépensée par coup remis (chargeur = `L`, p. 62). */
  reloadAction: WeaponReload['action'];
  /** Coups que l'arme peut tenir (1, 2 avec un second canon, capacité du chargeur). */
  capacity: number;
  /**
   * Munitions chargées DANS L'ORDRE DE TIR (`shots[0]` = prochain coup), bornées à la capacité.
   * `loaded` absent sur la ligne = arme pleine de munitions normales.
   */
  shots: LoadedAmmunitionKind[];
  /** Nombre de coups prêts (= `shots.length`), pour l'affichage « N/capacité ». */
  loaded: number;
  /** Nature du PROCHAIN coup tiré (`shots[0]`), ou `null` si l'arme est vide. */
  nextShot: LoadedAmmunitionKind | null;
  /** L'arme a-t-elle été dotée d'un SECOND CANON (Canon double, `artilleur-r4`, p. 63) ? */
  doubleBarrel: boolean;
  /** L'arme a-t-elle été dotée d'un CHARGEUR (Arme à répétition, `artilleur-r2`, p. 62) ? */
  magazine: boolean;
  /**
   * Coups consommés par UN tir : 2 sur un canon double (p. 63, verbatim — « un canon double consomme
   * 2 projectiles »), 1 sinon. Un chargeur ne change rien ici : il augmente la RÉSERVE
   * (`weaponCapacity`), pas la détente.
   */
  shotsPerFire: number;
  /**
   * Canon double SOUS-ALIMENTÉ : il ne reste qu'un coup alors que l'effet en demande deux. Le tir
   * reste possible — « il reste possible de décharger un seul canon à la fois » (p. 63) — mais SANS
   * le dé de DM doublé. Signalé sur la ligne d'inventaire ; jamais bloquant (fiche permissive).
   */
  underfed: boolean;
  /** L'arme est-elle pleine (aucun coup à remettre) ? */
  full: boolean;
  /** L'arme est-elle vide — donc DÉCHARGÉE, au sens des capacités qui l'exigent chargée ? */
  empty: boolean;
  /** L'arme est-elle une arme à POUDRE (p. 187, encadré « Armes à poudre ») ? */
  firearm: boolean;
  /**
   * L'arme entre-t-elle dans la limite conseillée de trois armes à poudre chargées (p. 187) ?
   * Faux pour une arme non poudrière (l'encadré ne vise que la poudre) et pour la couleuvrine, que
   * le livre exclut nommément du décompte (`reload.countsTowardLoadedLimit: false`, PER-286).
   */
  countsTowardLoadedLimit: boolean;
  /** Coût d'un rechargement COMPLET (`null` si l'arme est déjà pleine). */
  refillCost: ReloadCost | null;
}

/**
 * État de chargement d'une ligne d'inventaire, ou `null` si elle n'a rien à suivre (objet
 * personnalisé, arme sans rechargement — arc, fronde, arme de jet —, ou objet qui n'est pas une
 * arme). La `quantity` de la ligne est IGNORÉE : une arme = une ligne.
 */
export function weaponLoadingState(
  line: EquipmentLine,
  ctx: LoadingContext,
): WeaponLoadingState | null {
  const weapon = reloadableWeapon(line);
  if (!weapon) return null;
  const ref = line as EquipmentRef;
  const reload = weapon.reload!;
  const capacity = weaponCapacity(ref, ctx);
  const shots = normalizeShots(ref.loaded, capacity);
  const missing = capacity - shots.length;
  // Un canon double tire ses DEUX canons d'un coup (p. 63) ; c'est ce qui double son dé de DM.
  const shotsPerFire = ref.doubleBarrel ? 2 : 1;
  return {
    weapon,
    reload,
    reloadAction: reloadActionOf(ref, reload),
    capacity,
    shots,
    loaded: shots.length,
    nextShot: shots[0] ?? null,
    doubleBarrel: ref.doubleBarrel === true,
    magazine: ref.magazine === true,
    shotsPerFire,
    underfed: shots.length > 0 && shots.length < shotsPerFire,
    full: missing === 0,
    empty: shots.length === 0,
    firearm: weapon.rangedKind === 'firearm',
    countsTowardLoadedLimit:
      weapon.rangedKind === 'firearm' && reload.countsTowardLoadedLimit !== false,
    refillCost:
      missing === 0
        ? null
        : { action: reloadActionOf(ref, reload), count: missing * (reload.rounds ?? 1) },
  };
}

/**
 * Nombre d'ARMES À POUDRE chargées que le personnage transporte, pour la limite conseillée du livre
 * (p. 187) : une arme compte dès qu'il lui reste un coup prêt, quelle que soit sa capacité (un
 * chargeur ne fait pas de son porteur un arsenal — c'est UNE arme). La couleuvrine en est exclue,
 * comme les arbalètes (l'encadré « Charger des armes à poudre à l'avance » ne parle que de poudre).
 */
export function loadedFirearmCount(character: Character): number {
  const ctx = loadingContext(character);
  let count = 0;
  for (const line of character.equipment) {
    const state = weaponLoadingState(line, ctx);
    if (state?.countsTowardLoadedLimit && !state.empty) count++;
  }
  return count;
}

/**
 * Écrit les munitions sur une ligne en gardant la représentation CANONIQUE : une arme pleine de
 * munitions NORMALES s'écrit par l'ABSENCE du champ (« absent = plein »), pour qu'un personnage au
 * repos ne traîne aucune donnée de chargement. Toute autre combinaison est écrite telle quelle,
 * y compris `[]` (arme déchargée).
 */
function withShots(
  ref: EquipmentRef,
  shots: LoadedAmmunitionKind[],
  capacity: number,
): EquipmentRef {
  const next: EquipmentRef = { ...ref };
  if (shots.length >= capacity && shots.every((s) => s === 'normal')) delete next.loaded;
  else next.loaded = shots;
  return next;
}

/** Remplace la ligne `index` par `line`. */
function replaceLine(
  equipment: EquipmentLine[],
  index: number,
  line: EquipmentLine,
): EquipmentLine[] {
  const next = [...equipment];
  next[index] = line;
  return next;
}

/**
 * TIRER : consomme les coups en TÊTE de file — les munitions partent dans l'ordre où elles ont été
 * chargées, ce qui rend le mélange grenaille/normale lisible et prévisible pour le joueur.
 *
 * Un canon double en dépense DEUX (p. 63, verbatim : « un canon double consomme 2 projectiles »).
 * S'il n'en reste qu'un, le tir consomme ce seul coup : le livre autorise expressément de
 * « décharger un seul canon à la fois » — c'est alors un tir SANS dé de DM doublé, signalé par
 * `underfed` sur la ligne d'inventaire.
 *
 * Renvoie l'équipement INCHANGÉ (même référence) si la ligne ne se suit pas ou n'a plus rien à tirer.
 */
export function fireShot(
  equipment: EquipmentLine[],
  index: number,
  ctx: LoadingContext,
): EquipmentLine[] {
  const line = equipment[index];
  if (!line) return equipment;
  const state = weaponLoadingState(line, ctx);
  if (!state || state.empty) return equipment;
  const spent = Math.min(state.shotsPerFire, state.shots.length);
  return replaceLine(
    equipment,
    index,
    withShots(line as EquipmentRef, state.shots.slice(spent), state.capacity),
  );
}

/**
 * RECHARGER un coup (coût : une action `state.reloadAction`, cf. p. 185 et p. 62), ajouté en FIN de
 * file — il partira après les munitions déjà en place. `kind` déclare la munition employée, la
 * grenaille « devant être annoncée au moment où il charge » (p. 63) ; par défaut, munition normale.
 * Renvoie l'équipement inchangé si la ligne ne se suit pas ou est déjà pleine.
 */
export function loadShot(
  equipment: EquipmentLine[],
  index: number,
  ctx: LoadingContext,
  kind: LoadedAmmunitionKind = 'normal',
): EquipmentLine[] {
  const line = equipment[index];
  if (!line) return equipment;
  const state = weaponLoadingState(line, ctx);
  if (!state || state.full) return equipment;
  return replaceLine(
    equipment,
    index,
    withShots(line as EquipmentRef, [...state.shots, kind], state.capacity),
  );
}

/** Résultat d'un rechargement complet : l'équipement mis à jour et ce qu'il a coûté. */
export interface RefillResult {
  equipment: EquipmentLine[];
  /** Coups remis. 0 = l'arme était déjà pleine (équipement inchangé). */
  shotsAdded: number;
  /** Coût total (`null` si rien n'a été rechargé). */
  cost: ReloadCost | null;
}

/**
 * FAIRE LE PLEIN d'une arme : tous les coups manquants d'un coup, en annonçant le coût total en
 * actions — indispensable dès que la capacité dépasse 1 (chargeur, second canon), où le
 * rechargement se paie « une action limitée par projectile » (p. 62).
 */
export function refillWeapon(
  equipment: EquipmentLine[],
  index: number,
  ctx: LoadingContext,
  kind: LoadedAmmunitionKind = 'normal',
): RefillResult {
  const line = equipment[index];
  const state = line ? weaponLoadingState(line, ctx) : null;
  if (!state || state.full) return { equipment, shotsAdded: 0, cost: null };
  const added = state.capacity - state.loaded;
  return {
    equipment: replaceLine(
      equipment,
      index,
      // Complète la file SANS toucher aux munitions déjà en place (les grenailles annoncées restent).
      withShots(
        line as EquipmentRef,
        [...state.shots, ...(Array(added).fill(kind) as LoadedAmmunitionKind[])],
        state.capacity,
      ),
    ),
    shotsAdded: added,
    cost: state.refillCost,
  };
}

// ---------------------------------------------------------------------------
// Modifications d'arme octroyées par une capacité (chargeur, second canon)
// ---------------------------------------------------------------------------

/**
 * Spec de modification d'arme d'une capacité POSSÉDÉE par le personnage, avec l'id de la capacité
 * qui la porte. Plusieurs peuvent cohabiter (un arquebusier de rang 4 a chargeur ET second canon).
 */
export interface WeaponModificationSlot {
  featureId: string;
  spec: WeaponModificationLoadout;
}

/** Modifications d'arme débloquées par les capacités possédées, dans l'ordre de `featureIds`. */
export function weaponModificationSlots(
  character: Pick<Character, 'featureIds'>,
): WeaponModificationSlot[] {
  const slots: WeaponModificationSlot[] = [];
  for (const featureId of character.featureIds) {
    const spec = featureById.get(featureId)?.weaponModification;
    if (spec) slots.push({ featureId, spec });
  }
  return slots;
}

/**
 * La ligne est-elle une arme ÉLIGIBLE à cette modification ? Toute arme que le livre fait recharger
 * pour un chargeur (`reloadable`), les seules armes à poudre pour un second canon (`firearm`).
 */
export function isModifiableWeapon(
  line: EquipmentLine,
  spec: WeaponModificationLoadout,
): line is EquipmentRef {
  const weapon = reloadableWeapon(line);
  if (!weapon) return false;
  // Armes que le livre (ou une règle maison) tient hors de portée du bricolage — la couleuvrine et
  // sa contrepartie baliste : « L'arquebusier peut bricoler ses armes à poudre (mais pas une
  // couleuvrine) » (p. 63). Cf. `Weapon.excludedWeaponModifications`.
  if (weapon.excludedWeaponModifications?.includes(spec.modification)) return false;
  return spec.scope === 'reloadable' || weapon.rangedKind === 'firearm';
}

/** La ligne porte-t-elle déjà cette modification ? */
export function hasWeaponModification(
  line: EquipmentRef,
  modification: WeaponModificationLoadout['modification'],
): boolean {
  return line[modification] === true;
}

/**
 * Nombre d'armes de l'inventaire portant cette modification — pour le compteur « 1/2 » et le plafond
 * « jusqu'à deux armes de son choix » (p. 62).
 */
export function modifiedWeaponCount(
  equipment: EquipmentLine[],
  modification: WeaponModificationLoadout['modification'],
): number {
  return equipment.filter((line) => !isCustomItem(line) && hasWeaponModification(line, modification))
    .length;
}

/**
 * POSE ou RETIRE une modification sur la ligne `index`. Réducteur pur, même contrat que les gestes de
 * chargement : renvoie la MÊME référence si rien ne change (ligne inéligible, état déjà voulu, ou
 * plafond atteint — on ne dépasse pas « jusqu'à deux armes »).
 *
 * Retirer un chargeur RÉDUIT la capacité de l'arme : les munitions en trop sont écartées à la lecture
 * (`normalizeShots` tronque), aucune donnée à nettoyer ici.
 */
export function setWeaponModification(
  equipment: EquipmentLine[],
  index: number,
  spec: WeaponModificationLoadout,
  on: boolean,
): EquipmentLine[] {
  const line = equipment[index];
  if (!line || !isModifiableWeapon(line, spec)) return equipment;
  if (hasWeaponModification(line, spec.modification) === on) return equipment;
  if (
    on &&
    spec.maxWeapons !== undefined &&
    modifiedWeaponCount(equipment, spec.modification) >= spec.maxWeapons
  ) {
    return equipment;
  }
  const next: EquipmentRef = { ...line };
  if (on) next[spec.modification] = true;
  else delete next[spec.modification];
  return replaceLine(equipment, index, next);
}

/**
 * Remet TOUTES les armes de l'inventaire à plein — appliqué par le repos court comme par le repos
 * long (`rest.ts`) : au calme, rien ne justifie de rester déchargé, et le joueur n'a jamais à
 * cliquer pour revenir à l'état normal. Le plein s'écrit par l'ABSENCE de `loaded` : la capacité
 * n'entre pas en jeu, la fonction n'a donc besoin d'aucun contexte.
 *
 * Les munitions repartent toutes NORMALES : le plein est un chargement neuf, et la grenaille se
 * déclare au chargement (p. 63) — au joueur de la réannoncer s'il la veut.
 *
 * Renvoie la MÊME référence si aucune arme n'était à recharger, pour que le patch de repos ne se
 * « mixe » pas inutilement avec de l'équipement (cf. PER-266).
 */
export function reloadAllToFull(equipment: EquipmentLine[]): EquipmentLine[] {
  const needsWork = (line: EquipmentLine) => !isCustomItem(line) && line.loaded !== undefined;
  if (!equipment.some(needsWork)) return equipment;
  return equipment.map((line) => {
    if (!needsWork(line)) return line;
    const next: EquipmentRef = { ...(line as EquipmentRef) };
    delete next.loaded;
    return next;
  });
}
