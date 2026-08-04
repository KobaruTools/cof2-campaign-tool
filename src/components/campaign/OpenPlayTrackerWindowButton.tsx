'use client';

/**
 * Bouton « Nouvelle fenêtre » de l'écran d'initiative CÔTÉ JOUEUR (suite PER-271).
 * Pendant du `OpenTrackerWindowButton` du MJ, mais pour l'espace joueur : ouvre la route
 * distante `/play/initiative` (scopée par la session joueur, PER-293) dans une fenêtre
 * dédiée à poser sur un second écran. L'écran reflète en direct l'ordre d'initiative
 * pendant une session, en lecture seule.
 *
 * Proposé EN PLUS du bouton de navigation « Voir l'ordre d'initiative » (choix proprio) :
 * la navigation in-app reste utile (notamment sur mobile où les popups sont bloquées) ;
 * ce bouton offre la vraie 2e fenêtre à qui a un écran à dédier. Masqué en dessous de `md`
 * (mobile + tablette) comme côté MJ : un second écran n'y a pas de sens et les popups y
 * sont bloquées.
 *
 * `window.open` (et non un lien) est volontaire : on veut une VRAIE fenêtre séparée
 * (popup dimensionnée), pas un onglet ni une navigation dans l'onglet courant. Le nom de
 * fenêtre fixe (`play-tracker`) fait qu'un second clic réutilise/refocalise la fenêtre
 * déjà ouverte plutôt que d'en empiler une nouvelle.
 */
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Button from '@mui/material/Button';

export function OpenPlayTrackerWindowButton() {
  const open = () => {
    if (typeof window === 'undefined') return;
    // Fenêtre PANORAMIQUE : pleine largeur de l'écran, hauteur réduite (les combattants
    // s'alignent sur une seule rangée), calée en haut à gauche. Bornée à l'espace écran
    // disponible. 120 px = meilleur ratio retenu (recette proprio, cf. côté MJ).
    const width = window.screen.availWidth;
    const height = Math.min(120, window.screen.availHeight);
    window.open('/play/initiative', 'play-tracker', `width=${width},height=${height},left=0,top=0`);
  };
  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<OpenInNewIcon />}
      onClick={open}
      sx={{ display: { xs: 'none', md: 'inline-flex' } }}
    >
      Nouvelle fenêtre
    </Button>
  );
}
