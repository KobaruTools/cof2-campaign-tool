/**
 * Modèle PUR de l'« état de combat en cours » de l'écran de MJ (PER-267, milestone
 * PER-259) — types + reconstruction défensive, SANS React ni accès réseau. Extrait de
 * l'ancien hook `useGmCombatState` pour être partagé entre :
 *  - le store `campaignCombat` (source de vérité en mémoire, alimentée par la table
 *    `campaign_combat` et par le canal Realtime de session) ;
 *  - la façade `useGmCombatState` (lecture du store + mutations) ;
 *  - la migration douce `localStorage` → table.
 *
 * L'état est **relogé** de `localStorage` (`gm-combat:<cid>`, clé conservée comme pont
 * same-browser pour la projection PER-248 jusqu'à PER-268) vers la table partagée
 * `campaign_combat` (portée CAMPAGNE, MJ seul auteur). `reviveState`/`reviveStateObject`
 * reconnaissent le format courant ET migrent l'ancien format « bandits ».
 */
import type { Depletion } from '@/lib/character/types';
import type { CreatureSide } from '@/lib/ui/creature';
import {
  clampIntensity,
  statusRemainingRounds,
  untilRoundFor,
  type AnyStatusEffectId,
  type AppliedStatus,
} from '@/lib/character/statusEffects';
import {
  CUSTOM_CREATURE_SLUG,
  normalizeCustomCreature,
  type CustomCreature,
} from './customCreature';

/** Instance d'une créature dans le combat en cours. */
export interface CreatureInstance {
  /** Id d'instance stable, unique dans le combat (clé du tracker + des PV). */
  id: string;
  /**
   * Slug de la créature du bestiaire (`Creature.id` / `CreatureListItem.id`), ou
   * `CUSTOM_CREATURE_SLUG` pour une créature créée à la main (`custom` renseigné).
   */
  slug: string;
  /**
   * Bloc de stats SAISI À LA MAIN par le MJ (créature hors bestiaire) : sa présence signifie
   * qu'il n'y a **aucun blob à charger** — le bloc voyage avec l'instance, donc la projection
   * et l'écran joueur l'affichent sans accès au bestiaire. Absent (cas courant) = créature du
   * bestiaire, résolue par `slug`.
   */
  custom?: CustomCreature;
  /**
   * Nom PERSONNALISÉ donné par le MJ à l'ajout (PER-295) : « Grishnak le borgne » pour un
   * bandit de base, « Garde du corps » pour une escouade. Remplace le nom du bloc du bestiaire
   * dans l'étiquette (cf. `labelCreatureInstances`). **Absent = nom du bestiaire** (cas courant).
   * Porté par l'INSTANCE (et non par slug) : deux escouades du même bandit peuvent être nommées
   * différemment. Diffusé aux joueurs avec le roster, donc lisible même sans accès au bloc.
   */
  name?: string;
  /**
   * Visible par les joueurs sur la fenêtre projetée (PER-248). Absent ou `true` = visible ;
   * `false` = masquée (le MJ la voit sur son écran, avec un œil fermé, mais elle n'apparaît
   * PAS dans la projection). Permet de préparer un combat sans le révéler d'emblée.
   */
  visible?: boolean;
  /**
   * Camp de la créature (PER-249) : `'ally'` = alliée des joueurs, `'enemy'` = adversaire.
   * **Absent = adversaire** (migration douce : les instances déjà enregistrées et les
   * bandits legacy, dépourvus de ce champ, sont traités comme adverses partout).
   */
  side?: CreatureSide;
}

/**
 * Affichage MINIMAL d'une créature diffusé par le MJ pour l'écran distant des joueurs (PER-293).
 * Le MJ possède le bestiaire ; il pousse ici, par slug, le strict nécessaire à l'ordre
 * d'initiative — nom, initiative, et AGI (départage des égalités) — pour qu'une créature de
 * supplément PAYANT (dont le bloc n'est pas lisible par une session joueur anonyme, entitlement
 * fail-safe migration 0007) apparaisse tout de même chez le joueur. **Volontairement sans
 * illustration** : une illustration payante est une data-URI lourde (PER-245), hors de question
 * de la faire transiter/persister dans l'état de combat (le joueur retombe sur l'icône générique).
 */
export interface CreatureDisplayInfo {
  /** Nom de la créature (affiché, numéroté par instance côté UI). */
  name: string;
  /** Initiative de base du bloc (les deltas d'états sont appliqués côté UI). */
  initiative: number;
  /** AGI effective du bloc — sert UNIQUEMENT à départager les égalités d'initiative. */
  agility?: number;
}

/** Options d'ajout d'une créature au combat (PER-247, PER-248, PER-249, PER-295). */
export interface AddCreatureOptions {
  /** Visible par les joueurs sur la fenêtre projetée. Défaut `true`. */
  visible?: boolean;
  /** Camp de la créature. Défaut `'enemy'` (adversaire). */
  side?: CreatureSide;
  /**
   * Nom personnalisé appliqué à CHAQUE instance ajoutée (PER-295). Vide / espaces seuls =
   * aucun (l'étiquette retombe sur le nom du bestiaire).
   */
  name?: string;
  /**
   * Nombre d'instances à ajouter d'un coup (« 5 fois le même bandit de base », PER-295).
   * Défaut 1, borné à [1, `CREATURE_ADD_COUNT_MAX`].
   */
  count?: number;
}

