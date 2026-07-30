/**
 * ORDRE D'INITIATIVE du tracker de combat (écran de MJ + fenêtre de projection) — couche PURE,
 * sans React ni accès réseau, partagée par les deux écrans pour qu'ils affichent EXACTEMENT le
 * même ordre.
 *
 * Le tri primaire reste l'initiative décroissante. À ÉGALITÉ, on applique dans l'ordre les règles
 * de table retenues :
 *  1. les PERSONNAGES JOUEURS passent avant les créatures ;
 *  2. la plus haute AGI passe devant (valeur effective, celle de la fiche / du bloc de créature) ;
 *  3. à défaut, l'ordre est TIRÉ AU SORT — mais de façon reproductible, via un `tieBreakSeed`
 *     persisté avec le combat (cf. `GmCombatState`) : le tirage est le même pour le MJ et pour la
 *     projection, il ne bouge pas d'un rendu à l'autre, et une nouvelle graine n'est tirée qu'à la
 *     RÉINITIALISATION du combat (= nouveau combat, nouveau tirage). Ce départage ne concerne que
 *     les joueurs : entre deux créatures, l'ordre d'ajout au combat est conservé (tri stable) —
 *     départager deux gobelins identiques n'apporte rien.
 */

/**
 * Combattant classable : le strict minimum dont l'ordre a besoin. Les lignes du tracker
 * (`InitiativeRow`) en sont un sur-ensemble et se trient donc telles quelles.
 */
export interface InitiativeCombatant {
  /** Clé stable du combattant (id de personnage OU d'instance de créature). */
  key: string;
  /** Valeur d'initiative (tri décroissant). */
  initiative: number;
  /** Créature (PNJ) plutôt que personnage joueur — les joueurs passent devant à égalité. */
  isCreature: boolean;
  /**
   * Valeur d'AGI EFFECTIVE (celle qui sert déjà aux dérivées). Absente = inconnue — cas d'un bloc
   * de créature que le livre imprime sans caractéristiques : elle passe alors DERRIÈRE tout
   * combattant dont l'AGI est connue, faute de pouvoir la comparer.
   */
  agility?: number;
}

/** AGI inconnue : classée derrière n'importe quelle valeur connue, y compris négative. */
const UNKNOWN_AGILITY = Number.NEGATIVE_INFINITY;

/**
 * Hachage 32 bits (FNV-1a) de la clé d'un combattant, mélangé à la graine du combat. Sert de
 * « tirage au sort » reproductible : deux clients qui partagent la même graine obtiennent le même
 * ordre, et la même paire de joueurs sera départagée autrement au combat suivant (nouvelle graine).
 */
function tieBreakHash(key: string, seed: number): number {
  let hash = 0x811c9dc5 ^ (seed | 0);
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Comparateur de l'ordre d'initiative (cf. règles en tête de fichier). Renvoie < 0 si `a` agit
 * avant `b`. `0` signifie « ordre d'entrée conservé » — cas des créatures à égalité parfaite,
 * que le tri stable laisse dans leur ordre d'ajout.
 */
export function compareInitiative(
  a: InitiativeCombatant,
  b: InitiativeCombatant,
  seed = 0,
): number {
  // 1. Initiative décroissante.
  if (a.initiative !== b.initiative) return b.initiative - a.initiative;
  // 2. Les joueurs sont toujours prioritaires sur les créatures.
  if (a.isCreature !== b.isCreature) return a.isCreature ? 1 : -1;
  // 3. La plus haute AGI d'abord (inconnue = dernière).
  const agilityA = a.agility ?? UNKNOWN_AGILITY;
  const agilityB = b.agility ?? UNKNOWN_AGILITY;
  if (agilityA !== agilityB) return agilityB - agilityA;
  // 4. Tirage au sort — entre JOUEURS seulement ; deux créatures gardent leur ordre d'ajout.
  if (a.isCreature) return 0;
  const hashA = tieBreakHash(a.key, seed);
  const hashB = tieBreakHash(b.key, seed);
  if (hashA !== hashB) return hashA - hashB;
  // Collision de hachage (très rare) : on retombe sur la clé pour garder un ordre TOTAL et stable.
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/**
 * Classe les combattants dans l'ordre d'initiative (copie ; l'entrée n'est pas mutée). `seed` est
 * la graine de départage du combat en cours (`GmCombatState.tieBreakSeed`).
 */
export function sortByInitiative<T extends InitiativeCombatant>(
  rows: readonly T[],
  seed = 0,
): T[] {
  return [...rows].sort((a, b) => compareInitiative(a, b, seed));
}

/**
 * Tire une nouvelle graine de départage (SEULE fonction impure du module) : appelée à la
 * réinitialisation du combat, jamais pendant un rendu. Bornée à un entier 31 bits positif pour
 * rester lisible dans le blob persisté.
 */
export function randomTieBreakSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
