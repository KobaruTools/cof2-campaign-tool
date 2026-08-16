'use client';

/**
 * Sous-page « Voies » du Codex (PER-418) — première sous-page fonctionnelle de la bibliothèque
 * de règles (`/codex`). Ossature seule ici, sur le patron de `src/app/reference/page.tsx` : le
 * comportement (sélecteur + panneau, `?id=` partageable) vit dans `CodexPathBrowser`.
 *
 * `Suspense` requis : `CodexPathBrowser` lit `?id=` via `useSearchParams` — comme
 * `ReferenceBrowser`, une frontière évite de déporter tout l'arbre en rendu client au prérendu.
 */
import { Suspense } from 'react';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { HomeBackground } from '@/components/HomeBackground';
import { CodexPathBrowser } from '@/components/codex/CodexPathBrowser';
import { useHeaderContent } from '@/stores/headerContent';

export default function CodexPathsPage() {
  useHeaderContent({
    breadcrumbs: [{ label: 'Codex', href: '/codex' }, { label: 'Voies' }],
  });
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Voies — Codex — Éditeur de personnage CO2</title>
      <HomeBackground />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button variant="text" color="inherit" component={NextLink} href="/codex" sx={{ mb: 2 }}>
          ← Retour au Codex
        </Button>
        <Suspense>
          <CodexPathBrowser />
        </Suspense>
      </Container>
    </Box>
  );
}
