'use client';

/**
 * Store de la PRÉSENCE de session par campagne (PER-313) — « qui est connecté au canal », rendu
 * lisible depuis n'importe où dans la page.
 *
 * La liste des présents est produite par `useSessionChannel` (events Realtime Presence, dérivés par
 * `presenceListFromState`). Elle vivait jusqu'ici dans l'état LOCAL du hook, donc uniquement dans le
 * sous-arbre qui l'appelle — le voyant de l'en-tête. Le repos de groupe en a besoin ailleurs :
 * l'écran de MJ ne convoque au relevé que les joueurs effectivement connectés, et il est monté dans
 * un tout autre sous-arbre. D'où ce relais.
 *
 * **Éphémère et non persisté**, comme `stores/restProposal` : une présence n'a de sens qu'au direct,
 * et elle est reconstruite à chaque `sync` du canal. Un seul canal par campagne et par onglet (cf.
 * `useSessionChannel`) : la dernière écriture fait foi, sans arbitrage à inventer.
 */
import { create } from 'zustand';

import type { SessionPresenceEntry } from '@/lib/session/presence';

/**
 * Liste vide partagée : un sélecteur zustand doit renvoyer une référence STABLE quand il n'y a rien
 * (l'égalité par défaut est `Object.is` — un `[]` neuf à chaque rendu rendrait en boucle).
 */
export const EMPTY_PRESENCE: SessionPresenceEntry[] = [];

interface SessionPresenceStoreState {
  /** Présents par campagne (MJ + joueurs ; la projection en est déjà exclue en amont). */
  byCampaign: Record<string, SessionPresenceEntry[]>;
  /** Publie la liste des présents d'une campagne (appelé à chaque `sync` du canal). */
  setPresence: (cid: string, present: SessionPresenceEntry[]) => void;
  /** Oublie la présence d'une campagne (canal fermé) : plus personne n'est connecté ici. */
  clearPresence: (cid: string) => void;
}

export const useSessionPresenceStore = create<SessionPresenceStoreState>()((set) => ({
  byCampaign: {},

  setPresence: (cid, present) => {
    set((s) => ({ byCampaign: { ...s.byCampaign, [cid]: present } }));
  },

  clearPresence: (cid) => {
    set((s) => {
      // Rien à oublier : on renvoie l'état tel quel pour ne pas réveiller les abonnés.
      if (!(cid in s.byCampaign)) return s;
      const next = { ...s.byCampaign };
      delete next[cid];
      return { byCampaign: next };
    });
  },
}));

/**
 * Ids des joueurs de roster connectés à la campagne. Le MJ (`playerId: null`) et la projection n'en
 * font pas partie : c'est une liste de JOUEURS, telle que l'attend `connectedRestParticipants`.
 */
export function presentPlayerIds(present: readonly SessionPresenceEntry[]): string[] {
  const ids: string[] = [];
  for (const entry of present) {
    if (entry.kind === 'player' && entry.playerId) ids.push(entry.playerId);
  }
  return ids;
}
