'use client';

/**
 * Page « Aide-mémoire » (PER-46) — consultation en LECTURE SEULE du référentiel de règles CO2
 * (états, manœuvres, modificateurs d'attaque, tables de difficulté / poisons / encombrement…).
 * Route globale en anglais (`/reference`, cf. convention routes/dossiers), titre affiché en
 * français. Sur le modèle des autres pages (fond, en-tête, conteneur) : ici on ne pose que
 * l'ossature ; tout le comportement (recherche, navigation, rendu) vit dans `ReferenceBrowser`.
 *
 * STRICTEMENT en lecture seule : aucune dépendance au modèle `Character`, au store ni au moteur
 * — la page ne consomme que le domaine de données `@/data/reference`.
 */
import { Suspense } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { HomeBackground } from '@/components/HomeBackground';
import { ReferenceBrowser } from '@/components/reference/ReferenceBrowser';
import { useHeaderContent } from '@/stores/headerContent';

export default function ReferencePage() {
  useHeaderContent({ breadcrumbs: [{ label: 'Aide-mémoire' }] });
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Aide-mémoire — Éditeur de personnage CO2</title>
      <HomeBackground />

      {/* `xl` (et non `lg` comme les autres pages) : depuis PER-311 le contenu d'un onglet se lit sur
          DEUX COLONNES à côté du sommaire — en `lg` chaque colonne tomberait sous les 450 px, où une
          table de manœuvres à trois colonnes ne tient plus. */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Suspense requis : `ReferenceBrowser` lit la section de parcours dans l'URL (`?s=`) via
            useSearchParams — une frontière évite de déporter tout l'arbre en rendu client au
            prérendu (Next 16), comme pour le bestiaire. */}
        <Suspense>
          <ReferenceBrowser />
        </Suspense>
      </Container>
    </Box>
  );
}
