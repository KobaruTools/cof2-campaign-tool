'use client';

/**
 * Sous-page « Dieux » du Codex (PER-420). Ossature seule, sur le patron de
 * `src/app/codex/objets-magiques/page.tsx` : le comportement vit dans `CodexGodsBrowser`,
 * une grille (pas de sélecteur maître-détail, pas de `?id=`) — pas de `Suspense` requis.
 */
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { HomeBackground } from '@/components/HomeBackground';
import { CodexGodsBrowser } from '@/components/codex/CodexGodsBrowser';
import { useHeaderContent } from '@/stores/headerContent';

export default function CodexGodsPage() {
  useHeaderContent({
    breadcrumbs: [{ label: 'Codex', href: '/codex' }, { label: 'Dieux' }],
  });
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Dieux — Codex — Éditeur de personnage CO2</title>
      <HomeBackground />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button variant="text" color="inherit" component={NextLink} href="/codex" sx={{ mb: 2 }}>
          ← Retour au Codex
        </Button>
        <CodexGodsBrowser />
      </Container>
    </Box>
  );
}
