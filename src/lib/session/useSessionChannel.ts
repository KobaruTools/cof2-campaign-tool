'use client';

/**
 * Canal Realtime de session + présence + synchro d'état de jeu (PER-265/PER-266, milestone
 * PER-259) — le TUYAU, le VOYANT et le DIRECT. Ouvre UN canal `session:<campaign_id>` par
 * appareil membre, **uniquement pendant qu'une session est active**, y annonce la présence de
 * ce client, expose la liste vivante des connectés, ET (PER-266) porte les deltas d'état de
 * jeu : reçoit les broadcasts `game-state` des pairs et les applique au store, et branche le
 * pont `sessionBridge` pour que le store puisse ÉMETTRE ses propres deltas sur ce canal.
 *
 * Entrée en session : au premier `SUBSCRIBED`, on lit l'état autoritatif en base
 * (`load({force})`) AVANT de vivre des deltas — un client qui rejoint en cours voit l'état
 * correct puis le direct (modèle « C1 : Broadcast-first »).
 *
 * Confinement du coût (levier n°1 de la conception) : **aucun socket hors session**.
 * Le hook ne s'abonne que lorsqu'on lui passe une `session` active ET une `identity`
 * résolue ; dès que la session se termine (le gate `useActiveSession` renvoie `null`)
 * ou que la page pertinente est démontée, il `removeChannel` proprement.
 *
 * Ce hook NE POLLE PAS : il reçoit la session déjà résolue par l'appelant (une seule
 * découverte `useActiveSession` par page, pas de double poll). Il ne bat pas non plus
 * `last_active_at` : le battement reste dans `useActiveSession(heartbeat)`, porté par
 * les pages où un humain est présent (la projection, elle, ne bat pas).
 *
 * Journal de présence (`game_session_participants`, PER-270) : une entrée par ouverture
 * de canal, best-effort, fermée au démontage. La **projection** (`kind: 'projection'`)
 * est exclue du journal ET de la liste affichée — c'est un écran, pas une personne.
 */
import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useCharactersStore } from '@/stores/characters';
import { COMBAT_STATE_EVENT, useCampaignCombatStore } from '@/stores/campaignCombat';
import { registerSessionChannel } from './sessionBridge';
import { joinSessionParticipant, leaveSessionParticipant } from './participantsRepo';
import { resolveActiveSession } from './repo';
import {
  presenceKeyFor,
  presenceListFromState,
  type RawPresenceState,
  type SessionPresenceEntry,
  type SessionPresenceKind,
} from './presence';
import type { GameSession } from './types';

/** État de connexion du canal (source du signal 3 états, PER-269). */
export type SessionChannelStatus = 'idle' | 'connecting' | 'joined' | 'error';

/**
 * Réconciliation par INSTANTANÉ à la reconnexion (PER-269, §10 de l'ADR PER-259). Appelée
 * quand le canal re-émet `SUBSCRIBED` sur le MÊME objet (rejoin automatique Phoenix après
 * une coupure socket — vérifié : `joinPush.resend()` préserve les `recHooks`), donc APRÈS
 * la première souscription.
 *
 * Ordre (cf. grilling PER-269) : garde-fou session active → re-pousser NOS édits hors ligne
 * et attendre leur persistance → PUIS relire l'autoritatif (qui porte alors nos valeurs +
 * les changements des pairs manqués) → le MJ re-diffuse le combat. On re-pousse uniquement
 * les fiches réellement éditées hors ligne (jamais toute la campagne), pour ne pas écraser
 * d'une copie périmée une valeur qu'un pair aurait modifiée pendant notre coupure.
 */
