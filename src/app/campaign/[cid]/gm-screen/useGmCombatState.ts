'use client';

/**
 * Façade React de l'« état de combat en cours » de l'écran de MJ, au-dessus du store
 * GLOBAL `campaignCombat` (PER-267). L'état, historiquement `useState` local à ce hook et
 * persisté dans `localStorage` (`gm-combat:<cid>`, synchro cross-fenêtre par l'événement
 * `storage`), vit désormais dans la table partagée `campaign_combat` (portée campagne, MJ
 * seul auteur), reflétée par le store et diffusée en direct sur le canal de session.
 *
 * Deux rôles :
 *  - **`'gm'`** : l'écran de MJ complet, AUTEUR unique. `load({seed:true})` migre au besoin
 *    le combat encore en `localStorage` vers la table ; les mutations passent par
 *    `applyLocalCombat` (store + localStorage + upsert table + broadcast).
 *  - **`'reader'`** : la fenêtre de projection (PER-248), devenue cliente de session (PER-268).
 *    `load({seed:false})` (aucune écriture) au montage pour l'état initial ; elle ne mute jamais
 *    et reçoit les changements du MJ EN DIRECT via le canal de session (`combat-state` →
 *    `applyRemoteCombat`, câblé dans `useSessionChannel`). Le pont same-browser `storage` a été
 *    retiré : canal seul (plus de synchro live hors session, mais source de vérité unique).
 *
 * L'API publique (`GmCombatStateApi`) est inchangée : `useGmScreenCombat` et ses pages
 * consommateurs n'ont pas à connaître le store.
 */
import { useCallback, useEffect } from 'react';

import { useCampaignCombatStore } from '@/stores/campaignCombat';
import { executeCrystalRelease } from '@/stores/crystalAssignment';
import { isCrystalStatus } from '@/lib/character/statusEffects';
import {
  EMPTY_COMBAT_STATE,
  addCreatures,
  addCustomCreatures,
  applyStatusTo,
  applyStatusToKeys,
  duplicateCreature as duplicateCreatureState,
  updateCreature as updateCreatureState,
  removeStatusFrom,
  removeStatusFromKeys,
  removeStatusesFromAll,
  adjustStatusIntensity,
  adjustStatusDuration as adjustStatusDurationState,
  clearStatusesOf,
  dropCombatantOrderTraces,
  resetCombat as resetCombatState,
  resetCombatantOrder as resetCombatantOrderState,
  restartRounds as restartRoundsState,
  rollTieBreakSeed,
  setCombatantActed,
  setCurrentTurnKey as setCurrentTurnKeyState,
  setManualPosition,
  setRegenBlocked as setRegenBlockedState,
  setRoundNumber as setRoundNumberState,
  toggleCombatantPin,
  type AddCreatureOptions,
  type ApplyStatusToKeysOptions,
  type CreatureDisplayInfo,
  type CreatureInstance,
  type GmCombatState,
  type UpdateCreaturePatch,
} from '@/lib/session/combatState';
import { randomTieBreakSeed } from '@/lib/session/initiativeOrder';
import { launchEncounterPreset, type EncounterPreset } from '@/lib/session/encounterPreset';
import type { CustomCreature } from '@/lib/session/customCreature';
import type { AnyStatusEffectId } from '@/lib/character/statusEffects';
import type { Depletion } from '@/lib/character/types';

export type {
  AddCreatureOptions,
  CreatureDisplayInfo,
  CreatureInstance,
  GmCombatState,
  UpdateCreaturePatch,
};

/** Rôle du client dans l'UI de combat : MJ auteur, ou lecteur (projection). */
export type CombatRole = 'gm' | 'reader';

