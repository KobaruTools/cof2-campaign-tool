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
 *
 * Par-dessus ce classement, l'ÉCRAN DE MJ relègue en fin de bande les combattants qui ne sont plus
 * dans le chemin (`relegateSidelined`, PER-302) : c'est une commodité d'affichage, pas une règle
 * d'initiative — la projection continue de rendre l'ordre nu.
 */

import { currentHp } from '@/lib/character/gauges';
import type { Depletion } from '@/lib/character/types';

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
 * Combattant dont on sait s'il encombre encore la bande. Comme `InitiativeCombatant`, c'est un
 * sous-ensemble de la ligne du tracker (`InitiativeRow`), qui se relègue donc telle quelle.
 */
export interface SidelinableCombatant {
  /** Clé stable du combattant. */
  key: string;
  /** Créature (PNJ) plutôt que personnage joueur. */
  isCreature: boolean;
  /** Masquée aux joueurs (œil fermé) : présente sur l'écran de MJ, absente de la projection. */
  hidden?: boolean;
  /** PV max ; `0` = inconnus (bloc de créature pas encore chargé). */
  maxHp: number;
  /** Jauges entamées, d'où se lisent les PV courants. */
  depletion: Depletion;
}

/**
 * Créature VAINCUE : une créature à 0 PV est morte, son tour n'existe plus. La règle est
 * ASYMÉTRIQUE et c'est voulu — un personnage joueur à 0 PV est à terre / mourant (p. 220), pas
 * mort : il garde sa place dans l'ordre et son tour. `maxHp > 0` : des PV max inconnus donneraient
 * 0 PV courants par défaut, on ne conclut donc rien d'un bloc pas encore chargé.
 */
export function isDefeatedCreature(combatant: SidelinableCombatant): boolean {
  return (
    combatant.isCreature && combatant.maxHp > 0 && currentHp(combatant.maxHp, combatant.depletion) === 0
  );
}

/** Groupe de relégation : plus le rang est haut, plus la carte est repoussée en fin de bande. */
export type SidelineRank = 0 | 1 | 2;

/**
 * Rang de relégation d'un combattant : `0` en scène, `1` masqué aux joueurs (renfort pas encore
 * entré en scène), `2` vaincu. Une créature à la fois masquée et vaincue est d'abord vaincue —
 * elle ne reviendra pas en scène.
 */
export function sidelineRank(combatant: SidelinableCombatant): SidelineRank {
  if (isDefeatedCreature(combatant)) return 2;
  if (combatant.hidden) return 1;
  return 0;
}

/**
 * Relègue en fin de bande les combattants hors du chemin (PER-302), l'entrée étant DÉJÀ classée par
 * `sortByInitiative` : le tri ne porte que sur le rang de groupe et, `Array#sort` étant stable,
 * l'initiative reste la clé de tri À L'INTÉRIEUR de chaque groupe. Copie ; l'entrée n'est pas mutée.
 *
 * `activeKey` (le combattant dont c'est le tour) est épargné, mais SEULEMENT s'il vient d'être
 * VAINCU : le MJ qui met à 0 PV la créature en train de jouer ne doit pas la voir filer au bout de la
 * bande sous son curseur. Elle rejoindra le groupe des vaincues au tour suivant, quand elle n'aura
 * plus la main. L'exemption ne vaut donc que pour ce changement de groupe SOUS le curseur.
 *
 * Elle ne s'étend surtout PAS aux MASQUÉES : une créature masquée l'est de longue date, sa carte est
 * déjà en fin de bande, et l'épargner la ferait REMONTER à sa place d'initiative le temps de son tour.
 * Le pas suivant repartant de cette position (le tour suit la bande affichée), le tour de table
 * bouclait sans fin sur les derniers combattants sans jamais franchir la fin de bande — donc sans
 * jamais incrémenter la manche. Constaté en recette (PER-302) avec un renfort masqué à l'initiative 15.
 */
export function relegateSidelined<T extends SidelinableCombatant>(
  rows: readonly T[],
  activeKey?: string | null,
): T[] {
  const rank = (row: T) => {
    const groupRank = sidelineRank(row);
    return groupRank === 2 && row.key === activeKey ? 0 : groupRank;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b));
}

/**
 * Tire une nouvelle graine de départage (SEULE fonction impure du module) : appelée à la
 * réinitialisation du combat, jamais pendant un rendu. Bornée à un entier 31 bits positif pour
 * rester lisible dans le blob persisté.
 */
export function randomTieBreakSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
