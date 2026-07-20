import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrateCharacter } from '@/lib/engine/migrations';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { formatUnarmedDamage } from './unarmedStrike';

function loadFixture(name: string) {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe('PER-141 — recette end-to-end sur fixtures réelles', () => {
  it('test-moine-halfelin (niv 20, Poings de fer r5 + Mains d’énergie + Griffes + Morsure)', () => {
    const view = buildCharacterDerivedView(loadFixture('test-moine-halfelin'));
    const u = view.unarmed;
    expect(u.damage).toMatchObject({ count: 2, die: 'd6' });
    expect(u.damageAbilities).toEqual(['FOR', 'AGI', 'VOL']);
    expect(u.lethality).toBe('lethal');
    expect(u.magical).toBe(true);
    expect(u.minRollBecomesMax).toBe(true);
    expect(u.damageTypeChoice).toBe(true);
    expect(u.criticalRangeBonus).toBe(1);
    expect(formatUnarmedDamage(u)).toBe('2d6 + FOR/AGI/VOL');
    expect(view.unarmedCriticalRanges[0]?.text).toBe('19-20');
  });

  it('test-arquebusier-humain (Pilier de bar) : 1d4° non létal, sans carac', () => {
    const view = buildCharacterDerivedView(loadFixture('test-arquebusier-humain'));
    const u = view.unarmed;
    expect(u.damage).toMatchObject({ count: 1, die: 'd4', nonLethal: true });
    expect(u.evolving).toBe(true);
    expect(u.damageAbilities).toEqual([]);
    expect(u.lethality).toBe('non-lethal');
    expect(formatUnarmedDamage(u)).toBe('1d4°');
  });

  it('test-hybride-moine-druide-nain (Poings de fer r5) : 2d6 + FOR/AGI, létal', () => {
    const view = buildCharacterDerivedView(loadFixture('test-hybride-moine-druide-nain'));
    const u = view.unarmed;
    expect(u.damage).toMatchObject({ count: 2, die: 'd6' });
    expect(u.damageAbilities).toEqual(['FOR', 'AGI']);
    expect(u.lethality).toBe('lethal');
  });
});
