import { describe, it, expect } from 'vitest';
import {
  mergeEntries,
  getContentVersion,
  bumpContentVersion,
  subscribeContent,
  type RegistrySlot,
} from './contentRegistry';

/** Fabrique un emplacement de registre neuf à partir d'entrées de base. */
function slotOf<T extends { id: string }>(base: T[]): RegistrySlot<T> {
  return { list: [...base], byId: new Map(base.map((e) => [e.id, e])) };
}

type Entry = { id: string; name: string };

describe('mergeEntries — fusion en place, additive', () => {
  it('ajoute les nouvelles entrées à la liste ET à l’index, références conservées', () => {
    const slot = slotOf<Entry>([{ id: 'a', name: 'Alpha' }]);
    const list = slot.list; // On garde la référence pour vérifier la mutation en place.
    const byId = slot.byId;

    const report = mergeEntries(slot, [{ id: 'b', name: 'Bravo' }]);

    expect(report.added).toBe(1);
    expect(report.skipped).toEqual([]);
    // Même objet Array/Map (les consommateurs synchrones tiennent cette référence).
    expect(slot.list).toBe(list);
    expect(slot.byId).toBe(byId);
    expect(byId.get('b')).toEqual({ id: 'b', name: 'Bravo' });
    expect(list.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('ne remplace JAMAIS une entrée de base existante (base gagne) et la signale', () => {
    const slot = slotOf<Entry>([{ id: 'a', name: 'Alpha (base)' }]);

    const report = mergeEntries(slot, [
      { id: 'a', name: 'Alpha (payant)' },
      { id: 'c', name: 'Charlie' },
    ]);

    expect(report.added).toBe(1);
    expect(report.skipped).toEqual(['a']);
    expect(slot.byId.get('a')).toEqual({ id: 'a', name: 'Alpha (base)' });
    expect(slot.list.map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('est idempotent : re-fusionner le même lot n’ajoute rien', () => {
    const slot = slotOf<Entry>([{ id: 'a', name: 'Alpha' }]);
    const bundle = [{ id: 'b', name: 'Bravo' }];

    mergeEntries(slot, bundle);
    const report = mergeEntries(slot, bundle);

    expect(report.added).toBe(0);
    expect(report.skipped).toEqual(['b']);
    expect(slot.list.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('dédoublonne à l’intérieur d’un même lot (premier gagne)', () => {
    const slot = slotOf<Entry>([]);

    const report = mergeEntries(slot, [
      { id: 'x', name: 'X1' },
      { id: 'x', name: 'X2' },
    ]);

    expect(report.added).toBe(1);
    expect(report.skipped).toEqual(['x']);
    expect(slot.byId.get('x')).toEqual({ id: 'x', name: 'X1' });
  });

  it('accepte un lot absent (undefined) sans rien changer', () => {
    const slot = slotOf<Entry>([{ id: 'a', name: 'Alpha' }]);
    const report = mergeEntries(slot, undefined);
    expect(report.added).toBe(0);
    expect(report.skipped).toEqual([]);
    expect(slot.list).toHaveLength(1);
  });
});

describe('version de contenu — pub/sub pour la réactivité', () => {
  it('bump incrémente la version et notifie les abonnés', () => {
    const before = getContentVersion();
    let notified = 0;
    const unsub = subscribeContent(() => {
      notified += 1;
    });

    bumpContentVersion();

    expect(getContentVersion()).toBe(before + 1);
    expect(notified).toBe(1);

    unsub();
    bumpContentVersion();
    expect(notified).toBe(1); // Plus notifié après désabonnement.
  });
});
