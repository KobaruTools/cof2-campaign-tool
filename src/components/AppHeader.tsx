'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';

interface AppHeaderProps {
  /** Titre affiché (rendu en `<h1>`). */
  title: ReactNode;
  /**
   * Destination du bouton retour (flèche à gauche). Rend le bouton en vraie ancre
   * `<a href>` : Ctrl/⌘+Clic et clic-molette ouvrent la destination dans un
   * nouvel onglet. À privilégier sur `onBack` pour une simple navigation.
   */
  backHref?: string;
  /**
   * Callback impératif du bouton retour, pour les cas sans URL fixe. Ignoré si
   * `backHref` est fourni. Absent (avec `backHref` absent) = pas de bouton retour.
   */
  onBack?: () => void;
  /**
   * Libellé de la destination du bouton retour (ex. « Retour à {campagne} »).
   * Sert d'infobulle au survol et d'`aria-label`, quand le retour n'est pas
   * toujours l'accueil (PER-184). Absent = pas d'infobulle, `aria-label` neutre.
   */
  backLabel?: string;
  /** Contenu optionnel aligné à droite (boutons d'action). */
  action?: ReactNode;
}

/**
 * En-tête d'application partagé : barre collée en haut de page (`position: sticky`),
 * avec un bouton retour optionnel, un titre, et des actions optionnelles à droite.
 * Modèle unique — calqué sur l'en-tête de la fiche de personnage — pour l'accueil,
 * le wizard de création et la fiche. Reste visible au défilement.
 */
export function AppHeader({ title, backHref, onBack, backLabel, action }: AppHeaderProps) {
  return (
    <AppBar
      position="sticky"
      // Verre dépoli, plus sombre que les sections de la fiche : gris quasi-noir à
      // peine transparent + le même flou d'arrière-plan (blur 10px) que les sections
      // (cf. SheetSection), pour laisser transparaître l'illustration au défilement.
      sx={{
        bgcolor: 'rgba(20, 20, 23, 0.85)',
        backgroundImage: 'none',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: 'none',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <Toolbar>
        {(backHref || onBack) && (
          <AppTooltip title={backLabel ?? ''}>
            {/* `backHref` → ancre (Ctrl/⌘+Clic → nouvel onglet) ; sinon `onBack`
                → bouton impératif. Une ancre ne prenant pas `onClick` de retour,
                on rend deux variantes plutôt qu'un spread de props. */}
            {backHref ? (
              <IconButton
                edge="start"
                color="inherit"
                component={Link}
                href={backHref}
                aria-label={backLabel ?? 'Retour'}
                sx={{ mr: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
            ) : (
              <IconButton
                edge="start"
                color="inherit"
                onClick={onBack}
                aria-label={backLabel ?? 'Retour'}
                sx={{ mr: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}
          </AppTooltip>
        )}
        <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {action}
      </Toolbar>
    </AppBar>
  );
}
