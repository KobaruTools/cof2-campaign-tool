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

  // PER-324 — `ancestryPathLinks` : rattachement ADDITIF d'une voie payante à un peuple existant.
  it('rattache une voie à un peuple existant sans le redéfinir (ancestryPathLinks)', () => {
    const demiElfe = ancestryById.get('demi-elfe');
    expect(demiElfe).toBeDefined();
    const before = [...demiElfe!.ancestryPathIds];
    expect(before).not.toContain('demi-elfe'); // Voie payante absente au départ.
    const versionBefore = getContentVersion();

    const report = registerContentBundle({
      ancestryPathLinks: [{ ancestryId: 'demi-elfe', pathIds: ['demi-elfe'] }],
    });

    expect(report.added).toBe(1);
    expect(demiElfe!.ancestryPathIds).toContain('demi-elfe'); // Ajoutée…
    expect(demiElfe!.ancestryPathIds.slice(0, before.length)).toEqual(before); // …sans retirer les voies de base.
    expect(getContentVersion()).toBe(versionBefore + 1);

    // Idempotente : rejouer le même lien n'ajoute rien et ne bump pas.
    const again = registerContentBundle({
      ancestryPathLinks: [{ ancestryId: 'demi-elfe', pathIds: ['demi-elfe'] }],
    });
    expect(again.added).toBe(0);
    expect(getContentVersion()).toBe(versionBefore + 1);
  });

  it('ignore un lien vers un peuple inexistant', () => {
    const versionBefore = getContentVersion();
    const report = registerContentBundle({
      ancestryPathLinks: [{ ancestryId: 'peuple-fantome', pathIds: ['x'] }],
    });
    expect(report.added).toBe(0);
    expect(getContentVersion()).toBe(versionBefore);
  });
});
