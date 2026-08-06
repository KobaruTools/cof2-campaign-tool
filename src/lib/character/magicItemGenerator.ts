/**
 * GÉNÉRATEUR D'OBJETS MAGIQUES « selon le livre » (PER-308).
 *
 * Module PUR et testable (aucune dépendance zustand/React/réseau). Il déroule les TABLES
 * DE GÉNÉRATION ALÉATOIRE PAR CATÉGORIE du livre de base (chapitre « Objets magiques »,
 * p. 244-255) pour produire un VRAI objet enchanté — une `EquipmentLine` réutilisant le
 * modèle des tickets 1/2 (`magicBonus`/`magicDef`/`magicProperties`, cf. `magicItem.ts` et
 * `magicItemEffects.ts`) quand l'objet existe au catalogue, sinon un objet libre descriptif
 * (anneau, potion, parchemin, baguette, objet de pouvoir…).
 *
 * IMPORTANT (p. 245) : le livre déclare EXPLICITEMENT qu'il n'a PAS de table unique
 * « un dé → un trésor ». Il fournit à la place, par CATÉGORIE, des tables d'inspiration
 * (p. 247). C'est exactement ce qu'on outille ici — le MJ choisit la catégorie.
 *
 * ALÉA INJECTÉ (`roll: RollDie`) pour rester déterministe en test : `roll(n)` renvoie un
 * entier dans `[1, n]` (un « dN »). L'UI fournit un `roll` basé sur `Math.random`. Aucune
 * fonction ne mute son entrée.
 *
 * Toutes les valeurs des tables viennent du PDF avec leur page source (`sourcePage`) ; le
 * texte affiché reste en français, le code en anglais (règle projet).
 */
import {
  magicItemValue,
  magicLevel as computeMagicLevel,
  magicPropertyLabel,
} from './magicItem';
import type { CustomItem, EquipmentLine, EquipmentRef, MagicProperty } from './types';

/** Cadre de jeu (p. 244) — pilote le niveau de magie recommandé selon le niveau du PJ. */
export type GameFrame = 'classic' | 'high' | 'low';

/** Catégories générables (V1, tout sauf grimoires qui n'ont pas de table, p. 256). */
export type MagicItemCategory =
  | 'potion'
  | 'scroll'
  | 'wand'
  | 'weapon'
  | 'defense'
  | 'power';

/** Lance un « dN » : renvoie un entier dans `[1, sides]`. Injecté pour les tests. */
export type RollDie = (sides: number) => number;

/** Paramètres de génération saisis par le MJ dans l'onglet Butin. */
export interface GenerateRequest {
  /** Niveau du personnage (1-20), pour lire la table de puissance p. 244. */
  characterLevel: number;
  /** Cadre de jeu (p. 244). */
  frame: GameFrame;
  /** Catégorie d'objet à générer. */
  category: MagicItemCategory;
  /**
   * Objet MINEUR (p. 244 : « divisez le niveau du PJ par 2 pour déterminer la colonne »).
   * Pilote aussi le rang des parchemins/baguettes (table « mineur / moyen », p. 250).
   */
  minor?: boolean;
  /**
   * AJOUTER UNE ORIGINE narrative (PER-309, table p. 247) : trois d10 (provenance / époque /
   * peuple) dont la légende est ajoutée à la description de l'objet. PUREMENT narratif, aucune
   * règle. Ignoré pour les consommables (potions/parchemins), non adaptés selon le livre —
   * voir `originAllowedForCategory`.
   */
  withOrigin?: boolean;
}

/** Un jet de dé journalisé, pour afficher la provenance de l'objet dans l'UI. */
export interface GeneratedRoll {
  /** Ce que le dé détermine (français), ex. « Type d'arme ». */
  label: string;
  /** Notation du dé, ex. « d6 », « d20 », « 2d20 ». */
  die: string;
  /** Résultat brut du (des) dé(s). */
  result: number;
  /** Issue lue dans la table (français), ex. « Épée longue ». */
  outcome: string;
}

