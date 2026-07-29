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
  /**
   * Libellé AU REPOS du dernier maillon (ex. « Fiche de personnage »), affiché tant que
   * `revealed` est faux ; il cède la place au libellé réel du maillon (ex. le nom du
   * personnage) par un fondu croisé. Le `<h1>` porte TOUJOURS le libellé réel — la couche
   * de repos n'est qu'un habillage visuel (`aria-hidden`). Absent = pas de fondu croisé.
   */
  restingLabel?: ReactNode;
  /**
   * Segment final SUPPLÉMENTAIRE (ex. la ligne « peuple · profil · niveau » de la fiche),
   * ajouté après la page courante et révélé par `revealed`. Séparé par une BARRE VERTICALE
   * et non par un « / » : ce n'est pas un niveau de navigation. Reste monté en permanence
   * pour pouvoir s'animer dans les deux sens.
   */
  trailing?: ReactNode;
  /**
   * Bascule repos → révélé (piloté par le défilement sur la fiche) : fondu croisé
   * `restingLabel` → libellé du dernier maillon, puis apparition du maillon `trailing`
   * (slide depuis le bas + fondu, léger décalage). Sans effet si ni `restingLabel` ni
   * `trailing` ne sont fournis.
   */
  revealed?: boolean;
}

/**
 * Fil d'Ariane de la barre de navigation globale (PER-239). Remplace l'ancien
 * titre `<h1>` unique de l'en-tête. Séparateur « / » entre les maillons ; les parents
 * sont cliquables (Ctrl/⌘+Clic → nouvel onglet), la page courante est un `<h1>`
 * tronquable. Sur écran étroit, les maillons INTERMÉDIAIRES (ni parent immédiat ni
 * page courante) sont masqués pour préserver la place — en pratique le fil ne dépasse
 * pas deux niveaux dans l'app, mais la règle reste générale.
 *
 * Sur la fiche de personnage, le fil se DÉPLIE au défilement (`revealed`) :
 * « {campagne} / Fiche de personnage » au repos → « {campagne} / {nom} | {peuple · profil
 * · niveau} » une fois l'en-tête dépassé (cf. `restingLabel` et `trailing`).
 */
export function AppBreadcrumbs({
  crumbs,
  restingLabel,
  trailing,
  revealed = true,
}: AppBreadcrumbsProps) {
  if (crumbs.length === 0) return null;

  const lastIndex = crumbs.length - 1;
  // Styles communs aux deux couches du dernier maillon (repos / révélé) pour que le
  // fondu croisé se fasse à typographie et gabarit rigoureusement identiques.
  const currentSx = {
    minWidth: 0,
    fontWeight: 600,
    color: 'text.primary',
    lineHeight: 1.2,
  } as const;

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
            {isLast && restingLabel != null ? (
              /* Dernier maillon à DEUX couches empilées dans la même cellule de grille
                 (donc pas de positionnement absolu : la largeur du maillon est le max des
                 deux libellés, aucun saut de gabarit pendant le fondu). La couche de repos
                 est purement décorative ; le `<h1>` porte toujours le libellé réel.
                 Les deux couches sont des conteneurs flex CENTRÉS : sans cela, la couche
                 dont le texte est inline impose au bloc la hauteur de ligne du parent
                 (« strut » de 24 px) et le libellé de l'autre couche se cale en HAUT de la
                 cellule — le nom remontait alors de ~3,4 px par rapport aux autres maillons. */
              <Box sx={{ display: 'grid', alignItems: 'center', minWidth: 0, flexShrink: 1 }}>
                <Box
                  aria-hidden="true"
                  sx={(theme) => ({
                    gridArea: '1 / 1',
                    display: 'flex',
                    alignItems: 'center',
                    minWidth: 0,
                    opacity: revealed ? 0 : 1,
                    transform: revealed ? 'translateY(-0.4rem)' : 'translateY(0)',
                    transition: theme.transitions.create(['opacity', 'transform'], {
                      duration: theme.transitions.duration.standard,
                      easing: theme.transitions.easing.easeOut,
                    }),
                  })}
                >
                  <Typography variant="subtitle2" component="span" noWrap sx={currentSx}>
                    {restingLabel}
                  </Typography>
                </Box>
                <Box
                  sx={(theme) => ({
                    gridArea: '1 / 1',
                    display: 'flex',
                    alignItems: 'center',
                    minWidth: 0,
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'translateY(0)' : 'translateY(0.4rem)',
                    transition: theme.transitions.create(['opacity', 'transform'], {
                      duration: theme.transitions.duration.standard,
                      easing: theme.transitions.easing.easeOut,
                    }),
                  })}
                >
                  <Typography
                    variant="subtitle2"
                    component="h1"
                    aria-current="page"
                    noWrap
                    sx={currentSx}
                  >
                    {crumb.label}
                  </Typography>
                </Box>
              </Box>
            ) : isLast ? (
              <Typography
                variant="subtitle2"
                component="h1"
                aria-current="page"
                noWrap
                sx={{ ...currentSx, flexShrink: 1 }}
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
                  fontSize: '0.8rem',
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
      {/* Segment final (ligne d'identité de la fiche), révélé APRÈS le fondu croisé du nom
          (le `transition-delay` ne joue qu'à l'entrée ; au retour tout repart aussitôt).
          Séparateur = BARRE VERTICALE, et non « / » : ce n'est pas un maillon de navigation,
          le « / » donnerait à tort l'impression d'un niveau de plus dans le fil. Le « · »
          reste réservé aux séparations internes (peuple · profil · niveau). */}
      {trailing && (
        <Box
          aria-hidden={!revealed}
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            color: 'text.secondary',
            opacity: revealed ? 1 : 0,
            transform: revealed ? 'translateY(0)' : 'translateY(0.5rem)',
            ml: 1,
            transition: theme.transitions.create(['opacity', 'transform'], {
              duration: theme.transitions.duration.standard,
              easing: theme.transitions.easing.easeOut,
            }),
            transitionDelay: revealed ? '120ms' : '0ms',
          })}
        >
          <Box
            component="span"
            aria-hidden="true"
            sx={{ alignSelf: 'center', width: '1px', height: 16, mr: 1, bgcolor: 'divider' }}
          />
          {trailing}
        </Box>
      )}
    </Box>
  );
}
