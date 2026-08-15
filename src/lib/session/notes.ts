/**
 * Notes de session MJ, prises EN COURS de partie (PER-427, migration 0028) —
 * texte libre écrit par le MJ pendant que la partie se joue, TOUJOURS privé
 * (le MJ seul le lit, jamais les joueurs — pas de bascule de publication,
 * contrairement au recap `game_session_recaps`). Éditable uniquement tant
 * que la partie reste en cours (`ended_at is null`), la RLS le fait respecter
 * côté serveur.
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type NoteRow = Database['public']['Tables']['game_session_notes']['Row'];

export interface SessionNote {
  sessionId: string;
  content: string;
}

function rowToNote(row: NoteRow): SessionNote {
  return { sessionId: row.session_id, content: row.content };
}

/** Charge la note de la session donnée, ou `null` si le MJ n'a encore rien écrit. */
export async function fetchSessionNote(sessionId: string): Promise<SessionNote | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('game_session_notes')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToNote(data) : null;
}

/**
 * Crée ou met à jour la note d'une session — MJ propriétaire de la campagne
 * uniquement, et seulement tant que la partie reste en cours (RLS
 * `game_session_notes_insert`/`game_session_notes_update`).
 */
export async function upsertSessionNote(sessionId: string, content: string): Promise<SessionNote> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('game_session_notes')
    .upsert({ session_id: sessionId, content }, { onConflict: 'session_id' })
    .select()
    .single();
  if (error) throw error;
  return rowToNote(data);
}
