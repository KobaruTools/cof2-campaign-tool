import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/types';

/**
 * Une identité possède-t-elle au moins une campagne (`campaigns.owner_id`) ?
 *
 * Utilisé pour reconnaître un compte réel déjà propriétaire de campagnes qui a
 * PAR AILLEURS rejoint une autre campagne comme joueur (claim `player_id`,
 * PER-191/502) : `roleOfUser` seul ne peut pas le voir, ce claim écrasant le
 * rôle affiché (PER-538, cf. `docs/adr/0005-player-role-can-shadow-owner-role.md`).
 *
 * S'appuie sur la RLS propriétaire (`owner_id = auth.uid()`, migration 0001) :
 * n'importe quel client Supabase authentifié suffit, pas besoin du client admin.
 */
export async function hasOwnedCampaigns(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase.from('campaigns').select('id').eq('owner_id', userId).limit(1);
  return (data?.length ?? 0) > 0;
}
