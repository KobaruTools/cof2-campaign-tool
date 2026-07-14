/**
 * Équipement — Chroniques Oubliées Fantasy 2e édition (CO2), chapitre 10, p. 181-196.
 *
 * SYSTÈME MONÉTAIRE (p. 181, « Système monétaire ») :
 *   Tous les prix sont exprimés en pièces d'argent (pa) ; les pièces de cuivre
 *   (pc) sont rares et précieuses, la plupart des paysans en utilisent rarement.
 *     1 po (or)      = 10 pa = 100 pc
 *     1 pa (argent)  = 10 pc
 *     1 pc (cuivre)  = unité de base
 *     1 pp (platine) = 10 po  (« seuls les princes, les rois et les aventuriers
 *                              ont vu une pièce de platine »)
 *   Conversion globale : 1 po = 10 pa = 100 pc ; 1 pp = 10 po = 100 pa = 1000 pc.
 *
 *   Unités utilisées dans ce fichier (`Prix.unite`) :
 *     'pc' = pièce de cuivre, 'pa' = pièce d'argent, 'po' = pièce d'or.
 *   Les prix « à fourchette » du livre (ex. « 5-50 pa », « 2-5 pa ») sont
 *   conservés verbatim dans `proprietes`/`description` et `prix` porte la borne
 *   basse, faute de pouvoir représenter une fourchette dans le schéma.
 *
 * Sources : matériel d'aventurier p. 181-183 ; tables d'armes p. 183 (contact)
 * et p. 185 (distance) ; prose des armes p. 184, 187 ; armures/boucliers p. 188 ;
 * autres biens p. 190-192 ; équipement de qualité/exotique p. 193-196.
 *
 * Note : la « table » des armes de contact est imprimée p. 183 (pas p. 184 comme
 * indiqué par la mission) ; p. 184 et p. 187 ne contiennent que la prose.
 */

import type { Weapon, Armor, Shield, Gear } from './schema';

// ---------------------------------------------------------------------------
// Armes d'attaque au contact — table p. 183 + prose p. 184
// ---------------------------------------------------------------------------
//
// Notes de lecture (couche texte décalée → image p. 183 faisant foi) :
//   Mains nues 1d3 (—) Contondants  « Les DM sont temporaires »
//   Bâton 1d4 (—) Contondants       « Arme à deux mains, DM temporaires possibles »
//   Bâton ferré 1d6 (2 pa) Contondants « Arme à deux mains »
//   Dague 1d4 (3 pa) Perforants      « Arme légère »
//   Épée à deux mains 2d6 (10 pa) Tranchants « Arme à deux mains »
//   Épée bâtarde 1d8/1d12 (9 pa) Tranchants  « Arme à une ou deux mains »
//   Épée courte 1d6 (5 pa) Perforants « Arme légère »
//   Épée longue 1d8 (6 pa) Tranchants
//   Épieu 1d6/1d10 (4 pa) Perforants  « Arme à une ou deux mains »
//   Fléau 1d6 (5 pa) Contondants
//   Fléau à deux mains 1d10 (8 pa) Contondants « Arme à deux mains, relance 1 attaque ratée/combat »
//   Gourdin (1d4) (1 pa) Contondants  « DM temporaires possibles »
//   Hache 1d8 (6 pa) Tranchants
//   Hache à deux mains 2d6 (10 pa) Tranchants « Arme à deux mains »
//   Lance 1d6/1d10 (4 pa) Perforants  « Arme à une ou deux mains »
//   Lance de cavalerie 2d6 (8 pa) Perforants  « Dé malus au contact »
//   Marteau 1d6 (4 pa) Contondants
//   Masse 1d6 (4 pa) Contondants
//   Pique 1d10 (5 pa) Perforants      « Arme à deux mains, spécial (voir description) »
//   Rapière 1d6 (6 pa) Perforants     « Arme légère, critique sur 19-20 »
//   Stylet 1d3 (4 pa) Perforants      « Arme légère ; pas de FOR aux DM, mais 1d6+AGI DM si surpris »
//   Vivelame 1d10 (15 pa) Tranchants  « Arme à deux mains, critique sur 19-20 »

