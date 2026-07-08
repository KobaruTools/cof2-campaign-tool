'use client';

import { useEffect, useState } from 'react';

import { createBrowserSupabaseClient } from './client';

export interface PlayerSession {
  /** `true` si la session courante est une session joueur (claim `player_id`). */
  isPlayer: boolean;
  /** L'id du joueur de la session, ou `null` (MJ, ou session non encore résolue). */
  playerId: string | null;
}

/**
 * Renvoie l'identité de session **joueur** (utilisateur anonyme du lien magique,
 * PER-191, portant `app_metadata.player_id`) : `isPlayer` + `playerId`.
 *
 * Usage **cosmétique** (PER-196) : masquer des contrôles MJ inopérants pour un
 * joueur (sélecteurs d'attribution, gelés par le trigger) et passer une fiche qui
 * n'est pas la sienne en **lecture seule**. La sécurité réelle reste portée par la
 * RLS/trigger Supabase. Lit la session locale (`getSession`, sans aller-retour
 * réseau). `{ isPlayer: false, playerId: null }` tant que non résolu ou hors cloud.
 */
export function useIsPlayerSession(): PlayerSession {
  const [session, setSession] = useState<PlayerSession>({ isPlayer: false, playerId: null });

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
      const pid =
        (data.session?.user?.app_metadata as { player_id?: string } | undefined)?.player_id ??
        null;
      setSession({ isPlayer: Boolean(pid), playerId: pid });
    });
    return () => {
      active = false;
    };
  }, []);

  return session;
}
