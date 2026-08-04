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
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { deriveStats } from '@/lib/engine';
import { applyDamage, healHp, resetHp } from '@/lib/character/gauges';
import { summarize } from '@/lib/character/summary';
import { classColor } from '@/lib/ui/classColors';
import { creatureNcLabel, SIDE_ACCENT, SIDE_LABELS } from '@/lib/ui/creature';
import type { DamageKind } from '@/components/sheet/HpGauge';
import type {
  CombatAttackKind,
  CombatStats,
  InitiativeRow,
} from '@/components/campaign/InitiativeTracker';
import type { Character } from '@/lib/character/types';
import type { Campaign } from '@/lib/campaign/types';
import type { CreatureAttack } from '@/data/schema';
import {
  useGmCombatState,
  type CombatRole,
  type CreatureInstance,
  type AddCreatureOptions,
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
  type CreatureDisplayInfo,
} from '@/lib/session/combatState';
import { sortByInitiative } from '@/lib/session/initiativeOrder';
import {
  resolveStatusModifiers,
  type AnyStatusEffectId,
  type AppliedStatus,
} from '@/lib/character/statusEffects';
import { featureById } from '@/data';
import { SITUATIONAL_EFFECT_IDS, type SituationalEffectId } from '@/data/schema';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { usePlayersStore } from '@/stores/players';
import { useBestiaryStore } from '@/stores/bestiary';

/** Couleur d'accent des lignes de créatures adverses (PNJ). */
export const CREATURE_ACCENT = SIDE_ACCENT.enemy;
/** Couleur d'accent des lignes de créatures alliées (PER-249). */
export const ALLY_ACCENT = SIDE_ACCENT.ally;

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

export interface GmScreenCombat {
  /** Le staging des personnages a-t-il fini de s'hydrater (gate l'UI de chargement) ? */
  charactersHydrated: boolean;
  /** Les campagnes sont-elles encore en cours de chargement (nom pas résolu) ? */
  campaignsLoading: boolean;
  /** Campagne courante (ou `undefined` si introuvable). */
  campaign: Campaign | undefined;
  /** Personnages de la campagne réclamés par un joueur (triés par nom). */
  claimed: Character[];
  /** Nom du joueur par id (pour l'étiquette « (Joueur) »). */
  playerNameById: Map<string, string>;
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
  /** Applique un état sur un combattant (intensité 1 ; PER-279). */
  applyStatus: (combatantKey: string, id: AnyStatusEffectId) => void;
  /** Retire un état d'un combattant (PER-279). */
  removeStatus: (combatantKey: string, id: AnyStatusEffectId) => void;
  /** Ajuste de `delta` (±) l'intensité d'un état cumulatif d'un combattant (PER-280). */
  adjustStatus: (combatantKey: string, id: AnyStatusEffectId, delta: number) => void;
  /**
   * Réinitialise le combat (PER-283) : vide tous les états, remet le tour courant à « aucun »,
   * recommence à la manche 1 et restaure les PV des créatures. Conserve le roster ; ne touche pas
   * aux PV des joueurs.
   */
  resetCombat: () => void;
  /**
   * Recommence le décompte des manches (bouton ⟳ de l'en-tête) : compteur → 1 et tour courant
   * repositionné sur le PREMIER de l'ordre d'initiative. Ne touche NI aux états NI aux PV.
   */
  restartRounds: () => void;
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
    addCreature,
    addCustomCreature,
    removeCreature,
    setCreatureVisibility,
    setCreatureDepletion,
    setCurrentTurnKey,
    setRoundNumber,
    applyStatus,
    removeStatus,
    adjustStatus,
    setCreatureInfo,
    resetCombat,
    restartRounds: restartRoundsBase,
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

  // Effets situationnels débloqués par la table (PER-279) : on balaie les capacités acquises de
  // chaque personnage réclamé et on collecte les `situationalEffectIds` qu'elles confèrent. Restreint
  // aux ids connus du catalogue, dédupliqué, rendu dans l'ordre du catalogue (affichage stable).
  const situationalEffectIds = useMemo<SituationalEffectId[]>(() => {
    const unlocked = new Set<SituationalEffectId>();
    for (const character of claimed) {
      for (const featureId of character.featureIds) {
        for (const id of featureById.get(featureId)?.situationalEffectIds ?? []) unlocked.add(id);
      }
    }
    return SITUATIONAL_EFFECT_IDS.filter((id) => unlocked.has(id));
  }, [claimed]);

