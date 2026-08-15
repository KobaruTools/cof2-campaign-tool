/**
 * Recap MJ partagé par partie (PER-407, migration 0027) — texte libre écrit par
 * le MJ, PRIVÉ par défaut, publiable aux joueurs de la campagne via
 * `visibleToPlayers`. Système séparé des notes perso joueur
 * (`character_session_notes`) : la RLS de `game_session_recaps` fait tout le
 * travail de filtrage — un joueur qui interroge cette table ne reçoit QUE les
 * recaps publiés, jamais besoin de vérifier `visibleToPlayers` côté client
 * avant affichage.
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type RecapRow = Database['public']['Tables']['game_session_recaps']['Row'];

export interface SessionRecap {
  sessionId: string;
  content: string;
  visibleToPlayers: boolean;
}

function rowToRecap(row: RecapRow): SessionRecap {
  return { sessionId: row.session_id, content: row.content, visibleToPlayers: row.visible_to_players };
}

/**
 * Charge les recaps des sessions données. La RLS ne renvoie, pour un joueur,
 * que les lignes publiées (`visibleToPlayers: true`) — l'absence d'entrée
 * pour une session veut dire soit « pas encore rédigé », soit « MJ seul ».
 */
export async function fetchSessionRecaps(sessionIds: string[]): Promise<Map<string, SessionRecap>> {
  if (sessionIds.length === 0) return new Map();
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('game_session_recaps')
    .select('*')
    .in('session_id', sessionIds);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.session_id, rowToRecap(row)]));
}

/**
 * Crée ou met à jour le recap d'une session — MJ propriétaire de la campagne
 * uniquement (RLS `game_session_recaps_owner_write`). Ne touche que les champs
 * fournis dans `patch` (upsert partiel : la colonne absente du payload garde
 * sa valeur existante côté base, ou son défaut à la création).
 */
export async function upsertSessionRecap(
  sessionId: string,
  patch: Partial<Pick<SessionRecap, 'content' | 'visibleToPlayers'>>,
): Promise<SessionRecap> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('game_session_recaps')
    .upsert(
      {
        session_id: sessionId,
        ...(patch.content !== undefined && { content: patch.content }),
        ...(patch.visibleToPlayers !== undefined && { visible_to_players: patch.visibleToPlayers }),
      },
      { onConflict: 'session_id' },
    )
    .select()
    .single();
  if (error) throw error;
  return rowToRecap(data);
}
