/**
 * Moteur PUR du socle PNJ du MJ (PER-428) — logique testable, découplée du
 * réseau, SŒUR de `gmInventory.ts`/`loot.ts`. La persistance réelle (table
 * dédiée `campaign_npcs`, PAS un jsonb sur `Campaign`) passe par `repo.ts`
 * (`fetchNpcs`/`insertNpc`/`deleteNpc`, qui génèrent l'id côté base) : ce module
 * ne fait que tenir à jour la liste en mémoire côté UI après chaque réponse
 * réseau — aucune de ces fonctions ne mute son entrée.
 *
 * Extension PER-430 (catégories/tri/recherche) : les CATÉGORIES, elles, sont
 * persistées sur `Campaign.npcCategories` (jsonb, SŒUR de `GmInventoryCategory`)
 * — pas dans cette table — d'où des fonctions de catégorie séparées, qui opèrent
 * sur `NpcCategory[]` d'un côté et retournent, quand une catégorie disparaît, les
 * ids de PNJ à recatégoriser en `null` côté appelant (qui doit persister CHAQUE
 * PNJ affecté via `updateNpc`, en plus de la liste de catégories via `updateCampaign`).
 */
import { normalizeSearchText } from '../ui/searchText';
import type { Npc, NpcCategory } from './types';

function newId(): string {
  return crypto.randomUUID();
}

/** Ajoute un PNJ (typiquement celui renvoyé par `insertNpc`) en fin de liste. */
export function addNpc(npcs: Npc[], npc: Npc): Npc[] {
  return [...npcs, npc];
}

/** Retire un PNJ de la liste. No-op si l'id est inconnu. */
export function removeNpc(npcs: Npc[], id: string): Npc[] {
  return npcs.filter((n) => n.id !== id);
}

/** Remplace un PNJ par sa version à jour (typiquement celle renvoyée par `updateNpc`). */
export function replaceNpc(npcs: Npc[], updated: Npc): Npc[] {
  return npcs.map((n) => (n.id === updated.id ? updated : n));
}

/** Trie les PNJ par nom (ordre français), pour un affichage stable après création. */
export function sortNpcsByName(npcs: Npc[]): Npc[] {
  return [...npcs].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/** Ordre d'affichage des groupes de disposition (PER-430). */
const DISPOSITION_ORDER: Record<Npc['disposition'], number> = { ally: 0, neutral: 1, enemy: 2 };

/** Trie les PNJ par disposition (allié, neutre, ennemi), puis par nom au sein d'un groupe. */
export function sortNpcsByDisposition(npcs: Npc[]): Npc[] {
  return [...npcs].sort((a, b) => {
    const byDisposition = DISPOSITION_ORDER[a.disposition] - DISPOSITION_ORDER[b.disposition];
    return byDisposition !== 0 ? byDisposition : a.name.localeCompare(b.name, 'fr');
  });
}

/**
 * Trie les PNJ par Niveau de Challenge croissant (`challengeRating`, stub PER-431) —
 * les PNJ sans valeur renseignée retombent en FIN de liste (par nom), plutôt qu'en
 * tête (où `null` se comparerait avant tout nombre) : la stat n'existe pas encore
 * partout, elle ne doit pas sembler « plus faible que tout » par défaut.
 */
export function sortNpcsByChallenge(npcs: Npc[]): Npc[] {
  return [...npcs].sort((a, b) => {
    if (a.challengeRating === null && b.challengeRating === null) {
      return a.name.localeCompare(b.name, 'fr');
    }
    if (a.challengeRating === null) return 1;
    if (b.challengeRating === null) return -1;
    return a.challengeRating - b.challengeRating || a.name.localeCompare(b.name, 'fr');
  });
}

/**
 * Filtre les PNJ dont le nom OU la description matche `query` (recherche transverse
 * PER-430, insensible aux accents/ligatures — cf. `normalizeSearchText`). `query` vide
 * (ou blanche) → liste inchangée.
 */
export function filterNpcsByQuery(npcs: Npc[], query: string): Npc[] {
  const needle = normalizeSearchText(query.trim());
  if (!needle) return npcs;
  return npcs.filter((n) => {
    const haystack = normalizeSearchText(`${n.name} ${n.description ?? ''}`);
    return haystack.includes(needle);
  });
}

/** Ajoute une nouvelle catégorie de PNJ (dépliée) en fin de liste (PER-430). */
export function addNpcCategory(categories: NpcCategory[], name: string): NpcCategory[] {
  return [...categories, { id: newId(), name, collapsed: false }];
}

/** Renomme une catégorie de PNJ existante. No-op si l'id est inconnu. */
export function renameNpcCategory(categories: NpcCategory[], categoryId: string, name: string): NpcCategory[] {
  return categories.map((c) => (c.id === categoryId ? { ...c, name } : c));
}

/** Replie/déplie une catégorie de PNJ. No-op si l'id est inconnu. */
export function toggleNpcCategoryCollapsed(categories: NpcCategory[], categoryId: string): NpcCategory[] {
  return categories.map((c) => (c.id === categoryId ? { ...c, collapsed: !c.collapsed } : c));
}

/**
 * Supprime une catégorie de PNJ. Les PNJ ne sont JAMAIS supprimés : `reassignedNpcIds`
 * liste ceux qui la référençaient, pour que l'appelant les recatégorise en `null`
 * (mise à jour LOCALE via `reassignNpcsCategory`, PERSISTÉE via `updateNpc` un par un —
 * `categoryId` vit sur la ligne `campaign_npcs`, pas dans ce tableau de catégories).
 */
export function removeNpcCategory(
  categories: NpcCategory[],
  npcs: Npc[],
  categoryId: string,
): { categories: NpcCategory[]; reassignedNpcIds: string[] } {
  return {
    categories: categories.filter((c) => c.id !== categoryId),
    reassignedNpcIds: npcs.filter((n) => n.categoryId === categoryId).map((n) => n.id),
  };
}

/** Met à jour la `categoryId` locale des PNJ listés (après persistance serveur individuelle). */
export function reassignNpcsCategory(npcs: Npc[], npcIds: string[], categoryId: string | null): Npc[] {
  const ids = new Set(npcIds);
  return npcs.map((n) => (ids.has(n.id) ? { ...n, categoryId } : n));
}
