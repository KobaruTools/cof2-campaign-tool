'use client';

/**
 * Sous-page « Objets magiques » du Codex (PER-419). Ossature seule, sur le patron de
 * `src/app/codex/voies/page.tsx` : le comportement vit dans `CodexMagicItemsBrowser`.
 * Pas de `?id=` ici (pas de sélecteur maître-détail comme les Voies) : les deux catalogues
 * (cristaux, propriétés d'enchantement) s'affichent en totalité, pas de `Suspense` requis.
 */
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { HomeBackground } from '@/components/HomeBackground';
import { CodexMagicItemsBrowser } from '@/components/codex/CodexMagicItemsBrowser';
import { useHeaderContent } from '@/stores/headerContent';

export default function CodexMagicItemsPage() {
  useHeaderContent({
    breadcrumbs: [{ label: 'Codex', href: '/codex' }, { label: 'Objets magiques' }],
  });
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Objets magiques — Codex — Éditeur de personnage CO2</title>
      <HomeBackground />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button variant="text" color="inherit" component={NextLink} href="/codex" sx={{ mb: 2 }}>
          ← Retour au Codex
        </Button>
        <CodexMagicItemsBrowser />
      </Container>
    </Box>
  );
}
