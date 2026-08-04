/**
 * AIDE-MÉMOIRE — schéma du domaine de données de référence (PER-39).
 *
 * Objectif : un référentiel de règles CONSULTABLE dans l'app (états, manœuvres, modificateurs
 * d'attaque, options tactiques, tables de difficulté / poisons / pièges / encombrement…), rendu à
 * trois densités selon la surface :
 *   - FICHE JOUEUR : section repliable sous « Statistiques dérivées », badges + verbatim au survol ;
 *   - ÉCRAN MJ : tiroir « Aide-mémoire », effet en clair + tables ;
 *   - PAGE DÉDIÉE (PER-46) : rendu canonique, sections + tables + recherche.
 * Une même entrée `ReferenceEntry` alimente les trois — d'où les deux niveaux de texte
 * (`shortEffect` pour le badge, `body` verbatim complet).
 *
 * SÉPARATION (contrainte PER-39) : ce domaine est TOTALEMENT séparé du modèle `Character`, du store
 * zustand et du moteur (`src/lib/engine/`). Il ne dépend que des DONNÉES de règles (`@/data/schema`).
 *
 * SOURCE UNIQUE DES ÉTATS — NE PAS DUPLIQUER. Les 10 états préjudiciables du glossaire (p. 214-215)
 * existent déjà comme données canoniques dans `STATUS_EFFECTS` (`@/data/schema`), avec leur verbatim,
 * leur page source ET leur part chiffrée. L'aide-mémoire ne les RE-STOCKE pas : il les ADAPTE en
 * lecture via `statusEffectToReference()`. Seul le contenu RÉELLEMENT NEUF (manœuvres, modificateurs
 * d'attaque, options tactiques, tables) est saisi nativement dans ce domaine (extraction PER-40/41/42).
 *
 * Chaque entrée porte sa page du livre de base (`sourcePage`, convention projet : jamais de règle
 * affichée sans son renvoi de page — rendu via `<SourceRef/>`).
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 * DÉCOUPAGE EN SECTIONS (figé — sert de navigation à l'UI). Trois domaines de premier niveau, alignés
 * 1:1 sur les tickets d'extraction, chacun subdivisé par `subsection` (slug documenté, volontairement
 * NON typé en union fermée pour ne pas re-bloquer l'extraction sur du design — cf. conventions ci-bas) :
 *
 *   'combat'       (PER-40) — subsections recommandées :
 *                    'states'            états préjudiciables (ADAPTÉS de STATUS_EFFECTS)
 *                    'maneuvers'         gêner, repousser, bloquer, désarmer, aveugler, renverser, étourdir
 *                    'attack-modifiers'  couvert, visibilité, portée longue, tir au contact…
 *                    'special-actions'   2 armes, sprinter, nager, ramper/escalader, combat monté, embuscade…
 *                    'tactical-options'  attaque assurée, violente/précise, défense partielle/totale, riposte…
 *   'resolution'   (PER-41) — subsections recommandées :
 *                    'tests'             table de difficulté, tests opposés, marges
 *                    'damage'            résolution des dégâts, critiques, RD
 *                    'magic'             résolution de la magie
 *   'environment'  (PER-42) — subsections recommandées :
 *                    'environment'       lumière, chutes, feu, noyade, poisons, pièges…
 *                    'gear'              matériel d'aventure
 *                    'encumbrance'       encombrement
 *
 * CONVENTIONS de saisie (destinées à PER-40/41/42) :
 *   - `id` : slug stable en anglais. Pour un état ADAPTÉ, c'est l'`id` de `STATUS_EFFECTS` (source unique).
 *   - `title`, `shortEffect`, `body`, `note` : FRANÇAIS (affichés). `body` en VERBATIM du livre.
 *   - Tout doute : `// TODO(extraction): p. X — à vérifier` plutôt qu'une valeur devinée.
 */

import type { SourcePage, StatusEffectId } from '@/data/schema';
import { STATUS_EFFECTS } from '@/data/schema';

/** Domaines de premier niveau de l'aide-mémoire (navigation figée — cf. en-tête). */
export type ReferenceSection = 'combat' | 'resolution' | 'environment';

