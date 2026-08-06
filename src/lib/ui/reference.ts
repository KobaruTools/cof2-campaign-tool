/**
 * AIDE-MÉMOIRE — libellés d'affichage (français) et regroupement pour la PAGE DÉDIÉE (PER-46).
 *
 * Utilitaires PURS d'UI au-dessus du domaine de données `@/data/reference` : ils ne font que
 * TRADUIRE les slugs (anglais, cf. convention) en libellés affichés et ORDONNER les entrées en
 * sections → sous-sections pour la navigation. Aucune dépendance au modèle `Character`, au store
 * ni au moteur — la page de consultation reste strictement en lecture seule.
 */

import type {
  ReferenceEntry,
  ReferenceSection,
} from '@/data/reference';

/** Libellé français de chaque domaine de premier niveau (navigation figée). */
export const SECTION_LABELS: Record<ReferenceSection, string> = {
  combat: 'Combat',
  resolution: 'Résolution',
  environment: 'Environnement',
};

/**
 * Libellé français des sous-sections connues (slugs documentés dans `data/reference/schema.ts`).
 * Volontairement permissif : une sous-section ajoutée par une extraction future sans libellé ici
 * retombe sur son slug brut (cf. `subsectionLabel`) plutôt que de casser le rendu.
 */
const SUBSECTION_LABELS: Record<string, string> = {
  states: 'États préjudiciables',
  maneuvers: 'Manœuvres',
  'attack-modifiers': 'Modificateurs d’attaque',
  'special-actions': 'Actions spéciales',
  'tactical-options': 'Options tactiques',
  tests: 'Tests',
  damage: 'Dégâts & critiques',
  magic: 'Magie',
  // La section « Environnement » a une sous-section homonyme : on la nomme autrement pour éviter
  // un doublon « Environnement › Environnement » dans le fil de navigation.
  environment: 'Milieu & dangers',
  encumbrance: 'Encombrement',
  travel: 'Voyage',
};

/** Libellé français d'une sous-section, avec repli sur le slug brut si inconnu. */
export function subsectionLabel(subsection: string): string {
  return SUBSECTION_LABELS[subsection] ?? subsection;
}

/** Ordre canonique des sections (navigation). */
export const SECTION_ORDER: ReferenceSection[] = ['combat', 'resolution', 'environment'];

/** Un bloc de sous-section : son slug, son libellé et ses entrées, dans l'ordre d'origine. */
export interface ReferenceSubsectionGroup {
  subsection: string;
  label: string;
  entries: ReferenceEntry[];
}

/** Une section groupée : son slug, son libellé et ses sous-sections ordonnées. */
export interface ReferenceSectionGroup {
  section: ReferenceSection;
  label: string;
  subsections: ReferenceSubsectionGroup[];
}

/**
 * Regroupe une liste plate d'entrées en sections → sous-sections, en PRÉSERVANT l'ordre de
 * première apparition (l'ordre du livre, tel qu'agrégé dans `REFERENCE_ENTRIES`). Les sections
 * sortent dans l'ordre canonique `SECTION_ORDER` ; à l'intérieur, les sous-sections et leurs
 * entrées gardent l'ordre reçu. Les sections/sous-sections sans entrée sont omises.
 */
export function groupReferenceEntries(entries: ReferenceEntry[]): ReferenceSectionGroup[] {
  const bySection = new Map<ReferenceSection, Map<string, ReferenceEntry[]>>();
  for (const entry of entries) {
    let subs = bySection.get(entry.section);
    if (!subs) {
      subs = new Map();
      bySection.set(entry.section, subs);
    }
    const list = subs.get(entry.subsection);
    if (list) list.push(entry);
    else subs.set(entry.subsection, [entry]);
  }

  const result: ReferenceSectionGroup[] = [];
  for (const section of SECTION_ORDER) {
    const subs = bySection.get(section);
    if (!subs) continue;
    const subsections: ReferenceSubsectionGroup[] = [];
    for (const [subsection, subEntries] of subs) {
      subsections.push({ subsection, label: subsectionLabel(subsection), entries: subEntries });
    }
    result.push({ section, label: SECTION_LABELS[section], subsections });
  }
  return result;
}

/**
 * Découpe un VERBATIM en paragraphes, sur les lignes vides (PER-311).
 *
 * Rendu tel quel en `white-space: pre-line`, un verbatim de plusieurs paragraphes fait payer une
 * ligne pleine à chaque saut de ligne double — sur l'onglet Résolution, où les règles sont longues,
 * ces blancs représentaient à eux seuls des milliers de pixels de défilement. En rendant chaque
 * paragraphe comme un bloc, l'espacement redevient une décision de mise en page (une demi-ligne)
 * au lieu d'un accident de la donnée.
 *
 * La DONNÉE n'est pas réécrite : aucun mot n'est touché, seuls les blancs de SÉPARATION entre
 * paragraphes disparaissent (les sauts de ligne SIMPLES restent dans le paragraphe, rendus par
 * `pre-line`). Garanti par `reference.test.ts`.
 */
export function splitVerbatimParagraphs(body: string): string[] {
  return body
    .split(/\n[ \t]*\n+/)
    .map((p) => p.trim())
    .filter((p) => p !== '');
}

