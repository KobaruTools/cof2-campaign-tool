/**
 * Les 4 familles de profils de CO2.
 *
 * Sources :
 * - p. 23-25 : présentation des familles (PV, bonus PC/DR, profils).
 * - p. 30 : table « Points de vigueur selon les familles »
 *   (PV au niveau 1 = (2 × PV de la famille) + CON), types de dé de
 *   récupération, bonus DR des mystiques, bonus PC des aventuriers.
 * - p. 39 : table « Gain de PV par niveau » (PV par niveau + CON).
 *
 * Vérification croisée : la table p. 30 donne 8+CON / 10+CON / 6+CON / 8+CON
 * au niveau 1, soit pvBase 4 / 5 / 3 / 4 ; la table p. 39 donne 4 / 5 / 3 / 4
 * par niveau (+CON) — pvParNiveau = pvBase pour les quatre familles.
 */

import type { Family } from './schema';

export const families: Family[] = [
  {
    id: 'adventurers',
    name: 'Aventuriers',
    // p. 30 : « Aventuriers : 8 + CON » au niveau 1.
    baseHp: 4,
    // p. 39 : « Aventuriers : 4 + CON » par niveau.
    hpPerLevel: 4,
    // p. 30 : « Aventuriers : d8 ».
    recoveryDie: 'd8',
    bonusRecoveryDiceOnCreation: 0,
    // p. 30 : « les PJ de la famille des aventuriers gagnent 1 PC de plus
    // que les autres profils » (aussi p. 24 : « 1 point de chance (PC)
    // de plus »).
    bonusLuckPointsOnCreation: 1,
    sourcePage: 30,
  },
  {
    id: 'fighters',
    name: 'Combattants',
    // p. 30 : « Combattants : 10 + CON » au niveau 1.
    baseHp: 5,
    // p. 39 : « Combattants : 5 + CON » par niveau.
    hpPerLevel: 5,
    // p. 30 : « Combattants : d10 ».
    recoveryDie: 'd10',
    bonusRecoveryDiceOnCreation: 0,
    bonusLuckPointsOnCreation: 0,
    sourcePage: 30,
  },
  {
    id: 'mages',
    name: 'Mages',
    // p. 30 : « Mages : 6 + CON » au niveau 1.
    baseHp: 3,
    // p. 39 : « Mages : 3 + CON » par niveau.
    hpPerLevel: 3,
    // p. 30 : « Mages : d6 ».
    recoveryDie: 'd6',
    bonusRecoveryDiceOnCreation: 0,
    bonusLuckPointsOnCreation: 0,
    sourcePage: 30,
    // NB : le bonus propre aux mages (« 1 capacité de rang 2
    // supplémentaire » à la création — p. 24, 29) n'est pas un champ de
    // Famille ; il est porté par le moteur (règle « Mages », p. 29).
  },
  {
    id: 'mystics',
    name: 'Mystiques',
    // p. 30 : « Mystiques : 8 + CON » au niveau 1.
    baseHp: 4,
    // p. 39 : « Mystiques : 4 + CON » par niveau.
    hpPerLevel: 4,
    // p. 30 : « Mystiques : d8 ».
    recoveryDie: 'd8',
    // p. 30 : « les mystiques reçoivent 1 DR de plus que les autres profils
    // à la création, soit [3 + CON] DR ».
    bonusRecoveryDiceOnCreation: 1,
    bonusLuckPointsOnCreation: 0,
    sourcePage: 30,
  },
];
