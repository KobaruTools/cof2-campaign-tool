'use client';

/**
 * Découverte PARESSEUSE d'une session de table active (PER-264) — le primitif que les
 * tickets suivants (PER-265+) consulteront pour ouvrir ou non le canal temps réel.
 *
 * Fonctionnement, **sans aucun socket permanent** (levier n°1 de maîtrise des coûts) :
 *  - **check au montage** puis **poll HTTP léger** (~45 s, requête RPC indexée) pour
 *    basculer l'UI en « session en cours » SANS rechargement quand le MJ démarre — et
 *    inversement quand elle se termine. Le poll appelle `resolveActiveSession`, qui
 *    applique aussi la fermeture paresseuse côté serveur (filets vide/plafond).
 *  - **battement** (~2,5 min < grâce 5 min) UNIQUEMENT si `heartbeat` est demandé ET
 *    qu'une session est active : rafraîchit `last_active_at` (le mécanisme de PRÉSENCE
 *    fin viendra à PER-265 ; ici on pose juste l'écriture périodique).
 *
 * Garde-fou : sans `campaignId` (fiche non rattachée, mode 100 % local) ou sans env
 * Supabase, le hook ne fait **aucune** requête et renvoie « inactif ».
 */
import { useCallback, useEffect, useState } from 'react';

import { resolveActiveSession, touchSession } from './repo';
import type { GameSession } from './types';

/** Intervalle de poll de découverte (~45 s) — bascule « session en cours » sans rechargement. */
const POLL_MS = 45_000;
/** Intervalle de battement (~2,5 min) — sous le délai de grâce « vide » (5 min). */
const HEARTBEAT_MS = 150_000;

/** L'app est-elle branchée sur Supabase (variables d'env publiques présentes) ? */
function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export interface ActiveSessionState {
  /** La session active de la campagne, ou `null` (aucune / non résolue / hors cloud). */
  session: GameSession | null;
  /** Raccourci : une session est-elle en cours ? */
  isActive: boolean;
  /** `true` tant que le premier check n'a pas répondu (masque un faux « pas de session »). */
  loading: boolean;
  /** Force un re-check immédiat (à appeler après un démarrage/arrêt côté MJ). */
  refresh: () => void;
}

/**
 * Suit la session active d'une campagne par poll léger.
 *
 * @param campaignId  Campagne à surveiller ; `null`/`undefined` → hook inerte (0 requête).
 * @param opts.heartbeat  Ce client doit-il rafraîchir le battement tant qu'une session
 *   est active ? À réserver aux pages où un humain est réellement présent (fiche, `/play`,
 *   écran MJ). Défaut `false` (simple observateur).
 */
export function useActiveSession(
  campaignId: string | null | undefined,
  opts?: { heartbeat?: boolean },
): ActiveSessionState {
  const heartbeat = opts?.heartbeat ?? false;
  // Hook inerte (0 requête) sans campagne rattachée ou sans env Supabase.
  const enabled = Boolean(campaignId) && isSupabaseConfigured();

  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  // Compteur incrémenté par `refresh()` pour forcer un re-check hors cadence de poll.
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // Découverte + poll (zéro socket). Tourne même sans session active : c'est ainsi
  // qu'un client DÉCOUVRE une session démarrée par le MJ, sans rechargement. On ne
  // `setState` que depuis le callback async (jamais synchronement dans l'effet) ;
  // l'état « désactivé » est masqué à la sortie plutôt que réinitialisé ici.
  useEffect(() => {
    if (!enabled || !campaignId) return;
    let active = true;
    const check = async () => {
      try {
        const s = await resolveActiveSession(campaignId);
        if (active) setSession(s);
      } catch {
        // Best-effort : une erreur réseau ponctuelle ne doit pas casser la page ;
        // on retentera au prochain poll.
      } finally {
        if (active) setLoading(false);
      }
    };
    void check();
    const id = setInterval(() => void check(), POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [enabled, campaignId, nonce]);

  // Battement basse fréquence : seulement si demandé ET session active. Un battement
  // immédiat en devenant actif garde `last_active_at` frais dès l'entrée.
  const sessionId = session?.id;
  useEffect(() => {
    if (!heartbeat || !enabled || !campaignId || !sessionId) return;
    let active = true;
    const beat = () => {
      if (active) void touchSession(campaignId).catch(() => {});
    };
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [heartbeat, enabled, campaignId, sessionId]);

  // Masque l'état interne quand le hook est inerte (campagne absente / hors cloud).
  const activeSession = enabled ? session : null;
  return {
    session: activeSession,
    isActive: activeSession !== null,
    loading: enabled ? loading : false,
    refresh,
  };
}
