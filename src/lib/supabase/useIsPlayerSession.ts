'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabaseClient } from './client';

/**
 * Indique si la session courante est une session **joueur** (utilisateur anonyme
 * du lien magique, PER-191, portant `app_metadata.player_id`) plutôt qu'un MJ.
 *
 * Usage **cosmétique** uniquement (PER-196) : masquer des contrôles MJ qui seraient
 * inopérants pour un joueur (ex. sélecteurs d'attribution campagne/joueur, gelés par
 * le trigger). La sécurité réelle reste portée par la RLS/trigger Supabase. Lit la
 * session locale (`getSession`, sans aller-retour réseau). Renvoie `false` tant que
 * la session n'est pas résolue, ou hors mode cloud (Supabase non configuré).
 */
export function useIsPlayerSession(): boolean {
  const [isPlayer, setIsPlayer] = useState(false);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      return;
    }
    let active = true;
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const pid = (data.session?.user?.app_metadata as { player_id?: string } | undefined)
        ?.player_id;
      setIsPlayer(Boolean(pid));
    });
    return () => {
      active = false;
    };
  }, []);

  return isPlayer;
}
