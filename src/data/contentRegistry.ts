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
  /**
   * Liens additifs voie↔peuple (PER-324) : rattache des voies de peuple (souvent PAYANTES) à un peuple
   * EXISTANT — base ou déjà fusionné. Contrairement à `mergeEntries` (base gagne, qui IGNORERAIT une
   * ré-définition de peuple), ces liens n'AJOUTENT que des ids à `Ancestry.ancestryPathIds`, sans jamais
   * en retirer : la « Voie du demi-elfe » du Compagnon vient s'ajouter aux voies humain/elfe du livre de
   * base sans réécrire le peuple. Nécessaire car un peuple gratuit ne peut pas lister en dur une voie
   * payante (le sélecteur afficherait l'id brut aux comptes non entitlés). Résolu par `mergeAncestryPathLinks`.
   */
  ancestryPathLinks?: AncestryPathLink[];
}

/** Rattachement additif d'une ou plusieurs voies de peuple à un peuple existant (cf. `ancestryPathLinks`). */
export interface AncestryPathLink {
  /** Id du peuple de base (ou déjà fusionné) à augmenter, ex. `'demi-elfe'`. */
  ancestryId: string;
  /** Ids de voies de peuple à AJOUTER à `ancestryPathIds` (celles absentes seulement). */
  pathIds: string[];
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

/**
 * Applique les `ancestryPathLinks` EN PLACE (PER-324). Pour chaque lien, on ajoute à
 * `ancestry.ancestryPathIds` les ids ABSENTS (jamais de doublon, jamais de retrait) — un peuple
 * introuvable est ignoré. Idempotente (rejouer n'ajoute rien). Renvoie le nombre d'ids réellement
 * ajoutés (0 → pas de bump de version). Pure hors la mutation du peuple ciblé.
 */
export function mergeAncestryPathLinks(
  ancestryById: Map<string, Ancestry>,
  links: AncestryPathLink[] | undefined,
): number {
  let added = 0;
  if (!links) return added;
  for (const link of links) {
    const ancestry = ancestryById.get(link.ancestryId);
    if (!ancestry) continue;
    for (const pathId of link.pathIds) {
      if (ancestry.ancestryPathIds.includes(pathId)) continue;
      ancestry.ancestryPathIds.push(pathId);
      added += 1;
    }
  }
  return added;
}

// Ré-exporte les types d'entité pour que les appelants n'aient pas à connaître le
// détail du schéma quand ils manipulent un `ContentBundle`.
export type { Ancestry, CharacterClass, Path, Feature, EquipmentItem };

// ────────────────────────────────────────────────────────────────────────────
// Origine payante d'une voie — badge « Compagnon » (PER-419 retours).
//
// `mergeEntries` n'est appelée QUE pour un lot payant (jamais pour les données de base,
// construites par import littéral) : tout id de `bundle.paths` est donc, par construction,
// une voie payante. On le note ici plutôt que de faire porter un champ `book`/`source` au
// schéma `Path` (qui n'en a pas — cf. `src/lib/ui/books.ts`), pour rester data-agnostique.
// ────────────────────────────────────────────────────────────────────────────

const paidPathIds = new Set<string>();

/** Marque ces ids de voie comme payants (appelé par `registerContentBundle` sur `bundle.paths`). */
export function markPathsPaid(pathIds: string[]): void {
  for (const id of pathIds) paidPathIds.add(id);
}

/** La voie `pathId` vient-elle d'un lot de contenu payant (Le Compagnon) ? */
export function isPaidPathId(pathId: string): boolean {
  return paidPathIds.has(pathId);
}

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

// ────────────────────────────────────────────────────────────────────────────
// État de chargement — même pub/sub que la version : un chargement en cours
// n'ajoute encore aucune entrée (pas de bump de version) mais les vues qui
// affichent un loader neutre le temps du chargement doivent quand même se
// re-rendre à son démarrage ET à sa fin (`loadPaidContent`).
// ────────────────────────────────────────────────────────────────────────────

let loading = false;

/** Un chargement de contenu payant (réseau ou cache) est-il en cours ? */
export function isContentLoading(): boolean {
  return loading;
}

/** Bascule l'état de chargement et notifie les abonnés (sans effet si inchangé). */
export function setContentLoading(value: boolean): void {
  if (loading === value) return;
  loading = value;
  for (const callback of subscribers) callback();
}