async function reconcileOnReconnect(
  campaignId: string,
  kind: SessionPresenceKind,
): Promise<void> {
  // Garde-fou : re-poussée auto SEULEMENT si la session est encore active côté serveur
  // (`ended_at IS NULL`). La policy RLS du canal ne gate PAS sur `ended_at` → un rejoin
  // peut survenir sur une session déjà close ; sans ce contrôle on re-pousserait en
  // conflict-free hors session au lieu de retomber sur le verrou de version.
  let sessionActive = false;
  try {
    sessionActive = (await resolveActiveSession(campaignId)) !== null;
  } catch {
    return; // réseau encore incertain : ne rien tenter, un prochain rejoin réessaiera
  }
  if (!sessionActive) return; // session finie → chemin verrou (le poll fermera le canal)
  const characters = useCharactersStore.getState();
  await characters.resyncGameState(campaignId);
  await characters.load({ force: true });
  // Le MJ est l'auteur unique du combat : sa vue locale fait foi, il la re-diffuse.
  if (kind === 'gm') useCampaignCombatStore.getState().resyncCombat(campaignId);
}

/** Identité annoncée par ce client sur le canal. `null` tant que non résolue. */
export interface SessionIdentity {
  kind: SessionPresenceKind;
  /** Id du joueur de roster (null pour MJ / projection). */
  playerId: string | null;
  /** Libellé d'affichage (« MJ », nom du joueur…). */
  name: string;
}

/** L'app est-elle branchée sur Supabase (variables d'env publiques présentes) ? */
function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export interface SessionChannelState {
  /** Liste vivante des personnes connectées (MJ + joueurs ; projection exclue). */
  present: SessionPresenceEntry[];
  /** État de connexion du canal. */
  status: SessionChannelStatus;
}

/**
 * Rejoint le canal de session tant que `session` est active et `identity` résolue.
 *
 * @param campaignId  Campagne de la session ; `null`/`undefined` → hook inerte.
 * @param session     Session active (du gate `useActiveSession`) ; `null` → pas de canal.
 * @param identity    Qui est ce client ; `null` tant que non résolu → pas de canal.
 */
