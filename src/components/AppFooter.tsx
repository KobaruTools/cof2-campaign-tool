'use client';

import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { BackgroundMotionToggle } from '@/components/BackgroundMotionToggle';
import { isProjectionRoute } from '@/lib/routing/projectionRoutes';

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
 * footer. Les illustrations de couverture (`HomeBackground`, `zIndex: -1`) passent
 * donc derrière le footer et transparaissent, floutées, au travers du verre — le
 * fond plein écran `fixed` sur l'accueil, la variante footer en `position: absolute`
 * ancrée au bas de la page sur la fiche. Sur une page sans fond, le footer reste un
 * simple verre sombre (dégradé propre).
 *
 * Outil non officiel réalisé par des fans pour une table de jeu privée : les
 * règles proviennent du DRS (Document de Référence du Système) de Chroniques
 * Oubliées, mis en accès libre et gratuit par Black Book Éditions.
 */
export function AppFooter() {
  const pathname = usePathname();
  if (isProjectionRoute(pathname)) return null;

  return (
    <Box
      component="footer"
      sx={{
        // AUCUNE marge haute (arbitrage proprio) : le pied de page vient au contact du
        // contenu, sur toutes les routes. Il en portait une (`mt: 6`), assortie d'une
        // liste d'exceptions pour les pages à bande d'initiative collée en bas, où elle
        // creusait un vide entre la bande et le verre. Le vide se voyait en réalité
        // partout — la marge décalait l'ensemble sans rien séparer que le regard ne
        // sépare déjà : la bordure et le voile suffisent à détacher le pied de page.
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

          {/* Crédit des ILLUSTRATIONS, distinct de celui des règles : le DRS est en
              accès libre, les images non — elles appartiennent à l'éditeur et à leurs
              auteurs, et ne sont reprises ici qu'à titre illustratif. */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Les illustrations affichées sur ce site (couverture, peuples, profils, créatures)
            sont la propriété de Black Book Éditions et de leurs auteurs. Elles ne nous
            appartiennent pas et sont reprises à titre illustratif, sans intention
            d’appropriation ni usage commercial.
          </Typography>

          {/* Crédit des symboles divins fan-made du Codex (filigrane, PER-421+) : contenu
              communautaire distinct des illustrations officielles ci-dessus, repris avec mention
              de la source plutôt qu'un auteur nommé par symbole (voir `godSymbolCredits.ts` pour
              le détail par dieu). */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            Les symboles divins utilisés en filigrane dans le Codex sont des créations de joueurs
            partagées sur le{' '}
            <Link
              href="https://black-book-editions.fr/forums.php?topic_id=24891"
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              sx={{ textDecorationColor: 'rgba(255, 255, 255, 0.4)' }}
            >
              forum de Black Book Éditions
            </Link>
            .
          </Typography>

          {/* Crédit + copyright + liens vers les pages d'information et légale. */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            © {YEAR} — Éditeur de personnage CO2, développé par KobaruTools.{' '}
            <Link
              component={NextLink}
              href="/about"
              color="inherit"
              sx={{ textDecorationColor: 'rgba(255, 255, 255, 0.4)' }}
            >
              À propos
            </Link>
            {' · '}
            <Link
              component={NextLink}
              href="/privacy"
              color="inherit"
              sx={{ textDecorationColor: 'rgba(255, 255, 255, 0.4)' }}
            >
              Politique de vie privée
            </Link>
          </Typography>

          {/* Réglage d'affichage par appareil (localStorage) : disponible sur toutes
              les pages, y compris sans compte. Séparé des mentions ci-dessus. */}
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mt: 0.5 }} />
          <BackgroundMotionToggle />
        </Stack>
      </Container>
    </Box>
  );
}
