'use client';

/**
 * Notifieur global de synchro des personnages (PER-192), monté une fois via les
 * providers racine. Deux rôles :
 *
 *  1. **Conflit de verrou optimiste** : quand un flush cloud est rejeté (la fiche a
 *     été modifiée ailleurs), le store pose `conflictId`. On affiche alors un
 *     bandeau invitant à recharger — pas de fusion automatique (les modifications
 *     locales non enregistrées seront perdues au rechargement).
 *
 *  2. **Filet anti-perte** : on force le flush des personnages en attente avant que
 *     l'onglet ne parte en arrière-plan ou ne se ferme, réduisant la fenêtre entre
 *     le debounce et l'écriture cloud effective.
 */
import { useEffect } from 'react';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { AppAlert } from '@/components/AppAlert';
import { useCharactersStore } from '@/stores/characters';

export function CharacterSyncNotifier() {
  const conflictId = useCharactersStore((s) => s.conflictId);
  const clearConflict = useCharactersStore((s) => s.clearConflict);
  const flushAll = useCharactersStore((s) => s.flushAll);

  useEffect(() => {
    const onHide = () => flushAll();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushAll();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushAll]);

  return (
    <Snackbar
      open={conflictId !== null}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <AppAlert
        severity="warning"
        variant="filled"
        onClose={clearConflict}
        action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()}>
            Recharger
          </Button>
        }
        sx={{ width: '100%' }}
      >
        Cette fiche a été modifiée ailleurs. Rechargez la page pour récupérer la dernière
        version (vos modifications non enregistrées seront perdues).
      </AppAlert>
    </Snackbar>
  );
}
