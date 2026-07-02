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
import { ABILITY_IDS, type AbilityId } from '@/data/schema';
import { ancestryById } from '@/data';
import { modifierDeltas, type AncestryChoice } from '@/lib/character/ancestry';

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
 * v3 → v4 : ajout de `baseAbilities` (valeurs de base avant modificateurs de
 * peuple) et `ancestryChoices` (résolution de ces modificateurs), pour afficher
 * le détail « base + peuple = total » d'une caractéristique.
 *
 * Les personnages d'avant v4 ne stockaient que les valeurs finales et pas le
 * choix de peuple : on les reconstruit au mieux. Chaque modificateur est résolu
 * vers sa caractéristique fixe quand il n'y a pas de choix, sinon vers sa
 * première option (impossible de retrouver le choix d'origine). La base est
 * alors déduite par soustraction, de sorte que l'invariant
 * « base + modificateurs = valeur finale » tienne toujours et que le total
 * affiché reste exact ; seule l'attribution d'un modificateur « au choix » peut
 * différer du choix réel fait à la création.
 */
function migrateV3toV4(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  const abilities = asRecord(next.abilities);
  const ancestry = typeof next.ancestryId === 'string' ? ancestryById.get(next.ancestryId) : undefined;

  if (abilities && ancestry) {
    // Reconstruit les choix : carac fixe imposée, sinon première option proposée.
    const choices: AncestryChoice = ancestry.abilityModifiers.map((mod) => mod.abilities[0] ?? null);
    const deltas = modifierDeltas(ancestry, choices);
    const base = ABILITY_IDS.reduce(
      (acc, id) => {
        const final = typeof abilities[id] === 'number' ? (abilities[id] as number) : 0;
        acc[id] = final - deltas[id];
        return acc;
      },
      {} as Record<AbilityId, number>,
    );
    next.baseAbilities = base;
    next.ancestryChoices = choices;
  } else {
    // Peuple/caractéristiques absents ou inconnus : base = valeurs finales, sans
    // modificateur attribué (la fiche permissive tolère cet écart).
    next.baseAbilities = abilities ?? {};
    next.ancestryChoices = [];
  }

  next.schemaVersion = 4;
  return next;
}

/**
 * v4 → v5 : ajout de `featureChoices` (choix retenus pour les capacités qui en
 * portent — PER-66). Les personnages d'avant v5 n'ont fait aucun choix
 * structuré : on initialise une table vide. Les valeurs par défaut (choix « pas
 * encore fait ») sont matérialisées à la demande par l'UI/le moteur ; on ne
 * tente pas de reconstruire des choix passés (impossible à retrouver).
 */
function migrateV4toV5(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (asRecord(next.featureChoices) === null) next.featureChoices = {};
  next.schemaVersion = 5;
  return next;
}

/**
 * v5 → v6 : ajout de `effectToggles` (interrupteurs manuels des effets
 * conditionnels / temporaires des capacités — PER-67). Les personnages d'avant
 * v6 n'ont basculé aucun interrupteur : on initialise une table vide. Les effets
 * conditionnels retombent alors sur leur état par défaut (`activeByDefault`).
 */
function migrateV5toV6(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (asRecord(next.effectToggles) === null) next.effectToggles = {};
  next.schemaVersion = 6;
  return next;
}

/**
 * v6 → v7 : ajout de `effectInputs` (saisies libres d'état de jeu corrélées à un
 * interrupteur — ex. l'animal pris par « Forme animale », PER-70). Les personnages
 * d'avant v7 n'ont saisi aucune note : on initialise une table vide.
 */
function migrateV6toV7(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (asRecord(next.effectInputs) === null) next.effectInputs = {};
  next.schemaVersion = 7;
  return next;
}

/**
 * v7 → v8 : ajout de `usageCounters` (décompte des capacités à usages limités —
 * ex. « Les sept vies du chat », PER-70). Les personnages d'avant v8 n'ont aucun
 * décompte : on initialise une table vide (les compteurs partent alors de leur
 * maximum déclaré).
 */
function migrateV7toV8(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (asRecord(next.usageCounters) === null) next.usageCounters = {};
  next.schemaVersion = 8;
  return next;
}

/**
 * v8 → v9 : ajout de `priestVocation` (choix généraliste/spécialiste du prêtre —
 * p. 122). Les personnages d'avant v9 n'ont pas ce choix : on initialise à `null`
 * (non applicable). Un prêtre existant pourra le renseigner depuis la fiche.
 */
function migrateV8toV9(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (next.priestVocation === undefined) next.priestVocation = null;
  next.schemaVersion = 9;
  return next;
}

/**
 * v9 → v10 : passage de la taille (`identity.height`) des mètres aux
 * centimètres (PER — saisie en cm + avertissement de fourchette). Avant v10, la
 * taille était saisie en mètres (« 1,75 », « 1,8 »). On convertit les valeurs
 * qui ressemblent à des mètres (nombre fini < 3) en centimètres entiers ; les
 * autres (déjà en cm, ou non numériques) sont laissées telles quelles.
 */
function migrateV9toV10(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  const identity = asRecord(next.identity);
  if (identity && typeof identity.height === 'string' && identity.height.trim() !== '') {
    const meters = Number.parseFloat(identity.height.replace(',', '.'));
    if (Number.isFinite(meters) && meters < 3) {
      identity.height = String(Math.round(meters * 100));
      next.identity = identity;
    }
  }
  next.schemaVersion = 10;
  return next;
}

/**
 * v10 → v11 : ajout de `depletion` (dépletion transitoire des jauges — manque des
 * PV décomposé létal/temp, et mana dépensé — PER-147). Les personnages d'avant v11
 * n'ont subi aucune dépletion : on initialise une table vide (toutes les jauges
 * partent alors pleines).
 */
function migrateV10toV11(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (asRecord(next.depletion) === null) next.depletion = {};
  next.schemaVersion = 11;
  return next;
}

/**
 * Registre des migrations, indexé par version de départ. Une entrée `N`
 * transforme un objet v`N` en v`N+1`.
 */
export const MIGRATIONS: Record<number, Migration> = {
  1: migrateV1toV2,
  2: migrateV2toV3,
  3: migrateV3toV4,
  4: migrateV4toV5,
  5: migrateV5toV6,
  6: migrateV6toV7,
  7: migrateV7toV8,
  8: migrateV8toV9,
  9: migrateV9toV10,
  10: migrateV10toV11,
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
  if (typeof data.featureChoices !== 'object' || data.featureChoices === null) {
    fail('Champ « featureChoices » manquant ou invalide.');
  }
  if (typeof data.effectToggles !== 'object' || data.effectToggles === null) {
    fail('Champ « effectToggles » manquant ou invalide.');
  }
  if (typeof data.effectInputs !== 'object' || data.effectInputs === null) {
    fail('Champ « effectInputs » manquant ou invalide.');
  }
  if (typeof data.usageCounters !== 'object' || data.usageCounters === null) {
    fail('Champ « usageCounters » manquant ou invalide.');
  }
  if (typeof data.depletion !== 'object' || data.depletion === null) {
    fail('Champ « depletion » manquant ou invalide.');
  }
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
