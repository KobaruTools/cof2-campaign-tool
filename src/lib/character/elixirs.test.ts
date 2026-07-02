import { describe, expect, it } from 'vitest';
import { creatableElixirItemNames, elixirItemName } from './elixirs';

describe('elixirItemName — nommage des doses d’élixir', () => {
  it('préfixe le nom du sort/de la recette', () => {
    expect(elixirItemName('Fortifiant')).toBe('Élixir — Fortifiant');
  });
});

describe('creatableElixirItemNames — élixirs préparables (voie des élixirs, p. 98)', () => {
  const names = creatableElixirItemNames();

  it('inclut les recettes à rang unique (r1-r3)', () => {
    expect(names).toEqual(
      expect.arrayContaining(['Élixir — Fortifiant', 'Élixir — Feu grégeois', 'Élixir — Élixir de guérison']),
    );
  });

  it('inclut les sorts reproduits par les Élixirs mineurs/majeurs (r4/r5)', () => {
    expect(names).toEqual(
      expect.arrayContaining([
        'Élixir — Forme gazeuse',
        'Élixir — Masque mortuaire',
        'Élixir — Invisibilité',
        'Élixir — Masque du prédateur',
      ]),
    );
  });

  it('couvre les 11 élixirs (3 recettes + 4 mineurs + 4 majeurs), sans doublon', () => {
    expect(names).toHaveLength(11);
    expect(new Set(names).size).toBe(11);
  });
});
