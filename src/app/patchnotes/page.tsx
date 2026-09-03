'use client';

/**
 * Historique complet des patch notes (PER-460), généré automatiquement par
 * `scripts/patchnotes/generate.ts` à chaque push sur `main` contenant des
 * commits `feat`/`fix`/`perf`. Visiter cette page marque tout comme vu
 * (le toast `PatchnotesNotifier` ne se redéclenche pas après).
 */
import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { HomeBackground } from '@/components/HomeBackground';
import { getLatestPatchnoteId, patchnotes, type PatchnoteEntry } from '@/lib/patchnotes';
import { PATCHNOTE_TAGS, PATCHNOTE_TAG_ORDER, type PatchnoteTagId } from '@/data/patchnoteTags';
import { storageKeys } from '@/lib/storage/keys';
import { useHeaderContent } from '@/stores/headerContent';

export default function PatchnotesPage() {
  useHeaderContent({ breadcrumbs: [{ label: 'Nouveautés' }] });

  useEffect(() => {
    window.localStorage.setItem(storageKeys.patchnotes.lastSeenId, String(getLatestPatchnoteId()));
  }, []);

  const ordered = [...patchnotes].reverse();

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Nouveautés — Éditeur de personnage CO2</title>
      <HomeBackground />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Typography variant="h4" component="h1">
            Nouveautés
          </Typography>
          {ordered.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              Aucune nouveauté pour le moment.
            </Typography>
          ) : (
            ordered.map((entry) => <Entry key={entry.id} entry={entry} />)
          )}
        </Stack>
      </Container>
    </Box>
  );
}

function Entry({ entry }: { entry: PatchnoteEntry }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        bgcolor: 'rgba(20, 20, 23, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {entry.date}
      </Typography>
      <Stack spacing={1.5}>
        {PATCHNOTE_TAG_ORDER.map((tag) => {
          const items = entry.items.filter((item) => item.tag === tag);
          if (items.length === 0) return null;
          return (
            <Box key={tag}>
              <TagBadge tag={tag} />
              <Stack spacing={0.5} component="ul" sx={{ m: 0, mt: 0.75, pl: 2.5 }}>
                {items.map((item, i) => (
                  <Typography key={i} component="li" variant="body1" color="text.secondary">
                    {item.text}
                  </Typography>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
}

function TagBadge({ tag }: { tag: PatchnoteTagId }) {
  const def = PATCHNOTE_TAGS[tag];
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
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        lineHeight: 1.6,
        color: def.color,
        bgcolor: alpha(def.color, 0.14),
        border: `1px solid ${alpha(def.color, 0.4)}`,
      }}
    >
      {def.label}
    </Box>
  );
}