/** Nombre maximal d'instances ajoutables en une fois (garde-fou de saisie, PER-295). */
export const CREATURE_ADD_COUNT_MAX = 20;

/** Longueur maximale d'un nom personnalisé de créature (garde-fou de saisie, PER-295). */
export const CREATURE_NAME_MAX_LENGTH = 60;

export interface GmCombatState {
  /** Instances de créatures ajoutées au combat (ordre d'ajout). */
  creatures: CreatureInstance[];
  /** Prochain id d'instance à attribuer (monotone, robuste aux retraits). */
  nextInstanceId: number;
  /** Manque de PV par instance (indexé par id d'instance). */
  depletions: Record<string, Depletion>;
  /** Clé du combattant dont c'est le tour (`null` = combat pas encore démarré). */
  currentTurnKey: string | null;
  /**
   * Numéro de la manche en cours (« Tour N » de l'écran de MJ). Toujours ≥ 1 : un « Tour 0 »
   * n'existe pas (un combat commence à la manche 1). S'incrémente d'1 à chaque manche complète
   * (quand « Tour suivant » reboucle sur le premier combattant) ; ajustable/remis à 1 à la main.
   * MJ seul auteur ; migration douce des combats antérieurs (absent/invalide/0 → 1).
   */
  roundNumber: number;
  /**
   * États négatifs appliqués par combattant (PER-278, milestone PER-276). La clé est la
   * MÊME que `currentTurnKey` et les lignes du tracker : id de personnage joueur OU id
   * d'instance de créature. Chaque valeur liste les états posés (forme `AppliedStatus`,
   * consommée telle quelle par `resolveStatusModifiers`), avec l'intensité pour les états
   * cumulatifs. **MJ seul auteur** ; vide par défaut (migration douce des combats antérieurs).
   */
  statuses: Record<string, AppliedStatus[]>;
  /**
   * Graine du DÉPARTAGE À ÉGALITÉ d'initiative (cf. `lib/session/initiativeOrder`) : quand deux
   * personnages joueurs ont la même initiative ET la même AGI, l'ordre est tiré au sort à partir
   * d'elle. Persistée avec le combat pour que le MJ et la projection classent à l'IDENTIQUE et que
   * l'ordre ne bouge pas d'un rendu à l'autre ; retirée à neuf à chaque réinitialisation de combat.
   * Migration douce des combats antérieurs (absente/invalide → 0, ordre alors simplement figé).
   */
  tieBreakSeed: number;
  /**
   * Affichage minimal des créatures diffusé par le MJ pour l'écran distant des joueurs (PER-293),
   * indexé par SLUG de créature (partagé par toutes les instances d'un même slug). Peuplé par le
   * MJ à mesure que les blocs du bestiaire se chargent ; consommé en REPLI par le joueur quand il
   * n'a pas accès au bloc (créature payante). Vide par défaut (migration douce ; sans lui, seules
   * les créatures du bestiaire de base s'affichaient côté joueur).
   */
  creatureInfo: Record<string, CreatureDisplayInfo>;
}

/**
 * Ancien format persisté (avant PER-247) : roster limité au bandit de base, indexé
 * par des ids numériques. Conservé pour la migration douce.
 */
interface LegacyGmCombatState {
  banditIds?: number[];
  nextBanditId?: number;
  banditDepletions?: Record<number, Depletion>;
  currentTurnKey?: string | null;
}

/** Slug de la créature du bestiaire vers laquelle migrer les anciens bandits. */
const LEGACY_BANDIT_SLUG = 'bandit-de-base';

/** État de combat vide (constante partagée, référence STABLE pour les sélecteurs de store). */
export const EMPTY_COMBAT_STATE: GmCombatState = {
  creatures: [],
  nextInstanceId: 1,
  depletions: {},
  currentTurnKey: null,
  roundNumber: 1,
  statuses: {},
  tieBreakSeed: 0,
  creatureInfo: {},
};

/** Clé `localStorage` dédiée au combat en cours d'une campagne. */
export const storageKey = (cid: string) => `gm-combat:${cid}`;

/**
 * Reconstruit un `GmCombatState` depuis une valeur DÉJÀ PARSÉE (objet du blob
 * `campaign_combat.state`, payload de broadcast, ou objet relu de `localStorage`).
 * Reconnaît le format courant (`creatures`) et migre l'ancien format bandit :
 * chaque `banditIds[n]` devient une instance `{ id: 'bandit-<n>', slug: bandit-de-base }`,
 * l'id d'instance conservant le préfixe `bandit-<n>` pour préserver le tour courant
 * (`currentTurnKey`) et l'état déplié des jauges (persistKey) des combats en cours.
 */