/** Objet magique généré : la ligne d'inventaire + ses métadonnées d'affichage. */
export interface GeneratedMagicItem {
  /** L'objet prêt à mettre en réserve ou à donner à un joueur. */
  line: EquipmentLine;
  /** Catégorie d'origine. */
  category: MagicItemCategory;
  /**
   * Niveau de magie de l'objet. Pour armes/défense il vaut `magicLevel(line)` ; pour les
   * consommables (potions/parchemins) il vaut 0 (p. 248/249) ; pour baguettes et objets de
   * pouvoir il suit la règle propre à la catégorie (p. 250/255) et n'est PAS dérivable des
   * canaux `magicBonus`/`magicDef` (l'objet accorde un SORT, pas un bonus chiffré).
   */
  magicLevel: number;
  /** Valeur marchande = niveau de magie² × 200 po (p. 244). 0 pour les consommables. */
  value: number;
  /** Page principale de la table utilisée. */
  sourcePage: number;
  /** Nom court complet (français), ex. « Épée longue +2, ardente ». */
  summary: string;
  /** Journal des jets, pour l'affichage « selon le livre » dans l'UI. */
  rolls: GeneratedRoll[];
  /**
   * Origine narrative (PER-309, p. 247) si `withOrigin` était demandé ET la catégorie s'y prête
   * (absente pour les consommables potions/parchemins). Aucune incidence sur les règles ; sa
   * légende est aussi ajoutée à la description de `line`.
   */
  origin?: MagicItemOrigin;
}

// ───────────────────────── Table de puissance (p. 244) ─────────────────────────

/**
 * « Puissance d'un objet magique majeur » (p. 244) : niveau de magie recommandé selon le
 * niveau du PJ (colonnes 1-20) et le cadre. `'C'` = consommable recommandé (niveau 0),
 * `0` = aucun objet recommandé à ce niveau.
 */
const POWER_TABLE: Record<GameFrame, readonly (number | 'C')[]> = {
  classic: ['C', 'C', 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6],
  high: ['C', 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10],
  low: [0, 0, 'C', 'C', 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3],
};

const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi);

/**
 * NIVEAU DE MAGIE RECOMMANDÉ (p. 244) pour un objet MAJEUR au niveau `level` et cadre
 * `frame` ; un objet MINEUR lit la colonne du niveau ÷ 2. `'C'` (consommable) et `0`
 * (aucun) renvoient tous deux 0 — l'appelant décide d'un plancher selon la catégorie.
 */
export function recommendedMagicLevel(
  level: number,
  frame: GameFrame,
  minor = false,
): number {
  const lvl = clamp(Math.trunc(level), 1, 20);
  const column = minor ? Math.max(1, Math.floor(lvl / 2)) : lvl;
  const cell = POWER_TABLE[frame][column - 1];
  return cell === 'C' ? 0 : cell;
}

// ───────────────────────── Aides de tables ─────────────────────────

/** Choisit dans une table « borne haute → valeur » selon un jet (les bornes sont croissantes). */
function fromRanges<T>(roll: number, ranges: readonly [max: number, value: T][]): T {
  for (const [max, value] of ranges) if (roll <= max) return value;
  return ranges[ranges.length - 1][1];
}

// ───────────────────────── Armes (p. 251-252) ─────────────────────────

interface CatalogEntry {
  /** Libellé du livre (français). */
  label: string;
  /** Id du catalogue si l'objet y existe (sinon objet libre). */
  itemId?: string;
}

/** « Armes de contact » (d20, p. 252). */
const CONTACT_WEAPONS: readonly [number, CatalogEntry][] = [
  [1, { label: 'Maniques (mains nues)', itemId: 'mains-nues' }],
  [2, { label: 'Bâton', itemId: 'baton' }],
  [4, { label: 'Dague', itemId: 'dague' }],
  [5, { label: 'Épée bâtarde', itemId: 'epee-batarde' }],
  [7, { label: 'Épée courte', itemId: 'epee-courte' }],
  [10, { label: 'Épée longue', itemId: 'epee-longue' }],
  [11, { label: 'Hache à une main', itemId: 'hache' }],
  [13, { label: 'Épée à deux mains', itemId: 'epee-a-deux-mains' }],
  [14, { label: 'Hache à deux mains', itemId: 'hache-a-deux-mains' }],
  [16, { label: 'Masse ou marteau', itemId: 'masse' }],
  [18, { label: 'Rapière', itemId: 'rapiere' }],
  [19, { label: 'Vivelame ou Katana', itemId: 'vivelame' }],
  [20, { label: 'Autre arme' }],
];

/** « Armes à distance » (d20, p. 252). */
const RANGED_WEAPONS: readonly [number, CatalogEntry][] = [
  [1, { label: 'Arbalète de poing', itemId: 'arbalete-de-poing' }],
  [3, { label: 'Arbalète légère', itemId: 'arbalete-legere' }],
  [5, { label: 'Arbalète lourde', itemId: 'arbalete-lourde' }],
  [7, { label: 'Arc court', itemId: 'arc-court' }],
  [9, { label: 'Arc long', itemId: 'arc-long' }],
  [10, { label: 'Dague', itemId: 'dague-de-lancer' }],
  [11, { label: 'Fronde', itemId: 'fronde' }],
  [12, { label: 'Hachette', itemId: 'hachette' }],
  [13, { label: 'Javelot', itemId: 'javelot' }],
  [15, { label: 'Carreaux d’arbalète (1d12)' }],
  [17, { label: 'Flèches (1d12)' }],
  [18, { label: 'Billes de fronde (1d12)' }],
  [20, { label: 'Autre arme' }],
];

