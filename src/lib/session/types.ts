/**
 * Modèle de données « Session de table synchronisée » (PER-264, milestone PER-259)
 * — reflet de la table cloud `public.game_sessions` (Supabase). Une session est un
 * **phénomène temporaire** : quand une campagne est « en session », les tickets
 * suivants (PER-265+) ouvrent le canal temps réel ; hors session, rien ne change.
 *
 * La session ACTIVE d'une campagne = la ligne `ended_at IS NULL` (au plus une, garantie
 * par l'index partiel unique de la migration 0012). C'est *elle* le gate d'abonnement.
 * Ce ticket ne fait que le cycle de vie (démarrer/terminer/gate/fermeture paresseuse) ;
 * aucune synchro de données ici.
 */

/**
 * Raison de fin d'une session (colonne `ended_reason`, cohérente avec `ended_at`).
 * - `gm`      : fin explicite déclenchée par le MJ (bouton « Terminer »).
 * - `empty`   : filet « vide » — plus aucun battement depuis > 5 min (fermeture paresseuse).
 * - `expired` : filet « plafond dur » — `startedAt` dépasse 12 h (fermeture paresseuse).
 */
export type SessionEndReason = 'gm' | 'empty' | 'expired';

/** Entité applicative d'une session de table (reflet camelCase de la ligne SQL). */
export interface GameSession {
  id: string;
  campaignId: string;
  /** Horodatage de démarrage (ISO). Sert le filet « plafond 12 h ». */
  startedAt: string;
  /** `null` tant que la session est ACTIVE ; renseigné à la fermeture. */
  endedAt: string | null;
  /** Battement basse fréquence (ISO), rafraîchi par tout présent. Sert le filet « vide ». */
  lastActiveAt: string;
  /** Raison de fin, ou `null` tant que la session est active. */
  endedReason: SessionEndReason | null;
}
