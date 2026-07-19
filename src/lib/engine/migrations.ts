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
import { SCHEMA_VERSION, type Character, type EquipmentLine } from '@/lib/character/types';
import { ABILITY_IDS, type AbilityId, type DamageDie, type WeaponDamage } from '@/data/schema';
import { ancestryById } from '@/data';
import { modifierDeltas, type AncestryChoice } from '@/lib/character/ancestry';
import { autoEquipStartingGear } from '@/lib/character/equipment';
import { DEFAULT_CAMPAIGN_ID, DEFAULT_PLAYER_ID } from '@/lib/campaign/types';

/** Statuts de personnage valides (garde de la migration + de la validation). */
const CHARACTER_STATUSES = ['active', 'dead', 'retired'];

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
 * v11 → v12 : ajout de `purse` (argent possédé, par unité or/argent/cuivre —
 * PER-152). Les personnages d'avant v12 n'ont pas de bourse renseignée : on
 * initialise une bourse vide (0 dans chaque unité).
 */
function migrateV11toV12(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (asRecord(next.purse) === null) next.purse = { gold: 0, silver: 0, copper: 0 };
  next.schemaVersion = 12;
  return next;
}

/**
 * v12 → v13 : ajout de `firearmsAllowed` (armes à feu autorisées dans l'univers
 * de jeu — p. 185). Les personnages d'avant v13 sont réputés jouer avec les armes
 * à feu autorisées (comportement historique) : on initialise à `true`.
 */
function migrateV12toV13(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (typeof next.firearmsAllowed !== 'boolean') next.firearmsAllowed = true;
  next.schemaVersion = 13;
  return next;
}

/**
 * v13 → v14 : ajout de la pièce de platine (`purse.platinum`, pp — 1 pp = 10 po,
 * p. 181). Les bourses d'avant v14 n'ont que or/argent/cuivre : on initialise la
 * platine à 0 (les autres unités restent inchangées).
 */
function migrateV13toV14(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  const purse = asRecord(next.purse);
  if (purse !== null && typeof purse.platinum !== 'number') {
    next.purse = { ...purse, platinum: 0 };
  }
  next.schemaVersion = 14;
  return next;
}

/**
 * v14 → v15 : ajout des clés étrangères de la hiérarchie Campagne ⊃ Joueurs ⊃
 * Personnages (PER-179). Migration PURE, par personnage : elle estampille des FK
 * CONSTANTES connues (`DEFAULT_CAMPAIGN_ID` / `DEFAULT_PLAYER_ID`) et
 * `status: 'active'` sur tout perso préexistant, sans perte. La garantie
 * d'existence de la campagne correspondante est du ressort du store `campaigns`
 * (bootstrap) — nette séparation migration/store. Idempotent : on ne réécrit pas
 * une FK déjà présente et valide.
 */
function migrateV14toV15(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (typeof next.campaignId !== 'string') next.campaignId = DEFAULT_CAMPAIGN_ID;
  if (typeof next.playerId !== 'string') next.playerId = DEFAULT_PLAYER_ID;
  if (typeof next.status !== 'string' || !CHARACTER_STATUSES.includes(next.status)) {
    next.status = 'active';
  }
  next.schemaVersion = 15;
  return next;
}

/**
 * v15 → v16 : la campagne devient un regroupement OPTIONNEL (PER-180). Les
 * personnages avaient été auto-attribués à la « Campagne par défaut » en v15
 * (FK constantes, jamais choisies par l'utilisateur) : on les repasse « Non
 * attribué » (`campaignId`/`playerId` → `null`). Une FK vers une VRAIE campagne
 * (choisie depuis l'app) est préservée. Le joueur étant local à la campagne,
 * retirer la campagne retire aussi le joueur.
 */
function migrateV15toV16(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (next.campaignId === DEFAULT_CAMPAIGN_ID) {
    next.campaignId = null;
    next.playerId = null;
  }
  if (next.playerId === DEFAULT_PLAYER_ID) next.playerId = null;
  next.schemaVersion = 16;
  return next;
}

/**
 * v16 → v17 : ajout de l'état « porté » sur les lignes d'équipement (PER-76). Le
 * modèle distingue désormais un objet porté d'un objet rangé, et la défense ne
 * compte que le porté. Pour que les personnages existants ne voient pas leur
 * défense chuter au chargement, on auto-équipe la meilleure armure, le meilleur
 * bouclier et la première arme déjà présents dans l'inventaire (logique partagée
 * avec l'équipement de départ, `autoEquipStartingGear`). Idempotent : une liste
 * déjà porteuse d'un objet équipé n'est pas retouchée.
 *
 * Effet de bord voulu : un personnage qui aurait empilé plusieurs armures dans son
 * sac (dont l'ancien calcul cumulait à tort les bonus de DEF) voit sa défense
 * corrigée à la seule meilleure armure portée — c'est précisément le bug visé.
 */