export function reviveStateObject(parsed: unknown): GmCombatState {
  if (!parsed || typeof parsed !== 'object') return EMPTY_COMBAT_STATE;

  // Format courant.
  const current = parsed as Partial<GmCombatState>;
  if (Array.isArray(current.creatures)) {
    const creatures = reviveCreatures(current.creatures);
    return {
      creatures,
      nextInstanceId:
        typeof current.nextInstanceId === 'number'
          ? current.nextInstanceId
          : creatures.length + 1,
      depletions: current.depletions ?? {},
      currentTurnKey: current.currentTurnKey ?? null,
      roundNumber: reviveRoundNumber(current.roundNumber),
      statuses: reviveStatuses(current.statuses),
      tieBreakSeed: reviveTieBreakSeed(current.tieBreakSeed),
      creatureInfo: reviveCreatureInfo(current.creatureInfo),
    };
  }

  // Ancien format « bandits » → instances de la créature `bandit-de-base`.
  const legacy = parsed as LegacyGmCombatState;
  if (Array.isArray(legacy.banditIds)) {
    const creatures = legacy.banditIds.map<CreatureInstance>((n) => ({
      id: `bandit-${n}`,
      slug: LEGACY_BANDIT_SLUG,
    }));
    const depletions: Record<string, Depletion> = {};
    for (const n of legacy.banditIds) {
      const dep = legacy.banditDepletions?.[n];
      if (dep) depletions[`bandit-${n}`] = dep;
    }
    return {
      creatures,
      nextInstanceId:
        typeof legacy.nextBanditId === 'number'
          ? legacy.nextBanditId
          : legacy.banditIds.length + 1,
      currentTurnKey: legacy.currentTurnKey ?? null,
      roundNumber: 1,
      depletions,
      statuses: {},
      tieBreakSeed: 0,
      creatureInfo: {},
    };
  }

  return EMPTY_COMBAT_STATE;
}

/**
 * Reconstruit défensivement le roster relu (état persisté ou payload de broadcast) : écarte
 * les entrées mal formées (id/slug non chaînes) et normalise le bloc SAISI À LA MAIN des
 * créatures manuelles. Une instance manuelle dont le bloc est irrécupérable (socle
 * initiative/PV/défense incomplet) est retirée : elle ne pourrait ni être classée ni être
 * jouée, et n'a aucun blob de bestiaire sur lequel retomber.
 */
function reviveCreatures(raw: readonly unknown[]): CreatureInstance[] {
  const out: CreatureInstance[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const inst = item as CreatureInstance;
    if (typeof inst.id !== 'string' || typeof inst.slug !== 'string') continue;
    if (inst.custom === undefined) {
      out.push(inst);
      continue;
    }
    const custom = normalizeCustomCreature(inst.custom);
    if (custom) out.push({ ...inst, custom });
  }
  return out;
}

/**
 * Normalise le compteur de manche relu : toujours ≥ 1 (un « Tour 0 » n'existe pas). Absent,
 * invalide, ≤ 0 ou décimal < 1 → 1 ; sinon partie entière. Migration douce des combats d'avant
 * (roundNumber absent ou stocké à 0).
 */
function reviveRoundNumber(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 1;
  const trunc = Math.trunc(raw);
  return trunc >= 1 ? trunc : 1;
}

/**
 * Normalise la graine de départage relue : absente/invalide → 0 (migration douce des combats
 * d'avant le départage à égalité — l'ordre est alors simplement figé, ce qui reste cohérent).
 */
function reviveTieBreakSeed(raw: unknown): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.trunc(raw) : 0;
}

/**
 * Reconstruit défensivement la carte d'affichage des créatures (`state.creatureInfo`, PER-293) :
 * tolère l'absence (défaut `{}`, migration douce) et écarte les entrées mal formées (nom non
 * chaîne, initiative non finie). L'AGI est optionnelle. Tronque les nombres (valeurs entières).
 */
function reviveCreatureInfo(raw: unknown): Record<string, CreatureDisplayInfo> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, CreatureDisplayInfo> = {};
  for (const [slug, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const name = (value as { name?: unknown }).name;
    const initiative = (value as { initiative?: unknown }).initiative;
    if (typeof name !== 'string' || typeof initiative !== 'number' || !Number.isFinite(initiative)) {
      continue;
    }
    const agility = (value as { agility?: unknown }).agility;
    out[slug] =
      typeof agility === 'number' && Number.isFinite(agility)
        ? { name, initiative: Math.trunc(initiative), agility: Math.trunc(agility) }
        : { name, initiative: Math.trunc(initiative) };
  }
  return out;
}

/**
 * Égalité de contenu de deux cartes d'affichage de créatures (PER-293). Sert de garde au MJ pour
 * n'ÉCRIRE (donc persister + diffuser) que lorsque l'affichage a réellement changé — évitant une
 * boucle de broadcast à chaque chargement de bloc. Compare clés puis champs (name/initiative/AGI).
 */
