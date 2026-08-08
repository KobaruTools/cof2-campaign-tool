import { describe, it, expect } from 'vitest';
import {
  parseContentBundle,
  planContentReconciliation,
} from './bundle';

describe('parseContentBundle — normalisation défensive', () => {
  it('ne retient que les clés connues avec un tableau d’entrées à id string', () => {
    const bundle = parseContentBundle({
      ancestries: [{ id: 'peuple-x', name: 'X' }],
      features: [{ id: 'cap-y' }],
      unknownKey: [{ id: 'z' }], // Clé inconnue → écartée.
      classes: 'pas-un-tableau', // Mauvais type → écarté.
    });
    expect(Object.keys(bundle).sort()).toEqual(['ancestries', 'features']);
    expect(bundle.ancestries).toHaveLength(1);
    expect(bundle.features?.[0].id).toBe('cap-y');
    expect(bundle.classes).toBeUndefined();
  });

  it('filtre les entrées malformées (sans id string) sans lever', () => {
    const bundle = parseContentBundle({
      ancestries: [{ id: 'ok' }, { name: 'no-id' }, null, 42, { id: 123 }],
    });
    expect(bundle.ancestries).toHaveLength(1);
    expect(bundle.ancestries?.[0].id).toBe('ok');
  });

  it('renvoie un lot vide pour une entrée non-objet', () => {
    expect(parseContentBundle(null)).toEqual({});
    expect(parseContentBundle('nope')).toEqual({});
    expect(parseContentBundle(undefined)).toEqual({});
  });

  it('écarte une clé connue dont le tableau ne contient que du malformé', () => {
    const bundle = parseContentBundle({ paths: [{ name: 'sans id' }] });
    expect(bundle.paths).toBeUndefined();
  });

  // PER-324 : `ancestryPathLinks` a une forme SANS `id` — il doit survivre au parse gaté.
  it('préserve les ancestryPathLinks valides (rattachement voie↔peuple)', () => {
    const bundle = parseContentBundle({
      ancestryPathLinks: [{ ancestryId: 'demi-elfe', pathIds: ['demi-elfe'] }],
    });
    expect(bundle.ancestryPathLinks).toEqual([{ ancestryId: 'demi-elfe', pathIds: ['demi-elfe'] }]);
  });

  it('filtre les ancestryPathLinks malformés (ancestryId/pathIds invalides)', () => {
    const bundle = parseContentBundle({
      ancestryPathLinks: [
        { ancestryId: 'ok', pathIds: ['a'] },
        { ancestryId: 42, pathIds: ['b'] }, // ancestryId non string
        { ancestryId: 'x', pathIds: 'nope' }, // pathIds pas un tableau
        { ancestryId: 'y', pathIds: [] }, // pathIds vide
        { ancestryId: 'z', pathIds: ['w', 3] }, // pathId non string
        null,
      ],
    });
    expect(bundle.ancestryPathLinks).toEqual([{ ancestryId: 'ok', pathIds: ['a'] }]);
  });

  it('écarte ancestryPathLinks si aucun lien valide', () => {
    const bundle = parseContentBundle({ ancestryPathLinks: [{ ancestryId: 42 }] });
    expect(bundle.ancestryPathLinks).toBeUndefined();
  });
});

describe('planContentReconciliation — cache ↔ entitlements', () => {
  it('sert du cache une source à jour, retélécharge une version bumpée', () => {
    const plan = planContentReconciliation(
      [
        { slug: 'companion', contentVersion: 3 },
        { slug: 'autre', contentVersion: 1 },
      ],
      [
        { slug: 'companion', contentVersion: 3 }, // à jour → fresh
        { slug: 'autre', contentVersion: 0 }, // version bumpée → toFetch
      ],
    );
    expect(plan.fresh).toEqual(['companion']);
    expect(plan.toFetch).toEqual(['autre']);
    expect(plan.toPurge).toEqual([]);
  });

  it('télécharge une source entitlée jamais mise en cache', () => {
    const plan = planContentReconciliation(
      [{ slug: 'companion', contentVersion: 1 }],
      [],
    );
    expect(plan.toFetch).toEqual(['companion']);
    expect(plan.fresh).toEqual([]);
  });

  it('purge un cache dont l’entitlement a été perdu', () => {
    const plan = planContentReconciliation(
      [], // plus aucune source payante entitlée
      [{ slug: 'companion', contentVersion: 2 }],
    );
    expect(plan.toPurge).toEqual(['companion']);
    expect(plan.fresh).toEqual([]);
    expect(plan.toFetch).toEqual([]);
  });
});