/**
 * Une propriété d'arme tirée (d12, p. 252) : la propriété structurée + son libellé de table.
 * `special` (11-12) est résolu en amont (deux propriétés) et n'apparaît jamais ici.
 */
function contactWeaponProperty(d12: number): MagicProperty {
  const bane = (creatureCategory: string): MagicProperty => ({ kind: 'bane', creatureCategory });
  return fromRanges<MagicProperty>(d12, [
    [2, { kind: 'sharp' }],
    [3, bane('morts-vivants')],
    [4, bane('dragons')],
    [5, bane('géants')],
    [6, bane('goblinoïdes')],
    [7, bane('démons')],
    [8, { kind: 'elemental', substance: 'fire' }],
    [9, { kind: 'elemental', substance: 'cold' }],
    [10, { kind: 'elemental', substance: 'lightning' }],
    // 11-12 traité comme « special » par l'appelant.
    [12, { kind: 'sharp' }],
  ]);
}

// ───────────────────────── Défense (p. 253-254) ─────────────────────────

/** Valeur X par défaut d'une propriété « Résistance [substance] » (p. 253) — éditable ensuite. */
export const DEFAULT_RESISTANCE_AMOUNT = 5;

/** « Armures magiques » (d20, p. 254). Les entrées sans `itemId` sont des objets libres. */
const DEFENSE_ITEMS: readonly [number, CatalogEntry][] = [
  [2, { label: 'Anneau de protection' }],
  [4, { label: 'Bracelets de défense' }],
  [6, { label: 'Cuir', itemId: 'cuir-simple' }],
  [8, { label: 'Cuir renforcé', itemId: 'cuir-renforce-broigne' }],
  [10, { label: 'Chemise de mailles', itemId: 'chemise-de-mailles' }],
  [13, { label: 'Cotte de mailles', itemId: 'cotte-de-mailles' }],
  [15, { label: 'Demi-plaque', itemId: 'armure-de-plaques' }],
  [16, { label: 'Plaque complète', itemId: 'plaque-complete' }],
  [18, { label: 'Petit bouclier', itemId: 'petit-bouclier' }],
  [20, { label: 'Grand bouclier', itemId: 'grand-bouclier' }],
];

/** Une propriété d'armure tirée (d12, p. 254). `special` (12) résolu en amont. */
function defenseProperty(d12: number): MagicProperty {
  const resist = (substance: MagicProperty['substance']): MagicProperty => ({
    kind: 'resistance',
    substance,
    amount: DEFAULT_RESISTANCE_AMOUNT,
  });
  return fromRanges<MagicProperty>(d12, [
    [1, { kind: 'free-action' }],
    [2, { kind: 'defense', tier: 1 }],
    [3, { kind: 'swimming' }],
    [4, { kind: 'shadow' }],
    [5, { kind: 'protection' }],
    [6, { kind: 'magic-resistance' }],
    [7, resist('fire')],
    [8, resist('cold')],
    [9, resist('lightning')],
    [10, resist('acid')],
    [11, { kind: 'mobile' }],
    // 12 = special (deux propriétés), traité par l'appelant.
    [12, { kind: 'free-action' }],
  ]);
}

// ───────────────────────── Potions (p. 248-249) ─────────────────────────

const HEALING_POTIONS: readonly [number, string][] = [
  [3, 'Récupération mineure (Prêtre)'],
  [5, 'Récupération majeure (Prêtre)'],
  [6, 'Délivrance (Prêtre)'],
];

const COMMON_POTIONS: readonly string[] = [
  'Détection de l’invisible (Ensorceleur)',
  'Lévitation (Magicien)',
  'Forme gazeuse (Magicien)',
  'Accélération (Magicien)',
  'Maîtrise des éléments (Magicien)',
  'Respiration aquatique (Magicien)',
  'Armure de mana (Magicien)',
  'Chute ralentie (Magicien)',
  'Invisibilité (Magicien)',
  'Vol (Magicien)',
];

