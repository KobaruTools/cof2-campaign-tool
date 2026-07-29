/**
 * Accès aux données « état de combat partagé » côté cloud (PER-267, milestone PER-259)
 * — via le client Supabase **navigateur**. Seul point de contact entre le store
 * `campaignCombat` et la table `public.campaign_combat` (migration 0012).
 *
 * Portée CAMPAGNE : une seule ligne par campagne (PK `campaign_id`), qui persiste entre
 * les sessions (le MJ prépare ses rencontres à l'avance). **MJ seul auteur** → écriture
 * DIRECTE (pas de RPC de merge) : la RLS de 0012 réserve l'écriture au MJ propriétaire et
 * ouvre la lecture aux membres. Un joueur qui tenterait d'écrire est refusé côté serveur
 * (42501) — le store ignore silencieusement l'échec (lecture seule côté joueur).
 *
 * Les fonctions **lèvent** en cas d'erreur Supabase (le store les capte). Le blob `state`
 * est relu défensivement par `reviveStateObject` (fonction pure, testée) : la colonne est
 * la source de vérité mais peut contenir un ancien format (migration douce des bandits).
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';
import { reviveStateObject, type GmCombatState } from './combatState';

/**
 * Lit l'état de combat de la campagne, ou `null` si aucune ligne n'existe encore
 * (jamais préparé de combat côté cloud → l'appelant décidera d'ensemencer depuis le
 * `localStorage` legacy). **Lève** en cas d'erreur Supabase autre que « ligne absente ».
 */
export async function fetchCampaignCombat(campaignId: string): Promise<GmCombatState | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('campaign_combat')
    .select('state')
    .eq('campaign_id', campaignId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return reviveStateObject(data.state);
}

/**
 * Écrit (upsert par `campaign_id`) l'état de combat absolu de la campagne. Écriture
 * DIRECTE réservée au MJ propriétaire (RLS 0012). **Lève** en cas d'erreur Supabase.
 */
export async function upsertCampaignCombat(
  campaignId: string,
  state: GmCombatState,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase
    .from('campaign_combat')
    .upsert(
      { campaign_id: campaignId, state: state as unknown as Json },
      { onConflict: 'campaign_id' },
    );
  if (error) throw error;
}
