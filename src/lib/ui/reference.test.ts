import { describe, expect, it } from 'vitest';
import { REFERENCE_ENTRIES } from '@/data/reference';
import {
  SECTION_ORDER,
  groupReferenceEntries,
  referenceSectionHref,
  referenceSubsectionHref,
  subsectionAnchorId,
} from './reference';

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