export const weapons: Weapon[] = [
  {
    id: 'mains-nues',
    name: 'Mains nues',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: true,
    ranged: false,
    damage: '1d3',
    price: null,
    properties:
      'Type de DM : contondants. Les DM sont temporaires. Dans le cas du combat à mains nues, les DM sont généralement temporaires (voir DM temporaires, p. 219, sauf pour les moines, voir les voies de moine, p. 119).',
    sourcePage: 183,
  },
  {
    id: 'baton',
    name: 'Bâton',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '1d4',
    price: null,
    properties:
      'Type de DM : contondants. Arme à deux mains, DM temporaires possibles. Bâton et bâton ferré : les personnages qui savent manier le bâton sont les druides (ce sont de simples morceaux de bois, un bâton ferré est adapté au combat, plus lourd et généralement couvert de métal aux extrémités) (bien que les druides utilisent les bâtons de bois noueux avec le même effet).',
    sourcePage: 183,
  },
  {
    id: 'baton-ferre',
    name: 'Bâton ferré',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '1d6',
    price: { amount: 2, unit: 'pa' },
    properties:
      'Type de DM : contondants. Arme à deux mains. Le bâton ferré est adapté au combat, plus lourd et généralement couvert de métal aux extrémités.',
    sourcePage: 183,
  },
  {
    id: 'dague',
    name: 'Dague',
    category: 'weapon',
    weaponCategory: 'light',
    melee: true,
    ranged: true,
    damage: '1d4',
    range: '5 m',
    price: { amount: 3, unit: 'pa' },
    properties: 'Type de DM : perforants. Arme légère. (Peut être lancée : portée 5 m, DM 1d4 — table p. 185.)',
    sourcePage: 183,
  },
  {
    id: 'epee-a-deux-mains',
    name: 'Épée à deux mains',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '2d6',
    price: { amount: 10, unit: 'pa' },
    properties: 'Type de DM : tranchants. Arme à deux mains.',
    sourcePage: 183,
  },
  {
    id: 'epee-batarde',
    name: 'Épée bâtarde',
    category: 'weapon',
    weaponCategory: 'oneOrTwoHands',
    melee: true,
    ranged: false,
    damage: '1d8',
    twoHandedDamage: '1d12',
    price: { amount: 9, unit: 'pa' },
    properties:
      'Type de DM : tranchants. Arme à une ou deux mains. Les armes à une ou deux mains : leur nom l’indique, ces armes peuvent être utilisées avec une ou deux mains, au choix du combattant. Les DM sont alors plus ou moins importants. L’avantage de ces armes est l’adaptabilité selon la situation. Le premier chiffre correspond à l’utilisation avec une main, et le second avec deux mains.',
    sourcePage: 183,
  },
  {
    id: 'epee-courte',
    name: 'Épée courte',
    category: 'weapon',
    weaponCategory: 'light',
    melee: true,
    ranged: false,
    damage: '1d6',
    price: { amount: 5, unit: 'pa' },
    properties: 'Type de DM : perforants. Arme légère.',
    sourcePage: 183,
  },
  {
    id: 'epee-longue',
    name: 'Épée longue',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: true,
    ranged: false,
    damage: '1d8',
    price: { amount: 6, unit: 'pa' },
    properties: 'Type de DM : tranchants.',
    sourcePage: 183,
  },
  {
    id: 'epieu',
    name: 'Épieu',
    category: 'weapon',
    weaponCategory: 'oneOrTwoHands',
    melee: true,
    ranged: true,
    damage: '1d6',
    twoHandedDamage: '1d10',
    range: '10 m',
    price: { amount: 4, unit: 'pa' },
    properties:
      'Type de DM : perforants. Arme à une ou deux mains. Épieu : une arme d’environ 1,50 m. Elle peut être utilisée à une ou deux mains (1d6/1d10 DM) ou lancée (1d6 DM à 10 m).',
    sourcePage: 183,
  },
  {
    id: 'fleau',
    name: 'Fléau',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: true,
    ranged: false,
    damage: '1d6',
    price: { amount: 5, unit: 'pa' },
    properties:
      'Type de DM : contondants. Fléau et fléau à deux mains : un manche prolongé par une chaîne au bout de laquelle sont suspendues une ou plusieurs boules d’acier, souvent hérissées de pointes. Ce sont des armes très difficiles à parer.',
    sourcePage: 183,
  },
  {
    id: 'fleau-a-deux-mains',
    name: 'Fléau à deux mains',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '1d10',
    price: { amount: 8, unit: 'pa' },
    properties:
      'Type de DM : contondants. Arme à deux mains, relance 1 attaque ratée/combat. Le fléau à deux mains permet de relancer le dé d’une attaque ratée contre un adversaire utilisant un bouclier (ou une arme par opposition aux armes naturelles des animaux et des monstres).',
    sourcePage: 183,
  },
  {
    id: 'gourdin',
    name: 'Gourdin',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: true,
    ranged: false,
    damage: '(1d4)',
    price: { amount: 1, unit: 'pa' },
    properties: 'Type de DM : contondants. DM temporaires possibles.',
    sourcePage: 183,
  },
  {
    id: 'hache',
    name: 'Hache',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: true,
    ranged: false,
    damage: '1d8',
    price: { amount: 6, unit: 'pa' },
    properties: 'Type de DM : tranchants.',
    sourcePage: 183,
  },
  {
    id: 'hache-a-deux-mains',
    name: 'Hache à deux mains',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '2d6',
    price: { amount: 10, unit: 'pa' },
    properties: 'Type de DM : tranchants. Arme à deux mains.',
    sourcePage: 183,
  },
  {
    id: 'lance',
    name: 'Lance',
    category: 'weapon',
    weaponCategory: 'oneOrTwoHands',
    melee: true,
    ranged: true,
    damage: '1d6',
    twoHandedDamage: '1d10',
    range: '10 m',
    price: { amount: 4, unit: 'pa' },
    properties:
      'Type de DM : perforants. Arme à une ou deux mains. Lance : une arme d’environ 1,50 m. Elle peut être utilisée à une ou deux mains (1d6/1d10) ou lancée (1d6 DM à 10 m).',
    sourcePage: 183,
  },
  {
    id: 'lance-de-cavalerie',
    name: 'Lance de cavalerie',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '2d6',
    price: { amount: 8, unit: 'pa' },
    properties:
      'Type de DM : perforants. Dé malus au contact. Lance de cavalerie : conçue pour être utilisée uniquement à cheval, la lance de cavalerie mesure environ 3 m de long. Il faut prendre de l’élan pour l’utiliser à son plein potentiel. L’attaque doit donc avoir lieu après un déplacement pour obtenir les DM indiqués. Sinon, en combat au contact classique, le cavalier subit un dé malus.',
    sourcePage: 183,
  },
  {
    id: 'marteau',
    name: 'Marteau',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: true,
    ranged: false,
    damage: '1d6',
    price: { amount: 4, unit: 'pa' },
    properties: 'Type de DM : contondants.',
    sourcePage: 183,
  },
  {
    id: 'masse',
    name: 'Masse',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: true,
    ranged: false,
    damage: '1d6',
    price: { amount: 4, unit: 'pa' },
    properties: 'Type de DM : contondants.',
    sourcePage: 183,
  },
  {
    id: 'pique',
    name: 'Pique',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '1d10',
    price: { amount: 5, unit: 'pa' },
    properties:
      'Type de DM : perforants. Arme à deux mains, spécial (voir description). Pique : une très longue lance de fantassin, destinée à recevoir les charges de cavalerie ou à attaquer depuis le second rang. La pique double ses DM contre une créature de grande taille qui vient de réaliser une charge ou une action de mouvement suivie d’une attaque au contact. Elle permet aussi d’attaquer en se tenant derrière un allié de taille normale, avec une pénalité de -5. Son utilisateur subit un dé malus en attaque dans toutes les autres conditions.',
    sourcePage: 183,
  },
  {
    id: 'rapiere',
    name: 'Rapière',
    category: 'weapon',
    weaponCategory: 'light',
    melee: true,
    ranged: false,
    damage: '1d6',
    price: { amount: 6, unit: 'pa' },
    properties: 'Type de DM : perforants. Arme légère, critique sur 19-20.',
    sourcePage: 183,
  },
  {
    id: 'stylet',
    name: 'Stylet',
    category: 'weapon',
    weaponCategory: 'light',
    melee: true,
    ranged: false,
    damage: '1d3',
    price: { amount: 4, unit: 'pa' },
    properties:
      'Type de DM : perforants. Arme légère ; pas de FOR aux DM, mais 1d6+AGI DM si surpris. Stylet : une arme d’assassin, dotée d’une pointe acérée sans tranchant, destinée à transpercer les organes vitaux. La FOR ne s’applique pas aux DM du stylet (DM 1d3), mais en cas d’attaque sur un adversaire surpris, il inflige (1d6+AGI) DM contre les cibles de taille moyenne ou petite. Le stylet est considéré comme une arme légère.',
    sourcePage: 183,
  },
  {
    id: 'vivelame',
    name: 'Vivelame',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '1d10',
    price: { amount: 15, unit: 'pa' },
    properties:
      'Type de DM : tranchants. Arme à deux mains, critique sur 19-20. Vivelame : cette arme n’a pas de réalité historique, il s’agit de la version occidentale (ou elfique) du katana, une arme à deux mains légère et très rapide, au tranchant aussi affûté que le fil d’un rasoir. Si le personnage obtient une capacité qui permet d’utiliser l’AGI au lieu de la FOR pour attaquer au contact, il peut aussi l’appliquer à cette arme s’il maîtrise les armes de contact à deux mains. Pour autant, la vivelame n’est pas considérée comme une arme légère pour les attaques sournoises.',
    sourcePage: 183,
  },

  // -------------------------------------------------------------------------
  // Armes sacrées du prêtre spécialiste — uniquement définies par la table des
  // dieux (p. 126-127) et ses notes ; absentes de la table d'armes p. 183. Le
  // DM/type vient des notes (faux/pioche/trident) ou est inféré (lame/pointe).
  // -------------------------------------------------------------------------
  {
    id: 'faux',
    name: 'Faux',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '1d10',
    price: null,
    properties:
      'Type de DM : tranchants. Arme à deux mains. Arme sacrée (prêtre spécialiste) de Cérès et de Morn — table des dieux p. 127, note 2 (« arme à deux mains, d10 DM »).',
    sourcePage: 127,
  },
  {
    id: 'pioche',
    name: 'Pioche',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '1d8',
    price: null,
    properties:
      'Type de DM : perforants. Arme à deux mains. Arme sacrée (prêtre spécialiste) de Jeweln — table des dieux p. 127, note 3 (« arme à deux mains, d8 DM »).',
    sourcePage: 127,
  },
  {
    id: 'trident',
    name: 'Trident',
    category: 'weapon',
    weaponCategory: 'oneOrTwoHands',
    melee: true,
    ranged: true,
    damage: '1d6',
    twoHandedDamage: '1d10',
    range: '10 m',
    price: null,
    properties:
      'Type de DM : perforants. Arme à une ou deux mains (1d6/1d10), « semblable à un épieu » (lançable, 10 m). Arme sacrée (prêtre spécialiste) de Linnarré — table des dieux p. 127, note 4.',
    sourcePage: 127,
  },
  {
    id: 'rouleau-a-patisserie',
    name: 'Rouleau à pâtisserie',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '1d10',
    price: null,
    properties:
      'Type de DM : contondants. Arme à deux mains. Variante au choix de la faux (« même DM ») — table des dieux p. 127, note 5.',
    sourcePage: 127,
  },
  {
    id: 'poele',
    name: 'Poêle',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: true,
    ranged: false,
    damage: '1d10',
    price: null,
    properties:
      'Type de DM : contondants. Arme à deux mains. Variante au choix de la faux (« même DM ») — table des dieux p. 127, note 5.',
    sourcePage: 127,
  },

  // -------------------------------------------------------------------------
  // Armes d'attaque à distance — table p. 185 + prose p. 185, 187
  // -------------------------------------------------------------------------
  {
    id: 'arbalete-de-poing',
    name: 'Arbalète de poing',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: false,
    ranged: true,
    damage: '1d6',
    range: '10 m',
    price: { amount: 8, unit: 'pa' },
    properties: 'Type de DM : perforants. Action de mouvement pour être rechargée.',
    sourcePage: 185,
  },
  {
    id: 'arbalete-legere',
    name: 'Arbalète légère',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: false,
    ranged: true,
    damage: '2d4',
    range: '30 m',
    price: { amount: 10, unit: 'pa' },
    properties:
      'Type de DM : perforants. Nécessite une action de mouvement pour être rechargée, arme tenue à deux mains.',
    sourcePage: 185,
  },
  {
    id: 'arbalete-lourde',
    name: 'Arbalète lourde',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: false,
    ranged: true,
    damage: '2d6',
    range: '60 m',
    price: { amount: 15, unit: 'pa' },
    properties:
      'Type de DM : perforants. Nécessite une action limitée pour être rechargée, arme tenue à deux mains.',
    sourcePage: 185,
  },
  {
    id: 'arc-court',
    name: 'Arc court',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: false,
    ranged: true,
    damage: '1d6',
    range: '30 m',
    price: { amount: 4, unit: 'pa' },
    properties: 'Type de DM : perforants. Arme tenue à deux mains.',
    sourcePage: 185,
  },
  {
    id: 'arc-long',
    name: 'Arc long',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: false,
    ranged: true,
    damage: '1d8',
    range: '50 m',
    price: { amount: 8, unit: 'pa' },
    properties:
      'Type de DM : perforants. Arme tenue à deux mains, nécessite d’avoir une valeur minimale de +1 en FOR.',
    sourcePage: 185,
  },
  {
    id: 'couteaux-de-lancer',
    name: 'Couteaux de lancer',
    category: 'weapon',
    weaponCategory: 'light',
    melee: false,
    ranged: true,
    damage: '1d4',
    range: '10 m',
    price: { amount: 3, unit: 'pa' },
    properties:
      'Type de DM : perforants. Couteaux de lancer : inflige seulement 1d3 DM en attaque au contact. Lancer trois couteaux au tour d’un seul test d’attaque est possible. Il s’agit d’une action limitée qui permet l’ajout de l’AGI aux DM.',
    sourcePage: 185,
  },
  {
    id: 'dague-de-lancer',
    name: 'Dague (de lancer)',
    category: 'weapon',
    weaponCategory: 'light',
    melee: false,
    ranged: true,
    damage: '1d4',
    range: '5 m',
    price: { amount: 3, unit: 'pa' },
    properties:
      'Type de DM : perforants. Ligne « Dague » de la table des armes d’attaque à distance (lancer) — l’arme de contact correspondante a l’id `dague`.',
    sourcePage: 185,
  },
  {
    id: 'fronde',
    name: 'Fronde',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: false,
    ranged: true,
    damage: '1d4',
    range: '20 m',
    price: null,
    properties: 'Type de DM : contondants. (Prix : — / non indiqué.)',
    sourcePage: 185,
  },
  {
    id: 'hachette',
    name: 'Hachette',
    category: 'weapon',
    weaponCategory: 'light',
    melee: false,
    ranged: true,
    damage: '1d6',
    range: '5 m',
    price: { amount: 2, unit: 'pa' },
    properties: 'Type de DM : tranchants.',
    sourcePage: 185,
  },
  {
    id: 'javelot',
    name: 'Javelot',
    category: 'weapon',
    weaponCategory: 'light',
    melee: false,
    ranged: true,
    damage: '1d6',
    range: '20 m',
    price: { amount: 1, unit: 'pa' },
    properties:
      'Type de DM : perforants. Javelot : un javelot peut être utilisé avec un propulseur, une pièce de bois ou main qui permet d’augmenter sa portée. La portée est doublée, mais l’utilisation nécessite une action limitée.',
    sourcePage: 185,
  },
  {
    id: 'lance-de-lancer',
    name: 'Lance (lancée)',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: false,
    ranged: true,
    damage: '1d6',
    range: '10 m',
    price: { amount: 3, unit: 'pa' },
    properties:
      'Type de DM : perforants. Lance : voir épieu et lance dans les armes d’attaque au contact (id `lance`). Ligne « Lance » de la table des armes d’attaque à distance.',
    sourcePage: 185,
  },
  {
    id: 'lance-pierre',
    name: 'Lance-pierre',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: false,
    ranged: true,
    damage: '1d3',
    range: '10 m',
    price: { amount: 1, unit: 'pc' },
    properties: 'Type de DM : contondants.',
    sourcePage: 185,
  },
  {
    id: 'petoire',
    name: 'Pétoire ou arbalète de poing',
    category: 'weapon',
    weaponCategory: 'oneHand',
    melee: false,
    ranged: true,
    damage: '1d10',
    range: '20 m',
    price: { amount: 50, unit: 'pa' },
    properties:
      'Type de DM : perforants. Armes à poudre, soumises à l’autorisation du MJ (voir encadré), nécessite une action limitée pour être rechargée. Les armes à poudre ne conviennent pas à tous les univers de jeu, elles sont soumises à l’autorisation du MJ. Par défaut, même si ce n’est pas précisé dans les autres profils, seul l’arquebusier maîtrise les armes à poudre. Lorsqu’un personnage utilise une arme à poudre sans la maîtriser, non seulement, il subit un dé malus en attaque, mais de plus, s’il obtient 1 ou 2 au d20, la poudre explose de façon imprévue : elle lui inflige 1d4° DM et l’arme ne peut plus être utilisée pour le reste du combat. Si les armes à poudre sont interdites dans l’univers de jeu, la pétoire est remplacée par une arbalète de poing (p. 62).',
    sourcePage: 185,
  },
  {
    id: 'mousquet',
    name: 'Mousquet ou arbalète lourde',
    category: 'weapon',
    weaponCategory: 'twoHands',
    melee: false,
    ranged: true,
    damage: '2d6',
    range: '50 m',
    price: { amount: 100, unit: 'pa' },
    properties:
      'Type de DM : perforants. Armes à poudre, soumises à l’autorisation du MJ (voir encadré), nécessite une action limitée pour être rechargée, arme tenue à deux mains. (Halfelins et gobelins peuvent utiliser des armes de plus petit calibre aux dés de DM réduits : pétoire 1d8 et mousquet 1d12.) Si les armes à poudre sont interdites dans l’univers de jeu, le mousquet est remplacé par une arbalète lourde (p. 62).',
    sourcePage: 185,
  },
];

