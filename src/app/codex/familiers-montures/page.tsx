'use client';

/**
 * Sous-page « Familiers & montures » du Codex (PER-421). Ossature seule, sur le patron de
 * `src/app/codex/dieux/page.tsx` : le comportement vit dans `CodexFamiliarsMountsBrowser`
 * (deux onglets, pas de sélecteur maître-détail, pas de `?id=`) — pas de `Suspense` requis.
 */
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { HomeBackground } from '@/components/HomeBackground';
import { CodexFamiliarsMountsBrowser } from '@/components/codex/CodexFamiliarsMountsBrowser';
import { useHeaderContent } from '@/stores/headerContent';

export default function CodexFamiliarsMountsPage() {
  useHeaderContent({
    breadcrumbs: [{ label: 'Codex', href: '/codex' }, { label: 'Familiers & montures' }],
  });
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Familiers & montures — Codex — Éditeur de personnage CO2</title>
      <HomeBackground />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button variant="text" color="inherit" component={NextLink} href="/codex" sx={{ mb: 2 }}>
          ← Retour au Codex
        </Button>
        <CodexFamiliarsMountsBrowser />
      </Container>
    </Box>
  );
}
