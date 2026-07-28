import { describe, expect, it } from 'vitest';
import type { Creature } from '@/data/schema';
import { withInheritedDefense } from './creatureDefense';

function creature(patch: Partial<Creature> & { id: string }): Creature {
  return { name: patch.id, category: 'creatures-fantastiques', sourcePage: 1, ...patch };
}

describe('withInheritedDefense — traits défensifs des variantes (PER-260)', () => {
  it("une variante sans traits propres hérite de ceux de sa base", () => {
    const list = withInheritedDefense([
      creature({
        id: 'zombie',
        damageReduction: { kind: 'divide', value: 2, scopes: ['bludgeoning'] },
        statusImmunities: ['mind-control'],
      }),
      creature({ id: 'zombie-humain', baseCreatureId: 'zombie' }),
    ]);
    const variant = list.find((c) => c.id === 'zombie-humain')!;
    expect(variant.damageReduction).toEqual({ kind: 'divide', value: 2, scopes: ['bludgeoning'] });
    expect(variant.statusImmunities).toEqual(['mind-control']);
  });

  it("une variante qui définit ses propres traits garde les siens", () => {
    const list = withInheritedDefense([
      creature({ id: 'vampire', damageReduction: { kind: 'flat', value: 10 } }),
      creature({
        id: 'vampirien',
        baseCreatureId: 'vampire',
        damageReduction: { kind: 'flat', value: 5 },
      }),
    ]);
    expect(list.find((c) => c.id === 'vampirien')!.damageReduction).toEqual({ kind: 'flat', value: 5 });
  });

  it("une variante qui ne déclare que des immunités d'état n'hérite pas de la RD de la base", () => {
    const list = withInheritedDefense([
      creature({ id: 'base', damageReduction: { kind: 'flat', value: 10 } }),
      creature({ id: 'variante', baseCreatureId: 'base', statusImmunities: ['fear'] }),
    ]);
    expect(list.find((c) => c.id === 'variante')!.damageReduction).toBeUndefined();
  });

  it('base sans trait défensif, ou base introuvable → variante inchangée', () => {
    const list = withInheritedDefense([
      creature({ id: 'base' }),
      creature({ id: 'v1', baseCreatureId: 'base' }),
      creature({ id: 'v2', baseCreatureId: 'inconnue' }),
    ]);
    expect(list.find((c) => c.id === 'v1')!.damageReduction).toBeUndefined();
    expect(list.find((c) => c.id === 'v2')!.damageReduction).toBeUndefined();
  });

  it('créature autonome inchangée (même référence)', () => {
    const autonomous = creature({ id: 'loup' });
    expect(withInheritedDefense([autonomous])[0]).toBe(autonomous);
  });
});
