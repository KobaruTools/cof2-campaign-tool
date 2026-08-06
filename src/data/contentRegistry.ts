/**
 * Socle de gating du contenu payant « Le Compagnon » (PER-321) — la mécanique
 * GÉNÉRIQUE et data-agnostique qui rend les registres de règles AUGMENTABLES à
 * l'exécution. Aucun contenu payant n'entre ici (invariant légal : seul ce socle
 * est committable).
 *
 * Le moteur (wizard, résolution des capacités, montée de niveau, migrations)
 * consomme les registres de `@/data` de façon SYNCHRONE via des `Map`/tableaux
 * construits une fois au boot. Pour injecter du contenu payant APRÈS l'auth +
 * l'entitlement sans casser cette consommation, on FUSIONNE EN PLACE : on conserve
 * les mêmes objets `Array`/`Map` (les consommateurs en tiennent la référence) et on
 * y ajoute les entrées. Un `.get(id)` renvoie alors la nouvelle entrée sans qu'aucun
 * consommateur ne change ; un utilisateur non entitlé n'obtient que `undefined`
 * (l'élément payant est simplement absent — voir le fallback de la fiche).
 *
 * `index.ts` possède les conteneurs mutables et expose `registerContentBundle` ;
 * ce module fournit la primitive de fusion (pure, testée) et le pub/sub de version.
 */
import type {
  Ancestry,
  CharacterClass,
  Path,
  Feature,
  EquipmentItem,
} from './schema';

/**
 * Lot de contenu de construction de personnage à fusionner dans les registres de
 * base. Tous les champs sont optionnels : un supplément n'apporte que ce qu'il
 * définit. Les formes sont EXACTEMENT celles du schéma de base — le contenu payant
 * n'introduit aucune structure nouvelle, seulement de nouvelles entrées.
 */
export interface ContentBundle {
  ancestries?: Ancestry[];
  classes?: CharacterClass[];
  paths?: Path[];
  features?: Feature[];
  equipment?: EquipmentItem[];
}

/**
 * Conteneurs mutables d'un type d'entité : le tableau plat + son index par `id`,
 * qui PARTAGENT les mêmes instances que celles exportées par `@/data`. La fusion
 * mute ces deux structures en place.
 */
export interface RegistrySlot<T extends { id: string }> {
  list: T[];
  byId: Map<string, T>;
}

/** Compte-rendu d'une fusion (diagnostics de dev). */
export interface MergeReport {
  /** Nombre d'entrées réellement ajoutées. */
  added: number;
  /** Ids ignorés car déjà présents (base gagne) ou dupliqués dans le lot. */
  skipped: string[];
}

/**
 * Fusionne `entries` dans `slot` EN PLACE. Politique **additive, base gagne** : une
 * entrée dont l'`id` existe déjà (dans la base ou plus tôt dans le même lot) est
 * IGNORÉE — jamais de remplacement silencieux d'une règle de base par du contenu
 * payant. Idempotente : re-fusionner le même lot n'ajoute rien.
 */
export function mergeEntries<T extends { id: string }>(
  slot: RegistrySlot<T>,
  entries: T[] | undefined,
): MergeReport {
  const skipped: string[] = [];
  let added = 0;
  if (!entries) return { added, skipped };
  for (const entry of entries) {
    if (slot.byId.has(entry.id)) {
      skipped.push(entry.id);
      continue;
    }
    slot.byId.set(entry.id, entry);
    slot.list.push(entry);
    added += 1;
  }
  return { added, skipped };
}

// Ré-exporte les types d'entité pour que les appelants n'aient pas à connaître le
// détail du schéma quand ils manipulent un `ContentBundle`.
export type { Ancestry, CharacterClass, Path, Feature, EquipmentItem };

// ────────────────────────────────────────────────────────────────────────────
// Version de contenu — pub/sub minimal (aucune dépendance React).
//
// Chaque fusion réelle incrémente la version ; les composants qui doivent se
// re-rendre quand le contenu payant arrive (après le boot) s'abonnent via ce
// mécanisme (un hook `useSyncExternalStore` peut s'y brancher).
// ────────────────────────────────────────────────────────────────────────────

let version = 0;
const subscribers = new Set<() => void>();

/** Version courante du contenu (0 au boot, incrémentée à chaque fusion effective). */
export function getContentVersion(): number {
  return version;
}

/** S'abonne aux changements de contenu. Renvoie la fonction de désabonnement. */
export function subscribeContent(callback: () => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/** Incrémente la version et notifie les abonnés (appelé après une fusion effective). */
export function bumpContentVersion(): void {
  version += 1;
  for (const callback of subscribers) callback();
}
