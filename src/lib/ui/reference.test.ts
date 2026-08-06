import { describe, expect, it } from 'vitest';
import { REFERENCE_ENTRIES, type ReferenceEntry } from '@/data/reference';
import {
  SECTION_ORDER,
  groupReferenceEntries,
  referenceGroupLabels,
  referenceSectionHref,
  referenceSubsectionHref,
  splitReferenceColumns,
  splitVerbatimParagraphs,
  subsectionAnchorId,
  subsectionWeight,
  type ReferenceSubsectionGroup,
} from './reference';
import { REFERENCE_SUBSECTION_COLORS, subsectionColor } from './referenceStyle';
import { normalizeSearchText } from './searchText';

describe('ancres partageables de l’aide-mémoire', () => {
  it('compose l’URL d’un onglet de section', () => {
    expect(referenceSectionHref('combat')).toBe('/reference?s=combat');
    expect(referenceSectionHref('environment')).toBe('/reference?s=environment');
  });

  it('compose l’URL d’un bloc de sous-section (onglet + ancre)', () => {
    expect(referenceSubsectionHref('combat', 'maneuvers')).toBe('/reference?s=combat#maneuvers');
    expect(referenceSubsectionHref('resolution', 'magic')).toBe('/reference?s=resolution#magic');
  });

  /**
   * GARDE-FOU de l'hypothèse tenue par `subsectionAnchorId` : le slug de sous-section seul suffit
   * comme `id` DOM. Si une extraction future réutilisait un slug dans deux sections, deux blocs
   * porteraient la même ancre et un lien partagé deviendrait ambigu → ce test tombe, et c'est
   * `subsectionAnchorId` (chokepoint) qu'il faut alors qualifier par la section.
   */
  it('donne une ancre unique à chaque bloc de sous-section, toutes sections confondues', () => {
    const anchors = groupReferenceEntries(REFERENCE_ENTRIES).flatMap((group) =>
      group.subsections.map((sub) => subsectionAnchorId(sub.subsection)),
    );
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it('couvre les trois onglets, chacun avec au moins un bloc', () => {
    const groups = groupReferenceEntries(REFERENCE_ENTRIES);
    expect(groups.map((g) => g.section)).toEqual(SECTION_ORDER);
    for (const group of groups) expect(group.subsections.length).toBeGreaterThan(0);
  });
});

/** Fabrique un bloc de sous-section jouet, dont on maîtrise le poids par la longueur du verbatim. */
function group(subsection: string, entries: ReferenceEntry[]): ReferenceSubsectionGroup {
  return { subsection, label: subsection, entries };
}

/** Entrée de texte jouet d'un poids voulu (`lines` lignes de verbatim). */
function textEntry(id: string, lines: number): ReferenceEntry {
  const body = 'x'.repeat(lines * 64);
  return {
    kind: 'text',
    id,
    title: id,
    section: 'combat',
    subsection: 'states',
    tags: [],
    sourcePage: 214,
    shortEffect: body,
    body,
  };
}

describe('répartition des blocs de l’aide-mémoire en colonnes (PER-311)', () => {
  it('renvoie une colonne unique en dessous de deux colonnes (mobile), sans réordonner', () => {
    const blocks = [group('a', []), group('b', []), group('c', [])];
    expect(splitReferenceColumns(blocks, 1)).toEqual([blocks]);
    expect(splitReferenceColumns(blocks, 0)).toEqual([blocks]);
  });

  it('conserve tous les blocs, une seule fois chacun', () => {
    const blocks = groupReferenceEntries(REFERENCE_ENTRIES).flatMap((g) => g.subsections);
    const placed = splitReferenceColumns(blocks, 2).flat();
    expect(placed).toHaveLength(blocks.length);
    expect(new Set(placed.map((b) => b.subsection)).size).toBe(blocks.length);
  });

  it('conserve l’ordre du livre À L’INTÉRIEUR de chaque colonne', () => {
    const blocks = groupReferenceEntries(REFERENCE_ENTRIES).flatMap((g) => g.subsections);
    const rank = new Map(blocks.map((b, i) => [b.subsection, i]));
    for (const column of splitReferenceColumns(blocks, 2)) {
      const ranks = column.map((b) => rank.get(b.subsection)!);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it('envoie chaque bloc dans la colonne la plus courte, la gauche gagnant à égalité', () => {
    // Trois blocs de 1, 1 puis 5 lignes : les deux premiers ouvrent chaque colonne (égalité →
    // gauche d'abord), le gros part à droite car les colonnes sont alors à poids égal.
    const blocks = [
      group('a', [textEntry('a1', 1)]),
      group('b', [textEntry('b1', 1)]),
      group('c', [textEntry('c1', 5)]),
    ];
    const [left, right] = splitReferenceColumns(blocks, 2);
    expect(left.map((b) => b.subsection)).toEqual(['a', 'c']);
    expect(right.map((b) => b.subsection)).toEqual(['b']);
  });

  it('équilibre les colonnes des vrais onglets à mieux qu’un tiers d’écart', () => {
    for (const section of groupReferenceEntries(REFERENCE_ENTRIES)) {
      const columns = splitReferenceColumns(section.subsections, 2);
      const weights = columns.map((c) => c.reduce((n, b) => n + subsectionWeight(b), 0));
      const total = weights[0] + weights[1];
      // Un déséquilibre de plus d'un tiers signifierait une colonne quasi vide en face d'un mur
      // de texte — le défaut même que le ticket corrige.
      expect(Math.abs(weights[0] - weights[1]) / total).toBeLessThan(1 / 3);
    }
  });

  it('donne un poids croissant avec le contenu, jamais nul', () => {
    expect(subsectionWeight(group('vide', []))).toBeGreaterThan(0);
    expect(subsectionWeight(group('court', [textEntry('x', 1)]))).toBeLessThan(
      subsectionWeight(group('long', [textEntry('x', 10)])),
    );
  });

  /**
   * Le poids doit estimer la hauteur REPLIÉE (2ᵉ passe PER-311) : une entrée au verbatim énorme mais
   * à l'effet court d'une ligne n'occupe qu'une ligne au repos. Compter `body` remplissait une
   * colonne de vide en face des sous-sections bavardes.
   */
  it('se règle sur l’effet court affiché, pas sur le verbatim replié', () => {
    const bavarde = group('bavarde', [
      { ...textEntry('x', 1), body: 'y'.repeat(4000) } as ReferenceEntry,
    ]);
    expect(subsectionWeight(bavarde)).toBe(subsectionWeight(group('sobre', [textEntry('x', 1)])));
  });
});

describe('recherche par NOM de section / sous-section (PER-311)', () => {
  /** Reproduit l'indexation de `ReferenceBrowser` pour la part qui nous intéresse ici. */
  const haystack = (entry: ReferenceEntry) =>
    normalizeSearchText(`${referenceGroupLabels(entry)} ${entry.title}`);

  it('rattache chaque entrée au libellé de sa section ET de sa sous-section', () => {
    const entry = REFERENCE_ENTRIES.find((e) => e.subsection === 'maneuvers')!;
    expect(referenceGroupLabels(entry)).toBe('Combat Manœuvres');
  });

  /**
   * LE cas signalé : « encombr » ne ramenait qu'une entrée — celle dont le verbatim contenait le mot
   * par hasard — au lieu de toute la sous-section Encombrement, dont c'est pourtant le NOM affiché.
   */
  it('ramène TOUTE la sous-section quand on tape son nom', () => {
    const attendu = REFERENCE_ENTRIES.filter((e) => e.subsection === 'encumbrance');
    const trouve = REFERENCE_ENTRIES.filter((e) => haystack(e).includes('encombr'));
    expect(attendu.length).toBeGreaterThan(1);
    for (const e of attendu) expect(trouve, `manquante : ${e.id}`).toContain(e);
  });

  it('ramène toute une SECTION quand on tape son nom', () => {
    const attendu = REFERENCE_ENTRIES.filter((e) => e.section === 'environment');
    const trouve = REFERENCE_ENTRIES.filter((e) => haystack(e).includes('environnement'));
    for (const e of attendu) expect(trouve, `manquante : ${e.id}`).toContain(e);
  });

  it('reste tolérant aux accents et ligatures sur ces libellés', () => {
    // « Manœuvres » comme libellé de sous-section, tapé sans la ligature.
    const trouve = REFERENCE_ENTRIES.filter((e) => haystack(e).includes('manoeuvre'));
    const attendu = REFERENCE_ENTRIES.filter((e) => e.subsection === 'maneuvers');
    for (const e of attendu) expect(trouve, `manquante : ${e.id}`).toContain(e);
  });
});

describe('découpe du verbatim en paragraphes (PER-311)', () => {
  it('coupe sur les lignes vides et rend un seul paragraphe pour une règle d’une phrase', () => {
    expect(splitVerbatimParagraphs('Dé malus à tous les tests.')).toEqual([
      'Dé malus à tous les tests.',
    ]);
    expect(splitVerbatimParagraphs('Un.\n\nDeux.\n\n\nTrois.')).toEqual(['Un.', 'Deux.', 'Trois.']);
  });

  it('garde les sauts de ligne SIMPLES à l’intérieur d’un paragraphe', () => {
    // `pre-line` les rend : ce sont les retours signifiants du livre (listes, formules).
    expect(splitVerbatimParagraphs('d20 + Carac.\nSi inférieur, échoue.')).toEqual([
      'd20 + Carac.\nSi inférieur, échoue.',
    ]);
  });

  it('tolère les lignes « vides » contenant des espaces, et un texte vide', () => {
    expect(splitVerbatimParagraphs('Un.\n   \nDeux.')).toEqual(['Un.', 'Deux.']);
    expect(splitVerbatimParagraphs('')).toEqual([]);
    expect(splitVerbatimParagraphs('\n\n')).toEqual([]);
  });

  /**
   * GARDE-FOU de la contrainte projet : le verbatim des règles est de la DONNÉE — la mise en page ne
   * le réécrit pas. La découpe n'a le droit de retirer QUE des blancs : recollés, les paragraphes
   * doivent redonner le corps d'origine à l'espacement près, sur TOUTES les entrées livrées.
   */
  it('ne perd aucun caractère non blanc, sur tout le référentiel', () => {
    const strip = (s: string) => s.replace(/\s+/g, '');
    for (const entry of REFERENCE_ENTRIES) {
      if (entry.kind !== 'text') continue;
      const rejoined = splitVerbatimParagraphs(entry.body).join('');
      expect(strip(rejoined), `verbatim altéré : ${entry.id}`).toBe(strip(entry.body));
    }
  });
});

describe('teintes des sous-sections de l’aide-mémoire (PER-311)', () => {
  it('donne une teinte à CHAQUE sous-section livrée', () => {
    const subsections = groupReferenceEntries(REFERENCE_ENTRIES).flatMap((g) =>
      g.subsections.map((s) => s.subsection),
    );
    for (const subsection of subsections) {
      expect(REFERENCE_SUBSECTION_COLORS[subsection], `teinte manquante : ${subsection}`).toBeDefined();
    }
  });

  /**
   * Le codage couleur ne vaut que si deux blocs affichés côte à côte ne portent pas la même teinte
   * — y compris en RECHERCHE, où les résultats mêlent les trois onglets.
   */
  it('n’attribue jamais deux fois la même teinte', () => {
    const colors = Object.values(REFERENCE_SUBSECTION_COLORS);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('retombe sur une teinte neutre pour une sous-section inconnue', () => {
    expect(subsectionColor('sous-section-ajoutee-par-une-extraction-future')).toBe('#8b98a5');
  });
});
