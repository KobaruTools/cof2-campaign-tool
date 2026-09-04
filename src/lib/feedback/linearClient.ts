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

const FILE_UPLOAD_MUTATION = `
  mutation FeedbackFileUpload($contentType: String!, $filename: String!, $size: Int!) {
    fileUpload(contentType: $contentType, filename: $filename, size: $size) {
      success
      uploadFile {
        uploadUrl
        assetUrl
        headers { key value }
      }
    }
  }
`;

const ATTACHMENT_CREATE_MUTATION = `
  mutation FeedbackAttachmentCreate($input: AttachmentCreateInput!) {
    attachmentCreate(input: $input) {
      success
    }
  }
`;

export interface CreatedLinearIssue {
  id: string;
  url: string;
}

/** Fichier à joindre à un ticket (screenshot ou export JSON de personnage), PER-464. */
export interface FeedbackFile {
  filename: string;
  contentType: string;
  content: ArrayBuffer;
}

function requireApiKey(): string {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error('LINEAR_API_KEY manquante');
  }
  return apiKey;
}

async function callLinearGraphQL<T>(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear a répondu ${response.status}`);
  }

  return (await response.json()) as T;
}

/**
 * Crée le ticket Linear correspondant à un retour utilisateur (PER-463).
 * Résout les labels symboliques de `buildFeedbackIssue` vers les vrais IDs
 * Linear de l'équipe Perso.
 */
export async function createLinearIssue(
  payload: FeedbackIssuePayload,
): Promise<CreatedLinearIssue> {
  const apiKey = requireApiKey();

  const body = await callLinearGraphQL<{
    data?: { issueCreate?: { success: boolean; issue: CreatedLinearIssue | null } };
  }>(apiKey, CREATE_ISSUE_MUTATION, {
    input: {
      teamId: TEAM_ID,
      stateId: TRIAGE_STATE_ID,
      title: payload.title,
      description: payload.description,
      labelIds: payload.labelIds.map((id) => LABEL_IDS[id]),
    },
  });

  const result = body.data?.issueCreate;
  if (!result?.success || !result.issue) {
    throw new Error('Échec de création du ticket Linear');
  }

  return result.issue;
}

/**
 * Upload un fichier vers l'infrastructure Linear (URL signée obtenue via
 * `fileUpload`, puis PUT direct) et le rattache au ticket via
 * `attachmentCreate` (PER-464).
 */
export async function attachFileToIssue(issueId: string, file: FeedbackFile): Promise<void> {
  const apiKey = requireApiKey();

  const uploadBody = await callLinearGraphQL<{
    data?: {
      fileUpload?: {
        success: boolean;
        uploadFile: {
          uploadUrl: string;
          assetUrl: string;
          headers: { key: string; value: string }[];
        } | null;
      };
    };
  }>(apiKey, FILE_UPLOAD_MUTATION, {
    contentType: file.contentType,
    filename: file.filename,
    size: file.content.byteLength,
  });

  const uploadFile = uploadBody.data?.fileUpload;
  if (!uploadFile?.success || !uploadFile.uploadFile) {
    throw new Error("Échec de l'obtention de l'URL d'upload Linear");
  }
  const { uploadUrl, assetUrl, headers } = uploadFile.uploadFile;

  const putResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: Object.fromEntries(headers.map((h) => [h.key, h.value])),
    body: file.content,
  });
  if (!putResponse.ok) {
    throw new Error(`Upload du fichier vers Linear a répondu ${putResponse.status}`);
  }

  const attachBody = await callLinearGraphQL<{
    data?: { attachmentCreate?: { success: boolean } };
  }>(apiKey, ATTACHMENT_CREATE_MUTATION, {
    input: { issueId, url: assetUrl, title: file.filename },
  });

  if (!attachBody.data?.attachmentCreate?.success) {
    throw new Error('Échec du rattachement du fichier au ticket Linear');
  }
}
