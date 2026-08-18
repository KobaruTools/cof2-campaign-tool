'use client';

/**
 * Corps de l'historique des parties (PER-270, ouvert au joueur par PER-407) —
 * factorisé pour être monté à la fois depuis la vue MJ (`/campaign/[cid]/history`)
 * et depuis l'espace joueur (`/play/history`) : même lecture (`fetchSessionHistory`),
 * même rendu, seul le chrome autour (breadcrumb, bouton retour) diffère par rôle.
 */
import { useEffect, useState } from 'react';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsIcon from '@mui/icons-material/Groups';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Popover from '@mui/material/Popover';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { RichTextEditor } from '@/components/sheet/RichTextEditor';
import { GlossaryRichText } from '@/components/sheet/FeatureRichText';
import { fetchSessionHistory, type SessionHistoryEntry } from '@/lib/session/history';
import { fetchSessionRecaps, upsertSessionRecap, type SessionRecap } from '@/lib/session/recap';
import type { SessionEndReason } from '@/lib/session/types';

/** Verre dépoli commun aux cartes (aligné sur les réglages de campagne). */
const glassPaper = {
  p: { xs: 2.5, sm: 3 },
  bgcolor: 'rgba(30, 30, 34, 0.62)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderColor: 'rgba(255, 255, 255, 0.10)',
} as const;

