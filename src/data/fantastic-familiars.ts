/**
 * Les familiers fantastiques (PER-84) — encadré p. 133-136 du livre de base CO2.
 *
 * Ces 12 créatures sont les choix possibles de la voie de prestige du familier
 * fantastique (`prestige-familier-fantastique`, p. 132). Le stat-block de base
 * (taille minuscule) est porté par la capacité de RANG 3 de la voie ; chaque fiche
 * ci-dessous n'ajoute que les particularités du familier + les trois éléments
 * référencés par la voie :
 *   - R4 « Pouvoir mineur »   → `minorPower`
 *   - R5 « Résistance »       → `spellProfile` (profil dont on apprend un/deux sorts)
 *   - R7 « Pouvoir supérieur » → `superiorPower` (+ caractéristique du bonus de +1)
 *
 * Textes verbatim (décision PRD #3). Les capacités de profil CONFÉRÉES (Prescience,
 * Siphon des âmes, Foudre…) sont résolues vers un `featureId` réel (rendu en carte façon
 * capacité empruntée) dès que la voie de profil citée est peuplée — PER-74, les 12 familiers.
 * SEULE exception : « Exsangue » (Animal mort-vivant, R7) → la voie du sang de SORCIER n'est
 * pas peuplée dans les données → repli descriptif verbatim (pas de `featureId` ni d'`original`).
 * Les pouvoirs PROPRES au familier (Toile, Poison, Clone, Télépathie, transformation du diablotin)
 * ne sont pas des capacités de profil (pas de `featureId`) mais portent un descripteur `original`
 * → rendus en CARTE « pouvoir original » (titre + hexagones + corps enrichi), même gabarit que les cartes conférées.
 *
 * Source : CBHS_06_Chroniques_Oubliees_2_web_v2.pdf, p. 133-136.
 */

import type { FantasticFamiliar } from './schema';