export function creatureInfoEquals(
  a: Record<string, CreatureDisplayInfo>,
  b: Record<string, CreatureDisplayInfo>,
): boolean {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const slug of ka) {
    const x = a[slug];
    const y = b[slug];
    // `Object.is` (et non `!==`) pour les nombres : robuste au `NaN` (`Object.is(NaN, NaN) === true`).
    // Un `NaN` traité comme « toujours différent » ferait boucler à l'infini le garde d'écriture
    // qui appelle cette fonction (réécriture à chaque rendu). Défense en profondeur : la source
    // (`useGmScreenCombat`) et `reviveCreatureInfo` écartent déjà les non-finis.
    if (
      !y ||
      x.name !== y.name ||
      !Object.is(x.initiative, y.initiative) ||
      !Object.is(x.agility, y.agility)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Reconstruit défensivement la carte des états appliqués (`state.statuses`) : tolère
 * l'absence (défaut `{}`, migration douce des combats d'avant PER-278) et écarte les entrées
 * mal formées. Purement STRUCTUREL — l'intensité n'est PAS re-clampée ici (le résolveur et les
 * mutations s'en chargent) ; on normalise juste la forme (`{ id }` / `{ id, intensity }` /
 * `{ id, untilRound }`), on omet les intensités ≤ 1 (convention « absent = 1 ») et les compteurs de
 * tours non finis. Les combattants sans état sont écartés.
 *
 * Un `untilRound` PASSÉ (manche déjà dépassée) est conservé tel quel : c'est un état expiré que le MJ
 * n'a pas encore retiré, et son badge doit continuer à le signaler (PER-305 : pas de retrait auto).
 */
function reviveStatuses(raw: unknown): Record<string, AppliedStatus[]> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, AppliedStatus[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const applied: AppliedStatus[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const id = (item as { id?: unknown }).id;
      if (typeof id !== 'string') continue;
      const intensity = (item as { intensity?: unknown }).intensity;
      const untilRound = (item as { untilRound?: unknown }).untilRound;
      applied.push({
        id: id as AnyStatusEffectId,
        ...(typeof intensity === 'number' && Number.isFinite(intensity) && intensity > 1
          ? { intensity: Math.trunc(intensity) }
          : {}),
        ...(typeof untilRound === 'number' && Number.isFinite(untilRound)
          ? { untilRound: Math.trunc(untilRound) }
          : {}),
      });
    }
    if (applied.length > 0) out[key] = applied;
  }
  return out;
}

/**
 * Variante depuis une chaîne JSON brute (valeur de `localStorage`) : parse défensif
 * (chaîne invalide → état vide) puis `reviveStateObject`.
 */
export function reviveState(raw: string): GmCombatState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_COMBAT_STATE;
  }
  return reviveStateObject(parsed);
}

/* ------------------------------------------------------------------------- *
 * ROSTER DE CRÉATURES (PER-247, PER-295) — purs, testés.
 * ------------------------------------------------------------------------- */

/**
 * Normalise un nom personnalisé de créature (PER-295) : espaces de bord retirés, tronqué au
 * plafond de saisie, `undefined` si vide. Un nom vide n'est JAMAIS persisté — son absence
 * signifie « prendre le nom du bestiaire ».
 */
export function normalizeCreatureName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, CREATURE_NAME_MAX_LENGTH) : undefined;
}

/**
 * Borne le nombre d'instances à ajouter à [1, `CREATURE_ADD_COUNT_MAX`] (PER-295). Absent,
 * invalide ou < 1 → 1 (ajouter « zéro créature » n'a pas de sens) ; décimales tronquées.
 */
export function clampAddCount(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 1;
  return Math.min(CREATURE_ADD_COUNT_MAX, Math.max(1, Math.trunc(raw)));
}

/**
 * Ajoute `count` instances construites par `make` (à qui l'on passe un id d'instance frais).
 * Les ids restent MONOTONES (`c-<nextInstanceId>`, robustes aux retraits) : un ajout de 5
 * consomme 5 ids. Socle commun aux créatures de bestiaire et aux créatures manuelles.
 */
function appendInstances(
  state: GmCombatState,
  count: number,
  make: (id: string) => CreatureInstance,
): GmCombatState {
  const added = Array.from({ length: count }, (_, i) => make(`c-${state.nextInstanceId + i}`));
  return {
    ...state,
    creatures: [...state.creatures, ...added],
    nextInstanceId: state.nextInstanceId + count,
  };
}

/**
 * Ajoute `count` instances de la créature `slug` au combat (PER-247, PER-295), toutes avec la
 * même visibilité joueurs, le même camp et le même nom personnalisé éventuel.
 */
export function addCreatures(
  state: GmCombatState,
  slug: string,
  options: AddCreatureOptions = {},
): GmCombatState {
  const count = clampAddCount(options.count ?? 1);
  const name = normalizeCreatureName(options.name);
  return appendInstances(state, count, (id) => ({
    id,
    slug,
    visible: options.visible ?? true,
    side: options.side ?? 'enemy',
    ...(name ? { name } : {}),
  }));
}

/**
 * Ajoute `count` instances d'une créature CRÉÉE À LA MAIN (hors bestiaire) : le bloc de stats
 * saisi est normalisé puis COPIÉ sur chaque instance, qui devient ainsi autoportante (rien à
 * charger côté projection / écran joueur). Mêmes options que `addCreatures` — `name` porte le
 * nom de la créature.
 *
 * No-op si le socle obligatoire (initiative, PV, défense) est incomplet : c'est la même garde
 * que côté saisie, appliquée ici pour que l'état ne puisse jamais contenir d'instance injouable.
 */
