/**
 * État de JEU synchronisable (PER-266, milestone PER-259) — l'allowlist des clés
 * d'état de jeu du blob `Character` et les primitives PURES qui les manipulent pour la
 * synchro temps réel de session (modèle « C1 : Broadcast-first »).
 *
 * Ces clés (et elles seules) transitent, pendant une session, par le chemin SANS verrou
 * de version : diffusion Broadcast + persistance via la RPC `merge_game_state` (0012).
 * L'allowlist ci-dessous coïncide EXACTEMENT avec celle de `merge_game_state` (les 7
 * clés top-level + `mounts` traité en fusion fine) — c'est cette coïncidence qui rend
 * l'aiguillage « par clés du patch » correct : un patch dont TOUTES les clés sont ici est
 * exactement ce que la base sait fusionner sans toucher `version`.
 *
 * La CONSTRUCTION (caractéristiques, capacités, inventaire, identité, bourse…) n'est PAS
 * ici : elle garde le verrou de version (`CharacterSyncNotifier`), chemin inchangé. Un
 * patch mixte (ex. `createElixir` → `usageCounters` + `equipment`) n'est donc PAS « purement
 * état de jeu » et retombe naturellement sur le verrou (atomique).
 */
import type { Character, OwnedMount } from './types';

/**
 * Clés top-level d'ÉTAT DE JEU synchronisées en session (allowlist). MIROIR de l'allowlist
 * de `merge_game_state` (migrations 0012 puis 0015) — toute évolution doit rester alignée des
 * deux côtés.
 *
 * `equipment` et `purse` (PER-266, migration 0015) sont ici bien qu'ils portent aussi de la
 * CONSTRUCTION (objets possédés, quantités) : leur part état de jeu — port (`worn` : main
 * principale/secondaire, équipé/non, deux mains), consommation de doses, argent gagné/dépensé —
 * est FRÉQUENTE en partie et mérite le chemin sans verrou. Faute d'id stable sur les lignes, on ne
 * peut pas fusionner finement (comme `mounts[].hp`) : `merge_game_state` REMPLACE le tableau
 * `equipment` / l'objet `purse` en entier (LWW valeur absolue). Une édition de CONSTRUCTION
 * d'inventaire concurrente (mode « Modifier ») peut donc être écrasée — rare en pleine partie,
 * risque assumé (cohérent avec l'ADR LWW).
 */
export const GAME_STATE_KEYS = [
  'depletion',
  'effectToggles',
  'effectInputs',
  'usageCounters',
  'companionDepletion',
  'transformationDepletion',
  'companionInstances',
  'mountedKey',
  'mounts',
  'equipment',
  'purse',
  // Cristaux activés (PER-360) : allumer/éteindre un cristal est un geste de PARTIE (action limitée,
  // p. 156), pas une édition de construction — et il doit se propager en direct, un porteur pouvant
  // rendre le cristal qu'on lui a confié depuis sa propre fiche.
  'activeCrystalIds',
] as const;

export type GameStateKey = (typeof GAME_STATE_KEYS)[number];

const GAME_STATE_KEY_SET: ReadonlySet<string> = new Set(GAME_STATE_KEYS);

/** Sous-ensemble d'un `Character` restreint aux clés d'état de jeu (un patch d'état de jeu). */
export type GameStatePatch = Partial<Pick<Character, GameStateKey>>;

/**
 * Le patch ne touche-t-il QUE des clés d'état de jeu (allowlist) ? C'est LE discriminant
 * d'aiguillage : `true` → chemin session (broadcast + merge sans verrou) ; `false` (patch
 * mixte, de construction, ou vide) → chemin verrou de version inchangé. Un patch vide vaut
 * `false` (rien à faire, cf. contrat « patch vide = aucune écriture »).
 */
export function isGameStatePatch(patch: Partial<Character>): boolean {
  const keys = Object.keys(patch);
  return keys.length > 0 && keys.every((k) => GAME_STATE_KEY_SET.has(k));
}

/**
 * Le patch touche-t-il AU MOINS une clé d'état de jeu (allowlist) ? Discriminant de routage :
 * `true` → passe par `applyGameState` (qui gère pur ET mixte : diffusion de la part état de jeu +
 * persistance adéquate) ; `false` (construction pure : nom, identité, caractéristiques…) → `upsert`.
 */
export function containsGameStateKey(patch: Partial<Character>): boolean {
  return Object.keys(patch).some((k) => GAME_STATE_KEY_SET.has(k));
}

/**
 * Extrait du patch sa part ÉTAT DE JEU (les clés de l'allowlist présentes, `mounts` inclus tel
 * quel), ou `null` si aucune. Sert à diffuser la part état de jeu, même d'un patch MIXTE (repos long
 * avec élixirs, création d'élixir, ajout de monture + interrupteur…), pour une synchro live pendant
 * que la construction est persistée par le verrou de version. La FORME du merge de `mounts` chez le
 * pair (fusion fine vs remplacement) est décidée par le flag `replaceMounts` du message, pas ici.
 */
