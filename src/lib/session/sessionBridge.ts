/**
 * Pont hors-React entre le canal Realtime de session (ouvert par `useSessionChannel`,
 * PER-265) et le store `characters` (PER-266). Le store, qui n'est PAS un hook, ne « voit »
 * pas la session active ; ce module lui donne le moyen de savoir, au moment d'une écriture
 * d'état de jeu, si une session est active pour la campagne du personnage — et, si oui, un
 * émetteur pour diffuser le delta sur le canal de cette campagne.
 *
 * Vit hors de l'état zustand (comme les minuteries de flush du store) : un canal Realtime
 * n'est ni sérialisable ni réactif, il n'a rien à faire dans l'état persisté. Une entrée par
 * campagne (une seule barre de session — `SessionLiveBar` — montée à la fois par onglet).
 *
 * Sens des dépendances : le store importe CE module (émission) ; `useSessionChannel` importe
 * CE module (enregistrement) ET le store (réception). Le store n'importe jamais le hook →
 * aucun cycle.
 */

/** Émetteur d'un événement de session (broadcast) pour une campagne donnée. */
export type SessionSend = (event: string, payload: unknown) => void;

interface SessionBridgeEntry {
  send: SessionSend;
}

const entries = new Map<string, SessionBridgeEntry>();

/**
 * Enregistre l'émetteur du canal de session d'une campagne (appelé par `useSessionChannel`
 * une fois le canal `joined`). Renvoie un désenregistrement idempotent qui ne retire QUE
 * l'entrée courante — garde-fou contre un cleanup tardif d'un ancien abonnement qui
 * effacerait un abonnement plus récent (remontage rapide de la barre).
 */
export function registerSessionChannel(campaignId: string, send: SessionSend): () => void {
  const entry: SessionBridgeEntry = { send };
  entries.set(campaignId, entry);
  return () => {
    if (entries.get(campaignId) === entry) entries.delete(campaignId);
  };
}

/**
 * Émetteur d'état de jeu pour la campagne, ou `null` si aucune session active n'est branchée
 * ici (donc : écriture hors session → le store retombe sur le chemin verrou de version).
 */
export function sessionSendFor(campaignId: string | null | undefined): SessionSend | null {
  if (!campaignId) return null;
  return entries.get(campaignId)?.send ?? null;
}