/**
 * POIDS VISUEL estimé d'un bloc de sous-section, en « lignes » — sert uniquement à répartir les
 * panneaux entre les colonnes (PER-311), jamais à décider d'un rendu. Purement heuristique : on ne
 * peut pas mesurer la hauteur réelle avant le rendu, et une mesure DOM rendrait la répartition
 * dépendante du navigateur (donc intestable et instable au redimensionnement).
 *
 * On estime la hauteur AU REPOS, c'est-à-dire REPLIÉE : depuis la 2ᵉ passe de PER-311, une entrée de
 * texte qui a du volume n'affiche que son `shortEffect` d'une ligne, son verbatim restant sous le
 * chevron. Compter `body` ici gonflerait le poids des sous-sections bavardes (Dégâts, Magie) et
 * laisserait une colonne à moitié vide en face — c'est le `shortEffect` affiché qui fait la hauteur.
 * Une entrée non repliable a de toute façon `body` égal à `shortEffect`.
 *
 * Une ligne de tableau coûte une ligne, plus l'en-tête — un tableau reste toujours entièrement
 * visible. `PANEL_OVERHEAD` couvre le bandeau de titre et les marges du panneau lui-même.
 */
const CHARS_PER_LINE = 64;
const PANEL_OVERHEAD = 3;

export function subsectionWeight(group: ReferenceSubsectionGroup): number {
  let weight = PANEL_OVERHEAD;
  for (const entry of group.entries) {
    if (entry.kind === 'text') {
      weight += 1 + Math.ceil((entry.title.length + entry.shortEffect.length) / CHARS_PER_LINE);
    } else {
      weight += 2 + entry.rows.length + (entry.note ? 1 : 0);
    }
  }
  return weight;
}

/**
 * Répartit les blocs de sous-section d'un onglet en `columnCount` COLONNES de hauteur comparable
 * (PER-311 : l'aide-mémoire se lit comme l'écran de MJ, en colonnes denses, plutôt qu'en une pile
 * unique interminable).
 *
 * Glouton DANS L'ORDRE : chaque bloc part dans la colonne la plus courte à cet instant, en
 * conservant l'ordre du livre. On ne trie PAS par poids décroissant (l'équilibrage serait meilleur
 * mais l'ordre de lecture — et donc la correspondance avec le sommaire — volerait en éclats). À
 * égalité, la colonne la plus à gauche gagne, ce qui donne la lecture attendue de gauche à droite.
 *
 * Préféré à un `column-count` CSS : la répartition reste la même à chaque rendu (pas de
 * réequilibrage du navigateur), un panneau n'est jamais coupé en deux, et chaque colonne est un
 * vrai conteneur — donc le verre dépoli et les ancres de PER-310 continuent de fonctionner.
 *
 * `columnCount <= 1` renvoie une colonne unique (cas mobile), sans réordonner.
 */
export function splitReferenceColumns(
  subsections: ReferenceSubsectionGroup[],
  columnCount: number,
): ReferenceSubsectionGroup[][] {
  if (columnCount <= 1) return [subsections];
  const columns: ReferenceSubsectionGroup[][] = Array.from({ length: columnCount }, () => []);
  const weights = new Array<number>(columnCount).fill(0);
  for (const group of subsections) {
    let target = 0;
    for (let i = 1; i < columnCount; i += 1) {
      if (weights[i] < weights[target]) target = i;
    }
    columns[target].push(group);
    weights[target] += subsectionWeight(group);
  }
  return columns;
}

/**
 * Libellés de RATTACHEMENT d'une entrée : le nom de sa section et celui de sa sous-section, tels
 * qu'affichés (« Environnement », « Encombrement »).
 *
 * Ajoutés à l'index de recherche pour qu'un domaine se cherche par son NOM : taper « encombr » doit
 * ramener TOUTE la sous-section Encombrement, pas seulement l'entrée dont le verbatim contient par
 * hasard ce mot. Ces libellés sont ce que le joueur a sous les yeux (onglets, sommaire, bandeaux de
 * panneau) — ne pas pouvoir les chercher était le défaut le plus déroutant de la recherche.
 *
 * Le rattachement porte donc sur CHAQUE entrée du groupe, ce qui fait ressortir le groupe entier.
 */
export function referenceGroupLabels(entry: ReferenceEntry): string {
  return `${SECTION_LABELS[entry.section]} ${subsectionLabel(entry.subsection)}`;
}

/** Prédicat de sûreté : la valeur est-elle une section connue ? (validation de `?s=` dans l'URL). */
export function isReferenceSection(v: unknown): v is ReferenceSection {
  return v === 'combat' || v === 'resolution' || v === 'environment';
}

/**
 * ANCRES PARTAGEABLES de l'aide-mémoire. La page est découpée en ONGLETS de section (`?s=combat`) ;
 * à l'intérieur d'un onglet, chaque bloc de sous-section porte une ancre DOM (`#maneuvers`), de sorte
 * qu'une URL désigne un point précis du référentiel : `/reference?s=combat#maneuvers`.
 *
 * Le slug de sous-section suffit comme `id` : les slugs livrés sont uniques toutes sections
 * confondues (garanti par `reference.test.ts`). Ces trois fonctions sont le chokepoint unique — l'`id`
 * posé sur le bloc ET la cible des liens du sommaire en sortent — donc si une extraction future
 * réutilisait un slug dans deux sections, seul `subsectionAnchorId` changerait.
 */
export function subsectionAnchorId(subsection: string): string {
  return subsection;
}

/** Chemin de l'onglet d'une section (URL partageable, sans ancre). */
export function referenceSectionHref(section: ReferenceSection): string {
  return `/reference?s=${section}`;
}

/** Chemin d'un bloc de sous-section : onglet de section + ancre du bloc. */
export function referenceSubsectionHref(section: ReferenceSection, subsection: string): string {
  return `${referenceSectionHref(section)}#${subsectionAnchorId(subsection)}`;
}
