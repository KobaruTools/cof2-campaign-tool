import { NextResponse, type NextRequest } from 'next/server';

import { displayNameOf } from '@/lib/auth/displayName';
import { roleOfUser } from '@/lib/auth/sessionRole';
import { buildFeedbackIssue } from '@/lib/feedback/buildFeedbackIssue';
import { createLinearIssue } from '@/lib/feedback/linearClient';
import type { FeedbackInput, FeedbackKind, FeedbackZone } from '@/lib/feedback/types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const FEEDBACK_KINDS: FeedbackKind[] = ['bug', 'rule-error', 'idea'];
const FEEDBACK_ZONES: FeedbackZone[] = [
  'character-sheet',
  'creation-level-up',
  'codex',
  'bestiary',
  'gm-screen',
  'campaign',
  'reference-sheet',
  'account',
  'other',
];

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

  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
  }

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
    return NextResponse.json({ url: issue.url });
  } catch {
    return NextResponse.json({ error: 'Échec de création du ticket' }, { status: 502 });
  }
}
