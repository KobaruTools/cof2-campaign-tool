import { NextResponse, type NextRequest } from 'next/server';

import { displayNameOf } from '@/lib/auth/displayName';
import { roleOfUser } from '@/lib/auth/sessionRole';
import { buildFeedbackIssue } from '@/lib/feedback/buildFeedbackIssue';
import { attachFileToIssue, createLinearIssue, type FeedbackFile } from '@/lib/feedback/linearClient';
import {
  FEEDBACK_KINDS,
  FEEDBACK_ZONES,
  type FeedbackInput,
  type FeedbackKind,
  type FeedbackZone,
} from '@/lib/feedback/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface FeedbackRequestBody extends FeedbackInput {
  /** Route/page courante côté client (le serveur ne voit que `/api/feedback`). */
  path: string;
}

function parseBody(body: unknown): FeedbackRequestBody | null {
  if (typeof body !== 'object' || body === null) return null;
  const { kind, zone, description, path } = body as Record<string, unknown>;
  if (typeof kind !== 'string' || !FEEDBACK_KINDS.includes(kind as FeedbackKind)) return null;
  if (typeof zone !== 'string' || !FEEDBACK_ZONES.includes(zone as FeedbackZone)) return null;
  if (typeof description !== 'string' || description.trim() === '') return null;
  if (typeof path !== 'string' || path.trim() === '') return null;
  return { kind: kind as FeedbackKind, zone: zone as FeedbackZone, description, path };
}

/**
 * Parse le corps de la requête, en JSON (texte seul) ou en `multipart/form-data`
 * (avec pièces jointes : screenshots + export JSON de personnage, PER-464).
 */
async function parseRequest(
  request: NextRequest,
): Promise<{ body: FeedbackRequestBody; files: FeedbackFile[] } | null> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData().catch(() => null);
    if (!form) return null;
    const body = parseBody({
      kind: form.get('kind'),
      zone: form.get('zone'),
      description: form.get('description'),
      path: form.get('path'),
    });
    if (!body) return null;

    const files: FeedbackFile[] = [];
    for (const entry of form.getAll('files')) {
      if (entry instanceof File) {
        files.push({
          filename: entry.name,
          contentType: entry.type || 'application/octet-stream',
          content: await entry.arrayBuffer(),
        });
      }
    }
    return { body, files };
  }

  const body = parseBody(await request.json().catch(() => null));
  return body ? { body, files: [] } : null;
}

/**
 * Crée un ticket Linear (équipe Perso, Triage) depuis le formulaire de retour
 * intégré à l'application. Réservé aux sessions owner/player — pas de
 * visiteur anonyme, pas d'observateur de projection (PER-463).
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = roleOfUser(user);
  if (role === 'anonymous' || role === 'projection') {
    return NextResponse.json({ error: 'Session requise' }, { status: 401 });
  }

  const parsed = await parseRequest(request);
  if (!parsed) {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
  }
  const { body, files } = parsed;

  const issuePayload = buildFeedbackIssue(
    { kind: body.kind, zone: body.zone, description: body.description },
    {
      path: body.path,
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      userAgent: request.headers.get('user-agent'),
      reporter: displayNameOf(user!),
    },
  );

  try {
    const issue = await createLinearIssue(issuePayload);
    // Best-effort : le ticket est déjà créé, un échec d'upload isolé ne doit pas
    // faire échouer toute la requête (PER-464).
    await Promise.allSettled(files.map((file) => attachFileToIssue(issue.id, file)));

    // Best-effort également (PER-510) : le ticket existe déjà côté Linear, ne
    // pas faire échouer la requête si le suivi du soumetteur ne s'enregistre
    // pas (RLS de la migration 0044 : owner_user_id XOR player_id).
    const submitter =
      role === 'player'
        ? { player_id: (user!.app_metadata.player_id as string | undefined) ?? null }
        : { owner_user_id: user!.id };
    const { error: submissionError } = await supabase.from('feedback_submissions').insert({
      ...submitter,
      linear_issue_id: issue.id,
      linear_issue_url: issue.url,
    });
    if (submissionError) {
      console.error('Échec de l’enregistrement du suivi feedback_submissions', submissionError);
    }

    return NextResponse.json({ url: issue.url });
  } catch {
    return NextResponse.json({ error: 'Échec de création du ticket' }, { status: 502 });
  }
}
