/**
 * Catalogue FORMALISÉ des « énergies » restaurables d'un personnage — jauges fixes de
 * `Depletion` (PV, PM, chance, DR) et la seule réserve de capacité à clé PARTAGÉE stable en
 * dehors de ces jauges (`rage`, voie du guerrier — voir `sharedKey: 'rage'` dans
 * `src/data/classes/fighters.ts`). Source UNIQUE pour toute UI qui doit proposer « quelle
 * énergie restaurer » — aujourd'hui la potion consommable custom (PER-XXX). Ajouter une
 * nouvelle énergie restaurable à l'avenir (ex. une future jauge fixe) se fait ICI, et
 * `RESTORABLE_RESOURCES` la propage automatiquement au sélecteur.
 *
 * Les autres réserves à compteur d'usages (sept vies du chat, charges explosives…) restent
 * hors de ce catalogue : ce sont des compteurs PAR CAPACITÉ (clé = id de capacité, ou
 * `sharedKey` propre à une seule famille), pas des jauges universelles de personnage — les
 * exposer ici demanderait un sélecteur dynamique par personnage plutôt qu'une liste fixe.
 *
 * Module pur (aucune dépendance UI/réseau).
 */
import type { DamageDie } from '@/data/schema';

/** Clé stable de la réserve de rage (voie du guerrier, p. ex. `guerrier-rage-r2`), partagée
 * entre toutes les capacités qui y puisent — voir `usageCounter.sharedKey` dans les données. */
export const RAGE_RESOURCE_KEY = 'rage';

export const RESTORABLE_RESOURCE_KINDS = ['hp', 'mana', 'rage', 'luck', 'recoveryDice'] as const;

/** Énergie restaurable par une potion custom. */
export type RestorableResourceKind = (typeof RESTORABLE_RESOURCE_KINDS)[number];

/** Libellé long (français), pour les sélecteurs et le texte de la modale d'usage. */
export const RESTORABLE_RESOURCE_LABEL: Record<RestorableResourceKind, string> = {
  hp: 'points de vie (PV)',
  mana: 'points de mana (PM)',
  rage: 'points de rage',
  luck: 'points de chance',
  recoveryDice: 'dés de récupération',
};

/** Libellé court, pour un bouton/badge. */
export const RESTORABLE_RESOURCE_SHORT_LABEL: Record<RestorableResourceKind, string> = {
  hp: 'PV',
  mana: 'PM',
  rage: 'Rage',
  luck: 'Chance',
  recoveryDice: 'DR',
};

/** Nom de potion par défaut par ressource (« Potion de soin »…), utilisé par `potionDefaultName`. */
export const RESTORABLE_RESOURCE_POTION_NAME: Record<RestorableResourceKind, string> = {
  hp: 'Potion de soin',
  mana: 'Potion de mana',
  rage: 'Potion de rage',
  luck: 'Potion de chance',
  recoveryDice: 'Potion de récupération',
};

/** Description minimale d'une potion, pour générer son nom/sa notation par défaut. */
export interface PotionDiceSpec {
  die: DamageDie;
  count?: number;
  evolving?: true;
  modifier?: number;
}

/**
 * Notation de dés d'une potion (« 1d4° », « 2d6+4»…) — `count` absent = 1, `evolving` affiche le
 * placeholder en `°` (face réelle résolue au niveau du personnage, cf. `PotionDialog`), `modifier`
 * absent/0 = aucun bonus plat.
 */
export function potionDiceNotation(potion: PotionDiceSpec): string {
  const count = potion.count ?? 1;
  const base = `${count}${potion.die}${potion.evolving ? '°' : ''}`;
  const modifier = potion.modifier ?? 0;
  if (!modifier) return base;
  return `${base}${modifier > 0 ? '+' : ''}${modifier}`;
}

/**
 * Nom par défaut d'une potion (« Potion de soin 1d4° »), proposé quand le joueur ne saisit pas de
 * nom — dérivé de ses propriétés plutôt que laissé vide.
 */
export function potionDefaultName(potion: PotionDiceSpec & { resource: RestorableResourceKind }): string {
  return `${RESTORABLE_RESOURCE_POTION_NAME[potion.resource]} ${potionDiceNotation(potion)}`;
}
