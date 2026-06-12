/**
 * Migrations du schéma de personnage et validation d'import (PRD §7, §5.1).
 *
 * Tout chargement (localStorage) ou import JSON passe par `migrateCharacter`,
 * qui amène un objet d'une version ancienne jusqu'à `SCHEMA_VERSION`, puis par
 * une validation structurelle qui refuse proprement un fichier invalide.
 *
 * Une migration `N` transforme un objet de version N en version N+1. Les
 * migrations sont conservées dans le code dès la première évolution du schéma
 * (ici : aucune, le schéma en est à la v1).
 */
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import { CARAC_IDS } from '@/data/schema';

/** Transforme un objet de la version `from` vers `from + 1`. */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Registre des migrations, indexé par version de départ. Vide tant que le
 * schéma n'a pas évolué au-delà de la v1. Exemple futur :
 *   { 1: (d) => ({ ...d, schemaVersion: 2, nouveauChamp: valeurParDefaut }) }
 */
export const MIGRATIONS: Record<number, Migration> = {};

export class MigrationError extends Error {}
export class ValidationError extends Error {}

/**
 * Applique les migrations en chaîne depuis la version de l'objet jusqu'à
 * `cible`. Fonction pure (migrations injectables) pour faciliter les tests.
 */
export function runMigrations(
  raw: Record<string, unknown>,
  migrations: Record<number, Migration>,
  cible: number,
): Record<string, unknown> {
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new MigrationError('schemaVersion absent ou invalide.');
  }
  if (version > cible) {
    throw new MigrationError(
      `Version ${version} plus récente que la version supportée (${cible}). Mettez à jour l'application.`,
    );
  }
  let data = raw;
  for (let v = version; v < cible; v++) {
    const migration = migrations[v];
    if (!migration) throw new MigrationError(`Migration manquante pour la version ${v}.`);
    data = migration(data);
  }
  return data;
}

/**
 * Validation structurelle minimale : présence et type des champs critiques.
 * Refuse un objet qui n'est manifestement pas un personnage (sans prétendre
 * valider chaque référence de règle — la fiche permissive tolère les écarts de
 * contenu, signalés par `verifierConformite`).
 */
export function validateCharacterShape(input: unknown): asserts input is Character {
  const fail = (msg: string): never => {
    throw new ValidationError(msg);
  };
  if (typeof input !== 'object' || input === null) fail('Données de personnage non-objet.');
  const data = input as Record<string, unknown>;
  const isString = (v: unknown) => typeof v === 'string';
  const isFiniteNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

  if (!isString(data.id)) fail('Champ « id » manquant ou invalide.');
  if (!isString(data.name)) fail('Champ « name » manquant ou invalide.');
  if (!isString(data.peupleId)) fail('Champ « peupleId » manquant ou invalide.');
  if (!isString(data.profilId)) fail('Champ « profilId » manquant ou invalide.');
  if (!isFiniteNumber(data.niveau)) fail('Champ « niveau » manquant ou invalide.');

  const caracs = data.caracteristiques;
  if (typeof caracs !== 'object' || caracs === null) fail('Champ « caracteristiques » manquant.');
  for (const id of CARAC_IDS) {
    if (!isFiniteNumber((caracs as Record<string, unknown>)[id])) {
      fail(`Caractéristique « ${id} » manquante ou invalide.`);
    }
  }

  if (!Array.isArray(data.capaciteIds)) fail('Champ « capaciteIds » manquant ou invalide.');
  if (!Array.isArray(data.equipment)) fail('Champ « equipment » manquant ou invalide.');
  if (!Array.isArray(data.levelUpHistory)) fail('Champ « levelUpHistory » manquant ou invalide.');
}

/**
 * Migre puis valide un objet quelconque (issu d'un JSON importé ou du
 * localStorage). Lève `MigrationError`/`ValidationError` en cas d'échec, sinon
 * retourne un `Character` à la version courante.
 */
export function migrateCharacter(raw: unknown): Character {
  if (typeof raw !== 'object' || raw === null) {
    throw new ValidationError('Données de personnage absentes ou non-objet.');
  }
  const migrated = runMigrations(raw as Record<string, unknown>, MIGRATIONS, SCHEMA_VERSION);
  validateCharacterShape(migrated);
  return migrated;
}
