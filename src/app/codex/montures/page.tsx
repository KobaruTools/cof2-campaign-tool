'use client';

/**
 * Sous-page « Montures & véhicules » du Codex (PER-421). Ossature seule, sur le patron de
 * `src/app/codex/dieux/page.tsx` : le comportement vit dans `CodexMountsBrowser` (grille de
 * blocs, pas de sélecteur maître-détail, pas de `?id=`) — pas de `Suspense` requis. Séparée de la
 * sous-page Familiers (retour propriétaire) : deux routes distinctes, plus d'onglets communs.
 */
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { HomeBackground } from '@/components/HomeBackground';
import { CodexMountsBrowser } from '@/components/codex/CodexMountsBrowser';
import { useHeaderContent } from '@/stores/headerContent';

export default function CodexMountsPage() {
  useHeaderContent({
    breadcrumbs: [{ label: 'Codex', href: '/codex' }, { label: 'Montures & véhicules' }],
  });
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Montures & véhicules — Codex — Éditeur de personnage CO2</title>
      <HomeBackground />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button variant="text" color="inherit" component={NextLink} href="/codex" sx={{ mb: 2 }}>
          ← Retour au Codex
        </Button>
        <CodexMountsBrowser />
      </Container>
    </Box>
  );
}
