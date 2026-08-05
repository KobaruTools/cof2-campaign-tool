'use client';

/**
 * Bouton « Ouvrir dans une nouvelle fenêtre » du tracker d'initiative (PER-248).
 * Ouvre la route de présentation `/campaign/<cid>/gm-screen/tracker` dans une fenêtre
 * dédiée, à afficher sur un second écran pendant une partie. Cette fenêtre reflète en
 * direct le combat piloté depuis la fenêtre principale (synchro via l'événement
 * `storage`, même navigateur / même origine).
 *
 * Masqué en dessous de `md` (mobile + tablette) : un second écran n'a pas de sens sur
 * ces formats et les popups y sont de toute façon bloquées.
 *
 * `window.open` (et non un lien) est volontaire : on veut une VRAIE fenêtre séparée
 * (popup dimensionnée), pas un onglet ni une navigation dans l'onglet courant. Le nom
 * de fenêtre est dérivé du `cid` pour qu'un second clic réutilise/refocalise la fenêtre
 * déjà ouverte plutôt que d'en empiler une nouvelle.
 */
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CollapsibleLabelButton } from '@/components/CollapsibleLabelButton';

export function OpenTrackerWindowButton({ cid }: { cid: string }) {
  const open = () => {
    if (typeof window === 'undefined') return;
    // Fenêtre PANORAMIQUE : pleine largeur de l'écran, hauteur réduite (les combattants
    // s'alignent sur une seule rangée), calée en haut à gauche. On borne à l'espace écran
    // disponible (`availWidth`/`availHeight`). 120 px = meilleur ratio retenu (recette proprio).
    const width = window.screen.availWidth;
    const height = Math.min(120, window.screen.availHeight);
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
    <CollapsibleLabelButton
      variant="outlined"
      size="small"
      icon={<OpenInNewIcon />}
      label="Ouvrir dans une nouvelle fenêtre"
      onClick={open}
      // Le libellé est long : sous `xl`, il faisait passer l'en-tête du tracker à la ligne. Il se
      // replie donc sur la seule icône (cf. `CollapsibleLabelButton`). Le `display` reste le repli
      // mobile d'origine : masqué en dessous de `md`.
      sx={{ display: { xs: 'none', md: 'inline-flex' } }}
    />
  );
}