  // Lignes des personnages réclamés : Initiative + PV max = stats dérivées (surcharge
  // manuelle prioritaire, comme la fiche) ; la barre de vie édite le VRAI personnage via
  // `upsert` (même état de PV que la fiche, propagé au cloud).
  const characterRows = useMemo<InitiativeRow[]>(
    () =>
      claimed.map((character) => {
        const view = buildCharacterDerivedView(character);
        const derived = view.derivedInput ? deriveStats(view.derivedInput) : null;
        const summary = summarize(character);
        const maxHp = character.overrides.maxHp ?? derived?.maxHp ?? 0;
        const baseInitiative = character.overrides.initiative ?? derived?.initiative ?? 0;
        // Delta d'initiative des états posés (ex. Aveuglé -5) : baisse (ou remonte) l'initiative
        // EFFECTIVE, celle qui sert au tri de l'ordre ET à l'affichage (colorée quand modifiée).
        const appliedStatuses = statuses[character.id] ?? [];
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
        return {
          key: character.id,
          name: summary.name,
          isCreature: false,
          hidden: false,
          playerName: character.playerId ? playerNameById.get(character.playerId) ?? null : null,
          profileLabel: summary.characterClass,
          profileColor: classColor(summary.classId),
          portraitSrc: `/classes/${summary.classId}${character.portraitVariant === 'alt' ? '-2' : ''}.webp`,
          initiative,
          initiativeDelta,
          // AGI EFFECTIVE (celle qui alimente déjà les dérivées : peuple, capacités, équipement) —
          // départage les égalités d'initiative. Profil incomplet (pas de dérivées) → inconnue.
          agility: view.derivedInput?.abilities.AGI,
          maxHp,
          combatStats,
          // États appliqués (lecture seule) — sert la projection (PER-282) ; l'écran de MJ garde en
          // plus le câblage interactif via `statusControls`.
          appliedStatuses: statuses[character.id],
          depletion: character.depletion,
          onDamage: (amount: number, kind: DamageKind) =>
            upsert({ ...character, depletion: applyDamage(character.depletion, amount, kind, maxHp) }),
          onHeal: (amount: number) => upsert({ ...character, depletion: healHp(character.depletion, amount) }),
          onReset: () => upsert({ ...character, depletion: resetHp(character.depletion) }),
          persistKey: `gm-init:${character.id}`,
        };
      }),
    [claimed, upsert, playerNameById, statuses],
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
          const appliedStatuses = statuses[inst.id] ?? [];
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
              profileLabel: isAlly ? SIDE_LABELS.ally : 'PNJ',
              profileColor: accent,
              accentColor: accent,
              initiative: info.initiative + initiativeDelta,
              initiativeDelta,
              agility: info.agility,
              maxHp: 0,
              appliedStatuses: statuses[inst.id],
              depletion: {},
              // Lecture seule (projection / écran joueur) : ces callbacks ne sont jamais déclenchés.
              onDamage: () => {},
              onHeal: () => {},
              onReset: () => {},
              persistKey: `gm-init:${inst.id}`,
            },
          ];
        }
        const maxHp = blob.hitPoints ?? 0;
        const baseInitiative = blob.initiative ?? 0;
        // Delta d'initiative des états posés (ex. Aveuglé -5) : initiative EFFECTIVE (tri + affichage).
        const appliedStatuses = statuses[inst.id] ?? [];
        const initiativeDelta = resolveStatusModifiers(appliedStatuses).derived.initiative ?? 0;
        const initiative = baseInitiative + initiativeDelta;
        const depletion = depletions[inst.id] ?? {};
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
            // États appliqués (lecture seule) — sert la projection (PER-282).
            appliedStatuses: statuses[inst.id],
            depletion,
            onDamage: (amount: number, kind: DamageKind) =>
              setCreatureDepletion(inst.id, applyDamage(depletion, amount, kind, maxHp)),
            onHeal: (amount: number) => setCreatureDepletion(inst.id, healHp(depletion, amount)),
            onReset: () => setCreatureDepletion(inst.id, resetHp(depletion)),
            persistKey: `gm-init:${inst.id}`,
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

  // Bouton ⟳ « recommencer le décompte » : le tour courant est repositionné sur le PREMIER de
  // l'ordre d'initiative (l'ordre vit ici, pas dans la couche pure `restartRounds`). Roster vide
  // → `null`. Ne touche NI aux états NI aux PV (contrairement à `resetCombat`).
  const restartRounds = useCallback(
    () => restartRoundsBase(initiativeRows[0]?.key ?? null),
    [restartRoundsBase, initiativeRows],
  );

  const campaignsLoading = campaignsStatus === 'idle' || campaignsStatus === 'loading';

  return {
    charactersHydrated,
    campaignsLoading,
    campaign,
    claimed,
    playerNameById,
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
    removeCreature,
    setCreatureVisibility,
    statuses,
    situationalEffectIds,
    applyStatus,
    removeStatus,
    adjustStatus,
    resetCombat,
    restartRounds,
  };
}