export function addCustomCreatures(
  state: GmCombatState,
  custom: CustomCreature,
  options: AddCreatureOptions = {},
): GmCombatState {
  const normalized = normalizeCustomCreature(custom);
  if (!normalized) return state;
  const count = clampAddCount(options.count ?? 1);
  const name = normalizeCreatureName(options.name);
  return appendInstances(state, count, (id) => ({
    id,
    slug: CUSTOM_CREATURE_SLUG,
    visible: options.visible ?? true,
    side: options.side ?? 'enemy',
    ...(name ? { name } : {}),
    custom: normalized,
  }));
}

/**
 * Duplique l'instance `instanceId` : une COPIE conforme (même créature, même nom personnalisé,
 * même camp, même visibilité, même bloc manuel le cas échéant) insérée JUSTE APRÈS l'originale,
 * pour qu'elle atterrisse à côté d'elle dans la grille et se numérote dans la foulée
 * (« Gobelin 1 / 2 »). L'id est frais et monotone comme tout ajout.
 *
 * Ce qui n'est **pas** copié : le manque de PV et les états posés. Un double est un nouveau
 * combattant, pas un clone d'un blessé — il entre en jeu intact.
 *
 * No-op si l'instance est introuvable.
 */
export function duplicateCreature(state: GmCombatState, instanceId: string): GmCombatState {
  const index = state.creatures.findIndex((c) => c.id === instanceId);
  if (index === -1) return state;
  const copy: CreatureInstance = { ...state.creatures[index], id: `c-${state.nextInstanceId}` };
  const creatures = [...state.creatures];
  creatures.splice(index + 1, 0, copy);
  return { ...state, creatures, nextInstanceId: state.nextInstanceId + 1 };
}

/**
 * Champs d'une instance de créature modifiables APRÈS son ajout au combat. Une clé absente
 * laisse la valeur en place ; c'est l'appartenance de la clé qui compte, pas sa valeur (d'où
 * les tests `in`) — sans quoi on ne saurait pas distinguer « ne touche pas au nom » de
 * « efface le nom ».
 */
export interface UpdateCreaturePatch {
  /** Nom personnalisé. Vide / espaces seuls = RETIRER le nom (retour au nom du bestiaire). */
  name?: string;
  /** Camp — permet de faire passer une créature d'un bord à l'autre en cours de partie. */
  side?: CreatureSide;
  /** Visibilité joueurs (fenêtre projetée). */
  visible?: boolean;
  /**
   * Bloc de stats saisi à la main. **Ignoré pour une créature du bestiaire** : son bloc est du
   * contenu de livre, résolu par slug ; on ne le remplace pas par une saisie. Ignoré aussi si le
   * socle obligatoire (initiative, PV, défense) n'est pas complet — l'ancien bloc reste alors en
   * place plutôt que de rendre l'instance injouable.
   */
  custom?: CustomCreature;
}

/**
 * Applique `patch` à l'instance `instanceId` (identité INCHANGÉE : ni le slug ni la nature
 * bestiaire/manuelle ne bougent — changer de créature, c'est en ajouter une autre). Les PV et
 * les états posés survivent : on modifie un combattant en place, on ne le remplace pas.
 *
 * No-op si l'instance est introuvable.
 */
export function updateCreature(
  state: GmCombatState,
  instanceId: string,
  patch: UpdateCreaturePatch,
): GmCombatState {
  if (!state.creatures.some((c) => c.id === instanceId)) return state;
  return {
    ...state,
    creatures: state.creatures.map((inst) => {
      if (inst.id !== instanceId) return inst;
      const next: CreatureInstance = { ...inst };
      if ('name' in patch) {
        const name = normalizeCreatureName(patch.name);
        if (name) next.name = name;
        else delete next.name;
      }
      if ('side' in patch && patch.side) next.side = patch.side;
      if ('visible' in patch && patch.visible !== undefined) next.visible = patch.visible;
      // Bloc manuel : réservé aux créatures qui en ont déjà un, et seulement s'il reste jouable.
      if ('custom' in patch && inst.custom) {
        const normalized = normalizeCustomCreature(patch.custom);
        if (normalized) next.custom = normalized;
      }
      return next;
    }),
  };
}

/**
 * Étiquette d'affichage de chaque instance du roster (id d'instance → étiquette), consommée par
 * les cartes de l'écran de MJ, le tracker et la projection.
 *
 * Le nom affiché est le nom PERSONNALISÉ de l'instance (PER-295) s'il y en a un, sinon celui du
 * bestiaire (`nameBySlug`), sinon le slug en dernier recours. Le **numéro n'est ajouté que si
 * plusieurs instances partagent ce nom** (« Gobelin 1 / 2 / 3 »), dans l'ordre d'ajout : une
 * créature unique s'affiche donc « Gobelin » et un PNJ nommé « Grishnak le borgne » garde son nom
 * nu. Deux noms distincts se numérotent indépendamment (« Garde du corps 1 / 2 » à côté de
 * « Bandit de base 1 / 2 »), y compris quand ils viennent du même slug.
 */
