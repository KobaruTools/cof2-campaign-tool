'use client';

/**
 * Sous-page « Familiers fantastiques » du Codex (PER-421). Ossature seule, sur le patron de
 * `src/app/codex/dieux/page.tsx` : le comportement vit dans `CodexFamiliarsBrowser` (grille de
 * blocs). `CodexFamiliarsBrowser` lit `useSearchParams()` (deep-link `?id=`), donc wrap `Suspense`
 * obligatoire (build Vercel). Séparée de la sous-page Montures (retour propriétaire) : deux routes
 * distinctes, plus d'onglets communs.
 */
import { Suspense } from 'react';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { HomeBackground } from '@/components/HomeBackground';
import { CodexFamiliarsBrowser } from '@/components/codex/CodexFamiliarsBrowser';
import { useHeaderContent } from '@/stores/headerContent';

export default function CodexFamiliarsPage() {
  useHeaderContent({
    breadcrumbs: [{ label: 'Codex', href: '/codex' }, { label: 'Familiers fantastiques' }],
  });
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Familiers fantastiques — Codex — Éditeur de personnage CO2</title>
      <HomeBackground />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button variant="text" color="inherit" component={NextLink} href="/codex" sx={{ mb: 2 }}>
          ← Retour au Codex
        </Button>
        <Suspense fallback={null}>
          <CodexFamiliarsBrowser />
        </Suspense>
      </Container>
    </Box>
  );
}
