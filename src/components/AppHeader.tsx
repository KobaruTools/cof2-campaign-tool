'use client';

import type { ReactNode } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

interface AppHeaderProps {
  /** Titre affiché (rendu en `<h1>`). */
  title: ReactNode;
  /** Callback du bouton retour (flèche à gauche). Absent = pas de bouton retour. */
  onBack?: () => void;
  /** Contenu optionnel aligné à droite (boutons d'action). */
  action?: ReactNode;
}

/**
 * En-tête d'application partagé : barre collée en haut de page (`position: sticky`),
 * avec un bouton retour optionnel, un titre, et des actions optionnelles à droite.
 * Modèle unique — calqué sur l'en-tête de la fiche de personnage — pour l'accueil,
 * le wizard de création et la fiche. Reste visible au défilement.
 */
export function AppHeader({ title, onBack, action }: AppHeaderProps) {
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
        {onBack && (
          <IconButton edge="start" color="inherit" onClick={onBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        )}
        <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {action}
      </Toolbar>
    </AppBar>
  );
}
