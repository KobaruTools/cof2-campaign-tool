'use client';

/**
 * Cristaux qu'un joueur a CONFIÉS à un autre personnage (PER-360, voie des cristaux p. 156).
 *
 * DEUX EFFETS, dans cet ordre — exactement le motif du renoncement à un buff (PER-358) :
 *  1. LOCAL et immédiat — le cristal confié sort des cristaux actifs de la copie de CALCUL du mage
 *     (`withAssignedCrystalsOff`), donc son bonus quitte sa fiche sans attendre le réseau ;
 *  2. EXÉCUTÉ par le client du MJ — le joueur ne peut pas écrire `campaign_combat` (RLS, MJ auteur
 *     unique), c'est donc lui qui pose l'état sur le porteur. L'état redescend ensuite à toute la
 *     table par `COMBAT_STATE_EVENT` : le porteur voit la puce arriver sur sa fiche et ses stats en
 *     profitent.
 *
 * QUAND C'EST LE MJ QUI AGIT, il n'y a PERSONNE à qui annoncer : un client ne reçoit pas ses propres
 * broadcasts (`self: false` côté Realtime), si bien qu'un message émis par le MJ ne serait traité par
 * aucun client. On exécute donc directement (`executeCrystalAssignment`) — c'est le cas courant en
 * recette, le MJ consultant lui-même la fiche du mage.
 *
 * Volontairement NON persisté : un cristal confié est un fait de séance, comme l'état de combat qui
 * le porte. Au rechargement, la carte repart vide — mais rien n'est perdu pour autant, l'état de
 * combat partagé disant déjà qui porte quoi (cf. `crystalsHeldByOthers`). Cette carte n'est donc que
 * la couche OPTIMISTE, qui répond au clic sans attendre l'aller-retour par le MJ.
 *
 * Elle a la priorité sur l'état partagé, faute de quoi le mage verrait son choix revenir en arrière
 * le temps que le MJ le relaie. Conséquence assumée : si le MJ lève lui-même un cristal confié, le
 * sélecteur du mage continue d'afficher l'ancien porteur jusqu'à ce qu'il en change — le bonus, lui,
 * reste hors de sa fiche, ce qui est le côté prudent de l'erreur (jamais de double compte).
 */
import { create } from 'zustand';

import { sessionSendFor } from '@/lib/session/sessionBridge';
import {
  applyCrystalAssignment,
  applyCrystalRelease,
  setCrystalAssignment,
  type CrystalAssignment,
  type CrystalAssignmentMap,
  type CrystalRelease,
} from '@/lib/session/crystalAssignment';
import { crystalOwner, toggleCrystalActive } from '@/lib/character/crystals';
import { useCampaignCombatStore } from './campaignCombat';
import { useCharactersStore } from './characters';
import { usePlayersStore } from './players';

/** Événement de broadcast : « ce cristal passe à ce porteur ». Traité par le seul client du MJ. */
export const CRYSTAL_ASSIGNMENT_EVENT = 'crystal-assignment';
/** Événement de broadcast : « je rends ce cristal ». Traité par le seul client du MJ. */
export const CRYSTAL_RELEASE_EVENT = 'crystal-release';

/** Carte vide partagée — référence STABLE, pour que les sélecteurs ne re-rendent pas dans le vide. */
const EMPTY_MAP: CrystalAssignmentMap = {};

/**
 * Nom du JOUEUR qui confie un cristal (`AppliedStatus.castBy`), résolu depuis la table — jamais le
 * nom du PERSONNAGE (même vocabulaire que la pose d'un buff de groupe). `undefined` si le personnage
 * source n'est réclamé par personne : aucune mention vaut mieux qu'une mention trompeuse.
 */
function playerNameOf(sourceCharacterId: string): string | undefined {
  const source = useCharactersStore.getState().characters.find((c) => c.id === sourceCharacterId);
  if (!source?.playerId) return undefined;
  return usePlayersStore.getState().players.find((p) => p.id === source.playerId)?.name;
}

/**
 * CE QUE FAIT LE CLIENT DU MJ en recevant une attribution (ou en l'émettant lui-même) : poser le
 * cristal sur le porteur désigné, et le retirer de son porteur précédent.
 */
export function executeCrystalAssignment(campaignId: string, assignment: CrystalAssignment): void {
  const castBy = playerNameOf(assignment.sourceCharacterId);
  useCampaignCombatStore
    .getState()
    .applyLocalCombat(campaignId, (prev) => applyCrystalAssignment(prev, assignment, castBy));
}

/**
 * CE QUE FAIT LE CLIENT DU MJ quand un porteur REND un cristal : la puce quitte l'état de combat, et
 * le cristal s'éteint chez son propriétaire — qui le récupère donc INACTIF (« activer ou désactiver
 * un cristal correspond à une action limitée », p. 156 : le mage ne l'a pas dépensée). Le mage est
 * retrouvé par la table, l'état posé ne portant que l'id du cristal.
 *
 * L'extinction passe par l'état de jeu (`applyGameState`) : elle se propage en direct à la fiche du
 * mage, ouverte ailleurs, au lieu d'attendre un rechargement.
 */