export function gameStateSlice(patch: Partial<Character>): GameStatePatch | null {
  const slice: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (GAME_STATE_KEY_SET.has(k)) slice[k] = v;
  }
  return Object.keys(slice).length > 0 ? (slice as GameStatePatch) : null;
}

/**
 * Le patch de montures ne change-t-il QUE des PV (`hp`) — donc synchronisable par le canal
 * d'état de jeu ? `merge_game_state` (et son miroir client `mergeMountHp`) ne fusionne QUE le
 * `hp` par id : un AJOUT/RETRAIT de monture ou un changement de CONSTRUCTION (barde, nom,
 * catalogId) ne serait pas persisté et disparaîtrait au prochain rechargement. Ces changements
 * doivent donc repasser par le verrou de version. Compare le patch `mounts` à l'état actuel par id.
 */
export function isHpOnlyMountsPatch(current: OwnedMount[], patchMounts: OwnedMount[]): boolean {
  if (patchMounts.length !== current.length) return false; // ajout ou retrait
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const pm of patchMounts) {
    const cm = byId.get(pm.id);
    if (!cm) return false; // id inconnu → retrait + ajout combinés
    if (pm.catalogId !== cm.catalogId || pm.name !== cm.name || pm.bardeId !== cm.bardeId) {
      return false; // changement de construction (barde/nom/catalogId)
    }
  }
  return true;
}

/**
 * Représentation « fil » d'un patch d'état de jeu (pour Broadcast + `merge_game_state`) :
 * les valeurs `undefined` (ex. `mountedKey` remis à « à pied ») deviennent `null` EXPLICITES.
 * Sans ça, `JSON` effacerait la clé et un merge qui ne la VOIT pas ne pourrait pas la remettre
 * à zéro chez les pairs (ni en base) — le démontage ne se propagerait jamais.
 */
export function toWireGameStatePatch(patch: GameStatePatch): Record<string, unknown> {
  const wire: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) wire[k] = v === undefined ? null : v;
  return wire;
}

/**
 * Fusion FINE des PV de monture par id — miroir client de `merge_mount_hp` (0012). On ne
 * remplace QUE le `hp` des montures dont l'id figure dans le patch ; la construction
 * (`catalogId`, `bardeId`, `name`) et les montures absentes du patch sont préservées. Les
 * ids inconnus du patch sont ignorés (impossible d'ajouter/retirer une monture par ce canal —
 * ça reste de la construction). Honore le principe ADR « clés d'état de jeu disjointes ».
 */
export function mergeMountHp(current: OwnedMount[], patch: readonly unknown[]): OwnedMount[] {
  const hpById = new Map<string, OwnedMount['hp']>();
  for (const pm of patch) {
    if (pm && typeof pm === 'object' && 'id' in pm) {
      const id = String((pm as { id: unknown }).id);
      const hp = (pm as { hp?: unknown }).hp;
      hpById.set(id, (hp && typeof hp === 'object' ? hp : {}) as OwnedMount['hp']);
    }
  }
  return current.map((m) => (hpById.has(m.id) ? { ...m, hp: hpById.get(m.id) ?? {} } : m));
}

/**
 * Applique un patch d'état de jeu REÇU (représentation « fil ») à un personnage, EN MÉMOIRE.
 * Remplacement direct des clés top-level (elles portent l'état ABSOLU → dernier-arrivé-gagne).
 * `mountedKey: null` (fil) → « à pied » (clé supprimée). Les clés hors allowlist sont ignorées.
 *
 * `mounts` a deux modes selon l'émetteur (flag `replaceMounts` du message) :
 *  - **fusion fine par id** (défaut, changement de PV) : ne remplace que le `hp`, préserve la
 *    construction et les montures que le pair aurait en plus (évite l'écrasement concurrent) ;
 *  - **remplacement complet** (`replaceMounts`, changement STRUCTUREL : ajout/retrait/barde) : le
 *    tableau reçu fait foi (LWW sur toute la liste) — car la fusion fine ne sait ni ajouter ni retirer.
 *
 * Fonction PURE (aucun store, aucun réseau).
 */
export function applyRemoteGameStatePatch(
  character: Character,
  patch: Record<string, unknown>,
  opts: { replaceMounts?: boolean } = {},
): Character {
  const next: Character = { ...character };
  for (const [k, v] of Object.entries(patch)) {
    if (!GAME_STATE_KEY_SET.has(k)) continue;
    if (k === 'mounts') {
      const arr = (Array.isArray(v) ? v : []) as OwnedMount[];
      next.mounts = opts.replaceMounts ? arr : mergeMountHp(character.mounts, arr);
    } else if (k === 'mountedKey') {
      if (v == null) delete next.mountedKey;
      else next.mountedKey = String(v);
    } else {
      (next as unknown as Record<string, unknown>)[k] = v;
    }
  }
  return next;
}