export function useSessionChannel(
  campaignId: string | null | undefined,
  session: GameSession | null,
  identity: SessionIdentity | null,
): SessionChannelState {
  const sessionId = session?.id ?? null;
  const kind = identity?.kind ?? null;
  const playerId = identity?.playerId ?? null;
  const name = identity?.name ?? '';
  // La projection est un écran : pas de journal de présence pour elle.
  const logParticipant = kind !== null && kind !== 'projection';

  const enabled =
    Boolean(campaignId) && Boolean(sessionId) && kind !== null && isSupabaseConfigured();

  const [present, setPresent] = useState<SessionPresenceEntry[]>([]);
  const [status, setStatus] = useState<SessionChannelStatus>('idle');
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Ouverture/fermeture du canal — clé structurelle (session + identité), PAS le nom
  // (le nom se ré-annonce sans rouvrir le canal, voir l'effet suivant). Zéro `setState`
  // synchrone dans le corps de l'effet (règle `react-hooks/set-state-in-effect`) : on
  // ne modifie l'état que depuis les callbacks async, et on masque à la sortie.
  useEffect(() => {
    if (!enabled || !campaignId || !sessionId || kind === null) return;
    let active = true;
    const supabase = createBrowserSupabaseClient();
    const channel = supabase.channel(`session:${campaignId}`, {
      config: { private: true, presence: { key: presenceKeyFor(kind, playerId) } },
    });
    channelRef.current = channel;
    // Entrée de journal de ce client (best-effort) : posée à l'abonnement, fermée au
    // démontage. Conservée à travers les reconnexions (pas de doublon par rejoin).
    let participantId: string | null = null;
    // Désenregistrement du pont d'émission (PER-266) + garde anti-double-lecture de l'état
    // autoritatif : posés une seule fois au premier `SUBSCRIBED`, survivent aux reconnexions.
    let unregisterBridge: (() => void) | null = null;
    let didInitialLoad = false;

    channel.on('presence', { event: 'sync' }, () => {
      if (active) {
        setPresent(presenceListFromState(channel.presenceState() as RawPresenceState));
      }
    });

    // Réception des deltas d'état de jeu des pairs (PER-266) : application immédiate à la vue
    // en mémoire, sans re-diffuser ni flusher (l'émetteur a déjà persisté via merge_game_state).
    // `self` est faux par défaut → on ne reçoit pas nos propres broadcasts (aucune boucle).
    channel.on('broadcast', { event: 'game-state' }, ({ payload }) => {
      if (!active) return;
      const p = payload as { characterId?: unknown; patch?: unknown; replaceMounts?: unknown };
      if (typeof p.characterId === 'string' && p.patch && typeof p.patch === 'object') {
        useCharactersStore
          .getState()
          .applyRemoteGameState(
            p.characterId,
            p.patch as Record<string, unknown>,
            p.replaceMounts === true,
          );
      }
    });

    // Réception de l'état de COMBAT (roster de créatures, PV, tour, visibilité) diffusé par
    // le MJ (auteur unique, PER-267). Application en LECTURE SEULE : `applyRemoteCombat`
    // remplace l'état du store sans réécrire ni re-diffuser. `campaignId` est fixe pour ce
    // canal ; le payload porte l'état absolu (snapshot).
    channel.on('broadcast', { event: COMBAT_STATE_EVENT }, ({ payload }) => {
      if (!active) return;
      const p = payload as { state?: unknown };
      if (p.state && typeof p.state === 'object') {
        useCampaignCombatStore.getState().applyRemoteCombat(campaignId, p.state);
      }
    });

    // `setAuth()` (sans argument → token courant) avant l'abonnement : supabase-js le
    // câble déjà sur l'auth, on garantit ici le jeton pour le canal PRIVÉ (RLS 0012).
    void supabase.realtime
      .setAuth()
      .then(() => {
        if (!active) return;
        setStatus('connecting');
        channel.subscribe(async (st) => {
          if (!active) return;
          if (st === 'SUBSCRIBED') {
            setStatus('joined');
            // Pont d'émission (PER-266) : le store peut désormais diffuser ses deltas d'état de
            // jeu sur CE canal (`sessionBridge`). Enregistré une seule fois (survit aux rejoins).
            if (unregisterBridge === null) {
              unregisterBridge = registerSessionChannel(campaignId, (event, payload) => {
                void channel.send({ type: 'broadcast', event, payload });
              });
            }
            // Entrée en session : lecture de l'état autoritatif AVANT de vivre des deltas (un
            // client qui rejoint en cours). Le PREMIER SUBSCRIBED se contente de lire ; chaque
            // re-SUBSCRIBED ultérieur (reconnexion après coupure) déclenche la réconciliation
            // par instantané (PER-269) : re-pousser nos édits hors ligne puis relire l'autoritatif.
            if (!didInitialLoad) {
              didInitialLoad = true;
              void useCharactersStore.getState().load({ force: true });
            } else {
              void reconcileOnReconnect(campaignId, kind);
            }
            if (logParticipant && participantId === null) {
              try {
                participantId = await joinSessionParticipant(campaignId);
              } catch {
                // Best-effort : le journal n'est pas critique au direct.
              }
            }
          } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') {
            setStatus('error');
          } else if (st === 'CLOSED') {
            setStatus('idle');
          }
        });
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
      channelRef.current = null;
      // Débranche l'émission (PER-266) : plus aucune écriture d'état de jeu ne sera diffusée
      // pour cette campagne tant qu'un canal n'est pas rouvert (le store retombe sur le verrou).
      if (unregisterBridge !== null) unregisterBridge();
      if (participantId !== null) {
        void leaveSessionParticipant(participantId).catch(() => {});
      }
      void supabase.removeChannel(channel);
    };
  }, [enabled, campaignId, sessionId, kind, playerId, logParticipant]);

  // Ré-annonce la présence quand le nom d'affichage change (le roster peut se charger
  // APRÈS l'abonnement) — sans rouvrir le canal. Gaté sur `joined` pour ne `track()`
  // qu'après l'abonnement, et couvre aussi la première annonce.
  useEffect(() => {
    if (status !== 'joined' || kind === null) return;
    const channel = channelRef.current;
    if (!channel) return;
    void channel
      .track({ kind, playerId, name, onlineAt: new Date().toISOString() })
      .catch(() => {});
  }, [status, kind, playerId, name]);

  // Masque l'état interne quand le hook est inerte (hors session / non résolu).
  return enabled ? { present, status } : { present: [], status: 'idle' };
}
