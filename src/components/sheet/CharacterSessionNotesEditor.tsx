'use client';

/**
 * Éditeur de la note de session PERSO d'un personnage pour une partie donnée (PER-415,
 * `character_session_notes`, PER-414). Corps de l'onglet « Notes de session » de la fiche,
 * affiché seulement pendant qu'une partie est en cours (`useActiveSession`, résolu par
 * l'appelant) — ce composant ne fait qu'éditer la note de LA session déjà résolue, même
 * patron que `SessionLiveNotesPanel` (PER-427, notes MJ) mais clé composite
 * `(character_id, session_id)` au lieu de `session_id` seul.
 *
 * `RichTextEditor` (cohérent avec le reste de la fiche, cf. `CharacterSessionHistoryDrawer`)
 * plutôt qu'un `TextField` brut — même patron lecture/écriture que les parties CLOSES
 * (`GlossaryRichText` en lecture seule).
 */
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { RichTextEditor } from '@/components/sheet/RichTextEditor';
import { GlossaryRichText } from '@/components/sheet/FeatureRichText';
import { fetchCharacterSessionNote, upsertCharacterSessionNote } from '@/lib/session/characterNotes';

export function CharacterSessionNotesEditor({
  characterId,
  sessionId,
  readOnly,
}: {
  characterId: string;
  sessionId: string;
  readOnly: boolean;
}) {
  const [content, setContent] = useState('');
  // Dernière valeur connue du serveur — évite un aller-retour réseau superflu quand `onBlur`
  // se déclenche sans qu'aucune frappe n'ait modifié le texte.
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

  if (!loaded)
    return <Skeleton variant="rounded" height={80} data-glossary-shot="CharacterSessionNotesEditor" />;

  if (readOnly) {
    return content.trim() === '' ? (
      <Typography variant="body2" color="text.secondary" data-glossary-shot="CharacterSessionNotesEditor">
        Aucune note pour cette partie…
      </Typography>
    ) : (
      <Typography
        variant="body2"
        component="div"
        sx={{ whiteSpace: 'pre-line' }}
        data-glossary-shot="CharacterSessionNotesEditor"
      >
        <GlossaryRichText>{content}</GlossaryRichText>
      </Typography>
    );
  }

  return (
    <Box onBlur={() => void save(content)} data-glossary-shot="CharacterSessionNotesEditor">
      <RichTextEditor value={content} onChange={setContent} placeholder="Aucune note pour cette partie…" />
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
