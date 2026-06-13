import type { CaracId } from '@/data/schema';

/**
 * Libellés français complets des caractéristiques, indexés par id court.
 * Source unique réutilisée par l'UI (badges, libellés, tooltips).
 */
export const CARAC_NOMS: Record<CaracId, string> = {
  AGI: 'Agilité',
  CON: 'Constitution',
  FOR: 'Force',
  PER: 'Perception',
  CHA: 'Charisme',
  INT: 'Intelligence',
  VOL: 'Volonté',
};
