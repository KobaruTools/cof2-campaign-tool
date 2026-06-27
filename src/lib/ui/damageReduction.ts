/**
 * Mise en forme (français) d'une réduction de dégâts (RD) pour l'affichage à côté de la Défense
 * (PER-126, étendu PER-137). La RD reste « non lue par le moteur » au sens des calculs de combat ;
 * ce formateur ne sert qu'à un affichage informatif (puce + info-bulle).
 *
 * Convention d'étiquette (PER-137) : une RD SANS portée couvre TOUS les DM → « RD 2 » ; une RD
 * TYPÉE nomme la portée en clair → « RD Froid 2 », « RD Froid ÷2 ». Les IMMUNITÉS de type de dégât
 * ne passent PAS par ici : elles sont rendues dans le cadre « Immunités » (« Immunité au feu »).
 */
import type { DamageReduction, ResistibleDamageType } from '@/data/schema';

/** Libellé COURT (puce), portée en clair et capitalisée — « RD Froid 2 ». */
const SCOPE_SHORT: Record<ResistibleDamageType, string> = {
  physical: 'Physiques',
  'non-magical': 'Non magiques',
  magical: 'Magiques',
  fire: 'Feu',
  cold: 'Froid',
  lightning: 'Foudre',
  acid: 'Acide',
  poison: 'Poison',
  disease: 'Maladie',
  'metallic-projectile': 'Projectiles métalliques',
  'non-silver-weapon': 'Armes non argentées',
  'natural-non-magical': 'Naturels non magiques',
  area: 'Zone',
};

/** Libellé LONG (info-bulle), tournure prépositionnelle — « les DM de froid ». */
const SCOPE_LONG: Record<ResistibleDamageType, string> = {
  physical: 'physiques',
  'non-magical': 'non magiques',
  magical: 'magiques',
  fire: 'de feu',
  cold: 'de froid',
  lightning: 'de foudre',
  acid: "d'acide",
  poison: 'de poison',
  disease: 'de maladie',
  'metallic-projectile': 'des projectiles métalliques',
  'non-silver-weapon': 'des armes non argentées',
  'natural-non-magical': 'naturels non magiques',
  area: 'des attaques de zone et des souffles',
};

/** Portée(s) au format court, jointes — ou chaîne vide si la RD couvre tous les DM. */
function shortScopes(dr: DamageReduction): string {
  return dr.scopes?.length ? dr.scopes.map((s) => SCOPE_SHORT[s]).join(', ') : '';
}

/** Portée(s) au format long, jointes — ou chaîne vide si la RD couvre tous les DM. */
function longScopes(dr: DamageReduction): string {
  return dr.scopes?.length ? dr.scopes.map((s) => SCOPE_LONG[s]).join(', ') : '';
}

/**
 * Forme courte (puce, ex. « RD 5 », « RD Froid ÷2 ») et longue (info-bulle) d'une RD.
 * La valeur scalante éventuelle n'est pas résolue ici (elle l'est en amont par l'UI) → « ? ».
 */
export function formatDamageReduction(dr: DamageReduction): { short: string; long: string } {
  const shortScope = shortScopes(dr);
  const longScope = longScopes(dr);
  const value = typeof dr.value === 'number' ? String(dr.value) : '?';

  if (dr.kind === 'immunity') {
    // Cas legacy : les immunités de type de dégât sont désormais rendues dans le cadre « Immunités »
    // (PER-137). Ce formateur reste défini par cohérence si une RD `immunity` subsiste.
    return {
      short: shortScope ? `Immunité ${shortScope}` : 'Immunité (tous DM)',
      long: `Immunité aux DM${longScope ? ' ' + longScope : ' (tous types)'}.`,
    };
  }
  if (dr.kind === 'divide') {
    return {
      short: shortScope ? `RD ${shortScope} ÷${value}` : `RD ÷${value}`,
      long: `DM${longScope ? ' ' + longScope : ' subis'} divisés par ${value}.`,
    };
  }
  // 'flat'
  return {
    short: shortScope ? `RD ${shortScope} ${value}` : `RD ${value}`,
    long: `Réduit de ${value} les DM${longScope ? ' ' + longScope : ' subis'}.`,
  };
}
