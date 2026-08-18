/**
 * Notes de session PERSO du joueur, prises EN COURS de partie (PER-414,
 * migration 0026) — une note par (personnage, partie), écrite par le joueur
 * sur SA fiche ou par le MJ propriétaire de la fiche. Distinct des notes MJ
 * (`src/lib/session/notes.ts`, PER-427, MJ seul) et du recap partagé
 * (`recap.ts`, PER-407, publiable). Éditable tant que la partie reste en
 * cours (`ended_at is null`), la RLS le fait respecter côté serveur ; une
 * fois la partie close la note reste lisible en journal personnel.
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type NoteRow = Database['public']['Tables']['character_session_notes']['Row'];

export interface CharacterSessionNote {
  characterId: string;
  sessionId: string;
  content: string;
}

function rowToNote(row: NoteRow): CharacterSessionNote {
  return { characterId: row.character_id, sessionId: row.session_id, content: row.content };
}

/** Charge la note du personnage pour la session donnée, ou `null` si rien n'a encore été écrit. */
export async function fetchCharacterSessionNote(
  characterId: string,
  sessionId: string,
): Promise<CharacterSessionNote | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('character_session_notes')
    .select('*')
    .eq('character_id', characterId)
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToNote(data) : null;
}

/**
 * Charge en un aller-retour les notes d'un personnage pour plusieurs parties (PER-416,
 * drawer historique) — évite le N+1 de `fetchCharacterSessionNote` appelée par entrée.
 * Absence de ligne pour une partie = pas encore écrit, à distinguer côté appelant.
 */
export async function fetchCharacterSessionNotesForSessions(
  characterId: string,
  sessionIds: string[],
): Promise<Map<string, string>> {
  if (sessionIds.length === 0) return new Map();
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('character_session_notes')
    .select('session_id, content')
    .eq('character_id', characterId)
    .in('session_id', sessionIds);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.session_id, row.content]));
}

/**
 * Crée ou met à jour la note d'un personnage pour une session — joueur sur SA
 * fiche ou MJ propriétaire de la fiche, et seulement tant que la partie reste
 * en cours (RLS `character_session_notes_insert`/`character_session_notes_update`).
 */
export async function upsertCharacterSessionNote(
  characterId: string,
  sessionId: string,
  content: string,
): Promise<CharacterSessionNote> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('character_session_notes')
    .upsert(
      { character_id: characterId, session_id: sessionId, content },
      { onConflict: 'character_id,session_id' },
    )
    .select()
    .single();
  if (error) throw error;
  return rowToNote(data);
}
