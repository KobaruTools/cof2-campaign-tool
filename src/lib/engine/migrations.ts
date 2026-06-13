/**
 * Migrations du schéma de personnage et validation d'import (PRD §7, §5.1).
 *
 * Tout chargement (localStorage) ou import JSON passe par `migrateCharacter`,
 * qui amène un objet d'une version ancienne jusqu'à `SCHEMA_VERSION`, puis par
 * une validation structurelle qui refuse proprement un fichier invalide.
 *
 * Une migration `N` transforme un objet de version N en version N+1. Les
 * migrations sont conservées dans le code dès la première évolution du schéma.
 */
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import { ABILITY_IDS } from '@/data/schema';

/** Transforme un objet de la version `from` vers `from + 1`. */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** Renomme une clé d'un objet (si présente), en préservant la valeur. */
function renameKey(obj: Record<string, unknown>, from: string, to: string): void {
  if (Object.prototype.hasOwnProperty.call(obj, from)) {
    obj[to] = obj[from];
    delete obj[from];
  }
}

const asRecord = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/**
 * v1 → v2 : passage des clés du modèle de personnage du français à l'anglais
 * (PR « réécriture du code en anglais »). Aucune VALEUR n'est traduite — les
 * slugs (`ancestryId: 'humain'`, ids de capacités, etc.) restent identiques ;
 * seuls les NOMS de champs changent. Les stats dérivées surchargées
 * (`overrides`) sont remappées vers les nouveaux `DerivedStatId` anglais.
 */
function migrateV1toV2(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };

  renameKey(next, 'peupleId', 'ancestryId');
  renameKey(next, 'profilId', 'classId');
  renameKey(next, 'niveau', 'level');
  renameKey(next, 'caracteristiques', 'abilities');
  renameKey(next, 'voieDePeupleId', 'ancestryPathId');
  renameKey(next, 'capaciteIds', 'featureIds');

  const identity = asRecord(next.identity);
  if (identity) {
    renameKey(identity, 'sexe', 'sex');
    renameKey(identity, 'taille', 'height');
    renameKey(identity, 'poids', 'weight');
    next.identity = identity;
  }

  if (Array.isArray(next.levelUpHistory)) {
    next.levelUpHistory = next.levelUpHistory.map((entry) => {
      const e = asRecord(entry);
      if (!e) return entry;
      const ne = { ...e };
      renameKey(ne, 'niveau', 'level');
      renameKey(ne, 'choixCapaciteIds', 'chosenFeatureIds');
      return ne;
    });
  }

  if (Array.isArray(next.equipment)) {
    next.equipment = next.equipment.map((line) => {
      const l = asRecord(line);
      if (!l) return line;
      const nl = { ...l };
      renameKey(nl, 'quantite', 'quantity');
      renameKey(nl, 'nom', 'name'); // objets personnalisés (CustomItem)
      return nl;
    });
  }

  const overrides = asRecord(next.overrides);
  if (overrides) {
    const overrideKeyMap: Record<string, string> = {
      pvMax: 'maxHp',
      pointsChance: 'luckPoints',
      pointsMana: 'manaPoints',
      nbDesRecuperation: 'recoveryDiceCount',
      attaqueContact: 'meleeAttack',
      attaqueDistance: 'rangedAttack',
      attaqueMagique: 'magicAttack',
      // `def` et `initiative` étaient déjà en anglais.
    };
    for (const [from, to] of Object.entries(overrideKeyMap)) renameKey(overrides, from, to);
    next.overrides = overrides;
  }

  next.schemaVersion = 2;
  return next;
}

/**
 * v2 → v3 : ajout de `portraitVariant` (choix de l'illustration de profil).
 * Les personnages existants n'avaient pas ce champ → illustration standard.
 */
function migrateV2toV3(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (next.portraitVariant !== 'alt') next.portraitVariant = 'default';
  next.schemaVersion = 3;
  return next;
}

/**
 * Registre des migrations, indexé par version de départ. Une entrée `N`
 * transforme un objet v`N` en v`N+1`.
 */
export const MIGRATIONS: Record<number, Migration> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
};

export class MigrationError extends Error {}
export class ValidationError extends Error {}

/**
 * Applique les migrations en chaîne depuis la version de l'objet jusqu'à
 * `cible`. Fonction pure (migrations injectables) pour faciliter les tests.
 */
export function runMigrations(
  raw: Record<string, unknown>,
  migrations: Record<number, Migration>,
  target: number,
): Record<string, unknown> {
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new MigrationError('schemaVersion absent ou invalide.');
  }
  if (version > target) {
    throw new MigrationError(
      `Version ${version} plus récente que la version supportée (${target}). Mettez à jour l'application.`,
    );
  }
  let data = raw;
  for (let v = version; v < target; v++) {
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
  if (!isString(data.ancestryId)) fail('Champ « ancestryId » manquant ou invalide.');
  if (!isString(data.classId)) fail('Champ « classId » manquant ou invalide.');
  if (!isFiniteNumber(data.level)) fail('Champ « level » manquant ou invalide.');

  const abilities = data.abilities;
  if (typeof abilities !== 'object' || abilities === null) fail('Champ « abilities » manquant.');
  for (const id of ABILITY_IDS) {
    if (!isFiniteNumber((abilities as Record<string, unknown>)[id])) {
      fail(`Caractéristique « ${id} » manquante ou invalide.`);
    }
  }

  if (!Array.isArray(data.featureIds)) fail('Champ « featureIds » manquant ou invalide.');
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
