'use client';

/**
 * Icône propre à chaque sous-page du Codex (PER-419+), pour que le sélecteur (index
 * `/codex`), le menu du chevron d'en-tête (`CodexSplitButton`) et le tiroir burger
 * (`CodexDrawerItems`) montrent la MÊME icône par sous-page — une seule source de vérité,
 * pas de switch dupliqué trois fois.
 *
 * Choix (mêmes assets que le reste de l'app, aucun ajout de nouveau SVG game-icons) :
 *  - Voies → `SectionIcon` « paths » : même icône que la section Voies de la fiche.
 *  - Objets magiques → `SectionIcon` « inventory » : même icône que la section Inventaire
 *    de la fiche (choix du propriétaire).
 *  - Dieux → `ItemIcon` « holy-symbol » : déjà dans le vocabulaire d'objets (icônes libres).
 *  - Familiers fantastiques / Montures & véhicules → `SectionIcon` « companions » (tête de loup)
 *    pour les deux : même icône que le bouton Bestiaire de l'en-tête — assumé (thème juste, la
 *    seule icône « animal » du jeu d'assets ; aucune icône cheval/monture disponible), tranché
 *    avec le propriétaire malgré la réutilisation. Les deux routes distinctes (PER-421) partagent
 *    donc la même icône de navigation.
 *  - Équipement → `ItemIcon` « chest » : symbole générique d'équipement/butin, pas encore
 *    utilisé ailleurs comme icône de navigation.
 */
import { ItemIcon } from '@/components/ItemIcon';
import { SectionIcon } from '@/components/SectionIcon';

export function CodexSubpageIcon({ label, size }: { label: string; size: number }) {
  switch (label) {
    case 'Voies':
      return <SectionIcon name="paths" size={size} />;
    case 'Objets magiques':
      return <SectionIcon name="inventory" size={size} />;
    case 'Dieux':
      return <ItemIcon id="holy-symbol" size={size} />;
    case 'Familiers fantastiques':
    case 'Montures & véhicules':
      return <SectionIcon name="companions" size={size} />;
    case 'Équipement':
      return <ItemIcon id="chest" size={size} />;
    default:
      return null;
  }
}
