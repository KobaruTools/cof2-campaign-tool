'use client';

/**
 * Drawer historique des parties DE CE PERSONNAGE (PER-416), ouvert depuis le bouton icône de
 * la section « Notes » de la fiche (PER-415). Réutilise le chemin de lecture réseau de
 * `SessionHistoryList` (`fetchSessionHistory`, PER-270/407) plutôt qu'un chemin dupliqué :
 * `playerId` restreint aux parties où LE JOUEUR DU PERSONNAGE a une trace dans
 * `game_session_participants` (jointure par `player_id`, jamais toute la campagne).
 *
 * Deux natures d'entrée :
 *  - la partie EN COURS (le cas échéant, `currentSessionId` résolu par l'appelant via
 *    `useActiveSession`) n'est jamais renvoyée par `fetchSessionHistory` (qui ne liste que les
 *    parties CLOSES) — elle est donc affichée à part, en tête de liste, avec sa note ÉDITABLE
 *    (RichTextEditor, cohérent avec le reste de la fiche — pas un `TextField` brut) tant que
 *    `readOnly` est faux. Fenêtre d'écriture calquée sur la RLS `character_session_notes_update`
 *    (PER-414/415) : partie en cours seulement.
 *  - les parties CLOSES sont en LECTURE SEULE : note affichée via `GlossaryRichText`, même
 *    rendu que le champ « Notes » de la fiche.
 *
 * Le MJ voit exactement le même drawer que le joueur sur les fiches de sa campagne (RLS déjà
 * permissive côté schéma) — aucun branchement par rôle ici. Tous les participants de chaque
 * partie restent affichés (décision produit actée) : ce n'est pas qu'un journal de notes perso,
 * mais un aperçu « qui étable à table ».
 */
import { useEffect, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { RichTextEditor } from '@/components/sheet/RichTextEditor';
import { GlossaryRichText } from '@/components/sheet/FeatureRichText';
import { fetchSessionHistory, type SessionHistoryEntry } from '@/lib/session/history';
import {
  formatDate,
  SessionDateTimeLine,
  SessionParticipantsButton,
} from '@/components/session/SessionHistoryList';
import {
  fetchCharacterSessionNote,
  fetchCharacterSessionNotesForSessions,
  upsertCharacterSessionNote,
} from '@/lib/session/characterNotes';

/** Verre dépoli commun aux cartes, aligné sur `SessionHistoryList`. */
const glassPaper = {
  p: { xs: 2, sm: 2.5 },
  bgcolor: 'rgba(30, 30, 34, 0.62)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderColor: 'rgba(255, 255, 255, 0.10)',
} as const;

function SessionBadge({ label, color }: { label: string; color: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        borderRadius: 1,
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        lineHeight: 1.4,
        color,
        border: '1px solid',
        borderColor: color,
        opacity: 0.85,
      }}
    >
      {label}
    </Box>
  );
}

/** Note ÉDITABLE de la partie EN COURS — même patron que `CharacterSessionNotesEditor`
 *  (PER-415), mais `RichTextEditor` au lieu d'un `TextField` brut (cohérence fiche). */
