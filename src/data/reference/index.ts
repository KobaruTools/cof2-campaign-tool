/**
 * AIDE-MÉMOIRE — point d'entrée du domaine de référence (PER-39).
 *
 * Ré-exporte le schéma et agrège les catalogues d'extraction. PER-40 (combat) est livré :
 * `maneuvers.ts`, `attack-modifiers.ts`, `special-actions.ts`, `tactical-options.ts`, plus les ÉTATS
 * préjudiciables ADAPTÉS de `STATUS_EFFECTS` via `statusEffectToReference()` (source unique — cf.
 * `schema.ts`, on ne les re-stocke pas ici). PER-41 (résolution) est livré : `tests.ts`, `damage.ts`,
 * `magic.ts`. PER-42 (environnement) est livré : `environment.ts` (poisons, pièges, structures, saut/chute/
 * feu/chaleur/froid), `encumbrance.ts` (déplacement / montures / marche forcée) et `travel.ts` (dangers du
 * voyage : dangerosité, test de progression, hiver) s'agrègent ici de la même façon. Pas de fichier `gear.ts` :
 * la Partie III n'a pas de bloc de règles « matériel d'aventure » distinct (les stats de matériel relèvent du
 * chapitre Équipement).
 */

export * from './schema';

import { STATUS_EFFECT_IDS } from '@/data/schema';
import type { ReferenceEntry, ReferenceTextEntry } from './schema';
import { statusEffectToReference } from './schema';
import { MANEUVERS } from './maneuvers';
import { ATTACK_MODIFIERS } from './attack-modifiers';
import { SPECIAL_ACTIONS } from './special-actions';
import { TACTICAL_OPTIONS } from './tactical-options';
import { TESTS } from './tests';
import { DAMAGE } from './damage';
import { MAGIC } from './magic';
import { ENVIRONMENT } from './environment';
import { ENCUMBRANCE } from './encumbrance';
import { TRAVEL } from './travel';

export { MANEUVERS } from './maneuvers';
export { ATTACK_MODIFIERS } from './attack-modifiers';
export { SPECIAL_ACTIONS } from './special-actions';
export { TACTICAL_OPTIONS } from './tactical-options';
export { TESTS } from './tests';
export { DAMAGE } from './damage';
export { MAGIC } from './magic';
export { ENVIRONMENT } from './environment';
export { ENCUMBRANCE } from './encumbrance';
export { TRAVEL } from './travel';

/**
 * Mots-clés de recherche (français) par état préjudiciable — l'adaptation ne connaît que l'id et le
 * verbatim, on enrichit donc les `tags` pour la recherche interne (le titre FR est déjà indexé).
 */
const STATE_TAGS: Record<(typeof STATUS_EFFECT_IDS)[number], string[]> = {
  blinded: ['aveuglé', 'cécité', 'attaque à distance'],
  weakened: ['affaibli', 'dé malus', 'tests'],
  winded: ['essoufflé', 'déplacement', 'fatigue'],
  dazed: ['étourdi', 'aucune action', 'DEF'],
  immobilized: ['immobilisé', 'déplacement', 'dé malus'],
  crippled: ['invalide', 'déplacement'],
  paralyzed: ['paralysé', 'critique', 'touché automatiquement'],
  slowed: ['ralenti', 'une action', 'round'],
  prone: ['renversé', 'se relever', 'DEF'],
  surprised: ['surpris', 'embuscade', 'premier round'],
};

/**
 * États préjudiciables (glossaire p. 214-215) ADAPTÉS en entrées d'aide-mémoire. Aucune donnée d'état
 * n'est recopiée : `statusEffectToReference()` projette `STATUS_EFFECTS` (verbatim + page portés par la
 * source unique). L'UI (fiche / tiroir MJ / page PER-46) pourra enrichir icône et `shortEffect` plus tard.
 */
export const COMBAT_STATES: ReferenceTextEntry[] = STATUS_EFFECT_IDS.map((id) =>
  statusEffectToReference(id, { tags: STATE_TAGS[id] }),
);

/**
 * Toutes les entrées d'aide-mémoire connues à ce jour (combat — PER-40 ; résolution — PER-41 ;
 * environnement / encombrement — PER-42).
 */
export const REFERENCE_ENTRIES: ReferenceEntry[] = [
  ...COMBAT_STATES,
  ...MANEUVERS,
  ...ATTACK_MODIFIERS,
  ...SPECIAL_ACTIONS,
  ...TACTICAL_OPTIONS,
  ...TESTS,
  ...DAMAGE,
  ...MAGIC,
  ...ENVIRONMENT,
  ...ENCUMBRANCE,
  ...TRAVEL,
];

/**
 * Index par `id`, sur le patron `featureById`/`equipmentById` (`@/data/index.ts`) : sert aux surfaces
 * qui n'ont pas besoin de la navigation section → sous-section (ex. un badge ponctuel sur la fiche qui
 * réutilise le VERBATIM d'une entrée précise, comme « Combat à deux armes » sur la carte d'attaque au
 * contact, PER-116) — une seule source de vérité, jamais de texte dupliqué à la main.
 */
export const referenceById: Map<string, ReferenceEntry> = new Map(
  REFERENCE_ENTRIES.map((e) => [e.id, e]),
);
