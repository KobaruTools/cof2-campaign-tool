import type {
  Creature,
  CreatureCategory,
  CreatureNature,
  CreatureSize,
} from '@/data/schema';

/**
 * Libellés français d'affichage des énumérations de créatures (catégorie, taille,
 * nature). Clés = slugs de code (anglais/neutres), valeurs = texte montré au joueur.
 * Source unique réutilisée par le bestiaire (filtres + bloc de stats).
 */
export const CREATURE_CATEGORY_LABELS: Record<CreatureCategory, string> = {
  humanoides: 'Humanoïdes',
  animaux: 'Animaux',
  'creatures-fantastiques': 'Créatures fantastiques',
};

/** Libellés des tailles (table p. 260). */
export const CREATURE_SIZE_LABELS: Record<CreatureSize, string> = {
  minuscule: 'Minuscule',
  'tres-petite': 'Très petite',
  petite: 'Petite',
  moyenne: 'Moyenne',
  grande: 'Grande',
  enorme: 'Énorme',
  colossale: 'Colossale',
};

/** Libellés des natures/types de créature (p. 259-261). */
export const CREATURE_NATURE_LABELS: Record<CreatureNature, string> = {
  vivant: 'Vivant',
  humanoide: 'Humanoïde',
  vegetatif: 'Végétatif',
  'non-vivant': 'Non-vivant',
};

/**
 * NC affichable d'une créature : la forme verbatim (`ncNote`, ex. « 1/2 », « 2 (3) »,
 * « +1 Niveau ») prime ; sinon la valeur numérique. `null` pour une entrée GABARIT que
 * le livre imprime sans NC (ex. « Zombie », p. 301).
 */
export function creatureNcLabel(creature: Creature): string | null {
  if (creature.ncNote) return creature.ncNote;
  if (creature.nc != null) return String(creature.nc);
  return null;
}
