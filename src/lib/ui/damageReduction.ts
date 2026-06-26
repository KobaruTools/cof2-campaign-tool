/**
 * Mise en forme (français) d'une réduction de dégâts (RD) pour l'affichage à côté de la Défense
 * (PER-126). La RD reste « non lue par le moteur » au sens des calculs de combat ; ce formateur
 * ne sert qu'à un affichage informatif (puce + info-bulle).
 */
import type { DamageReduction, ResistibleDamageType } from '@/data/schema';

/** Libellés français des types de DM réductibles (pour la portée d'une RD). */
const SCOPE_LABELS: Record<ResistibleDamageType, string> = {
  physical: 'physiques',
  'non-magical': 'non magiques',
  magical: 'magiques',
  fire: 'de feu',
  cold: 'de froid',
  lightning: 'de foudre',
  acid: "d'acide",
};

/**
 * Forme courte (puce, ex. « RD 3 », « DM physiques ÷2 ») et longue (info-bulle) d'une RD.
 * La valeur scalante éventuelle n'est pas résolue ici (toutes constantes à ce jour) → « ? ».
 */
export function formatDamageReduction(dr: DamageReduction): { short: string; long: string } {
  const scopeWords = dr.scopes?.length ? dr.scopes.map((s) => SCOPE_LABELS[s]).join(', ') : '';
  const scopeSuffix = scopeWords ? ` ${scopeWords}` : '';
  const value = typeof dr.value === 'number' ? String(dr.value) : '?';

  if (dr.kind === 'immunity') {
    return {
      short: `Immunité${scopeSuffix || ' (tous DM)'}`,
      long: `Immunité aux DM${scopeSuffix || ' (tous types)'}.`,
    };
  }
  if (dr.kind === 'divide') {
    return {
      short: `DM${scopeSuffix} ÷${value}`,
      long: `DM${scopeSuffix || ' subis'} divisés par ${value}.`,
    };
  }
  // 'flat'
  return {
    short: `RD${scopeSuffix} ${value}`,
    long: `Réduit de ${value} les DM${scopeSuffix || ' subis'}.`,
  };
}
