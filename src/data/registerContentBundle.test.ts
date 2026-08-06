import { describe, it, expect } from 'vitest';
import {
  registerContentBundle,
  getContentVersion,
  ancestries,
  ancestryById,
  type ContentBundle,
} from './index';
import type { Ancestry } from './schema';

// Ces tests mutent les registres SINGLETON de `@/data`. Vitest isole le registre de
// modules par fichier de test, donc cette pollution ne fuit pas vers les autres
// fichiers ; à l'intérieur de ce fichier, on utilise des ids dédiés au test.
const PAID_ID = 'per321-paid-ancestry';

const paidAncestry = {
  id: PAID_ID,
  name: 'Peuple de test payant',
} as unknown as Ancestry;

describe('registerContentBundle — augmentation en place des registres', () => {
  it('rend une nouvelle entrée résoluble par id et l’ajoute au tableau exporté', () => {
    expect(ancestryById.get(PAID_ID)).toBeUndefined();
    const listRef = ancestries; // Référence conservée par les consommateurs.
    const versionBefore = getContentVersion();

    const report = registerContentBundle({ ancestries: [paidAncestry] });

    expect(report.added).toBe(1);
    expect(ancestryById.get(PAID_ID)).toBe(paidAncestry);
    expect(ancestries).toBe(listRef); // Même tableau, muté en place.
    expect(ancestries.some((a) => a.id === PAID_ID)).toBe(true);
    expect(getContentVersion()).toBe(versionBefore + 1);
  });

  it('n’écrase jamais une entrée de base et ne bump pas la version pour rien', () => {
    const baseHuman = ancestryById.get('humain');
    expect(baseHuman).toBeDefined();
    const versionBefore = getContentVersion();

    const collide = { id: 'humain', name: 'Humain (payant)' } as unknown as Ancestry;
    const report = registerContentBundle({ ancestries: [collide] });

    expect(report.added).toBe(0);
    expect(report.skipped).toContain('humain');
    expect(ancestryById.get('humain')).toBe(baseHuman); // Base intacte.
    expect(getContentVersion()).toBe(versionBefore); // Aucun ajout → pas de bump.
  });

  it('accepte un lot vide sans effet', () => {
    const versionBefore = getContentVersion();
    const report = registerContentBundle({} as ContentBundle);
    expect(report.added).toBe(0);
    expect(getContentVersion()).toBe(versionBefore);
  });
});