export const fantasticFamiliars: FantasticFamiliar[] = [
  {
    id: 'familier-celeste',
    name: 'Animal céleste',
    pathId: 'prestige-familier-fantastique',
    description:
      "Un familier ordinaire auquel des ailes ont poussé. Celles-ci symbolisent son élévation spirituelle. Le familier obtient la faculté de parler et la capacité de voler sur une distance de 20 m par action de mouvement.",
    minorPower: {
      text: "Compréhension des langues (rang 4, voie du vagabond, barde), 1 fois par jour, seulement à l'oral, pas à l'écrit.",
      grants: {
        name: 'Compréhension des langues',
        rank: 4,
        pathName: 'voie du vagabond',
        profile: 'barde',
        usage: "1 fois par jour, seulement à l'oral, pas à l'écrit",
        // PER-74 : vagabond-r4 = « Compréhension des langues » (nom + rang confirmés).
        featureId: 'vagabond-r4',
      },
      usageLimit: { max: 1, reset: 'day' },
    },
    spellProfile: 'pretre',
    superiorPower: {
      text: 'Prescience (rang 5, voie de la divination, ensorceleur), une fois par jour.',
      grants: {
        name: 'Prescience',
        rank: 5,
        pathName: 'voie de la divination',
        profile: 'ensorceleur',
        usage: 'une fois par jour',
        // PER-74 : divination-r5 = « Prescience » (nom + rang confirmés).
        featureId: 'divination-r5',
      },
      abilityBonus: 'CHA',
      usageLimit: { max: 1, reset: 'day' },
    },
    sourcePage: 133,
  },
  {
    id: 'familier-mort-vivant',
    name: 'Animal mort-vivant',
    pathId: 'prestige-familier-fantastique',
    description:
      "Le personnage obtient la version morte-vivante d'un familier ordinaire (rat, chat, corbeau, etc.). Ce peut être un nouveau familier ou son ancien familier passé de vie à trépas et fidèle par-delà la mort. Le familier acquiert le type « non-vivant » et tous les avantages qui en découlent (voir les créatures). Il obtient une attaque qui draine la force vitale des créatures vivantes (attaque = attaque magique du personnage), l'attaque inflige 1d4° DM et permet au magicien ou au familier de récupérer 1 PV par attaque réussie.",
    minorPower: {
      text: "Le personnage obtient la capacité Siphon des âmes (rang 1, voie de la mort, sorcier). S'il possède déjà cette capacité, il double son effet.",
      grants: {
        name: 'Siphon des âmes',
        rank: 1,
        pathName: 'voie de la mort',
        profile: 'sorcier',
        // PER-74 : mort-r1 = « Siphon des âmes ». ACQUISITION PERMANENTE (le livre ne donne
        // aucune fréquence : « Le personnage obtient la capacité ») → pas d'`usageLimit`,
        // la carte s'affiche sans compteur d'usage.
        featureId: 'mort-r1',
      },
    },
    spellProfile: 'sorcier',
    superiorPower: {
      text: "Le personnage obtient la capacité Exsangue (rang 3, voie du sang de sorcier). S'il possède déjà cette capacité, le personnage ne subit plus de pénalité à ses tests lorsqu'il est à 0 PV.",
      grants: {
        name: 'Exsangue',
        rank: 3,
        pathName: 'voie du sang de sorcier',
        profile: 'sorcier',
      },
      abilityBonus: 'CON',
    },
    sourcePage: 133,
  },
  {
    id: 'araignee-geante',
    name: 'Araignée géante',
    pathId: 'prestige-familier-fantastique',
    description:
      "Une araignée de la taille d'un familier normal, c'est-à-dire un monstre d'environ 30 cm de diamètre pattes comprises ! L'araignée possède une attaque (attaque = attaque magique du personnage) qui inflige 1 DM et oblige la victime à faire un test de CON difficulté [10 + rang atteint dans la voie]. En cas d'échec, la cible subit 1d4° DM de poison. Elle est capable de grimper aux murs.",
    minorPower: {
      text: "Toile (L). Une fois par combat, le personnage peut projeter des toiles gluantes du bout de ses doigts sur une cible à une distance maximale de 5 m. Cette action lui demande la réussite d'un test d'attaque magique contre la DEF de la cible. La victime de cette attaque est immobilisée par la toile pour 1d6 rounds. À son tour, la victime peut tenter un test de FOR difficulté 12 pour se libérer par une action de mouvement (M). Une réussite lui restitue sa complète liberté d'action.",
      // PER-74 : pouvoir PROPRE au familier (aucune capacité de profil) → carte « pouvoir original ».
      original: {
        name: 'Toile',
        actionTypes: ['L'],
        richText:
          "Une fois par combat, le personnage peut projeter des toiles gluantes du bout de ses doigts sur une cible à une distance maximale de 5 m. Cette action lui demande la réussite d'un test d'attaque magique contre la DEF de la cible. La victime de cette attaque est immobilisée par la toile pour {1d6} rounds. À son tour, la victime peut tenter un test de FOR difficulté 12 pour se libérer par une action de mouvement (M). Une réussite lui restitue sa complète liberté d'action.",
      },
      usageLimit: { max: 1, reset: 'combat' },
    },
    spellProfile: 'sorcier',
    superiorPower: {
      text: "Poison. Une fois par round, une attaque que le personnage effectue avec une arme tranchante ou perforante inflige +1d4° DM supplémentaires de poison.",
      // PER-74 : pouvoir PROPRE. « Une fois par round » = rider permanent (pas une réserve chiffrée)
      // → pas d'`usageLimit`, la carte s'affiche sans compteur.
      original: {
        name: 'Poison',
        richText:
          "Une fois par round, une attaque que le personnage effectue avec une arme tranchante ou perforante inflige +{1d4°} DM supplémentaires de poison.",
      },
      abilityBonus: 'AGI',
    },
    sourcePage: 134,
  },
  {
    id: 'diablotin',
    name: 'Diablotin',
    pathId: 'prestige-familier-fantastique',
    description:
      "Cette créature a tout du démon miniature : ailes de chauve-souris, queue fourchue et surtout caractère pervers et cruel. Heureusement, le diablotin est aussi un couard et obéit à son maître dès lors que celui-ci se montre suffisamment persuasif… Ce qui ne l'empêche pas de passer son temps à lui suggérer les actions les plus dépravées possibles. Le diablotin vole à une vitesse de 10 m par action de mouvement et est doué de parole.",
    minorPower: {
      text: "Le diablotin devient capable de se transformer en animal (de taille très petite) de son choix (corbeau, chouette, serpent, chat, chien, singe ou même saumon). Cela lui demande une action de mouvement pour changer de forme. Une fois transformé, il acquiert tous les modes de locomotion de l'animal imité.",
      // PER-74 : pouvoir PROPRE au familier (le texte ne commence pas par un libellé → pas de `richText`,
      // le corps rend le `text` verbatim). Transformation par une action de mouvement (M), à volonté.
      original: {
        name: 'Transformation',
        actionTypes: ['M'],
      },
    },
    spellProfile: 'sorcier',
    superiorPower: {
      text: "Le personnage obtient la capacité Pacte démoniaque (rang 3, voie du démon, sorcier). Si le personnage possède déjà cette capacité, il divise par 2 les DM subis (arrondi au supérieur).",
      grants: {
        name: 'Pacte démoniaque',
        rank: 3,
        pathName: 'voie du démon',
        profile: 'sorcier',
        // PER-74 : demon-r3 = « Pacte démoniaque ». ACQUISITION PERMANENTE (aucune fréquence
        // dans le livre : « Le personnage obtient la capacité ») → pas d'`usageLimit`.
        featureId: 'demon-r3',
      },
      abilityBonus: 'INT',
    },
    sourcePage: 134,
  },
  {
    id: 'dragon-feerique',
    name: 'Dragon féérique',
    pathId: 'prestige-familier-fantastique',
    description:
      "Le dragon féérique est un cousin du pseudo-dragon que l'on reconnaît facilement à ses grandes ailes colorées de papillon. Les dragons féériques sont d'un naturel farceur et prisent les sorts d'illusion. Le dragon féérique vole à une vitesse de 10 m par action de mouvement. Il est capable de communiquer par télépathie avec toutes les créatures comprenant le langage commun ou le sylvestre (le langage de la forêt) jusqu'à une portée de 20 m.",
    minorPower: {
      text: "Le personnage obtient le sort Image décalée (rang 2, voie des illusions, ensorceleur), 2 fois par jour.",
      grants: {
        name: 'Image décalée',
        rank: 2,
        pathName: 'voie des illusions',
        profile: 'ensorceleur',
        usage: '2 fois par jour',
        // PER-74 (pilote) : capacité RÉELLE peuplée (illusions-r2 = « Image décalée ») → carte empruntée.
        featureId: 'illusions-r2',
      },
      usageLimit: { max: 2, reset: 'day' },
    },
    spellProfile: 'ensorceleur',
    superiorPower: {
      text: 'Le personnage obtient le sort Mirage (rang 1, voie des Illusions, ensorceleur), 1 fois par combat.',
      grants: {
        name: 'Mirage',
        rank: 1,
        pathName: 'voie des illusions',
        profile: 'ensorceleur',
        usage: '1 fois par combat',
        // PER-74 (pilote) : illusions-r1 = « Mirage ».
        featureId: 'illusions-r1',
      },
      abilityBonus: 'CHA',
      usageLimit: { max: 1, reset: 'combat' },
    },
    sourcePage: 134,
  },
  {
    id: 'fee-ou-lutin',
    name: 'Fée ou lutin',
    pathId: 'prestige-familier-fantastique',
    description:
      "Le personnage adopte un lutin (30 cm) ou une fée (15 cm). Ce sont des créatures espiègles et farceuses (CHA +2) dont le MJ pourra parfois prendre le contrôle pour jouer des tours pendables aux alliés du personnage, et pourquoi pas au personnage lui-même. Fée et lutin possèdent la capacité de se rendre invisible à volonté. La fée peut voler (10 m par action de mouvement) et le lutin est capable de se téléporter sur une distance de 10 m par action de mouvement.",
    abilityOverrides: { CHA: 2 },
    minorPower: {
      text: "2 fois par jour, le personnage peut se rendre invisible comme avec la capacité de magicien (rang 3, voie de la magie universelle).",
      grants: {
        name: 'Invisibilité',
        rank: 3,
        pathName: 'voie de la magie universelle',
        profile: 'magicien',
        usage: '2 fois par jour',
        // PER-74 : magie-universelle-r3 = « Invisibilité » (rang 3 confirmé p. 106).
        featureId: 'magie-universelle-r3',
      },
      usageLimit: { max: 2, reset: 'day' },
    },
    spellProfile: 'ensorceleur',
    superiorPower: {
      text: "Une fois par jour, le personnage peut basculer dans le monde invisible et s'y déplacer pour en ressortir là où il le souhaite. Ce pouvoir fonctionne exactement comme la capacité Marche des plans de la voie de la spiritualité du profil de prêtre.",
      grants: {
        name: 'Marche des plans',
        rank: 5,
        pathName: 'voie de la spiritualité',
        profile: 'pretre',
        usage: 'une fois par jour',
        // PER-74 : spiritualite-r5 = « Marche des plans » (rang 5, prêtre).
        featureId: 'spiritualite-r5',
      },
      abilityBonus: 'AGI',
      usageLimit: { max: 1, reset: 'day' },
    },
    sourcePage: 134,
  },
  {
    id: 'grig',
    name: 'Grig',
    pathId: 'prestige-familier-fantastique',
    description:
      "Le buste humanoïde de cet esprit follet de 45 cm de haut surmonte un bas-ventre et des pattes inférieures semblables au corps d'une sauterelle. Tête brûlée veillant à la protection des zones naturelles, le Grig n'a peur de rien et prend souvent des risques inconsidérés. Le Grig aime jouer du violon et, une fois par jour, il peut reproduire avec cet instrument les effets d'un sort de Danse irrésistible (rang 5 de la voie du musicien, barde).",
    minorPower: {
      text: 'Prison végétale comme la capacité de rang 2 de la voie des végétaux du druide, 2 fois par jour.',
      grants: {
        name: 'Prison végétale',
        rank: 2,
        pathName: 'voie des végétaux',
        profile: 'druide',
        usage: '2 fois par jour',
        // PER-74 : vegetaux-r2 = « Prison végétale » (nom + rang confirmés).
        featureId: 'vegetaux-r2',
      },
      usageLimit: { max: 2, reset: 'day' },
    },
    spellProfile: 'druide',
    superiorPower: {
      text: "Nuée d'insectes (rang 3 de la voie des animaux, druide), 3 fois par jour.",
      grants: {
        name: "Nuée d'insectes",
        rank: 3,
        pathName: 'voie des animaux',
        profile: 'druide',
        usage: '3 fois par jour',
        // PER-74 : animaux-r3 = « Nuée d'insectes » (nom + rang confirmés).
        featureId: 'animaux-r3',
      },
      abilityBonus: 'AGI',
      usageLimit: { max: 3, reset: 'day' },
    },
    sourcePage: 135,
  },
  {
    id: 'lezard-voltaique',
    name: 'Lézard voltaïque',
    pathId: 'prestige-familier-fantastique',
    description:
      "Plus grand que les autres créatures proposées (FOR -2), ce familier pèse une dizaine de kilogrammes et fait la taille d'un petit chien, un animal dont il partage le tempérament joueur et affectueux. Ce gros lézard de couleur bleue ou verte possède deux cornes qui produisent des arcs électriques. Le lézard voltaïque est immunisé aux DM d'électricité et il peut délivrer une décharge étourdissante à ses ennemis. Cette attaque de contact (attaque magique du personnage) inflige 1d4° DM et contraint à réussir un test de CON difficulté 10 pour ne pas être affaibli durant 1 tour.",
    abilityOverrides: { FOR: -2 },
    minorPower: {
      text: "Le personnage obtient la capacité Sous tension (rang 1, voie de l'air, ensorceleur), 2 fois par jour.",
      grants: {
        name: 'Sous tension',
        rank: 1,
        pathName: "voie de l'air",
        profile: 'ensorceleur',
        usage: '2 fois par jour',
        // PER-74 : air-r2 = « Sous tension ». Le livre cite « rang 1 » ICI, mais la voie de
        // l'air (p. 93) place bien « Sous tension » au RANG 2 (rang 1 = « Murmures dans le
        // vent ») → coquille du livre dans l'encadré du familier ; `rank` reste verbatim, le
        // `featureId` pointe la capacité réelle.
        featureId: 'air-r2',
      },
      usageLimit: { max: 2, reset: 'day' },
    },
    spellProfile: 'magicien',
    superiorPower: {
      text: "Le personnage obtient la capacité Foudre (rang 4, voie de l'air, ensorceleur), 2 fois par jour.",
      grants: {
        name: 'Foudre',
        rank: 4,
        pathName: "voie de l'air",
        profile: 'ensorceleur',
        usage: '2 fois par jour',
        // PER-74 : air-r4 = « Foudre » (rang 4 confirmé p. 93).
        featureId: 'air-r4',
      },
      abilityBonus: 'INT',
      usageLimit: { max: 2, reset: 'day' },
    },
    sourcePage: 135,
  },
  {
    id: 'minimoi',
    name: 'Minimoï',
    pathId: 'prestige-familier-fantastique',
    description:
      "À partir d'un petit morceau de sa chair, le personnage se dote d'une réplique miniature de sa personne. Cette réplique peut être créée à la suite d'une péripétie jouée ou subie par le personnage. Le familier est l'exacte copie de son maître, mais il mesure environ 30 cm. Son caractère et son attitude tendent à caricaturer les défauts et les qualités du personnage (en les accentuant ou au contraire en prenant le contrepied). Lorsqu'ils sont au contact l'un de l'autre, le personnage peut guérir le minimoï en lui transférant ses propres PV.",
    abilityNote:
      "Le minimoï a FOR -3 et AGI [AGI du personnage + 2] ; toutes ses autres caractéristiques sont égales à celles du personnage - 2.",
    minorPower: {
      text: "Imitation. Le personnage obtient la capacité Imitation (rang 4, voie des illusions, ensorceleur) qu'il peut utiliser une fois par jour.",
      grants: {
        name: 'Imitation',
        rank: 4,
        pathName: 'voie des illusions',
        profile: 'ensorceleur',
        usage: 'une fois par jour',
        // PER-74 : illusions-r4 = « Imitation » (nom + rang confirmés).
        featureId: 'illusions-r4',
      },
      usageLimit: { max: 1, reset: 'day' },
    },
    spellProfile: 'main-profile',
    superiorPower: {
      text: "Clone. Une fois par jour, par une action limitée, le minimoï peut grandir jusqu'à prendre une taille normale et devenir le double exact du personnage pendant INT rounds. Les deux personnages ont exactement les mêmes caractéristiques, le joueur les fait agir une fois par round de façon indépendante. Toutefois, ils partagent une unique réserve de PM (celle du PJ) et tous les sorts lancés par le familier sont déduits des PM du personnage. Durant sa transformation, le familier perd sa RD (il conserve ses PV habituels).",
      // PER-74 : pouvoir PROPRE au familier → carte « pouvoir original ».
      original: {
        name: 'Clone',
        actionTypes: ['L'],
        richText:
          "Une fois par jour, par une action limitée, le minimoï peut grandir jusqu'à prendre une taille normale et devenir le double exact du personnage pendant [=INT] rounds. Les deux personnages ont exactement les mêmes caractéristiques, le joueur les fait agir une fois par round de façon indépendante. Toutefois, ils partagent une unique réserve de PM (celle du PJ) et tous les sorts lancés par le familier sont déduits des PM du personnage. Durant sa transformation, le familier perd sa RD (il conserve ses PV habituels).",
      },
      abilityBonus: 'CHA',
      usageLimit: { max: 1, reset: 'day' },
    },
    sourcePage: 135,
  },
  {
    id: 'pseudo-dragon',
    name: 'Pseudo-dragon',
    pathId: 'prestige-familier-fantastique',
    description:
      "Le pseudo-dragon est un petit lézard ailé de 30 cm environ pourvu d'une longue queue de 60 cm qui se termine par un dard empoisonné. Le pseudo-dragon vole à une vitesse de 10 m par action de mouvement. Il est capable de communiquer par télépathie avec toutes les créatures comprenant le langage commun ou celui de la forêt (le sylvestre) à une portée de 20 m. Il attaque avec la valeur d'attaque magique du personnage et, en cas de réussite, son poison oblige la victime à réussir un test de CON difficulté 10 ou à s'endormir pendant 2d6 min. Les créatures de NC supérieur à 1 sont immunisées à ce poison.",
    minorPower: {
      text: 'Télépathie. Le personnage peut communiquer par télépathie à une distance de 50 m avec toutes les créatures douées de conscience avec lesquelles il partage un langage commun.',
      // PER-74 : pouvoir PROPRE au familier, passif (aucun type d'action). `richText` retire le libellé
      // de tête « Télépathie. » (relocalisé en titre).
      original: {
        name: 'Télépathie',
        richText:
          'Le personnage peut communiquer par télépathie à une distance de 50 m avec toutes les créatures douées de conscience avec lesquelles il partage un langage commun.',
      },
    },
    spellProfile: 'ensorceleur',
    superiorPower: {
      text: "Le personnage obtient la capacité Sommeil (rang 2, voie de l'envoûteur, ensorceleur), une fois par combat.",
      grants: {
        name: 'Sommeil',
        rank: 2,
        pathName: "voie de l'envoûteur",
        profile: 'ensorceleur',
        usage: 'une fois par combat',
        // PER-74 : envouteur-r2 = « Sommeil » (nom + rang confirmés).
        featureId: 'envouteur-r2',
      },
      abilityBonus: 'CHA',
      usageLimit: { max: 1, reset: 'combat' },
    },
    sourcePage: 136,
  },
  {
    id: 'pantin-ou-poupee',
    name: 'Pantin ou poupée',
    pathId: 'prestige-familier-fantastique',
    // TODO(extraction) : p. 136 — le livre dit que la RD 5 du pantin « s'ajoute à celle
    // obtenue à partir du rang 6 », alors que la RD de la voie provient du rang 5
    // (capacité Résistance). Possible coquille du livre ; conservé verbatim, à confirmer.
    description:
      "Le personnage obtient un familier artificiel, qui peut être une poupée de chiffon, une merveille de miniaturisation et d'engrenages, ou encore une statuette s'animant par magie. Le pantin ou la poupée peut être un ancien familier transformé ou une nouvelle créature. Le familier acquiert le type « non-vivant » et tous les avantages qui en découlent. Le pantin possède une RD 5. Celle-ci s'ajoute à celle obtenue à partir du rang 6.",
    minorPower: {
      text: "Le personnage obtient la capacité Serviteur invisible (rang 2, voie de l'invocation, ensorceleur), 3 fois par jour.",
      grants: {
        name: 'Serviteur invisible',
        rank: 2,
        pathName: "voie de l'invocation",
        profile: 'ensorceleur',
        usage: '3 fois par jour',
        // PER-74 : invocation-r2 = « Serviteur invisible » (nom + rang confirmés).
        featureId: 'invocation-r2',
      },
      usageLimit: { max: 3, reset: 'day' },
    },
    spellProfile: 'forgesort',
    superiorPower: {
      text: "Le personnage obtient la capacité Peau de pierre (rang 5, voie de la magie élémentaire, magicien) qu'il peut utiliser une fois par jour.",
      grants: {
        name: 'Peau de pierre',
        rank: 5,
        pathName: 'voie de la magie élémentaire',
        profile: 'magicien',
        usage: 'une fois par jour',
        // PER-74 : magie-elementaire-r5 = « Armure de pierre » (rang 5, magie élémentaire,
        // magicien — confirmé p. 105). L'encadré du familier l'appelle « Peau de pierre » :
        // incohérence de nom du livre (une capacité « Peau de pierre » distincte existe chez
        // le moine, pagne-r2, mais elle n'est PAS de la magie élémentaire) ; le triplet
        // rang + voie + profil identifie sans ambiguïté magie-elementaire-r5.
        featureId: 'magie-elementaire-r5',
      },
      abilityBonus: 'CON',
      usageLimit: { max: 1, reset: 'day' },
    },
    sourcePage: 136,
  },
  {
    id: 'stique',
    name: 'Stique',
    pathId: 'prestige-familier-fantastique',
    description:
      "La stique est une affreuse petite créature de couleur verte de 30 cm de haut, croisement entre un moustique géant et une chauve-souris pourvue de quatre ailes. Elle possède six pattes barbelées lui permettant de s'accrocher férocement à ses victimes pour leur sucer le sang. Son exosquelette est excessivement dur et très difficile à briser sans blesser ces dernières au passage. Une stique attaque avec la valeur d'attaque magique du personnage. Si elle réussit son attaque, elle s'agrippe à sa proie pour lui aspirer le sang et inflige ainsi 1d4° DM par round. La stique vole à une vitesse de 10 m par action de mouvement.",
    minorPower: {
      text: 'Le personnage obtient la capacité Saignement (rang 1, voie du sang, sorcier), 3 fois par jour.',
      grants: {
        name: 'Saignement',
        rank: 1,
        pathName: 'voie du sang',
        profile: 'sorcier',
        usage: '3 fois par jour',
        // PER-74 : sang-r1 = « Saignements » (pluriel dans les données ; l'encadré du
        // familier écrit « Saignement » au singulier — même capacité, rang 1 voie du sang).
        featureId: 'sang-r1',
      },
      usageLimit: { max: 3, reset: 'day' },
    },
    spellProfile: 'sorcier',
    superiorPower: {
      text: 'Le personnage obtient la capacité Rituel de sang (rang 4, voie du sang, sorcier), 1 fois par combat.',
      grants: {
        name: 'Rituel de sang',
        rank: 4,
        pathName: 'voie du sang',
        profile: 'sorcier',
        usage: '1 fois par combat',
        // PER-74 : sang-r4 = « Rituel de sang » (nom + rang confirmés).
        featureId: 'sang-r4',
      },
      abilityBonus: 'CON',
      usageLimit: { max: 1, reset: 'combat' },
    },
    sourcePage: 136,
  },
];

