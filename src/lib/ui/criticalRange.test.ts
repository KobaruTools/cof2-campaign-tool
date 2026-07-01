import { describe, expect, it } from 'vitest';
import { combineCriticalRanges, formatCriticalRange, type CriticalRangeSourceLike } from './criticalRange';

describe('formatCriticalRange', () => {
  it('rend la plage selon l’élargissement (1 → 19-20, 2 → 18-20)', () => {
    expect(formatCriticalRange('melee', 1).short).toBe('19-20');
    expect(formatCriticalRange('melee', 2).short).toBe('18-20');
  });
  it('borne le seuil bas à 16 (plancher du livre, p. 213)', () => {
    expect(formatCriticalRange('melee', 6).short).toBe('16-20');
    expect(formatCriticalRange('ranged', 10).short).toBe('16-20');
  });
});

describe('combineCriticalRanges (cumul par portée, PER-73)', () => {
  const sources: CriticalRangeSourceLike[] = [
    { featureId: 'demi-orc-r3', name: 'Critique brutal', scope: 'melee', value: 1 },
    { featureId: 'brute-r5', name: 'Briseur d’os', scope: 'melee', value: 1 },
    { featureId: 'precision-r3', name: 'Tir précis', scope: 'ranged', value: 2 },
  ];

  it('ADDITIONNE les élargissements d’une même portée (1 + 1 = 18-20 au contact)', () => {
    const melee = combineCriticalRanges(sources, 'melee');
    expect(melee).not.toBeNull();
    expect(melee!.total).toBe(2);
    expect(melee!.sources.map((s) => s.featureId)).toEqual(['demi-orc-r3', 'brute-r5']);
    expect(formatCriticalRange('melee', melee!.total).short).toBe('18-20');
  });

  it('ne mélange pas les portées (le tir n’entre pas dans le contact)', () => {
    const ranged = combineCriticalRanges(sources, 'ranged');
    expect(ranged!.total).toBe(2);
    expect(ranged!.sources.map((s) => s.featureId)).toEqual(['precision-r3']);
  });

  it('renvoie null si aucune source pour la portée', () => {
    expect(combineCriticalRanges([], 'melee')).toBeNull();
    expect(
      combineCriticalRanges([{ featureId: 'x', name: 'X', scope: 'ranged', value: 1 }], 'melee'),
    ).toBeNull();
  });
});
