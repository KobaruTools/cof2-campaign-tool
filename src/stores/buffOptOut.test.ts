/**
 * Renoncement PERSONNEL à un buff de groupe (PER-358). Ce qui est vérifié : la portée du geste (il
 * n'engage QUE le personnage qui l'a fait) et la purge, qui décide si un buff relevé par le MJ
 * revient ou reste écarté.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { useBuffOptOutStore } from './buffOptOut';

const ME = 'perso-1';
const ALLY = 'perso-2';

function waived(characterId: string) {
  return useBuffOptOutStore.getState().idsByCharacter[characterId] ?? [];
}

beforeEach(() => {
  useBuffOptOutStore.setState({ idsByCharacter: {} });
});

describe('écarter un buff de sa fiche', () => {
  it('n’engage que le personnage qui s’en écarte', () => {
    useBuffOptOutStore.getState().waiveBuff(ME, 'heroes-song');
    expect(waived(ME)).toEqual(['heroes-song']);
    expect(waived(ALLY)).toEqual([]);
  });

  it('écarte chaque buff séparément — l’un n’emporte pas l’autre', () => {
    const store = useBuffOptOutStore.getState();
    store.waiveBuff(ME, 'heroes-song');
    store.waiveBuff(ME, 'blessing');
    expect(waived(ME)).toEqual(['heroes-song', 'blessing']);
  });

  it('deux clics ne rangent pas deux fois le même buff', () => {
    const store = useBuffOptOutStore.getState();
    store.waiveBuff(ME, 'heroes-song');
    store.waiveBuff(ME, 'heroes-song');
    expect(waived(ME)).toEqual(['heroes-song']);
  });
});

describe('purge sur l’état réellement posé', () => {
  it('le buff levé par le MJ cesse d’être écarté — le reposer le rend effectif', () => {
    const store = useBuffOptOutStore.getState();
    store.waiveBuff(ME, 'heroes-song');
    store.syncPosed(ME, []);
    expect(waived(ME)).toEqual([]);
  });

  it('le buff toujours posé reste écarté', () => {
    const store = useBuffOptOutStore.getState();
    store.waiveBuff(ME, 'heroes-song');
    store.syncPosed(ME, ['heroes-song', 'blinded']);
    expect(waived(ME)).toEqual(['heroes-song']);
  });

  it('sans rien à purger, l’état garde la MÊME référence (aucun rendu de plus)', () => {
    const store = useBuffOptOutStore.getState();
    store.waiveBuff(ME, 'heroes-song');
    const before = useBuffOptOutStore.getState().idsByCharacter;
    store.syncPosed(ME, ['heroes-song']);
    store.syncPosed(ALLY, []);
    expect(useBuffOptOutStore.getState().idsByCharacter).toBe(before);
  });
});
