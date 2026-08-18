'use client';

/**
 * Sous-page « Équipement » du Codex (PER-422, dernière sous-page de la milestone). Ossature seule,
 * sur le patron de `src/app/codex/montures/page.tsx` : le comportement vit dans
 * `CodexEquipmentBrowser` (onglets par catégorie + tableau triable/filtrable) — pas de `Suspense`,
 * pas de sélecteur maître-détail.
 */
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { HomeBackground } from '@/components/HomeBackground';
import { CodexEquipmentBrowser } from '@/components/codex/CodexEquipmentBrowser';
import { useHeaderContent } from '@/stores/headerContent';

export default function CodexEquipmentPage() {
  useHeaderContent({
    breadcrumbs: [{ label: 'Codex', href: '/codex' }, { label: 'Équipement' }],
  });
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Équipement — Codex — Éditeur de personnage CO2</title>
      <HomeBackground />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button variant="text" color="inherit" component={NextLink} href="/codex" sx={{ mb: 2 }}>
          ← Retour au Codex
        </Button>
        <CodexEquipmentBrowser />
      </Container>
    </Box>
  );
}
