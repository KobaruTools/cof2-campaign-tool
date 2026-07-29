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
 * de `merge_game_state` (migration 0012) — toute évolution doit rester alignée des deux côtés.
 */
export const GAME_STATE_KEYS = [
  'depletion',
  'effectToggles',
  'effectInputs',
  'usageCounters',
  'companionDepletion',
  'companionInstances',
  'mountedKey',
  'mounts',
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
 * Le patch (déjà « purement état de jeu » au sens `isGameStatePatch`) est-il fidèlement
 * persistable par `merge_game_state`, donc DIFFUSABLE sur le canal ? Toutes les clés de
 * l'allowlist sont des remplacements top-level fidèles SAUF `mounts`, fusionné finement par
 * `hp` : un patch `mounts` STRUCTUREL (ajout/retrait/barde) n'est PAS diffusable et doit
 * retomber sur le verrou de version (construction). Toutes les autres formes le sont.
 */
export function isBroadcastableGameStatePatch(character: Character, patch: GameStatePatch): boolean {
  if (patch.mounts !== undefined && !isHpOnlyMountsPatch(character.mounts, patch.mounts)) {
    return false;
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
 * Remplacement direct des clés top-level (elles portent l'état ABSOLU → dernier-arrivé-gagne),
 * SAUF `mounts` en fusion fine par id (ne pas écraser une construction de montures divergente
 * chez le pair). `mountedKey: null` (fil) → « à pied » (clé supprimée). Les clés hors allowlist
 * sont ignorées (défensif). Fonction PURE (aucun store, aucun réseau).
 */
export function applyRemoteGameStatePatch(
  character: Character,
  patch: Record<string, unknown>,
): Character {
  const next: Character = { ...character };
  for (const [k, v] of Object.entries(patch)) {
    if (!GAME_STATE_KEY_SET.has(k)) continue;
    if (k === 'mounts') {
      next.mounts = mergeMountHp(character.mounts, Array.isArray(v) ? v : []);
    } else if (k === 'mountedKey') {
      if (v == null) delete next.mountedKey;
      else next.mountedKey = String(v);
    } else {
      (next as unknown as Record<string, unknown>)[k] = v;
    }
  }
  return next;
}
