/**
 * Historique des parties d'une campagne (PER-270) — lecture des sessions CLOSES
 * (`ended_at is not null`) et du journal de présence `game_session_participants`
 * (posés par la milestone PER-259, migrations 0012/0014).
 *
 * Le journal pose UNE ligne par ouverture de canal (onglet/reconnexion), pas par
 * personne (cf. commentaire de la migration 0014) : `buildSessionHistory` regroupe
 * ici, à l'affichage, par `player_id` (`null` = MJ) et cumule le temps de présence.
 * Une entrée jamais fermée (`left_at is null`, fermeture brutale de l'onglet) est
 * bornée à la fin de la session plutôt qu'ignorée.
 *
 * Fonction pure (`buildSessionHistory`) séparée de l'accès réseau (`fetchSessionHistory`)
 * pour rester testable sans mock Supabase, même patron que `rowToSession`.
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import type { SessionEndReason } from './types';

type GameSessionRow = Database['public']['Tables']['game_sessions']['Row'];
type ParticipantRow = Database['public']['Tables']['game_session_participants']['Row'];

/** Présence cumulée d'un participant sur une session (regroupée depuis le journal brut). */
export interface SessionParticipantSummary {
  /** `null` = MJ. */
  playerId: string | null;
  /** Nom affiché — nom du joueur, ou « MJ ». */
  name: string;
  /** Temps de présence cumulé sur la session, en millisecondes. */
  presenceMs: number;
  /** Nombre d'entrées du journal fusionnées (onglets/reconnexions). */
  entries: number;
}

/** Une partie close, prête à l'affichage. */
export interface SessionHistoryEntry {
  id: string;
  startedAt: string;
  endedAt: string;
  endedReason: SessionEndReason;
  durationMs: number;
  participants: SessionParticipantSummary[];
}

/**
 * Regroupe le journal brut de présence par session puis par participant, et calcule
 * les durées. Pure — aucun accès réseau, testable directement.
 */
export function buildSessionHistory(
  sessions: GameSessionRow[],
  participants: ParticipantRow[],
  playerNameById: Map<string, string>,
): SessionHistoryEntry[] {
  const participantsBySession = new Map<string, ParticipantRow[]>();
  for (const p of participants) {
    const bucket = participantsBySession.get(p.session_id);
    if (bucket) bucket.push(p);
    else participantsBySession.set(p.session_id, [p]);
  }

  return sessions
    .filter((s): s is GameSessionRow & { ended_at: string; ended_reason: string } =>
      s.ended_at != null && s.ended_reason != null,
    )
    .map((s) => {
      const endedAtMs = new Date(s.ended_at).getTime();
      const startedAtMs = new Date(s.started_at).getTime();

      const byParticipant = new Map<string | null, { presenceMs: number; entries: number }>();
      for (const row of participantsBySession.get(s.id) ?? []) {
        // Entrée jamais fermée (fermeture brutale de l'onglet) : bornée à la fin de
        // session plutôt qu'ignorée — on sait qu'elle était présente jusque là au plus.
        const leftAtMs = row.left_at ? new Date(row.left_at).getTime() : endedAtMs;
        const joinedAtMs = new Date(row.joined_at).getTime();
        const presenceMs = Math.max(0, Math.min(leftAtMs, endedAtMs) - joinedAtMs);

        const prev = byParticipant.get(row.player_id) ?? { presenceMs: 0, entries: 0 };
        byParticipant.set(row.player_id, {
          presenceMs: prev.presenceMs + presenceMs,
          entries: prev.entries + 1,
        });
      }

      const participantSummaries: SessionParticipantSummary[] = Array.from(
        byParticipant.entries(),
      )
        .map(([playerId, agg]) => ({
          playerId,
          name: playerId ? playerNameById.get(playerId) ?? 'Joueur inconnu' : 'MJ',
          presenceMs: agg.presenceMs,
          entries: agg.entries,
        }))
        // MJ d'abord, puis joueurs par nom.
        .sort((a, b) => {
          if (a.playerId === null) return -1;
          if (b.playerId === null) return 1;
          return a.name.localeCompare(b.name, 'fr');
        });

      return {
        id: s.id,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        endedReason: s.ended_reason as SessionEndReason,
        durationMs: Math.max(0, endedAtMs - startedAtMs),
        participants: participantSummaries,
      };
    })
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/**
 * Charge l'historique des parties CLOSES d'une campagne (RLS lecture membres,
 * migration 0012 — MJ et joueurs y ont également accès). `limit` borne le nombre de
 * parties les plus récentes (pas de pagination pour cette première version).
 *
 * `playerId` (PER-416, drawer historique d'UN personnage) restreint aux parties où CE
 * joueur a une trace dans `game_session_participants` (jointure par `player_id`, jamais
 * toute la campagne) — `null` = personnage pas encore assigné à un joueur, donc aucune
 * présence possible : historique vide sans requête supplémentaire. `undefined` (défaut)
 * = pas de filtre, comportement historique inchangé (vues MJ/joueur pleine campagne).
 */
export async function fetchSessionHistory(
  campaignId: string,
  opts: { limit?: number; playerId?: string | null } = {},
): Promise<SessionHistoryEntry[]> {
  const { limit = 20, playerId } = opts;
  const supabase = createBrowserSupabaseClient();

  const { data: sessions, error: sessionsError } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (sessionsError) throw sessionsError;
  if (!sessions || sessions.length === 0) return [];

  let matchingSessions = sessions;
  if (playerId !== undefined) {
    if (playerId === null) return [];
    const { data: ownRows, error: ownRowsError } = await supabase
      .from('game_session_participants')
      .select('session_id')
      .in('session_id', sessions.map((s) => s.id))
      .eq('player_id', playerId);
    if (ownRowsError) throw ownRowsError;
    const attendedIds = new Set((ownRows ?? []).map((r) => r.session_id));
    matchingSessions = sessions.filter((s) => attendedIds.has(s.id));
    if (matchingSessions.length === 0) return [];
  }

  const sessionIds = matchingSessions.map((s) => s.id);
  const [{ data: participants, error: participantsError }, { data: players, error: playersError }] =
    await Promise.all([
      supabase.from('game_session_participants').select('*').in('session_id', sessionIds),
      supabase.from('players').select('id, name').eq('campaign_id', campaignId),
    ]);
  if (participantsError) throw participantsError;
  if (playersError) throw playersError;

  const playerNameById = new Map((players ?? []).map((p) => [p.id, p.name]));
  return buildSessionHistory(matchingSessions, participants ?? [], playerNameById);
}