function CurrentSessionNoteEditor({
  characterId,
  sessionId,
  readOnly,
}: {
  characterId: string;
  sessionId: string;
  readOnly: boolean;
}) {
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetchCharacterSessionNote(characterId, sessionId)
      .then((note) => {
        if (cancelled) return;
        setContent(note?.content ?? '');
        setLastSaved(note?.content ?? '');
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erreur inconnue.');
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [characterId, sessionId]);

  const save = async (nextContent: string) => {
    if (nextContent === lastSaved) return;
    setError(null);
    try {
      await upsertCharacterSessionNote(characterId, sessionId, nextContent);
      setLastSaved(nextContent);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    }
  };

  if (!loaded) return <Skeleton variant="rounded" height={80} />;

  if (readOnly) {
    return content.trim() === '' ? (
      <Typography variant="body2" color="text.secondary">
        Aucune note pour cette partie…
      </Typography>
    ) : (
      <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
        <GlossaryRichText>{content}</GlossaryRichText>
      </Typography>
    );
  }

  // Le blur bubbule depuis l'éditeur Tiptap (contentEditable) jusqu'à ce conteneur — même
  // sauvegarde-au-blur que les autres notes de session (`CharacterSessionNotesEditor`,
  // `SessionLiveNotesPanel`), sans réseau à chaque frappe.
  return (
    <Box onBlur={() => void save(content)}>
      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="Aucune note pour cette partie…"
      />
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

function ClosedSessionCard({ entry, note }: { entry: SessionHistoryEntry; note: string | undefined }) {
  return (
    <Paper variant="outlined" sx={glassPaper}>
      {/* `gap` plutôt que `spacing` : la règle de marges générée par `spacing` a une
          spécificité CSS plus forte que `ml: 'auto'` du bouton et l'écraserait. */}
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <SessionDateTimeLine entry={entry} />
        <SessionParticipantsButton entry={entry} />
      </Stack>
      <Divider sx={{ my: 1.5, borderColor: 'rgba(255, 255, 255, 0.10)' }} />
      {!note || note.trim() === '' ? (
        <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
          Aucune note.
        </Typography>
      ) : (
        <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
          <GlossaryRichText>{note}</GlossaryRichText>
        </Typography>
      )}
    </Paper>
  );
}

function CurrentSessionCard({
  characterId,
  sessionId,
  startedAt,
  readOnly,
}: {
  characterId: string;
  sessionId: string;
  startedAt: string;
  readOnly: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ ...glassPaper, borderColor: 'primary.main', boxShadow: (theme) => `0 0 0 1px ${theme.palette.primary.main}` }}
    >
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
          {formatDate(startedAt)}
        </Typography>
        <SessionBadge label="Partie en cours" color="#66bb6a" />
      </Stack>
      <Divider sx={{ mb: 1.5, borderColor: 'rgba(255, 255, 255, 0.10)' }} />
      <CurrentSessionNoteEditor characterId={characterId} sessionId={sessionId} readOnly={readOnly} />
    </Paper>
  );
}

export function CharacterSessionHistoryDrawer({
  open,
  onClose,
  characterName,
  characterId,
  campaignId,
  playerId,
  currentSessionId,
  currentSessionStartedAt,
  readOnly,
}: {
  open: boolean;
  onClose: () => void;
  characterName: string;
  characterId: string;
  /** `null` = personnage non rattaché à une campagne : pas d'historique possible. */
  campaignId: string | null;
  /** `character.playerId` — restreint l'historique aux parties de CE joueur. */
  playerId: string | null;
  /** Session active de la campagne, si le personnage y a accès (`useActiveSession`). */
  currentSessionId: string | null;
  /** Début de la session active (`GameSession.startedAt`) — `null` sans session active. */
  currentSessionStartedAt: string | null;
  /** Le viewer courant peut-il éditer la note de la partie en cours ? */
  readOnly: boolean;
}) {
  const [entries, setEntries] = useState<SessionHistoryEntry[] | null>(null);
  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !campaignId) return;
    let cancelled = false;
    setEntries(null);
    setError(null);
    fetchSessionHistory(campaignId, { playerId })
      .then(async (rows) => {
        if (cancelled) return;
        const notesMap = await fetchCharacterSessionNotesForSessions(
          characterId,
          rows.map((r) => r.id),
        ).catch(() => new Map<string, string>());
        if (cancelled) return;
        setNotes(notesMap);
        setEntries(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur inconnue.');
      });
    return () => {
      cancelled = true;
    };
  }, [open, campaignId, playerId, characterId]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 'min(960px, 100vw)' }, maxWidth: '100vw' } } }}
    >
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
            Historique — {characterName}
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Fermer l'historique">
            <CloseIcon />
          </IconButton>
        </Stack>

        {!campaignId ? (
          <Typography variant="body2" color="text.secondary">
            Ce personnage n&apos;est pas rattaché à une campagne — aucun historique de partie
            n&apos;est possible.
          </Typography>
        ) : playerId === null ? (
          <Typography variant="body2" color="text.secondary">
            Ce personnage n&apos;est pas encore assigné à un joueur — aucune présence ne peut
            être journalisée.
          </Typography>
        ) : error ? (
          <AppAlert severity="error">Impossible de charger l&apos;historique : {error}</AppAlert>
        ) : entries === null ? (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={100} />
            <Skeleton variant="rounded" height={100} />
          </Stack>
        ) : entries.length === 0 && !(currentSessionId && currentSessionStartedAt) ? (
          <Paper variant="outlined" sx={{ ...glassPaper, textAlign: 'center', py: 5 }}>
            <EventBusyIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Aucune partie enregistrée
            </Typography>
            <Typography variant="body2" color="text.secondary">
              L&apos;historique se remplit dès que ce personnage participe à une partie de
              cette campagne.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {currentSessionId && currentSessionStartedAt && (
              <CurrentSessionCard
                characterId={characterId}
                sessionId={currentSessionId}
                startedAt={currentSessionStartedAt}
                readOnly={readOnly}
              />
            )}
            {entries.map((entry) => (
              <ClosedSessionCard key={entry.id} entry={entry} note={notes.get(entry.id)} />
            ))}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
