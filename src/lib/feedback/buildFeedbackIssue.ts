import type { FeedbackInput, FeedbackKind, FeedbackTechnicalContext } from './types';

/** Labels symboliques, résolus vers les vrais IDs Linear par `linearClient`. */
export type FeedbackLabelId = 'bug' | 'rule-error' | 'feature' | 'retour-joueur';

export interface FeedbackIssuePayload {
  title: string;
  description: string;
  labelIds: FeedbackLabelId[];
}

const KIND_PREFIX: Record<FeedbackKind, string> = {
  bug: '[Bug]',
  'rule-error': '[Erreur de règle]',
  idea: '[Idée]',
};

const KIND_LABEL: Record<FeedbackKind, FeedbackLabelId> = {
  bug: 'bug',
  'rule-error': 'rule-error',
  idea: 'feature',
};

const ZONE_LABEL: Record<FeedbackInput['zone'], string> = {
  'character-sheet': 'Fiche perso',
  'creation-level-up': 'Création/Montée',
  codex: 'Codex',
  bestiary: 'Bestiaire',
  'gm-screen': 'Écran MJ',
  campaign: 'Campagne',
  'reference-sheet': 'Aide-mémoire',
  account: 'Compte',
  other: 'Autre',
};

/**
 * Construit le titre/description/labels du ticket Linear depuis un retour
 * utilisateur — pure, sans appel réseau (PER-463).
 */
export function buildFeedbackIssue(
  input: FeedbackInput,
  context: FeedbackTechnicalContext,
): FeedbackIssuePayload {
  const title = `${KIND_PREFIX[input.kind]} ${input.description.slice(0, 80)}`;

  const description = [
    `**Zone :** ${ZONE_LABEL[input.zone]}`,
    '',
    input.description,
    '',
    '---',
    `Page : ${context.path}`,
    `Commit : ${context.commitSha ?? 'inconnu'}`,
    `Navigateur : ${context.userAgent ?? 'inconnu'}`,
    `Signalé par : ${context.reporter}`,
  ].join('\n');

  return {
    title,
    description,
    labelIds: [KIND_LABEL[input.kind], 'retour-joueur'],
  };
}
