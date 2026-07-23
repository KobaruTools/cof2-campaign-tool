'use client';

/**
 * Page « Bestiaire » (PER-237) — consultation en LECTURE SEULE des 85 créatures du
 * livre de base (chapitre « Opposition », p. 259-303). Route globale, accessible depuis
 * l'accueil, sur le modèle des autres pages de l'app (fond, en-tête, conteneur). Tout le
 * comportement (recherche, filtres, maître-détail) vit dans `BestiaryBrowser` ; ici on ne
 * pose que l'ossature de page.
 */
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { AppHeader } from '@/components/AppHeader';
import { HomeBackground } from '@/components/HomeBackground';
import { BestiaryBrowser } from '@/components/bestiary/BestiaryBrowser';

export default function BestiaryPage() {
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Bestiaire — Éditeur de personnage CO2</title>
      <HomeBackground />
      <AppHeader breadcrumbs={[{ label: 'Bestiaire' }]} />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <BestiaryBrowser />
      </Container>
    </Box>
  );
}