export function executeCrystalRelease(campaignId: string, release: CrystalRelease): void {
  useCampaignCombatStore
    .getState()
    .applyLocalCombat(campaignId, (prev) => applyCrystalRelease(prev, release));
  const characters = useCharactersStore
    .getState()
    .characters.filter((c) => c.campaignId === campaignId);
  const owner = crystalOwner(characters, release.crystalId);
  if (!owner) return;
  useCharactersStore
    .getState()
    .applyGameState(owner, toggleCrystalActive(owner, release.crystalId, false));
}

/**
 * Éteint un cristal rendu, chez SON PROPRIÉTAIRE et lui seul — ce qu'un client JOUEUR peut faire
 * quand il reçoit l'abandon : il n'écrit que les personnages qu'il a chargés (RLS), donc au plus le
 * sien. Sans cela, le mage dont le cristal revient dépendrait entièrement de la page ouverte chez le
 * MJ pour voir sa case se décocher. Le MJ, lui, passe par `executeCrystalRelease` (qui lève AUSSI
 * la puce) ; les deux écrivent la même valeur, se recouvrir est sans conséquence.
 */
export function extinguishReleasedCrystal(release: CrystalRelease): void {
  const owner = crystalOwner(useCharactersStore.getState().characters, release.crystalId);
  if (!owner) return;
  useCharactersStore
    .getState()
    .applyGameState(owner, toggleCrystalActive(owner, release.crystalId, false));
}

interface CrystalAssignmentState {
  /** Attributions par personnage SOURCE, keyées par cristal. Absent/vide = tout est porté par le mage. */
  byCharacter: Record<string, CrystalAssignmentMap>;

  /** Attributions d'un personnage (référence stable quand il n'en a aucune). */
  assignmentsOf: (characterId: string) => CrystalAssignmentMap;

  /**
   * Confie un cristal à `targetKey` (ou le reprend si `null`) ET le fait exécuter : directement quand
   * ce client est celui du MJ, par annonce sinon (le joueur ne peut pas écrire l'état de combat).
   * Idempotent. Le nom du joueur affiché sur la fiche du porteur (`castBy`) n'est PAS envoyé sur le
   * canal : c'est le client du MJ qui le résout, seul à connaître la table.
   *
   * `campaignId` `null` = personnage hors campagne : l'attribution n'a alors aucun sens (personne à
   * qui confier quoi que ce soit), rien n'est écrit ni annoncé.
   */
  assign: (
    campaignId: string | null,
    sourceCharacterId: string,
    crystalId: string,
    targetKey: string | null,
    isGm: boolean,
  ) => void;

  /**
   * Un PORTEUR rend le cristal qu'on lui avait confié (retour de recette PER-360). Ce n'est pas un
   * renoncement à un buff : le cristal ne lui appartient pas, il retourne à son propriétaire — qui le
   * récupère ÉTEINT, la remise en service coûtant une action limitée (p. 156).
   */
  release: (
    campaignId: string | null,
    crystalId: string,
    holderKey: string,
    isGm: boolean,
  ) => void;

  /**
   * Aligne la carte sur les cristaux réellement ACTIFS du mage : un cristal éteint (rendu par son
   * porteur, ou désactivé à la main) n'a plus d'attribution à traîner. Sans cette purge, le rallumer
   * plus tard le renverrait aussitôt à son ancien porteur. Même référence si rien ne change.
   */
  syncActive: (characterId: string, activeCrystalIds: readonly string[]) => void;
}

/** Diffuse au MJ. Sans canal ouvert (hors séance), le geste reste purement local. */
function broadcast(campaignId: string, event: string, payload: unknown): void {
  const send = sessionSendFor(campaignId);
  if (send) send(event, payload);
}

export const useCrystalAssignmentStore = create<CrystalAssignmentState>()((set, get) => ({
  byCharacter: {},

  assignmentsOf: (characterId) => get().byCharacter[characterId] ?? EMPTY_MAP,

  assign: (campaignId, sourceCharacterId, crystalId, targetKey, isGm) => {
    if (!campaignId) return;
    const current = get().byCharacter[sourceCharacterId] ?? EMPTY_MAP;
    const next = setCrystalAssignment(current, crystalId, targetKey);
    if (next === current) return;
    set((s) => ({ byCharacter: { ...s.byCharacter, [sourceCharacterId]: next } }));
    const assignment: CrystalAssignment = {
      sourceCharacterId,
      crystalId: crystalId as CrystalAssignment['crystalId'],
      targetKey,
    };
    if (isGm) executeCrystalAssignment(campaignId, assignment);
    else broadcast(campaignId, CRYSTAL_ASSIGNMENT_EVENT, assignment);
  },

  release: (campaignId, crystalId, holderKey, isGm) => {
    if (!campaignId) return;
    const release: CrystalRelease = {
      crystalId: crystalId as CrystalRelease['crystalId'],
      holderKey,
    };
    if (isGm) executeCrystalRelease(campaignId, release);
    else broadcast(campaignId, CRYSTAL_RELEASE_EVENT, release);
  },

  syncActive: (characterId, activeCrystalIds) => {
    const current = get().byCharacter[characterId];
    if (!current) return;
    const active = new Set(activeCrystalIds);
    const entries = Object.entries(current).filter(([crystalId]) => active.has(crystalId));
    if (entries.length === Object.keys(current).length) return;
    set((s) => ({
      byCharacter: { ...s.byCharacter, [characterId]: Object.fromEntries(entries) },
    }));
  },
}));
