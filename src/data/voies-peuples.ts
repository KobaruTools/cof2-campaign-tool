/**
 * Voies de peuple (chap. 3, p. 48-60) et voie du mage (p. 60).
 *
 * Textes de capacités verbatim (césures de fin de ligne du livre recollées).
 * Marqueurs relevés : `*` après le nom → `estSort`, lettres entre
 * parenthèses → `typesAction` ; le nom stocké est sans marqueurs.
 *
 * Rappel (p. 46) : le demi-elfe n'a pas de voie dédiée et choisit entre la
 * voie de l'humain et une des deux voies d'elfe — d'où sa présence dans les
 * `peupleIds` de ces trois voies.
 */

import type { Capacite, VoieDePeuple, VoieDuMage } from './schema';

// ---------------------------------------------------------------------------
// Voies de peuple
// ---------------------------------------------------------------------------

export const voiesDePeuple: VoieDePeuple[] = [
  {
    id: 'demi-orc',
    nom: 'Voie du demi-orc',
    type: 'peuple',
    peupleIds: ['demi-orc'],
    capaciteIds: ['demi-orc-r1', 'demi-orc-r2', 'demi-orc-r3', 'demi-orc-r4', 'demi-orc-r5'],
    sourcePage: 48,
  },
  {
    id: 'elfe-haut',
    nom: 'Voie de l’elfe haut',
    type: 'peuple',
    peupleIds: ['elfe-haut', 'demi-elfe'],
    capaciteIds: ['elfe-haut-r1', 'elfe-haut-r2', 'elfe-haut-r3', 'elfe-haut-r4', 'elfe-haut-r5'],
    sourcePage: 50,
  },
  {
    id: 'elfe-sylvain',
    nom: 'Voie de l’elfe sylvain',
    type: 'peuple',
    peupleIds: ['elfe-sylvain', 'demi-elfe'],
    capaciteIds: [
      'elfe-sylvain-r1',
      'elfe-sylvain-r2',
      'elfe-sylvain-r3',
      'elfe-sylvain-r4',
      'elfe-sylvain-r5',
    ],
    sourcePage: 52,
  },
  {
    id: 'gnome',
    nom: 'Voie du gnome',
    type: 'peuple',
    peupleIds: ['gnome'],
    capaciteIds: ['gnome-r1', 'gnome-r2', 'gnome-r3', 'gnome-r4', 'gnome-r5'],
    sourcePage: 53,
  },
  {
    id: 'halfelin',
    nom: 'Voie du halfelin',
    type: 'peuple',
    peupleIds: ['halfelin'],
    capaciteIds: ['halfelin-r1', 'halfelin-r2', 'halfelin-r3', 'halfelin-r4', 'halfelin-r5'],
    sourcePage: 55,
  },
  {
    id: 'humain',
    nom: 'Voie de l’humain',
    type: 'peuple',
    peupleIds: ['humain', 'demi-elfe'],
    capaciteIds: ['humain-r1', 'humain-r2', 'humain-r3', 'humain-r4', 'humain-r5'],
    sourcePage: 57,
  },
  {
    id: 'nain',
    nom: 'Voie du nain',
    type: 'peuple',
    peupleIds: ['nain'],
    capaciteIds: ['nain-r1', 'nain-r2', 'nain-r3', 'nain-r4', 'nain-r5'],
    sourcePage: 59,
  },
];

// ---------------------------------------------------------------------------
// Voie du mage — p. 60
// ---------------------------------------------------------------------------

