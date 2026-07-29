/**
 * Écriture du JOURNAL de présence `game_session_participants` (PER-265) via le client
 * Supabase **navigateur**. La RLS de 0012 réserve la lecture aux membres et n'autorise
 * AUCUNE écriture directe → on passe par les deux RPC `security definer` de la
 * migration 0014, gatées `is_campaign_member`, avec l'identité (`player_id`) dérivée
 * du JWT côté serveur (jamais fournie par le client).
 *
 * Best-effort : ces écritures alimentent l'historique de session (consommé plus tard
 * par PER-270) mais ne sont pas critiques au direct — la PRÉSENCE live passe par
 * Realtime Presence, pas par cette table. L'appelant (le hook `useSessionChannel`)
 * ignore silencieusement les échecs.
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

/**
 * Journalise l'entrée du client dans la session active de la campagne. Renvoie l'id
 * de l'entrée créée (à réutiliser pour la fermer), ou `null` s'il n'y a pas de session
 * active (course entre le gate et l'entrée). **Lève** en cas d'erreur Supabase.
 */
export async function joinSessionParticipant(campaignId: string): Promise<string | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc('session_participant_join', { cid: campaignId });
  if (error) throw error;
  return data ?? null;
}

/**
 * Ferme l'entrée de présence (`left_at = now()`). Idempotent côté serveur (une entrée
 * déjà fermée ou d'une autre table est un no-op). **Lève** en cas d'erreur Supabase.
 */
export async function leaveSessionParticipant(participantId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.rpc('session_participant_leave', {
    participant_id: participantId,
  });
  if (error) throw error;
}
