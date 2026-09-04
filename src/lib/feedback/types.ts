/**
 * Retour utilisateur (bug / erreur de règle / idée), envoyé depuis le
 * formulaire intégré à l'application et transformé en ticket Linear
 * (équipe Perso, statut Triage). PER-463.
 */
export type FeedbackKind = 'bug' | 'rule-error' | 'idea';

export type FeedbackZone =
  | 'character-sheet'
  | 'creation-level-up'
  | 'codex'
  | 'bestiary'
  | 'gm-screen'
  | 'campaign'
  | 'reference-sheet'
  | 'account'
  | 'other';

export interface FeedbackInput {
  kind: FeedbackKind;
  zone: FeedbackZone;
  description: string;
}

/** Contexte technique capturé automatiquement (PER-463 §3), jamais saisi par le joueur. */
export interface FeedbackTechnicalContext {
  path: string;
  commitSha: string | null;
  userAgent: string | null;
  reporter: string;
}