export interface GmCombatStateApi extends GmCombatState {
  /**
   * Ajoute `options.count` instances (défaut 1) de la créature `slug` (ids `c-<nextInstanceId>`…) ;
   * visible + adversaire + nom du bestiaire par défaut (cf. `AddCreatureOptions`).
   */
  addCreature: (slug: string, options?: AddCreatureOptions) => void;
  /**
   * Ajoute `options.count` instances (défaut 1) d'une créature CRÉÉE À LA MAIN : le bloc saisi
   * est copié sur chaque instance (autoportante, rien à charger côté joueurs). No-op si le socle
   * initiative/PV/défense est incomplet.
   */
  addCustomCreature: (custom: CustomCreature, options?: AddCreatureOptions) => void;
  /**
   * Duplique l'instance `instanceId` : copie conforme insérée juste après elle, avec un id frais.
   * Le double entre en jeu INTACT (ni PV entamés ni états hérités de l'originale).
   */
  duplicateCreature: (instanceId: string) => void;
  /**
   * Modifie une instance déjà au combat (nom, camp, visibilité, et bloc de stats pour une
   * créature créée à la main). L'identité ne bouge pas ; PV et états posés sont conservés.
   */
  updateCreature: (instanceId: string, patch: UpdateCreaturePatch) => void;
  /** Retire l'instance `instanceId` (et son manque de PV). */
  removeCreature: (instanceId: string) => void;
  /** Bascule la visibilité joueurs de l'instance `instanceId` (fenêtre projetée). */
  setCreatureVisibility: (instanceId: string, visible: boolean) => void;
  /** Fixe le manque de PV de l'instance `instanceId`. */
  setCreatureDepletion: (instanceId: string, depletion: Depletion) => void;
  /** Fixe le combattant dont c'est le tour. */
  setCurrentTurnKey: (key: string | null) => void;
  /**
   * Fixe le numéro de manche (« Tour N »), borné à ≥ 1 (incrément auto de fin de manche + réglage
   * manuel). `healDeltas` (PER-456, `{ instanceId: montant }`) applique EN MÊME TEMPS la
   * régénération automatique de PV des créatures concernées du bestiaire (troll, hydre…) —
   * calculé par l'appelant, seul à connaître les blocs de bestiaire (`useGmScreenCombat`).
   */
  setRoundNumber: (roundNumber: number, healDeltas?: Record<string, number>) => void;
  /**
   * Bascule « a subi un dégât bloquant sa régénération ce tour » (PER-456) sur l'instance
   * `instanceId`. Vidée automatiquement à la manche suivante.
   */
  setRegenBlocked: (instanceId: string, blocked: boolean) => void;
  /**
   * Applique un état négatif sur un combattant (`combatantKey` = id de perso joueur OU id
   * d'instance de créature). Idempotent : ré-appliquer fixe l'intensité (bornée au plafond).
   */
  applyStatus: (combatantKey: string, id: AnyStatusEffectId, intensity?: number) => void;
  /** Retire un état négatif d'un combattant. */
  removeStatus: (combatantKey: string, id: AnyStatusEffectId) => void;
  /**
   * Applique un MÊME état à PLUSIEURS combattants d'un coup (PER-104, buffs de groupe) : une seule
   * écriture, donc un seul upsert et une seule diffusion Realtime. `rounds` pose la durée en tours à
   * partir de la manche courante (absent = pas de compteur, le MJ retire quand il veut).
   */
  applyStatusToMany: (
    combatantKeys: readonly string[],
    id: AnyStatusEffectId,
    options?: ApplyStatusToKeysOptions,
  ) => void;
  /** Retire un MÊME état de PLUSIEURS combattants d'un coup (pendant d'`applyStatusToMany`). */
  removeStatusFromMany: (combatantKeys: readonly string[], id: AnyStatusEffectId) => void;
  /**
   * Lève PLUSIEURS états sur TOUS les combattants d'un coup, sans lister les cartes : la levée d'une
   * famille entière (la croix des buffs de groupe de la palette). Une seule écriture.
   */
  removeStatusesEverywhere: (ids: readonly AnyStatusEffectId[]) => void;
  /** Ajuste de `delta` (±) l'intensité d'un état cumulatif posé sur un combattant. */
  adjustStatus: (combatantKey: string, id: AnyStatusEffectId, delta: number) => void;
  /**
   * Ajuste de `delta` (±) le COMPTEUR DE TOURS d'un état posé (PER-305). Sans compteur, `+1`
   * l'amorce à 1 tour ; descendre sous 1 retire le compteur (durée redevenue indéterminée) sans
   * retirer l'état. La manche de référence est celle de l'état de combat, pas un argument.
   */
  adjustStatusDuration: (combatantKey: string, id: AnyStatusEffectId, delta: number) => void;
  /**
   * Fusionne l'affichage minimal des créatures diffusé aux joueurs (PER-293), indexé par slug.
   * À n'appeler que côté MJ (auteur unique) : chaque appel persiste + diffuse l'état. Les
   * appelants ne l'invoquent que lorsque le contenu a réellement changé (garde `creatureInfoEquals`).
   */
  setCreatureInfo: (info: Record<string, CreatureDisplayInfo>) => void;
  /**
   * Remplace la carte des porteurs d'aura passive de groupe (PER-438, `partyAuras.ts`) —
   * `{ auraId: [characterId…] }`. À n'appeler que côté MJ (auteur unique), et seulement quand le
   * contenu a réellement changé (garde `partyAuraCarrierIdsEqual`, même patron que `setCreatureInfo`).
   */
  setPartyAuraCarrierIds: (carrierIds: Record<string, string[]>) => void;
  /**
   * Réinitialise le combat (PER-283) : vide tous les états, remet le tour courant à `null`,
   * recommence à la manche 1 et restaure les PV des créatures. Conserve le roster et ne touche
   * pas aux PV des joueurs.
   */
  resetCombat: () => void;
  /**
   * Lance un combat préparé à l'avance (PER-448) : REMPLACE ENTIÈREMENT le combat en cours par
   * une copie fraîche de la composition du preset (`launchEncounterPreset`) — le preset
   * d'origine n'est jamais modifié. Les personnages joueurs (et leurs compagnons actifs)
   * rejoignent automatiquement, comme pour tout combat.
   */
  launchPreset: (preset: EncounterPreset) => void;
  /**
   * Recommence le décompte des manches (bouton ⟳) : compteur → 1 et tour courant repositionné sur
   * `firstTurnKey` (premier de l'ordre d'initiative, fourni par l'appelant) ou `null`. Ne touche NI
   * aux états NI aux PV — ce n'est pas une réinitialisation du combat.
   */
  restartRounds: (firstTurnKey?: string | null) => void;
  /**
   * Bascule manuelle du badge « a déjà joué » (PER-436). L'invariant « le combattant en train de
   * jouer n'est jamais marqué » est déjà garanti par `setCurrentTurnKey`, pas ici.
   */
  setCombatantActed: (key: string, acted: boolean) => void;
  /**
   * Pose la position manuelle de `key` dans l'ordre d'initiative (PER-436, dépôt du
   * glisser-déposer) : réinséré juste avant `beforeKey` au rendu.
   */
  setManualPosition: (key: string, beforeKey: string) => void;
  /**
   * Bascule l'épinglage de la position manuelle de `key` (PER-436) : épingler la conserve d'une
   * manche à l'autre. `currentBeforeKey` (voisin courant dans l'ordre affiché, ou `null` si
   * dernier) sert à figer la position si elle n'a jamais été déplacée à la main.
   */
  toggleCombatantPin: (key: string, currentBeforeKey: string | null) => void;
  /**
   * Retire la position manuelle de `key` et son épinglage (PER-436, bouton « Réinitialiser ») :
   * retour immédiat à la position calculée par initiative.
   */
  resetCombatantOrder: (key: string) => void;
}

