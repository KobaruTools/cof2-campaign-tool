import type { AbilityId } from '@/data/schema';

/**
 * Libellés français complets des caractéristiques, indexés par id court.
 * Source unique réutilisée par l'UI (badges, libellés, tooltips).
 *
 * Les icônes sont gérées séparément : markup SVG game-icons.net dans
 * `abilityIcons.ts` (FICHIER GÉNÉRÉ), affiché via le composant `<AbilityIcon>`.
 */
export const ABILITY_NAMES: Record<AbilityId, string> = {
  AGI: 'Agilité',
  CON: 'Constitution',
  FOR: 'Force',
  PER: 'Perception',
  CHA: 'Charisme',
  INT: 'Intelligence',
  VOL: 'Volonté',
};
