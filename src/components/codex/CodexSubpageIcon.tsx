'use client';

/**
 * Icône propre à chaque sous-page du Codex (PER-419+), pour que le sélecteur (index
 * `/codex`), le menu du chevron d'en-tête (`CodexSplitButton`) et le tiroir burger
 * (`CodexDrawerItems`) montrent la MÊME icône par sous-page — une seule source de vérité,
 * pas de switch dupliqué trois fois.
 *
 * Choix (mêmes assets que le reste de l'app) :
 *  - Voies → `SectionIcon` « paths » : même icône que la section Voies de la fiche.
 *  - Capacités → `SectionIcon` « abilities » : même icône que la section Capacités de la fiche,
 *    distincte de « paths » (Voies) bien que les deux sous-pages portent sur les mêmes voies.
 *  - Objets magiques → `SectionIcon` « inventory » : même icône que la section Inventaire
 *    de la fiche (choix du propriétaire).
 *  - Dieux → `ItemIcon` « holy-symbol » : déjà dans le vocabulaire d'objets (icônes libres).
 *  - Familiers fantastiques → `SectionIcon` « companions » (tête de loup) : même icône que le
 *    bouton Bestiaire de l'en-tête.
 *  - Montures & véhicules → `SectionIcon` « mounts » (tête de cheval, lorc/horse-head.svg) —
 *    icône dédiée ajoutée au jeu d'assets game-icons (retour propriétaire) ; ne réutilise plus
 *    « companions », qui restait un pis-aller faute d'icône cheval/monture disponible.
 *  - Équipement → `ItemIcon` « chest » : symbole générique d'équipement/butin, pas encore
 *    utilisé ailleurs comme icône de navigation.
 */
import { ItemIcon } from '@/components/ItemIcon';
import { SectionIcon } from '@/components/SectionIcon';

export function CodexSubpageIcon({ label, size }: { label: string; size: number }) {
  switch (label) {
    case 'Voies':
      return <SectionIcon name="paths" size={size} />;
    case 'Capacités':
      return <SectionIcon name="abilities" size={size} />;
    case 'Objets magiques':
      return <SectionIcon name="inventory" size={size} />;
    case 'Dieux':
      return <ItemIcon id="holy-symbol" size={size} />;
    case 'Familiers fantastiques':
      return <SectionIcon name="companions" size={size} />;
    case 'Montures & véhicules':
      return <SectionIcon name="mounts" size={size} />;
    case 'Équipement':
      return <ItemIcon id="chest" size={size} />;
    default:
      return null;
  }
}
