/**
 * MONTURES, VÉHICULES et BARDES (PER-216) — table « Prix des montures », livre de base p. 191,
 * complétée par les blocs de stats du bestiaire (p. 267) pour les chevaux aptes au combat.
 *
 * Ces entrées avaient atterri par erreur dans le catalogue d'inventaire (`equipment.ts`) — juste
 * parce que la table portait un prix — puis en avaient été retirées. Une monture n'est PAS un objet
 * d'inventaire : c'est une entité rattachée au personnage comme COMPAGNON (`Character.mounts`), avec
 * ses propres stats de combat et sa propre barre de vie. Le catalogue reste STATIQUE et
 * synchrone (contrairement au bestiaire, servi depuis la base de données) : le bloc de stats d'une
 * monture de combat est un `Creature` rendu tel quel par `BestiaryStatBlock`.
 *
 * Code EN ANGLAIS, texte affiché EN FRANÇAIS ; slugs d'`id` en français conservés (clés de contenu).
 */
import type { Creature, Price } from './schema';

/** Nature de l'entrée : bête montable (`mount`) ou véhicule tracté (`vehicle`). */
export type MountKind = 'mount' | 'vehicle';

/**
 * Barde (protection de monture) — apte au seul cheval de guerre (p. 191). Ajoute son `defBonus` à la
 * DEF de la monture ET inflige un malus d'Initiative ÉGAL à ce bonus, au cheval comme au cavalier
 * (le malus du cavalier est un RAPPEL affiché, non soustrait de l'Init. calculée du personnage — cf.
 * `src/lib/character/mounts.ts`). Prix : la table p. 191 (300 pa pour la barde de plaque) fait foi ;
 * le texte du bestiaire p. 267 (400 pa) est une contradiction interne au livre, tranchée en faveur de
 * la table des prix.
 */
export interface BardeCatalogEntry {
  /** Slug FR unique (`caparacon-de-mailles`, `barde-de-plaque`). */
  id: string;
  /** Nom affiché, verbatim. */
  name: string;
  /** Prix (p. 191). */
  price: Price;
  /** Bonus de DEF accordé au cheval — sert aussi de magnitude au malus d'Init. (cheval + cavalier). */
  defBonus: number;
  /** Page source du livre de base. */
  sourcePage: number;
}

/**
 * Une entrée du catalogue des montures/véhicules. Les montures aptes au combat portent un bloc de
 * stats (`creature`, rendu par `BestiaryStatBlock`) ; les bêtes de somme et les véhicules n'en ont
 * pas (`creature` absent → simple ligne nom + prix + note).
 */
export interface MountCatalogEntry {
  /** Slug FR unique (`cheval-de-guerre`, `carriole`…). */
  id: string;
  /** Nom affiché, verbatim. */
  name: string;
  /** Bête montable ou véhicule. */
  kind: MountKind;
  /** Prix (p. 191). */
  price: Price;
  /** Bloc de stats de combat (bestiaire, p. 267). Absent = monture/véhicule sans stats de combat. */
  creature?: Creature;
  /** La monture peut-elle porter une barde ? (cheval de guerre uniquement, p. 191). */
  canWearBarde?: boolean;
  /** Rappel de jeu affiché sous l'entrée (ex. dé malus « en selle en combat » du cheval de selle). */
  note?: string;
  /** Page source du livre de base. */
  sourcePage: number;
}

// --- Blocs de stats des chevaux (bestiaire, p. 267) --------------------------------------------
// Copie STATIQUE et autonome (le runtime n'importe pas `creatures.ts`, artefact d'extraction non
// embarqué). Valeurs identiques au bestiaire ; la particularité « Monture » (double FOR pour porter
// une charge) est conservée, mais le paragraphe sur les bardes est retiré du verbatim : la barde est
// désormais interactive (choisie sur la fiche), et non plus un texte de rappel.

const CHEVAL_DE_SELLE: Creature = {
  id: 'cheval-de-selle',
  name: 'Cheval de selle',
  category: 'animaux',
  nc: 1,
  size: 'grande',
  description:
    "Un cheval de selle n'est pas apte à subir le stress du combat, son cavalier subit un dé malus à toutes ses actions en selle en situation de combat.",
  abilities: { AGI: 0, CON: 4, FOR: 4, PER: 0, CHA: -1, INT: -4, VOL: -2 },
  bonusDieAbilities: ['CON'],
  defense: 11,
  hitPoints: 14,
  initiative: 10,
  attacks: [{ name: 'Ruade', bonus: '+2', damage: '1d4+4' }],
  specialAbilities: [{ name: 'Monture', text: 'La créature double sa FOR pour porter une charge.' }],
  sourcePage: 267,
};

const CHEVAL_DE_GUERRE: Creature = {
  id: 'cheval-de-guerre',
  name: 'Cheval de guerre',
  category: 'animaux',
  nc: 1,
  size: 'grande',
  abilities: { AGI: 0, CON: 4, FOR: 5, PER: 0, CHA: -1, INT: -4, VOL: 0 },
  bonusDieAbilities: ['CON'],
  defense: 11,
  hitPoints: 14,
  initiative: 10,
  attacks: [{ name: 'Ruade', bonus: '+4', damage: '1d4+5' }],
  specialAbilities: [{ name: 'Monture', text: 'La créature double sa FOR pour porter une charge.' }],
  sourcePage: 267,
};

/** Bardes (protections de monture), p. 191. */
export const bardes: BardeCatalogEntry[] = [
  {
    id: 'caparacon-de-mailles',
    name: 'Caparaçon de mailles',
    price: { amount: 100, unit: 'pa' },
    defBonus: 2,
    sourcePage: 191,
  },
  {
    id: 'barde-de-plaque',
    name: 'Barde de plaque (de métal)',
    price: { amount: 300, unit: 'pa' },
    defBonus: 4,
    sourcePage: 191,
  },
];

/** Montures et véhicules achetables, p. 191 (dans l'ordre de la table). */
export const mounts: MountCatalogEntry[] = [
  { id: 'mule-ou-ane', name: 'Mule ou âne', kind: 'mount', price: { amount: 25, unit: 'pa' }, sourcePage: 191 },
  { id: 'poney', name: 'Poney', kind: 'mount', price: { amount: 50, unit: 'pa' }, sourcePage: 191 },
  {
    id: 'cheval-de-selle',
    name: 'Cheval de selle',
    kind: 'mount',
    price: { amount: 100, unit: 'pa' },
    creature: CHEVAL_DE_SELLE,
    note: "N'est pas apte au combat : son cavalier subit un dé malus à toutes ses actions en selle en situation de combat.",
    sourcePage: 191,
  },
  {
    id: 'cheval-de-guerre',
    name: 'Cheval de guerre',
    kind: 'mount',
    price: { amount: 300, unit: 'pa' },
    creature: CHEVAL_DE_GUERRE,
    canWearBarde: true,
    sourcePage: 191,
  },
  { id: 'carriole', name: 'Carriole', kind: 'vehicle', price: { amount: 50, unit: 'pa' }, sourcePage: 191 },
  { id: 'chariot', name: 'Chariot', kind: 'vehicle', price: { amount: 90, unit: 'pa' }, sourcePage: 191 },
];

/** Lookup d'une monture/véhicule par `id`. */
export const mountById = new Map<string, MountCatalogEntry>(mounts.map((m) => [m.id, m]));

/** Lookup d'une barde par `id`. */
export const bardeById = new Map<string, BardeCatalogEntry>(bardes.map((b) => [b.id, b]));
