/**
 * Créature **créée à la main** par le MJ pour le combat en cours (hors bestiaire).
 *
 * Le MJ a souvent besoin d'un adversaire qui n'est dans aucun livre : un PNJ improvisé, une
 * variante bricolée à la volée, un piège animé. Plutôt qu'une entrée de bestiaire (contenu de
 * livre, ingéré, gaté par source), on stocke un **bloc minimal saisi à la main sur l'instance
 * de combat** : il voyage avec l'état de combat (persistance `campaign_combat` + diffusion
 * Realtime), donc la projection et l'écran joueur l'affichent sans rien charger.
 *
 * Seuls **initiative, points de vie et défense** sont obligatoires (ce que le tracker exige
 * pour classer, jauger et opposer) ; tout le reste est facultatif.
 *
 * Module PUR (aucun React, aucun réseau) : types, normalisation défensive et projection vers
 * un bloc de bestiaire SYNTHÉTIQUE — ce qui permet de réutiliser tel quel le rendu
 * `BestiaryStatBlock` et toute la dérivation des lignes d'initiative.
 */
import type { Creature } from '@/data/schema';
import { creatureNcLabel } from '@/lib/ui/creature';

/** Slug porté par une instance de créature créée à la main (aucune entrée de bestiaire derrière). */
export const CUSTOM_CREATURE_SLUG = 'custom';

/** Nom affiché en dernier recours quand l'instance n'a pas de nom (saisie non nommée). */
export const CUSTOM_CREATURE_FALLBACK_NAME = 'Créature';

/** Longueur maximale d'un champ court saisi à la main (mode d'attaque, bonus, DM, portée). */
export const CUSTOM_FIELD_MAX_LENGTH = 60;

/** Longueur maximale d'un texte long saisi à la main (description, texte de capacité). */
export const CUSTOM_TEXT_MAX_LENGTH = 1000;

/** Nombre maximal d'attaques / de capacités saisissables (garde-fou de saisie). */
export const CUSTOM_LIST_MAX_LENGTH = 10;

/** Attaque saisie à la main. Seul le mode (`name`) est requis ; le reste est verbatim libre. */
export interface CustomCreatureAttack {
  /** Mode d'attaque (ex. « Épée longue », « Morsure »). */
  name: string;
  /** Bonus à l'attaque, verbatim (ex. « +7 ») — parsé pour les pastilles ajustables du tracker. */
  bonus?: string;
  /** Dégâts, verbatim (ex. « 1d8+3 »). */
  damage?: string;
  /** Portée, verbatim (ex. « 20 m ») — sa PRÉSENCE marque l'attaque comme étant à distance. */
  range?: string;
}

/** Capacité spéciale saisie à la main (titre + texte libre). */
export interface CustomCreatureAbility {
  /** Nom de la capacité (ex. « Souffle (L) »). */
  name: string;
  /** Texte de règle libre. */
  text: string;
}

/**
 * Bloc de stats d'une créature créée à la main. Le NOM n'est PAS ici : il vit sur l'instance
 * de combat (`CreatureInstance.name`, PER-295), qui gère déjà l'étiquetage et la numérotation
 * des homonymes.
 */
export interface CustomCreature {
  /** Initiative (OBLIGATOIRE) — classe la créature dans l'ordre du tracker. */
  initiative: number;
  /** Points de vie (OBLIGATOIRE) — capacité de la jauge de PV. */
  hitPoints: number;
  /** Défense (OBLIGATOIRE) — opposée aux attaques, ajustée par les états. */
  defense: number;
  /** Agilité — sert UNIQUEMENT à départager les égalités d'initiative. Facultative. */
  agility?: number;
  /** NC verbatim (ex. « 3 », « ½ ») affiché en pastille. Facultatif. */
  nc?: string;
  /** Description / notes libres du MJ. Facultative. */
  description?: string;
  /** Attaques. Facultatives. */
  attacks?: CustomCreatureAttack[];
  /** Capacités spéciales. Facultatives. */
  specialAbilities?: CustomCreatureAbility[];
}

/** Chaîne nettoyée et tronquée, ou `undefined` si vide (un champ vide n'est jamais persisté). */
function cleanText(raw: unknown, maxLength: number): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

/** Entier fini, ou `undefined` (les stats d'une créature sont entières). */
function cleanNumber(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return Math.trunc(raw);
}

/** Attaques normalisées : celles sans mode d'attaque sont écartées ; liste plafonnée. */
function normalizeAttacks(raw: unknown): CustomCreatureAttack[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: CustomCreatureAttack[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Partial<CustomCreatureAttack>;
    const name = cleanText(entry.name, CUSTOM_FIELD_MAX_LENGTH);
    if (!name) continue;
    const bonus = cleanText(entry.bonus, CUSTOM_FIELD_MAX_LENGTH);
    const damage = cleanText(entry.damage, CUSTOM_FIELD_MAX_LENGTH);
    const range = cleanText(entry.range, CUSTOM_FIELD_MAX_LENGTH);
    out.push({ name, ...(bonus ? { bonus } : {}), ...(damage ? { damage } : {}), ...(range ? { range } : {}) });
    if (out.length === CUSTOM_LIST_MAX_LENGTH) break;
  }
  return out.length > 0 ? out : undefined;
}

