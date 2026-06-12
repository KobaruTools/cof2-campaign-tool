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

import type { Arme, Armure, Bouclier, Materiel } from './schema';

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

export const armes: Arme[] = [
  {
    id: 'mains-nues',
    nom: 'Mains nues',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: true,
    distance: false,
    dm: '1d3',
    prix: null,
    proprietes:
      'Type de DM : contondants. Les DM sont temporaires. Dans le cas du combat à mains nues, les DM sont généralement temporaires (voir DM temporaires, p. 219, sauf pour les moines, voir les voies de moine, p. 119).',
    sourcePage: 183,
  },
  {
    id: 'baton',
    nom: 'Bâton',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: true,
    distance: false,
    dm: '1d4',
    prix: null,
    proprietes:
      'Type de DM : contondants. Arme à deux mains, DM temporaires possibles. Bâton et bâton ferré : les personnages qui savent manier le bâton sont les druides (ce sont de simples morceaux de bois, un bâton ferré est adapté au combat, plus lourd et généralement couvert de métal aux extrémités) (bien que les druides utilisent les bâtons de bois noueux avec le même effet).',
    sourcePage: 183,
  },
  {
    id: 'baton-ferre',
    nom: 'Bâton ferré',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: true,
    distance: false,
    dm: '1d6',
    prix: { montant: 2, unite: 'pa' },
    proprietes:
      'Type de DM : contondants. Arme à deux mains. Le bâton ferré est adapté au combat, plus lourd et généralement couvert de métal aux extrémités.',
    sourcePage: 183,
  },
  {
    id: 'dague',
    nom: 'Dague',
    categorie: 'arme',
    categorieArme: 'legere',
    contact: true,
    distance: true,
    dm: '1d4',
    portee: '5 m',
    prix: { montant: 3, unite: 'pa' },
    proprietes: 'Type de DM : perforants. Arme légère. (Peut être lancée : portée 5 m, DM 1d4 — table p. 185.)',
    sourcePage: 183,
  },
  {
    id: 'epee-a-deux-mains',
    nom: 'Épée à deux mains',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: true,
    distance: false,
    dm: '2d6',
    prix: { montant: 10, unite: 'pa' },
    proprietes: 'Type de DM : tranchants. Arme à deux mains.',
    sourcePage: 183,
  },
  {
    id: 'epee-batarde',
    nom: 'Épée bâtarde',
    categorie: 'arme',
    categorieArme: 'uneOuDeuxMains',
    contact: true,
    distance: false,
    dm: '1d8',
    dmDeuxMains: '1d12',
    prix: { montant: 9, unite: 'pa' },
    proprietes:
      'Type de DM : tranchants. Arme à une ou deux mains. Les armes à une ou deux mains : leur nom l’indique, ces armes peuvent être utilisées avec une ou deux mains, au choix du combattant. Les DM sont alors plus ou moins importants. L’avantage de ces armes est l’adaptabilité selon la situation. Le premier chiffre correspond à l’utilisation avec une main, et le second avec deux mains.',
    sourcePage: 183,
  },
  {
    id: 'epee-courte',
    nom: 'Épée courte',
    categorie: 'arme',
    categorieArme: 'legere',
    contact: true,
    distance: false,
    dm: '1d6',
    prix: { montant: 5, unite: 'pa' },
    proprietes: 'Type de DM : perforants. Arme légère.',
    sourcePage: 183,
  },
  {
    id: 'epee-longue',
    nom: 'Épée longue',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: true,
    distance: false,
    dm: '1d8',
    prix: { montant: 6, unite: 'pa' },
    proprietes: 'Type de DM : tranchants.',
    sourcePage: 183,
  },
  {
    id: 'epieu',
    nom: 'Épieu',
    categorie: 'arme',
    categorieArme: 'uneOuDeuxMains',
    contact: true,
    distance: true,
    dm: '1d6',
    dmDeuxMains: '1d10',
    portee: '10 m',
    prix: { montant: 4, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Arme à une ou deux mains. Épieu : une arme d’environ 1,50 m. Elle peut être utilisée à une ou deux mains (1d6/1d10 DM) ou lancée (1d6 DM à 10 m).',
    sourcePage: 183,
  },
  {
    id: 'fleau',
    nom: 'Fléau',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: true,
    distance: false,
    dm: '1d6',
    prix: { montant: 5, unite: 'pa' },
    proprietes:
      'Type de DM : contondants. Fléau et fléau à deux mains : un manche prolongé par une chaîne au bout de laquelle sont suspendues une ou plusieurs boules d’acier, souvent hérissées de pointes. Ce sont des armes très difficiles à parer.',
    sourcePage: 183,
  },
  {
    id: 'fleau-a-deux-mains',
    nom: 'Fléau à deux mains',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: true,
    distance: false,
    dm: '1d10',
    prix: { montant: 8, unite: 'pa' },
    proprietes:
      'Type de DM : contondants. Arme à deux mains, relance 1 attaque ratée/combat. Le fléau à deux mains permet de relancer le dé d’une attaque ratée contre un adversaire utilisant un bouclier (ou une arme par opposition aux armes naturelles des animaux et des monstres).',
    sourcePage: 183,
  },
  {
    id: 'gourdin',
    nom: 'Gourdin',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: true,
    distance: false,
    dm: '(1d4)',
    prix: { montant: 1, unite: 'pa' },
    proprietes: 'Type de DM : contondants. DM temporaires possibles.',
    sourcePage: 183,
  },
  {
    id: 'hache',
    nom: 'Hache',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: true,
    distance: false,
    dm: '1d8',
    prix: { montant: 6, unite: 'pa' },
    proprietes: 'Type de DM : tranchants.',
    sourcePage: 183,
  },
  {
    id: 'hache-a-deux-mains',
    nom: 'Hache à deux mains',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: true,
    distance: false,
    dm: '2d6',
    prix: { montant: 10, unite: 'pa' },
    proprietes: 'Type de DM : tranchants. Arme à deux mains.',
    sourcePage: 183,
  },
  {
    id: 'lance',
    nom: 'Lance',
    categorie: 'arme',
    categorieArme: 'uneOuDeuxMains',
    contact: true,
    distance: true,
    dm: '1d6',
    dmDeuxMains: '1d10',
    portee: '10 m',
    prix: { montant: 4, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Arme à une ou deux mains. Lance : une arme d’environ 1,50 m. Elle peut être utilisée à une ou deux mains (1d6/1d10) ou lancée (1d6 DM à 10 m).',
    sourcePage: 183,
  },
  {
    id: 'lance-de-cavalerie',
    nom: 'Lance de cavalerie',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: true,
    distance: false,
    dm: '2d6',
    prix: { montant: 8, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Dé malus au contact. Lance de cavalerie : conçue pour être utilisée uniquement à cheval, la lance de cavalerie mesure environ 3 m de long. Il faut prendre de l’élan pour l’utiliser à son plein potentiel. L’attaque doit donc avoir lieu après un déplacement pour obtenir les DM indiqués. Sinon, en combat au contact classique, le cavalier subit un dé malus.',
    sourcePage: 183,
  },
  {
    id: 'marteau',
    nom: 'Marteau',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: true,
    distance: false,
    dm: '1d6',
    prix: { montant: 4, unite: 'pa' },
    proprietes: 'Type de DM : contondants.',
    sourcePage: 183,
  },
  {
    id: 'masse',
    nom: 'Masse',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: true,
    distance: false,
    dm: '1d6',
    prix: { montant: 4, unite: 'pa' },
    proprietes: 'Type de DM : contondants.',
    sourcePage: 183,
  },
  {
    id: 'pique',
    nom: 'Pique',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: true,
    distance: false,
    dm: '1d10',
    prix: { montant: 5, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Arme à deux mains, spécial (voir description). Pique : une très longue lance de fantassin, destinée à recevoir les charges de cavalerie ou à attaquer depuis le second rang. La pique double ses DM contre une créature de grande taille qui vient de réaliser une charge ou une action de mouvement suivie d’une attaque au contact. Elle permet aussi d’attaquer en se tenant derrière un allié de taille normale, avec une pénalité de -5. Son utilisateur subit un dé malus en attaque dans toutes les autres conditions.',
    sourcePage: 183,
  },
  {
    id: 'rapiere',
    nom: 'Rapière',
    categorie: 'arme',
    categorieArme: 'legere',
    contact: true,
    distance: false,
    dm: '1d6',
    prix: { montant: 6, unite: 'pa' },
    proprietes: 'Type de DM : perforants. Arme légère, critique sur 19-20.',
    sourcePage: 183,
  },
  {
    id: 'stylet',
    nom: 'Stylet',
    categorie: 'arme',
    categorieArme: 'legere',
    contact: true,
    distance: false,
    dm: '1d3',
    prix: { montant: 4, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Arme légère ; pas de FOR aux DM, mais 1d6+AGI DM si surpris. Stylet : une arme d’assassin, dotée d’une pointe acérée sans tranchant, destinée à transpercer les organes vitaux. La FOR ne s’applique pas aux DM du stylet (DM 1d3), mais en cas d’attaque sur un adversaire surpris, il inflige (1d6+AGI) DM contre les cibles de taille moyenne ou petite. Le stylet est considéré comme une arme légère.',
    sourcePage: 183,
  },
  {
    id: 'vivelame',
    nom: 'Vivelame',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: true,
    distance: false,
    dm: '1d10',
    prix: { montant: 15, unite: 'pa' },
    proprietes:
      'Type de DM : tranchants. Arme à deux mains, critique sur 19-20. Vivelame : cette arme n’a pas de réalité historique, il s’agit de la version occidentale (ou elfique) du katana, une arme à deux mains légère et très rapide, au tranchant aussi affûté que le fil d’un rasoir. Si le personnage obtient une capacité qui permet d’utiliser l’AGI au lieu de la FOR pour attaquer au contact, il peut aussi l’appliquer à cette arme s’il maîtrise les armes de contact à deux mains. Pour autant, la vivelame n’est pas considérée comme une arme légère pour les attaques sournoises.',
    sourcePage: 183,
  },

  // -------------------------------------------------------------------------
  // Armes d'attaque à distance — table p. 185 + prose p. 185, 187
  // -------------------------------------------------------------------------
  {
    id: 'arbalete-de-poing',
    nom: 'Arbalète de poing',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: false,
    distance: true,
    dm: '1d6',
    portee: '10 m',
    prix: { montant: 8, unite: 'pa' },
    proprietes: 'Type de DM : perforants. Action de mouvement pour être rechargée.',
    sourcePage: 185,
  },
  {
    id: 'arbalete-legere',
    nom: 'Arbalète légère',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: false,
    distance: true,
    dm: '2d4',
    portee: '30 m',
    prix: { montant: 10, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Nécessite une action de mouvement pour être rechargée, arme tenue à deux mains.',
    sourcePage: 185,
  },
  {
    id: 'arbalete-lourde',
    nom: 'Arbalète lourde',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: false,
    distance: true,
    dm: '2d6',
    portee: '60 m',
    prix: { montant: 15, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Nécessite une action limitée pour être rechargée, arme tenue à deux mains.',
    sourcePage: 185,
  },
  {
    id: 'arc-court',
    nom: 'Arc court',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: false,
    distance: true,
    dm: '1d6',
    portee: '30 m',
    prix: { montant: 4, unite: 'pa' },
    proprietes: 'Type de DM : perforants. Arme tenue à deux mains.',
    sourcePage: 185,
  },
  {
    id: 'arc-long',
    nom: 'Arc long',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: false,
    distance: true,
    dm: '1d8',
    portee: '50 m',
    prix: { montant: 8, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Arme tenue à deux mains, nécessite d’avoir une valeur minimale de +1 en FOR.',
    sourcePage: 185,
  },
  {
    id: 'couteaux-de-lancer',
    nom: 'Couteaux de lancer',
    categorie: 'arme',
    categorieArme: 'legere',
    contact: false,
    distance: true,
    dm: '1d4',
    portee: '10 m',
    prix: { montant: 3, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Couteaux de lancer : inflige seulement 1d3 DM en attaque au contact. Lancer trois couteaux au tour d’un seul test d’attaque est possible. Il s’agit d’une action limitée qui permet l’ajout de l’AGI aux DM.',
    sourcePage: 185,
  },
  {
    id: 'dague-de-lancer',
    nom: 'Dague (de lancer)',
    categorie: 'arme',
    categorieArme: 'legere',
    contact: false,
    distance: true,
    dm: '1d4',
    portee: '5 m',
    prix: { montant: 3, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Ligne « Dague » de la table des armes d’attaque à distance (lancer) — l’arme de contact correspondante a l’id `dague`.',
    sourcePage: 185,
  },
  {
    id: 'fronde',
    nom: 'Fronde',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: false,
    distance: true,
    dm: '1d4',
    portee: '20 m',
    prix: null,
    proprietes: 'Type de DM : contondants. (Prix : — / non indiqué.)',
    sourcePage: 185,
  },
  {
    id: 'hachette',
    nom: 'Hachette',
    categorie: 'arme',
    categorieArme: 'legere',
    contact: false,
    distance: true,
    dm: '1d6',
    portee: '5 m',
    prix: { montant: 2, unite: 'pa' },
    proprietes: 'Type de DM : tranchants.',
    sourcePage: 185,
  },
  {
    id: 'javelot',
    nom: 'Javelot',
    categorie: 'arme',
    categorieArme: 'legere',
    contact: false,
    distance: true,
    dm: '1d6',
    portee: '20 m',
    prix: { montant: 1, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Javelot : un javelot peut être utilisé avec un propulseur, une pièce de bois ou main qui permet d’augmenter sa portée. La portée est doublée, mais l’utilisation nécessite une action limitée.',
    sourcePage: 185,
  },
  {
    id: 'lance-de-lancer',
    nom: 'Lance (lancée)',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: false,
    distance: true,
    dm: '1d6',
    portee: '10 m',
    prix: { montant: 3, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Lance : voir épieu et lance dans les armes d’attaque au contact (id `lance`). Ligne « Lance » de la table des armes d’attaque à distance.',
    sourcePage: 185,
  },
  {
    id: 'lance-pierre',
    nom: 'Lance-pierre',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: false,
    distance: true,
    dm: '1d3',
    portee: '10 m',
    prix: { montant: 1, unite: 'pc' },
    proprietes: 'Type de DM : contondants.',
    sourcePage: 185,
  },
  {
    id: 'petoire',
    nom: 'Pétoire',
    categorie: 'arme',
    categorieArme: 'uneMain',
    contact: false,
    distance: true,
    dm: '1d10',
    portee: '20 m',
    prix: { montant: 50, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Armes à poudre, soumises à l’autorisation du MJ (voir encadré), nécessite une action limitée pour être rechargée. Les armes à poudre ne conviennent pas à tous les univers de jeu, elles sont soumises à l’autorisation du MJ. Par défaut, même si ce n’est pas précisé dans les autres profils, seul l’arquebusier maîtrise les armes à poudre. Lorsqu’un personnage utilise une arme à poudre sans la maîtriser, non seulement, il subit un dé malus en attaque, mais de plus, s’il obtient 1 ou 2 au d20, la poudre explose de façon imprévue : elle lui inflige 1d4° DM et l’arme ne peut plus être utilisée pour le reste du combat.',
    sourcePage: 185,
  },
  {
    id: 'mousquet',
    nom: 'Mousquet',
    categorie: 'arme',
    categorieArme: 'deuxMains',
    contact: false,
    distance: true,
    dm: '2d6',
    portee: '50 m',
    prix: { montant: 100, unite: 'pa' },
    proprietes:
      'Type de DM : perforants. Armes à poudre, soumises à l’autorisation du MJ (voir encadré), nécessite une action limitée pour être rechargée, arme tenue à deux mains. (Halfelins et gobelins peuvent utiliser des armes de plus petit calibre aux dés de DM réduits : pétoire 1d8 et mousquet 1d12.)',
    sourcePage: 185,
  },
];

// ---------------------------------------------------------------------------
// Armures — table p. 188
// ---------------------------------------------------------------------------

export const armures: Armure[] = [
  {
    id: 'tissus-matelasses-fourrures',
    nom: 'Tissus matelassés, fourrures',
    categorie: 'armure',
    def: 1,
    agiMax: 7,
    prix: { montant: 2, unite: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'cuir-simple',
    nom: 'Cuir simple',
    categorie: 'armure',
    def: 2,
    agiMax: 6,
    prix: { montant: 4, unite: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'cuir-renforce-broigne',
    nom: 'Cuir renforcé, broigne',
    categorie: 'armure',
    def: 3,
    agiMax: 5,
    prix: { montant: 8, unite: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'chemise-de-mailles',
    nom: 'Chemise de mailles',
    categorie: 'armure',
    def: 4,
    agiMax: 4,
    prix: { montant: 15, unite: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'cotte-de-mailles',
    nom: 'Cotte de mailles',
    categorie: 'armure',
    def: 5,
    agiMax: 3,
    prix: { montant: 25, unite: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'armure-de-plaques',
    nom: 'Armure de plaques',
    categorie: 'armure',
    def: 6,
    agiMax: 2,
    prix: { montant: 60, unite: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'plaque-complete',
    nom: 'Plaque complète',
    categorie: 'armure',
    def: 7,
    agiMax: 1,
    prix: { montant: 200, unite: 'pa' },
    proprietes:
      'Armure fabriquée sur mesure, seul le chevalier peut la porter grâce à la capacité de rang 3 de la voie de la noblesse.',
    sourcePage: 188,
  },
];

// ---------------------------------------------------------------------------
// Boucliers — table p. 188
// ---------------------------------------------------------------------------

export const boucliers: Bouclier[] = [
  {
    id: 'petit-bouclier',
    nom: 'Petit bouclier',
    categorie: 'bouclier',
    def: 1,
    prix: { montant: 2, unite: 'pa' },
    sourcePage: 188,
  },
  {
    id: 'grand-bouclier',
    nom: 'Grand bouclier',
    categorie: 'bouclier',
    def: 2,
    prix: { montant: 4, unite: 'pa' },
    sourcePage: 188,
  },
];

// ---------------------------------------------------------------------------
// Matériel — matériel d'aventurier p. 190, montures p. 191, auberge p. 192,
// biens immobiliers / qualité / exotique p. 193-195
// ---------------------------------------------------------------------------

export const materiel: Materiel[] = [
  // --- Matériel (table « Prix du matériel », p. 190) ---
  {
    id: 'briquet-a-silex',
    nom: 'Briquet à silex',
    categorie: 'materiel',
    prix: { montant: 1, unite: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'carquois-de-20-fleches',
    nom: 'Carquois de 20 flèches',
    categorie: 'materiel',
    prix: { montant: 3, unite: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'corde-15-m',
    nom: 'Corde 15 m',
    categorie: 'materiel',
    prix: { montant: 2, unite: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'couverture',
    nom: 'Couverture',
    categorie: 'materiel',
    prix: { montant: 1, unite: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'grappin',
    nom: 'Grappin',
    categorie: 'materiel',
    prix: { montant: 2, unite: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'lanterne-a-huile',
    nom: 'Lanterne à huile',
    categorie: 'materiel',
    prix: { montant: 3, unite: 'pa' },
    description:
      'Une torche ou une lanterne éclairent dans un rayon de 10 m pendant 1 h pour une torche ou 6 h pour une lanterne (1 dose d’huile).',
    sourcePage: 190,
  },
  {
    id: 'materiel-decriture',
    nom: 'Matériel d’écriture',
    categorie: 'materiel',
    prix: { montant: 5, unite: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'huile-pour-lanterne',
    nom: 'Huile pour lanterne',
    categorie: 'materiel',
    prix: { montant: 1, unite: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'torches-x3',
    nom: 'Torches (x3)',
    categorie: 'materiel',
    prix: { montant: 5, unite: 'pa' },
    description:
      'Une torche ou une lanterne éclairent dans un rayon de 10 m pendant 1 h pour une torche ou 6 h pour une lanterne (1 dose d’huile).',
    sourcePage: 190,
  },
  {
    id: 'outils-de-crochetage',
    nom: 'Outils de crochetage',
    categorie: 'materiel',
    prix: { montant: 5, unite: 'pa' },
    description: 'Sans ces outils, une pénalité de -10 est infligée aux tests d’AGI (Crocheter).',
    sourcePage: 190,
  },
  {
    id: 'potion-de-soins',
    nom: 'Potion de Soins (1d4° PV)',
    categorie: 'materiel',
    prix: { montant: 10, unite: 'pa' },
    description:
      'Les potions de soins ne sont pas forcément magiques, ce sont des remèdes à base de plantes ou de composants rares (qui peuvent être magiques). Un personnage ne peut pas profiter des effets de plus d’une potion de soins par récupération rapide (30 min).',
    sourcePage: 190,
  },
  {
    id: 'ration-1-semaine',
    nom: 'Ration (1 semaine)',
    categorie: 'materiel',
    prix: { montant: 4, unite: 'pa' },
    sourcePage: 190,
  },
  {
    id: 'sac-a-dos',
    nom: 'Sac à dos',
    categorie: 'materiel',
    prix: { montant: 1, unite: 'pa' },
    sourcePage: 190,
  },

  // --- Montures (table « Prix des montures », p. 191) ---
  {
    id: 'mule-ou-ane',
    nom: 'Mule ou âne',
    categorie: 'materiel',
    prix: { montant: 25, unite: 'pa' },
    sourcePage: 191,
  },
  {
    id: 'poney',
    nom: 'Poney',
    categorie: 'materiel',
    prix: { montant: 50, unite: 'pa' },
    sourcePage: 191,
  },
  {
    id: 'cheval-de-selle',
    nom: 'Cheval de selle',
    categorie: 'materiel',
    prix: { montant: 100, unite: 'pa' },
    description:
      'Cheval de selle : un cheval de selle n’est pas apte à subir le stress du combat, son cavalier subit un dé malus à toutes ses actions en selle en situation de combat.',
    sourcePage: 191,
  },
  {
    id: 'cheval-de-guerre',
    nom: 'Cheval de guerre',
    categorie: 'materiel',
    prix: { montant: 300, unite: 'pa' },
    description:
      'Le cheval de guerre ne souffre pas des pénalités du cheval de selle en combat et sa valeur d’attaque passe à +4. NC 1, taille grande. Un cheval de guerre est apte à porter un caparaçon : caparaçon de mailles +2 DEF pour 100 pa ; barde de plaque de métal +4 DEF pour 300 pa (malus en Init. égal au bonus de DEF).',
    sourcePage: 191,
  },
  {
    id: 'carriole',
    nom: 'Carriole',
    categorie: 'materiel',
    prix: { montant: 50, unite: 'pa' },
    sourcePage: 191,
  },
  {
    id: 'chariot',
    nom: 'Chariot',
    categorie: 'materiel',
    prix: { montant: 90, unite: 'pa' },
    sourcePage: 191,
  },
  {
    id: 'caparacon-de-mailles',
    nom: 'Caparaçon de mailles',
    categorie: 'materiel',
    prix: { montant: 100, unite: 'pa' },
    description:
      'Un caparaçon de mailles augmente la DEF du cheval de +2. Les bardes octroient un malus en Init. au cheval et à son cavalier égal au bonus de DEF.',
    sourcePage: 191,
  },
  {
    id: 'barde-de-plaque',
    nom: 'Barde de plaque (de métal)',
    categorie: 'materiel',
    prix: { montant: 300, unite: 'pa' },
    description:
      'Une barde de plaque de métal apporte un bonus de +4 en DEF. Les bardes octroient un malus en Init. au cheval et à son cavalier égal au bonus de DEF.',
    sourcePage: 191,
  },

  // --- À l'auberge (table « Prix des prestations d'auberge », p. 192) ---
  {
    id: 'cidre-lait-verre',
    nom: 'Cidre, lait (verre)',
    categorie: 'materiel',
    prix: { montant: 1, unite: 'pc' },
    description: 'Boisson.',
    sourcePage: 192,
  },
  {
    id: 'cervoise-biere-pinte',
    nom: 'Cervoise, bière (pinte)',
    categorie: 'materiel',
    prix: { montant: 2, unite: 'pc' },
    description: 'Boisson.',
    sourcePage: 192,
  },
  {
    id: 'hydromel-vin-verre',
    nom: 'Hydromel, vin (verre)',
    categorie: 'materiel',
    prix: { montant: 5, unite: 'pc' },
    description: 'Boisson.',
    sourcePage: 192,
  },
  {
    id: 'grand-cru-bouteille',
    nom: 'Grand cru (bouteille)',
    categorie: 'materiel',
    prix: { montant: 5, unite: 'pa' },
    description: 'Boisson. Prix : 5-50 pa.',
    sourcePage: 192,
  },
  {
    id: 'soupe-et-pain',
    nom: 'Soupe et pain',
    categorie: 'materiel',
    prix: { montant: 1, unite: 'pc' },
    description: 'Repas.',
    sourcePage: 192,
  },
  {
    id: 'repas-avec-viande',
    nom: 'Repas avec viande',
    categorie: 'materiel',
    prix: { montant: 1, unite: 'pa' },
    description: 'Repas.',
    sourcePage: 192,
  },
  {
    id: 'bon-repas',
    nom: 'Bon repas',
    categorie: 'materiel',
    prix: { montant: 5, unite: 'pa' },
    description: 'Repas.',
    sourcePage: 192,
  },
  {
    id: 'banquet',
    nom: 'Banquet',
    categorie: 'materiel',
    prix: { montant: 10, unite: 'pa' },
    description: 'Repas. Prix : 10-20 pa.',
    sourcePage: 192,
  },
  {
    id: 'nuit-dortoir',
    nom: 'Nuit (dortoir)',
    categorie: 'materiel',
    prix: { montant: 5, unite: 'pc' },
    description: 'Nuitée.',
    sourcePage: 192,
  },
  {
    id: 'nuit-chambre-de-4',
    nom: 'Nuit (chambre de 4)',
    categorie: 'materiel',
    prix: { montant: 1, unite: 'pa' },
    description: 'Nuitée.',
    sourcePage: 192,
  },
  {
    id: 'nuit-chambre-individuelle',
    nom: 'Nuit (chambre individuelle)',
    categorie: 'materiel',
    prix: { montant: 2, unite: 'pa' },
    description: 'Nuitée. Prix : 2-5 pa.',
    sourcePage: 192,
  },
  {
    id: 'nuit-suite',
    nom: 'Nuit (suite)',
    categorie: 'materiel',
    prix: { montant: 10, unite: 'pa' },
    description: 'Nuitée. Prix : 10-20 pa.',
    sourcePage: 192,
  },

  // --- Biens immobiliers (table « Prix des biens immobiliers », p. 193) ---
  // Note : ces prix sont exprimés en pièces d'or (po) dans le livre.
  {
    id: 'appartement-2-pieces',
    nom: 'Appartement (2 pièces)',
    categorie: 'materiel',
    prix: { montant: 250, unite: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'masure-3-pieces',
    nom: 'Masure (3 pièces)',
    categorie: 'materiel',
    prix: { montant: 500, unite: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'maison-3-pieces',
    nom: 'Maison (3 pièces)',
    categorie: 'materiel',
    prix: { montant: 1000, unite: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'grande-maison-6-pieces',
    nom: 'Grande maison (6 pièces)',
    categorie: 'materiel',
    prix: { montant: 2000, unite: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'villa-luxueuse',
    nom: 'Villa luxueuse',
    categorie: 'materiel',
    prix: { montant: 10000, unite: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'manoir',
    nom: 'Manoir',
    categorie: 'materiel',
    prix: { montant: 20000, unite: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'place-forte',
    nom: 'Place forte',
    categorie: 'materiel',
    prix: { montant: 60000, unite: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'chateau',
    nom: 'Château',
    categorie: 'materiel',
    prix: { montant: 150000, unite: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },
  {
    id: 'palais',
    nom: 'Palais',
    categorie: 'materiel',
    prix: { montant: 300000, unite: 'po' },
    description: 'Bien immobilier.',
    sourcePage: 193,
  },

  // --- Équipement de qualité (p. 193) ---
  {
    id: 'arme-de-qualite',
    nom: 'Arme de qualité',
    categorie: 'materiel',
    prix: null,
    description:
      'Une arme de qualité donne un bonus de +1 en attaque ou aux DM (toujours le même). Pour une armure, c’est la pénalité d’encombrement infligée aux tests d’AGI qui est réduite de -1. Le prix de l’objet est multiplié par deux et on y ajoute 100 pa (ex. une épée longue de qualité vaut (6 × 2) +100 = 112 pa). Fabriquer un objet de qualité augmente la difficulté du test d’artisanat (habituellement entre 10 et 15) de +10, et la durée de travail est multipliée par trois. (Atlas d’Osgild — règles optionnelles.)',
    sourcePage: 193,
  },
  {
    id: 'armure-de-qualite',
    nom: 'Armure de qualité',
    categorie: 'materiel',
    prix: null,
    description:
      'Pour une armure, l’équipement de qualité réduit de -1 la pénalité d’encombrement infligée aux tests d’AGI. Le prix de l’objet est multiplié par deux et on y ajoute 100 pa. (Atlas d’Osgild — règles optionnelles.)',
    sourcePage: 193,
  },

  // --- Équipement exotique (p. 193-195) — exemples de matériaux ---
  {
    id: 'durium',
    nom: 'Durium',
    categorie: 'materiel',
    prix: { montant: 40, unite: 'pa' },
    description:
      'Précieux (40 pa). Un métal bleu sombre, très dur et particulièrement lourd. En cas de mêlée fabriquées dans ce métal imposent un malus de -1 en attaque, mais le dé de DM augmente d’une catégorie et elles sont presque indestructibles (1d4/1d6/1d8/1d10/1d12). Si les DM sont exprimés sous la forme de deux dés, on seul augmente (2d4 devient 1d4+1d6, 2d6 devient 1d6+1d8). Les projectiles fabriqués dans ce métal voient leur portée divisée par deux. Les armures obtiennent un bonus de +1 en DEF, mais leur pénalité d’armure augmente de +2. Prix d’une arme : multiplier la valeur maximale des DM par le prix indiqué, puis ajouter le prix normal de l’arme (ex. épée longue DM 1d8, 6 pa en durium (40 pa) vaut (8 × 40) + 6 = 326 pa). Prix d’une armure : multiplier le bonus de DEF par le double du prix indiqué, puis ajouter le prix normal de l’armure (ex. cotte de mailles en durium vaut (5 × 2 × 40) + 25 = 425 pa).',
    sourcePage: 195,
  },
  {
    id: 'chope-en-hybberium',
    nom: 'Chope en hybberium',
    categorie: 'materiel',
    prix: { montant: 100, unite: 'pa' },
    description:
      'Exotique (100 pa). L’hybberium est un métal qui devient glacial au contact de l’air, produisant même du givre. Cette simple chope en métal, en bois ou en ivoire permet à votre bière de rester bien fraîche, même en plein désert. Un passage obligé pour tout nain qui se respecte.',
    sourcePage: 195,
  },
  {
    id: 'pnoulpe',
    nom: 'Pnoulpe',
    categorie: 'materiel',
    prix: { montant: 300, unite: 'pa' },
    description:
      'Exotique (300 pa). Le pnoulpe est une sorte de petit poulpe qui a la particularité de transformer l’eau en mélange respirable, et inversement, en quantité suffisante pour assurer la survie d’un être humain en milieu aquatique. En pratique, on place le corps mou de couleur rouge sur les voies respiratoires, les tentacules enserrant la tête, puis on se dépêche d’entrer dans l’eau pour ne pas asphyxier. Le pnoulpe est vendu dans un coffret de bois étanche empli d’un liquide qui permet de le conserver en léthargie environ un mois au maximum (15 × 15 × 30 cm, poids 5 kg). Dès que la boîte est ouverte, il faut le mettre à l’eau, il ne peut plus être à nouveau plongé en léthargie et si on le sort de l’eau, il meurt rapidement.',
    sourcePage: 195,
  },
];