/**
 * Formate une durée en millisecondes en « Xh Ym » (ou « <1 min » si nulle). Exporté pour
 * `CharacterSessionHistoryDrawer` (PER-416) — même registre de formatage, pas de duplication.
 */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 1) return '< 1 min';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTimeRange(startedAt: string, endedAt: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(startedAt)} – ${fmt(endedAt)}`;
}

/** Badge « raison de fin », cohérent avec la palette de badges custom du projet. */
function EndReasonBadge({ reason }: { reason: SessionEndReason }) {
  const label =
    reason === 'gm'
      ? 'Terminée par le MJ'
      : reason === 'empty'
        ? 'Fermée (table vide)'
        : 'Fermée (durée max. 12 h)';
  const color = reason === 'gm' ? '#66bb6a' : 'rgba(255, 255, 255, 0.55)';
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

/**
 * Recap MJ partagé (PER-407, `game_session_recaps`) : MJ écrit/republie via un
 * champ éditable + interrupteur de visibilité ; joueur ne voit ce bloc QUE si
 * la RLS lui a effectivement renvoyé une ligne (donc déjà publiée) — aucune
 * vérification de `visibleToPlayers` côté client, la base a déjà filtré.
 */
function SessionRecapBlock({
  sessionId,
  recap,
  isGm,
  onSaved,
}: {
  sessionId: string;
  recap: SessionRecap | undefined;
  isGm: boolean;
  onSaved: (recap: SessionRecap) => void;
}) {
  // Initialisation paresseuse depuis `recap` : le parent ne monte ce composant
  // qu'une fois entrées ET recaps chargés ensemble (cf. `SessionHistoryList`),
  // donc `recap` est déjà à sa valeur définitive au premier rendu — pas besoin
  // d'effet de resynchronisation.
  const [content, setContent] = useState(recap?.content ?? '');
  const [visibleToPlayers, setVisibleToPlayers] = useState(recap?.visibleToPlayers ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isGm) {
    if (!recap || recap.content.trim() === '') return null;
    return (
      <Box sx={{ mt: 1.5 }}>
        <Divider sx={{ mb: 1.5, borderColor: 'rgba(255, 255, 255, 0.10)' }} />
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Résumé du MJ
        </Typography>
        <Typography variant="body2" component="div" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
          <GlossaryRichText>{recap.content}</GlossaryRichText>
        </Typography>
      </Box>
    );
  }

  const save = async (patch: Partial<Pick<SessionRecap, 'content' | 'visibleToPlayers'>>) => {
    setSaving(true);
    setError(null);
    try {
      const saved = await upsertSessionRecap(sessionId, patch);
      onSaved(saved);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      <Divider sx={{ mb: 1.5, borderColor: 'rgba(255, 255, 255, 0.10)' }} />
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Recap MJ
        </Typography>
        <FormControlLabel
          sx={{ mr: 0 }}
          control={
            <Switch
              size="small"
              checked={visibleToPlayers}
              disabled={saving}
              onChange={(e) => {
                const next = e.target.checked;
                setVisibleToPlayers(next);
                void save({ visibleToPlayers: next });
              }}
            />
          }
          label={
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              {visibleToPlayers ? <PublicIcon fontSize="small" /> : <LockIcon fontSize="small" />}
              <Typography variant="body2" color="text.secondary">
                {visibleToPlayers ? 'Visible aux joueurs' : 'Privé (MJ uniquement)'}
              </Typography>
            </Stack>
          }
          labelPlacement="start"
        />
      </Stack>
      <Box
        onBlur={() => {
          if (content !== (recap?.content ?? '')) void save({ content });
        }}
      >
        <RichTextEditor value={content} onChange={setContent} placeholder="Notes de résumé pour cette partie…" />
      </Box>
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Ligne date + heure — date et plage horaire/durée sur la MÊME ligne, séparées par un trait
 * vertical, plutôt que deux lignes empilées. Extrait pour être identique entre le tiroir MJ
 * (`SessionCard` ci-dessous) et le tiroir perso (`CharacterSessionHistoryDrawer`, PER-416).
 */
export function SessionDateTimeLine({ entry }: { entry: SessionHistoryEntry }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
        {formatDate(entry.startedAt)}
      </Typography>
      <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />
      <Typography variant="body2" color="text.secondary">
        {formatTimeRange(entry.startedAt, entry.endedAt)} · {formatDuration(entry.durationMs)}
      </Typography>
    </Stack>
  );
}

/** Liste des présences d'une partie — factorisée entre le bloc repliable et la popover. */
function ParticipantsList({ entry }: { entry: SessionHistoryEntry }) {
  if (entry.participants.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
        Aucune présence journalisée.
      </Typography>
    );
  }
  return (
    <Stack spacing={0.75}>
      {entry.participants.map((p) => (
        <Stack
          key={p.playerId ?? 'gm'}
          direction="row"
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="body2" sx={{ fontWeight: p.playerId === null ? 600 : 400 }}>
            {p.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {formatDuration(p.presenceMs)}
            {p.entries > 1 ? ` (${p.entries} connexions)` : ''}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

/**
 * Bloc « Présences » repliable — utilisé sur les pages dédiées MJ/joueur
 * (`/campaign/[cid]/history`, `/play/history`) où il reste ouvert par défaut, en dessous de la
 * ligne date/durée.
 */
export function SessionParticipantsCollapse({
  entry,
  defaultOpen,
}: {
  entry: SessionHistoryEntry;
  defaultOpen: boolean;
}) {
  const [presenceOpen, setPresenceOpen] = useState(defaultOpen);
  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={presenceOpen}
        onClick={() => setPresenceOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setPresenceOpen((v) => !v);
          }
        }}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          mb: presenceOpen ? 0.75 : 0,
          cursor: 'pointer',
          userSelect: 'none',
          color: 'text.secondary',
          borderRadius: 1,
          '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
        }}
      >
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            transition: 'transform 0.2s',
            transform: presenceOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'inherit' }}>
          Présences
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
          ({entry.participants.length})
        </Typography>
      </Box>
      <Collapse in={presenceOpen} unmountOnExit>
        <ParticipantsList entry={entry} />
      </Collapse>
    </>
  );
}

/**
 * Bouton « Présences » ouvrant une popover — remplace le bloc repliable dans les DEUX tiroirs
 * (MJ `GmHistoryDrawer`, perso `CharacterSessionHistoryDrawer`) : la liste des présences n'est
 * qu'un détail secondaire là, pas de bloc dépliable qui pousse le reste de la carte. Placé sur la
 * ligne date/durée, poussé à l'extrémité droite via `ml: 'auto'`.
 */
export function SessionParticipantsButton({ entry }: { entry: SessionHistoryEntry }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-expanded={open}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          ml: 'auto',
          px: 1,
          py: 0.4,
          font: 'inherit',
          color: 'text.secondary',
          bgcolor: 'transparent',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 1,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
          '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
        }}
      >
        <GroupsIcon fontSize="small" />
        <Typography variant="body2" component="span" sx={{ color: 'inherit' }}>
          Présences ({entry.participants.length})
        </Typography>
      </Box>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              ...glassPaper,
              p: 1.5,
              mt: 0.5,
              minWidth: 220,
              maxWidth: 320,
            },
          },
        }}
      >
        <ParticipantsList entry={entry} />
      </Popover>
    </>
  );
}

function SessionCard({
  entry,
  participantsDefaultOpen,
  isMostRecent,
  isGm,
  recap,
  onRecapSaved,
}: {
  entry: SessionHistoryEntry;
  /** État initial du bloc présences (repliable indépendamment par carte, pas persisté). */
  participantsDefaultOpen: boolean;
  /** Met en avant cette carte comme « dernière partie jouée » (PER-407, tiroir MJ uniquement). */
  isMostRecent: boolean;
  /** Le viewer courant est-il le MJ ? Donne accès à l'édition du recap. */
  isGm: boolean;
  recap: SessionRecap | undefined;
  onRecapSaved: (recap: SessionRecap) => void;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        ...glassPaper,
        ...(isMostRecent && {
          borderColor: 'primary.main',
          boxShadow: (theme) => `0 0 0 1px ${theme.palette.primary.main}`,
        }),
      }}
    >
      {isMostRecent && (
        <Typography
          variant="overline"
          sx={{ display: 'block', color: 'primary.main', fontWeight: 700, mb: 0.5 }}
        >
          Dernière partie jouée
        </Typography>
      )}
      {/* `gap` plutôt que `spacing` : la règle de marges générée par `spacing` a une
          spécificité CSS plus forte que `ml: 'auto'` du bouton et l'écraserait. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          mb: 1.5,
          gap: 1,
          justifyContent: participantsDefaultOpen ? 'space-between' : 'flex-start',
          alignItems: { xs: 'flex-start', sm: 'center' },
        }}
      >
        <SessionDateTimeLine entry={entry} />
        <EndReasonBadge reason={entry.endedReason} />
        {!participantsDefaultOpen && <SessionParticipantsButton entry={entry} />}
      </Stack>

      <Divider sx={{ mb: 1.5, borderColor: 'rgba(255, 255, 255, 0.10)' }} />

      {participantsDefaultOpen && (
        <SessionParticipantsCollapse entry={entry} defaultOpen={participantsDefaultOpen} />
      )}

      <SessionRecapBlock
        sessionId={entry.id}
        recap={recap}
        isGm={isGm}
        onSaved={onRecapSaved}
      />
    </Paper>
  );
}

export function SessionHistoryList({
  campaignId,
  participantsDefaultOpen = true,
  highlightMostRecent = false,
  isGm = false,
}: {
  campaignId: string;
  /** État initial du bloc présences de chaque carte — replié par défaut dans le tiroir de
   *  l'écran de MJ, ouvert par défaut ailleurs (comportement historique inchangé). */
  participantsDefaultOpen?: boolean;
  /** Marque la première entrée (déjà triée par date décroissante) comme « dernière partie
   *  jouée » — mise en avant purement visuelle, pas de nouveau point de lecture (PER-407). */
  highlightMostRecent?: boolean;
  /** Le viewer courant est-il le MJ ? Ouvre l'édition du recap (`/campaign/[cid]/history`,
   *  tiroir MJ) — par défaut `false` (vue joueur `/play/history`, lecture seule). */
  isGm?: boolean;
}) {
  const [entries, setEntries] = useState<SessionHistoryEntry[] | null>(null);
  const [recaps, setRecaps] = useState<Map<string, SessionRecap>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSessionHistory(campaignId)
      .then(async (rows) => {
        if (cancelled) return;
        // Recap secondaire à l'affichage principal : un échec de lecture ne doit pas
        // empêcher la consultation de l'historique lui-même. Attendu AVANT de poser
        // `entries`, pour que chaque carte monte avec son recap déjà chargé (état
        // initial correct dès le premier rendu, sans effet de resynchronisation).
        const recapMap = await fetchSessionRecaps(rows.map((r) => r.id)).catch(
          () => new Map<string, SessionRecap>(),
        );
        if (cancelled) return;
        setRecaps(recapMap);
        setEntries(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur inconnue.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  if (error) {
    return (
      <AppAlert severity="error" sx={{ mb: 3 }}>
        Impossible de charger l&apos;historique : {error}
      </AppAlert>
    );
  }

  if (entries === null) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={120} />
      </Stack>
    );
  }

  if (entries.length === 0) {
    return (
      <Paper variant="outlined" sx={{ ...glassPaper, textAlign: 'center', py: 6 }}>
        <EventBusyIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Aucune partie terminée
        </Typography>
        <Typography color="text.secondary">
          L&apos;historique se remplit dès qu&apos;une session de table est démarrée puis
          terminée dans cette campagne.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {entries.map((entry, index) => (
        <SessionCard
          key={entry.id}
          entry={entry}
          participantsDefaultOpen={participantsDefaultOpen}
          isMostRecent={highlightMostRecent && index === 0}
          isGm={isGm}
          recap={recaps.get(entry.id)}
          onRecapSaved={(recap) =>
            setRecaps((prev) => new Map(prev).set(entry.id, recap))
          }
        />
      ))}
    </Stack>
  );
}
