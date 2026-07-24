'use client';

/**
 * Bouton « Ouvrir dans une nouvelle fenêtre » du tracker d'initiative (PER-248).
 * Ouvre la route de présentation `/campaign/<cid>/gm-screen/tracker` dans une fenêtre
 * dédiée, à afficher sur un second écran pendant une partie. Cette fenêtre reflète en
 * direct le combat piloté depuis la fenêtre principale (synchro via l'événement
 * `storage`, même navigateur / même origine).
 *
 * `window.open` (et non un lien) est volontaire : on veut une VRAIE fenêtre séparée
 * (popup dimensionnée), pas un onglet ni une navigation dans l'onglet courant. Le nom
 * de fenêtre est dérivé du `cid` pour qu'un second clic réutilise/refocalise la fenêtre
 * déjà ouverte plutôt que d'en empiler une nouvelle.
 */
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Button from '@mui/material/Button';

export function OpenTrackerWindowButton({ cid }: { cid: string }) {
  const open = () => {
    if (typeof window === 'undefined') return;
    // Fenêtre PANORAMIQUE : pleine largeur de l'écran, hauteur réduite (les combattants
    // s'alignent sur une rangée), calée en haut à gauche. On borne à l'espace écran
    // disponible (`availWidth`/`availHeight`).
    const width = window.screen.availWidth;
    const height = Math.min(520, window.screen.availHeight);
    // Pas de `noopener` ici (contrairement aux liens externes) : on veut que le nom de
    // fenêtre soit honoré pour réutiliser/refocaliser la fenêtre déjà ouverte. Route
    // interne de confiance, même origine.
    window.open(
      `/campaign/${cid}/gm-screen/tracker`,
      `gm-tracker-${cid}`,
      `width=${width},height=${height},left=0,top=0`,
    );
  };
  return (
    <Button variant="outlined" size="small" startIcon={<OpenInNewIcon />} onClick={open}>
      Ouvrir dans une nouvelle fenêtre
    </Button>
  );
}
