/**
 * OBJETS MAGIQUES — niveau de magie et valeur (PER-306).
 *
 * Module PUR (aucune dépendance à zustand/React) et testé, source unique du calcul du
 * niveau de magie d'un objet et de sa valeur en pièces d'or, plus le texte de règle
 * VERBATIM de chaque propriété avec sa page source (pour les infobulles de l'UI).
 *
 * Règles (livre de base, chapitre « Objets magiques ») :
 *  - Niveau de magie d'une ARME = son bonus, augmenté par ses propriétés (p. 251).
 *  - Niveau de magie d'un objet DÉFENSIF = son bonus (canal `magicDef`) modifié par ses
 *    propriétés — « chaque propriété vaut 1 niveau de magie sauf précision contraire » (p. 253).
 *  - Une propriété DOUBLÉE double son niveau de magie (p. 251/254).
 *  - VALEUR de l'objet = niveau de magie² × 200 po (p. 244).
 *
 * Ce ticket (306) ne pose QUE ce calcul + le socle de données (voir `types.ts`) ; les
 * EFFETS mécaniques (attaque, DM, RD, résistances…) sont câblés au ticket suivant (PER-307).
 */
import { DAMAGE_TYPE_LABEL } from '@/lib/ui/damageTypeLabels';
import type {
  MagicDefensePropertyKind,
  MagicProperty,
  MagicPropertyKind,
  MagicWeaponPropertyKind,
} from './types';

/**
 * Forme minimale attendue pour calculer un niveau de magie : les trois canaux qui y
 * contribuent. `EquipmentRef` comme `CustomItem` la satisfont structurellement.
 */
export interface MagicItemLike {
  /** +N d'ARME (attaque + DM), p. 251. */
  magicBonus?: number;
  /** +N de DÉFENSE magique (canal existant PER-85), p. 253. */
  magicDef?: number;
  /** Propriétés spéciales, p. 251-254. */
  magicProperties?: MagicProperty[];
}

/** Coût par niveau de magie² (p. 244 : « valeur égale à niveau × niveau × 200 »). */
export const MAGIC_ITEM_VALUE_PER_LEVEL_SQUARED = 200;

/** Familles de propriétés : armes (p. 251-252) vs défense (p. 253-254). */
export type MagicPropertyFamily = 'weapon' | 'defense';

/** Ordre d'affichage des kinds ARME (suit la présentation p. 251). */
export const MAGIC_WEAPON_PROPERTY_KINDS: readonly MagicWeaponPropertyKind[] = [
  'sharp',
  'bane',
  'elemental',
  'parry',
];

/** Ordre d'affichage des kinds DÉFENSE (suit la présentation p. 253). */
export const MAGIC_DEFENSE_PROPERTY_KINDS: readonly MagicDefensePropertyKind[] = [
  'free-action',
  'defense',
  'mobile',
  'swimming',
  'shadow',
  'protection',
  'magic-resistance',
  'resistance',
];

interface MagicPropertyRule {
  family: MagicPropertyFamily;
  /** Nom court de la propriété (français). */
  name: string;
  /** Texte de règle VERBATIM du livre (français), pour l'infobulle. */
  verbatim: string;
  /** Page imprimée source dans le livre de base. */
  sourcePage: number;
}

/**
 * Table des propriétés : nom, verbatim et page source. Le verbatim reprend fidèlement le
 * texte du livre (p. 251-254) — ne pas le reformuler.
 */
