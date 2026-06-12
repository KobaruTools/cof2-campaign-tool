/**
 * Voies de prestige — Partie 1 : voies génériques (p. 129-136) et voies
 * d'aventurier (p. 137-145), chapitre 8 « Voies de prestige ».
 *
 * Source : CBHS_06_Chroniques_Oubliees_2_web_v2.pdf (livre de base CO2).
 * Textes verbatim (décision PRD #3). Capacités de prestige : rangs 4 à 8.
 *
 * ANOMALIE : la capacité « Familier fantastique » de la voie du familier
 * fantastique est de rang 3 dans le livre (p. 132), alors que les voies de
 * prestige sont décrites comme ayant des rangs répartis de 4 à 8 (p. 128).
 * Le rang réel (3) est conservé.
 */

import type { VoieDePrestige, Capacite } from '../schema';

export const voiesPrestige1: VoieDePrestige[] = [
  // ----- Voies génériques (p. 129-136) -----
  {
    id: 'prestige-expert',
    nom: "Voie de l'expert",
    type: 'prestige',
    categorie: 'generique',
    prerequis:
      'avoir acquis le rang 2 dans au moins trois voies issues du même profil. Aucune voie en dehors de la famille du profil principal.',
    capaciteIds: [
      'prestige-expert-r4',
      'prestige-expert-r5',
      'prestige-expert-r6',
      'prestige-expert-r7',
      'prestige-expert-r8',
    ],
    note: "La voie de l'expert se décline en quatre variantes selon la famille du profil. Les points de vigueur obtenus correspondent à la famille du profil. Le personnage doit toujours respecter les restrictions d'armure imposées par les voies dont sont issues les capacités choisies.\n\nNote : Cette voie n'est pas accessible aux profils hybrides qui ont choisi des voies issues d'une autre famille de profils que celle du profil principal. La voie de l'expert permet d'élargir les capacités du personnage à l'ensemble des profils de sa famille. C'est un choix tout aussi intéressant que le profil hybride, tant que le joueur ne cherche pas de capacité hors de sa famille de profils et qu'il n'est pas pressé d'en faire l'acquisition. En revanche, elle présente l'avantage de permettre d'aller chercher des capacités dans de nombreux profils de la famille.",
    sourcePage: 129,
  },
  {
    id: 'prestige-specialiste',
    nom: 'Voie du spécialiste',
    type: 'prestige',
    categorie: 'generique',
    prerequis:
      "avoir acquis le rang 4 dans la voie à laquelle s'appliquera la voie du spécialiste (expertise, capacité signature, capacité supérieure et capacité fabuleuse). Cette voie doit être issue du profil principal du personnage.",
    capaciteIds: [
      'prestige-specialiste-r4',
      'prestige-specialiste-r5',
      'prestige-specialiste-r6',
      'prestige-specialiste-r7',
      'prestige-specialiste-r8',
    ],
    note: "La voie du spécialiste n'étend pas le domaine de compétence du personnage, mais lui permet d'améliorer certaines capacités ou compétences en apportant des bonus à ce qu'il sait déjà faire. Cette voie permet au personnage de devenir très efficace sur un type particulier d'action, généralement orienté vers le combat.\n\nLes points de vigueur obtenus correspondent au profil principal du personnage.",
    sourcePage: 129,
  },
  {
    id: 'prestige-lycanthrope',
    nom: 'Voie du lycanthrope',
    type: 'prestige',
    categorie: 'generique',
    prerequis:
      "Cette voie peut être ouverte à n'importe quel profil si le personnage a été mordu par un lycanthrope. Dans ce dernier cas, reportez-vous à l'encadré grand méchant loup. Le personnage obtient 5 PV par niveau.",
    capaciteIds: [
      'prestige-lycanthrope-r4',
      'prestige-lycanthrope-r5',
      'prestige-lycanthrope-r6',
      'prestige-lycanthrope-r7',
      'prestige-lycanthrope-r8',
    ],
    note: "Malédiction ou super pouvoir ? La lycanthropie fait peur ou fascine et cela se retrouve aussi parmi les joueurs. Voici la voie qu'il vous faut si vous êtes de ceux qui aspirent à cette romance noire ou tout simplement si votre héros préféré s'est fait mordre par la Bête et que vous devez à présent en supporter les conséquences.\n\nGRAND MÉCHANT LOUP\nLes indications présentées dans cet encadré s'appliquent seulement à un PJ qui devient lycanthrope à la suite de la morsure d'un loup-garou. Le PJ ne contrôle rien et se transforme en bête maléfique, haineuse et affamée à chaque pleine lune et chaque fois qu'il reçoit un critique ou subit une situation trop frustrante (durée 1d6 h). Lorsqu'il reprend forme humaine, il ne se rappelle rien des exactions qu'il a commises. À l'inverse, il ne peut pas se transformer volontairement.\nLa seule solution pour apprendre à se contrôler consiste à faire l'acquisition de la voie du lycanthrope. Dès qu'il acquiert le premier rang de la voie du lycanthrope, il apprend à se transformer volontairement. De plus, il peut alors résister à chaque transformation involontaire en réussissant un test de VOL difficulté [15 – rang]. S'il se transforme involontairement, à la fin de celle-ci, il peut tenter de se rappeler ce qu'il a fait durant la transformation en réussissant un test d'INT difficulté 10.\nComme la voie de lycanthropie est une voie de prestige, cela signifie que le PJ doit effectivement attendre le niveau 5 pour avoir une chance de contrôler sa maladie. À l'inverse, si le personnage est de plus haut niveau et qu'il possède déjà une voie de prestige, il devra désapprendre cette voie. Il est impossible d'avoir deux voies de prestige, aussi il perd immédiatement toutes les capacités de l'ancienne voie dès qu'il acquiert la voie du lycanthrope. Il peut transférer les capacités de l'ancienne voie de prestige vers la voie du lycanthrope au rythme de deux capacités par niveau.",
    sourcePage: 130,
  },
  {
    id: 'prestige-sang-dragon',
    nom: 'Voie du sang-dragon',
    type: 'prestige',
    categorie: 'generique',
    prerequis:
      "cette voie de prestige peut donner lieu à une aventure particulière ou à la découverte d'éléments cachés de l'histoire de la lignée du personnage. Le personnage obtient 5 PV par niveau.",
    capaciteIds: [
      'prestige-sang-dragon-r4',
      'prestige-sang-dragon-r5',
      'prestige-sang-dragon-r6',
      'prestige-sang-dragon-r7',
      'prestige-sang-dragon-r8',
    ],
    note: "Les dragons les plus puissants sont capables de prendre forme humaine et parfois, pour des raisons qui leur sont propres, certains d'entre eux se sont assurés d'avoir une descendance parmi les hommes ou les elfes. Cet héritage peut sommeiller durant plusieurs générations et ressurgir sans explication, mais, aussi lointain qu'il soit, lorsque le sang du dragon se révèle, sa magie reste toujours aussi puissante.\n\nASCENDANCE DÉMONIAQUE\nIl est possible de décliner cette voie avec d'autres types d'ascendance, par exemple, ascendance démoniaque. Dans ce cas, la résistance du rang 4 s'applique au choix à l'acide ou au feu. Le souffle du dragon est remplacé par la capacité de couvrir son arme d'acide ou de l'enflammer pour infliger +1d4° DM supplémentaire par attaque pendant [rang] rounds. Au rang 8, l'armure naturelle se traduit par des caractéristiques démoniaques (cornes, queue, pupilles verticales, etc.) et la résistance aux armes qui ne sont pas bénies contre les démons.",
    sourcePage: 131,
  },
  {
    id: 'prestige-familier-fantastique',
    nom: 'Voie du familier fantastique',
    type: 'prestige',
    categorie: 'generique',
    prerequis:
      "Cette voie est accessible à tout personnage qui s'est attaché les services d'un familier. Le MJ peut aussi souhaiter organiser la rencontre du héros avec son compagnon lors de l'aventure suivante, dès lors que le joueur a investi les points pour faire l'acquisition du rang 1 de la voie. Chaque familier apporte des pouvoirs magiques à son maître. Le personnage obtient 4 PV par niveau.",
    capaciteIds: [
      'prestige-familier-fantastique-r3',
      'prestige-familier-fantastique-r4',
      'prestige-familier-fantastique-r5',
      'prestige-familier-fantastique-r6',
      'prestige-familier-fantastique-r7',
    ],
    note: "Cette voie permet à n'importe quel héros de faire l'acquisition d'un compagnon original qui apporte quelques pouvoirs particuliers. Au fond, avoir un petit compagnon, c'est bon pour le moral.\n\nCapacité Familier : si le personnage possède déjà la capacité Familier, le familier fantastique peut être une nouvelle créature (pseudo-dragon, lézard voltaïque, fée, etc.) qui remplace l'ancienne ou une évolution du familier précédent (chat ailé, rat mort-vivant, etc.). Les avantages de la capacité Familier s'appliquent désormais au Familier fantastique (+2 Init. et DEF lorsque le familier est en vue). La capacité reste un sort : le Familier fantastique disparaît dans un nuage de fumée s'il est réduit à 0 PV, mais le maître peut l'invoquer à nouveau dès qu'il aura terminé une récupération complète.\nPas de capacité Familier : dans ce cas, la capacité n'est pas un sort. Si le familier est réduit à 0 PV, il s'enfuit aussi loin que possible, s'il le peut, et ne reviendra qu'après la prochaine récupération complète prise par le personnage. Si la fuite est impossible, il tombe au sol, inconscient. Si sa mort est inéluctable, le personnage pourra récupérer un nouveau familier au niveau suivant.\n\nLa liste détaillée des créatures (Les familiers fantastiques, p. 133-136 : animal céleste, animal mort-vivant, araignée géante, diablotin, dragon féérique, fée ou lutin, grig, lézard voltaïque, minimoï, pantin ou poupée, pseudo-dragon, stique) n'est pas reproduite ici — extraction réservée à un autre lot. TODO(extraction) : p. 133-136 — stat blocks et pouvoirs détaillés des familiers fantastiques.",
    sourcePage: 132,
  },

  // ----- Voies d'aventurier (p. 137-145) -----
  {
    id: 'prestige-archer-arcanique',
    nom: "Voie de l'archer arcanique",
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-archer-arcanique-r4',
      'prestige-archer-arcanique-r5',
      'prestige-archer-arcanique-r6',
      'prestige-archer-arcanique-r7',
      'prestige-archer-arcanique-r8',
    ],
    note: "La magie mystérieuse et terrible de cette voie de prestige fait de votre archer ou de votre arbalétrier un chasseur implacable dont les traits deviennent mortels et impossibles à esquiver.\nLes capacités issues de cette voie peuvent être déclinées pour un arc ou pour une arbalète.",
    sourcePage: 137,
  },
  {
    id: 'prestige-espion',
    nom: "Voie de l'espion",
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-espion-r4',
      'prestige-espion-r5',
      'prestige-espion-r6',
      'prestige-espion-r7',
      'prestige-espion-r8',
    ],
    note: "Tout savoir, écouter aux portes ou se faufiler dans une foule, le métier d'espion est riche en moments de tension et en jeux de pouvoir…",
    sourcePage: 138,
  },
  {
    id: 'prestige-casse-cou',
    nom: 'Voie du casse-cou',
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-casse-cou-r4',
      'prestige-casse-cou-r5',
      'prestige-casse-cou-r6',
      'prestige-casse-cou-r7',
      'prestige-casse-cou-r8',
    ],
    note: 'Avec cette voie, votre personnage sera toujours partant pour tenter les actions les plus risquées !',
    sourcePage: 138,
  },
  {
    id: 'prestige-ombres',
    nom: 'Voie des ombres',
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-ombres-r4',
      'prestige-ombres-r5',
      'prestige-ombres-r6',
      'prestige-ombres-r7',
      'prestige-ombres-r8',
    ],
    note: "Le maître des ombres est un adversaire redoutable, capable de s'infiltrer n'importe où, de surgir en un instant et de disparaître tout aussi vite. Il est de l'étoffe dont on fait les histoires pour faire peur aux enfants.",
    sourcePage: 139,
  },
  {
    id: 'prestige-chasseur-de-prime',
    nom: 'Voie du chasseur de prime',
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-chasseur-de-prime-r4',
      'prestige-chasseur-de-prime-r5',
      'prestige-chasseur-de-prime-r6',
      'prestige-chasseur-de-prime-r7',
      'prestige-chasseur-de-prime-r8',
    ],
    note: "Le chasseur de prime est un traqueur implacable et nul ne peut l'arrêter lorsqu'il a choisi sa cible.",
    sourcePage: 140,
  },
  {
    id: 'prestige-duelliste',
    nom: 'Voie du duelliste',
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-duelliste-r4',
      'prestige-duelliste-r5',
      'prestige-duelliste-r6',
      'prestige-duelliste-r7',
      'prestige-duelliste-r8',
    ],
    note: "Jetez votre gant, provoquez en duel ce fat qui a manqué de courtoisie, montrez votre valeur face au comte de Perthuis… Les adeptes du bel art de l'escrime aiment à se défier et à se mesurer à leur adversaire seul à seul.",
    sourcePage: 140,
  },
  {
    id: 'prestige-flibustier',
    nom: 'Voie du flibustier',
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-flibustier-r4',
      'prestige-flibustier-r5',
      'prestige-flibustier-r6',
      'prestige-flibustier-r7',
      'prestige-flibustier-r8',
    ],
    note: 'Pirate, corsaire ou bandit des mers, le flibustier est un combattant impitoyable qui sait faire parler la poudre autant que le sabre.',
    sourcePage: 141,
  },
  {
    id: 'prestige-heros',
    nom: 'Voie du héros',
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-heros-r4',
      'prestige-heros-r5',
      'prestige-heros-r6',
      'prestige-heros-r7',
      'prestige-heros-r8',
    ],
    note: 'Cette voie est destinée aux héros, aux vrais, ceux qui ne reculent jamais et défient la mort avec un sourire provocateur !',
    sourcePage: 142,
  },
  {
    id: 'prestige-maitre-des-poisons',
    nom: 'Voie du maître des poisons',
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-maitre-des-poisons-r4',
      'prestige-maitre-des-poisons-r5',
      'prestige-maitre-des-poisons-r6',
      'prestige-maitre-des-poisons-r7',
      'prestige-maitre-des-poisons-r8',
    ],
    note: "Le poison est l'arme des lâches dit-on parfois. Il faut être un âne habillé de métal pour se persuader de telles sornettes ; pour vous, c'est une arme efficace réservée à une élite d'individus intelligents et sans scrupules…",
    sourcePage: 143,
  },
  {
    id: 'prestige-pacte-feerique',
    nom: 'Voie du pacte féérique',
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-pacte-feerique-r4',
      'prestige-pacte-feerique-r5',
      'prestige-pacte-feerique-r6',
      'prestige-pacte-feerique-r7',
      'prestige-pacte-feerique-r8',
    ],
    note: "Vous avez toujours eu une affinité avec la nature, la forêt et les animaux. Vous avez passé un pacte avec les êtres de la forêt et juré de les protéger.\n\nÊTRE FÉÉRIQUE — TAILLE [non précisée]\n| AGI +4* | CON* +1 | FOR -4 | PER +2 | CHA +2 | INT +0 | VOL +2 |\nDéfense [12 + rang] · Points de vigueur [Niveau × 2] · Initiative 14\nAttaque au contact [dague] ou à distance [arc] = [attaque magique du PJ] · DM 1d4° (ce sont des DM de poison). Un être féérique peut se rendre invisible au prix d'une action limitée. Fée : vol 15 m par action de mouvement. Farfadet : téléportation de 15 m en action de mouvement. Grig (un être au corps de cricket) : bonds de 15 m en action de mouvement.",
    sourcePage: 143,
  },
  {
    id: 'prestige-touche-a-tout',
    nom: 'Voie du touche à tout',
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-touche-a-tout-r4',
      'prestige-touche-a-tout-r5',
      'prestige-touche-a-tout-r6',
      'prestige-touche-a-tout-r7',
      'prestige-touche-a-tout-r8',
    ],
    note: "Cette voie est destinée à celui qui recherche la polyvalence ultime et veut profiter d'une liberté totale dans le choix de ses capacités.",
    sourcePage: 144,
  },
  {
    id: 'prestige-tueur-a-gages',
    nom: 'Voie du tueur à gages',
    type: 'prestige',
    categorie: 'aventurier',
    prerequis: '',
    capaciteIds: [
      'prestige-tueur-a-gages-r4',
      'prestige-tueur-a-gages-r5',
      'prestige-tueur-a-gages-r6',
      'prestige-tueur-a-gages-r7',
      'prestige-tueur-a-gages-r8',
    ],
    note: 'Une voie pour faire le sale boulot, tout simplement.',
    sourcePage: 144,
  },
];

