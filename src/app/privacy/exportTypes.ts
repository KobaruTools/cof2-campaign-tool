/**
 * Types et constantes de l'export de données personnelles (RGPD), séparés de
 * `actions.ts` : un fichier `'use server'` ne peut exporter que des fonctions
 * async (cf. https://nextjs.org/docs/messages/invalid-use-server-value), donc
 * l'objet `EXPORT_ERRORS` et les interfaces vivent ici.
 */
import type { Tables } from '@/lib/supabase/types';

/** Une identité liée (provider OAuth ou lien magique), aplatie pour l'export. */
export interface ExportedIdentity {
  provider: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
}

/** Instantané complet des données d'un utilisateur, sérialisable en JSON. */
export interface DataExport {
  /** Horodatage de génération (ISO 8601). */
  exportedAt: string;
  account: {
    id: string;
    email: string | null;
    displayName: string | null;
    identities: ExportedIdentity[];
    createdAt: string | null;
    lastSignInAt: string | null;
  };
  campaigns: Tables<'campaigns'>[];
  players: Tables<'players'>[];
  characters: Tables<'characters'>[];
}

/**
 * Codes d'erreur (message de l'`Error` levée) que le client sait reconnaître pour
 * réagir sans ambiguïté (redirection connexion, message dédié). Anglais côté code.
 */
export const EXPORT_ERRORS = {
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  PLAYER_SESSION: 'PLAYER_SESSION',
} as const;
