'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { type Theme } from '@mui/material/styles';

/**
 * Style partagé des boutons de navigation globaux de l'en-tête (Bestiaire, Campagnes,
 * Livre des règles…). Le libellé est masqué sous `sm` (icône seule, pour ne pas manger
 * la place du fil d'Ariane sur écran étroit), affiché dès `sm` (PER-228). Au défilement
 * (`condensed`), le libellé se replie AUSSI sur grand écran et le bouton se resserre — le
 * tout en transition douce (max-width + opacité animées, jamais `display: none` qui ne
 * s'anime pas).
 *
 * Extrait de `AppHeader` (PER-254) pour être réutilisé par le corps du split-button
 * « Livre des règles » (`RulesBookSplitButton`), qui doit être visuellement identique
 * aux autres boutons de nav.
 */
export function HeaderNavButton({
  href,
  onClick,
  icon,
  label,
  condensed,
}: {
  /** Cible de navigation (bouton-lien interne). Fournir `href` OU `onClick`. */
  href?: string;
  /** Action au clic (bouton d'action, ex. ouvrir le visualiseur PDF). Fournir `href` OU `onClick`. */
  onClick?: () => void;
  icon: ReactNode;
  label: string;
  condensed: boolean;
}) {
  const buttonSx = (theme: Theme) => ({
    minWidth: 0,
    px: condensed ? 0.75 : { xs: 1, sm: 2 },
    py: condensed ? 0.25 : 0.5,
    flexShrink: 0,
    // On inclut `background-color` : sinon cette transition sur mesure écraserait la
    // transition par défaut de MUI et le voile blanc de survol apparaîtrait d'un coup.
    transition: theme.transitions.create(['padding', 'background-color'], {
      duration: theme.transitions.duration.short,
    }),
    '& .MuiButton-startIcon': {
      mr: { xs: 0, sm: condensed ? 0 : 0.5 },
      transition: theme.transitions.create('margin', {
        duration: theme.transitions.duration.short,
      }),
    },
  });
  const labelSpan = (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-block',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        maxWidth: { xs: 0, sm: condensed ? 0 : '18ch' },
        opacity: { xs: 0, sm: condensed ? 0 : 1 },
        transition: theme.transitions.create(['max-width', 'opacity'], {
          duration: theme.transitions.duration.short,
        }),
      })}
    >
      {label}
    </Box>
  );
  // Bouton-lien (navigation interne) OU bouton d'action (onClick) selon la prop fournie.
  return href ? (
    <Button color="inherit" startIcon={icon} component={Link} href={href} sx={buttonSx}>
      {labelSpan}
    </Button>
  ) : (
    <Button color="inherit" startIcon={icon} onClick={onClick} sx={buttonSx}>
      {labelSpan}
    </Button>
  );
}