// ---------------------------------------------------------------------------
// Armures — table p. 188
// ---------------------------------------------------------------------------

export const armors: Armor[] = [
  {
    id: 'tissus-matelasses-fourrures',
    name: 'Tissus matelassés, fourrures',
    category: 'armor',
    def: 1,
    maxAgi: 7,
    price: { amount: 2, unit: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'cuir-simple',
    name: 'Cuir simple',
    category: 'armor',
    def: 2,
    maxAgi: 6,
    price: { amount: 4, unit: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'cuir-renforce-broigne',
    name: 'Cuir renforcé, broigne',
    category: 'armor',
    def: 3,
    maxAgi: 5,
    price: { amount: 8, unit: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'chemise-de-mailles',
    name: 'Chemise de mailles',
    category: 'armor',
    def: 4,
    maxAgi: 4,
    price: { amount: 15, unit: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'cotte-de-mailles',
    name: 'Cotte de mailles',
    category: 'armor',
    def: 5,
    maxAgi: 3,
    price: { amount: 25, unit: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'armure-de-plaques',
    name: 'Armure de plaques',
    category: 'armor',
    def: 6,
    maxAgi: 2,
    price: { amount: 60, unit: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'plaque-complete',
    name: 'Plaque complète',
    category: 'armor',
    def: 7,
    maxAgi: 1,
    price: { amount: 200, unit: 'pa' },
    properties:
      'Armure fabriquée sur mesure, seul le chevalier peut la porter grâce à la capacité de rang 3 de la voie de la noblesse.',
    sourcePage: 188,
  },
];

// ---------------------------------------------------------------------------
// Boucliers — table p. 188
// ---------------------------------------------------------------------------

export const shields: Shield[] = [
  {
    id: 'petit-bouclier',
    name: 'Petit bouclier',
    category: 'shield',
    def: 1,
    price: { amount: 2, unit: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'grand-bouclier',
    name: 'Grand bouclier',
    category: 'shield',
    def: 2,
    price: { amount: 4, unit: 'pa' },
    sourcePage: 188,
  },
];

// ---------------------------------------------------------------------------
// Matériel — matériel d'aventurier p. 190, montures p. 191, auberge p. 192,
// biens immobiliers / qualité / exotique p. 193-195
// ---------------------------------------------------------------------------

export const gear: Gear[] = [
  // --- Matériel (table « Prix du matériel », p. 190) ---
  {
    id: 'briquet-a-silex',
    name: 'Briquet à silex',
    category: 'gear',
    price: { amount: 1, unit: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'carquois-de-20-fleches',
    name: 'Carquois de 20 flèches',
    category: 'gear',
    price: { amount: 3, unit: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'corde-15-m',
    name: 'Corde 15 m',
    category: 'gear',
    price: { amount: 2, unit: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'couverture',
    name: 'Couverture',
    category: 'gear',
    price: { amount: 1, unit: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'grappin',
    name: 'Grappin',
    category: 'gear',
    price: { amount: 2, unit: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'lanterne-a-huile',
    name: 'Lanterne à huile',
    category: 'gear',
    price: { amount: 3, unit: 'pa' },
    description:
      'Une torche ou une lanterne éclairent dans un rayon de 10 m pendant 1 h pour une torche ou 6 h pour une lanterne (1 dose d’huile).',
    sourcePage: 190,
  },
  {
    id: 'materiel-decriture',
    name: 'Matériel d’écriture',
    category: 'gear',
    price: { amount: 5, unit: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'huile-pour-lanterne',
    name: 'Huile pour lanterne',
    category: 'gear',
    price: { amount: 1, unit: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'torches-x3',
    name: 'Torches (x3)',
    category: 'gear',
    price: { amount: 5, unit: 'pa' },
    description:
      'Une torche ou une lanterne éclairent dans un rayon de 10 m pendant 1 h pour une torche ou 6 h pour une lanterne (1 dose d’huile).',
    sourcePage: 190,
  },
  {
    id: 'outils-de-crochetage',
    name: 'Outils de crochetage',
    category: 'gear',
    price: { amount: 5, unit: 'pa' },
    description: 'Sans ces outils, une pénalité de -10 est infligée aux tests d’AGI (Crocheter).',
    sourcePage: 190,
  },
  {
    id: 'potion-de-soins',
    name: 'Potion de Soins (1d4° PV)',
    category: 'gear',
    consumable: true,
    price: { amount: 10, unit: 'pa' },
    description:
      'Les potions de soins ne sont pas forcément magiques, ce sont des remèdes à base de plantes ou de composants rares (qui peuvent être magiques). Un personnage ne peut pas profiter des effets de plus d’une potion de soins par récupération rapide (30 min).',
    sourcePage: 190,
  },
  {
    id: 'ration-1-semaine',
    name: 'Ration (1 semaine)',
    category: 'gear',
    price: { amount: 4, unit: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'sac-a-dos',
    name: 'Sac à dos',
    category: 'gear',
    price: { amount: 1, unit: 'pa' },
    sourcePage: 190,
  },

  // --- Montures (table « Prix des montures », p. 191) ---
  {
    id: 'mule-ou-ane',
    name: 'Mule ou âne',
    category: 'gear',
    price: { amount: 25, unit: 'pa' },
    sourcePage: 191,
  },
  {
    id: 'poney',
    name: 'Poney',
    category: 'gear',
    price: { amount: 50, unit: 'pa' },
    sourcePage: 191,
  },
  {
    id: 'cheval-de-selle',
    name: 'Cheval de selle',
    category: 'gear',
    price: { amount: 100, unit: 'pa' },
    description:
      'Cheval de selle : un cheval de selle n’est pas apte à subir le stress du combat, son cavalier subit un dé malus à toutes ses actions en selle en situation de combat.',
    sourcePage: 191,
  },
  {
    id: 'cheval-de-guerre',
    name: 'Cheval de guerre',
    category: 'gear',
    price: { amount: 300, unit: 'pa' },
    description:
      'Le cheval de guerre ne souffre pas des pénalités du cheval de selle en combat et sa valeur d’attaque passe à +4. NC 1, taille grande. Un cheval de guerre est apte à porter un caparaçon : caparaçon de mailles +2 DEF pour 100 pa ; barde de plaque de métal +4 DEF pour 300 pa (malus en Init. égal au bonus de DEF).',
    sourcePage: 191,
  },
  {
    id: 'carriole',
    name: 'Carriole',
    category: 'gear',
    price: { amount: 50, unit: 'pa' },
    sourcePage: 191,
  },
  {
    id: 'chariot',
    name: 'Chariot',
    category: 'gear',
    price: { amount: 90, unit: 'pa' },
    sourcePage: 191,
  },
  {
    id: 'caparacon-de-mailles',
    name: 'Caparaçon de mailles',
    category: 'gear',
    price: { amount: 100, unit: 'pa' },
    description:
      'Un caparaçon de mailles augmente la DEF du cheval de +2. Les bardes octroient un malus en Init. au cheval et à son cavalier égal au bonus de DEF.',
    sourcePage: 191,
  },
  {
    id: 'barde-de-plaque',
    name: 'Barde de plaque (de métal)',
    category: 'gear',
    price: { amount: 300, unit: 'pa' },
    description:
      'Une barde de plaque de métal apporte un bonus de +4 en DEF. Les bardes octroient un malus en Init. au cheval et à son cavalier égal au bonus de DEF.',
    sourcePage: 191,
  },

  // --- À l'auberge (table « Prix des prestations d'auberge », p. 192) ---
  {
    id: 'cidre-lait-verre',
    name: 'Cidre, lait (verre)',
    category: 'gear',
    price: { amount: 1, unit: 'pc' },
    description: 'Boisson.',
    sourcePage: 192,
  },
  {
    id: 'cervoise-biere-pinte',
    name: 'Cervoise, bière (pinte)',
    category: 'gear',
    price: { amount: 2, unit: 'pc' },
    description: 'Boisson.',
    sourcePage: 192,
  },
  {
    id: 'hydromel-vin-verre',
    name: 'Hydromel, vin (verre)',
    category: 'gear',
    price: { amount: 5, unit: 'pc' },
    description: 'Boisson.',
    sourcePage: 192,
  },
  {
    id: 'grand-cru-bouteille',
    name: 'Grand cru (bouteille)',
    category: 'gear',
    price: { amount: 5, unit: 'pa' },
    description: 'Boisson. Prix : 5-50 pa.',
    sourcePage: 192,
  },
  {
    id: 'soupe-et-pain',
    name: 'Soupe et pain',
    category: 'gear',
    price: { amount: 1, unit: 'pc' },
    description: 'Repas.',
    sourcePage: 192,
  },
  {
    id: 'repas-avec-viande',
    name: 'Repas avec viande',
    category: 'gear',
    price: { amount: 1, unit: 'pa' },
    description: 'Repas.',
    sourcePage: 192,
  },
  {
    id: 'bon-repas',
    name: 'Bon repas',
    category: 'gear',
    price: { amount: 5, unit: 'pa' },
    description: 'Repas.',
    sourcePage: 192,
  },
  {
    id: 'banquet',
    name: 'Banquet',
    category: 'gear',
    price: { amount: 10, unit: 'pa' },
    description: 'Repas. Prix : 10-20 pa.',
    sourcePage: 192,
  },
  {
    id: 'nuit-dortoir',
    name: 'Nuit (dortoir)',
    category: 'gear',
    price: { amount: 5, unit: 'pc' },
    description: 'Nuitée.',
    sourcePage: 192,
  },
  {
    id: 'nuit-chambre-de-4',
    name: 'Nuit (chambre de 4)',
    category: 'gear',
    price: { amount: 1, unit: 'pa' },
    description: 'Nuitée.',
    sourcePage: 192,
  },
  {
    id: 'nuit-chambre-individuelle',
    name: 'Nuit (chambre individuelle)',
    category: 'gear',
    price: { amount: 2, unit: 'pa' },
    description: 'Nuitée. Prix : 2-5 pa.',
    sourcePage: 192,
  },
  {
    id: 'nuit-suite',
    name: 'Nuit (suite)',
    category: 'gear',
    price: { amount: 10, unit: 'pa' },
    description: 'Nuitée. Prix : 10-20 pa.',
    sourcePage: 192,
  },

  // --- Biens immobiliers (table « Prix des biens immobiliers », p. 193) ---
  // Note : ces prix sont exprimés en pièces d'or (po) dans le livre.
  {
    id: 'appartement-2-pieces',
    name: 'Appartement (2 pièces)',
    category: 'gear',
    price: { amount: 250, unit: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'masure-3-pieces',
    name: 'Masure (3 pièces)',
    category: 'gear',
    price: { amount: 500, unit: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'maison-3-pieces',
    name: 'Maison (3 pièces)',
    category: 'gear',
    price: { amount: 1000, unit: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'grande-maison-6-pieces',
    name: 'Grande maison (6 pièces)',
    category: 'gear',
    price: { amount: 2000, unit: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'villa-luxueuse',
    name: 'Villa luxueuse',
    category: 'gear',
    price: { amount: 10000, unit: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'manoir',
    name: 'Manoir',
    category: 'gear',
    price: { amount: 20000, unit: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'place-forte',
    name: 'Place forte',
    category: 'gear',
    price: { amount: 60000, unit: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'chateau',
    name: 'Château',
    category: 'gear',
    price: { amount: 150000, unit: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'palais',
    name: 'Palais',
    category: 'gear',
    price: { amount: 300000, unit: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },

  // --- Équipement de qualité (p. 193) ---
  {
    id: 'arme-de-qualite',
    name: 'Arme de qualité',
    category: 'gear',
    price: null,
    description:
      'Une arme de qualité donne un bonus de +1 en attaque ou aux DM (toujours le même). Pour une armure, c’est la pénalité d’encombrement infligée aux tests d’AGI qui est réduite de -1. Le prix de l’objet est multiplié par deux et on y ajoute 100 pa (ex. une épée longue de qualité vaut (6 × 2) +100 = 112 pa). Fabriquer un objet de qualité augmente la difficulté du test d’artisanat (habituellement entre 10 et 15) de +10, et la durée de travail est multipliée par trois. (Atlas d’Osgild — règles optionnelles.)',
    sourcePage: 193,
  },
  {
    id: 'armure-de-qualite',
    name: 'Armure de qualité',
    category: 'gear',
    price: null,
    description:
      'Pour une armure, l’équipement de qualité réduit de -1 la pénalité d’encombrement infligée aux tests d’AGI. Le prix de l’objet est multiplié par deux et on y ajoute 100 pa. (Atlas d’Osgild — règles optionnelles.)',
    sourcePage: 193,
  },

  // --- Équipement exotique (p. 193-195) — exemples de matériaux ---
  {
    id: 'durium',
    name: 'Durium',
    category: 'gear',
    price: { amount: 40, unit: 'pa' },
    description:
      'Précieux (40 pa). Un métal bleu sombre, très dur et particulièrement lourd. En cas de mêlée fabriquées dans ce métal imposent un malus de -1 en attaque, mais le dé de DM augmente d’une catégorie et elles sont presque indestructibles (1d4/1d6/1d8/1d10/1d12). Si les DM sont exprimés sous la forme de deux dés, on seul augmente (2d4 devient 1d4+1d6, 2d6 devient 1d6+1d8). Les projectiles fabriqués dans ce métal voient leur portée divisée par deux. Les armures obtiennent un bonus de +1 en DEF, mais leur pénalité d’armure augmente de +2. Prix d’une arme : multiplier la valeur maximale des DM par le prix indiqué, puis ajouter le prix normal de l’arme (ex. épée longue DM 1d8, 6 pa en durium (40 pa) vaut (8 × 40) + 6 = 326 pa). Prix d’une armure : multiplier le bonus de DEF par le double du prix indiqué, puis ajouter le prix normal de l’armure (ex. cotte de mailles en durium vaut (5 × 2 × 40) + 25 = 425 pa).',
    sourcePage: 195,
  },
  {
    id: 'chope-en-hybberium',
    name: 'Chope en hybberium',
    category: 'gear',
    price: { amount: 100, unit: 'pa' },
    description:
      'Exotique (100 pa). L’hybberium est un métal qui devient glacial au contact de l’air, produisant même du givre. Cette simple chope en métal, en bois ou en ivoire permet à votre bière de rester bien fraîche, même en plein désert. Un passage obligé pour tout nain qui se respecte.',
    sourcePage: 195,
  },
  {
    id: 'pnoulpe',
    name: 'Pnoulpe',
    category: 'gear',
    price: { amount: 300, unit: 'pa' },
    description:
      'Exotique (300 pa). Le pnoulpe est une sorte de petit poulpe qui a la particularité de transformer l’eau en mélange respirable, et inversement, en quantité suffisante pour assurer la survie d’un être humain en milieu aquatique. En pratique, on place le corps mou de couleur rouge sur les voies respiratoires, les tentacules enserrant la tête, puis on se dépêche d’entrer dans l’eau pour ne pas asphyxier. Le pnoulpe est vendu dans un coffret de bois étanche empli d’un liquide qui permet de le conserver en léthargie environ un mois au maximum (15 × 15 × 30 cm, poids 5 kg). Dès que la boîte est ouverte, il faut le mettre à l’eau, il ne peut plus être à nouveau plongé en léthargie et si on le sort de l’eau, il meurt rapidement.',
    sourcePage: 195,
  },
];
