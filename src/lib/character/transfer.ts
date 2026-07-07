/**
 * Transfert d'un personnage par FICHIER JSON (PER-182) — format d'export
 * **auto-porteur** et lecture rétrocompatible à l'import.
 *
 * Avec le cloud, un personnage porte un contexte relationnel (`campaignId`,
 * `playerId`). Un fichier exporté doit transporter ce contexte pour qu'un import
 * sur un autre poste puisse le résoudre (rattachement direct si les mêmes ids
 * existent, sinon choix d'une cible — cf. `ImportCharacterDialog`). On enveloppe
 * donc le blob `Character` dans un conteneur `{ kind, version, character, context }`.
 *
 * Le blob `character` reste la donnée de référence (migré/validé par
 * `migrateCharacter` à l'import) ; le `context` ne sert qu'à la résolution des FK
 * et à l'affichage (libellés). Ces fonctions sont **pures** (aucun accès store /
 * réseau / DOM) : le téléchargement et la résolution des libellés vivent dans
 * `transferExport.ts`, l'UI d'import dans `ImportCharacterDialog`.
 */
import type { Character } from './types';

/** Discriminant du fichier d'export enveloppé. */
export const EXPORT_KIND = 'cof2-character-export';

/** Version du format d'enveloppe (indépendante du `schemaVersion` du personnage). */
export const EXPORT_FORMAT_VERSION = 1;

/**
 * Référence à une entité liée (campagne ou joueur) transportée par le fichier :
 * `id` pour tenter un rattachement direct à l'import, `name` pour l'affichage
 * (« Fichier issu de la campagne … ») même si l'entité est inconnue du poste.
 */
export interface TransferRef {
  id: string;
  name: string;
}

/** Contexte relationnel (clés étrangères) transporté par un fichier d'export. */
export interface TransferContext {
  campaign: TransferRef | null;
  player: TransferRef | null;
}

/** Fichier d'export auto-porteur : blob personnage + contexte des FK. */
export interface CharacterExportFile {
  kind: typeof EXPORT_KIND;
  version: number;
  character: Character;
  context: TransferContext;
}

/** Construit l'objet d'export enveloppé pour un personnage et son contexte. */
export function buildExportFile(
  character: Character,
  context: TransferContext,
): CharacterExportFile {
  return {
    kind: EXPORT_KIND,
    version: EXPORT_FORMAT_VERSION,
    character,
    context,
  };
}

/** Résultat du décorticage d'un fichier importé. */
export interface ParsedImport {
  /** Blob personnage BRUT (à migrer/valider par `migrateCharacter`). */
  raw: unknown;
  /**
   * Contexte FK, ou `null` pour un fichier HÉRITÉ (blob à plat, exporté avant
   * PER-182) — l'import retombe alors sur son comportement historique.
   */
  context: TransferContext | null;
}

/**
 * Décortique un objet JSON importé en acceptant DEUX formes (rétrocompat) :
 *  - l'enveloppe PER-182 `{ kind, version, character, context }` → renvoie le blob
 *    imbriqué et son contexte normalisé ;
 *  - un blob personnage À PLAT (fichiers exportés avant PER-182) → renvoie le blob
 *    tel quel, `context: null`.
 *
 * Ne valide PAS le personnage (délégué à `migrateCharacter`) : décide seulement de
 * la forme du fichier et normalise défensivement le contexte.
 */
export function parseImportFile(parsed: unknown): ParsedImport {
  if (isExportFile(parsed)) {
    return { raw: parsed.character, context: normalizeContext(parsed.context) };
  }
  return { raw: parsed, context: null };
}

/** L'objet est-il une enveloppe d'export (et non un blob personnage à plat) ? */
function isExportFile(v: unknown): v is CharacterExportFile {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { kind?: unknown }).kind === EXPORT_KIND &&
    'character' in v
  );
}

/** Normalise un contexte issu du fichier (défensif : champs manquants → `null`). */
function normalizeContext(context: unknown): TransferContext {
  const c = (context ?? {}) as { campaign?: unknown; player?: unknown };
  return { campaign: normalizeRef(c.campaign), player: normalizeRef(c.player) };
}

/** Normalise une référence FK : `{ id, name }` si les deux sont des chaînes, sinon `null`. */
function normalizeRef(ref: unknown): TransferRef | null {
  if (typeof ref !== 'object' || ref === null) return null;
  const { id, name } = ref as { id?: unknown; name?: unknown };
  if (typeof id !== 'string' || id.length === 0) return null;
  return { id, name: typeof name === 'string' ? name : '' };
}
