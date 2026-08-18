'use client';

/**
 * Contenu du tiroir « Notes de session » de l'écran de MJ (PER-427).
 *
 * Texte libre écrit par le MJ PENDANT que la partie se joue — distinct du recap
 * après-coup (`SessionRecapBlock`, PER-407, publiable aux joueurs) : ici la note
 * reste TOUJOURS privée (MJ seul), et n'existe que pour la session ACTIVE de la
 * campagne (`useActiveSession`). Éditable tant que la partie reste en cours ;
 * une fois close, elle reste lisible en relecture (brouillon avant de rédiger le
 * recap) mais l'écriture est refusée côté RLS (l'utilisateur n'a alors plus de
 * session active de toute façon — la note affichée est celle de la dernière
 * session close tant qu'aucune nouvelle partie n'a démarré).
 *
 * Ce composant est le CORPS du tiroir : il ne porte pas son propre conteneur ni
 * sa fermeture — `GmNotesDrawer` fournit l'ossature (en-tête, croix).
 */
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { RichTextEditor } from '@/components/sheet/RichTextEditor';
import { useActiveSession } from '@/lib/session/useActiveSession';
import { fetchSessionNote, upsertSessionNote } from '@/lib/session/notes';

export function SessionLiveNotesPanel({ campaignId }: { campaignId: string }) {
  const { session, loading: sessionLoading } = useActiveSession(campaignId);
  const sessionId = session?.id ?? null;

  const [content, setContent] = useState('');
  // Dernière valeur connue du serveur — sert à éviter un aller-retour réseau superflu
  // quand `onBlur` se déclenche sans qu'aucune frappe n'ait modifié le texte.
  const [lastSaved, setLastSaved] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chargement de la note existante à l'apparition d'une session active (ou son changement,
  // si le MJ termine puis redémarre une partie sans quitter le tiroir).
  useEffect(() => {
    if (!sessionId) {
      setContent('');
      setLastSaved('');
      setLoaded(false);
      return;
    }
    let cancelled = false;
    setLoaded(false);
    fetchSessionNote(sessionId)
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
  }, [sessionId]);

  if (sessionLoading) return null;

  if (!sessionId) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucune partie en cours — démarrez une session depuis l’en-tête pour prendre des notes.
      </Typography>
    );
  }

  const save = async (nextContent: string) => {
    if (nextContent === lastSaved) return;
    setError(null);
    try {
      await upsertSessionNote(sessionId, nextContent);
      setLastSaved(nextContent);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue.');
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Notes privées, visibles par vous seul — utile comme brouillon avant de rédiger le
        résumé de la partie.
      </Typography>
      {!loaded ? (
        <Skeleton variant="rounded" height={220} />
      ) : (
        <Box onBlur={() => void save(content)}>
          <RichTextEditor value={content} onChange={setContent} placeholder="Notez ce qui se passe à la table…" />
        </Box>
      )}
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
