/**
 * Moteur PUR du socle PNJ du MJ (PER-428) — logique testable, découplée du
 * réseau, SŒUR de `gmInventory.ts`/`loot.ts`. La persistance réelle (table
 * dédiée `campaign_npcs`, PAS un jsonb sur `Campaign`) passe par `repo.ts`
 * (`fetchNpcs`/`insertNpc`/`deleteNpc`, qui génèrent l'id côté base) : ce module
 * ne fait que tenir à jour la liste en mémoire côté UI après chaque réponse
 * réseau — aucune de ces fonctions ne mute son entrée.
 */
import type { Npc } from './types';

/** Ajoute un PNJ (typiquement celui renvoyé par `insertNpc`) en fin de liste. */
export function addNpc(npcs: Npc[], npc: Npc): Npc[] {
  return [...npcs, npc];
}

/** Retire un PNJ de la liste. No-op si l'id est inconnu. */
export function removeNpc(npcs: Npc[], id: string): Npc[] {
  return npcs.filter((n) => n.id !== id);
}

/** Trie les PNJ par nom (ordre français), pour un affichage stable après création. */
export function sortNpcsByName(npcs: Npc[]): Npc[] {
  return [...npcs].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
