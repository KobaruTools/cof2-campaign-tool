/**
 * Accès aux données « Session de table » côté cloud (PER-264) — via le client
 * Supabase **navigateur**. Seul point de contact entre l'UI/le hook `useActiveSession`
 * et la table `public.game_sessions` + les RPC de cycle de vie de la migration 0013.
 *
 * Deux chemins d'écriture, selon l'autorisation :
 *  - **Démarrer / terminer** (`startSession` / `endSession`) : écriture DIRECTE, la
 *    RLS de 0012 la réserve au MJ propriétaire de la campagne — pas de RPC.
 *  - **Gate + fermeture paresseuse** (`resolveActiveSession`) et **battement**
 *    (`touchSession`) : RPC `security definer` membre-appelables (0013), car un
 *    JOUEUR doit pouvoir clore une session périmée et rafraîchir le battement, alors
 *    que la RLS réserve l'écriture de `game_sessions` au MJ. La condition de
 *    péremption est validée côté serveur.
 *
 * Toutes les fonctions **lèvent** en cas d'erreur Supabase (l'appelant capte). Le
 * mapping ligne → `GameSession` est isolé dans `rowToSession` (fonction pure, testée).
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import type { GameSession, SessionEndReason } from './types';

type GameSessionRow = Database['public']['Tables']['game_sessions']['Row'];

/** Mappe une ligne SQL `game_sessions` vers l'entité `GameSession` de l'application. */
export function rowToSession(row: GameSessionRow): GameSession {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    lastActiveAt: row.last_active_at,
    // `ended_reason` est contraint à l'ensemble fermé côté base (check) ; on le
    // transtype sans revalider (la colonne est la source de vérité).
    endedReason: (row.ended_reason as SessionEndReason | null) ?? null,
  };
}

/**
 * Démarre une session pour la campagne (écriture DIRECTE, MJ propriétaire — RLS 0012).
 * Renvoie la session créée. **Idempotent en pratique** : si une session active existe
 * déjà (course entre onglets), l'index partiel unique rejette l'insert (`23505`) et on
 * retombe sur la session active existante plutôt que de lever — au plus une active par
 * campagne, garanti à la fois par l'index et par cette gestion côté écriture.
 */
export async function startSession(campaignId: string): Promise<GameSession> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({ campaign_id: campaignId })
    .select('*')
    .single();
  if (error) {
    // Violation d'unicité (index partiel `one_active_per_campaign`) → une session est
    // déjà active : on la renvoie au lieu d'échouer.
    if (error.code === '23505') {
      const existing = await resolveActiveSession(campaignId);
      if (existing) return existing;
    }
    throw error;
  }
  return rowToSession(data);
}

/**
 * Termine la session active de la campagne (filet explicite MJ → `ended_reason = 'gm'`).
 * Écriture DIRECTE (RLS MJ). No-op si aucune session active (`where ended_at is null`).
 */
export async function endSession(campaignId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase
    .from('game_sessions')
    .update({ ended_at: new Date().toISOString(), ended_reason: 'gm' })
    .eq('campaign_id', campaignId)
    .is('ended_at', null);
  if (error) throw error;
}

/**
 * **Le gate.** Renvoie la session ACTIVE de la campagne, ou `null` s'il n'y en a pas.
 * Applique d'abord la **fermeture paresseuse** côté serveur (RPC 0013) : une session
 * périmée (> 5 min sans battement → `empty`) ou trop vieille (> 12 h → `expired`) est
 * close et considérée comme absente. C'est le « prochain client qui charge et clôt
 * lui-même » — aucun cron. Membre-appelable (joueur inclus).
 */
export async function resolveActiveSession(campaignId: string): Promise<GameSession | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc('resolve_active_session', { cid: campaignId });
  if (error) throw error;
  const rows = (data ?? []) as GameSessionRow[];
  return rows.length > 0 ? rowToSession(rows[0]) : null;
}

/**
 * Battement basse fréquence : rafraîchit `last_active_at` de la session active
 * (RPC 0013, membre-appelable). Alimente le filet « vide ». No-op serveur si aucune
 * session active. Appelé ~2-3 min par tout présent (cf. `useActiveSession`).
 */
export async function touchSession(campaignId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.rpc('touch_game_session', { cid: campaignId });
  if (error) throw error;
}