export const MAGIC_PROPERTY_RULES: Record<MagicPropertyKind, MagicPropertyRule> = {
  sharp: {
    family: 'weapon',
    name: 'Affûtée',
    verbatim:
      'Affûtée : augmente les chances de réussite critique de l’arme de 1 point et ajoute +1d4° DM aux attaques critiques.',
    sourcePage: 251,
  },
  bane: {
    family: 'weapon',
    name: 'Fléau des […]',
    verbatim:
      'Fléau des [catégorie de créatures] : l’arme inflige +1d4° DM contre une catégorie de créature (par exemple, les animaux, les démons, les goblinoïdes, les lanceurs de sorts, les morts-vivants, les lycanthropes, les élémentaires, etc.).',
    sourcePage: 251,
  },
  elemental: {
    family: 'weapon',
    name: 'Élément/substance',
    verbatim:
      '[Élément/substance] : l’arme inflige +1d4° DM d’un élément ou d’une substance spécifique (par exemple, le feu, le froid, l’acide, l’électricité, le poison, etc.).',
    sourcePage: 251,
  },
  parry: {
    family: 'weapon',
    name: 'Parade',
    verbatim: 'Parade : l’arme offre un bonus de DEF.',
    sourcePage: 251,
  },
  'free-action': {
    family: 'defense',
    name: 'Action libre',
    verbatim:
      'Action libre : le personnage ne peut pas être ralenti, immobilisé ou paralysé par magie. Il obtient un bonus de +5 à tous les tests pour résister à ce type d’effets préjudiciables s’il s’agit d’une contrainte physique.',
    sourcePage: 253,
  },
  defense: {
    family: 'defense',
    name: 'Défense',
    verbatim:
      'Défense : réduit de 2 tous les DM subis (RD 2, +1 niveau de magie) ou Défense supérieure (RD 4, +2 niveaux de magie).',
    sourcePage: 253,
  },
  mobile: {
    family: 'defense',
    name: 'Mobile',
    verbatim: 'Mobile : le malus d’armure est réduit de 4.',
    sourcePage: 253,
  },
  swimming: {
    family: 'defense',
    name: 'Natation',
    verbatim:
      'Natation : l’objet apporte un bonus de +5 aux tests de natation ; de plus, s’il s’agit d’une armure, elle flotte et permet au PJ de rester à la surface.',
    sourcePage: 253,
  },
  shadow: {
    family: 'defense',
    name: 'Ombre',
    verbatim:
      'Ombre : bonus de +5 aux tests de discrétion (AGI). On peut imaginer d’autres objets donnant des bonus de ce type (la célèbre cape d’elfe magique).',
    sourcePage: 253,
  },
  protection: {
    family: 'defense',
    name: 'Protection',
    verbatim: 'Protection : divise par 2 les DM des coups critiques et des attaques sournoises.',
    sourcePage: 253,
  },
  'magic-resistance': {
    family: 'defense',
    name: 'Résistance à la magie',
    verbatim:
      'Résistance à la magie : l’objet apporte un bonus de +5 en DEF ou aux tests pour résister à la magie.',
    sourcePage: 253,
  },
  resistance: {
    family: 'defense',
    name: 'Résistance [substance] X',
    verbatim:
      'Résistance [substance] X : le porteur retranche X points à tous les DM infligés par la substance indiquée. Par exemple, Résistance feu 10 indique que l’armure permet à son porteur de réduire de 10 les DM de feu qui lui sont infligés.',
    sourcePage: 253,
  },
};

/**
 * NORMALISE une propriété saisie : ne conserve que les paramètres pertinents pour son
 * `kind` (une Résistance garde substance+amount, une Défense garde tier…), plus `doubled`.
 * Évite de persister des paramètres orphelins laissés par un changement de type de propriété
 * dans la modale. Pur — testé dans `magicItem.test.ts`.
 */
export function normalizeMagicProperty(prop: MagicProperty): MagicProperty {
  const out: MagicProperty = { kind: prop.kind };
  switch (prop.kind) {
    case 'bane': {
      const category = prop.creatureCategory?.trim();
      if (category) out.creatureCategory = category;
      break;
    }
    case 'elemental':
      if (prop.substance) out.substance = prop.substance;
      break;
    case 'parry':
      if (prop.defBonus) out.defBonus = prop.defBonus;
      break;
    case 'defense':
      if (prop.tier === 2) out.tier = 2;
      break;
    case 'resistance':
      if (prop.substance) out.substance = prop.substance;
      if (prop.amount) out.amount = prop.amount;
      break;
    default:
      break;
  }
  if (prop.doubled) out.doubled = true;
  return out;
}

