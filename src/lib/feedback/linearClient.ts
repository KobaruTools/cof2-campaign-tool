import type { FeedbackIssuePayload, FeedbackLabelId } from './buildFeedbackIssue';

/** Équipe Perso (COF2), voir PER-462. */
const TEAM_ID = '61a44dcb-8d5b-4dea-bb37-b97c936746b0';
/** Statut Triage de l'équipe Perso. */
const TRIAGE_STATE_ID = '895f4308-868e-47bb-9e7e-294a378cc893';

const LABEL_IDS: Record<FeedbackLabelId, string> = {
  bug: '3871021b-53da-403b-8014-80d73a54ccd6',
  'rule-error': '923a9fc0-2799-41ec-9cc5-4b69f7790d19',
  feature: '0f3e8ccc-0639-4375-8610-266a4103d461',
  'retour-joueur': '0685039a-7380-476e-b6db-480ee685ca2e',
};

const CREATE_ISSUE_MUTATION = `
  mutation CreateFeedbackIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { id url }
    }
  }
`;

export interface CreatedLinearIssue {
  id: string;
  url: string;
}

/**
 * Crée le ticket Linear correspondant à un retour utilisateur (PER-463).
 * Résout les labels symboliques de `buildFeedbackIssue` vers les vrais IDs
 * Linear de l'équipe Perso.
 */
export async function createLinearIssue(
  payload: FeedbackIssuePayload,
): Promise<CreatedLinearIssue> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error('LINEAR_API_KEY manquante');
  }

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      query: CREATE_ISSUE_MUTATION,
      variables: {
        input: {
          teamId: TEAM_ID,
          stateId: TRIAGE_STATE_ID,
          title: payload.title,
          description: payload.description,
          labelIds: payload.labelIds.map((id) => LABEL_IDS[id]),
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Linear a répondu ${response.status}`);
  }

  const body = (await response.json()) as {
    data?: { issueCreate?: { success: boolean; issue: CreatedLinearIssue | null } };
    errors?: unknown;
  };

  const result = body.data?.issueCreate;
  if (!result?.success || !result.issue) {
    throw new Error('Échec de création du ticket Linear');
  }

  return result.issue;
}
