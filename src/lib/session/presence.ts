/**
 * Présence de session de table synchronisée (PER-265, milestone PER-259) — modèle
 * du payload annoncé sur le canal Realtime `session:<campaign_id>` et dérivation de
 * la liste « qui est connecté » à partir de l'état de présence brut.
 *
 * Chaque appareil membre, une fois abonné au canal, `track()` un payload décrivant
 * QUI il est (MJ, joueur du roster, ou fenêtre projetée). Les pairs reçoivent ces
 * payloads via Realtime Presence (events `sync`/`join`/`leave`) et affichent la liste.
 *
 * La **fenêtre projetée** (PER-268) annoncera `kind: 'projection'` : c'est un écran,
 * pas une personne — elle transite dans l'état de présence mais est EXCLUE de la
 * liste affichée (et n'écrit aucune entrée de journal). Le marqueur est prévu ici
 * dès maintenant même si la projection n'est recâblée qu'à PER-268.
 */

/** Nature d'un présent sur le canal de session. */
export type SessionPresenceKind = 'gm' | 'player' | 'projection';

/**
 * Payload annoncé par un client via `channel.track()`. Se suffit à lui-même : il
 * porte le `name` d'affichage pour que les pairs n'aient PAS à re-résoudre le roster.
 * (Clés en anglais — donnée sérialisée ; `name` reste une valeur affichée en français.)
 */
export interface SessionPresencePayload {
  kind: SessionPresenceKind;
  /** Id du joueur de roster (null pour le MJ et la projection). */
  playerId: string | null;
  /** Libellé d'affichage (« MJ », nom du joueur…). */
  name: string;
  /** Horodatage ISO de l'annonce (départage le multi-onglets à l'affichage). */
  onlineAt: string;
}

/** Une personne connectée, telle qu'affichée dans la liste « qui est connecté ». */
export interface SessionPresenceEntry {
  /** Clé de présence stable et unique par personne (`gm` / `player:<id>`). */
  key: string;
  kind: Exclude<SessionPresenceKind, 'projection'>;
  playerId: string | null;
  name: string;
}

/**
 * Clé de présence d'une identité — stable par PERSONNE, pas par appareil : deux
 * onglets d'un même joueur partagent la clé et se fondent donc en une seule pastille
 * (la personne reste « connectée » tant qu'au moins un onglet est ouvert).
 */
export function presenceKeyFor(kind: SessionPresenceKind, playerId: string | null): string {
  if (kind === 'gm') return 'gm';
  if (kind === 'projection') return 'projection';
  return `player:${playerId ?? 'unknown'}`;
}

/**
 * État de présence brut de Realtime : une map `clé → payloads[]` (plusieurs payloads
 * par clé = plusieurs onglets de la même personne). Volontairement permissif sur le
 * type (le SDK renvoie des enregistrements non typés).
 */
export type RawPresenceState = Record<string, ReadonlyArray<Record<string, unknown>>>;

/**
 * Dérive la liste affichable des présents depuis l'état de présence brut :
 *  - **une entrée par clé** (donc par personne, multi-onglets fondu) ;
 *  - **exclut la projection** (écran, pas une personne) et toute clé illisible ;
 *  - **tri déterministe** : le MJ d'abord, puis les joueurs par nom (ordre local FR).
 *
 * Fonction PURE (testée) : aucune dépendance au SDK ni au DOM.
 */
export function presenceListFromState(state: RawPresenceState): SessionPresenceEntry[] {
  const entries: SessionPresenceEntry[] = [];

  for (const [key, payloads] of Object.entries(state)) {
    // On prend le premier payload de la clé (les onglets d'une même personne
    // annoncent la même identité ; seul le `name`/`onlineAt` pourrait différer).
    const raw = payloads[0];
    if (!raw) continue;
    const kind = raw.kind;
    if (kind !== 'gm' && kind !== 'player') continue; // exclut projection / illisible

    const playerId = typeof raw.playerId === 'string' ? raw.playerId : null;
    const name = typeof raw.name === 'string' && raw.name.trim() !== '' ? raw.name : 'Anonyme';
    entries.push({ key, kind, playerId, name });
  }

  entries.sort((a, b) => {
    // MJ toujours en tête.
    if (a.kind !== b.kind) return a.kind === 'gm' ? -1 : 1;
    return a.name.localeCompare(b.name, 'fr');
  });

  return entries;
}