/** Index de lookup par id. */
export const fantasticFamiliarById = new Map<string, FantasticFamiliar>(
  fantasticFamiliars.map((f) => [f.id, f]),
);

/** Id de la capacité de RANG 3 de la voie, qui porte le choix du familier (option index 0). */
export const FANTASTIC_FAMILIAR_R3_ID = 'prestige-familier-fantastique-r3';

/**
 * Option de choix du rang 3 → id de l'entité `FantasticFamiliar` : fée/lutin et pantin/poupée sont
 * deux choix DISTINCTS qui PARTAGENT une même entité (mêmes stats + mêmes pouvoirs conférés). Les
 * autres options ont un id identique à leur entité. Source unique de la jointure, consommée par la
 * mini-fiche du R3 (`part1.ts`, `withVerbatim`) ET par la résolution des pouvoirs conférés R4/R5/R7
 * (PER-74 : `familiarFromOptionId`).
 */
export const FAMILIAR_ENTITY_BY_OPTION: Record<string, string> = {
  fee: 'fee-ou-lutin',
  lutin: 'fee-ou-lutin',
  pantin: 'pantin-ou-poupee',
  poupee: 'pantin-ou-poupee',
};

/**
 * Entité `FantasticFamiliar` correspondant à une OPTION retenue au rang 3 (ex. `'fee'` → 'fee-ou-lutin',
 * `'stique'` → 'stique'). `undefined` si aucune option / option inconnue. Brique de la primitive « effet
 * conditionné au familier choisi » (PER-74) : le +1 de carac du rang 7 et l'affichage des pouvoirs
 * mineur/supérieur/profil de sorts en dérivent tous.
 */
export function familiarFromOptionId(optionId: string | undefined): FantasticFamiliar | undefined {
  if (!optionId) return undefined;
  return fantasticFamiliarById.get(FAMILIAR_ENTITY_BY_OPTION[optionId] ?? optionId);
}
