import { describe, expect, it } from 'vitest';
import { creatureLinkAccess, isCapabilityAccessible } from './lockedContentAccess';

describe('isCapabilityAccessible', () => {
  it('is true for a capacité du contenu de base (toujours dans le catalogue)', () => {
    expect(isCapabilityAccessible('air-r1')).toBe(true);
  });

  it('is false for un id absent du catalogue (payant non débloqué, ou inconnu)', () => {
    expect(isCapabilityAccessible('capacite-payante-non-debloquee')).toBe(false);
  });
});

describe('creatureLinkAccess', () => {
  it("renvoie 'loading' avant le premier chargement de la liste (list === null)", () => {
    expect(creatureLinkAccess(null, 'spore-zombie')).toBe('loading');
  });

  it("renvoie 'accessible' quand le slug figure dans la liste chargée", () => {
    const list = [{ id: 'spore-zombie' } as never];
    expect(creatureLinkAccess(list, 'spore-zombie')).toBe('accessible');
  });

  it("renvoie 'locked' quand le slug est absent de la liste (source non débloquée, ou slug inconnu)", () => {
    const list = [{ id: 'gobelin' } as never];
    expect(creatureLinkAccess(list, 'creature-payante-verrouillee')).toBe('locked');
  });
});
