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

/** Prédicat de sûreté : la valeur est-elle une section connue ? (validation de `?s=` dans l'URL). */
export function isReferenceSection(v: unknown): v is ReferenceSection {
  return v === 'combat' || v === 'resolution' || v === 'environment';
}
