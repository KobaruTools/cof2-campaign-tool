/**
 * AIDE-MÉMOIRE — point d'entrée du domaine de référence (PER-39).
 *
 * Ré-exporte le schéma et accueillera les catalogues d'extraction (PER-40 `maneuvers.ts`,
 * `attack-modifiers.ts`… ; PER-41 `tests.ts`, `damage.ts`, `magic.ts` ; PER-42 `environment.ts`,
 * `gear.ts`, `encumbrance.ts`). Les ÉTATS ne sont PAS un catalogue de ce domaine : ils sont adaptés
 * de `STATUS_EFFECTS` via `statusEffectToReference()` (source unique — cf. `schema.ts`).
 *
 * Ci-dessous : DEUX exemples FACTICES, uniquement pour valider le typage. Aucune donnée réelle tant
 * que l'extraction (validée contre le PDF) n'a pas eu lieu — ils seront supprimés par PER-40/41/42.
 */

export * from './schema';

import type { ReferenceEntry } from './schema';

/**
 * EXEMPLES FACTICES — à SUPPRIMER lors de l'extraction. Ils valident les deux formes du schéma
 * (`text` avec `test`, et `table`). Contenu volontairement non-verbatim : ne pas s'y fier comme règle.
 */
export const REFERENCE_EXAMPLES: ReferenceEntry[] = [
  {
    kind: 'text',
    id: 'example-maneuver',
    title: 'Manœuvre (exemple)',
    section: 'combat',
    subsection: 'maneuvers',
    icon: undefined,
    tags: ['exemple'],
    sourcePage: 0, // TODO(extraction): remplacé par la vraie page (PER-40).
    shortEffect: 'Effet court d’une ligne pour le badge.',
    body: 'Verbatim complet de la manœuvre, tel qu’il sera recopié du livre lors de l’extraction.',
    test: 'Test opposé d’attaque (mod. CHA)',
  },
  {
    kind: 'table',
    id: 'example-table',
    title: 'Table (exemple)',
    section: 'resolution',
    subsection: 'tests',
    tags: ['exemple'],
    sourcePage: 0, // TODO(extraction): remplacé par la vraie page (PER-41).
    columns: [
      { key: 'level', label: 'Niveau' },
      { key: 'value', label: 'Difficulté' },
    ],
    rows: [
      { level: 'Très facile', value: '5' },
      { level: 'Facile', value: '10' },
    ],
    note: 'Renvoi ou précision verbatim sous le tableau.',
  },
];
