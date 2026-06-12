/**
 * Point d'entrée unique des données de règles CO2 (jalon J2).
 *
 * Agrège les fichiers par domaine en collections plates + quelques index de
 * lookup par id. Le moteur de calcul (J3) et l'UI (J4+) consomment ce module,
 * jamais les fichiers individuels.
 *
 * Intégrité référentielle (voieIds/capaciteIds/itemId/...) vérifiée par
 * `scripts/validate-data.ts`.
 */
import type {
  Arme,
  Armure,
  Bouclier,
  Capacite,
  EquipementItem,
  Famille,
  IdealTravers,
  Materiel,
  Peuple,
  Profil,
  ReglesProgression,
  SerieDeValeurs,
  Voie,
  VoieDePeuple,
  VoieDePrestige,
  VoieDeProfil,
  VoieDuMage,
} from './schema';

import { familles } from './familles';
import { series } from './series';
import { progression } from './progression';
import { ideauxTravers } from './ideaux-travers';
import { peuples } from './peuples';
import { voiesDePeuple, voieDuMage, capacitesPeuples } from './voies-peuples';
import { profilsAventuriers, voiesAventuriers, capacitesAventuriers } from './profils/aventuriers';
import { profilsCombattants, voiesCombattants, capacitesCombattants } from './profils/combattants';
import { profilsMages, voiesMages, capacitesMages } from './profils/mages';
import { profilsMystiques, voiesMystiques, capacitesMystiques } from './profils/mystiques';
import { voiesPrestige1, capacitesPrestige1 } from './voies-prestige/partie1';
import { voiesPrestige2, capacitesPrestige2 } from './voies-prestige/partie2';
import { armes, armures, boucliers, materiel } from './equipement';

// --- Règles transverses ------------------------------------------------------
export { familles, series, progression, ideauxTravers };

// --- Peuples -----------------------------------------------------------------
export { peuples };

// --- Profils (concaténés, ordre des familles) --------------------------------
export const profils: Profil[] = [
  ...profilsAventuriers,
  ...profilsCombattants,
  ...profilsMages,
  ...profilsMystiques,
];

// --- Voies -------------------------------------------------------------------
export const voiesDeProfil: VoieDeProfil[] = [
  ...voiesAventuriers,
  ...voiesCombattants,
  ...voiesMages,
  ...voiesMystiques,
];

export const voiesDePrestige: VoieDePrestige[] = [...voiesPrestige1, ...voiesPrestige2];

export { voiesDePeuple, voieDuMage };

/** Toutes les voies, tous types confondus. */
export const voies: Voie[] = [
  ...voiesDeProfil,
  ...voiesDePeuple,
  voieDuMage,
  ...voiesDePrestige,
];

// --- Capacités (toutes voies confondues) -------------------------------------
export const capacites: Capacite[] = [
  ...capacitesPeuples,
  ...capacitesAventuriers,
  ...capacitesCombattants,
  ...capacitesMages,
  ...capacitesMystiques,
  ...capacitesPrestige1,
  ...capacitesPrestige2,
];

// --- Équipement --------------------------------------------------------------
export { armes, armures, boucliers, materiel };
export const equipement: EquipementItem[] = [...armes, ...armures, ...boucliers, ...materiel];

// --- Index de lookup par id --------------------------------------------------
export const peupleParId = new Map<string, Peuple>(peuples.map((p) => [p.id, p]));
export const profilParId = new Map<string, Profil>(profils.map((p) => [p.id, p]));
export const voieParId = new Map<string, Voie>(voies.map((v) => [v.id, v]));
export const capaciteParId = new Map<string, Capacite>(capacites.map((c) => [c.id, c]));
export const equipementParId = new Map<string, EquipementItem>(equipement.map((e) => [e.id, e]));

export type { Famille, ReglesProgression, SerieDeValeurs, IdealTravers, Arme, Armure, Bouclier, Materiel };
