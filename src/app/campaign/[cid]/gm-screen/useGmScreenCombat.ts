'use client';

/**
 * Logique du « combat en cours » de l'écran de MJ, PARTAGÉE (PER-248) entre la page
 * complète (`page.tsx`) et la fenêtre « présentation » (`tracker/page.tsx`, second
 * écran en miroir). Elle rassemble :
 *  - le chargement des stores nécessaires (personnages, campagnes, joueurs, bestiaire) ;
 *  - l'état du combat persisté par campagne (`useGmCombatState`) ;
 *  - la dérivation des lignes du tracker d'initiative (personnages réclamés + créatures),
 *    avec Initiative / PV lus des stats dérivées (persos) ou du blob (créatures).
 *
 * Un SEUL point d'entrée pour éviter deux instances concurrentes de `useGmCombatState`
 * (chacune aurait son propre état en mémoire) : la page et la fenêtre présentation
 * appellent ce hook une fois et piochent ce dont elles ont besoin.
 *
 * Les callbacks de PV (`onDamage`/`onHeal`/`onReset`) écrivent le vrai état (fiche via
 * `upsert`, créature via le combat local). En fenêtre présentation, le tracker est rendu
 * en lecture seule : ces callbacks existent mais ne sont jamais déclenchés (contrôles
 * masqués), ce qui évite toute écriture concurrente sur les fiches (verrou optimiste).
 */
import { useCallback, useEffect, useMemo } from 'react';
import { darken } from '@mui/material/styles';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { deriveStats, type Abilities, type DerivedStats } from '@/lib/engine';
import { applyDamage, healHp, resetHp } from '@/lib/character/gauges';
import { storageKeys } from '@/lib/storage/keys';
import { summarize } from '@/lib/character/summary';
import { classColor, prestigeCategoryColor, ANCESTRY_COLOR, MAGE_PATH_COLOR } from '@/lib/ui/classColors';
import { creatureNcLabel, SIDE_ACCENT, SIDE_LABELS } from '@/lib/ui/creature';
import type { DamageKind } from '@/components/sheet/HpGauge';
import type {
  CombatAttackKind,
  CombatStats,
  InitiativeRow,
} from '@/components/campaign/InitiativeTracker';
import type { Character, Depletion } from '@/lib/character/types';
import type { Campaign } from '@/lib/campaign/types';
import type { Player } from '@/lib/player/types';
import type { CreatureAttack } from '@/data/schema';
import {
  useGmCombatState,
  type CombatRole,
  type CreatureInstance,
  type AddCreatureOptions,
  type UpdateCreaturePatch,
} from './useGmCombatState';
import {
  customCreatureBlob,
  CUSTOM_CREATURE_FALLBACK_NAME,
  CUSTOM_CREATURE_SLUG,
  type CustomCreature,
} from '@/lib/session/customCreature';
import {
  creatureInfoEquals,
  labelCreatureInstances,
  partyAuraCarrierIdsEqual,
  type ApplyStatusToKeysOptions,
  type CreatureDisplayInfo,
} from '@/lib/session/combatState';
import { sortByInitiative } from '@/lib/session/initiativeOrder';
import {
  effectiveStatuses,
  hpAutoStatuses,
  resolveStatusModifiers,
  type AnyStatusEffectId,
  type AppliedStatus,
} from '@/lib/character/statusEffects';
import { unlockedGroupBuffIds } from '@/lib/character/groupBuffs';
import { passiveAuraCarrierIds, passiveAuraStatusesFor } from '@/lib/character/partyAuras';
import { effectiveFeatureIdsForMods } from '@/lib/character/choices';
import { withReceivedCrystals } from '@/lib/character/crystals';
import {
  companionMountEnSelle,
  listCompanions,
  referencedBestiaryCreatureSlugs,
  resolveCreatureAttackBonus,
  resolveCreatureDefenseNumber,
  resolveCreatureMaxHp,
  type CompanionEntry,
} from '@/lib/character/companions';
import {
  damageCompanion,
  healCompanion,
  removeCompanionInstance,
  resetCompanionHp,
  setMountedTarget,
} from '@/lib/character/sheetActions';
import { effectContext } from '@/lib/character/effects';
import { resolveCreatureAbilities } from '@/lib/ui/creature';
import { featureById, pathById } from '@/data';
import {
  BENEFICIAL_EFFECT_IDS,
  SITUATIONAL_EFFECT_IDS,
  type BeneficialEffectId,
  type SituationalEffectId,
} from '@/data/schema';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { usePlayersStore } from '@/stores/players';
import { useBestiaryStore } from '@/stores/bestiary';

/** Couleur d'accent des lignes de créatures adverses (PNJ). */
export const CREATURE_ACCENT = SIDE_ACCENT.enemy;
/** Couleur d'accent des lignes de créatures alliées (PER-249). */
export const ALLY_ACCENT = SIDE_ACCENT.ally;
/**
 * Gris neutre de repli pour un COMPAGNON dont la voie source est introuvable (ne devrait pas
 * arriver en pratique — un compagnon vient toujours d'un rang de voie acquis). Un peu plus clair
 * que la bordure neutre des personnages (`rgba(255, 255, 255, 0.08)`) : la catégorie « Compagnon »
 * doit se distinguer d'un coup d'œil même sans thème de voie à reprendre.
 */
export const COMPANION_DEFAULT_ACCENT = '#90a4ae';

/**
 * Couleur d'accent d'un COMPAGNON (bordure de colonne + libellé « Compagnon », retour propriétaire
 * 2026-08-10) : reprend la teinte de la VOIE qui l'octroie plutôt qu'une couleur violette arbitraire
 * — le vert du rôdeur pour Le loup, la teinte de famille (émeraude/grenat/saphir/améthyste, cf.
 * `PRESTIGE_CATEGORY_COLORS`) pour une voie de prestige comme le familier fantastique — RASSOMBRIE
 * (`darken`) pour rester discrète et ne pas jurer avec les couleurs de profil déjà utilisées sur
 * l'écran de MJ. Repli gris neutre (`COMPANION_DEFAULT_ACCENT`) si la voie est introuvable.
 */
