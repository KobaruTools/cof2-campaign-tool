import { describe, expect, it } from 'vitest';
import { formatWeaponDamage } from './weaponDamage';

describe('formatWeaponDamage', () => {
  it('formate un dé simple avec son nombre (1d6)', () => {
    expect(formatWeaponDamage({ count: 1, die: 'd6' })).toBe('1d6');
  });

  it('formate plusieurs dés (2d6)', () => {
    expect(formatWeaponDamage({ count: 2, die: 'd6' })).toBe('2d6');
  });

  it('ajoute un modificateur plat positif (1d8+2)', () => {
    expect(formatWeaponDamage({ count: 1, die: 'd8', modifier: 2 })).toBe('1d8+2');
  });

  it('conserve le signe d’un modificateur négatif (1d8-1)', () => {
    expect(formatWeaponDamage({ count: 1, die: 'd8', modifier: -1 })).toBe('1d8-1');
  });

  it('ignore un modificateur nul (pas de « +0 »)', () => {
    expect(formatWeaponDamage({ count: 1, die: 'd6', modifier: 0 })).toBe('1d6');
  });

  it('entoure de parenthèses un DM non létal (temporaire) : (1d4)', () => {
    expect(formatWeaponDamage({ count: 1, die: 'd4', nonLethal: true })).toBe('(1d4)');
  });

  it('inclut le modificateur À L’INTÉRIEUR des parenthèses d’un DM non létal : (1d4+1)', () => {
    expect(formatWeaponDamage({ count: 1, die: 'd4', modifier: 1, nonLethal: true })).toBe('(1d4+1)');
  });

  it('formate le dé d3 (sans icône, en texte) : 1d3', () => {
    expect(formatWeaponDamage({ count: 1, die: 'd3' })).toBe('1d3');
  });
});