export function useGmCombatState(cid: string, role: CombatRole = 'reader'): GmCombatStateApi {
  const state = useCampaignCombatStore((s) => s.byCampaign[cid] ?? EMPTY_COMBAT_STATE);
  const load = useCampaignCombatStore((s) => s.load);
  const applyLocalCombat = useCampaignCombatStore((s) => s.applyLocalCombat);

  // Chargement au montage (table → localStorage → vide ; migration douce si rôle MJ).
  // La synchro EN DIRECT ne passe plus par l'événement `storage` (retiré en PER-268) :
  // le rôle MJ écrit lui-même le store (`applyLocalCombat`), et la projection reçoit les
  // changements via le canal de session (`combat-state` → `applyRemoteCombat`, câblé dans
  // `useSessionChannel`). Canal seul → source de vérité unique, pas de double application.
  useEffect(() => {
    void load(cid, { seed: role === 'gm' });
  }, [cid, role, load]);

  const addCreature = useCallback(
    (slug: string, options?: AddCreatureOptions) =>
      applyLocalCombat(cid, (prev) => addCreatures(prev, slug, options)),
    [applyLocalCombat, cid],
  );

  const addCustomCreature = useCallback(
    (custom: CustomCreature, options?: AddCreatureOptions) =>
      applyLocalCombat(cid, (prev) => addCustomCreatures(prev, custom, options)),
    [applyLocalCombat, cid],
  );

  const duplicateCreature = useCallback(
    (instanceId: string) =>
      applyLocalCombat(cid, (prev) => duplicateCreatureState(prev, instanceId)),
    [applyLocalCombat, cid],
  );

  const updateCreature = useCallback(
    (instanceId: string, patch: UpdateCreaturePatch) =>
      applyLocalCombat(cid, (prev) => updateCreatureState(prev, instanceId, patch)),
    [applyLocalCombat, cid],
  );

  const removeCreature = useCallback(
    (instanceId: string) =>
      applyLocalCombat(cid, (prev) => {
        const depletions = { ...prev.depletions };
        delete depletions[instanceId];
        // Retire aussi les états posés sur l'instance (sinon ils orphelineraient la carte),
        // toute trace de pilotage du tour/de l'ordre (PER-436, sinon une ancre morte), et un
        // éventuel blocage de régénération (PER-456, sinon il orphelinerait la clé).
        const cleaned = dropCombatantOrderTraces(clearStatusesOf(prev, instanceId), instanceId);
        const regenBlocked = { ...cleaned.regenBlocked };
        delete regenBlocked[instanceId];
        return {
          ...cleaned,
          creatures: prev.creatures.filter((c) => c.id !== instanceId),
          depletions,
          regenBlocked,
        };
      }),
    [applyLocalCombat, cid],
  );

  const setCreatureVisibility = useCallback(
    (instanceId: string, visible: boolean) =>
      applyLocalCombat(cid, (prev) => ({
        ...prev,
        creatures: prev.creatures.map((c) => (c.id === instanceId ? { ...c, visible } : c)),
      })),
    [applyLocalCombat, cid],
  );

  const setCreatureDepletion = useCallback(
    (instanceId: string, depletion: Depletion) =>
      applyLocalCombat(cid, (prev) => ({
        ...prev,
        depletions: { ...prev.depletions, [instanceId]: depletion },
      })),
    [applyLocalCombat, cid],
  );

  const setCurrentTurnKey = useCallback(
    (key: string | null) => applyLocalCombat(cid, (prev) => setCurrentTurnKeyState(prev, key)),
    [applyLocalCombat, cid],
  );

  const setRoundNumber = useCallback(
    (roundNumber: number, healDeltas?: Record<string, number>) =>
      applyLocalCombat(cid, (prev) => setRoundNumberState(prev, roundNumber, healDeltas)),
    [applyLocalCombat, cid],
  );

  const setRegenBlocked = useCallback(
    (instanceId: string, blocked: boolean) =>
      applyLocalCombat(cid, (prev) => setRegenBlockedState(prev, instanceId, blocked)),
    [applyLocalCombat, cid],
  );

  const applyStatus = useCallback(
    (combatantKey: string, id: AnyStatusEffectId, intensity?: number) =>
      applyLocalCombat(cid, (prev) => applyStatusTo(prev, combatantKey, id, intensity)),
    [applyLocalCombat, cid],
  );

  const removeStatus = useCallback(
    (combatantKey: string, id: AnyStatusEffectId) => {
      // Un CRISTAL (PER-360) n'est pas un état comme un autre : il appartient au mage qui l'a
      // fabriqué. Le retirer de son porteur, c'est le lui RENDRE — et le lui rendre éteint, la
      // remise en service coûtant une action limitée (p. 156). Le MJ dispose donc du même geste que
      // le porteur sur sa fiche, où qu'il clique.
      if (isCrystalStatus(id)) {
        executeCrystalRelease(cid, { crystalId: id, holderKey: combatantKey });
        return;
      }
      applyLocalCombat(cid, (prev) => removeStatusFrom(prev, combatantKey, id));
    },
    [applyLocalCombat, cid],
  );

  const applyStatusToMany = useCallback(
    (combatantKeys: readonly string[], id: AnyStatusEffectId, options?: ApplyStatusToKeysOptions) =>
      applyLocalCombat(cid, (prev) => applyStatusToKeys(prev, combatantKeys, id, options)),
    [applyLocalCombat, cid],
  );

  const removeStatusFromMany = useCallback(
    (combatantKeys: readonly string[], id: AnyStatusEffectId) =>
      applyLocalCombat(cid, (prev) => removeStatusFromKeys(prev, combatantKeys, id)),
    [applyLocalCombat, cid],
  );

  const removeStatusesEverywhere = useCallback(
    (ids: readonly AnyStatusEffectId[]) =>
      applyLocalCombat(cid, (prev) => removeStatusesFromAll(prev, ids)),
    [applyLocalCombat, cid],
  );

  const adjustStatus = useCallback(
    (combatantKey: string, id: AnyStatusEffectId, delta: number) =>
      applyLocalCombat(cid, (prev) => adjustStatusIntensity(prev, combatantKey, id, delta)),
    [applyLocalCombat, cid],
  );

  const adjustStatusDuration = useCallback(
    (combatantKey: string, id: AnyStatusEffectId, delta: number) =>
      applyLocalCombat(cid, (prev) => adjustStatusDurationState(prev, combatantKey, id, delta)),
    [applyLocalCombat, cid],
  );

  const setCreatureInfo = useCallback(
    (info: Record<string, CreatureDisplayInfo>) =>
      applyLocalCombat(cid, (prev) => ({
        ...prev,
        creatureInfo: { ...prev.creatureInfo, ...info },
      })),
    [applyLocalCombat, cid],
  );

  const setPartyAuraCarrierIds = useCallback(
    (carrierIds: Record<string, string[]>) =>
      applyLocalCombat(cid, (prev) => ({ ...prev, partyAuraCarrierIds: carrierIds })),
    [applyLocalCombat, cid],
  );

  // Réinitialiser = nouveau combat : on en profite pour RETIRER une graine de départage à égalité
  // d'initiative (l'ordre entre joueurs à égalité parfaite est retiré au sort, cf. `initiativeOrder`).
  const resetCombat = useCallback(
    () => applyLocalCombat(cid, (prev) => rollTieBreakSeed(resetCombatState(prev), randomTieBreakSeed())),
    [applyLocalCombat, cid],
  );

  const launchPreset = useCallback(
    (preset: EncounterPreset) => applyLocalCombat(cid, () => launchEncounterPreset(preset)),
    [applyLocalCombat, cid],
  );

  const restartRounds = useCallback(
    (firstTurnKey: string | null = null) =>
      applyLocalCombat(cid, (prev) => restartRoundsState(prev, firstTurnKey)),
    [applyLocalCombat, cid],
  );

  const setCombatantActedCb = useCallback(
    (key: string, acted: boolean) =>
      applyLocalCombat(cid, (prev) => setCombatantActed(prev, key, acted)),
    [applyLocalCombat, cid],
  );

  const setManualPositionCb = useCallback(
    (key: string, beforeKey: string) =>
      applyLocalCombat(cid, (prev) => setManualPosition(prev, key, beforeKey)),
    [applyLocalCombat, cid],
  );

  const toggleCombatantPinCb = useCallback(
    (key: string, currentBeforeKey: string | null) =>
      applyLocalCombat(cid, (prev) => toggleCombatantPin(prev, key, currentBeforeKey)),
    [applyLocalCombat, cid],
  );

  const resetCombatantOrderCb = useCallback(
    (key: string) => applyLocalCombat(cid, (prev) => resetCombatantOrderState(prev, key)),
    [applyLocalCombat, cid],
  );

  return {
    ...state,
    addCreature,
    addCustomCreature,
    duplicateCreature,
    updateCreature,
    removeCreature,
    setCreatureVisibility,
    setCreatureDepletion,
    setCurrentTurnKey,
    setRoundNumber,
    setRegenBlocked,
    applyStatus,
    removeStatus,
    applyStatusToMany,
    removeStatusFromMany,
    removeStatusesEverywhere,
    adjustStatus,
    adjustStatusDuration,
    setCreatureInfo,
    setPartyAuraCarrierIds,
    resetCombat,
    launchPreset,
    restartRounds,
    setCombatantActed: setCombatantActedCb,
    setManualPosition: setManualPositionCb,
    toggleCombatantPin: toggleCombatantPinCb,
    resetCombatantOrder: resetCombatantOrderCb,
  };
}
