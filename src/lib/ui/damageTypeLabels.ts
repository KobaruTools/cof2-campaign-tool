import type { ResistibleDamageType } from '@/data/schema';

/**
 * Libellés français COURTS des types de DM élémentaires, partagés par les puces d'attaque
 * (élément ajouté aux flèches, PER-74) et de résistance (élément résisté, PER-137). Partiel :
 * seuls les types NOMMÉS élément par élément dans le livre ont un libellé court ici (les portées
 * larges comme `area`/`natural-non-magical` s'affichent en toutes lettres ailleurs).
 */
export const DAMAGE_TYPE_LABEL: Partial<Record<ResistibleDamageType, string>> = {
  fire: 'Feu',
  cold: 'Froid',
  lightning: 'Foudre',
  acid: 'Acide',
  poison: 'Poison',
  disease: 'Maladie',
};
