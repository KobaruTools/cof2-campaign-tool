import { describe, expect, it } from 'vitest';
import { pickBlobRow, type BlobRow } from './repo';

/** Ligne minimale : seuls le blob et le caractère payant de la source comptent ici. */
function row(name: string, isPaid: boolean | null): BlobRow {
  return { data: { id: 'x', name }, sources: isPaid === null ? null : { is_paid: isPaid } };
}

describe('pickBlobRow — plusieurs sources pour un même slug (PER-260)', () => {
  it('aucune ligne → null (créature inexistante ou gatée par la RLS)', () => {
    expect(pickBlobRow([])).toBeNull();
  });

  it('une seule ligne → son blob, payante ou non', () => {
    expect(pickBlobRow([row('Élémentaire', true)])).toMatchObject({ name: 'Élémentaire' });
  });

  it('collision gratuit/payant → la version du LIVRE DE BASE gagne (canonique)', () => {
    const picked = pickBlobRow([row('version payante', true), row('version de base', false)]);
    expect(picked).toMatchObject({ name: 'version de base' });
  });

  it('ne lève pas et rend quelque chose même si toutes les lignes sont payantes', () => {
    expect(pickBlobRow([row('payante A', true), row('payante B', true)])).toMatchObject({
      name: 'payante A',
    });
  });

  it('source non résolue (embed absent) → première ligne', () => {
    expect(pickBlobRow([row('sans source', null)])).toMatchObject({ name: 'sans source' });
  });
});