const RARE_POTIONS: readonly string[] = [
  'Langage des animaux (Druide, 1d6 minutes)',
  'Masque du prédateur (Druide)',
  'Forme animale (Druide, 1d6 minutes)',
  'Terrains difficiles (Druide, 2d6 h)',
  'Forme d’arbre (Druide, 2d6 minutes)',
  'Peau d’écorce (Druide, +5 DEF)',
  'Clairvoyance (Ensorceleur, 1d6 tours)',
  'Sous tension (Ensorceleur)',
  'Forme éthérée (Ensorceleur)',
  'Imitation (Ensorceleur)',
  'Fortifiant (Forgesort)',
  'Feu grégeois (Forgesort)',
  'Élixir de guérison (Forgesort)',
  'Déphasage (Magicien)',
  'Beauté de la succube (Sorcier)',
  'Aspect du démon (Sorcier)',
  'Masque mortuaire (Sorcier)',
  'Reptation (Sorcier)',
  'Ailes célestes (Prêtre)',
  'Sanctuaire (Prêtre)',
];

// ───────────────────────── Parchemins / baguettes (p. 249-250) ─────────────────────────

/** « Parchemin / Baguette – Voie du sort inscrit » (d20, p. 250). */
const SPELL_PATHS: readonly string[] = [
  'Ensorceleur - Voie de l’air',
  'Ensorceleur - Voie de la divination',
  'Ensorceleur - Voie de l’envoûteur',
  'Ensorceleur - Voie des illusions',
  'Ensorceleur - Voie de l’invocation',
  'Magicien - Voie de la magie des arcanes',
  'Magicien - Voie de la magie destructrice',
  'Magicien - Voie de la magie élémentaire',
  'Magicien - Voie de la magie protectrice',
  'Magicien - Voie de la magie universelle',
  'Sorcier - Voie du démon',
  'Sorcier - Voie de la mort',
  'Sorcier - Voie de l’outre-tombe',
  'Sorcier - Voie du sang',
  'Sorcier - Voie de la sombre magie',
  'Prêtre - Voie de la foi',
  'Prêtre - Voie de la prière',
  'Prêtre - Voie des soins',
  'Prêtre - Voie de la spiritualité',
  'Druide - Voie des végétaux',
];

/** « Parchemin / Baguette – Rang de la voie » (d6, p. 250), selon objet mineur / moyen. */
function spellRank(d6: number, minor: boolean): number {
  return minor
    ? fromRanges<number>(d6, [[3, 1], [5, 2], [6, 3]])
    : fromRanges<number>(d6, [[2, 3], [4, 4], [6, 5]]);
}

// ───────────────────────── Objets de pouvoir (p. 255) ─────────────────────────

/** « Rang du pouvoir » (d8, p. 255). */
function powerRank(d8: number): number {
  return fromRanges<number>(d8, [[2, 1], [4, 2], [6, 3], [7, 4], [8, 5]]);
}

/** « Type de pouvoir – Profil » (d20, p. 255). */
const POWER_PROFILES: readonly [number, string][] = [
  [1, 'Arquebusier'],
  [2, 'Barde'],
  [3, 'Barbare'],
  [4, 'Chevalier'],
  [6, 'Druide'],
  [8, 'Ensorceleur'],
  [10, 'Forgesort'],
  [11, 'Guerrier'],
  [13, 'Magicien'],
  [14, 'Moine'],
  [16, 'Sorcier'],
  [18, 'Prêtre'],
  [19, 'Rôdeur'],
  [20, 'Voleur'],
];

// ───────────────────────── Origine narrative (p. 247) ─────────────────────────

/** Page de la table « Origine d'un objet magique ». */
export const MAGIC_ORIGIN_SOURCE_PAGE = 247;

/** « Provenance » (d10, p. 247) — d'où l'objet provient. */
export const MAGIC_ORIGIN_PROVENANCES: readonly string[] = [
  'Locale',
  'La nation où l’objet est découvert',
  'Une nation voisine de la nation où l’objet vient d’être trouvé',
  'Grand Nord',
  'Sud profond',
  'Ouest lointain',
  'Est lointain',
  'Les profondeurs',
  'Un autre continent',
  'Un autre plan',
];

/** « Époque » (d10, p. 247) — de quand l'objet date. */
export const MAGIC_ORIGIN_EPOCHS: readonly string[] = [
  'Post Monastir',
  'Âges sombres (-700 à -1)',
  'Empire d’Osgild',
  'Chute d’Anathazerïn',
  'Apogée d’Anathazerïn',
  'Apogée des Premiers-nés',
  'Corruption post Roi-Sorcier',
  'Époque du Roi-Sorcier',
  'Chute des pierres du ciel',
  'Premier âge',
];

/** « Peuple » (d10, p. 247) — par quel peuple l'objet a été forgé. */
export const MAGIC_ORIGIN_PEOPLES: readonly string[] = [
  'Humains',
  'Nains',
  'Elfes',
  'Gnomes',
  'Elfes des ténèbres',
  'Orcs ou gobelins',
  'Ange, démon, divinité',
  'Dragons',
  'Seigneur élémentaire',
  'Autre créature ancienne',
];

