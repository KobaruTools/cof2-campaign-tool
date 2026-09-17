'use client';

import { useEffect, useState } from 'react';

import { roleOfUser, type SessionRole } from '@/lib/auth/sessionRole';
import { displayNameOf } from '@/lib/auth/displayName';
import { hasOwnedCampaigns } from '@/lib/auth/ownedCampaigns';
import { createBrowserSupabaseClient } from './client';

const IS_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export interface AppSession {
  /** Rôle de la session courante (cf. `SessionRole`). */
  role: SessionRole;
  /**
   * `true` dès que la session locale a été lue — ou immédiatement quand Supabase
   * n'est pas configuré (mode 100 % local, sans gating). Tant que c'est `false`,
   * `role` vaut l'hypothèse optimiste `owner` : c'est le cas dominant (l'app
   * n'est pas un site public), donc l'en-tête ne clignote pas au montage. Les
   * composants qui ne DOIVENT rien montrer avant résolution (menu compte,
   * bouton de connexion) testent ce drapeau.
   */
  resolved: boolean;
  /** Nom d'affichage du propriétaire, `null` pour tout autre rôle. */
  displayName: string | null;
  /**
   * `true` quand un compte porteur du claim `player_id` (`role === 'player'`)
   * possède PAR AILLEURS des campagnes (PER-538) — il garde alors l'UI
   * propriétaire en plus de son espace joueur. Toujours `false` pour les
   * autres rôles (jamais vérifié, pour ne pas ajouter de requête inutile).
   */
  ownsCampaigns: boolean;
  /**
   * `auth.uid()` de la session courante, `null` tant qu'elle n'est pas résolue
   * (ou en mode 100 % local). Sert à comparer à `Campaign.ownerId` (cf.
   * `useResolvedCampaign`) : la RLS `campaigns_player_read` (migration 0043)
   * élargit désormais la lecture aux campagnes dont l'utilisateur n'est que
   * membre, donc une simple résolution non-null ne suffit plus à prouver la
   * propriété.
   */
  userId: string | null;
}

/**
 * Session applicative côté client : rôle + nom d'affichage.
 *
 * Usage **cosmétique** (comme `useIsPlayerSession`) : adapter la navigation et les
 * appels à l'action au rôle. La sécurité réelle reste portée par le proxy
 * (`decideRouteAccess`) et la RLS Supabase.
 *
 * Lit `getSession()` — la session en cache local, AUCUN aller-retour réseau (à la
 * différence de `getUser()`, qui revalide via GoTrue à chaque page). On ne fait ici
 * qu'afficher des libellés et choisir des liens : la revalidation n'apporterait rien.
 */
export function useAppSession(): AppSession {
  const [session, setSession] = useState<AppSession>({
    role: 'owner',
    resolved: !IS_CONFIGURED,
    displayName: null,
    ownsCampaigns: false,
    userId: null,
  });

  useEffect(() => {
    if (!IS_CONFIGURED) return;
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(async ({ data: { session: authSession } }) => {
      const user = authSession?.user ?? null;
      const role = roleOfUser(user);
      // Requête supplémentaire seulement pour un joueur — jamais pour
      // owner/anonymous/projection (cas dominants).
      const ownsCampaigns =
        role === 'player' && user ? await hasOwnedCampaigns(supabase, user.id) : false;
      if (cancelled) return;
      setSession({
        role,
        resolved: true,
        displayName: user && role === 'owner' ? displayNameOf(user) : null,
        ownsCampaigns,
        userId: user?.id ?? null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}
