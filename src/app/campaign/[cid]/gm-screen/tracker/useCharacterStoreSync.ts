'use client';

/**
 * Synchro cross-fenêtre des PV des personnages (PER-248), pour la fenêtre « présentation »
 * du tracker. Le store des personnages n'a pas (encore) de temps réel : il est orienté
 * cloud et une fenêtre ne voit les changements d'une autre qu'au prochain `load()`. Mais
 * son middleware `persist` écrit son staging dans `localStorage` (clé `cof2-characters`)
 * à CHAQUE modification. On écoute donc l'événement `storage` — déclenché dans les AUTRES
 * fenêtres de même origine — et on **réhydrate** le store : la fenêtre principale édite
 * les PV, cette fenêtre les reflète en direct, sans rechargement.
 *
 * On n'écrit jamais depuis cette fenêtre (tracker en lecture seule) : aucun risque de
 * dérive du verrou optimiste cloud. La réhydratation ne relit que le staging local ;
 * l'état de synchro cloud (`cloudVersions`) n'est pas persisté et reste donc intact.
 */
import { useEffect } from 'react';
import { useCharactersStore } from '@/stores/characters';

/** Clé `localStorage` du middleware `persist` du store des personnages. */
const CHARACTERS_STORAGE_KEY = 'cof2-characters';

export function useCharacterStoreSync(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CHARACTERS_STORAGE_KEY) return;
      void useCharactersStore.persist.rehydrate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}
