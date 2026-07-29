/**
 * Signal 3 états de la connexion de session (PER-269, milestone PER-259) — la fonction
 * PURE qui traduit l'état bas niveau du canal Realtime + la connectivité de l'appareil en
 * un des trois états lisibles par l'humain à la table : **connecté / reconnexion… / hors
 * ligne**.
 *
 * Deux sources, chacune couvrant un état distinct (cf. grilling PER-269) :
 *  - `navigator.onLine` (via `useOnlineStatus`) → l'appareil sait-il qu'il a un réseau ?
 *    Faux = HORS LIGNE sans ambiguïté (inutile de deviner à partir du canal).
 *  - `status` du canal (`useSessionChannel`) → une fois le réseau présent : `joined` =
 *    CONNECTÉ ; tout le reste (`connecting`/`error`/`idle`) = RECONNEXION… (le socket
 *    tente de rejoindre — cf. le rejoin automatique Phoenix vérifié pour PER-269).
 *
 * Confinée à une fonction pure et testée : l'UI (badges compacts, popover de présence)
 * n'en consomme que le verdict, jamais la logique.
 */
import type { SessionChannelStatus } from './useSessionChannel';

/** Verdict lisible affiché à l'utilisateur. */
export type SessionConnectionState = 'connected' | 'reconnecting' | 'offline';

/**
 * Traduit (état du canal, connectivité appareil) en signal 3 états.
 * `online` faux prime (hors ligne certain) ; sinon `joined` = connecté, le reste = reconnexion.
 */
export function sessionConnectionState(
  status: SessionChannelStatus,
  online: boolean,
): SessionConnectionState {
  if (!online) return 'offline';
  return status === 'joined' ? 'connected' : 'reconnecting';
}

/** Libellé français court du verdict (voyant compact + `aria-label`). */
export function sessionConnectionLabel(state: SessionConnectionState): string {
  switch (state) {
    case 'connected':
      return 'Connecté';
    case 'reconnecting':
      return 'Reconnexion…';
    case 'offline':
      return 'Hors ligne';
  }
}
