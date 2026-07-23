'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import MuiLink from '@mui/material/Link';
import Typography from '@mui/material/Typography';

/**
 * Un maillon du fil d'Ariane. `href` absent = maillon non cliquable (réservé au
 * dernier maillon, qui est la page courante rendue en `<h1>`).
 */
export interface Crumb {
  label: ReactNode;
  href?: string;
}

interface AppBreadcrumbsProps {
  /**
   * Chaîne parent → page courante. NE contient PAS de maillon « Accueil » (le logo
   * de marque le couvre déjà, cf. PER-239). Vide = aucun fil (accueil) : rien n'est rendu.
   * Le DERNIER maillon est la page courante, rendu en `<h1>` `aria-current="page"`, non
   * cliquable ; les maillons parents sont des vraies ancres (`Link`).
   */
  crumbs: Crumb[];
}

/**
 * Fil d'Ariane de la barre de navigation globale (PER-239). Remplace l'ancien
 * titre `<h1>` unique de l'en-tête. Séparateur « / » entre les maillons ; les parents
 * sont cliquables (Ctrl/⌘+Clic → nouvel onglet), la page courante est un `<h1>`
 * tronquable. Sur écran étroit, les maillons INTERMÉDIAIRES (ni parent immédiat ni
 * page courante) sont masqués pour préserver la place — en pratique le fil ne dépasse
 * pas deux niveaux dans l'app, mais la règle reste générale.
 */
export function AppBreadcrumbs({ crumbs }: AppBreadcrumbsProps) {
  if (crumbs.length === 0) return null;

  const lastIndex = crumbs.length - 1;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        minWidth: 0,
        color: 'text.secondary',
        // Le « / » entre maillons ne doit jamais se retrouver seul en début de ligne.
        whiteSpace: 'nowrap',
      }}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === lastIndex;
        // Maillon intermédiaire = ni le premier (parent affiché) ni le dernier (page
        // courante) : masqué sous `sm` pour garder « parent immédiat + page courante ».
        const isIntermediate = index !== 0 && !isLast;
        return (
          <Fragment key={index}>
            {index > 0 && (
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  mx: 0.75,
                  flexShrink: 0,
                  color: 'text.disabled',
                  ...(isIntermediate && { display: { xs: 'none', sm: 'inline' } }),
                }}
              >
                /
              </Box>
            )}
            {isLast ? (
              <Typography
                variant="subtitle1"
                component="h1"
                aria-current="page"
                noWrap
                sx={{ minWidth: 0, flexShrink: 1, fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }}
              >
                {crumb.label}
              </Typography>
            ) : (
              <MuiLink
                component={Link}
                href={crumb.href ?? '#'}
                underline="hover"
                color="inherit"
                noWrap
                sx={{
                  minWidth: 0,
                  flexShrink: 1,
                  fontSize: '0.95rem',
                  ...(isIntermediate && { display: { xs: 'none', sm: 'inline' } }),
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {crumb.label}
              </MuiLink>
            )}
          </Fragment>
        );
      })}
    </Box>
  );
}
