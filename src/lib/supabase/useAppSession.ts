'use client';

import { useEffect, useState } from 'react';

import { roleOfUser, type SessionRole } from '@/lib/auth/sessionRole';
import { displayNameOf } from '@/lib/auth/displayName';
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
  });

  useEffect(() => {
    if (!IS_CONFIGURED) return;
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data: { session: authSession } }) => {
      if (cancelled) return;
      const user = authSession?.user ?? null;
      const role = roleOfUser(user);
      setSession({
        role,
        resolved: true,
        displayName: user && role === 'owner' ? displayNameOf(user) : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}