/** Libellé FR d'une substance (élément), avec repli sur la clé si non répertoriée. */
function substanceLabel(prop: MagicProperty): string {
  if (!prop.substance) return '';
  return DAMAGE_TYPE_LABEL[prop.substance] ?? prop.substance;
}

/**
 * NIVEAU DE MAGIE d'une seule propriété, doublage NON appliqué (contribution de base).
 *  - Affûtée / Fléau : +1 · Élément : +2 (p. 251).
 *  - Parade : bonus de DEF offert (p. 251).
 *  - Défense : +1 (RD 2) ou +2 si Défense supérieure (RD 4) (p. 253).
 *  - Toutes les autres propriétés défensives : +1 (« chaque propriété vaut 1 niveau », p. 253).
 */
function basePropertyMagicLevel(prop: MagicProperty): number {
  switch (prop.kind) {
    case 'elemental':
      return 2;
    case 'parry':
      return prop.defBonus ?? 0;
    case 'defense':
      return prop.tier === 2 ? 2 : 1;
    default:
      return 1;
  }
}

/**
 * NIVEAU DE MAGIE d'une propriété, doublage inclus : « lorsqu'une propriété est doublée,
 * le niveau de magie de la propriété est doublé également » (p. 251).
 */
export function propertyMagicLevel(prop: MagicProperty): number {
  const base = basePropertyMagicLevel(prop);
  return prop.doubled ? base * 2 : base;
}

/**
 * NIVEAU DE MAGIE total d'un objet = bonus d'arme (`magicBonus`) + bonus de défense
 * (`magicDef`) + somme des niveaux de ses propriétés (doublage inclus). Un objet donné ne
 * porte en pratique que l'un des deux bonus, mais les additionner reste correct (l'autre
 * vaut 0). Voir p. 251 (armes) / p. 253 (défense).
 */
export function magicLevel(item: MagicItemLike): number {
  const bonus = (item.magicBonus ?? 0) + (item.magicDef ?? 0);
  const props = (item.magicProperties ?? []).reduce(
    (sum, prop) => sum + propertyMagicLevel(prop),
    0,
  );
  return bonus + props;
}

/** VALEUR marchande en pièces d'or d'un objet de niveau de magie donné = niveau² × 200 (p. 244). */
export function magicItemValue(level: number): number {
  return level * level * MAGIC_ITEM_VALUE_PER_LEVEL_SQUARED;
}

/** Vrai si l'objet porte un enchantement chiffrable (bonus ou au moins une propriété). */
export function isMagicItem(item: MagicItemLike): boolean {
  return magicLevel(item) > 0 || (item.magicProperties?.length ?? 0) > 0;
}

/**
 * Libellé d'affichage d'une propriété, paramètres inclus (Fléau des démons, Feu, Résistance
 * feu 10, Défense supérieure…) — français, pour les badges de l'UI.
 */
export function magicPropertyLabel(prop: MagicProperty): string {
  const rule = MAGIC_PROPERTY_RULES[prop.kind];
  let label: string;
  switch (prop.kind) {
    case 'bane':
      label = prop.creatureCategory ? `Fléau des ${prop.creatureCategory}` : 'Fléau des […]';
      break;
    case 'elemental':
      label = substanceLabel(prop) || 'Élément';
      break;
    case 'parry':
      label = prop.defBonus ? `Parade +${prop.defBonus}` : 'Parade';
      break;
    case 'defense':
      label = prop.tier === 2 ? 'Défense supérieure' : 'Défense';
      break;
    case 'resistance': {
      const sub = substanceLabel(prop);
      label = `Résistance${sub ? ` ${sub.toLowerCase()}` : ''}${
        prop.amount != null ? ` ${prop.amount}` : ''
      }`;
      break;
    }
    default:
      label = rule.name;
  }
  return prop.doubled ? `${label} (doublée)` : label;
}
