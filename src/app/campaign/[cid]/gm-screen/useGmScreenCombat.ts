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
import { useEffect, useMemo } from 'react';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { deriveStats } from '@/lib/engine';
import { applyDamage, healHp, resetHp } from '@/lib/character/gauges';
import { summarize } from '@/lib/character/summary';
import { classColor } from '@/lib/ui/classColors';
import { creatureNcLabel } from '@/lib/ui/creature';
import type { DamageKind } from '@/components/sheet/HpGauge';
import type { InitiativeRow } from '@/components/campaign/InitiativeTracker';
import type { Character } from '@/lib/character/types';
import type { Campaign } from '@/lib/campaign/types';
import { useGmCombatState, type CreatureInstance } from './useGmCombatState';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { usePlayersStore } from '@/stores/players';
import { useBestiaryStore } from '@/stores/bestiary';

/** Couleur d'accent des lignes de créatures adverses (PNJ). */
export const CREATURE_ACCENT = '#e57373';

/** Instance de créature enrichie de son étiquette numérotée (« Gobelin 1 / 2 »). */
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
  /** Créatures du combat, numérotées par créature dans l'ordre d'ajout. */
  labeledCreatures: LabeledCreature[];
  /** Lignes du tracker (persos réclamés + créatures), classées par initiative décroissante. */
  initiativeRows: InitiativeRow[];
  /** Clé du combattant dont c'est le tour (`null` = combat non démarré). */
  currentTurnKey: string | null;
  /** Fixe le combattant dont c'est le tour. */
  setCurrentTurnKey: (key: string | null) => void;
  /** Ajoute une instance de la créature `slug` au combat. */
  addCreature: (slug: string) => void;
  /** Retire l'instance `instanceId` du combat. */
  removeCreature: (instanceId: string) => void;
  /** Bascule la visibilité joueurs d'une instance de créature (fenêtre projetée). */
  setCreatureVisibility: (instanceId: string, visible: boolean) => void;
}

export function useGmScreenCombat(cid: string): GmScreenCombat {
  const {
    creatures,
    depletions,
    currentTurnKey,
    addCreature,
    removeCreature,
    setCreatureVisibility,
    setCreatureDepletion,
    setCurrentTurnKey,
  } = useGmCombatState(cid);

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

  // Charge le blob de chaque créature du roster (Init./PV lus du bloc) ; idempotent.
  useEffect(() => {
    for (const inst of creatures) void loadBlob(inst.slug);
  }, [creatures, loadBlob]);

  const playerNameById = useMemo(
    () => new Map(players.map((p) => [p.id, p.name])),
    [players],
  );

  // Nom de chaque créature (liste légère) pour l'étiquette, avant même le blob.
  const creatureNameBySlug = useMemo(
    () => new Map((bestiaryList ?? []).map((c) => [c.id, c.name])),
    [bestiaryList],
  );

  // Instances numérotées PAR CRÉATURE (« Gobelin 1 / 2 »), dans l'ordre d'ajout.
  const labeledCreatures = useMemo<LabeledCreature[]>(() => {
    const counts = new Map<string, number>();
    return creatures.map((inst) => {
      const n = (counts.get(inst.slug) ?? 0) + 1;
      counts.set(inst.slug, n);
      const name = creatureNameBySlug.get(inst.slug) ?? inst.slug;
      return { ...inst, label: `${name} ${n}` };
    });
  }, [creatures, creatureNameBySlug]);

  // Personnages de CETTE campagne réclamés par un joueur (`playerId` non nul).
  const claimed = useMemo(
    () =>
      characters
        .filter((c) => c.campaignId === cid && c.playerId !== null)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [characters, cid],
  );

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
        const initiative = character.overrides.initiative ?? derived?.initiative ?? 0;
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
          maxHp,
          depletion: character.depletion,
          onDamage: (amount: number, kind: DamageKind) =>
            upsert({ ...character, depletion: applyDamage(character.depletion, amount, kind, maxHp) }),
          onHeal: (amount: number) => upsert({ ...character, depletion: healHp(character.depletion, amount) }),
          onReset: () => upsert({ ...character, depletion: resetHp(character.depletion) }),
          persistKey: `gm-init:${character.id}`,
        };
      }),
    [claimed, upsert, playerNameById],
  );

  // Lignes des créatures ajoutées (PV suivis en local). Init./PV lus du blob du bestiaire ;
  // tant que le blob n'est pas chargé, l'instance n'a pas encore de ligne d'initiative.
  const creatureRows = useMemo<InitiativeRow[]>(
    () =>
      labeledCreatures.flatMap((inst) => {
        const blob = blobs[inst.slug];
        if (!blob) return [];
        const maxHp = blob.hitPoints ?? 0;
        const initiative = blob.initiative ?? 0;
        const depletion = depletions[inst.id] ?? {};
        const nc = creatureNcLabel(blob);
        const isVisible = inst.visible !== false;
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
            profileLabel: nc ? `NC ${nc}` : 'PNJ',
            profileColor: CREATURE_ACCENT,
            initiative,
            maxHp,
            depletion,
            onDamage: (amount: number, kind: DamageKind) =>
              setCreatureDepletion(inst.id, applyDamage(depletion, amount, kind, maxHp)),
            onHeal: (amount: number) => setCreatureDepletion(inst.id, healHp(depletion, amount)),
            onReset: () => setCreatureDepletion(inst.id, resetHp(depletion)),
            persistKey: `gm-init:${inst.id}`,
          },
        ];
      }),
    [labeledCreatures, blobs, depletions, setCreatureDepletion, setCreatureVisibility],
  );

  // Ordre d'initiative décroissant (tri stable : à égalité, l'ordre d'entrée est conservé).
  const initiativeRows = useMemo(
    () => [...characterRows, ...creatureRows].sort((a, b) => b.initiative - a.initiative),
    [characterRows, creatureRows],
  );

  const campaignsLoading = campaignsStatus === 'idle' || campaignsStatus === 'loading';

  return {
    charactersHydrated,
    campaignsLoading,
    campaign,
    claimed,
    playerNameById,
    labeledCreatures,
    initiativeRows,
    currentTurnKey,
    setCurrentTurnKey,
    addCreature,
    removeCreature,
    setCreatureVisibility,
  };
}
