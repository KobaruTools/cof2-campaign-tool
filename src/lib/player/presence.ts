'use server';

/**
 * Heartbeat de présence joueur (PER-195). Signale au MJ que le joueur est actif
 * (« en ligne » / « actif il y a X » dans la vue campagne). Server Action appelée
 * périodiquement par l'espace joueur (`usePresenceHeartbeat`).
 *
 * L'écriture passe par la fonction `touch_player_presence` (`security definer`,
 * migration 0005) : le joueur n'a aucun droit d'écrire `players` (RLS), mais la
 * fonction contourne cette RLS en bornant la mise à jour à `current_player_id()`
 * (claim du JWT) — un joueur ne peut donc rafraîchir que SA propre présence, et un
 * appelant non-joueur (MJ) est un no-op.
 *
 * Best-effort : la présence n'est pas critique ; un échec ne remonte pas à l'UI.
 */
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function touchPlayerPresence(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.rpc('touch_player_presence');
}
