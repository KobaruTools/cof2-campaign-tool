import { describe, expect, it } from 'vitest';

import { classPortraitPath } from './useCharacterPortraitSrc';

// Le hook lui-même (cache/objectURL/fetch) dépend du DOM navigateur — suite
// Vitest en environnement `node` (cf. `vitest.config.ts`), pas de rendu de hook
// ici. Vérifié manuellement dans le navigateur (skill `run`). Seule la partie
// pure (résolution du chemin statique) est testable en isolation.
describe('classPortraitPath', () => {
  it('illustration standard par défaut', () => {
    expect(classPortraitPath('barbare')).toBe('/classes/barbare.webp');
    expect(classPortraitPath('barbare', 'default')).toBe('/classes/barbare.webp');
  });

  it('illustration alternative', () => {
    expect(classPortraitPath('barbare', 'alt')).toBe('/classes/barbare-2.webp');
  });

  it('illustrations supplémentaires (altN)', () => {
    expect(classPortraitPath('barbare', 'alt3')).toBe('/classes/barbare-3.webp');
    expect(classPortraitPath('ensorceleur', 'alt6')).toBe('/classes/ensorceleur-6.webp');
  });
});