/** Origine narrative tirée (aucune règle, p. 247) — les trois colonnes + la légende assemblée. */
export interface MagicItemOrigin {
  /** Colonne « Provenance ». */
  provenance: string;
  /** Colonne « Époque ». */
  epoch: string;
  /** Colonne « Peuple ». */
  people: string;
  /** Légende assemblée, ajoutée à la description de l'objet et affichée à l'aperçu. */
  text: string;
  /** Les trois jets de d10, pour la provenance « selon le livre » dans l'UI. */
  rolls: GeneratedRoll[];
}

/**
 * La table d'origine (p. 247, NB) n'est PAS adaptée aux consommables (« potions et
 * parchemins ») → origine masquée pour `'potion'` et `'scroll'`. Les baguettes, bien qu'à
 * charges, restent des objets durables → origine AUTORISÉE (décision proprio 2026-08-06).
 */
export function originAllowedForCategory(category: MagicItemCategory): boolean {
  return category !== 'potion' && category !== 'scroll';
}

/**
 * TIRE une origine narrative (p. 247) : trois d10 INDÉPENDANTS (provenance / époque / peuple).
 * Purement narratif — aucune incidence sur les règles de l'objet.
 */
export function rollOrigin(roll: RollDie): MagicItemOrigin {
  const pRoll = roll(10);
  const eRoll = roll(10);
  const plRoll = roll(10);
  const provenance = MAGIC_ORIGIN_PROVENANCES[clamp(pRoll, 1, 10) - 1];
  const epoch = MAGIC_ORIGIN_EPOCHS[clamp(eRoll, 1, 10) - 1];
  const people = MAGIC_ORIGIN_PEOPLES[clamp(plRoll, 1, 10) - 1];
  const rolls: GeneratedRoll[] = [
    { label: 'Provenance', die: 'd10', result: pRoll, outcome: provenance },
    { label: 'Époque', die: 'd10', result: eRoll, outcome: epoch },
    { label: 'Peuple', die: 'd10', result: plRoll, outcome: people },
  ];
  const text = `Origine (p. ${MAGIC_ORIGIN_SOURCE_PAGE}) — Provenance : ${provenance}. Époque : ${epoch}. Peuple : ${people}.`;
  return { provenance, epoch, people, text, rolls };
}

/** Ajoute la légende d'origine à la description de la ligne (objet libre → `details`, catalogue → `overrides.description`). */
function withOriginDescription(line: EquipmentLine, text: string): EquipmentLine {
  if ('custom' in line) {
    const details = line.details ? `${line.details} ${text}` : text;
    return { ...line, details };
  }
  // Objet du catalogue (EquipmentRef) : sa description d'instance vit dans `overrides.description`.
  const description = line.overrides?.description ? `${line.overrides.description} ${text}` : text;
  return { ...line, overrides: { ...line.overrides, description } };
}

/**
 * Ajoute une origine à un objet généré : légende dans la description, provenance dans le journal
 * des jets, et champ `origin` renseigné. Ne touche à AUCUNE stat de règle.
 */
function applyOrigin(item: GeneratedMagicItem, origin: MagicItemOrigin): GeneratedMagicItem {
  return {
    ...item,
    line: withOriginDescription(item.line, origin.text),
    origin,
    rolls: [...item.rolls, ...origin.rolls],
  };
}

// ───────────────────────── Construction des lignes ─────────────────────────

/** Fabrique une ligne référencée au catalogue avec l'enchantement d'arme. */
function weaponRef(
  itemId: string,
  bonus: number,
  properties: MagicProperty[],
): EquipmentRef {
  return {
    itemId,
    quantity: 1,
    ...(bonus > 0 ? { magicBonus: bonus } : {}),
    ...(properties.length ? { magicProperties: properties } : {}),
  };
}

/** Fabrique une ligne référencée au catalogue avec l'enchantement défensif. */
function defenseRef(
  itemId: string,
  magicDef: number,
  properties: MagicProperty[],
): EquipmentRef {
  return {
    itemId,
    quantity: 1,
    ...(magicDef > 0 ? { magicDef } : {}),
    ...(properties.length ? { magicProperties: properties } : {}),
  };
}

/** Fabrique un objet libre enchanté (arme ou défense hors catalogue). */
function freeMagicItem(
  name: string,
  type: CustomItem['type'],
  enchant: Pick<CustomItem, 'magicBonus' | 'magicDef' | 'magicProperties' | 'details'>,
): CustomItem {
  return {
    custom: true,
    name,
    quantity: 1,
    type,
    ...(enchant.magicBonus ? { magicBonus: enchant.magicBonus } : {}),
    ...(enchant.magicDef ? { magicDef: enchant.magicDef } : {}),
    ...(enchant.magicProperties?.length ? { magicProperties: enchant.magicProperties } : {}),
    ...(enchant.details ? { details: enchant.details } : {}),
  };
}

