'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { alpha, darken } from '@mui/material/styles';
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
  /**
   * Couleur d'accent (couleur de profil principal), utilisée pour teinter l'en-tête
   * de la fiche : dégradé partant de la droite (25 % d'opacité) vers la transparence,
   * bordure basse en variante plus foncée, et légère ombre portée. Absent = en-tête
   * neutre (accueil, wizard).
   */
  accentColor?: string;
}

/**
 * En-tête d'application partagé : barre collée en haut de page (`position: sticky`),
 * avec un bouton retour optionnel, un titre, et des actions optionnelles à droite.
 * Modèle unique — calqué sur l'en-tête de la fiche de personnage — pour l'accueil,
 * le wizard de création et la fiche. Reste visible au défilement.
 */
export function AppHeader({ title, backHref, onBack, backLabel, action, accentColor }: AppHeaderProps) {
  return (
    <AppBar
      position="sticky"
      // Verre dépoli, plus sombre que les sections de la fiche : gris quasi-noir à
      // peine transparent + le même flou d'arrière-plan (blur 10px) que les sections
      // (cf. SheetSection), pour laisser transparaître l'illustration au défilement.
      //
      // Avec `accentColor` (couleur de profil sur la fiche) : dégradé teinté partant
      // de la DROITE (25 % d'opacité) vers la transparence à gauche, posé PAR-DESSUS
      // le verre dépoli ; bordure basse en variante plus foncée de la couleur ; et
      // une légère ombre portée sous toute la longueur, elle aussi teintée.
      sx={{
        bgcolor: 'rgba(20, 20, 23, 0.85)',
        backgroundImage: accentColor
          ? `linear-gradient(to left, ${alpha(accentColor, 0.25)}, transparent)`
          : 'none',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: accentColor ? `0 4px 16px ${alpha(accentColor, 0.2)}` : 'none',
        borderBottom: accentColor
          ? `1px solid ${darken(accentColor, 0.4)}`
          : '1px solid rgba(255, 255, 255, 0.08)',
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
        {/* Titre tronqué proprement (PER-228) : `noWrap` + `minWidth: 0` permettent au
            titre de rétrécir dans le Toolbar et de finir en « … » plutôt que de s'écraser
            sur plusieurs lignes contre les actions à droite sur écran étroit. `mr` réserve
            un filet d'espace avant les actions. */}
        <Typography
          variant="h6"
          component="h1"
          noWrap
          sx={{ flexGrow: 1, minWidth: 0, mr: action ? 1 : 0 }}
        >
          {title}
        </Typography>
        {action && <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{action}</Box>}
      </Toolbar>
    </AppBar>
  );
}