/** Capacités normalisées : celles sans nom ET sans texte sont écartées ; liste plafonnée. */
function normalizeAbilities(raw: unknown): CustomCreatureAbility[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: CustomCreatureAbility[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const entry = item as Partial<CustomCreatureAbility>;
    const name = cleanText(entry.name, CUSTOM_FIELD_MAX_LENGTH);
    const text = cleanText(entry.text, CUSTOM_TEXT_MAX_LENGTH);
    if (!name && !text) continue;
    out.push({ name: name ?? '', text: text ?? '' });
    if (out.length === CUSTOM_LIST_MAX_LENGTH) break;
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Normalise un bloc saisi à la main (ou relu d'un état persisté / d'un broadcast) : entiers
 * tronqués, textes rognés/plafonnés, champs vides omis, listes bornées.
 *
 * Renvoie `undefined` si le **socle obligatoire** (initiative, PV, défense) n'est pas au
 * complet : un tel bloc ne pourrait ni être classé ni être joué, on refuse de le retenir.
 */
export function normalizeCustomCreature(raw: unknown): CustomCreature | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const entry = raw as Partial<CustomCreature>;
  const initiative = cleanNumber(entry.initiative);
  const hitPoints = cleanNumber(entry.hitPoints);
  const defense = cleanNumber(entry.defense);
  if (initiative === undefined || hitPoints === undefined || defense === undefined) return undefined;
  const agility = cleanNumber(entry.agility);
  const nc = cleanText(entry.nc, CUSTOM_FIELD_MAX_LENGTH);
  const description = cleanText(entry.description, CUSTOM_TEXT_MAX_LENGTH);
  const attacks = normalizeAttacks(entry.attacks);
  const specialAbilities = normalizeAbilities(entry.specialAbilities);
  return {
    initiative,
    // Des PV négatifs n'ont pas de sens pour une jauge : plancher à 0.
    hitPoints: Math.max(0, hitPoints),
    defense,
    ...(agility !== undefined ? { agility } : {}),
    ...(nc ? { nc } : {}),
    ...(description ? { description } : {}),
    ...(attacks ? { attacks } : {}),
    ...(specialAbilities ? { specialAbilities } : {}),
  };
}

/**
 * Projette un bloc saisi à la main en `Creature` SYNTHÉTIQUE — jamais persistée, jamais
 * ingérée : elle n'existe que le temps d'un rendu. Tout le reste de l'app (bloc de stats du
 * bestiaire, dérivation des lignes d'initiative, pastilles DEF/attaque ajustées par les états)
 * consomme alors une créature manuelle EXACTEMENT comme une créature de livre.
 *
 * Deux champs sont INERTES ici, imposés par le type `Creature` :
 *  - `category` (section du livre) — le bloc de stats ne l'affiche pas ;
 *  - `sourcePage` à 0 — sentinelle « pas de page de livre » : le renvoi `SourceRef` est omis.
 * `abilities` est délibérément absent : le MJ ne saisit pas les 7 caractéristiques (la grille
 * ne s'affiche donc pas), seule l'AGI de départage est conservée, hors bloc.
 */
export function customCreatureBlob(
  custom: CustomCreature,
  name: string = CUSTOM_CREATURE_FALLBACK_NAME,
): Creature {
  return {
    id: CUSTOM_CREATURE_SLUG,
    name: name || CUSTOM_CREATURE_FALLBACK_NAME,
    category: 'humanoides',
    ...(custom.nc ? { ncNote: custom.nc } : {}),
    ...(custom.description ? { description: custom.description } : {}),
    defense: custom.defense,
    hitPoints: custom.hitPoints,
    initiative: custom.initiative,
    ...(custom.attacks ? { attacks: custom.attacks } : {}),
    ...(custom.specialAbilities ? { specialAbilities: custom.specialAbilities } : {}),
    sourcePage: 0,
  };
}

/**
 * Convertit une créature du bestiaire en bloc `CustomCreature` — la COPIE FIGÉE
 * consommée par la fiche PNJ (PER-431) quand le MJ choisit « Depuis le bestiaire » :
 * une fois produite, cette copie n'a plus aucun lien avec `creature` (aucune référence
 * conservée), exactement comme une saisie manuelle, et s'édite librement ensuite.
 *
 * Renvoie `undefined` si le socle obligatoire (initiative/PV/défense) manque en
 * bestiaire — arrive pour une entrée GABARIT imprimée sans bloc chiffré (ex. « Zombie »,
 * p. 301) : un tel bloc ne serait de toute façon pas jouable au tracker.
 *
 * Simplifications assumées (perte de fidélité acceptée par le choix de réutiliser
 * `CustomCreature` plutôt qu'un second type de bloc) : `attackCount`/`rider` des
 * attaques et `richText` des capacités ne sont pas repris (`CustomCreatureAttack`/
 * `CustomCreatureAbility` ne les portent pas) ; les badges de réduction de dégâts
 * (`damageReduction`) et la grille de caractéristiques ne sont pas copiés non plus.
 */
export function customCreatureFromBestiary(creature: Creature): CustomCreature | undefined {
  return normalizeCustomCreature({
    initiative: creature.initiative,
    hitPoints: creature.hitPoints,
    defense: creature.defense,
    agility: creature.abilities?.AGI,
    nc: creatureNcLabel(creature) ?? undefined,
    description: creature.description,
    attacks: creature.attacks,
    specialAbilities: creature.specialAbilities,
  });
}