export const voieDuMage: VoieDuMage = {
  id: 'mage',
  nom: 'Voie du mage',
  type: 'mage',
  capaciteIds: ['mage-r1', 'mage-r2', 'mage-r3', 'mage-r4', 'mage-r5'],
  // Règles d'accès et de remplacement de la voie de peuple — p. 60 (verbatim).
  note:
    'Un personnage de la famille des mages (ensorceleur, forgesort, magicien, sorcier) peut choisir de remplacer sa voie de peuple par la voie du mage. Il renonce à ses racines en échange d’un plus grand pouvoir occulte.\n\n' +
    'Il ne conserve que la capacité de rang 1 de sa voie de peuple, acquise dès la création du personnage. Ce choix doit être fait avant d’obtenir le rang 2 de la voie de peuple et il est définitif. Désormais, le personnage ne peut plus obtenir de nouvelles capacités de sa voie de peuple.\n\n' +
    'Cette voie remplace la voie de peuple du personnage, elle occupe le même emplacement sur la fiche de personnage et son premier rang est gratuit comme n’importe quelle voie de peuple.',
  sourcePage: 60,
};

// ---------------------------------------------------------------------------
// Capacités
// ---------------------------------------------------------------------------

export const capacitesPeuples: Capacite[] = [
  // --- Voie du demi-orc — p. 48 ------------------------------------------
  {
    id: 'demi-orc-r1',
    nom: 'Impressionnant',
    voieId: 'demi-orc',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      'Le demi-orc gagne un bonus de +3 à tous les tests d’intimidation. De plus, dans le noir total, le demi-orc voit comme dans la pénombre jusqu’à 30 m.',
    sourcePage: 48,
  },
  {
    id: 'demi-orc-r2',
    nom: 'Talent pour la violence',
    voieId: 'demi-orc',
    rang: 2,
    estSort: false,
    typesAction: [],
    texte:
      'Le joueur choisit une capacité de rang 1 de n’importe quelle voie de barbare ou de guerrier.',
    sourcePage: 48,
  },
  {
    id: 'demi-orc-r3',
    nom: 'Critique brutal',
    voieId: 'demi-orc',
    rang: 3,
    estSort: false,
    typesAction: [],
    texte:
      'Le demi-orc augmente de 1 point la zone de critique sur une attaque au contact (19-20 au d20) et ajoute +1d4° aux DM en cas de critique.',
    sourcePage: 48,
  },
  {
    id: 'demi-orc-r4',
    nom: 'Attaque sanglante',
    voieId: 'demi-orc',
    rang: 4,
    estSort: false,
    typesAction: ['L'],
    texte:
      'Le demi-orc réalise une attaque de contact qui provoque une hémorragie. En plus des DM normaux, l’attaque produit un saignement qui inflige à la victime 1d4° DM à chaque round suivant jusqu’à ce que la cible soit soignée (tout effet de soins ou une action limitée utilisée à cet effet). On ne peut pas cumuler plusieurs effets de saignement.',
    sourcePage: 48,
  },
  {
    id: 'demi-orc-r5',
    nom: 'Colosse',
    voieId: 'demi-orc',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte: 'Le demi-orc augmente ses valeurs de FOR et de CON de +1.',
    sourcePage: 48,
  },

  // --- Voie de l'elfe haut — p. 50 ----------------------------------------
  {
    id: 'elfe-haut-r1',
    nom: 'Lumière intérieure',
    voieId: 'elfe-haut',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      'Pour un elfe, l’obscurité de la nuit sous la lumière des étoiles est considérée comme de la pénombre. De plus, il gagne un bonus de +3 à tous les tests d’érudition (INT) et artistiques (CHA).',
    sourcePage: 50,
  },
  {
    id: 'elfe-haut-r2',
    nom: 'Force d’âme',
    voieId: 'elfe-haut',
    rang: 2,
    estSort: false,
    typesAction: [],
    texte:
      'L’elfe est immunisé à la peur et au sommeil magique. De plus, il obtient un bonus égal à son rang lorsqu’il doit faire un test opposé d’attaque magique pour résister à un sort.',
    sourcePage: 50,
  },
  {
    id: 'elfe-haut-r3',
    nom: 'Talent pour la magie',
    voieId: 'elfe-haut',
    rang: 3,
    estSort: false,
    typesAction: [],
    texte:
      'Le joueur choisit une capacité de rang 1 de n’importe quelle voie de magicien ou d’ensorceleur. Il peut utiliser cette capacité en armure sans pénalité (mais pas une capacité qui offre un bonus de DEF). À la place, il peut choisir une capacité de rang 2, mais ne doit alors pas porter d’armure pour lancer le sort.',
    sourcePage: 50,
  },
  {
    id: 'elfe-haut-r4',
    nom: 'Immortel',
    voieId: 'elfe-haut',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      'L’elfe n’a besoin que de la moitié du repos, de la nourriture ou de la boisson d’un humain normal pour être en pleine forme. Il est immunisé aux effets des poisons et des maladies.',
    sourcePage: 50,
  },
  {
    id: 'elfe-haut-r5',
    nom: 'Supériorité elfique',
    voieId: 'elfe-haut',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte: 'L’elfe augmente sa valeur de VOL de +1 et sa valeur d’INT ou de CHA de +1.',
    sourcePage: 50,
  },

  // --- Voie de l'elfe sylvain — p. 52 --------------------------------------
  {
    id: 'elfe-sylvain-r1',
    nom: 'Lumière des étoiles',
    voieId: 'elfe-sylvain',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      'Pour un elfe sylvain, l’obscurité de la nuit sous la lumière des étoiles est considérée comme de la pénombre. De plus, l’elfe gagne un bonus de +3 à tous les tests de survie en forêt (escalade, discrétion, chasse, etc.).',
    sourcePage: 52,
  },
  {
    id: 'elfe-sylvain-r2',
    nom: 'Enfant de la forêt',
    voieId: 'elfe-sylvain',
    rang: 2,
    estSort: false,
    typesAction: [],
    texte:
      'Le joueur choisit une capacité de rang 1 de n’importe quelle voie de druide ou de rôdeur. Il peut utiliser cette capacité en armure jusqu’à l’armure de cuir renforcé sans pénalité.',
    sourcePage: 52,
  },
  {
    id: 'elfe-sylvain-r3',
    nom: 'Archer émérite',
    voieId: 'elfe-sylvain',
    rang: 3,
    estSort: false,
    typesAction: [],
    texte:
      'L’elfe augmente de 1 la zone de critique lorsqu’il utilise un arc (19-20 au d20) et ajoute +1d4° aux DM en cas de critique. Il sait utiliser les arcs courts, quel que soit son profil.',
    sourcePage: 52,
  },
  {
    id: 'elfe-sylvain-r4',
    nom: 'Flèche sanglante',
    voieId: 'elfe-sylvain',
    rang: 4,
    estSort: false,
    typesAction: ['L'],
    texte:
      'L’elfe fait une attaque à distance qui provoque une hémorragie. En plus des DM normaux, la flèche produit un effet de saignement qui inflige à la victime 1d4° DM à chaque round suivant jusqu’à ce que la cible soit soignée (tout effet de soins ou une action limitée utilisée à cet effet). On ne peut cumuler plusieurs effets de saignement.',
    sourcePage: 52,
  },
  {
    id: 'elfe-sylvain-r5',
    nom: 'Supériorité elfique',
    voieId: 'elfe-sylvain',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte: 'L’elfe augmente ses valeurs d’AGI et PER de +1.',
    sourcePage: 52,
  },

  // --- Voie du gnome — p. 53-54 --------------------------------------------
  {
    id: 'gnome-r1',
    nom: 'Don étrange',
    voieId: 'gnome',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      'Le gnome possède un talent inné pour les sciences, qu’elles soient occultes ou plus ordinaires. Il gagne un bonus de +3 à tous les tests scientifiques (INT) et il choisit une capacité de rang 1 d’ensorceleur. S’il porte une armure, il ne peut pas utiliser ce sort plus d’une fois par jour (il doit payer le coût en PM de façon normale). Dans le noir total, le gnome voit comme dans la pénombre jusqu’à 10 m.',
    sourcePage: 53,
  },
  {
    id: 'gnome-r2',
    nom: 'Petit pote',
    voieId: 'gnome',
    rang: 2,
    estSort: false,
    typesAction: [],
    texte:
      'Le gnome est un compagnon sympathique et difficile à considérer comme dangereux ou malintentionné. Il gagne +3 à tous les tests d’interaction sociale sauf pour intimider. Il gagne aussi 1 point de chance.',
    sourcePage: 54,
  },
  {
    id: 'gnome-r3',
    nom: 'Insignifiant',
    voieId: 'gnome',
    rang: 3,
    estSort: false,
    typesAction: [],
    texte:
      'Le gnome sait comment échapper aux attaques des grandes créatures comme les géants. Il gagne un bonus de +2 en DEF contre les créatures de taille grande ou supérieure. Ce bonus passe à +3 au rang 5.',
    sourcePage: 54,
  },
  {
    id: 'gnome-r4',
    nom: 'Merveille technologique',
    voieId: 'gnome',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      'Le gnome sait utiliser les arbalètes (et les armes à poudre si votre MJ autorise leur usage), quel que soit son profil. Il ajoute son AGI aux DM qu’il inflige avec ces armes.',
    sourcePage: 54,
  },
  {
    id: 'gnome-r5',
    nom: 'Bonne nature',
    voieId: 'gnome',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte: 'Le gnome augmente ses valeurs de CON et de CHA de +1.',
    sourcePage: 54,
  },

  // --- Voie du halfelin — p. 55-56 -----------------------------------------
  {
    id: 'halfelin-r1',
    nom: 'Petite taille',
    voieId: 'halfelin',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      'Le halfelin obtient un bonus de +1 en DEF et de +3 à tous les tests de discrétion ainsi qu’à tous les tests effectués pour subtiliser quelque chose (pickpocket, vol à l’étalage, etc.). En revanche, un halfelin ne peut pas utiliser à une main une arme dont les DM dépassent 1d6 (épée courte, masse, etc., mais pas rapière). Il lui faut utiliser les deux mains pour les armes qui infligent 1d8 à 1d10 de DM (épée longue) et il lui est interdit d’utiliser les armes qui infligent plus de 1d10 DM. Il ne peut pas utiliser d’arc long ni d’arbalète lourde.',
    sourcePage: 55,
  },
  {
    id: 'halfelin-r2',
    nom: 'Résistance légendaire',
    voieId: 'halfelin',
    rang: 2,
    estSort: false,
    typesAction: [],
    texte:
      'Le halfelin obtient un bonus égal à son rang à tous les tests opposés d’attaque magique effectués pour résister à un sort.',
    sourcePage: 55,
  },
  {
    id: 'halfelin-r3',
    nom: 'Bon pour le moral',
    voieId: 'halfelin',
    rang: 3,
    estSort: false,
    typesAction: [],
    texte:
      'Un halfelin qui mange bien est un halfelin heureux. À chaque repas (jusqu’à 4 fois par jour, espacés d’au moins 3 h) au cours duquel le personnage boit et mange des mets de qualité et en quantité, il récupère 1d4° PV.',
    sourcePage: 55,
  },
  {
    id: 'halfelin-r4',
    nom: 'Petit veinard',
    voieId: 'halfelin',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      'Le halfelin gagne 1 PC supplémentaire. De plus, il peut esquiver une attaque de son choix par combat (avant d’avoir pris connaissance des DM, mais pas un critique).',
    sourcePage: 56,
  },
  {
    id: 'halfelin-r5',
    nom: 'Vif et bien nourri',
    voieId: 'halfelin',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte: 'Le halfelin augmente ses valeurs d’AGI et de CON de +1.',
    sourcePage: 56,
  },

  // --- Voie de l'humain — p. 57 (liste d'origines p. 57, suite et exemple
  // p. 58, rattachés au rang 1 qui y renvoie : « voir ci-dessous ») ---------
  {
    id: 'humain-r1',
    nom: 'Diversité',
    voieId: 'humain',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      'Un humain obtient un bonus de +3 aux tests de deux domaines associés à son origine géographique ou sociale (voir ci-dessous). De plus, il gagne 1 PC supplémentaire.\n\n' +
      'Origine géographique ou sociale (choisissez ou lancez un d6) :\n' +
      '1. Montagnard (escalade et résistance au froid).\n' +
      '2. Citadin (commerce et résistance aux maladies).\n' +
      '3. Campagnard (météorologie et équitation).\n' +
      '4. Riverain (natation et navigation).\n' +
      '5. Sauvage (chasser et pister).\n' +
      '6. Nomade (orientation et résistance à la chaleur ou au froid).\n\n' +
      'Le MJ peut en inventer d’autres selon les cultures présentes dans son univers de jeu (troglodyte, marais, etc.). Éventuellement, le joueur peut remplacer un des bonus d’origine géographique par un bonus en relation avec son origine sociale ou un gagne-pain de son choix (serrurier, forgeron, scribe, maçon, chasseur, cuisinier, acrobate, pickpocket, bibliothécaire, étudiant, etc.). Le gagne-pain ne peut pas être un profil et le bonus obtenu ne s’applique jamais à des tests de combat.\n\n' +
      'Exemple : Un citadin étudiant en magie pourrait obtenir un bonus de +3 aux tests de commerce et +3 aux tests d’érudition occulte, même si son personnage est finalement devenu guerrier.',
    sourcePage: 57,
  },
  {
    id: 'humain-r2',
    nom: 'Instinct de survie',
    voieId: 'humain',
    rang: 2,
    estSort: false,
    typesAction: [],
    texte:
      'Une fois par combat, lorsqu’une attaque devrait amener l’humain à 0 PV, les DM qu’elle inflige sont divisés par 2 (minimum 1). Après avoir bénéficié de cette capacité, l’humain gagne pour le reste du combat un bonus de +2 en DEF.',
    sourcePage: 57,
  },
  {
    id: 'humain-r3',
    nom: 'Touche-à-tout',
    voieId: 'humain',
    rang: 3,
    estSort: false,
    typesAction: [],
    texte:
      'Le personnage obtient une capacité de rang 1 ou 2 de n’importe quel profil au choix du joueur. Si la capacité est de rang 2 ou accorde un bonus de DEF, il doit respecter les limitations d’armure.',
    sourcePage: 57,
  },
  {
    id: 'humain-r4',
    nom: 'Loup parmi les loups',
    voieId: 'humain',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      'Une fois par round, l’humain gagne +1d4° aux DM qu’il inflige lorsqu’il combat un adversaire humanoïde de taille moyenne. Ce bonus ne s’applique qu’aux DM initiaux d’une attaque, pas aux DM sur la durée.',
    sourcePage: 57,
  },
  {
    id: 'humain-r5',
    nom: 'Polyvalence',
    voieId: 'humain',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte: 'Le personnage augmente sa caractéristique la plus faible de +1 et sa Volonté de +1.',
    sourcePage: 57,
  },

  // --- Voie du nain — p. 59-60 ---------------------------------------------
  {
    id: 'nain-r1',
    nom: 'Habitant des tunnels',
    voieId: 'nain',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      'Dans le noir total, le nain voit comme dans la pénombre jusqu’à 30 m. De plus, il obtient un bonus de +3 à tous les tests en rapport avec la pierre, l’architecture ou les mines ainsi qu’avec les passages secrets et les pièges dans les murs et les parois rocheuses.',
    sourcePage: 59,
  },
  {
    id: 'nain-r2',
    nom: 'Haches et marteaux',
    voieId: 'nain',
    rang: 2,
    estSort: false,
    typesAction: [],
    texte:
      'Le nain gagne un bonus de +1 en attaque et aux DM lorsqu’il utilise une hache ou un marteau de guerre. Il sait utiliser ces armes, quel que soit son profil.',
    sourcePage: 59,
  },
  {
    id: 'nain-r3',
    nom: 'Résistance à la magie',
    voieId: 'nain',
    rang: 3,
    estSort: false,
    typesAction: [],
    texte:
      'Une fois par jour, le nain peut choisir d’ignorer les effets d’un sort qui le prend pour cible (mais pas un sort de zone). Les créatures dont le niveau (NC) est au moins égal au double du nain ignorent cette capacité.',
    sourcePage: 59,
  },
  {
    id: 'nain-r4',
    nom: 'Fils du roc',
    voieId: 'nain',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      'Le nain réduit tous les DM subis de 2 points (mais il subit toujours au moins 1 DM par attaque reçue). La réduction passe à 3 au niveau 10. Elle est cumulable avec d’autres sources de réduction des DM comme la peau d’acier du barbare.',
    sourcePage: 59,
  },
  {
    id: 'nain-r5',
    nom: 'Ténacité',
    voieId: 'nain',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte: 'Le nain augmente ses valeurs de CON et de VOL de +1.',
    sourcePage: 60,
  },

  // --- Voie du mage — p. 60 -------------------------------------------------
  {
    id: 'mage-r1',
    nom: 'Capacité de peuple + occultisme',
    voieId: 'mage',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      'Le mage conserve sa capacité de peuple de rang 1. De plus, il ajoute son rang + 2 aux tests de connaissance et d’érudition en rapport avec la magie.',
    sourcePage: 60,
  },
  {
    id: 'mage-r2',
    nom: 'Maîtrise de la magie',
    voieId: 'mage',
    rang: 2,
    estSort: true,
    typesAction: ['L'],
    texte:
      'Le mage peut détecter la présence de magie (y compris la présence d’objets magiques) dans un rayon de 10 m. Un test d’INT difficulté [10 + rang du sort] permet de déterminer la fonction générale de l’enchantement. Il peut aussi tenter de dissiper un sort non permanent d’un rang maximal égal à ceux qu’il est capable de lancer en emportant un test opposé d’attaque magique contre l’auteur du sort.',
    sourcePage: 60,
  },
  {
    id: 'mage-r3',
    nom: 'Tour de magie',
    voieId: 'mage',
    rang: 3,
    estSort: true,
    typesAction: ['G'],
    texte:
      'Le mage peut réaliser un tour de magie (portée 10 m) par round en action gratuite sans dépenser aucun PM. Par exemple, fermer une porte à distance, éteindre ou allumer une bougie en claquant des doigts. Il ne peut réaliser aucune action qui nécessite une valeur de caractéristique supérieure à 0 (par exemple, s’il faut au moins +1 ou un test de FOR pour pousser une porte lourde, ce sort ne permet pas de la fermer). Cette capacité ne peut produire aucun DM direct. De plus, le mage gagne +1 en DEF et +2 PM (en plus de celui gagné avec cette capacité ; au total, en apprenant ce sort, le mage acquiert donc 3 PM d’un coup).',
    sourcePage: 60,
  },
  {
    id: 'mage-r4',
    nom: 'Esprit supérieur',
    voieId: 'mage',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      'Le mage augmente son INT et sa VOL de +1. Désormais, il obtient un dé bonus aux tests d’INT.',
    sourcePage: 60,
  },
  {
    id: 'mage-r5',
    nom: 'Tempête de mana',
    voieId: 'mage',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      'Lorsqu’il lance un sort, le mage peut augmenter les DM de +1d4° (en cas de DM sur la durée, une seule fois) en payant +1 PM pour un sort à cible unique ou +3 PM pour un sort de zone (Explosion de feu, Foudre, etc.).',
    sourcePage: 60,
  },
];