export function labelCreatureInstances(
  creatures: readonly CreatureInstance[],
  nameBySlug: ReadonlyMap<string, string>,
): Map<string, string> {
  const displayName = (inst: CreatureInstance) =>
    normalizeCreatureName(inst.name) ?? nameBySlug.get(inst.slug) ?? inst.slug;
  const totals = new Map<string, number>();
  for (const inst of creatures) {
    const name = displayName(inst);
    totals.set(name, (totals.get(name) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  const labels = new Map<string, string>();
  for (const inst of creatures) {
    const name = displayName(inst);
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    labels.set(inst.id, (totals.get(name) ?? 1) > 1 ? `${name} ${n}` : name);
  }
  return labels;
}

/* ------------------------------------------------------------------------- *
 * RÉDUCTEURS D'ÉTATS DE COMBAT (PER-278, milestone PER-276) — purs, testés.
 * Le MJ (auteur unique) les applique via le store `campaignCombat`
 * (`applyLocalCombat` → localStorage + upsert `campaign_combat` + broadcast
 * `combat-state`). Aucun accès store/réseau ici : entrée → nouvel état.
 * ------------------------------------------------------------------------- */

/**
 * Entrée canonique : on omet `intensity` quand elle vaut 1 (convention « absent = 1 ») et
 * `untilRound` quand l'état ne porte pas de compteur de tours (PER-305).
 */
function makeApplied(
  id: AnyStatusEffectId,
  intensity: number,
  untilRound?: number,
): AppliedStatus {
  return {
    id,
    ...(intensity > 1 ? { intensity } : {}),
    ...(untilRound !== undefined ? { untilRound } : {}),
  };
}

/**
 * Applique un état sur un combattant (clé = id de perso joueur OU id d'instance de créature).
 * Idempotent par (combattant, état) : ajoute l'état s'il est absent, sinon fixe son intensité.
 * L'intensité est bornée à [1, plafond du catalogue] via `clampIntensity` (toujours 1 pour un
 * état binaire). Défaut `intensity = 1`. Un compteur de tours déjà posé SURVIT (PER-305) : reposer un
 * état déjà présent en ajuste l'intensité, ça ne remet pas sa durée à l'indéterminé.
 */
export function applyStatusTo(
  state: GmCombatState,
  key: string,
  id: AnyStatusEffectId,
  intensity = 1,
): GmCombatState {
  const clamped = clampIntensity(id, intensity);
  const current = state.statuses[key] ?? [];
  const next = current.some((s) => s.id === id)
    ? current.map((s) => (s.id === id ? makeApplied(id, clamped, s.untilRound) : s))
    : [...current, makeApplied(id, clamped)];
  return { ...state, statuses: { ...state.statuses, [key]: next } };
}

/** Options de la pose de GROUPE (PER-104), toutes deux arbitrées par le MJ dans le popover de pose. */
export interface ApplyStatusToKeysOptions {
  /** Palier de l'effet (pré-rempli depuis le rang du porteur). Défaut 1 ; borné par le catalogue. */
  intensity?: number;
  /**
   * DURÉE en tours à partir de la manche courante (bornes incluses). Absent = aucun compteur, le
   * buff dure jusqu'à ce que le MJ le retire — cas par défaut, « CHA minutes » n'étant pas
   * convertible en manches. Fournie, elle REMPLACE un compteur déjà en place : reposer le buff en
   * précisant une durée est un geste délibéré, contrairement à une simple repose (cf. `applyStatusTo`).
   */
  rounds?: number;
}

/**
 * Applique un MÊME état à PLUSIEURS combattants d'un coup (PER-104) — c'est la pose des buffs de
 * groupe (« ses alliés et lui » : Chant des héros p. 67, Bénédiction p. 124), où le MJ coche les
 * combattants à portée puis valide UNE fois.
 *
 * Atomique par construction : un seul nouvel état en sortie, donc un seul upsert `campaign_combat`
 * et une seule diffusion Realtime côté store — là où N appels à `applyStatusTo` en produiraient N.
 *
 * Par combattant, la sémantique est celle d'`applyStatusTo` (idempotent, intensité bornée par le
 * catalogue, autres états conservés), à ceci près que `rounds` pose/remplace le compteur de tours.
 * Retourne la MÊME référence si rien ne change (liste vide, ou état déjà posé à l'identique partout).
 */
export function applyStatusToKeys(
  state: GmCombatState,
  keys: readonly string[],
  id: AnyStatusEffectId,
  options: ApplyStatusToKeysOptions = {},
): GmCombatState {
  const clamped = clampIntensity(id, options.intensity ?? 1);
  const posedUntil =
    options.rounds === undefined ? undefined : untilRoundFor(state.roundNumber, options.rounds);

  const statuses = { ...state.statuses };
  let changed = false;
  // `Set` : le même combattant coché deux fois ne doit pas dupliquer son entrée.
  for (const key of new Set(keys)) {
    const current = statuses[key] ?? [];
    const existing = current.find((s) => s.id === id);
    // Sans durée explicite, un compteur déjà posé survit (même règle qu'`applyStatusTo`).
    const untilRound = posedUntil ?? existing?.untilRound;
    const entry = makeApplied(id, clamped, untilRound);
    if (existing) {
      if (existing.intensity === entry.intensity && existing.untilRound === entry.untilRound) {
        continue;
      }
      statuses[key] = current.map((s) => (s.id === id ? entry : s));
    } else {
      statuses[key] = [...current, entry];
    }
    changed = true;
  }
  return changed ? { ...state, statuses } : state;
}

/**
 * Retire un MÊME état de PLUSIEURS combattants d'un coup (PER-104) : le pendant d'`applyStatusToKeys`,
 * pour lever un buff sur tout le camp en une écriture. Les combattants qui ne le portent pas sont
 * ignorés, et les clés vidées sont nettoyées. Même référence si rien n'est retiré.
 */
export function removeStatusFromKeys(
  state: GmCombatState,
  keys: readonly string[],
  id: AnyStatusEffectId,
): GmCombatState {
  const statuses = { ...state.statuses };
  let changed = false;
  for (const key of new Set(keys)) {
    const current = statuses[key];
    if (!current || !current.some((s) => s.id === id)) continue;
    const next = current.filter((s) => s.id !== id);
    if (next.length === 0) delete statuses[key];
    else statuses[key] = next;
    changed = true;
  }
  return changed ? { ...state, statuses } : state;
}

/**
 * Retire un état d'un combattant. No-op si l'état n'est pas posé. Nettoie la clé du combattant
 * quand il ne lui reste aucun état (carte `statuses` sans entrée vide).
 */
export function removeStatusFrom(
  state: GmCombatState,
  key: string,
  id: AnyStatusEffectId,
): GmCombatState {
  const current = state.statuses[key];
  if (!current || !current.some((s) => s.id === id)) return state;
  const next = current.filter((s) => s.id !== id);
  const statuses = { ...state.statuses };
  if (next.length === 0) delete statuses[key];
  else statuses[key] = next;
  return { ...state, statuses };
}

/**
 * Ajuste de `delta` (±) l'intensité d'un état cumulatif DÉJÀ posé sur un combattant, bornée à
 * [1, plafond]. No-op si l'état n'est pas posé (le retrait passe par `removeStatusFrom`, pas par
 * un décrément) ; reste 1 pour un état binaire (plafond 1).
 */
export function adjustStatusIntensity(
  state: GmCombatState,
  key: string,
  id: AnyStatusEffectId,
  delta: number,
): GmCombatState {
  const current = state.statuses[key];
  const entry = current?.find((s) => s.id === id);
  if (!current || !entry) return state;
  const clamped = clampIntensity(id, (entry.intensity ?? 1) + delta);
  const next = current.map((s) => (s.id === id ? makeApplied(id, clamped, s.untilRound) : s));
  return { ...state, statuses: { ...state.statuses, [key]: next } };
}

/**
 * Ajuste de `delta` (±) le COMPTEUR DE TOURS d'un état déjà posé sur un combattant (PER-305), en
 * partant des tours restants à la manche courante de l'état de combat. Écrit une manche de FIN
 * (`untilRound`), jamais un décompte — le nombre affiché se dérive ensuite tout seul.
 *
 * - Sans compteur, `+1` l'AMORCE à 1 tour (l'état couvre alors la seule manche courante) ;
 * - un compteur EXPIRÉ (0 tour restant) repart de 0, donc `+1` le relance d'un tour ;
 * - descendre sous 1 RETIRE le compteur (l'état redevient « jusqu'à ce que le MJ le retire ») et
 *   **ne retire pas l'état** — le retrait passe par `removeStatusFrom`, comme pour l'intensité ;
 * - la durée est bornée par `clampStatusRounds` (garde-fou de saisie).
 *
 * No-op si l'état n'est pas posé, ou si le compteur ne bouge pas (évite une écriture + une diffusion
 * Realtime pour rien). Le compteur ne pèse sur aucun calcul : c'est un pense-bête de MJ.
 */
export function adjustStatusDuration(
  state: GmCombatState,
  key: string,
  id: AnyStatusEffectId,
  delta: number,
): GmCombatState {
  const current = state.statuses[key];
  const entry = current?.find((s) => s.id === id);
  if (!current || !entry) return state;
  const remaining = (statusRemainingRounds(entry, state.roundNumber) ?? 0) + Math.trunc(delta);
  const untilRound = remaining < 1 ? undefined : untilRoundFor(state.roundNumber, remaining);
  if (untilRound === entry.untilRound) return state;
  const next = current.map((s) =>
    s.id === id ? makeApplied(id, clampIntensity(id, s.intensity ?? 1), untilRound) : s,
  );
  return { ...state, statuses: { ...state.statuses, [key]: next } };
}

/**
 * Recale les compteurs de tours (PER-305) d'une manche de référence sur une autre, à tours RESTANTS
 * constants : un état auquel il restait 2 tours à la manche 7 en a toujours 2 à la manche 1. Sert
 * `restartRounds`, qui ramène le compteur de manches à 1 sans rien changer à la situation des
 * combattants — sans ce recalage, un `untilRound` absolu se retrouverait loin dans le futur et
 * afficherait une durée fantaisiste.
 *
 * Les compteurs déjà EXPIRÉS sont retirés : un « 0 tour » qu'on traîne dans une nouvelle séquence de
 * manches n'est plus un pense-bête, juste un reste. L'état lui-même, lui, reste posé. Retourne la
 * carte d'origine (même référence) quand aucun compteur n'est en jeu, cas courant.
 */
function rebaseStatusDurations(
  statuses: Record<string, AppliedStatus[]>,
  fromRound: number,
  toRound: number,
): Record<string, AppliedStatus[]> {
  let changed = false;
  const out: Record<string, AppliedStatus[]> = {};
  for (const [key, applied] of Object.entries(statuses)) {
    out[key] = applied.map((s) => {
      const remaining = statusRemainingRounds(s, fromRound);
      if (remaining === undefined) return s;
      changed = true;
      return makeApplied(
        s.id,
        s.intensity ?? 1,
        remaining < 1 ? undefined : untilRoundFor(toRound, remaining),
      );
    });
  }
  return changed ? out : statuses;
}

/**
 * Retire TOUS les états d'un combattant (au retrait de sa carte, ou à la réinitialisation du
 * combat côté PER-283). No-op si le combattant n'a aucun état.
 */
export function clearStatusesOf(state: GmCombatState, key: string): GmCombatState {
  if (!state.statuses[key]) return state;
  const statuses = { ...state.statuses };
  delete statuses[key];
  return { ...state, statuses };
}

/**
 * Retire les états de TOUS les combattants, sans rien toucher d'autre (PER-312) : c'est ce que le
 * MJ peut demander en clôturant un repos de groupe — le groupe a soufflé trente minutes ou dormi
 * une nuit, les états de durée du tracker n'ont plus lieu d'être. Contrairement à `resetCombat`,
 * le tour courant, la manche et les PV des créatures sont CONSERVÉS : une pause n'efface pas la
 * scène, elle en efface les états. No-op (même référence) si plus aucun état n'est posé.
 */
export function clearAllStatuses(state: GmCombatState): GmCombatState {
  if (Object.keys(state.statuses).length === 0) return state;
  return { ...state, statuses: {} };
}

/**
 * Réinitialise le combat en cours (PER-283, clôt la milestone PER-276). Vide TOUS les états
 * de tous les combattants, remet le tour courant à `null`, RECOMMENCE à la manche 1 (un « Tour 0 »
 * n'existe pas) et restaure les PV des créatures (`depletions`). Conserve délibérément le roster de
 * créatures (`creatures` / `nextInstanceId`) et NE TOUCHE PAS aux PV des personnages joueurs
 * (portés par leur fiche, hors de ce blob) : une réinitialisation « peu surprenante » ne recompose
 * pas la scène et n'écrit pas les fiches. Action destructive à confirmer côté UI ; MJ seul auteur
 * (broadcast automatique).
 */
export function resetCombat(state: GmCombatState): GmCombatState {
  return { ...state, statuses: {}, currentTurnKey: null, roundNumber: 1, depletions: {} };
}

/**
 * Retire une NOUVELLE graine de départage à égalité d'initiative (cf. `initiativeOrder`). Appelée
 * à la RÉINITIALISATION du combat (composée avec `resetCombat`) : nouveau combat, nouveau tirage
 * entre joueurs à égalité parfaite. Le tirage lui-même est impur (`randomTieBreakSeed`) et reste
 * chez l'appelant ; ce réducteur ne fait que le poser. Pas appelée par `restartRounds` : recommencer
 * le compteur de manches ne rejoue pas l'initiative.
 */
export function rollTieBreakSeed(state: GmCombatState, tieBreakSeed: number): GmCombatState {
  return { ...state, tieBreakSeed };
}

/**
 * Recommence le décompte des manches (« Tour N » → 1) et repositionne le tour courant sur
 * `firstTurnKey` — le premier de l'ordre d'initiative, fourni par l'appelant (l'ordre vit dans la
 * couche UI) — ou `null` si le roster est vide. NE RETIRE NI états NI PV : contrairement à
 * `resetCombat`, ce n'est PAS une réinitialisation du combat mais un simple « recommencer le tour »
 * du compteur d'initiative (bouton ⟳ de l'en-tête). MJ seul auteur (broadcast automatique).
 *
 * Seule retouche aux états : les COMPTEURS DE TOURS (PER-305) sont recalés sur la manche 1 à tours
 * restants constants (`rebaseStatusDurations`) — ce sont des manches absolues, elles n'auraient plus
 * aucun sens sur le nouveau décompte.
 */
export function restartRounds(
  state: GmCombatState,
  firstTurnKey: string | null = null,
): GmCombatState {
  return {
    ...state,
    roundNumber: 1,
    currentTurnKey: firstTurnKey,
    statuses: rebaseStatusDurations(state.statuses, state.roundNumber, 1),
  };
}

/**
 * Fixe le numéro de manche (« Tour N »), borné à ≥ 1 (un « Tour 0 » n'existe pas). Sert l'incrément
 * automatique en fin de manche (« Tour suivant » qui reboucle) comme l'ajustement/la remise à 1 à
 * la main. MJ seul auteur (broadcast automatique).
 */
export function setRoundNumber(state: GmCombatState, roundNumber: number): GmCombatState {
  const next = Math.max(1, Math.trunc(roundNumber));
  if (next === state.roundNumber) return state;
  return { ...state, roundNumber: next };
}
