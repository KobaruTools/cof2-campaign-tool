/**
 * Renoncement PERSONNEL à un buff de groupe (PER-358). Ce qui est vérifié : la portée du geste (il
 * n'engage QUE le personnage qui l'a fait) et la purge, qui décide si un buff relevé par le MJ
 * revient ou reste écarté.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { registerSessionChannel } from '@/lib/session/sessionBridge';
import { BUFF_WAIVER_EVENT, useBuffOptOutStore } from './buffOptOut';

const CID = 'campagne-1';
const ME = 'perso-1';
const ALLY = 'perso-2';

/** Émissions capturées sur le canal de la campagne, dans l'ordre. */
let sent: { event: string; payload: unknown }[];
let unregister: () => void;

function waived(characterId: string) {
  return useBuffOptOutStore.getState().idsByCharacter[characterId] ?? [];
}

beforeEach(() => {
  sent = [];
  useBuffOptOutStore.setState({ idsByCharacter: {} });
  unregister?.();
  unregister = registerSessionChannel(CID, (event, payload) => sent.push({ event, payload }));
});

describe('écarter un buff de sa fiche', () => {
  it('n’engage que le personnage qui s’en écarte', () => {
    useBuffOptOutStore.getState().waiveBuff(CID, ME, 'heroes-song');
    expect(waived(ME)).toEqual(['heroes-song']);
    expect(waived(ALLY)).toEqual([]);
  });

  it('écarte chaque buff séparément — l’un n’emporte pas l’autre', () => {
    const store = useBuffOptOutStore.getState();
    store.waiveBuff(CID, ME, 'heroes-song');
    store.waiveBuff(CID, ME, 'blessing');
    expect(waived(ME)).toEqual(['heroes-song', 'blessing']);
  });

  it('deux clics ne rangent pas deux fois le même buff, ni ne réveillent le MJ deux fois', () => {
    const store = useBuffOptOutStore.getState();
    store.waiveBuff(CID, ME, 'heroes-song');
    store.waiveBuff(CID, ME, 'heroes-song');
    expect(waived(ME)).toEqual(['heroes-song']);
    expect(sent).toHaveLength(1);
  });

  it('annonce le renoncement au MJ : lui seul peut retirer l’état de la bande d’initiative', () => {
    useBuffOptOutStore.getState().waiveBuff(CID, ME, 'heroes-song');
    expect(sent).toEqual([
      { event: BUFF_WAIVER_EVENT, payload: { characterId: ME, buffId: 'heroes-song' } },
    ]);
  });

  it('hors campagne, le renoncement reste local — il n’y a personne à prévenir', () => {
    useBuffOptOutStore.getState().waiveBuff(null, ME, 'heroes-song');
    expect(waived(ME)).toEqual(['heroes-song']);
    expect(sent).toEqual([]);
  });
});

describe('purge sur l’état réellement posé', () => {
  it('le buff levé par le MJ cesse d’être écarté — le reposer le rend effectif', () => {
    const store = useBuffOptOutStore.getState();
    store.waiveBuff(CID, ME, 'heroes-song');
    store.syncPosed(ME, []);
    expect(waived(ME)).toEqual([]);
  });

  it('le buff toujours posé reste écarté', () => {
    const store = useBuffOptOutStore.getState();
    store.waiveBuff(CID, ME, 'heroes-song');
    store.syncPosed(ME, ['heroes-song', 'blinded']);
    expect(waived(ME)).toEqual(['heroes-song']);
  });

  it('sans rien à purger, l’état garde la MÊME référence (aucun rendu de plus)', () => {
    const store = useBuffOptOutStore.getState();
    store.waiveBuff(CID, ME, 'heroes-song');
    const before = useBuffOptOutStore.getState().idsByCharacter;
    store.syncPosed(ME, ['heroes-song']);
    store.syncPosed(ALLY, []);
    expect(useBuffOptOutStore.getState().idsByCharacter).toBe(before);
  });
});
