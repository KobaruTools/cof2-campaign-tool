'use client';

import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Fab from '@mui/material/Fab';
import Zoom from '@mui/material/Zoom';
import { AppTooltip } from '@/components/AppTooltip';

interface ScrollToTopButtonProps {
  /** Affiche le bouton (apparition/disparition animées) — piloté par le même trigger de défilement que le sous-titre du header. */
  visible: boolean;
}

/**
 * Bouton flottant « Haut de page », ancré en bas à droite du viewport. Apparaît une
 * fois qu'on a défilé au-delà de l'en-tête de la fiche (même déclencheur que le
 * sous-titre révélé dans la barre d'application), et remonte la page en douceur.
 *
 * Il partage le coin bas-droite avec la pile de toasts mais reste SOUS elle
 * (`zIndex: theme.zIndex.fab` = 1050 < `snackbar` = 1400) : un toast qui apparaît le
 * recouvre plutôt que l'inverse.
 */
export function ScrollToTopButton({ visible }: ScrollToTopButtonProps) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Zoom in={visible} unmountOnExit>
      <AppTooltip title="Haut de page">
        <Fab
          color="primary"
          size="medium"
          aria-label="Remonter en haut de la page"
          onClick={scrollToTop}
          sx={(theme) => ({
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: theme.zIndex.fab,
          })}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </AppTooltip>
    </Zoom>
  );
}