/** Assemble le libellé « +N, propriété1, propriété2 » d'un objet enchanté. */
function enchantSuffix(bonus: number, properties: MagicProperty[]): string {
  const parts: string[] = [];
  if (bonus > 0) parts.push(`+${bonus}`);
  parts.push(...properties.map(magicPropertyLabel));
  return parts.length ? ` ${parts.join(', ')}` : '';
}

// ───────────────────────── Générateurs par catégorie ─────────────────────────

/**
 * Tire les propriétés d'une arme/défense (p. 251/253) : « lancez 1d6 : si le résultat est
 * inférieur au niveau de magie, l'objet possède une propriété particulière » ; la propriété
 * se tire alors sur la table d12 de la famille. Le résultat « special » (11-12 armes / 12
 * défense) donne DEUX propriétés (« Tirez deux propriétés »), chacune retirée hors de la
 * plage special pour éviter la récursion.
 */
function rollProperties(
  roll: RollDie,
  magicLvl: number,
  family: 'weapon' | 'defense',
  rolls: GeneratedRoll[],
): MagicProperty[] {
  const check = roll(6);
  const hasProperty = check < magicLvl;
  rolls.push({
    label: 'Propriété ?',
    die: 'd6',
    result: check,
    outcome: hasProperty ? `${check} < ${magicLvl} → une propriété` : `${check} ≥ ${magicLvl} → aucune`,
  });
  if (!hasProperty) return [];

  const specialFrom = family === 'weapon' ? 11 : 12;
  const pick = (d12: number): MagicProperty =>
    family === 'weapon' ? contactWeaponProperty(d12) : defenseProperty(d12);

  const first = roll(12);
  if (first >= specialFrom) {
    // « Tirez deux propriétés » — chacune re-tirée hors de la plage special.
    const props: MagicProperty[] = [];
    for (let i = 0; i < 2; i++) {
      const d = ((roll(specialFrom - 1) - 1) % (specialFrom - 1)) + 1;
      props.push(pick(d));
      rolls.push({ label: 'Propriété (spécial)', die: 'd12', result: d, outcome: magicPropertyLabel(pick(d)) });
    }
    return props;
  }
  const prop = pick(first);
  rolls.push({ label: 'Propriété', die: 'd12', result: first, outcome: magicPropertyLabel(prop) });
  return [prop];
}

function generateWeapon(req: GenerateRequest, roll: RollDie): GeneratedMagicItem {
  const rolls: GeneratedRoll[] = [];
  // Un objet magique mineur = arme +1 au minimum (p. 245) : plancher à 1.
  const targetLevel = Math.max(1, recommendedMagicLevel(req.characterLevel, req.frame, req.minor));

  const typeRoll = roll(6);
  const kind = fromRanges<'contact' | 'ranged' | 'scepter'>(typeRoll, [
    [3, 'contact'],
    [5, 'ranged'],
    [6, 'scepter'],
  ]);
  rolls.push({
    label: "Type d'arme",
    die: 'd6',
    result: typeRoll,
    outcome:
      kind === 'contact' ? 'Arme de contact' : kind === 'ranged' ? 'Arme à distance' : 'Sceptre de magie',
  });

  if (kind === 'scepter') {
    // Sceptre de magie (p. 252) : DM comme un bâton, bonus magique aux sorts. Objet libre.
    const line = freeMagicItem('Sceptre de magie', 'weapon', {
      magicBonus: targetLevel,
      details: 'Bonus magique en attaque et aux DM des sorts (DM comme un bâton : 1d6). Page 252.',
    });
    const magicLvl = computeMagicLevel(line);
    return {
      line,
      category: 'weapon',
      magicLevel: magicLvl,
      value: magicItemValue(magicLvl),
      sourcePage: 252,
      summary: `Sceptre de magie +${targetLevel}`,
      rolls,
    };
  }

  const weaponRoll = roll(20);
  const entry = fromRanges(weaponRoll, kind === 'contact' ? CONTACT_WEAPONS : RANGED_WEAPONS);
  rolls.push({ label: 'Arme', die: 'd20', result: weaponRoll, outcome: entry.label });

  const properties = rollProperties(roll, targetLevel, 'weapon', rolls);
  const propsLevel = properties.reduce(
    (sum, p) => sum + computeMagicLevel({ magicProperties: [p] }),
    0,
  );
  const bonus = Math.max(0, targetLevel - propsLevel);

  const line: EquipmentLine = entry.itemId
    ? weaponRef(entry.itemId, bonus, properties)
    : freeMagicItem(entry.label, 'weapon', { magicBonus: bonus, magicProperties: properties });
  const magicLvl = computeMagicLevel(line);
  return {
    line,
    category: 'weapon',
    magicLevel: magicLvl,
    value: magicItemValue(magicLvl),
    sourcePage: 251,
    summary: `${entry.label}${enchantSuffix(bonus, properties)}`,
    rolls,
  };
}

