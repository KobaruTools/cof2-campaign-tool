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
