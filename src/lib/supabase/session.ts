'use client';

import { createBrowserSupabaseClient } from './client';

/**
 * Y a-t-il une session Supabase sur cet appareil (propriétaire OU joueur invité) ?
 *
 * Sert de garde aux stores AVANT toute lecture cloud. Depuis l'ouverture de l'atelier
 * de personnage aux visiteurs sans compte, `load()` peut être appelé sans session : il
 * ne faut alors PAS interroger la base — non par sécurité (la RLS s'en charge), mais
 * parce qu'une réponse VIDE serait indiscernable d'un cloud légitimement vide, et
 * déclencherait la purge des fantômes (PER-205) sur le cache local du visiteur.
 *
 * Lit `getSession()` : la session en cache local, aucun aller-retour réseau. Toute
 * erreur est traitée comme « pas de session » (garde fail-safe).
 *
 * Version NON-hook (les stores zustand ne peuvent pas consommer `useAppSession`).
 */
export async function hasSupabaseSession(): Promise<boolean> {
  try {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session !== null;
  } catch {
    return false;
  }
}