function generateDefense(req: GenerateRequest, roll: RollDie): GeneratedMagicItem {
  const rolls: GeneratedRoll[] = [];
  const targetLevel = Math.max(1, recommendedMagicLevel(req.characterLevel, req.frame, req.minor));

  const armorRoll = roll(20);
  const entry = fromRanges(armorRoll, DEFENSE_ITEMS);
  rolls.push({ label: 'Objet défensif', die: 'd20', result: armorRoll, outcome: entry.label });

  const properties = rollProperties(roll, targetLevel, 'defense', rolls);
  const propsLevel = properties.reduce(
    (sum, p) => sum + computeMagicLevel({ magicProperties: [p] }),
    0,
  );
  const magicDef = Math.max(0, targetLevel - propsLevel);

  const line: EquipmentLine = entry.itemId
    ? defenseRef(entry.itemId, magicDef, properties)
    : freeMagicItem(entry.label, 'gear', { magicDef, magicProperties: properties });
  const magicLvl = computeMagicLevel(line);
  return {
    line,
    category: 'defense',
    magicLevel: magicLvl,
    value: magicItemValue(magicLvl),
    sourcePage: 253,
    summary: `${entry.label}${enchantSuffix(magicDef, properties)}`,
    rolls,
  };
}

function generatePotion(_req: GenerateRequest, roll: RollDie): GeneratedMagicItem {
  const rolls: GeneratedRoll[] = [];
  const typeRoll = roll(6);
  const type = fromRanges<'healing' | 'common' | 'rare'>(typeRoll, [
    [3, 'healing'],
    [5, 'common'],
    [6, 'rare'],
  ]);
  rolls.push({
    label: 'Type de potion',
    die: 'd6',
    result: typeRoll,
    outcome: type === 'healing' ? 'Potion de soins' : type === 'common' ? 'Potion commune' : 'Potion rare',
  });

  let effect: string;
  if (type === 'healing') {
    const d6 = roll(6);
    effect = fromRanges(d6, HEALING_POTIONS);
    rolls.push({ label: 'Potion de soins', die: 'd6', result: d6, outcome: effect });
  } else if (type === 'common') {
    const d10 = roll(10);
    effect = COMMON_POTIONS[clamp(d10, 1, 10) - 1];
    rolls.push({ label: 'Potion commune', die: 'd10', result: d10, outcome: effect });
  } else {
    const d20 = roll(20);
    effect = RARE_POTIONS[clamp(d20, 1, 20) - 1];
    rolls.push({ label: 'Potion rare', die: 'd20', result: d20, outcome: effect });
  }

  const line = freeMagicItem(`Potion : ${effect}`, 'consumable', {
    details: 'Consommable, niveau de magie 0 (p. 248). Le niveau utilisé est celui du buveur.',
  });
  return { line, category: 'potion', magicLevel: 0, value: 0, sourcePage: 248, summary: line.name, rolls };
}

function generateScrollOrWand(
  req: GenerateRequest,
  roll: RollDie,
  isWand: boolean,
): GeneratedMagicItem {
  const rolls: GeneratedRoll[] = [];
  const voieRoll = roll(20);
  const voie = SPELL_PATHS[clamp(voieRoll, 1, 20) - 1];
  rolls.push({ label: 'Voie du sort', die: 'd20', result: voieRoll, outcome: voie });

  const rankRoll = roll(6);
  const rank = spellRank(rankRoll, req.minor ?? false);
  rolls.push({
    label: 'Rang de la voie',
    die: 'd6',
    result: rankRoll,
    outcome: `${req.minor ? 'mineur' : 'moyen'} → rang ${rank}`,
  });

  if (!isWand) {
    // Parchemin : consommable, niveau de magie 0 (p. 249).
    const line = freeMagicItem(`Parchemin : ${voie} (rang ${rank})`, 'consumable', {
      details: 'Consommable, niveau de magie 0 (p. 249).',
    });
    return { line, category: 'scroll', magicLevel: 0, value: 0, sourcePage: 249, summary: line.name, rolls };
  }

  // Baguette : charges = 2d20 ; niveau de magie = rang si ≥ 30 charges, sinon rang ÷ 2 (arrondi
  // inférieur) (p. 250).
  const c1 = roll(20);
  const c2 = roll(20);
  const charges = c1 + c2;
  rolls.push({ label: 'Charges', die: '2d20', result: charges, outcome: `${charges} charges` });
  const magicLvl = charges >= 30 ? rank : Math.floor(rank / 2);
  const value = magicItemValue(magicLvl);
  const line = freeMagicItem(`Baguette : ${voie} (rang ${rank})`, 'gear', {
    details: `${charges} charges. Niveau de magie ${magicLvl}${
      value ? `, valeur ${value} po` : ''
    } (p. 250).`,
  });
  // Charges structurées (PER-294) pour le suivi en jeu — pas de rechargement automatique.
  line.charges = { max: charges };
  return { line, category: 'wand', magicLevel: magicLvl, value, sourcePage: 250, summary: line.name, rolls };
}

