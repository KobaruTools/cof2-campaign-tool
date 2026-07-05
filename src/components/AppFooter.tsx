'use client';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// Année du copyright, calculée côté client (composant client).
const YEAR = new Date().getFullYear();

/**
 * Pied de page global : crédits, mentions légales et citation de la source des
 * règles. Rendu sur toutes les pages (inséré dans le layout racine).
 *
 * Style calqué sur `AppHeader` (verre dépoli + flou d'arrière-plan), mais bordure
 * EN HAUT (`borderTop`) au lieu du bas, et non collé (flux normal : il se place
 * naturellement après le contenu de chaque page).
 *
 * Voile SEMI-TRANSPARENT : le `backdropFilter` floute ce qui est peint DERRIÈRE le
 * footer. Les illustrations de couverture (`HomeBackground`, en `position: fixed;
 * zIndex: -1`, ancrées au bas du viewport) passent donc derrière le footer et
 * transparaissent, floutées, au travers du verre — sur l'accueil comme sur la fiche.
 * Sur une page sans fond, le footer reste un simple verre sombre (dégradé propre).
 *
 * Outil non officiel réalisé par des fans pour une table de jeu privée : les
 * règles proviennent du DRS (Document de Référence du Système) de Chroniques
 * Oubliées, mis en accès libre et gratuit par Black Book Éditions.
 */
export function AppFooter() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 6,
        // Voile semi-transparent (bien plus bas que l'en-tête à 0.85) pour laisser
        // voir l'illustration de fond ; le flou d'arrière-plan la reprend comme le
        // verre de l'en-tête. Un léger dégradé vertical densifie le bas pour garder
        // le texte lisible tout en dégageant le haut où l'art apparaît le mieux.
        backgroundImage:
          'linear-gradient(to bottom, rgba(20, 20, 23, 0.42), rgba(20, 20, 23, 0.62))',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={1.5}>
          {/* Citation de la source des règles (DRS public et gratuit de BBE). */}
          <Typography variant="body2" color="text.secondary">
            Les règles de <strong>Chroniques Oubliées Fantasy</strong> sont issues du{' '}
            <Link
              href="https://www.co-drs.org/fr"
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              sx={{ textDecorationColor: 'rgba(255, 255, 255, 0.4)' }}
            >
              DRS (Document de Référence du Système)
            </Link>
            , mis en accès libre et gratuit par{' '}
            <Link
              href="https://black-book-editions.fr"
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              sx={{ textDecorationColor: 'rgba(255, 255, 255, 0.4)' }}
            >
              Black Book Éditions
            </Link>
            , éditeur du jeu.
          </Typography>

          {/* Marque + décharge : projet de fans, non officiel, non affilié. */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Chroniques Oubliées est une marque de Black Book Éditions. Tous droits réservés.
            Outil non officiel réalisé par des fans, sans lien avec l’éditeur, pour un usage
            privé à la table de jeu.
          </Typography>

          {/* Crédit + copyright. */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            © {YEAR} — Éditeur de personnage CO2, développé par KobaruTools.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