function migrateV16toV17(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (Array.isArray(next.equipment)) {
    next.equipment = autoEquipStartingGear(next.equipment as EquipmentLine[]);
  }
  next.schemaVersion = 17;
  return next;
}

/**
 * Dés de DM reconnus par le parser de migration (PER-217) — `Die` (d4…d20) + `d3`.
 * Une notation portant un autre dé (d5, d7…) est jugée non parsable.
 */
const PARSABLE_DAMAGE_DICE = new Set<string>(['d3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20']);

/**
 * Parser GELÉ (usage unique — migration v17→v18) d'une notation de DM en chaîne vers
 * le modèle structuré `WeaponDamage` (PER-217). Grammaire fermée acceptée : `NdM`,
 * `NdM+K`, `NdM-K` et leur variante non létale entre parenthèses `(NdM…)`. Le nombre
 * de dés est optionnel (défaut 1). Toute chaîne hors de cette grammaire — dé évolutif
 * `°`, ajout de carac `+ INT`, dé inconnu — renvoie `null` (la surcharge sera retirée).
 */
function parseWeaponDamage(raw: string): WeaponDamage | null {
  let body = raw.trim();
  let nonLethal = false;
  const paren = /^\((.*)\)$/.exec(body);
  if (paren) {
    nonLethal = true;
    body = paren[1].trim();
  }
  const m = /^(\d*)d(\d+)([+-]\d+)?$/.exec(body);
  if (!m) return null;
  const die = `d${m[2]}`;
  if (!PARSABLE_DAMAGE_DICE.has(die)) return null;
  const count = m[1] === '' ? 1 : Number.parseInt(m[1], 10);
  if (count < 1) return null;
  const result: WeaponDamage = { count, die: die as DamageDie };
  if (m[3]) result.modifier = Number.parseInt(m[3], 10);
  if (nonLethal) result.nonLethal = true;
  return result;
}

/**
 * v17 → v18 : passage des DM d'arme d'une chaîne libre au modèle structuré `WeaponDamage`
 * (PER-217). Seules les VARIANTES d'objet du personnage portent des DM sérialisés
 * (`EquipmentOverrides.damage`/`twoHandedDamage`) — le catalogue est du code source,
 * réécrit à la main. Pour chaque variante, on convertit les surcharges de DM en chaîne
 * via le parser gelé. Une chaîne non parsable est RETIRÉE : la ligne retombe alors sur
 * le DM structuré de l'arme de base, tandis que le nom et les autres surcharges de la
 * variante survivent (cas jugé vide en données réelles ; `console.warn` en dev).
 */
function migrateV17toV18(data: Record<string, unknown>): Record<string, unknown> {
  const next = { ...data };
  if (Array.isArray(next.equipment)) {
    next.equipment = next.equipment.map((line) => {
      const l = asRecord(line);
      if (!l) return line;
      const overrides = asRecord(l.overrides);
      if (!overrides) return line;
      const nextOverrides = { ...overrides };
      for (const key of ['damage', 'twoHandedDamage'] as const) {
        const value = nextOverrides[key];
        if (typeof value !== 'string') continue;
        const parsed = parseWeaponDamage(value);
        if (parsed) {
          nextOverrides[key] = parsed;
        } else {
          delete nextOverrides[key];
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              `[migration v17→v18] DM « ${value} » non parsable sur la variante « ${
                typeof overrides.name === 'string' ? overrides.name : l.itemId
              } » : surcharge retirée, retour au DM de l'arme de base.`,
            );
          }
        }
      }
      return { ...l, overrides: nextOverrides };
    });
  }
  next.schemaVersion = 18;
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
  11: migrateV11toV12,
  12: migrateV12toV13,
  13: migrateV13toV14,
  14: migrateV14toV15,
  15: migrateV15toV16,
  16: migrateV16toV17,
  17: migrateV17toV18,
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
  if (typeof data.purse !== 'object' || data.purse === null) {
    fail('Champ « purse » manquant ou invalide.');
  }
  // Clés étrangères de la hiérarchie campagne : nullable depuis v16 (PER-180).
  // `null` = « Non attribué » ; sinon une chaîne (id de campagne / de joueur).
  if (data.campaignId !== null && !isString(data.campaignId)) {
    fail('Champ « campaignId » invalide.');
  }
  if (data.playerId !== null && !isString(data.playerId)) {
    fail('Champ « playerId » invalide.');
  }
  if (!isString(data.status) || !CHARACTER_STATUSES.includes(data.status as string)) {
    fail('Champ « status » manquant ou invalide.');
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
