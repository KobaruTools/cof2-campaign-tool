import { createBrowserClient } from '@supabase/ssr';

import type { Database } from './types';

/**
 * Fabrique du client Supabase **navigateur** (composants clients « use client »).
 * PER-187. La session est gérée par cookies (partagée avec le client serveur via
 * `@supabase/ssr`). N'utilise que la clé **publishable** publique (`sb_publishable_…`,
 * nomenclature Supabase 2025, ex-`anon`) — jamais la clé secrète.
 *
 * À appeler dans un composant client ; ne pas mémoriser globalement le retour
 * dans un module partagé serveur (le client navigateur est destiné au navigateur).
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