function companionPathAccent(pathId: string): string {
  const path = pathById.get(pathId);
  if (!path) return COMPANION_DEFAULT_ACCENT;
  const base =
    path.type === 'class'
      ? classColor(path.classIds[0])
      : path.type === 'prestige'
        ? prestigeCategoryColor(path.category)
        : path.type === 'mage'
          ? MAGE_PATH_COLOR
          : ANCESTRY_COLOR;
  return darken(base, 0.16);
}

/**
 * Parse le bonus d'attaque VERBATIM d'une créature (« +7 », « -2 », « +12 ») en nombre (PER-280),
 * pour lui appliquer les deltas d'état. `null` si le livre ne donne pas de bonus chiffré (attaque
 * alors non affichée en pastille ajustable).
 */
function parseAttackBonus(bonus: string | undefined): number | null {
  if (!bonus) return null;
  const match = bonus.match(/-?\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Type d'attaque d'une entrée de bloc de créature (PER-280) : à distance si le livre imprime une
 * portée, magique si le mode le nomme (« Attaque magique »), sinon contact. Détermine le delta d'état
 * appliqué (un état comme Aveuglé baisse le contact de −5 mais la distance de −10).
 */
function creatureAttackKind(attack: CreatureAttack): CombatAttackKind {
  if (attack.range) return 'ranged';
  if (/magi/i.test(attack.name)) return 'magic';
  return 'melee';
}

/**
 * Instance de créature enrichie de son étiquette d'affichage : nom personnalisé (PER-295) ou nom
 * du bestiaire, numéroté uniquement en cas d'homonymes (« Gobelin 1 / 2 »).
 */
export type LabeledCreature = CreatureInstance & { label: string };

/**
 * Un compagnon débloqué d'un personnage réclamé, prêt pour la carte du roster de l'écran de MJ
 * (nouvelle section « Compagnons », retour propriétaire 2026-08-10) — même donnée que la mini-fiche
 * de la fiche personnelle (`CompanionsPanel`/`CompanionCard`), à laquelle cette carte s'ajoute une
 * coque + l'identité du propriétaire. `masterDerived` est le derived stats PLAIN du personnage (SANS
 * les cristaux confiés ni les états de combat) — la carte reflète la fiche telle quelle, pas la
 * cascade de combat réservée au tracker d'initiative (`companionRows` ci-dessous).
 */
export interface CompanionRosterEntry {
  /** Clé stable, namespacée par personnage (miroir de la ligne du tracker). */
  key: string;
  /** Personnage propriétaire du compagnon. */
  character: Character;
  /** Compagnon débloqué (profil déjà augmenté des améliorations de voie). */
  entry: CompanionEntry;
  /** Caractéristiques effectives du maître (`effectContext`, comme la fiche). */
  abilities: Abilities;
  /** Stats dérivées PLAIN du maître (comme la fiche — sans cristaux/états de combat). */
  masterDerived: DerivedStats | undefined;
  /** Dépletion de PV de CE compagnon. */
  depletion: Depletion;
  /** Couleur de thème (voie source), pour teinter la carte. */
  accentColor: string;
  /**
   * Suppression manuelle (zombie uniquement, PER-235). Absent = compagnon classique. La carte du
   * roster reste LECTURE SEULE côté PV (pas d'`onDamage`/`onHeal`/`onReset` — comme les cartes
   * joueurs/créatures de cette section) : la gestion des PV en combat vit dans le tracker
   * d'initiative, qui affiche déjà ce même compagnon (`companionRows` ci-dessus).
   */
  onDelete?: () => void;
  /** État « en selle » (PER-216) — `null` = pas une monture de voie chevauchable. */
  mounted: boolean | null;
  /** Bascule l'état « en selle » (fourni seulement avec `mounted` non nul). */
  onSetMounted?: (on: boolean) => void;
}

export interface GmScreenCombat {
  /** Le staging des personnages a-t-il fini de s'hydrater (gate l'UI de chargement) ? */
  charactersHydrated: boolean;
  /** Les campagnes sont-elles encore en cours de chargement (nom pas résolu) ? */
  campaignsLoading: boolean;
  /** Campagne courante (ou `undefined` si introuvable). */
  campaign: Campaign | undefined;
  /** Personnages de la campagne réclamés par un joueur (triés par nom). */
  claimed: Character[];
  /**
   * Compagnons débloqués de TOUS les personnages réclamés (section « Compagnons » du roster de
   * l'écran de MJ, entre « Joueurs » et « Alliés »), dans l'ordre des personnages puis d'acquisition.
   */
  companionRoster: CompanionRosterEntry[];
  /** Nom du joueur par id (pour l'étiquette « (Joueur) »). */
  playerNameById: Map<string, string>;
  /** Joueur (entité complète : présence, lien magique) par id, pour le badge enrichi du MJ. */
  playerById: Map<string, Player>;
  /** Créatures du combat, étiquetées dans l'ordre d'ajout (tous camps confondus). */
  labeledCreatures: LabeledCreature[];
  /** Créatures ALLIÉES du combat (sous-ensemble de `labeledCreatures`), dans l'ordre d'ajout. */
  allies: LabeledCreature[];
  /** Créatures ADVERSES du combat (sous-ensemble de `labeledCreatures`), dans l'ordre d'ajout. */
  enemies: LabeledCreature[];
  /** Lignes du tracker (persos réclamés + créatures), classées par initiative décroissante. */
  initiativeRows: InitiativeRow[];
  /** Clé du combattant dont c'est le tour (`null` = combat non démarré). */
  currentTurnKey: string | null;
  /** Fixe le combattant dont c'est le tour. */
  setCurrentTurnKey: (key: string | null) => void;
  /** Numéro de la manche en cours (« Tour N », toujours ≥ 1 : un « Tour 0 » n'existe pas). */
  roundNumber: number;
  /** Fixe le numéro de manche, borné à ≥ 1 (incrément auto de fin de manche + réglage manuel). */
  setRoundNumber: (roundNumber: number) => void;
  /**
   * Ajoute une ou plusieurs instances de la créature `slug` au combat (visibilité joueurs, camp,
   * nom personnalisé et nombre d'exemplaires initiaux — cf. `AddCreatureOptions`).
   */
  addCreature: (slug: string, options?: AddCreatureOptions) => void;
  /**
   * Ajoute une ou plusieurs instances d'une créature CRÉÉE À LA MAIN (hors bestiaire) : son bloc
   * de stats est copié sur chaque instance et voyage avec l'état de combat.
   */
  addCustomCreature: (custom: CustomCreature, options?: AddCreatureOptions) => void;
  /**
   * Duplique une instance du combat : copie conforme (même créature, nom, camp, visibilité)
   * insérée juste après elle. Le double entre INTACT — il n'hérite ni des PV entamés ni des
   * états de l'originale.
   */
  duplicateCreature: (instanceId: string) => void;
  /**
   * Modifie une instance déjà au combat (nom, camp, visibilité ; bloc de stats pour une créature
   * créée à la main). PV entamés et états posés sont conservés.
   */
  updateCreature: (instanceId: string, patch: UpdateCreaturePatch) => void;
  /** Retire l'instance `instanceId` du combat. */
  removeCreature: (instanceId: string) => void;
  /** Bascule la visibilité joueurs d'une instance de créature (fenêtre projetée). */
  setCreatureVisibility: (instanceId: string, visible: boolean) => void;
  /** États de combat appliqués par combattant (clé = id de perso OU d'instance de créature). */
  statuses: Record<string, AppliedStatus[]>;
  /**
   * Effets situationnels DÉBLOQUÉS par la table (PER-279) : ceux qu'au moins un personnage réclamé
   * confère via une capacité acquise (`character.featureIds` → `situationalEffectIds`). Dans l'ordre
   * du catalogue. Vide = aucun ; la palette masque alors le groupe « Effets situationnels ».
   */
  situationalEffectIds: SituationalEffectId[];
  /**
   * Effets situationnels actuellement POSÉS sur au moins un combattant (PER-74), dans l'ordre du
   * catalogue — pendant de `posedGroupBuffIds` côté orange. C'est ce que la croix de la palette
   * propose de lever : vide = rien à lever, la croix disparaît. Se déduit des états posés,
   * indépendamment du gating de `situationalEffectIds`.
   */
  posedSituationalIds: SituationalEffectId[];
  /**
   * Buffs de GROUPE débloqués par la table (PER-104), pendant de `situationalEffectIds` : ceux qu'au
   * moins un personnage réclamé confère (`character.featureIds` → `groupBuffIds`). Dans l'ordre du
   * catalogue. Vide = aucun barde ni prêtre à la table, la palette masque la ligne.
   */
  groupBuffIds: BeneficialEffectId[];
  /**
   * Buffs de groupe actuellement POSÉS sur au moins un combattant, dans l'ordre du catalogue. C'est
   * ce que la croix de la palette propose de lever : vide = rien à lever, la croix disparaît. Se
   * déduit des états posés, donc indépendamment du gating de `groupBuffIds` (le porteur a pu quitter
   * la table) et des deux camps confondus.
   */
  posedGroupBuffIds: BeneficialEffectId[];
  /** Applique un état sur un combattant (intensité 1 ; PER-279). */
  applyStatus: (combatantKey: string, id: AnyStatusEffectId) => void;
  /** Retire un état d'un combattant (PER-279). */
  removeStatus: (combatantKey: string, id: AnyStatusEffectId) => void;
  /**
   * Pose un MÊME état sur PLUSIEURS combattants en UNE écriture (PER-104) : c'est ainsi qu'un buff
   * de groupe est appliqué à tout le camp — une seule diffusion Realtime au lieu d'une par cible.
   */
  applyStatusToMany: (
    combatantKeys: readonly string[],
    id: AnyStatusEffectId,
    options?: ApplyStatusToKeysOptions,
  ) => void;
  /** Retire un MÊME état de PLUSIEURS combattants en une écriture (pendant d'`applyStatusToMany`). */
  removeStatusFromMany: (combatantKeys: readonly string[], id: AnyStatusEffectId) => void;
  /**
   * Lève les états listés sur TOUS les combattants en une écriture, sans que l'appelant sache qui les
   * porte : la croix des buffs de groupe de la palette. Un buff posé sur six cartes se lève d'un clic.
   */
  removeStatusesEverywhere: (ids: readonly AnyStatusEffectId[]) => void;
  /** Ajuste de `delta` (±) l'intensité d'un état cumulatif d'un combattant (PER-280). */
  adjustStatus: (combatantKey: string, id: AnyStatusEffectId, delta: number) => void;
  /**
   * Ajuste de `delta` (±) le COMPTEUR DE TOURS d'un état posé (PER-305) : `+1` sans compteur
   * l'amorce à 1 tour, descendre sous 1 le retire sans retirer l'état.
   */
  adjustStatusDuration: (combatantKey: string, id: AnyStatusEffectId, delta: number) => void;
  /**
   * Réinitialise le combat (PER-283) : vide tous les états, remet le tour courant à « aucun »,
   * recommence à la manche 1 et restaure les PV des créatures. Conserve le roster ; ne touche pas
   * aux PV des joueurs.
   */
  resetCombat: () => void;
  /**
   * Recommence le décompte des manches (bouton ⟳ de l'en-tête) : compteur → 1 et tour courant
   * remis à « aucun » (`null`) — PAS repositionné sur le premier de l'ordre d'initiative, pour que
   * `currentTurnKey === null` reste le signal fiable « combat non commencé » (bouton « Commencer
   * le combat » de `InitiativeTracker`, condensé de la bande d'initiative de la fiche). Ne touche
   * NI aux états NI aux PV.
   */
  restartRounds: () => void;
  /** Clés des combattants ayant déjà joué dans la manche en cours (PER-436). */
  actedKeys: string[];
  /** Bascule manuelle du badge « a déjà joué » (PER-436). */
  setCombatantActed: (key: string, acted: boolean) => void;
  /** Position manuelle de l'ordre d'initiative (PER-436, écran de MJ) : clé → clé d'ancrage. */
  manualOrder: Record<string, string | null>;
  /** Sous-ensemble de `manualOrder` qui survit au changement de manche (PER-436). */
  pinnedOrderKeys: string[];
  /** Pose la position manuelle de `key` (PER-436, dépôt du glisser-déposer). */
  setManualPosition: (key: string, beforeKey: string) => void;
  /** Bascule l'épinglage de la position manuelle de `key` (PER-436). */
  toggleCombatantPin: (key: string, currentBeforeKey: string | null) => void;
  /** Retire la position manuelle de `key` et son épinglage (PER-436). */
  resetCombatantOrder: (key: string) => void;
}

export function useGmScreenCombat(cid: string, role: CombatRole = 'reader'): GmScreenCombat {
  const {
    creatures,
    depletions,
    statuses,
    currentTurnKey,
    roundNumber,
    tieBreakSeed,
    creatureInfo,
    partyAuraCarrierIds,
    setPartyAuraCarrierIds,
    addCreature,
    addCustomCreature,
    duplicateCreature,
    updateCreature,
    removeCreature,
    setCreatureVisibility,
    setCreatureDepletion,
    setCurrentTurnKey,
    setRoundNumber,
    applyStatus,
    removeStatus,
    applyStatusToMany,
    removeStatusFromMany,
    removeStatusesEverywhere,
    adjustStatus,
    adjustStatusDuration,
    setCreatureInfo,
    resetCombat,
    restartRounds: restartRoundsBase,
    actedKeys,
    setCombatantActed,
    manualOrder,
    pinnedOrderKeys,
    setManualPosition,
    toggleCombatantPin,
    resetCombatantOrder,
  } = useGmCombatState(cid, role);

  const charactersHydrated = useCharactersStore((s) => s.hasHydrated);
  const characters = useCharactersStore((s) => s.characters);
  const loadCharacters = useCharactersStore((s) => s.load);
  const upsert = useCharactersStore((s) => s.upsert);
  const campaignsStatus = useCampaignsStore((s) => s.status);
  const loadCampaigns = useCampaignsStore((s) => s.load);
  const campaign = useCampaignsStore((s) => s.campaigns.find((c) => c.id === cid));
  const players = usePlayersStore((s) => s.players);
  const loadPlayers = usePlayersStore((s) => s.load);
  const bestiaryList = useBestiaryStore((s) => s.list);
  const loadBestiaryList = useBestiaryStore((s) => s.loadList);
  const blobs = useBestiaryStore((s) => s.blobs);
  const loadBlob = useBestiaryStore((s) => s.loadBlob);

  // Rafraîchit depuis le cloud (persos + campagnes + joueurs + bestiaire) au montage,
  // comme les autres pages MJ : l'accès direct ne doit pas afficher un état périmé.
  useEffect(() => {
    void loadCharacters();
    void loadCampaigns();
    void loadPlayers(cid);
    void loadBestiaryList();
  }, [loadCharacters, loadCampaigns, loadPlayers, loadBestiaryList, cid]);

  // Charge le blob de chaque créature du roster (Init./PV lus du bloc) ; idempotent. Une
  // créature créée à la main n'a rien à charger : son bloc voyage avec l'instance.
  useEffect(() => {
    for (const inst of creatures) if (!inst.custom) void loadBlob(inst.slug);
  }, [creatures, loadBlob]);

  const playerNameById = useMemo(
    () => new Map(players.map((p) => [p.id, p.name])),
    [players],
  );
  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  // Nom de chaque créature (liste légère) pour l'étiquette, avant même le blob. Repli sur
  // l'affichage diffusé par le MJ (`creatureInfo`, PER-293) pour les slugs absents de la liste
  // — cas d'une créature de supplément PAYANT côté joueur (liste bestiaire limitée au gratuit).
  const creatureNameBySlug = useMemo(() => {
    const map = new Map((bestiaryList ?? []).map((c) => [c.id, c.name]));
    for (const [slug, info] of Object.entries(creatureInfo)) {
      if (!map.has(slug)) map.set(slug, info.name);
    }
    // Filet pour les créatures créées à la main : elles portent leur nom sur l'instance, mais
    // une instance non nommée retomberait sinon sur le slug technique.
    map.set(CUSTOM_CREATURE_SLUG, CUSTOM_CREATURE_FALLBACK_NAME);
    return map;
  }, [bestiaryList, creatureInfo]);

  // Diffusion de l'affichage des créatures pour l'écran distant des joueurs (PER-293) — MJ
  // SEULEMENT (auteur unique, entitlé au bestiaire). À mesure que les blocs se chargent, on
  // pousse par slug le minimum affichable (nom/init/AGI, PAS l'illustration) dans l'état de
  // combat : il est alors persisté + diffusé, et un joueur privé du bloc (créature payante) peut
  // afficher la ligne. Garde `creatureInfoEquals` : on n'écrit (donc persiste/diffuse) que si le
  // contenu a réellement changé, pour ne pas boucler à chaque rendu. Le rôle lecteur (projection
  // MJ, écran joueur) n'écrit jamais : il consomme ce que le MJ a diffusé.
  useEffect(() => {
    if (role !== 'gm') return;
    const next: Record<string, CreatureDisplayInfo> = {};
    for (const inst of creatures) {
      // Créature créée à la main : rien à diffuser par slug (toutes les instances manuelles
      // partagent le même slug technique), son bloc part déjà avec l'instance elle-même.
      if (inst.custom) continue;
      const blob = blobs[inst.slug];
      const name = creatureNameBySlug.get(inst.slug);
      if (!blob || !name) continue;
      // Assainissement STRICT : on n'écrit QUE des nombres finis (miroir de `reviveCreatureInfo`).
      // Sans ça, un `NaN` (initiative/AGI absente ou mal parsée d'un bloc) rendrait `creatureInfoEquals`
      // perpétuellement « différent » (NaN ≠ NaN) → réécriture à chaque rendu → boucle + rafale de
      // broadcast pendant une session.
      const initiative =
        typeof blob.initiative === 'number' && Number.isFinite(blob.initiative) ? blob.initiative : 0;
      const agi = blob.abilities?.AGI;
      next[inst.slug] =
        typeof agi === 'number' && Number.isFinite(agi)
          ? { name, initiative, agility: agi }
          : { name, initiative };
    }
    // Fusion avec l'existant (on n'efface jamais un slug déjà diffusé) puis comparaison de contenu.
    const merged = { ...creatureInfo, ...next };
    if (!creatureInfoEquals(creatureInfo, merged)) setCreatureInfo(next);
  }, [role, creatures, blobs, creatureNameBySlug, creatureInfo, setCreatureInfo]);

  // Étiquettes d'affichage (couche pure) : nom personnalisé de l'instance (PER-295) ou nom du
  // bestiaire, numéroté dans l'ordre d'ajout SEULEMENT en cas d'homonymes (« Gobelin 1 / 2 »).
  const labeledCreatures = useMemo<LabeledCreature[]>(() => {
    const labels = labelCreatureInstances(creatures, creatureNameBySlug);
    return creatures.map((inst) => ({ ...inst, label: labels.get(inst.id) ?? inst.slug }));
  }, [creatures, creatureNameBySlug]);

  // Séparation par camp (PER-249) : alliés d'un côté, adversaires de l'autre. Le camp
  // absent (instances / bandits legacy) vaut adversaire, d'où le test explicite `=== 'ally'`.
  const allies = useMemo(
    () => labeledCreatures.filter((inst) => inst.side === 'ally'),
    [labeledCreatures],
  );
  const enemies = useMemo(
    () => labeledCreatures.filter((inst) => inst.side !== 'ally'),
    [labeledCreatures],
  );

  // Personnages de CETTE campagne réclamés par un joueur (`playerId` non nul).
  const claimed = useMemo(
    () =>
      characters
        .filter((c) => c.campaignId === cid && c.playerId !== null)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [characters, cid],
  );

  // Roster/monture ouverts (PER-378, Amitié animale + Monture géante) : charge le blob de chaque
  // créature choisie par N'IMPORTE quel personnage réclamé, pour que `listCompanions` (companionRoster
  // ET companionRows ci-dessous) puisse la résoudre en `CompanionEntry` affichable.
  // `referencedBestiaryCreatureSlugs` couvre les DEUX canaux (roster ET monture, cf. companions.ts).
  const summonedCreatureSlugs = useMemo(
    () => new Set(claimed.flatMap((c) => referencedBestiaryCreatureSlugs(c))),
    [claimed],
  );
  useEffect(() => {
    for (const slug of summonedCreatureSlugs) void loadBlob(slug);
  }, [summonedCreatureSlugs, loadBlob]);

  // Compagnons de TOUS les personnages réclamés (nouvelle section « Compagnons » du roster, retour
  // propriétaire 2026-08-10) : `masterDerived` et `abilities` sont PLAIN (comme la fiche — repris de
  // `buildCharacterDerivedView(character)` SANS `withReceivedCrystals`), pour que la carte corresponde
  // EXACTEMENT à la mini-fiche de la fiche personnelle. Le tracker d'initiative (`companionRows`
  // ci-dessus), lui, profite de la cascade de combat (cristaux confiés) — les deux vues divergent
  // volontairement, comme `characterRows` diverge déjà de la fiche statique pour la même raison.
  const companionRoster = useMemo<CompanionRosterEntry[]>(() => {
    const out: CompanionRosterEntry[] = [];
    for (const character of claimed) {
      const abilities = effectContext(character).abilities;
      const view = buildCharacterDerivedView(character);
      const masterDerived = view.derivedInput ? deriveStats(view.derivedInput) : undefined;
      for (const entry of listCompanions(character, Object.values(blobs))) {
        const mounted = companionMountEnSelle(character, entry);
        out.push({
          key: `companion:${character.id}:${entry.key}`,
          character,
          entry,
          abilities,
          masterDerived,
          depletion: character.companionDepletion[entry.key] ?? {},
          accentColor: companionPathAccent(entry.feature.pathId),
          onDelete:
            entry.instanceId !== undefined
              ? () => upsert({ ...character, ...removeCompanionInstance(character, entry.key) })
              : undefined,
          mounted,
          onSetMounted:
            mounted != null
              ? (on: boolean) => upsert({ ...character, ...setMountedTarget(character, on ? entry.key : null) })
              : undefined,
        });
      }
    }
    return out;
  }, [claimed, upsert]);

  // Effets situationnels débloqués par la table (PER-279) : on balaie les capacités acquises de
  // chaque personnage réclamé et on collecte les `situationalEffectIds` qu'elles confèrent. Restreint
  // aux ids connus du catalogue, dédupliqué, rendu dans l'ordre du catalogue (affichage stable).
  // Retour proprio 2026-08-10 : `effectiveFeatureIdsForMods` (pas le seul `featureIds`) — une capacité
  // EMPRUNTÉE (feature-from-path, ex. Malédiction liée au Bâton magique de l'archimage r5, PER-74) est
  // réellement utilisable par le personnage et doit débloquer sa puce au même titre qu'une capacité
  // native ; sans ça, un sort obtenu SEULEMENT par emprunt n'apparaissait jamais dans la palette MJ.
  const situationalEffectIds = useMemo<SituationalEffectId[]>(() => {
    const unlocked = new Set<SituationalEffectId>();
    for (const character of claimed) {
      for (const featureId of effectiveFeatureIdsForMods(character)) {
        for (const id of featureById.get(featureId)?.situationalEffectIds ?? []) unlocked.add(id);
      }
    }
    return SITUATIONAL_EFFECT_IDS.filter((id) => unlocked.has(id));
  }, [claimed]);

  // Buffs de groupe débloqués par la table (PER-104) : même gating que les effets situationnels, du
  // côté bénéfique. Une table sans barde ni prêtre n'a aucune puce verte à se voir proposer.
  const groupBuffIds = useMemo(() => unlockedGroupBuffIds(claimed), [claimed]);

  // Porteurs d'AURA PASSIVE de groupe (PER-438, `partyAuras.ts`) parmi les personnages réclamés —
  // ex. un frouïn (Avarié, Le Compagnon p. 21) impose son -1 social à ses compagnons par simple
  // présence, sans que le MJ n'ait rien à poser. Diffusé côté MJ (auteur unique) dans l'état de
  // combat partagé : la fiche d'un joueur, que la RLS empêche de lire les autres personnages,
  // relit cette carte pour s'appliquer elle-même l'aura des AUTRES (`GmSheetDrawer`, fiche joueur).
  const partyAuraCarriers = useMemo(() => passiveAuraCarrierIds(claimed), [claimed]);
  useEffect(() => {
    if (role !== 'gm') return;
    if (!partyAuraCarrierIdsEqual(partyAuraCarrierIds, partyAuraCarriers)) {
      setPartyAuraCarrierIds(partyAuraCarriers);
    }
  }, [role, partyAuraCarriers, partyAuraCarrierIds, setPartyAuraCarrierIds]);

  // Buffs de groupe RÉELLEMENT POSÉS sur au moins un combattant : ce que la croix de la palette a à
  // lever. Dérivé des états posés et NON du gating — un buff reste levable si son porteur a quitté
  // la table entre-temps, et il a pu être posé sur les deux camps (un MJ peut bénir une escouade).
  const posedGroupBuffIds = useMemo(() => {
    const posed = new Set<string>();
    for (const applied of Object.values(statuses)) for (const s of applied) posed.add(s.id);
    return BENEFICIAL_EFFECT_IDS.filter((id) => posed.has(id));
  }, [statuses]);

  // Effets situationnels RÉELLEMENT POSÉS sur au moins un combattant (PER-74) : symétrique de
  // `posedGroupBuffIds`, côté orange — une malédiction ou une nuée peut courir sur plusieurs cartes,
  // la croix de la palette les lève toutes d'un coup, id par id.
  const posedSituationalIds = useMemo(() => {
    const posed = new Set<string>();
    for (const applied of Object.values(statuses)) for (const s of applied) posed.add(s.id);
    return SITUATIONAL_EFFECT_IDS.filter((id) => posed.has(id));
  }, [statuses]);

  // Lignes des personnages réclamés : Initiative + PV max = stats dérivées (surcharge
  // manuelle prioritaire, comme la fiche) ; la barre de vie édite le VRAI personnage via
  // `upsert` (même état de PV que la fiche, propagé au cloud).
  const characterRows = useMemo<InitiativeRow[]>(
    () =>
      claimed.flatMap((character): InitiativeRow[] => {
        // Cristaux CONFIÉS à ce personnage (PER-360, p. 156) : ils sont posés sur lui comme des états
        // de combat, mais leurs chiffres passent par le canal des cristaux (l'état, lui, ne porte
        // aucun `modifiers`). D'où la copie de calcul, qui fait profiter le tracker de la même
        // cascade que la fiche — un +1 PER confié y remonte l'Initiative comme il se doit.
        const view = buildCharacterDerivedView(
          withReceivedCrystals(character, (statuses[character.id] ?? []).map((s) => s.id)),
        );
        const derived = view.derivedInput ? deriveStats(view.derivedInput) : null;
        const summary = summarize(character);
        const maxHp = character.overrides.maxHp ?? derived?.maxHp ?? 0;
        const baseInitiative = character.overrides.initiative ?? derived?.initiative ?? 0;
        // États EFFECTIFS : ceux que le MJ a posés + ceux DÉDUITS des PV (affaibli à 1 PV, p. 220)
        // + les AURAS PASSIVES de groupe (PER-438, ex. Avarié du frouïn) conférées par la présence
        // d'un AUTRE personnage réclamé. Ils alimentent indifféremment les badges du tracker et
        // l'ajustement des stats affichées.
        const appliedStatuses = effectiveStatuses(statuses[character.id] ?? [], [
          ...hpAutoStatuses(maxHp, character.depletion),
          ...passiveAuraStatusesFor(character.id, partyAuraCarriers),
        ]);
        // Delta d'initiative des états (ex. Aveuglé -5) : baisse (ou remonte) l'initiative
        // EFFECTIVE, celle qui sert au tri de l'ordre ET à l'affichage (colorée quand modifiée).
        const initiativeDelta = resolveStatusModifiers(appliedStatuses).derived.initiative ?? 0;
        const initiative = baseInitiative + initiativeDelta;
        // DEF + attaques de BASE (PER-280) : dérivées, surcharge manuelle prioritaire (comme la fiche).
        // L'ajustement par les états est calculé à l'affichage (tracker), pas ici.
        const combatStats: CombatStats | undefined = derived
          ? {
              def: character.overrides.def ?? derived.defense,
              attacks: [
                { key: 'melee', label: 'Contact', base: character.overrides.meleeAttack ?? derived.meleeAttack, kind: 'melee' },
                { key: 'ranged', label: 'Distance', base: character.overrides.rangedAttack ?? derived.rangedAttack, kind: 'ranged' },
                { key: 'magic', label: 'Magie', base: character.overrides.magicAttack ?? derived.magicAttack, kind: 'magic' },
              ],
            }
          : undefined;
        const characterRow: InitiativeRow = {
          key: character.id,
          name: summary.name,
          isCreature: false,
          hidden: false,
          playerName: character.playerId ? playerNameById.get(character.playerId) ?? null : null,
          profileLabel: summary.characterClass,
          profileColor: classColor(summary.classId),
          classId: summary.classId,
          portraitSrc: `/classes/${summary.classId}${character.portraitVariant === 'alt' ? '-2' : ''}.webp`,
          portraitVariant: character.portraitVariant,
          initiative,
          initiativeDelta,
          // AGI EFFECTIVE (celle qui alimente déjà les dérivées : peuple, capacités, équipement) —
          // départage les égalités d'initiative. Profil incomplet (pas de dérivées) → inconnue.
          agility: view.derivedInput?.abilities.AGI,
          maxHp,
          // Réserve de mana (surcharge manuelle prioritaire, comme la fiche) : alimente le bandeau
          // de jauges PV + mana de la fenêtre projetée. `null` = aucun sort connu → pas
          // de piste de mana ; profil incomplet (pas de dérivées) → pas de mana non plus.
          manaMax: derived ? character.overrides.manaPoints ?? derived.manaPoints : null,
          combatStats,
          // États EFFECTIFS (posés + déduits) — servent les badges de la projection (PER-282) comme
          // ceux de l'écran de MJ, dont les seuls états POSÉS restent interactifs (`statusControls`).
          appliedStatuses,
          depletion: character.depletion,
          onDamage: (amount: number, kind: DamageKind) =>
            upsert({ ...character, depletion: applyDamage(character.depletion, amount, kind, maxHp) }),
          onHeal: (amount: number) => upsert({ ...character, depletion: healHp(character.depletion, amount) }),
          onReset: () => upsert({ ...character, depletion: resetHp(character.depletion) }),
          persistKey: storageKeys.gauge.gmInit(character.id),
        };
        // Lignes des COMPAGNONS (monture, familier, golem, loup…) de la section « Compagnons » de la
        // fiche : jamais wired jusqu'ici sur l'écran de MJ. Catégorie propre (`profileLabel`
        // « Compagnon »), toujours visible (appartient au camp des joueurs, rien de secret) et
        // Initiative RECOPIÉE du maître (`initiative`/`initiativeDelta` déjà calculés ci-dessus) —
        // ajustée d'un éventuel état posé directement sur le compagnon lui-même. Clé namespacée par
        // personnage (`companion:<characterId>:<companionKey>`) : deux personnages sur la même voie
        // partagent le même `entry.key` (id du rang de voie), qui doit rester distinct comme
        // combattant. DEF/attaque (PER-280, retour propriétaire 2026-08-10) : même niveau
        // d'information que les persos/créatures, résolues contre le maître (`resolveCreatureDefenseNumber`/
        // `resolveCreatureAttackBonus`), absentes quand le profil n'a ni DEF ni attaque (« force, pas
        // une créature », ex. Serviteur invisible) plutôt qu'un faux 0.
        const abilities = effectContext(character).abilities;
        const companionRows: InitiativeRow[] = listCompanions(character, Object.values(blobs)).map((entry) => {
          const rowKey = `companion:${character.id}:${entry.key}`;
          const companionMaxHp = resolveCreatureMaxHp(entry.profile, abilities, character.level, entry.pathRank) ?? 0;
          const companionDepletion = character.companionDepletion[entry.key] ?? {};
          const companionAppliedStatuses = effectiveStatuses(
            statuses[rowKey] ?? [],
            hpAutoStatuses(companionMaxHp, companionDepletion),
          );
          const companionOwnDelta = resolveStatusModifiers(companionAppliedStatuses).derived.initiative ?? 0;
          const displayName =
            entry.instanceId !== undefined ? `${entry.profile.name} ${(entry.instanceIndex ?? 0) + 1}` : entry.profile.name;
          const accent = companionPathAccent(entry.feature.pathId);
          const companionAttack = entry.profile.attack;
          const combatStats: CombatStats | undefined =
            entry.profile.defense || companionAttack
              ? {
                  def:
                    resolveCreatureDefenseNumber(
                      entry.profile,
                      abilities,
                      character.level,
                      entry.pathRank,
                      derived ?? undefined,
                      entry.defenseAltActive,
                    ) ?? 0,
                  attacks: [
                    ...(companionAttack
                      ? (() => {
                          const base = resolveCreatureAttackBonus(companionAttack, derived ?? undefined);
                          if (base == null) return [];
                          const kind: CombatAttackKind = companionAttack.fromMaster === 'rangedAttack' ? 'ranged' : 'melee';
                          return [{ key: 'atk', label: companionAttack.label ?? 'Attaque', base, kind }];
                        })()
                      : []),
                    ...(entry.profile.extraAttacks ?? []).flatMap((extra, i) => {
                      const base = derived ? derived.magicAttack : undefined;
                      if (base == null) return [];
                      const kind: CombatAttackKind = extra.ranged ? 'ranged' : 'melee';
                      return [{ key: `xa-${i}`, label: extra.label, base, kind }];
                    }),
                  ],
                }
              : undefined;
          return {
            key: rowKey,
            name: displayName,
            isCreature: false,
            playerName: character.name,
            profileLabel: 'Compagnon',
            profileColor: accent,
            accentColor: accent,
            initiative: initiative + companionOwnDelta,
            initiativeDelta: initiativeDelta + companionOwnDelta,
            agility: resolveCreatureAbilities(entry.profile, abilities)?.AGI,
            maxHp: companionMaxHp,
            combatStats,
            appliedStatuses: companionAppliedStatuses,
            depletion: companionDepletion,
            onDamage: (amount: number, kind: DamageKind) =>
              upsert({ ...character, ...damageCompanion(character, entry.key, amount, kind) }),
            onHeal: (amount: number) => upsert({ ...character, ...healCompanion(character, entry.key, amount) }),
            onReset: () => upsert({ ...character, ...resetCompanionHp(character, entry.key) }),
            persistKey: storageKeys.gauge.gmInit(rowKey),
          };
        });
        return [characterRow, ...companionRows];
      }),
    [claimed, upsert, playerNameById, statuses, partyAuraCarriers],
  );

  // Lignes des créatures ajoutées (PV suivis en local). Init./PV lus du blob du bestiaire ;
  // tant que le blob n'est pas chargé, l'instance n'a pas encore de ligne d'initiative. Une
  // créature créée à la main projette son bloc SAISI en blob synthétique : elle est donc traitée
  // à l'identique en dessous (jauge de PV, DEF/attaques ajustées par les états, tri d'ordre).
  const creatureRows = useMemo<InitiativeRow[]>(
    () =>
      labeledCreatures.flatMap((inst): InitiativeRow[] => {
        const blob = inst.custom ? customCreatureBlob(inst.custom, inst.name) : blobs[inst.slug];
        if (!blob) {
          // Pas de bloc : repli sur l'affichage diffusé par le MJ (PER-293) — cas d'une créature
          // de supplément PAYANT côté joueur. Ligne MINIMALE : nom + initiative (+ AGI de départage),
          // sans PV / DEF / attaques / illustration (masqués en projection de toute façon). Sans même
          // cet affichage diffusé (bloc pas encore chargé chez le MJ), la ligne est simplement omise.
          const info = creatureInfo[inst.slug];
          if (!info) return [];
          // Aucun état DÉDUIT possible ici : sans bloc, les PV de la créature sont inconnus.
          const appliedStatuses = effectiveStatuses(statuses[inst.id] ?? [], []);
          const initiativeDelta = resolveStatusModifiers(appliedStatuses).derived.initiative ?? 0;
          const isVisible = inst.visible !== false;
          const isAlly = inst.side === 'ally';
          const accent = isAlly ? ALLY_ACCENT : CREATURE_ACCENT;
          return [
            {
              key: inst.id,
              name: inst.label,
              isCreature: true,
              hidden: !isVisible,
              onToggleVisible: () => setCreatureVisibility(inst.id, !isVisible),
              // Camp : décide aussi de ce que la projection révèle (états déduits des PV).
              side: inst.side,
              profileLabel: isAlly ? SIDE_LABELS.ally : 'PNJ',
              profileColor: accent,
              accentColor: accent,
              initiative: info.initiative + initiativeDelta,
              initiativeDelta,
              agility: info.agility,
              maxHp: 0,
              appliedStatuses,
              depletion: {},
              // Lecture seule (projection / écran joueur) : ces callbacks ne sont jamais déclenchés.
              onDamage: () => {},
              onHeal: () => {},
              onReset: () => {},
              persistKey: storageKeys.gauge.gmInit(inst.id),
            },
          ];
        }
        const maxHp = blob.hitPoints ?? 0;
        const baseInitiative = blob.initiative ?? 0;
        const depletion = depletions[inst.id] ?? {};
        // États EFFECTIFS : posés par le MJ + DÉDUITS des PV de la créature (affaibli à 1 PV, p. 220
        // — la règle vaut « pour un personnage ou une créature »).
        const appliedStatuses = effectiveStatuses(
          statuses[inst.id] ?? [],
          hpAutoStatuses(maxHp, depletion),
        );
        // Delta d'initiative des états (ex. Aveuglé -5) : initiative EFFECTIVE (tri + affichage).
        const initiativeDelta = resolveStatusModifiers(appliedStatuses).derived.initiative ?? 0;
        const initiative = baseInitiative + initiativeDelta;
        // DEF (nombre du bloc) + attaques (bonus verbatim « +7 » parsé) — PER-280. Une attaque sans
        // bonus chiffré (ex. souffle) est omise des pastilles ajustables.
        const combatStats: CombatStats = {
          def: blob.defense ?? 0,
          attacks: (blob.attacks ?? []).flatMap((atk, i) => {
            const base = parseAttackBonus(atk.bonus);
            return base === null ? [] : [{ key: `atk-${i}`, label: atk.name, base, kind: creatureAttackKind(atk) }];
          }),
        };
        const nc = creatureNcLabel(blob);
        const isVisible = inst.visible !== false;
        // Camp (PER-249) : accent de colonne + libellé de repli quand la créature n'a pas de NC.
        const isAlly = inst.side === 'ally';
        const accent = isAlly ? ALLY_ACCENT : CREATURE_ACCENT;
        return [
          {
            key: inst.id,
            name: inst.label,
            isCreature: true,
            // Masquée aux joueurs (absente de la projection) si visibilité désactivée.
            hidden: !isVisible,
            onToggleVisible: () => setCreatureVisibility(inst.id, !isVisible),
            // Camp : décide aussi de ce que la projection révèle (états déduits des PV).
            side: inst.side,
            // Illustration détourée de la créature (si le livre l'illustre) à la place de
            // l'avatar générique ; une variante sans illustration propre hérite de celle de
            // sa base côté données. Absente → repli sur l'icône « person » du tracker.
            portraitSrc: blob.illustration,
            profileLabel: nc ? `NC ${nc}` : isAlly ? SIDE_LABELS.ally : 'PNJ',
            profileColor: accent,
            accentColor: accent,
            initiative,
            initiativeDelta,
            // AGI du bloc du bestiaire (absente pour les variantes qui renvoient à leur base) ;
            // pour une créature manuelle, l'AGI facultative saisie par le MJ.
            agility: inst.custom ? inst.custom.agility : blob.abilities?.AGI,
            maxHp,
            combatStats,
            // États EFFECTIFS (posés + déduits) — servent les badges des deux écrans (PER-282).
            appliedStatuses,
            depletion,
            onDamage: (amount: number, kind: DamageKind) =>
              setCreatureDepletion(inst.id, applyDamage(depletion, amount, kind, maxHp)),
            onHeal: (amount: number) => setCreatureDepletion(inst.id, healHp(depletion, amount)),
            onReset: () => setCreatureDepletion(inst.id, resetHp(depletion)),
            persistKey: storageKeys.gauge.gmInit(inst.id),
          },
        ];
      }),
    [labeledCreatures, blobs, creatureInfo, depletions, setCreatureDepletion, setCreatureVisibility, statuses],
  );

  // Ordre d'initiative décroissant, avec départage à ÉGALITÉ (couche pure `initiativeOrder`) :
  // joueurs avant créatures, puis AGI la plus haute, puis tirage au sort reproductible (graine
  // persistée avec le combat → MJ et projection classent à l'identique).
  const initiativeRows = useMemo(
    () => sortByInitiative([...characterRows, ...creatureRows], tieBreakSeed),
    [characterRows, creatureRows, tieBreakSeed],
  );

  // Bouton ⟳ « recommencer le décompte » : le tour courant est remis à « aucun » (`null`), PAS
  // repositionné sur le premier de l'ordre d'initiative — sélectionner un combattant d'office
  // laisserait croire qu'un combat est en cours alors qu'on vient justement de le remettre à zéro.
  // `currentTurnKey === null` reste ainsi le signal fiable « combat non commencé » (bouton
  // « Commencer le combat », condensé de la bande d'initiative de la fiche). Ne touche NI aux
  // états NI aux PV (contrairement à `resetCombat`).
  const restartRounds = useCallback(() => restartRoundsBase(null), [restartRoundsBase]);

  const campaignsLoading = campaignsStatus === 'idle' || campaignsStatus === 'loading';

  return {
    charactersHydrated,
    campaignsLoading,
    campaign,
    claimed,
    companionRoster,
    playerNameById,
    playerById,
    labeledCreatures,
    allies,
    enemies,
    initiativeRows,
    currentTurnKey,
    setCurrentTurnKey,
    roundNumber,
    setRoundNumber,
    addCreature,
    addCustomCreature,
    duplicateCreature,
    updateCreature,
    removeCreature,
    setCreatureVisibility,
    statuses,
    situationalEffectIds,
    posedSituationalIds,
    groupBuffIds,
    posedGroupBuffIds,
    applyStatus,
    removeStatus,
    applyStatusToMany,
    removeStatusFromMany,
    removeStatusesEverywhere,
    adjustStatus,
    adjustStatusDuration,
    resetCombat,
    restartRounds,
    actedKeys,
    setCombatantActed,
    manualOrder,
    pinnedOrderKeys,
    setManualPosition,
    toggleCombatantPin,
    resetCombatantOrder,
  };
}
