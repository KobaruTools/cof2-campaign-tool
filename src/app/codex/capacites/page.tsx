'use client';

/**
 * Sous-page « Capacités » du Codex (PER-445) — grille exhaustive et filtrable de TOUTES les
 * capacités de TOUTES les voies (peuple, mage, profil, prestige), en complément de `/codex/voies`
 * (une voie à la fois). Ossature seule ici, sur le patron de `voies/page.tsx` : le comportement vit
 * dans `CodexAbilityBrowser`. `Suspense` requis : `CodexAbilityBrowser` lit `?id=` via
 * `useSearchParams`.
 */
import { Suspense } from 'react';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { HomeBackground } from '@/components/HomeBackground';
import { CodexAbilityBrowser } from '@/components/codex/CodexAbilityBrowser';
import { useHeaderContent } from '@/stores/headerContent';

export default function CodexAbilitiesPage() {
  useHeaderContent({
    breadcrumbs: [{ label: 'Codex', href: '/codex' }, { label: 'Capacités' }],
  });
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Capacités — Codex — Éditeur de personnage CO2</title>
      <HomeBackground />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button variant="text" color="inherit" component={NextLink} href="/codex" sx={{ mb: 2 }}>
          ← Retour au Codex
        </Button>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          Capacités
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Toutes les capacités de toutes les voies, filtrables par voie, rang, type d’action et sort.
        </Typography>
        <Suspense>
          <CodexAbilityBrowser />
        </Suspense>
      </Container>
    </Box>
  );
}