export const capacitesPrestige1: Capacite[] = [
  // ===== Voie de l'expert (p. 129) =====
  {
    id: 'prestige-expert-r4',
    nom: 'Capacité de néophyte',
    voieId: 'prestige-expert',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Choisissez une capacité de rang 1 de n'importe quelle voie issue d'un profil de votre famille.",
    sourcePage: 129,
  },
  {
    id: 'prestige-expert-r5',
    nom: "Capacité d'initié",
    voieId: 'prestige-expert',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Choisissez une capacité de rang 2 de n'importe quelle voie issue d'un profil de votre famille.",
    sourcePage: 129,
  },
  {
    id: 'prestige-expert-r6',
    nom: 'Capacité de professionnel',
    voieId: 'prestige-expert',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "Choisissez une capacité de rang 3 de n'importe quelle voie issue d'un profil de votre famille.",
    sourcePage: 129,
  },
  {
    id: 'prestige-expert-r7',
    nom: "Capacité d'expert",
    voieId: 'prestige-expert',
    rang: 7,
    estSort: false,
    typesAction: [],
    texte:
      "Choisissez une capacité de rang 4 de n'importe quelle voie issue d'un profil de votre famille.",
    sourcePage: 129,
  },
  {
    id: 'prestige-expert-r8',
    nom: 'Capacité de maître',
    voieId: 'prestige-expert',
    rang: 8,
    estSort: false,
    typesAction: [],
    texte:
      "Choisissez une capacité de rang 5 de n'importe quelle voie issue d'un profil de votre famille.\nAttention : chacune des capacités choisies doit provenir d'une voie différente de la même famille de profils.",
    sourcePage: 129,
  },

  // ===== Voie du spécialiste (p. 129) =====
  {
    id: 'prestige-specialiste-r4',
    nom: 'Expertise',
    voieId: 'prestige-specialiste',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Lorsqu'il acquiert cette capacité, le personnage peut choisir entre deux propositions. Soit il gagne un bonus de +1 en attaque lorsqu'il utilise une capacité à définir. Soit il obtient un bonus de +5 sur une compétence acquise par une capacité (par exemple, discrétion).",
    sourcePage: 129,
  },
  {
    id: 'prestige-specialiste-r5',
    nom: 'Capacité fabuleuse',
    voieId: 'prestige-specialiste',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Le joueur choisit une capacité limitée que son personnage connaît. Désormais, il lui suffit d'une action d'attaque pour l'utiliser. S'il s'agit d'un sort (*), il peut choisir un sort en action d'attaque (A) et bénéficier de la concentration (L) sur ce sort sans prendre une action limitée.",
    sourcePage: 129,
  },
  {
    id: 'prestige-specialiste-r6',
    nom: 'Caractéristique fabuleuse',
    voieId: 'prestige-specialiste',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "Le joueur augmente d'un point la valeur de la plus haute caractéristique de son personnage. De plus, lorsqu'il obtient un résultat de 1 sur un test sur cette caractéristique, il peut relancer le dé une fois (il garde le nouveau résultat).",
    sourcePage: 129,
  },
  {
    id: 'prestige-specialiste-r7',
    nom: 'Capacité supérieure',
    voieId: 'prestige-specialiste',
    rang: 7,
    estSort: false,
    typesAction: [],
    texte:
      "Le joueur choisit une capacité que connaît son personnage. Lorsqu'il utilise cette capacité, il ajoute +1d4° aux DM produits une fois par round (sur une seule attaque si la capacité permet plusieurs attaques).",
    sourcePage: 129,
  },
  {
    id: 'prestige-specialiste-r8',
    nom: 'Capacité signature',
    voieId: 'prestige-specialiste',
    rang: 8,
    estSort: false,
    typesAction: [],
    texte:
      "Le joueur choisit une capacité (A), (M) ou (L) que connaît son personnage. Une fois par combat, il peut utiliser cette capacité en plus de ses actions normales à son tour (sauf s'il est surpris), sans dépasser les limitations normalement imposées par la capacité (par exemple, une seule fois par round, ou une seule fois par combat, etc.). Si la capacité est un sort, il doit payer le coût normal de points de mana.",
    sourcePage: 129,
  },

  // ===== Voie du lycanthrope (p. 130) =====
  {
    id: 'prestige-lycanthrope-r4',
    nom: 'Forme hybride',
    voieId: 'prestige-lycanthrope',
    rang: 4,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Au prix d'une action limitée, le personnage peut se transformer en forme hybride, mi-homme, mi-loup pendant 1 min. Il doit terminer une récupération rapide avant de pouvoir à nouveau utiliser cette capacité. Sous cette forme, il ne peut pas lancer de sort ou utiliser d'arme pour attaquer à distance, en revanche il obtient une attaque de morsure (Attaque au contact) qui inflige [1d4°+FOR] DM en action gratuite une fois par round. Il reprend immédiatement sa forme normale s'il tombe à 0 PV.",
    sourcePage: 130,
  },
  {
    id: 'prestige-lycanthrope-r5',
    nom: 'Transformation en loup',
    voieId: 'prestige-lycanthrope',
    rang: 5,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le personnage peut prendre la forme d'un loup pendant une durée maximale de 1 h par rang chaque jour. Le personnage conserve toutes ses caractéristiques sauf celles ci-dessous, ainsi que sa valeur d'attaque au contact habituelle.\n\nLOUP\n| FOR +3 | AGI +1 |\nDéfense [12 + rang] · Initiative 15\nDM 1d4+3\nBonus de +5 aux tests basés sur la PER. Sous cette forme, il réduit de 5 les DM qui lui sont infligés par des armes qui ne sont pas en argent, et il gagne un bonus de +5 à tous les tests de poursuite et pour pister une trace.",
    sourcePage: 130,
  },
  {
    id: 'prestige-lycanthrope-r6',
    nom: 'Éventration',
    voieId: 'prestige-lycanthrope',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "Désormais, lorsqu'il obtient 15-20 sur son attaque de morsure, le lycanthrope ajoute 1d4° aux DM de sa morsure (sous forme de loup ou d'hybride).",
    sourcePage: 131,
  },
  {
    id: 'prestige-lycanthrope-r7',
    nom: 'Résistance surnaturelle',
    voieId: 'prestige-lycanthrope',
    rang: 7,
    estSort: false,
    typesAction: [],
    texte:
      "Désormais le lycanthrope réduit de 5 tous les DM qui lui sont infligés par des armes qui ne sont pas en argent lorsqu'il est sous forme hybride. Cette réduction des DM ne peut pas être cumulée à une autre forme de RD.",
    sourcePage: 131,
  },
  {
    id: 'prestige-lycanthrope-r8',
    nom: 'Forme puissante',
    voieId: 'prestige-lycanthrope',
    rang: 8,
    estSort: false,
    typesAction: [],
    texte:
      "Le lycanthrope augmente sa FOR de +2 lorsqu'il est sous forme de loup ou d'hybride (il gagne +2 en attaque au contact et aux DM sur toutes ses attaques basées sur la force).",
    sourcePage: 131,
  },

  // ===== Voie du sang-dragon (p. 131) =====
  {
    id: 'prestige-sang-dragon-r4',
    nom: 'Ascendance draconique',
    voieId: 'prestige-sang-dragon',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Choisissez une couleur de dragon pour l'ascendance de votre personnage. Il obtient une réduction des DM de 5 (qui passe à 10 au rang 8 de la voie), correspondant au type d'énergie utilisé par le souffle du dragon. De plus, le personnage devient capable de voir dans le noir total comme si c'était de la pénombre jusqu'à 20 m.",
    sourcePage: 131,
  },
  {
    id: 'prestige-sang-dragon-r5',
    nom: 'Griffes du dragon',
    voieId: 'prestige-sang-dragon',
    rang: 5,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Une fois par combat, le personnage voit ses muscles se développer de façon spectaculaire pendant [rang] rounds tandis que des griffes poussent subitement au bout de ses doigts. Pendant toute la durée de la transformation, il obtient un bonus de +2 en FOR (attaque et DM) et une attaque de contact de griffes par round en action gratuite (G) infligeant [1d6°+FOR] DM.",
    sourcePage: 131,
  },
  {
    id: 'prestige-sang-dragon-r6',
    nom: 'Souffle du dragon',
    voieId: 'prestige-sang-dragon',
    rang: 6,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Une fois par combat, le personnage peut produire un souffle létal correspondant à son ascendance. Ce souffle couvre une zone conique de 5 m de long sur 5 m de large à son extrémité et inflige 5d4° DM. Les victimes peuvent diviser les DM par 2 à condition de réussir un test d'AGI difficulté [8 + rang].",
    sourcePage: 131,
  },
  {
    id: 'prestige-sang-dragon-r7',
    nom: 'Ailes de dragon',
    voieId: 'prestige-sang-dragon',
    rang: 7,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Une fois par combat, le personnage déploie des ailes de dragon pendant CON minutes (minimum 1 min). Ces ailes lui permettent de se déplacer en vol à une vitesse de 15 m par action de mouvement. Faire du surplace est une action de mouvement.",
    sourcePage: 132,
  },
  {
    id: 'prestige-sang-dragon-r8',
    nom: 'Écailles de dragon',
    voieId: 'prestige-sang-dragon',
    rang: 8,
    estSort: false,
    typesAction: [],
    texte:
      "Le corps du personnage se renforce et se couvre d'écailles lorsqu'il reçoit des blessures graves. Lorsque le personnage passe sous la moitié de ses PV, il gagne une réduction des DM de 5 face à tous les types de dommages.",
    sourcePage: 132,
  },

  // ===== Voie du familier fantastique (p. 132) =====
  {
    id: 'prestige-familier-fantastique-r3',
    nom: 'Familier fantastique',
    voieId: 'prestige-familier-fantastique',
    rang: 3,
    estSort: false,
    typesAction: ['A'],
    texte:
      "Le personnage fait l'acquisition d'un familier fantastique. Le familier récupère tous les PV perdus après une récupération rapide.\n\nFAMILIER — TAILLE MINUSCULE\n| AGI +3* | CON +2 | FOR -4 | PER +2 | CHA -2 | INT +1 | VOL +2 |\nDéfense [14 + rang dans la voie] · Points de vigueur [niv. du personnage × 2] · Initiative [Init. du personnage]\nLe personnage peut utiliser les sens de son familier (voir par ses yeux, entendre ce qu'il entend, etc.) et communiquer avec lui à distance illimitée. Vous trouverez les caractéristiques spéciales de ces créatures plus loin.",
    sourcePage: 132,
  },
  {
    id: 'prestige-familier-fantastique-r4',
    nom: 'Pouvoir mineur',
    voieId: 'prestige-familier-fantastique',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Le familier confère au personnage un pouvoir magique indiqué dans sa description.",
    sourcePage: 133,
  },
  {
    id: 'prestige-familier-fantastique-r5',
    nom: 'Résistance',
    voieId: 'prestige-familier-fantastique',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Le familier transmet une RD de 1 par rang de la voie à tous les types de DM. De plus, il fait apprendre un ou deux choix d'un profil indiqué dans la description du familier. Il peut utiliser ce sort deux fois par jour dans le cas d'un rang 1 (une seule fois dans le cas d'un rang 2).",
    sourcePage: 133,
  },
  {
    id: 'prestige-familier-fantastique-r6',
    nom: 'Inséparables',
    voieId: 'prestige-familier-fantastique',
    rang: 6,
    estSort: false,
    typesAction: ['M'],
    texte:
      "Le personnage rappelle son familier à son contact par magie. Le familier est téléporté sur son maître au prix d'une action de mouvement. De plus le familier confère au personnage 1 PC supplémentaire.",
    sourcePage: 133,
  },
  {
    id: 'prestige-familier-fantastique-r7',
    nom: 'Pouvoir supérieur',
    voieId: 'prestige-familier-fantastique',
    rang: 7,
    estSort: false,
    typesAction: [],
    texte:
      "Le familier confère au personnage un second pouvoir magique indiqué dans sa description, ainsi qu'un bonus de +1 sur la valeur de caractéristique indiquée dans la description du familier.",
    sourcePage: 133,
  },

  // ===== Voie de l'archer arcanique (p. 137) =====
  {
    id: 'prestige-archer-arcanique-r4',
    nom: 'Flèche magique',
    voieId: 'prestige-archer-arcanique',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage enchante ses flèches. S'il obtient un résultat de 1 sur son dé de DM, il remplace ce résultat par le maximum du dé (exemple, 1 sur le d8 devient 8). Cet effet ne s'applique pas aux dés bonus. Les DM de ses flèches sont considérés comme magiques.",
    sourcePage: 137,
  },
  {
    id: 'prestige-archer-arcanique-r5',
    nom: 'Flèche intangible',
    voieId: 'prestige-archer-arcanique',
    rang: 5,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le personnage enchante sa flèche pour lui permettre de passer au travers des obstacles physiques et des protections. Le joueur réalise un test d'attaque normal, mais remplace la DEF par 10 + AGI de la cible pour fixer sa difficulté. De surcroît, il ignore toutes les pénalités de couverture. S'il sait précisément où se situe sa cible, il peut même tirer à travers un mur ou une porte.",
    sourcePage: 137,
  },
  {
    id: 'prestige-archer-arcanique-r6',
    nom: 'Flèche chercheuse',
    voieId: 'prestige-archer-arcanique',
    rang: 6,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Une fois par jour, l'archer arcanique peut enchanter une flèche afin qu'elle trouve sa cible de façon infaillible. Pour utiliser ce pouvoir, l'archer arcanique doit avoir blessé ou vu directement la créature ciblée moins de 10 rounds (1 min) plus tôt. Il tire ensuite sa flèche en l'air et celle-ci voyage aussi loin que nécessaire (y compris à travers les plans) pour trouver sa cible. L'archer arcanique fait un test d'attaque normal et obtient un bonus de +2d4° aux DM.",
    sourcePage: 137,
  },
  {
    id: 'prestige-archer-arcanique-r7',
    nom: 'Flèche élémentaire',
    voieId: 'prestige-archer-arcanique',
    rang: 7,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Une fois par combat, le personnage enchante ses flèches et choisit une source de DM parmi poison, feu, froid, foudre et acide. Pendant tout le combat, il ajoute +1d4° aux DM de chacune des flèches qu'il tire. Ce bonus aux DM ne peut pas se cumuler à un autre bonus magique élémentaire (arc de feu, sort élémentaire, etc.).",
    sourcePage: 137,
  },
  {
    id: 'prestige-archer-arcanique-r8',
    nom: 'Flèche tueuse',
    voieId: 'prestige-archer-arcanique',
    rang: 8,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le personnage fabrique et enchante une flèche particulière pour un ennemi unique dont il possède une relique (morceau de peau, griffe, poils, etc.). Il lui faut une journée complète pour créer la flèche et il ne peut en posséder plus d'une à un moment donné (ni pour la même cible ni pour une autre). Lorsqu'il utilise sa flèche contre l'ennemi désigné, il touche automatiquement. Si la cible est d'un niveau inférieur au sien, elle est immédiatement réduite à 0 PV, sinon elle a droit à un test de CON difficulté [10 + rang]. En cas de réussite, la flèche est tout de même un critique automatique.",
    sourcePage: 137,
  },

  // ===== Voie de l'espion (p. 138) =====
  {
    id: 'prestige-espion-r4',
    nom: "Secrets d'alcôves",
    voieId: 'prestige-espion',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage obtient un bonus de +5 pour tous les tests visant à trouver ou obtenir des informations secrètes ou sensibles, et +5 à tous les tests de perception auditive (PER). De plus, il est capable de suivre une conversation en lisant sur les lèvres en réussissant un test de PER dont la difficulté est égale à la distance entre sa cible et lui en mètres. Il obtient un bonus égal à son rang pour ce test.",
    sourcePage: 138,
  },
  {
    id: 'prestige-espion-r5',
    nom: 'À la garde',
    voieId: 'prestige-espion',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage développe un sixième sens qui lui assure un coup d'avance sur les gardes et autres forces adverses. Le MJ doit prévenir le joueur 1d4 rounds complets avant que des PNJ n'interviennent sur le lieu où il opère. Il doit aussi indiquer la direction d'où provient la menace. Cette capacité n'est d'aucune utilité contre une embuscade (des adversaire cachés et préparés à l'arrivée des PJ).",
    sourcePage: 138,
  },
  {
    id: 'prestige-espion-r6',
    nom: 'Mémoire eidétique',
    voieId: 'prestige-espion',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage a une parfaite mémoire de tout ce qu'il a vu et entendu. Si le joueur le demande, le MJ doit lui rappeler tous les détails relatifs à un lieu qu'il a visité ou à une conversation qu'il a entendue. De plus, le personnage gagne un bonus de +5 à tous ses tests de connaissance (INT) et de recherche d'indice basé sur l'INT.",
    sourcePage: 138,
  },
  {
    id: 'prestige-espion-r7',
    nom: 'Caméléon',
    voieId: 'prestige-espion',
    rang: 7,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage peut repérer des lieux, suivre des gens, infiltrer des endroits réservés (avec le costume adapté) sans aucun jet de dé tant qu'il n'entreprend aucune action qui pourrait sérieusement attirer l'attention sur lui. Au prix d'une action de mouvement et en réussissant un test de CHA difficulté 10, il disparaît dans une foule et échappe à d'éventuels poursuivants. Autrement, s'il attaque au round suivant, il obtient un dé bonus et peut effectuer une Attaque sournoise s'il dispose de cette capacité. La difficulté du test de CHA initial peut être modulée selon la densité de la foule.",
    sourcePage: 138,
  },
  {
    id: 'prestige-espion-r8',
    nom: 'Réseau',
    voieId: 'prestige-espion',
    rang: 8,
    estSort: false,
    typesAction: [],
    texte:
      "Grâce à son réseau de connaissances ou par l'intermédiaire d'autres espions, le personnage peut obtenir de nombreux avantages. Un test réussi de CHA difficulté 10 lui suffit pour obtenir une entrevue avec n'importe quel personnage puissant à tout moment. Une fois par aventure, cela lui permet d'obtenir un service, par exemple une lettre de recommandation, un renseignement réservé à l'élite, des billets pour un bal privé ou même une escorte armée pour l'aider à se rendre dans un endroit dangereux.",
    sourcePage: 138,
  },

  // ===== Voie du casse-cou (p. 138) =====
  {
    id: 'prestige-casse-cou-r4',
    nom: 'Au pied du mur',
    voieId: 'prestige-casse-cou',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Lorsque le personnage possède un nombre de PV inférieur ou égal à son niveau, il gagne un dé bonus à tous ses tests (attaque, caractéristique, etc.).",
    sourcePage: 138,
  },
  {
    id: 'prestige-casse-cou-r5',
    nom: 'Mouche du coche',
    voieId: 'prestige-casse-cou',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage est toujours en mouvement, il gagne +1 en DEF, puis +1 supplémentaire au rang 7. De plus, s'il sacrifie une action de mouvement, il gagne +2 en DEF supplémentaire jusqu'à son prochain tour.",
    sourcePage: 139,
  },
  {
    id: 'prestige-casse-cou-r6',
    nom: "L'amour du risque",
    voieId: 'prestige-casse-cou',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "Rien de tel qu'une question de vie ou de mort pour vous motiver ! Lorsqu'il réalise une action dans un lieu dangereux (par exemple, au bord d'un précipice ou d'un lac de lave), le personnage gagne un dé bonus à tous ses tests (attaque, caractéristique, etc.). Ce bonus s'applique également aux tests réalisés pour résister à la peur (permanent).",
    sourcePage: 139,
  },
  {
    id: 'prestige-casse-cou-r7',
    nom: "Poussée d'adrénaline",
    voieId: 'prestige-casse-cou',
    rang: 7,
    estSort: false,
    typesAction: [],
    texte:
      "Une fois par round, en dépensant 1d4 PV, le personnage gagne une action de mouvement supplémentaire à son tour.",
    sourcePage: 139,
  },
  {
    id: 'prestige-casse-cou-r8',
    nom: 'Attaque kamikaze',
    voieId: 'prestige-casse-cou',
    rang: 8,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le personnage saute sur sa cible et l'agrippe pour la larder de coups au corps à corps. La cible doit être de taille supérieure à la sienne. Le personnage réalise un test opposé d'AGI contre la créature. En cas d'échec, le personnage se retrouve renversé. En cas de réussite, il est perché sur la créature ce qui lui offre les bonus suivants selon la taille de la cible :\nGrande : +2 Att et DEF, +1d4° DM\nÉnorme : +3 Att et DEF, +1d4° DM\nColossale : +4 Att et DEF, +1d4° DM\nPour se débarrasser de lui, la créature doit utiliser une action d'attaque et l'emporter lors d'un test opposé d'AGI.",
    sourcePage: 139,
  },

  // ===== Voie des ombres (p. 139) =====
  {
    id: 'prestige-ombres-r4',
    nom: 'Vision des ombres',
    voieId: 'prestige-ombres',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage tisse un lien avec le demi-plan des ombres. Ses yeux deviennent violets et, désormais, il voit dans le noir même total comme s'il s'agissait de pénombre. Lorsqu'il est dans la pénombre (mais pas dans le noir), il obtient un bonus de +5 à ses tests de discrétion et de PER basés sur la vue, et il ne souffre d'aucune pénalité en attaque.",
    sourcePage: 139,
  },
  {
    id: 'prestige-ombres-r5',
    nom: 'Caméléon',
    voieId: 'prestige-ombres',
    rang: 5,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Tant que le personnage reste immobile, il est totalement invisible.",
    sourcePage: 139,
  },
  {
    id: 'prestige-ombres-r6',
    nom: 'Ombre mouvante',
    voieId: 'prestige-ombres',
    rang: 6,
    estSort: false,
    typesAction: ['M'],
    texte:
      "Une fois par combat, le personnage peut disparaître dans les ombres et ne réapparaître qu'au début de son prochain tour. Aucun adversaire ne peut l'attaquer pendant qu'il a disparu dans les ombres, mais il peut subir des DM de zone. Le personnage réapparaît à une distance maximale de 20 m de sa position initiale. S'il attaque, il obtient un dé bonus et peut effectuer une Attaque sournoise s'il dispose de cette capacité.\n** Si le personnage connaît déjà la capacité Disparition grâce à la voie de l'assassin du voleur, il peut désormais l'utiliser aussi souvent qu'il le veut.",
    sourcePage: 139,
  },
  {
    id: 'prestige-ombres-r7',
    nom: "Cape d'ombre",
    voieId: 'prestige-ombres',
    rang: 7,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Une fois par jour, le personnage s'enveloppe d'ombre pendant CHA minutes. Il gagne un dé bonus à tous les tests de discrétion et impose un dé malus à tous les tests d'attaque à distance qui le prennent pour cible. S'il tombe à 0 PV pendant la durée de la capacité, il peut choisir de disparaître dans son ombre et de réapparaître à 1d6 km dans la direction de son choix avec 1d4° PV, 1d6 minutes plus tard.\n*** Si le personnage connaît déjà la capacité Manteau d'ombre grâce à la voie de la sombre magie de sorcier, il peut désormais l'utiliser une fois par combat.",
    sourcePage: 139,
  },
  {
    id: 'prestige-ombres-r8',
    nom: 'Passe-muraille',
    voieId: 'prestige-ombres',
    rang: 8,
    estSort: false,
    typesAction: [],
    texte:
      "Désormais lorsqu'il utilise la capacité ombre mouvante, le personnage peut passer à travers un mur ou un obstacle. Il doit toujours se fondre dans une ombre et réapparaître dans une autre.",
    sourcePage: 139,
  },

  // ===== Voie du chasseur de prime (p. 140) =====
  {
    id: 'prestige-chasseur-de-prime-r4',
    nom: 'Marque du chasseur',
    voieId: 'prestige-chasseur-de-prime',
    rang: 4,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le personnage désigne une proie soit en la voyant, soit en étant mandaté pour la traquer. Il obtient un bonus de +5 à tous les tests de compétence qu'il réalise pour la retrouver (pistage, renseignement, discrétion, etc.) et +1d4° aux DM contre elle. Le personnage doit attendre d'avoir terminé une récupération complète avant de changer de proie. Il ne peut marquer plus d'une proie à la fois.",
    sourcePage: 140,
  },
  {
    id: 'prestige-chasseur-de-prime-r5',
    nom: 'Assommer',
    voieId: 'prestige-chasseur-de-prime',
    rang: 5,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Sur un test d'attaque au contact réussi avec une arme contondante ou le pommeau d'une épée (dague, etc.), si la cible est de niveau (ou NC) inférieur au niveau du personnage et qu'elle porte la marque du chasseur, elle est assommée pour 1d4° min. Sinon, elle est étourdie pour un round. La cible ne peut subir cet effet qu'une seule fois par combat.",
    sourcePage: 140,
  },
  {
    id: 'prestige-chasseur-de-prime-r6',
    nom: 'Traqueur infatigable',
    voieId: 'prestige-chasseur-de-prime',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "Tant que vous traquez une créature que vous avez marquée, vous divisez par deux le temps nécessaire à une récupération (rapide ou complète). De plus, chaque jour durant lequel vous traquez la même proie, vous gagnez un bonus cumulatif de +1 en attaque et aux DM sur la première attaque que vous lui portez, pour un maximum égal à votre rang.",
    sourcePage: 140,
  },
  {
    id: 'prestige-chasseur-de-prime-r7',
    nom: 'Attaque invalidante',
    voieId: 'prestige-chasseur-de-prime',
    rang: 7,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Vous portez une attaque qui a pour but de saper la volonté et les forces de votre adversaire. En cas de réussite, en plus des DM habituels, l'attaque inflige un malus cumulatif de -1 à tous les tests et aux DM infligés par la cible pour le reste du combat, jusqu'à un cumul maximal de -3.",
    sourcePage: 140,
  },
  {
    id: 'prestige-chasseur-de-prime-r8',
    nom: 'Instinct du Traqueur',
    voieId: 'prestige-chasseur-de-prime',
    rang: 8,
    estSort: false,
    typesAction: ['L'],
    texte:
      "En se concentrant 1 min, le chasseur de prime peut déterminer dans quelle direction approximative se trouve la cible de sa marque du chasseur. Si la créature ciblée s'approche à moins de 50 m, le personnage en est averti par un frisson dans le dos ou les poils de la nuque qui se hérissent…",
    sourcePage: 140,
  },

  // ===== Voie du duelliste (p. 140) =====
  {
    id: 'prestige-duelliste-r4',
    nom: 'Vive attaque',
    voieId: 'prestige-duelliste',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Lorsqu'il utilise une dague, une épée courte, longue ou une rapière sur les attaques de sa main principale (ou encore sur une vivelame tenue à deux mains), le personnage peut ajouter son AGI en attaque au contact ou aux DM (au choix, mais pas les deux en même temps, sauf s'il dispose d'une autre capacité qui lui permet, par exemple attaque en finesse) au lieu de sa FOR.",
    sourcePage: 140,
  },
  {
    id: 'prestige-duelliste-r5',
    nom: 'Défi',
    voieId: 'prestige-duelliste',
    rang: 5,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Une fois par combat, le personnage peut défier une cible humanoïde de son choix (portée 20 m). Il obtient +1d6 aux DM de chaque attaque au contact pour le reste du combat contre cette cible. S'il attaque une autre cible, le défi prend fin.",
    sourcePage: 140,
  },
  {
    id: 'prestige-duelliste-r6',
    nom: 'Juste toi et moi',
    voieId: 'prestige-duelliste',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "À chaque round durant lequel il attaque la cible qu'il a défiée, le personnage obtient un bonus +2 en DEF contre toutes les attaques provenant d'autres adversaires.",
    sourcePage: 142,
  },
  {
    id: 'prestige-duelliste-r7',
    nom: 'Duel mental',
    voieId: 'prestige-duelliste',
    rang: 7,
    estSort: false,
    typesAction: [],
    texte:
      "Au début de son tour, le personnage peut faire un test opposé d'INT contre un adversaire qu'il a défié. S'il l'emporte, il obtient un dé bonus sur une attaque de son choix contre cet adversaire d'ici la fin du round (à annoncer avant de lancer le dé). Si l'adversaire l'emporte d'au moins 10 points, c'est lui qui bénéficie d'un dé bonus en attaque.",
    sourcePage: 142,
  },
  {
    id: 'prestige-duelliste-r8',
    nom: 'Botte mortelle',
    voieId: 'prestige-duelliste',
    rang: 8,
    estSort: false,
    typesAction: [],
    texte:
      "Chaque fois que le personnage réussit une attaque contre l'adversaire qu'il a défié, en plus des DM habituels, il gagne 1 point de préparation sur cette créature (ceci est une action gratuite). Au moment de son choix, il peut utiliser une action limitée pour exécuter sa botte mortelle. S'il réussit son attaque, il ajoute +1d4° DM par point de préparation. Il ne peut tenter qu'une seule botte mortelle par combat, les points sont dépensés que l'attaque soit un succès ou un échec.",
    sourcePage: 142,
  },

  // ===== Voie du flibustier (p. 141) =====
  {
    id: 'prestige-flibustier-r4',
    nom: 'Pied marin',
    voieId: 'prestige-flibustier',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage gagne un bonus de +5 sur tous les tests d'AGI réalisés sur un bateau ou sur d'autres supports mobiles (ce qui comprend les chariots, les cordages, les ponts de corde). Il ajoute son rang à tous les tests relatifs à la natation et à la navigation.",
    sourcePage: 141,
  },
  {
    id: 'prestige-flibustier-r5',
    nom: 'Coup de crosse',
    voieId: 'prestige-flibustier',
    rang: 5,
    estSort: false,
    typesAction: ['G'],
    texte:
      "Une fois par round, le personnage peut, au moment de son choix, accomplir une attaque au contact gratuite avec la crosse d'une pétoire qu'il tient en main. Il subit un dé malus pour le test d'attaque et inflige [1d4°+FOR] DM. Si ce n'est pas déjà le cas, il acquiert la maîtrise des armes à poudre.",
    sourcePage: 141,
  },
  {
    id: 'prestige-flibustier-r6',
    nom: "À l'abordage",
    voieId: 'prestige-flibustier',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage sait s'élancer vers ses ennemis et mettre du cœur dans sa première attaque au contact lors d'un combat. Cette première attaque bénéficie d'un dé bonus en attaque et de +1d4° aux DM. Il obtient aussi cet effet à chaque fois qu'il peut se précipiter sur un adversaire depuis un contre-haut (balcon, lustre, table, etc.).",
    sourcePage: 142,
  },
  {
    id: 'prestige-flibustier-r7',
    nom: 'Sabre au poing',
    voieId: 'prestige-flibustier',
    rang: 7,
    estSort: false,
    typesAction: ['A'],
    texte:
      "Au prix d'une action d'attaque, le personnage peut tirer avec une arme à poudre d'une main (même à bout portant sans malus) et porter une attaque de contact avec une seconde arme (tenue dans son autre main), sans pénalités.",
    sourcePage: 142,
  },
  {
    id: 'prestige-flibustier-r8',
    nom: 'Pas de quartier',
    voieId: 'prestige-flibustier',
    rang: 8,
    estSort: false,
    typesAction: ['G'],
    texte:
      "Pour le flibustier, il s'agit de vaincre ou mourir. Sa férocité est légendaire : il peut tenter une action d'attaque gratuite contre toute créature à son contact qui tente de s'éloigner de lui. Pour cette attaque, il obtient un dé bonus en attaque et +1d4° aux DM. Il obtient les mêmes bonus à toutes ses attaques lorsqu'il lui reste moins de [niveau] PV.",
    sourcePage: 142,
  },

  // ===== Voie du héros (p. 142) =====
  {
    id: 'prestige-heros-r4',
    nom: 'Destin héroïque',
    voieId: 'prestige-heros',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage gagne 1 PC. Il gagne un PC supplémentaire au rang 6 et un dernier au rang 8. De plus, une fois par combat, vous pouvez donner un bonus de +1d4° à un compagnon en vue sur un test de votre choix.",
    sourcePage: 142,
  },
  {
    id: 'prestige-heros-r5',
    nom: 'Homme/femme de la situation',
    voieId: 'prestige-heros',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Une fois par aventure, vous pouvez demander au MJ de vous donner une idée lumineuse ou de vous indiquer la moins mauvaise solution pour rattraper une situation ou limiter les dégâts.",
    sourcePage: 142,
  },
  {
    id: 'prestige-heros-r6',
    nom: 'Héros célèbre',
    voieId: 'prestige-heros',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "Votre réputation de héros vous précède et vous ouvre bien des portes. Vous obtenez un dé bonus à tous vos tests d'interaction sociale et on vous accueille partout à bras ouverts, même dans des cercles très fermés. Si vous avez besoin de quelque chose, les gens font tout leur possible pour vous le fournir. Choisissez entre « héros du peuple » et « héros du royaume » : vous gagnez ces avantages seulement dans le milieu correspondant (le peuple ou les dirigeants). À partir du rang 8, vous êtes à la fois le héros du peuple et celui du royaume !",
    sourcePage: 142,
  },
  {
    id: 'prestige-heros-r7',
    nom: 'Ténacité',
    voieId: 'prestige-heros',
    rang: 7,
    estSort: false,
    typesAction: [],
    texte:
      "Lorsque vous ratez un test d'attaque contre une créature, vous bénéficiez d'un dé bonus à votre prochain essai si vous utilisez la même action (même capacité). Ce bonus persiste tant que vous ratez, mais disparaît dès que l'attaque est réussie.",
    sourcePage: 142,
  },
  {
    id: 'prestige-heros-r8',
    nom: "Meneur d'hommes",
    voieId: 'prestige-heros',
    rang: 8,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Une fois par jour, le personnage peut haranguer ses compagnons, les motiver et les conseiller pour attaquer un adversaire particulier. Tous ses alliés bénéficient d'un dé bonus une fois par round pour toute la scène à venir (un combat, un bal ou une réception, une scène de meurtre à étudier, etc.).",
    sourcePage: 142,
  },

  // ===== Voie du maître des poisons (p. 143) =====
  {
    id: 'prestige-maitre-des-poisons-r4',
    nom: 'Connaissance du poison',
    voieId: 'prestige-maitre-des-poisons',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage peut effectuer un test d'INT difficulté 10 pour reconnaître, identifier ou détecter un poison. Il n'a plus besoin de test d'INT pour réussir à appliquer un poison sur une arme.",
    sourcePage: 143,
  },
  {
    id: 'prestige-maitre-des-poisons-r5',
    nom: 'Poison rapide',
    voieId: 'prestige-maitre-des-poisons',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage sait fabriquer du poison « rapide » en petite quantité. Avant chaque combat, ses armes (trois au maximum) sont enduites de ce poison. La première attaque réussie provoque 3d4° DM supplémentaires. Si la victime réussit un test de CON difficulté [10 + INT], elle ne subit que la moitié des DM.",
    sourcePage: 143,
  },
  {
    id: 'prestige-maitre-des-poisons-r6',
    nom: 'Poison affaiblissant',
    voieId: 'prestige-maitre-des-poisons',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "Le voleur peut remplacer le poison rapide par un poison affaiblissant, les effets ne sont appliqués que sur la première attaque réussie avec cette arme. Si la victime rate un test de CON difficulté 12, elle est affaiblie pour le reste du combat (voir états préjudiciables).",
    sourcePage: 143,
  },
  {
    id: 'prestige-maitre-des-poisons-r7',
    nom: 'Résistance au poison',
    voieId: 'prestige-maitre-des-poisons',
    rang: 7,
    estSort: false,
    typesAction: [],
    texte:
      "À force de manipuler les poisons, le personnage a développé des immunités. Lorsqu'il est empoisonné, faites un test de CON difficulté 10. En cas de succès, il ne subit aucun effet ; s'il rate, il subit la moitié des DM.",
    sourcePage: 143,
  },
  {
    id: 'prestige-maitre-des-poisons-r8',
    nom: 'Poisons virulents',
    voieId: 'prestige-maitre-des-poisons',
    rang: 8,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage sait fabriquer en petites quantités les poisons « lent » et « mortel » (voir page 238), il peut en utiliser [1 + INT] doses par jour (cumul des deux sortes de poisons). La difficulté de résistance à ces poisons est de [12 + INT].",
    sourcePage: 143,
  },

  // ===== Voie du pacte féérique (p. 143) =====
  {
    id: 'prestige-pacte-feerique-r4',
    nom: 'Amitié avec les animaux',
    voieId: 'prestige-pacte-feerique',
    rang: 4,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le personnage possède une affinité surnaturelle avec les animaux. Au prix d'une action limitée, il peut faire un test opposé d'attaque magique contre un animal ordinaire. S'il l'emporte, l'animal est apaisé et il peut lui ordonner de partir. Si l'animal possède un maître, le test d'attaque magique doit être réalisé à la fois contre l'animal et contre le maître. Cette capacité ne fonctionne pas contre les animaux magiques ou corrompus, mais elle affecte les animaux géants.",
    sourcePage: 143,
  },
  {
    id: 'prestige-pacte-feerique-r5',
    nom: 'Invisibilité',
    voieId: 'prestige-pacte-feerique',
    rang: 5,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le personnage apprend des fées la possibilité de laisser son image dans le royaume caché. Il se rend invisible pendant [1d6+CHA] minutes. Une fois qu'il est invisible, personne ne peut plus détecter sa présence ou lui porter d'attaque. Si le personnage attaque ou utilise une capacité limitée, il redevient visible. Le personnage doit terminer une récupération rapide avant de pouvoir à nouveau utiliser cette capacité.",
    sourcePage: 143,
  },
  {
    id: 'prestige-pacte-feerique-r6',
    nom: 'Compagnon féérique',
    voieId: 'prestige-pacte-feerique',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage a adopté (ou l'inverse ?) une fée, un farfadet ou un grig. Ce compagnon est affectueux, mais souvent blagueur et parfois irritant ! Il ne suit pas les ordres du PJ, mais il agit dans ce qu'il estime être l'intérêt du PJ et peut accepter différentes missions (messager, éclaireur, espion, etc.). Si le compagnon féérique est réduit à 0 PV, il disparaît dans le monde féérique et revient guéri au bout de 24 h.",
    sourcePage: 143,
  },
  {
    id: 'prestige-pacte-feerique-r7',
    nom: 'Pas brumeux',
    voieId: 'prestige-pacte-feerique',
    rang: 7,
    estSort: false,
    typesAction: ['M'],
    texte:
      "Une fois par round, le personnage peut utiliser une action de mouvement et sacrifier 1 PV pour faire un pas dans le monde féérique. Il en ressort à une distance de 20 m au maximum. Il peut franchir de cette façon n'importe quel obstacle (même un mur de force), mais il doit obligatoirement voir l'endroit où il va réapparaître.",
    sourcePage: 144,
  },
  {
    id: 'prestige-pacte-feerique-r8',
    nom: 'Pays des songes',
    voieId: 'prestige-pacte-feerique',
    rang: 8,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Une fois par jour, en milieu naturel, le personnage franchit un portail étrange (un cercle de champignons, l'entrée d'une grotte, entre les racines d'un arbre, etc.) et disparaît dans le monde féérique. Le portail disparaît à sa suite. Il en ressort 3d6 h plus tard au même endroit ou dans un rayon de 20 km avec ses PV à leur maximum.",
    sourcePage: 144,
  },

  // ===== Voie du touche à tout (p. 144) =====
  {
    id: 'prestige-touche-a-tout-r4',
    nom: "Domaine de l'aventure",
    voieId: 'prestige-touche-a-tout',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage choisit une capacité de rang 1 ou 2 issue d'une voie d'aventurier.",
    sourcePage: 144,
  },
  {
    id: 'prestige-touche-a-tout-r5',
    nom: 'Domaine de la guerre',
    voieId: 'prestige-touche-a-tout',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage choisit une capacité de rang 1 ou 2 issue d'une voie de combattant.",
    sourcePage: 144,
  },
  {
    id: 'prestige-touche-a-tout-r6',
    nom: 'Domaine du mystique',
    voieId: 'prestige-touche-a-tout',
    rang: 6,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage choisit une capacité de rang 1 ou 2 issue d'une voie de mystique. S'il s'agit d'un sort, il peut le lancer même si sa caractéristique de magie est égale à +0.",
    sourcePage: 144,
  },
  {
    id: 'prestige-touche-a-tout-r7',
    nom: 'Domaine de la magie',
    voieId: 'prestige-touche-a-tout',
    rang: 7,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage choisit une capacité de rang 1 ou 2 issue d'une voie de mage. S'il s'agit d'un sort, il peut le lancer même si sa caractéristique de magie est égale à +0.",
    sourcePage: 144,
  },
  {
    id: 'prestige-touche-a-tout-r8',
    nom: 'Ultra polyvalent',
    voieId: 'prestige-touche-a-tout',
    rang: 8,
    estSort: false,
    typesAction: [],
    texte:
      "Le personnage augmente la valeur de ses deux plus faibles caractéristiques de +1. En cas d'égalité, il choisit.",
    sourcePage: 144,
  },

  // ===== Voie du tueur à gages (p. 144) =====
  {
    id: 'prestige-tueur-a-gages-r4',
    nom: 'Faire taire',
    voieId: 'prestige-tueur-a-gages',
    rang: 4,
    estSort: false,
    typesAction: ['M'],
    texte:
      "En réussissant un test d'attaque au contact, le personnage porte une frappe sèche au larynx d'un adversaire humanoïde : il lui inflige 1d4° DM et la cible est rendue muette. À la fin de son tour à chaque round suivant, elle peut faire un test de CON difficulté [10 + rang] pour retrouver l'usage de la parole (et pouvoir appeler à l'aide, par exemple). Un lanceur de sort muet subit un dé malus à ses tests d'attaque magique (ou il peut choisir d'utiliser la magie discrète, règle de concentration).",
    sourcePage: 145,
  },
  {
    id: 'prestige-tueur-a-gages-r5',
    nom: 'Brise genou',
    voieId: 'prestige-tueur-a-gages',
    rang: 5,
    estSort: false,
    typesAction: ['M'],
    texte:
      "En réussissant un test d'attaque au contact, le personnage porte un coup puissant dans le genou d'une créature humanoïde. Il inflige 1d4° DM et la cible est invalide pour le reste du combat. Si la cible est d'un NC supérieur ou égal au rang atteint dans la voie, elle peut faire un test de CON difficulté [10 + rang] chaque round à la fin de son tour pour se débarrasser de cet effet (elle y est ensuite immunisée pour le reste du combat).",
    sourcePage: 145,
  },
  {
    id: 'prestige-tueur-a-gages-r6',
    nom: 'Ne me tourne pas le dos',
    voieId: 'prestige-tueur-a-gages',
    rang: 6,
    estSort: false,
    typesAction: ['G'],
    texte:
      "Une fois par round, si une créature quitte le contact du personnage**, le personnage peut lui porter une Attaque sournoise. S'il ne dispose pas de cette capacité, il ajoute tout de même +1d4° aux DM s'il réussit cette attaque.\n** Une cible peut battre en retraite prudemment, en utilisant une action limitée pour ne se déplacer que de l'équivalent d'une action de mouvement. Ce type de manœuvre n'est généralement utilisé que par ceux qui ont été témoins du destin de celui qui tourne le dos au PJ.",
    sourcePage: 145,
  },
  {
    id: 'prestige-tueur-a-gages-r7',
    nom: 'Égorger',
    voieId: 'prestige-tueur-a-gages',
    rang: 7,
    estSort: false,
    typesAction: ['A'],
    texte:
      "Si le personnage réussit une attaque contre une créature humanoïde surprise dont le NC est inférieur à 4, elle meurt immédiatement. Si le personnage connaît l'Attaque sournoise, le NC augmente de +1 par dé d'attaque sournoise. Sinon cette attaque inflige des DM normaux.",
    sourcePage: 145,
  },
  {
    id: 'prestige-tueur-a-gages-r8',
    nom: 'Un simple regard',
    voieId: 'prestige-tueur-a-gages',
    rang: 8,
    estSort: false,
    typesAction: ['G'],
    texte:
      "Le personnage a atteint le stade ou un simple regard suffit à dissuader son adversaire de tenter quelque chose. S'il réussit un test opposé d'attaque magique contre une ou plusieurs cibles humanoïdes à une portée de 10 m, elles renoncent à l'attaquer. En cas d'échec, il ne peut plus tenter cette capacité contre ces cibles durant ce combat. Si la cible est d'un NC supérieur au niveau du personnage, l'effet ne dure qu'un seul round. Le personnage obtient un dé bonus à toutes les tentatives d'intimidation ou de persuasion après l'utilisation réussie d'un simple regard. L'effet de la capacité cesse immédiatement s'il attaque la cible et il ne peut plus utiliser la capacité contre elle pour ce combat. Les créatures sans esprit ou d'une intelligence animale sont immunisées à cette capacité.",
    sourcePage: 145,
  },
];
