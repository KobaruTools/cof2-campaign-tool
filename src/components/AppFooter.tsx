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

// Style commun à TOUS les liens du footer (crédits inline et liens de navigation) :
// pas de soulignement, gris discret plus foncé que le texte principal, avec un
// effet de survol qui l'éclaircit.
const FOOTER_NAV_LINK_SX = {
  color: 'rgba(255, 255, 255, 0.5)',
  textDecoration: 'none',
  transition: 'color 0.15s ease',
  '&:hover': {
    color: 'rgba(255, 255, 255, 0.85)',
    textDecoration: 'none',
  },
} as const;

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
      data-glossary-shot="AppFooter"
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
        {/* `spacing={0}` volontaire : le `Stack` de MUI espace ses enfants directs via un
            margin-top automatique (sélecteur emotion sur `& > * + *`), pas du `gap` — il
            l'aurait donc imposé au `<hr>` du Divider ci-dessous même sans `mt` explicite.
            L'espacement vertical vient uniquement du padding de chaque section. */}
        <Stack spacing={0}>
          {/* Deux colonnes : disclaimers/crédits à gauche (bloc large), liens utiles
              à droite (bloc étroit, aligné en haut). Empilées en une seule colonne
              sous `sm` faute de place. */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 2, sm: 0 }}
            sx={{ pb: { xs: 1.5, sm: 0 } }}
          >
            {/* `pb` sur CHAQUE colonne (pas sur ce `Stack` row) : le Divider vertical en
                `flexItem` s'étire (align-items stretch) à la hauteur de la colonne la plus
                haute PADDING INCLUS, donc son bas touche exactement le `hr` en dessous.
                Un `pb` posé sur le row aurait laissé un vide sous le Divider (padding du
                conteneur, hors de la zone étirée par le flex). */}
            <Stack
              spacing={1.5}
              sx={{ flex: 1, minWidth: 0, pr: { xs: 0, sm: 4 }, pb: { xs: 0, sm: 1.5 } }}
            >
              {/* Citation de la source des règles (DRS public et gratuit de BBE). */}
              <Typography variant="body2" color="text.secondary">
                Les règles de <strong>Chroniques Oubliées Fantasy</strong> sont issues du{' '}
                <Link
                  href="https://www.co-drs.org/fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={FOOTER_NAV_LINK_SX}
                >
                  DRS (Document de Référence du Système)
                </Link>
                , mis en accès libre et gratuit par{' '}
                <Link
                  href="https://black-book-editions.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={FOOTER_NAV_LINK_SX}
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
                Les symboles divins utilisés en filigrane dans le Codex sont des créations de
                joueurs partagées sur le{' '}
                <Link
                  href="https://black-book-editions.fr/forums.php?topic_id=24891"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={FOOTER_NAV_LINK_SX}
                >
                  forum de Black Book Éditions
                </Link>
                .
              </Typography>
            </Stack>

            {/* Séparateur vertical entre les deux colonnes : masqué en `xs`, où elles
                sont empilées (la marge verticale suffit alors à les distinguer). */}
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                display: { xs: 'none', sm: 'block' },
                borderColor: 'rgba(255, 255, 255, 0.08)',
              }}
            />

            {/* Liens utiles : notes de version, à propos, politique de vie privée. */}
            <Stack
              component="nav"
              direction="column"
              spacing={0.75}
              sx={{
                alignItems: 'flex-start',
                flexShrink: 0,
                pl: { xs: 0, sm: 4 },
                pb: { xs: 0, sm: 1.5 },
              }}
            >
              <Link
                component={NextLink}
                href="/patchnotes"
                variant="caption"
                sx={FOOTER_NAV_LINK_SX}
              >
                Notes de version
              </Link>
              <Link component={NextLink} href="/about" variant="caption" sx={FOOTER_NAV_LINK_SX}>
                À propos
              </Link>
              <Link component={NextLink} href="/privacy" variant="caption" sx={FOOTER_NAV_LINK_SX}>
                Politique de vie privée
              </Link>
            </Stack>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Copyright à gauche, réglage d'affichage par appareil (localStorage) à
              droite : disponible sur toutes les pages, y compris sans compte. */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              pt: 1.5,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              © {YEAR} — Éditeur de personnage CO2, développé par KobaruTools.
            </Typography>
            <BackgroundMotionToggle />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