/**
 * Sous-domaine d'une entrée (regroupe les rangées de badges sur la fiche et les blocs sur la page
 * dédiée). Slug en anglais ; valeurs recommandées documentées en tête de fichier. Volontairement
 * typé `string` (et non union fermée) pour laisser l'extraction ajouter des sous-domaines sans
 * toucher au schéma — le découpage de PREMIER niveau (`ReferenceSection`), lui, reste figé.
 */
export type ReferenceSubsection = string;

/** Champs communs à toute entrée d'aide-mémoire, quelle que soit sa forme (texte ou tableau). */
interface ReferenceEntryBase {
  /** Slug stable (anglais). Pour un état adapté = l'`id` de `STATUS_EFFECTS`. */
  id: string;
  /** Libellé affiché (français) — sert de titre de carte et de texte de badge. */
  title: string;
  /** Domaine de premier niveau (navigation). */
  section: ReferenceSection;
  /** Sous-domaine (regroupe les entrées d'une même rangée / d'un même bloc). */
  subsection: ReferenceSubsection;
  /** Clé d'icône `game-icons` pour le badge (optionnelle — l'UI a un fallback neutre). */
  icon?: string;
  /** Mots-clés (français ou anglais) pour la recherche interne — cumulés au titre et au verbatim. */
  tags: string[];
  /** Page du livre de base d'où provient l'entrée (rendue via `<SourceRef/>`). */
  sourcePage: SourcePage;
}

/**
 * Entrée « encadré de texte » : un état, une manœuvre, un modificateur, une option… `shortEffect`
 * est l'aperçu compact (badge / rangée de fiche) ; `body` est le VERBATIM complet (tooltip, tiroir
 * MJ, page dédiée). `test` isole la mécanique de résolution des manœuvres pour la rendre en puce.
 */
export interface ReferenceTextEntry extends ReferenceEntryBase {
  kind: 'text';
  /** Effet en UNE ligne — badge compact et aperçu de rangée. */
  shortEffect: string;
  /** Effet VERBATIM du livre — affiché en clair (MJ, page dédiée) et au survol (fiche). */
  body: string;
  /**
   * Mécanique de résolution, quand l'entrée en a une (surtout les manœuvres) : un test opposé rendu
   * en puce distincte, ex. « Test opposé d'attaque (mod. CHA) ». Absent = pas de test dédié.
   */
  test?: string;
}

/** Une colonne d'un tableau structuré : sa clé stable (anglais) et son en-tête affiché (français). */
export interface ReferenceTableColumn {
  key: string;
  label: string;
}

/**
 * Entrée « tableau structuré » : table de difficulté, poisons, pièges, encombrement… Les cellules
 * sont des chaînes d'AFFICHAGE (`Record<colKey, string>`) — c'est du rendu, pas du calcul : on ne
 * type pas les cellules par colonne, ce qui garderait l'extraction bloquée sur du design par table.
 */
export interface ReferenceTableEntry extends ReferenceEntryBase {
  kind: 'table';
  columns: ReferenceTableColumn[];
  /** Une ligne = une cellule par `column.key`. */
  rows: Record<string, string>[];
  /** Renvoi / précision verbatim sous le tableau (optionnel). */
  note?: string;
}

/** Une entrée d'aide-mémoire : encadré de texte OU tableau structuré (union discriminée par `kind`). */
export type ReferenceEntry = ReferenceTextEntry | ReferenceTableEntry;

/**
 * ADAPTE un état préjudiciable du glossaire (`STATUS_EFFECTS`, source unique) en entrée d'aide-mémoire.
 * Aucune donnée d'état n'est recopiée ici : le verbatim et la page restent portés par `STATUS_EFFECTS`.
 * L'`icon` et un `shortEffect` plus court que le verbatim peuvent être fournis à l'appel (l'extraction
 * PER-40 enrichira au besoin) ; par défaut le `shortEffect` reprend l'effet du glossaire, déjà bref.
 */
export function statusEffectToReference(
  id: StatusEffectId,
  opts: { icon?: string; shortEffect?: string; tags?: string[] } = {},
): ReferenceTextEntry {
  const entry = STATUS_EFFECTS[id];
  return {
    kind: 'text',
    id,
    title: entry.label,
    section: 'combat',
    subsection: 'states',
    icon: opts.icon,
    tags: opts.tags ?? [],
    sourcePage: entry.sourcePage,
    shortEffect: opts.shortEffect ?? entry.effect,
    body: entry.effect,
  };
}
