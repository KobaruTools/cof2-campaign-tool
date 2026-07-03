/**
 * Règles de progression — chap. 1 « Création du personnage » (p. 29-33) et
 * chap. 2 « Progression & niveaux » (p. 38-43).
 *
 * Une seule instance : le moteur de calcul est l'unique consommateur.
 */

import type { ProgressionRules } from './schema';

/**
 * Nom de l'objet « bourse de départ » du sac d'aventurier (p. 31 : « une bourse de
 * 2d6 pa »). Constante partagée : sert de libellé dans `adventurerPack` ET de clé de
 * reconnaissance côté fiche (bouton « Utiliser » → saisie du montant tiré). Le montant
 * n'est PAS simulé (les dés se lancent à la vraie table) ; il est saisi par le joueur.
 */
export const COIN_POUCH_ITEM_NAME = 'Bourse de 2d6 pa';

export const progression: ProgressionRules = {
  /**
   * Niveau maximum jouable. Le livre ne le fixe pas explicitement (la table
   * des rangs s'arrête au niveau 13 p. 39, l'attaque plafonne au niveau 10
   * p. 39, les dés évolutifs vont jusqu'à « 15+ » p. 43).
   *
   * Décision propriétaire (2026-06-12) : on garde 20 comme plafond souple ;
   * il n'y a de toute façon pas de niveau max strict dans CO2. Le moteur (J3)
   * traitera cette valeur comme une borne d'UI, pas comme une règle du livre
   * — ne désactiver la montée de niveau qu'à titre indicatif.
   */
  maxLevel: 20,

  // p. 38 : « À chaque passage de niveau, le personnage : […] gagne
  // 2 points de capacité » (repris p. 39 : « À chaque passage de niveau,
  // le personnage gagne 2 points de capacité supplémentaires. »).
  // p. 39 : « Il n'est pas possible de mettre de côté des points de
  // capacités, ils doivent être immédiatement dépensés. »
  featurePointsPerLevel: 2,

  // p. 39 : « les capacités de rang 1 et 2 coûtent chacune 1 point de
  // capacité ; les capacités de rang 3 et plus coûtent chacune 2 points ».
  costPerRank: { 1: 1, 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2 },

  /**
   * Table « Rang / Niveau requis » — p. 39 :
   * Rang          1   2   3   4   5   6   7   8
   * Niveau requis 1   2*  3   5   7   9   11  13
   *
   * « 2* » : exception mage — « La capacité supplémentaire de rang 2 reçue
   * par les mages au niveau 1 est une exception au niveau requis pour
   * obtenir une capacité de rang 2. Toutefois, cette exception ne se
   * prolonge pas au-delà du niveau 2 : les mages n'ont pas accès à une
   * capacité de rang 3 avant les autres personnages. » (encadré
   * « *Capacité supplémentaire de mage », p. 39). L'exception est portée
   * par le moteur, pas par cette table.
   *
   * Cohérent avec la table « Voies de prestige – niveau requis » p. 42
   * (rangs 4 à 8 → niveaux 5, 7, 9, 11, 13).
   */
  minLevelPerRank: { 1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 9, 7: 11, 8: 13 },

  // p. 39 (NB sous la table) : « Les capacités de rang 6 à 8 sont
  // réservées aux voies de prestige. »
  prestigeOnlyRanks: [6, 7, 8],

  // p. 42 : « À partir du niveau 5, un personnage peut choisir une voie de
  // prestige. » (confirmé p. 128, vérifié par l'orchestrateur).
  prestigeAccessLevel: 5,

  // p. 39 : « Au niveau 1, la valeur de base des différentes attaques est
  // égale à +1, celle-ci est augmentée de +1 à chaque niveau. Toutefois,
  // elle cesse d'augmenter à partir du niveau 10. Le personnage a atteint
  // son niveau maximal de compétence en attaque. »
  maxAttackLevel: 10,

  // Table « Niveau d'acquisition des dés évolutifs » — p. 43 :
  // niveaux 1-5 : d4, 6-8 : d6, 9-11 : d8, 12-14 : d10, 15+ : d12.
  // (p. 38 : « à partir du niveau 6 et tous les 3 niveaux, son dé évolutif
  // (d4°) est augmenté ».)
  scalingDice: [
    { minLevel: 1, die: 'd4' },
    { minLevel: 6, die: 'd6' },
    { minLevel: 9, die: 'd8' },
    { minLevel: 12, die: 'd10' },
    { minLevel: 15, die: 'd12' },
  ],

  // p. 31 : « Votre personnage débute avec un sac d'aventurier qui
  // contient : une couverture, une torche, un briquet à silex, une outre,
  // une gamelle, une bourse de 2d6 pa. »
  // itemId raccordé au catalogue (chap. 10) quand une correspondance 1-pour-1
  // existe. « torche » reste null (le catalogue ne vend que des lots de 3,
  // `torches-x3`), de même qu'« outre », « gamelle » et la bourse (non vendus).
  adventurerPack: [
    { itemId: 'couverture', label: 'Couverture', quantity: 1 },
    { itemId: null, label: 'Torche', quantity: 1 },
    { itemId: 'briquet-a-silex', label: 'Briquet à silex', quantity: 1 },
    { itemId: null, label: 'Outre', quantity: 1 },
    { itemId: null, label: 'Gamelle', quantity: 1 },
    { itemId: null, label: COIN_POUCH_ITEM_NAME, quantity: 1 },
  ],

  // Page de la table centrale des rangs ; les autres pages sources sont
  // citées champ par champ ci-dessus.
  sourcePage: 39,
};
