import { describe, expect, it } from 'vitest';
import { potionDefaultName, potionDiceNotation } from './restorableResources';

describe('potionDiceNotation', () => {
  it('1 dé, sans bonus : notation minimale', () => {
    expect(potionDiceNotation({ die: 'd6' })).toBe('1d6');
  });

  it('plusieurs dés', () => {
    expect(potionDiceNotation({ die: 'd6', count: 2 })).toBe('2d6');
  });

  it('dé évolutif : suffixe `°`, `die` ignoré comme face (placeholder)', () => {
    expect(potionDiceNotation({ die: 'd4', evolving: true })).toBe('1d4°');
  });

  it('bonus plat positif', () => {
    expect(potionDiceNotation({ die: 'd6', modifier: 4 })).toBe('1d6+4');
  });

  it('bonus plat négatif', () => {
    expect(potionDiceNotation({ die: 'd6', modifier: -2 })).toBe('1d6-2');
  });

  it('bonus nul : omis', () => {
    expect(potionDiceNotation({ die: 'd6', modifier: 0 })).toBe('1d6');
  });

  it('cumul : plusieurs dés évolutifs + bonus', () => {
    expect(potionDiceNotation({ die: 'd4', count: 2, evolving: true, modifier: 3 })).toBe('2d4°+3');
  });
});

describe('potionDefaultName', () => {
  it('« Potion de soin 1d4° » — exemple de la demande (PV, dé évolutif)', () => {
    expect(potionDefaultName({ resource: 'hp', die: 'd4', evolving: true })).toBe('Potion de soin 1d4°');
  });

  it('mana, dé fixe multiple', () => {
    expect(potionDefaultName({ resource: 'mana', die: 'd6', count: 2 })).toBe('Potion de mana 2d6');
  });

  it('rage, avec bonus plat', () => {
    expect(potionDefaultName({ resource: 'rage', die: 'd6', modifier: 4 })).toBe('Potion de rage 1d6+4');
  });

  it('chance / DR : couvre les 5 ressources', () => {
    expect(potionDefaultName({ resource: 'luck', die: 'd4' })).toBe('Potion de chance 1d4');
    expect(potionDefaultName({ resource: 'recoveryDice', die: 'd4' })).toBe('Potion de récupération 1d4');
  });
});