function generatePower(req: GenerateRequest, roll: RollDie): GeneratedMagicItem {
  const rolls: GeneratedRoll[] = [];
  const rankRoll = roll(8);
  const rawRank = powerRank(rankRoll);
  // Le MJ plafonne généralement le rang au niveau de magie recommandé (p. 255).
  const cap = Math.max(1, recommendedMagicLevel(req.characterLevel, req.frame, req.minor));
  const rank = Math.min(rawRank, cap);
  rolls.push({
    label: 'Rang du pouvoir',
    die: 'd8',
    result: rankRoll,
    outcome: rawRank === rank ? `rang ${rank}` : `rang ${rawRank} plafonné à ${rank}`,
  });

  const profilRoll = roll(20);
  const profil = fromRanges(profilRoll, POWER_PROFILES);
  rolls.push({ label: 'Profil source', die: 'd20', result: profilRoll, outcome: profil });

  // Niveau de magie d'un objet de pouvoir = rang du pouvoir dupliqué (p. 255).
  const magicLvl = rank;
  const value = magicItemValue(magicLvl);
  const line = freeMagicItem(`Objet de pouvoir : ${profil} (rang ${rank})`, 'gear', {
    details: `Pouvoir calqué sur une capacité de ${profil}, rang ${rank}. Niveau de magie ${magicLvl}${
      value ? `, valeur ${value} po` : ''
    } (p. 255).`,
  });
  return { line, category: 'power', magicLevel: magicLvl, value, sourcePage: 255, summary: line.name, rolls };
}

/** Déroule la table de la catégorie demandée (sans l'habillage d'origine, ajouté ensuite). */
function generateBaseItem(req: GenerateRequest, roll: RollDie): GeneratedMagicItem {
  switch (req.category) {
    case 'weapon':
      return generateWeapon(req, roll);
    case 'defense':
      return generateDefense(req, roll);
    case 'potion':
      return generatePotion(req, roll);
    case 'scroll':
      return generateScrollOrWand(req, roll, false);
    case 'wand':
      return generateScrollOrWand(req, roll, true);
    case 'power':
      return generatePower(req, roll);
  }
}

/**
 * GÉNÈRE un objet magique de la catégorie demandée en déroulant les tables du livre.
 * `roll` est l'aléa injecté (un « dN » renvoyant `[1, sides]`). Si `req.withOrigin` est vrai et
 * que la catégorie s'y prête (non consommable, p. 247), une origine narrative est tirée après
 * l'objet et sa légende ajoutée à la description — l'ordre des jets d'origine (trois d10) vient
 * donc APRÈS ceux de l'objet.
 */
export function generateMagicItem(req: GenerateRequest, roll: RollDie): GeneratedMagicItem {
  const item = generateBaseItem(req, roll);
  if (req.withOrigin && originAllowedForCategory(req.category)) {
    return applyOrigin(item, rollOrigin(roll));
  }
  return item;
}

/** Aléa réel pour l'UI : `roll(n)` = un dN honnête basé sur `Math.random`. */
export const randomRoll: RollDie = (sides) => 1 + Math.floor(Math.random() * sides);

/** Libellé FR d'une catégorie, pour le sélecteur de l'UI. */
export const MAGIC_ITEM_CATEGORY_LABEL: Record<MagicItemCategory, string> = {
  potion: 'Potion',
  scroll: 'Parchemin',
  wand: 'Baguette',
  weapon: 'Arme',
  defense: 'Objet défensif',
  power: 'Objet de pouvoir',
};

/** Libellé FR d'un cadre de jeu, pour le sélecteur de l'UI. */
export const GAME_FRAME_LABEL: Record<GameFrame, string> = {
  classic: 'Classique',
  high: 'High fantasy',
  low: 'Low fantasy',
};
