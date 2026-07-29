'use client';

/**
 * Store de l'« état de combat en cours » par campagne (PER-267, milestone PER-259) —
 * relogé du `localStorage` du seul navigateur MJ vers la table partagée `campaign_combat`,
 * synchronisé en direct pendant une session. Calque le modèle de synchro des états de jeu
 * de fiche (`characters.applyRemoteGameState`, PER-266) : un point d'état GLOBAL que le
 * canal Realtime peut alimenter, là où l'ancien `useGmCombatState` était un `useState`
 * local au hook (invisible depuis le canal, monté dans un autre sous-arbre).
 *
 * Deux chemins, selon le rôle du client dans l'UI :
 *  - **MJ (auteur unique)** : `applyLocalCombat` → met à jour le store, écrit le
 *    `localStorage` (pont same-browser pour la projection PER-248), upsert la table
 *    (source de vérité, portée campagne, persiste hors session), et **diffuse l'état
 *    absolu** sur le canal de session si une session est active (LWW).
 *  - **Pair lecteur (projection / joueur)** : `applyRemoteCombat` ← reçu du canal (ou de
 *    l'événement `storage` same-browser) → remplace l'état du store. AUCUNE écriture
 *    (table/broadcast) : un joueur ne peut de toute façon pas écrire (RLS 0012).
 *
 * Sens des imports (identique à PER-266, aucun cycle) : ce store importe `combatRepo` +
 * `sessionBridge` (émission) ; `useSessionChannel` importe CE store (réception).
 */
import { create } from 'zustand';

import { fetchCampaignCombat, upsertCampaignCombat } from '@/lib/session/combatRepo';
import { sessionSendFor } from '@/lib/session/sessionBridge';
import {
  EMPTY_COMBAT_STATE,
  reviveState,
  reviveStateObject,
  storageKey,
  type GmCombatState,
} from '@/lib/session/combatState';

/** Événement de broadcast portant l'état de combat absolu (snapshot, LWW). */
export const COMBAT_STATE_EVENT = 'combat-state';

/** L'app est-elle branchée sur Supabase (variables d'env publiques présentes) ? */
function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/** Relit l'état de combat depuis le `localStorage` (pont same-browser), ou `null`. */
function readLocalState(cid: string): GmCombatState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(storageKey(cid));
  return raw ? reviveState(raw) : null;
}

/** Écrit l'état de combat dans le `localStorage` (pont same-browser pour la projection). */
function writeLocalState(cid: string, state: GmCombatState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(cid), JSON.stringify(state));
}

interface CampaignCombatState {
  /** État de combat par campagne (source de vérité en mémoire). */
  byCampaign: Record<string, GmCombatState>;
  /** La campagne a-t-elle fini de charger (table/localStorage) ? Garde l'écriture. */
  hydrated: Record<string, boolean>;

  /**
   * Charge l'état de combat de la campagne dans le store, à appeler au montage.
   * Source de vérité = table `campaign_combat` ; à défaut, `localStorage` (mode 100 %
   * local, ou combat préparé avant relocation). **Migration douce** : si `seed` (rôle
   * MJ) ET table vide ET `localStorage` présent → ensemence la table depuis le local
   * pour ne pas perdre les combats/prépa en cours.
   */
  load: (cid: string, opts?: { seed?: boolean }) => Promise<void>;
  /**
   * Mutation par le MJ (auteur unique) : applique l'updater, persiste (localStorage +
   * table) et diffuse l'état absolu sur le canal si une session est active.
   */
  applyLocalCombat: (cid: string, updater: (prev: GmCombatState) => GmCombatState) => void;
  /**
   * Réception d'un état de combat chez un pair (canal Realtime ou événement `storage`
   * same-browser) : remplace l'état du store, SANS réécrire ni re-diffuser.
   */
  applyRemoteCombat: (cid: string, state: unknown) => void;
}

export const useCampaignCombatStore = create<CampaignCombatState>()((set, get) => ({
  byCampaign: {},
  hydrated: {},

  load: async (cid, opts) => {
    const seed = opts?.seed ?? false;
    const local = readLocalState(cid);

    // Mode 100 % local (pas d'env Supabase) : la source reste le localStorage.
    if (!isSupabaseConfigured()) {
      set((s) => ({
        byCampaign: { ...s.byCampaign, [cid]: local ?? EMPTY_COMBAT_STATE },
        hydrated: { ...s.hydrated, [cid]: true },
      }));
      return;
    }

    try {
      const remote = await fetchCampaignCombat(cid);
      if (remote) {
        // La table fait foi : on l'adopte et on la reflète dans le localStorage (pont
        // same-browser pour la projection PER-248).
        writeLocalState(cid, remote);
        set((s) => ({
          byCampaign: { ...s.byCampaign, [cid]: remote },
          hydrated: { ...s.hydrated, [cid]: true },
        }));
        return;
      }
      // Table vide. Migration douce (rôle MJ uniquement) : ensemencer depuis le local.
      const initial = local ?? EMPTY_COMBAT_STATE;
      set((s) => ({
        byCampaign: { ...s.byCampaign, [cid]: initial },
        hydrated: { ...s.hydrated, [cid]: true },
      }));
      if (seed && local) {
        // Best-effort : ne pas casser l'affichage si l'upsert échoue (le local reste).
        void upsertCampaignCombat(cid, local).catch(() => {});
      }
    } catch {
      // Erreur réseau : on retombe sur le local pour ne pas bloquer l'écran de MJ.
      set((s) => ({
        byCampaign: { ...s.byCampaign, [cid]: local ?? EMPTY_COMBAT_STATE },
        hydrated: { ...s.hydrated, [cid]: true },
      }));
    }
  },

  applyLocalCombat: (cid, updater) => {
    const prev = get().byCampaign[cid] ?? EMPTY_COMBAT_STATE;
    const next = updater(prev);
    set((s) => ({ byCampaign: { ...s.byCampaign, [cid]: next } }));

    // Ne persiste/diffuse qu'une fois la campagne hydratée : évite d'écraser une ligne
    // que `load` n'a pas encore lue par un état construit sur du vide (miroir de la
    // garde `hydratedCidRef` de l'ancien hook).
    if (!get().hydrated[cid]) return;

    // Pont same-browser (projection PER-248) : l'événement `storage` se déclenche dans
    // les autres fenêtres de même origine à cette écriture.
    writeLocalState(cid, next);
    // Persistance partagée (source de vérité, portée campagne). MJ seul auteur → écriture
    // directe ; RLS 0012 refuse un joueur (best-effort, on ignore l'échec).
    if (isSupabaseConfigured()) {
      void upsertCampaignCombat(cid, next).catch(() => {});
    }
    // Direct : diffuse l'état absolu si une session est active (sinon `null` → hors
    // session, rien à diffuser, la table suffit à la persistance).
    const send = sessionSendFor(cid);
    if (send) send(COMBAT_STATE_EVENT, { state: next });
  },

  applyRemoteCombat: (cid, state) => {
    const revived = reviveStateObject(state);
    set((s) => ({
      byCampaign: { ...s.byCampaign, [cid]: revived },
      hydrated: { ...s.hydrated, [cid]: true },
    }));
  },
}));
