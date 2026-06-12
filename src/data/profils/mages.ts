import type { Profil, VoieDeProfil, Capacite } from '../schema';

/**
 * Famille des mages — chapitre 6, p. 91-111 du livre de base CO2.
 * Profils : ensorceleur (p. 92), forgesort (p. 97), magicien (p. 102),
 * sorcier (p. 107).
 *
 * Éléments communs à la famille (p. 91) : PV 3 par niveau, dé de
 * récupération d6, +1 capacité de rang 2 à la création, accès à la voie du
 * mage en remplacement de la voie de peuple (voir p. 60). Les sorts sont
 * signalés par un astérisque (*) accolé à leur nom.
 *
 * caracsConseillees : caractéristiques « les plus utiles au personnage par
 * ordre d'importance », indiquées entre crochets dans la liste des profils
 * p. 24-25 du livre de base (et non sur les pages de profil 92-111).
 */

export const profilsMages: Profil[] = [
  {
    id: 'ensorceleur',
    nom: 'Ensorceleur',
    familleId: 'mages',
    description:
      "L’ensorceleur tire son pouvoir d’un talent inné pour la magie. Il pratique une magie subtile à base de tromperie et de contrôle, et possède peu de sorts de destruction massive. Dans les Terres d’Osgild : contrairement aux magiciens, les ensorceleurs peuvent provenir de n’importe quelle zone géographique, car le don surgit au hasard. Selon les sociétés, le don peut être considéré comme une bénédiction (chez les elfes par exemple) autant que comme une malédiction (protectorat de Fer). La magie innée est souvent considérée comme la magie du pauvre, car elle ne nécessite aucune éducation pour se développer, toutefois elle traverse toutes les couches de la société. À part quelques cas avérés de pacte avec une entité puissante, l’origine du don reste relativement mystérieuse. Les gnomes, eux‑mêmes très sujets à l’apparition du don, ont toutefois avancé des théories farfelues en rapport avec les Pierres du Ciel, de puissantes sources de magie disséminées sur les Terres d’Osgild. Mais l’existence de telles pierres reste à prouver.",
    armesEtArmures:
      "L’ensorceleur sait manier la dague et le bâton ferré. De plus, chaque ensorceleur peut choisir une arme supplémentaire de son choix qu’il a appris à utiliser, sans dépasser 1d6 DM (malgré ses DM de 2d4, l’arbalète légère est aussi une arme éligible). Les voies d’ensorceleur interdisent de porter une armure ou d’utiliser un bouclier.",
    armureMaxId: null,
    bouclierAutorise: false,
    equipementDepart: [
      { itemId: 'baton-ferre', libelle: 'Bâton ferré (DM 1d6)', quantite: 1 },
      { itemId: 'dague', libelle: 'dague (DM d4) ou autre arme maîtrisée au choix', quantite: 1 },
    ],
    voieIds: ['air', 'divination', 'envouteur', 'illusions', 'invocation'],
    caracsConseillees: ['CHA', 'VOL', 'AGI'],
    sourcePage: 92,
  },
  {
    id: 'forgesort',
    nom: 'Forgesort',
    familleId: 'mages',
    description:
      "À la fois artisan et enchanteur, artiste et magicien, le forgesort lie les énergies occultes à la matière qu’il façonne pour créer des artefacts magiques ou des breuvages aux propriétés fantastiques. Le forgesort est aussi le seul utilisateur de magie profane à pouvoir porter une armure. Dans les Terres d’Osgild : les forgesorts forment une caste de magiciens‑artisans qu’on ne trouve pas partout, mais qui sont très organisés. Les nains et les gnomes sont plus particulièrement férus de cette école de magie et s’organisent souvent en guilde, à la façon des artisans, tandis que les elfes sont moins enclins à la pratiquer. Les Frères forgeurs forment la guilde de la principauté d’Arly, laquelle a son siège à Fort Colline. Les élèves sont recrutés sur leur seul talent, à la suite d’une série de tests poussés de connaissance et d’artisanat, sans distinction de peuple. Après une formation initiale de sept années, le compagnon doit prendre la route et voyager au loin pour apprendre de nouvelles techniques, rencontrer des maîtres forgesorts à travers le monde et réaliser un chef‑d’œuvre : un objet magique original à la fois remarquable pour ses pouvoirs, mais aussi pour la qualité de son artisanat.",
    armesEtArmures:
      "Le forgesort sait manier la dague, le bâton, le marteau et l’arbalète légère. Les voies de forgesort limitent l’armure au cuir simple et interdisent d’utiliser un bouclier.",
    armureMaxId: 'cuir-simple',
    bouclierAutorise: false,
    equipementDepart: [
      { itemId: 'dague', libelle: 'Dague (DM 1d4)', quantite: 1 },
      { itemId: 'baton-ferre', libelle: 'bâton ferré (DM 1d6)', quantite: 1 },
      { itemId: 'marteau', libelle: 'marteau (DM 1d6)', quantite: 1 },
    ],
    voieIds: ['artefacts', 'elixirs', 'metal', 'golem', 'runes'],
    caracsConseillees: ['INT', 'VOL', 'CON'],
    sourcePage: 97,
  },
  {
    id: 'magicien',
    nom: 'Magicien',
    familleId: 'mages',
    description:
      "Le magicien est un érudit qui a fait de longues études sur les fondements théoriques de la magie avant d’être capable de lancer ses premiers sorts. Toutefois, ce n’est pas qu’un rat de bibliothèque, il fait aussi appel à la magie pour se débarrasser de ses ennemis et pour aider ses compagnons. Son bien le plus précieux est son grimoire où il a inscrit tous ses sorts. Dans les Terres d’Osgild : la pratique de la magie profane nécessite une formation complexe généralement enseignée dans une académie. Celle de la principauté d’Arly, située à Ferrance, est dirigée par l’archimage Kerlaft de Rollis, éminence grise du prince Thomar. Ce sont plus souvent les jeunes gens issus de familles fortunées qui peuvent se permettre de telles études. Les jeunes magiciens issus de milieux moins aisés sont généralement repérés par de puissants mages qui les prennent sous leur aile comme apprenti et serviteur en échange de bribes de savoir plus ou moins importantes. En la matière, les maîtres sont tous très différents, certains sont des tyrans, d’autres se montrent plus prévenants mais, en règle générale, tous sont assez peu enclins à partager sans restriction le pouvoir que leur offre leur statut de maître… À part les humains, les elfes forment de puissants magiciens, et les gnomes ont la persévérance et le goût pour la recherche théorique nécessaires à ce profil. En revanche, rencontrer un nain, un halfelin ou un demi‑orc magicien est un événement exceptionnel.",
    armesEtArmures:
      "Le magicien sait manier la dague et le bâton. Les voies de magicien interdisent de porter une armure ou d’utiliser un bouclier.",
    armureMaxId: null,
    bouclierAutorise: false,
    equipementDepart: [
      { itemId: 'baton-ferre', libelle: 'Bâton ferré (DM 1d6)', quantite: 1 },
      { itemId: 'dague', libelle: 'dague (DM 1d4)', quantite: 1 },
      { itemId: null /* TODO(extraction): grimoire non listé dans le catalogue de prix */, libelle: 'grimoire de sorts', quantite: 1 },
    ],
    voieIds: [
      'magie-des-arcanes',
      'magie-destructrice',
      'magie-elementaire',
      'magie-protectrice',
      'magie-universelle',
    ],
    caracsConseillees: ['INT', 'VOL', 'AGI'],
    sourcePage: 102,
  },
  {
    id: 'sorcier',
    nom: 'Sorcier',
    familleId: 'mages',
    description:
      "Le sorcier est un lanceur de sorts qui s’intéresse aux forces obscures et au pouvoir de la mort. Parfois nommés nécromanciens ou démonistes, les sorciers sont généralement considérés comme maléfiques et sont peu appréciés. Toutefois, cela dépend des cultures : après tout, est‑il plus maléfique de vider un ennemi de son sang que de le découper à coup de hache ou de le carboniser à coup de Explosion de feu ? C’est une des questions que soulève le sorcier ! Interprétez‑le de façon subtile afin d’en faire un personnage plutôt sombre ou désespéré, mais pas nécessairement « mauvais ». Dans les Terres d’Osgild : tout comme la magie profane des magiciens, la magie noire nécessite des études poussées. Cette connaissance peut être tirée d’antiques grimoires, mais souvent elle est obtenue par le biais d’un pacte avec un maître maléfique (prince démon, entité indicible, mort‑vivant très ancien, etc.) et dans ce cas, peu importe l’origine sociale du postulant. Pour celui qui n’a pas les moyens de s’offrir de coûteuses études de magie, la tentation est grande de faire appel à un sombre mentor et le ressentiment éventuel contre les riches et les puissants peut être un moteur redoutable. Enfin, il existe des êtres qui n’ont pas choisi la magie noire, mais qui sont nés avec un don pour celle‑ci. Cela est généralement le fruit d’un événement tragique qui a corrompu un parent, voire l’enfant lui‑même. Dans la plupart des nations humaines, les sombres mages sont tout juste tolérés, tant qu’ils ne troublent pas l’ordre public en ramenant les morts à la vie. Ce que la loi interdit à peu près partout. De leur côté, les elfes et les nains abhorrent la magie noire, si les humains ont oublié, les Premiers‑Nés ont encore le souvenir des ravages de la terrible magie du Roi‑Sorcier de Tor‑Angul et du destin funeste de la forêt Sombre. Héritier de cette période, le Kathang (au sud du mur de Kelt) est réputé pour sa magie noire et cette influence s’étend à travers les jungles de Luir‑An‑Doral jusque dans le duché de Périk.",
    armesEtArmures:
      "Le sorcier sait manier la dague et le bâton. Les voies de sorcier interdisent de porter une armure ou d’utiliser un bouclier.",
    armureMaxId: null,
    bouclierAutorise: false,
    equipementDepart: [
      { itemId: 'baton-ferre', libelle: 'Bâton ferré (DM 1d6)', quantite: 1 },
      { itemId: 'dague', libelle: 'dague (DM 1d4)', quantite: 1 },
      {
        itemId: null /* TODO(extraction): grimoire non listé dans le catalogue de prix */,
        libelle: 'grimoire de sorts ou parchemins anciens',
        quantite: 1,
      },
    ],
    voieIds: ['demon', 'mort', 'outre-tombe', 'sang', 'sombre-magie'],
    caracsConseillees: ['INT', 'VOL', 'CON'],
    sourcePage: 107,
  },
];

export const voiesMages: VoieDeProfil[] = [
  // --- Ensorceleur ---
  {
    id: 'air',
    nom: "Voie de l’air",
    type: 'profil',
    profilIds: ['ensorceleur'],
    capaciteIds: ['air-r1', 'air-r2', 'air-r3', 'air-r4', 'air-r5'],
    sourcePage: 93,
  },
  {
    id: 'divination',
    nom: 'Voie de la divination',
    type: 'profil',
    profilIds: ['ensorceleur'],
    capaciteIds: [
      'divination-r1',
      'divination-r2',
      'divination-r3',
      'divination-r4',
      'divination-r5',
    ],
    sourcePage: 93,
  },
  {
    id: 'envouteur',
    nom: "Voie de l’envoûteur",
    type: 'profil',
    profilIds: ['ensorceleur'],
    capaciteIds: [
      'envouteur-r1',
      'envouteur-r2',
      'envouteur-r3',
      'envouteur-r4',
      'envouteur-r5',
    ],
    note: "Note : si une victime résiste à un sort de cette voie, elle y est immunisée pendant 24 h.",
    sourcePage: 94,
  },
  {
    id: 'illusions',
    nom: 'Voie des illusions',
    type: 'profil',
    profilIds: ['ensorceleur'],
    capaciteIds: [
      'illusions-r1',
      'illusions-r2',
      'illusions-r3',
      'illusions-r4',
      'illusions-r5',
    ],
    sourcePage: 95,
  },
  {
    id: 'invocation',
    nom: "Voie de l’invocation",
    type: 'profil',
    profilIds: ['ensorceleur'],
    capaciteIds: [
      'invocation-r1',
      'invocation-r2',
      'invocation-r3',
      'invocation-r4',
      'invocation-r5',
    ],
    sourcePage: 96,
  },

  // --- Forgesort ---
  {
    id: 'artefacts',
    nom: 'Voie des artefacts',
    type: 'profil',
    profilIds: ['forgesort'],
    capaciteIds: [
      'artefacts-r1',
      'artefacts-r2',
      'artefacts-r3',
      'artefacts-r4',
      'artefacts-r5',
    ],
    sourcePage: 97,
  },
  {
    id: 'elixirs',
    nom: 'Voie des élixirs',
    type: 'profil',
    profilIds: ['forgesort'],
    capaciteIds: ['elixirs-r1', 'elixirs-r2', 'elixirs-r3', 'elixirs-r4', 'elixirs-r5'],
    note: "Chaque jour, le forgesort peut créer et utiliser (sur lui‑même ou un allié vivant) un élixir par rang acquis dans cette voie. Il ajoute un élixir supplémentaire à chaque fois qu’il atteint le rang 3 dans une voie de forgesort (celle‑ci incluse). Il doit préparer les élixirs le matin après sa période de récupération complète, et cela lui prend environ une demi‑heure. Boire un élixir est une action limitée. Les élixirs qui ne sont pas utilisés le jour même sont perdus.\n\nNote : si un personnage choisit une capacité issue de la voie des élixirs par l’intermédiaire d’une autre voie, il acquiert seulement deux élixirs par jour (ou un seul dans le cas d’un élixir majeur). Consommer un élixir n’est pas limité par le type d’armure que porte celui qui le boit.",
    sourcePage: 98,
  },
  {
    id: 'metal',
    nom: 'Voie du métal',
    type: 'profil',
    profilIds: ['forgesort'],
    capaciteIds: ['metal-r1', 'metal-r2', 'metal-r3', 'metal-r4', 'metal-r5'],
    sourcePage: 99,
  },
  {
    id: 'golem',
    nom: 'Voie du golem',
    type: 'profil',
    profilIds: ['forgesort'],
    capaciteIds: ['golem-r1', 'golem-r2', 'golem-r3', 'golem-r4', 'golem-r5'],
    note: "PARTICULARITÉS LIÉES AU GOLEM\nSoigner un golem : le golem ne guérit pas naturellement, mais le forgesort peut le réparer au rythme de [1d6 par rang + INT] PV par heure.\nGolem à 0 PV : si le golem est réduit à 0 PV, il cesse de fonctionner, mais le forgesort peut le réparer.\nMort d’un golem : si le golem est détruit ou perdu, le forgesort peut en construire un nouveau en 1d6 + 3 jours (+1d6 jours par amélioration de golem supérieur). Un forgesort peut utiliser tous les matériaux à sa disposition dans son environnement, par exemple pierre et bois s’il est dans une forêt.",
    sourcePage: 100,
  },
  {
    id: 'runes',
    nom: 'Voie des runes',
    type: 'profil',
    profilIds: ['forgesort'],
    capaciteIds: ['runes-r1', 'runes-r2', 'runes-r3', 'runes-r4', 'runes-r5'],
    note: "Un personnage ne peut porter qu’une seule rune de chaque type sur lui‑même ou son équipement à la fois. Si l’équipement change de main ou si le sort est utilisé, la rune est dissipée. Une fois la rune dissipée, il est possible de relancer le sort.",
    sourcePage: 101,
  },

  // --- Magicien ---
  {
    id: 'magie-des-arcanes',
    nom: 'Voie de la magie des arcanes',
    type: 'profil',
    profilIds: ['magicien'],
    capaciteIds: [
      'magie-des-arcanes-r1',
      'magie-des-arcanes-r2',
      'magie-des-arcanes-r3',
      'magie-des-arcanes-r4',
      'magie-des-arcanes-r5',
    ],
    sourcePage: 103,
  },
  {
    id: 'magie-destructrice',
    nom: 'Voie de la magie destructrice',
    type: 'profil',
    profilIds: ['magicien'],
    capaciteIds: [
      'magie-destructrice-r1',
      'magie-destructrice-r2',
      'magie-destructrice-r3',
      'magie-destructrice-r4',
      'magie-destructrice-r5',
    ],
    note: "Note : Le joueur peut décider de substituer un élément à un autre lors de l’acquisition d’un sort, par exemple Mains électriques, Explosion acide et Tempête de glace. Toutefois ce choix est définitif.",
    sourcePage: 103,
  },
  {
    id: 'magie-elementaire',
    nom: 'Voie de la magie élémentaire',
    type: 'profil',
    profilIds: ['magicien'],
    capaciteIds: [
      'magie-elementaire-r1',
      'magie-elementaire-r2',
      'magie-elementaire-r3',
      'magie-elementaire-r4',
      'magie-elementaire-r5',
    ],
    sourcePage: 104,
  },
  {
    id: 'magie-protectrice',
    nom: 'Voie de la magie protectrice',
    type: 'profil',
    profilIds: ['magicien'],
    capaciteIds: [
      'magie-protectrice-r1',
      'magie-protectrice-r2',
      'magie-protectrice-r3',
      'magie-protectrice-r4',
      'magie-protectrice-r5',
    ],
    sourcePage: 104,
  },
  {
    id: 'magie-universelle',
    nom: 'Voie de la magie universelle',
    type: 'profil',
    profilIds: ['magicien'],
    capaciteIds: [
      'magie-universelle-r1',
      'magie-universelle-r2',
      'magie-universelle-r3',
      'magie-universelle-r4',
      'magie-universelle-r5',
    ],
    sourcePage: 106,
  },

  // --- Sorcier ---
  {
    id: 'demon',
    nom: 'Voie du démon',
    type: 'profil',
    profilIds: ['sorcier'],
    capaciteIds: ['demon-r1', 'demon-r2', 'demon-r3', 'demon-r4', 'demon-r5'],
    sourcePage: 107,
  },
  {
    id: 'mort',
    nom: 'Voie de la mort',
    type: 'profil',
    profilIds: ['sorcier'],
    capaciteIds: ['mort-r1', 'mort-r2', 'mort-r3', 'mort-r4', 'mort-r5'],
    note: "Les sorts de cette voie n’affectent pas les créatures non vivantes (golem, élémentaires, morts‑vivants…).",
    sourcePage: 108,
  },
  {
    id: 'outre-tombe',
    nom: "Voie de l’outre‑tombe",
    type: 'profil',
    profilIds: ['sorcier'],
    capaciteIds: [
      'outre-tombe-r1',
      'outre-tombe-r2',
      'outre-tombe-r3',
      'outre-tombe-r4',
      'outre-tombe-r5',
    ],
    sourcePage: 109,
  },
  {
    id: 'sang',
    nom: 'Voie du sang',
    type: 'profil',
    profilIds: ['sorcier'],
    capaciteIds: ['sang-r1', 'sang-r2', 'sang-r3', 'sang-r4', 'sang-r5'],
    sourcePage: 109,
  },
  {
    id: 'sombre-magie',
    nom: 'Voie de la sombre magie',
    type: 'profil',
    profilIds: ['sorcier'],
    capaciteIds: [
      'sombre-magie-r1',
      'sombre-magie-r2',
      'sombre-magie-r3',
      'sombre-magie-r4',
      'sombre-magie-r5',
    ],
    sourcePage: 110,
  },
];

export const capacitesMages: Capacite[] = [
  // ===================== ENSORCELEUR =====================

  // --- Voie de l’air (p. 93) ---
  {
    id: 'air-r1',
    nom: 'Murmures dans le vent',
    voieId: 'air',
    rang: 1,
    estSort: true,
    typesAction: ['G'],
    texte:
      "L’ensorceleur chuchote un message d’une dizaine de mots qui voyage jusqu’à son destinataire. Il peut entendre sa réponse immédiatement. La portée est de CHA × 100 m et le personnage doit connaître la cible ou la voir. En plus de ce sort, l’ensorceleur gagne un bonus permanent de +1 en Init. et en DEF, car parfois une bourrasque venue de nulle part vient gêner son attaquant, dévier un projectile ou lui permettre d’entendre un adversaire.",
    sourcePage: 93,
  },
  {
    id: 'air-r2',
    nom: 'Sous tension',
    voieId: 'air',
    rang: 2,
    estSort: true,
    typesAction: ['M'],
    texte:
      "L’ensorceleur se charge d’énergie électrique pour CHA minutes. Pendant toute la durée du sort, une créature qui le blesse par une attaque de contact ou le touche reçoit une décharge infligeant 1d4° DM. De plus, il peut utiliser une action d’attaque à chaque round pour délivrer une décharge électrique (test d’attaque magique contre DEF de la cible, portée 10 m) infligeant [1d4°+CHA] DM (aucun coût de mana).",
    sourcePage: 93,
  },
  {
    id: 'air-r3',
    nom: 'Télékinésie',
    voieId: 'air',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "L’ensorceleur peut déplacer dans les airs un objet inerte (qui n’est pas tenu par un adversaire) ou une cible volontaire (par exemple lui‑même) dont le poids n’excède pas 50 kg par rang, à une portée de 20 m et pendant CHA minutes. L’objet peut être maintenu en l’air ou déplacé de 5 m par action de mouvement. Il est possible de faire tomber un objet sur une cible surprise (test d’attaque magique, DM 1d6 par tranche de 50 kg).",
    sourcePage: 93,
  },
  {
    id: 'air-r4',
    nom: 'Foudre',
    voieId: 'air',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "L’ensorceleur produit un éclair sur une ligne de 10 m. Toutes les créatures sur la trajectoire subissent [4d4°+CHA] DM ou seulement la moitié pour celles qui réussissent un test d’AGI difficulté [10 + CHA].",
    sourcePage: 93,
  },
  {
    id: 'air-r5',
    nom: 'Forme éthérée',
    voieId: 'air',
    rang: 5,
    estSort: true,
    typesAction: ['L'],
    texte:
      "L’ensorceleur et tout son équipement deviennent translucides et intangibles pendant CHA minutes. Sous cette forme, il peut passer à travers murs et obstacles et ne peut subir aucun DM physiques (même infligés par une arme magique), ni en infliger, ni lancer de sorts. Il n’est pas affecté par la gravité et peut se déplacer dans toutes les directions. Il est stoppé par les barrières magiques et ne peut pas passer à travers les êtres vivants.",
    sourcePage: 93,
  },

  // --- Voie de la divination (p. 93) ---
  {
    id: 'divination-r1',
    nom: 'Divination',
    voieId: 'divination',
    rang: 1,
    estSort: true,
    typesAction: ['L'],
    texte:
      "S’il emporte un test opposé d’attaque magique contre une créature de NC inférieur à son niveau (portée 10 m), l’ensorceleur devine son nom d’usage, son métier et quelques autres renseignements, tous de notoriété publique (si la cible agit sous couverture, ce sont les informations qui concernent la couverture que l’ensorceleur apprend). Si la cible du sort est volontaire et qu’il lit les lignes de sa main, il n’y a pas besoin de test et l’ensorceleur peut utiliser ce sort sur une créature de NC supérieur ou égal à son niveau. En plus de ce sort, l’ensorceleur gagne +1 en Init. et en DEF. Ce bonus augmente de +1 au rang 3 de la voie et de +1 chaque fois que le personnage atteint le rang 5 dans une voie d’ensorceleur.",
    sourcePage: 93,
  },
  {
    id: 'divination-r2',
    nom: "Détection de l’invisible",
    voieId: 'divination',
    rang: 2,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Pendant CHA minutes, l’ensorceleur détecte les créatures invisibles (le sort révèle une silhouette, mais pas l’apparence exacte de la créature) ou cachées à moins de 20 m et si un sort de Clairvoyance affecte l’endroit. Aveuglé (par magie ou dans l’obscurité), ce sort lui permet de détecter les créatures présentes (et donc d’attaquer sans malus), mais pas de distinguer son environnement.",
    sourcePage: 93,
  },
  {
    id: 'divination-r3',
    nom: 'Clairvoyance',
    voieId: 'divination',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "L’ensorceleur peut voir et entendre à distance ce qui se passe dans un lieu qu’il connaît (pas de limite de portée) ou juste derrière une porte qu’il touche pendant CHA rounds (action limitée à chaque round). Les créatures présentes ont droit à un test de PER difficulté [12 + CHA de l’ensorceleur] : en cas de réussite, elles se sentent observées.",
    sourcePage: 94,
  },
  {
    id: 'divination-r4',
    nom: 'Perception héroïque',
    voieId: 'divination',
    rang: 4,
    estSort: false,
    typesAction: [],
    texte:
      "L’ensorceleur augmente sa valeur de PER de +1. Désormais, il obtient un dé bonus aux tests de PER, et il ajoute sa PER au nombre de PM dont il bénéficie.",
    sourcePage: 94,
  },
  {
    id: 'divination-r5',
    nom: 'Prescience',
    voieId: 'divination',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Une fois par combat, au début du round, le joueur peut décider qu’il a eu une vision des différents futurs possibles. Il bénéficie d’un bonus de +10 en attaque, en Défense et à tous les tests de PER pour tout le round, il divise tous les DM subis par 2 et il peut choisir d’agir à n’importe quel moment dans le round, sans considération d’initiative.",
    sourcePage: 94,
  },

  // --- Voie de l’envoûteur (p. 94) ---
  {
    id: 'envouteur-r1',
    nom: 'Injonction',
    voieId: 'envouteur',
    rang: 1,
    estSort: true,
    typesAction: ['A'],
    texte:
      "L’ensorceleur donne un ordre simple (mais pas suicidaire) de deux ou trois mots que la cible doit pouvoir comprendre. S’il réussit un test opposé d’attaque magique contre une cible à une portée de 20 m, la victime doit exécuter l’ordre pendant son prochain tour. En plus de ce sort, l’ensorceleur ajoute son rang + 2 aux tests de persuasion ou de séduction.",
    sourcePage: 94,
  },
  {
    id: 'envouteur-r2',
    nom: 'Sommeil',
    voieId: 'envouteur',
    rang: 2,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Une fois par combat, l’ensorceleur vise une zone de 10 m de diamètre à une portée maximale de 20 m. Le sort affecte jusqu’à [1d4° + CHA] créatures vivantes de NC inférieur à 1. Le sort affecte les créatures de NC inférieur à 2 au rang 4 puis à 3 au rang 5. Les créatures perdent conscience pendant CHA minutes. Il est possible de les réveiller en les cognant violemment (action d’attaque, 1 DM).",
    sourcePage: 94,
  },
  {
    id: 'envouteur-r3',
    nom: 'Confusion',
    voieId: 'envouteur',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "En réussissant un test opposé d’attaque magique contre sa cible (portée 20 m), l’ensorceleur désoriente sa victime pendant CHA rounds. Au tour de la victime, celui qui l’incarne lance 1d6 : sur 1‑3 la victime n’agit pas, sur 4‑6 elle attaque la créature la plus proche (au hasard). À la fin de son tour, elle peut mettre fin au sort prématurément en réussissant un test de VOL difficulté [12 + CHA de l’ensorceleur].",
    sourcePage: 94,
  },
  {
    id: 'envouteur-r4',
    nom: 'Amitié',
    voieId: 'envouteur',
    rang: 4,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Si l’ensorceleur réussit un test opposé d’attaque magique (portée 10 m) contre une cible humanoïde de niveau ou NC inférieur au sien, celle‑ci se comporte comme un ami de longue date tant qu’elle n’est pas attaquée. La victime peut résister au sort avec un test de VOL difficulté [10 + CHA de l’ensorceleur] une fois par jour après chaque récupération complète. Si la cible est d’un niveau au moins égal au niveau du lanceur de sort, ce dernier obtient seulement un dé bonus à tous les tests de CHA qu’il effectue contre la victime pendant 10 min.",
    sourcePage: 94,
  },
  {
    id: 'envouteur-r5',
    nom: 'Domination',
    voieId: 'envouteur',
    rang: 5,
    estSort: true,
    typesAction: ['A'],
    texte:
      "En réussissant un test opposé d’attaque magique contre une cible de niveau ou NC inférieur au sien (portée 20 m), l’ensorceleur prend contrôle de sa cible pendant CHA minutes. Son propre corps devient inactif et s’écroule au sol. Si la créature meurt pendant la domination, l’ensorceleur réintègre son corps et subit 1d4° DM. Si la cible est d’un niveau trop élevé, il peut la forcer à faire une seule action de son choix (mouvement ou attaque) ; ensuite, il est éjecté et subit 1d4° DM.",
    sourcePage: 94,
  },

  // --- Voie des illusions (p. 95) ---
  {
    id: 'illusions-r1',
    nom: 'Mirage',
    voieId: 'illusions',
    rang: 1,
    estSort: true,
    typesAction: ['L'],
    texte:
      "L’ensorceleur crée une illusion visuelle et sonore immobile d’une durée de CHA minutes. Le volume maximal de l’illusion est de 2 m de côté par rang dans la voie (portée 50 m). À partir du rang 4, l’illusion peut être animée, mais dans ce cas sa durée est exprimée en rounds. En plus de ce sort, l’ensorceleur ajoute son rang + 2 aux tests de supercherie ou à tout test qui lui servirait à mentir.",
    sourcePage: 95,
  },
  {
    id: 'illusions-r2',
    nom: 'Image décalée',
    voieId: 'illusions',
    rang: 2,
    estSort: true,
    typesAction: ['M'],
    texte:
      "L’ensorceleur crée des images décalées qui se superposent à sa silhouette pendant [1d4 + CHA] rounds. Lorsqu’une attaque au contact ou à distance le touche, l’ensorceleur lance 1d6 : sur 5‑6, il ne subit pas les DM.",
    sourcePage: 95,
  },
  {
    id: 'illusions-r3',
    nom: 'Sort illusoire',
    voieId: 'illusions',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "L’ensorceleur lance un sort d’attaque qui n’est qu’une illusion. Il inflige [3d4°+CHA] DM contre une seule cible ou [2d4°+CHA] DM contre un maximum de cibles égal au rang atteint. Le joueur peut décrire la nature du sort à sa guise (une Explosion de feu, une nuée de criquets, une lance de glace, etc.), son imagination demeurant sa seule limite. Chaque cible peut faire un test de PER difficulté [10 + CHA de l’ensorceleur] pour ne subir aucun DM. Les créatures sans esprit (créatures artificielles, certaines plantes et morts‑vivants) sont immunisées à ce sort. Les PV perdus de cette façon se récupèrent normalement.",
    sourcePage: 95,
  },
  {
    id: 'illusions-r4',
    nom: 'Imitation',
    voieId: 'illusions',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Pendant CHA minutes, l’ensorceleur peut prendre l’apparence d’une créature de taille proche de la sienne (+ ou – 50 cm) qu’il voit au moment de l’incantation. Une créature qui touche l’ensorceleur se rend compte que quelque chose ne va pas et a le droit à un test d’INT difficulté [10 + CHA de l’ensorceleur] pour voir à travers l’illusion.",
    sourcePage: 95,
  },
  {
    id: 'illusions-r5',
    nom: 'Exécution mentale',
    voieId: 'illusions',
    rang: 5,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Ce sort invoque les pires terreurs d’une créature humanoïde vivante et lui fait croire à sa propre mort. L’ensorceleur doit faire un test opposé d’attaque magique contre sa cible (portée 20 m). En cas de succès la victime tombe à 0 PV ou si la cible est de niveau supérieur ou égal à l’ensorceleur, elle est étourdie (‑5 DEF et pas d’action) pendant 1 round. Une créature ne peut être la cible de ce sort qu’une fois par jour. Les créatures sans esprit (créatures artificielles, certaines plantes et certains morts‑vivants) sont immunisées à ce sort.",
    sourcePage: 95,
  },

  // --- Voie de l’invocation (p. 96) ---
  {
    id: 'invocation-r1',
    nom: 'Choc',
    voieId: 'invocation',
    rang: 1,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Si l’ensorceleur réussit un test d’attaque magique réussi contre la DEF de son adversaire situé à une portée de 20 m, il lui inflige [1d4° + CHA] DM. Si la cible a un NC inférieur au rang atteint par l’ensorceleur dans la voie, elle doit réussir un test de FOR difficulté 10 pour ne pas être renversée.",
    sourcePage: 96,
  },
  {
    id: 'invocation-r2',
    nom: 'Serviteur invisible',
    voieId: 'invocation',
    rang: 2,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Ce sort crée une force invisible pendant CHA minutes. Le serviteur peut effectuer à distance des tâches simples ne nécessitant pas de test de réussite avec une AGI et une INT de +0 et une FOR égale au CHA de l’ensorceleur (portée 20 m). Il peut par exemple rapporter un objet ou actionner un levier, voire faire la vaisselle. Le serviteur invisible se déplace à la même vitesse que l’ensorceleur, ne pèse rien, ne parle pas, n’a pas vraiment d’existence et peut se déplacer dans toutes les directions. Concevez‑le davantage comme une force qui obéit aux injonctions télépathiques de son créateur que comme une créature. Il n’attaque pas et ne peut pas être combattu, mais il peut être dissipé grâce au sort de maîtrise de la magie.",
    sourcePage: 96,
  },
  {
    id: 'invocation-r3',
    nom: 'Arme de mana',
    voieId: 'invocation',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le sort crée une lame d’énergie lumineuse pendant [rang] rounds. Dès le premier round et à chaque round suivant, l’ensorceleur peut lui ordonner d’attaquer une cible de son choix à portée (action gratuite, portée 20 m). La lame doit réussir un test d’attaque magique contre la DEF de l’adversaire. Elle inflige [1d4° + CHA] DM en cas de réussite. L’ensorceleur ne peut maintenir actif qu’un seul sort d’arme de mana à la fois.",
    sourcePage: 96,
  },
  {
    id: 'invocation-r4',
    nom: 'Porte dimensionnelle',
    voieId: 'invocation',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "L’ensorceleur se téléporte lui‑même et jusqu’à un allié par point de CHA à une distance maximale de 60 m. Le lieu d’arrivée doit être en vue.",
    sourcePage: 96,
  },
  {
    id: 'invocation-r5',
    nom: 'Mur de mana',
    voieId: 'invocation',
    rang: 5,
    estSort: true,
    typesAction: ['A'],
    texte:
      "L’ensorceleur crée un mur de force invisible et indestructible (portée 10 m, maximum 5 m de haut et 10 m de long, vertical, sans coudes), ou bien un hémisphère de 3 m de rayon centré sur lui‑même, tous les deux immobiles. Le sort dure CHA minutes. Aucune matière ni force ne peut passer à travers le mur de force. En revanche, les attaques mentales ne sont pas stoppées et une porte dimensionnelle (ou une téléportation) permet de le franchir.",
    sourcePage: 96,
  },

  // ===================== FORGESORT =====================

  // --- Voie des artefacts (p. 97) ---
  {
    id: 'artefacts-r1',
    nom: 'Bâton de mage',
    voieId: 'artefacts',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      "Lorsqu’il utilise son bâton, le forgesort inflige [1d4°+INT] DM magiques. À partir du rang 3, au prix d’une action limitée, il peut utiliser sa valeur d’attaque magique pour une attaque au contact et il inflige [2d4°+INT] DM dans un éclair d’énergie ! Si le forgesort fait l’acquisition d’un bâton magique, les bonus de celui‑ci s’ajouteront normalement à l’attaque et aux DM (de même pour le bonus de feu de la voie du métal).",
    sourcePage: 97,
  },
  {
    id: 'artefacts-r2',
    nom: 'Ouverture ‑ fermeture',
    voieId: 'artefacts',
    rang: 2,
    estSort: true,
    typesAction: ['M'],
    texte:
      "Le forgesort peut ouvrir une porte fermée à clef en la touchant, il doit réussir un test d’attaque magique contre la difficulté pour la crocheter. Il peut aussi sceller une porte ou un coffre pour INT minutes. Seul un mot de commande qu’il choisit permet d’ouvrir l’objet. Celui‑ci peut toujours être brisé par la force, mais il bénéficie d’un bonus de +5 en solidité et en RD pour toute la durée du sort. À partir du rang 4, le forgesort peut rendre ce sort permanent en sacrifiant une gemme d’une valeur de 100 pa et en prolongeant l’incantation par un rituel de 10 min.",
    sourcePage: 97,
  },
  {
    id: 'artefacts-r3',
    nom: 'Sac sans fond',
    voieId: 'artefacts',
    rang: 3,
    estSort: false,
    typesAction: [],
    texte:
      "Le forgesort possède un sac magique dans lequel il peut entreposer 50 kg de matériel par rang dans la voie, tandis que le sac semble toujours peser un kilogramme. Le sac ne fonctionne pas si on tente d’y mettre une créature vivante. Le sac est de plus capable de fournir au forgesort les objets qu’il désire. Une fois par heure, il peut en retirer un ou plusieurs objets dont la valeur totale ne dépasse pas 25 pa, le poids 50 kg, la circonférence 1 m et le volume 1 m3. Ces objets ont hélas la propriété de disparaître au bout d’une heure. De ce fait, la nourriture magique retirée du sac ne nourrit pas vraiment celui qui la consomme.",
    sourcePage: 97,
  },
  {
    id: 'artefacts-r4',
    nom: 'Frappe des arcanes',
    voieId: 'artefacts',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le forgesort frappe le sol de son bâton et provoque une onde dévastatrice dans un rayon de 10 m autour de lui. Toutes les créatures dans la zone subissent automatiquement [3d4°+INT] DM et doivent réussir un test de FOR difficulté [10 + INT] pour ne pas être renversées.",
    sourcePage: 97,
  },
  {
    id: 'artefacts-r5',
    nom: 'Artefact étrange',
    voieId: 'artefacts',
    rang: 5,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le forgesort crée un artefact qu’il est le seul à pouvoir utiliser et dont la description est laissée au soin du joueur. L’artefact permet d’utiliser les capacités de rang 5 suivantes chacune une fois par jour au prix d’une action limitée : Téléportation (voie de la magie universelle, magicien), Interruption du temps (voie de la magie protectrice, magicien), Forme éthérée (voie de l’air, ensorceleur), Prescience (voie de la divination, ensorceleur). À chaque utilisation, le joueur doit lancer 1d6 : sur un résultat de 1 ou 2, l’artefact ne fonctionne pas, le forgesort doit réparer l’artefact lors d’une récupération rapide avant de pouvoir faire une nouvelle tentative de ce pouvoir (il peut tenter d’utiliser les autres pouvoirs normalement).",
    sourcePage: 97,
  },

  // --- Voie des élixirs (p. 98) ---
  {
    id: 'elixirs-r1',
    nom: 'Fortifiant',
    voieId: 'elixirs',
    rang: 1,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Un breuvage qui guérit immédiatement 1d4° PV et permet de gagner un dé bonus aux trois prochains tests effectués dans une période de 30 min. En plus de cette recette, grâce à ses études, le forgesort ajoute son rang + 2 aux tests d’alchimie et de chimie ou pour identifier une potion (test difficulté 10 + rang du sort).",
    sourcePage: 98,
  },
  {
    id: 'elixirs-r2',
    nom: 'Feu grégeois',
    voieId: 'elixirs',
    rang: 2,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le forgesort lance la fiole à une distance maximale de 10 m (réussite automatique). Le contenu explose dans un rayon de 3 m en infligeant 2d4° DM. Un test d’AGI difficulté [10 + INT du forgesort] réussi permet aux victimes de diviser les DM par deux. Les DM passent à 3d4° au rang 4 et 4d4° au rang 5.",
    sourcePage: 98,
  },
  {
    id: 'elixirs-r3',
    nom: 'Élixir de guérison',
    voieId: 'elixirs',
    rang: 3,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le forgesort peut préparer un élixir qui soigne [2d4°+INT] PV au bout d’une minute ou guérit un empoisonnement de manière instantanée.",
    sourcePage: 98,
  },
  {
    id: 'elixirs-r4',
    nom: 'Élixirs mineurs',
    voieId: 'elixirs',
    rang: 4,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le forgesort apprend à préparer des élixirs parmi Forme gazeuse, Maîtrise des éléments, Chute ralentie (voies de magicien) et Masque mortuaire (voie de sorcier). Il choisit un nombre d’élixirs égal à sa valeur d’INT (pour un maximum de 4).",
    sourcePage: 98,
  },
  {
    id: 'elixirs-r5',
    nom: 'Élixirs majeurs',
    voieId: 'elixirs',
    rang: 5,
    estSort: false,
    typesAction: ['L'],
    texte:
      "Le forgesort apprend à préparer des élixirs parmi Invisibilité, Vol, Accélération (voies de magicien) et Masque du prédateur (voie de druide). Il choisit un nombre d’élixirs égal à sa valeur d’INT (pour un maximum de 4). Ces préparations comptent pour deux élixirs.",
    sourcePage: 98,
  },

  // --- Voie du métal (p. 99) ---
  {
    id: 'metal-r1',
    nom: 'Morsure de la forge',
    voieId: 'metal',
    rang: 1,
    estSort: true,
    typesAction: ['M'],
    texte:
      "Au prix d’une action de mouvement, le forgesort peut enflammer son bâton ou son marteau pendant INT minutes et ajoute +2 DM de feu sur les attaques au contact réalisées avec cette arme. Ce bonus augmente de +1 chaque fois que le personnage atteint le rang 4 dans une voie de forgesort. L’arme s’éteint immédiatement s’il la lâche. En plus de ce sort, le forgesort ajoute son rang + 2 aux tests d’orfèvrerie ou de forge.",
    sourcePage: 99,
  },
  {
    id: 'metal-r2',
    nom: 'Métal brûlant',
    voieId: 'metal',
    rang: 2,
    estSort: true,
    typesAction: ['M'],
    texte:
      "Le forgesort doit réussir un test opposé d’attaque magique (portée 20 m) pour faire chauffer un objet métallique porté par sa cible pendant [1d4+INT] rounds. S’il s’agit d’une arme, elle inflige 1 DM par round à son porteur et un malus de ‑2 aux tests d’attaque. S’il s’agit d’une armure, elle inflige 1d4° DM par round à son porteur (au tour du forgesort). La victime peut se débarrasser précipitamment de son armure au prix d’une action limitée (elle perd le bonus de DEF associé ; dans le cas d’un adversaire, le MJ devra évaluer ce montant).",
    sourcePage: 99,
  },
  {
    id: 'metal-r3',
    nom: 'Magnétisme',
    voieId: 'metal',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le forgesort contrôle le magnétisme autour de lui pendant INT minutes. Il obtient un bonus de +2 en DEF contre les attaques des armes métalliques (au contact ou à distance). De plus, il divise par deux les DM de tous les projectiles à pointes métalliques (flèches, carreaux, armes de lancer, etc.).",
    sourcePage: 99,
  },
  {
    id: 'metal-r4',
    nom: 'Métal hurlant',
    voieId: 'metal',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Sur un test opposé d’attaque magique réussi (portée 10 m), le forgesort déforme une pièce d’équipement métallique portée par sa cible. Une arme devient inutilisable et bonne pour le rebut, une armure impose l’utilisation d’un dé malus à tous les tests d’attaque et d’AGI de son porteur. La victime peut se débarrasser de son armure au prix d’une action limitée. Si l’objet est magique, le sort ne fait effet que pendant un seul round (et ne peut pas être renouvelé). Appliqué à une structure (par exemple, une porte blindée), ce sort inflige 3d4° DM en divisant par deux sa RD.",
    sourcePage: 99,
  },
  {
    id: 'metal-r5',
    nom: 'Endurer',
    voieId: 'metal',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Le forgesort est habitué aux travaux et à la chaleur de la forge. Il divise par deux tous les DM de feu subis et augmente sa CON de +1. Désormais, il obtient un dé bonus aux tests de CON. Finalement, il peut ajouter sa valeur de CON au nombre de PM qu’il obtient.",
    sourcePage: 99,
  },

  // --- Voie du golem (p. 100) ---
  {
    id: 'golem-r1',
    nom: 'Grosse tête',
    voieId: 'golem',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      "Le forgesort remplace la force brutale par un peu de réflexion. Il peut effectuer un test d’INT au lieu d’un test de FOR (par exemple, il utilise un levier pour déplacer une lourde charge). De plus, au niveau où il acquiert cette capacité, il peut ajouter son INT à ses PV au lieu de la CON. Il ajoute son rang + 2 à tous les tests de bricolage ou de science.",
    sourcePage: 100,
  },
  {
    id: 'golem-r2',
    nom: 'Golem',
    voieId: 'golem',
    rang: 2,
    estSort: false,
    typesAction: [],
    texte:
      "Le golem est une créature humanoïde fabriquée par le forgesort pour lui servir de serviteur et de garde du corps. Il comprend des ordres simples, comme suivre, attaquer, monter la garde, mais il est incapable d’actions complexes ou nécessitant une motricité fine (comme de la couture par exemple !).\n\nGOLEM\nCRÉATURE NON VIVANTE\n| AGI ‑1 | CON +10 | FOR +1 | PER ‑3 | | CHA ‑4 | INT ‑3 | VOL +4 |\n(S) Défense [10 + rang dans la voie] (V) Points de vigueur [niv. du forgesort × 5] (I) Initiative [Init. du forgesort]\nAttaque [attaque magique du forgesort] · DM 1d4°+1",
    sourcePage: 100,
  },
  {
    id: 'golem-r3',
    nom: 'Protecteur',
    voieId: 'golem',
    rang: 3,
    estSort: false,
    typesAction: ['G'],
    texte:
      "Une fois par round, s’il est au contact d’un personnage, le golem peut s’interposer et subir les DM d’une attaque à sa place.",
    sourcePage: 100,
  },
  {
    id: 'golem-r4',
    nom: 'Statuette',
    voieId: 'golem',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le forgesort transforme son golem en statuette d’une douzaine de centimètres de haut, recouverte de runes. Sous forme de statuette, le golem ne peut pas agir, mais il bénéficie d’une RD 10. À tout moment, le forgesort peut utiliser une action de mouvement pour jeter la figurine au sol et lui rendre sa taille normale et toutes ses fonctions.",
    sourcePage: 100,
  },
  {
    id: 'golem-r5',
    nom: 'Golem supérieur',
    voieId: 'golem',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Le forgesort peut améliorer son golem en choisissant une option parmi les suivantes. Le joueur peut choisir une option différente supplémentaire à chaque fois qu’il atteint le rang 5 dans une voie de forgesort.\n Armure : +5 en DEF\n Forme de félin : +3 en AGI et en DEF, dé bonus en AGI\n Baliste : portée 20 m, [1d4°+AGI] DM\n Grande taille : +2 PV par niveau et +1 en FOR et DM\n Vol : des « sauts » de 40 m en action limitée\n Cerveau amélioré : +2 en INT, PER et CHA, doué de parole\n Puissant : +2 en FOR et aux DM, dé bonus en FOR\n Arme à deux mains : +1d4° aux DM au contact",
    sourcePage: 100,
  },

  // --- Voie des runes (p. 101) ---
  {
    id: 'runes-r1',
    nom: 'Runes de défense',
    voieId: 'runes',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      "Le forgesort inscrit des runes de protection sur l’ensemble de son équipement et parfois jusque sur sa peau. Il obtient un bonus de +2 en DEF. Ce bonus augmente de +1 au rang 3 puis au rang 5. S’il possède un golem, il peut inscrire les runes sur celui‑ci avec le même effet.\n\nPROFIL HYBRIDE\nExceptionnellement, un profil hybride peut utiliser cette capacité avec une armure qu’il est capable de porter, supérieure à l’armure de cuir, bien que, dans ce cas, le bonus de DEF soit alors divisé par deux (+1 en DEF au rang 1, +2 au rang 4). Bien que cette capacité ne soit pas considérée comme un sort, elle requiert au moins +1 en INT pour être apprise, comme toutes les runes de forgesort.",
    sourcePage: 101,
  },
  {
    id: 'runes-r2',
    nom: 'Rune de puissance',
    voieId: 'runes',
    rang: 2,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Le forgesort enchante une arme pour 24 h. Une fois par combat, celle‑ci peut d’infliger les DM maximaux sur une attaque au contact ou à distance. Les dés bonus ne sont pas maximisés (attaque sournoise ou puissante, rage, etc.). Le joueur doit annoncer l’utilisation de la rune avant de lancer les dés de DM.",
    sourcePage: 101,
  },
  {
    id: 'runes-r3',
    nom: 'Rune de protection',
    voieId: 'runes',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le forgesort enchante une armure (ou des vêtements) pour 24 h. Une fois par jour, celle‑ci permet d’ignorer les dommages d’une attaque que le personnage subit (au contact, magique ou à distance). Si l’attaque est un critique, le personnage subit tout de même les DM normaux (non‑critique). Pour activer la rune, le personnage doit être conscient et ne pas être surpris (action gratuite). Le joueur doit activer la rune avant de connaître le montant des DM.",
    sourcePage: 101,
  },
  {
    id: 'runes-r4',
    nom: 'Rune d’énergie',
    voieId: 'runes',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le forgesort enchante un bijou pour une durée de 24 h. Une fois par combat, celui‑ci permet d’obtenir un d20 bonus sur un test de son choix déterminé au moment où l’effet est utilisé : test d’attaque ou de caractéristique.",
    sourcePage: 101,
  },
  {
    id: 'runes-r5',
    nom: 'Rune de garde',
    voieId: 'runes',
    rang: 5,
    estSort: true,
    typesAction: [],
    texte:
      "En réalisant un rituel de 10 min, le forgesort inscrit des runes invisibles au sol. Il protège une zone allant jusqu’à 10 m de diamètre pendant 12 h. À chaque fois qu’une créature (de taille au moins très petite) pénètre dans la zone protégée, le sort produit un effet choisi (voir ci‑après) au moment où le sort est lancé. Les créatures présentes dans la zone pendant le rituel ne déclenchent pas le sort. Ce sort peut aussi être utilisé sur une porte ou un coffre. Il est automatiquement lancé avec la règle de concentration et coûte seulement 3 PM pour être lancé.\n Alarme : un puissant gong retentit et la cible est étourdie pendant 1 round à moins de réussir un test de CON difficulté 15.\n Feu : [3d4°+INT] DM de feu (un autre élément peut être choisi parmi foudre, froid, acide).",
    sourcePage: 101,
  },

  // ===================== MAGICIEN =====================

  // --- Voie de la magie des arcanes (p. 103) ---
  {
    id: 'magie-des-arcanes-r1',
    nom: 'Projectile de mana',
    voieId: 'magie-des-arcanes',
    rang: 1,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien choisit une cible visible située à moins de 30 m et lance sur elle un projectile d’énergie ésotérique pure, déformant la trame de la réalité. La cible subit automatiquement 1d4° DM. Si le joueur obtient le résultat maximal sur son dé de dommages, il peut le relancer et ajouter le nouveau résultat (une seule fois). Les DM du projectile de mana augmentent de +1 chaque fois que le personnage atteint le rang 4 dans une voie de magicien jusqu’à un maximum égal à sa valeur d’INT.",
    sourcePage: 103,
  },
  {
    id: 'magie-des-arcanes-r2',
    nom: 'Lévitation',
    voieId: 'magie-des-arcanes',
    rang: 2,
    estSort: true,
    typesAction: ['M'],
    texte:
      "Le magicien peut se déplacer verticalement de 5 m par action de mouvement vers le haut ou de 10 m vers le bas pendant INT minutes. Rester en vol stationnaire à la même hauteur demande une action de mouvement.",
    sourcePage: 103,
  },
  {
    id: 'magie-des-arcanes-r3',
    nom: 'Forme gazeuse',
    voieId: 'magie-des-arcanes',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien prend la consistance d’un gaz pendant 1 min. Il se déplace au ras du sol (s’il chute, il le fait au ralenti) à une vitesse de 5 m par action de mouvement (M). Il peut s’introduire par les plus petits interstices (comme sous une porte), mais ne peut utiliser aucune capacité. Sous cette forme, les armes ordinaires ne lui infligent aucun DM, mais la magie et les armes magiques l’affectent normalement.",
    sourcePage: 103,
  },
  {
    id: 'magie-des-arcanes-r4',
    nom: 'Accélération',
    voieId: 'magie-des-arcanes',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien voit son métabolisme s’accélérer pendant [1d4°+INT] rounds. Il reçoit immédiatement une action de mouvement supplémentaire, puis une action de mouvement supplémentaire à chaque round. À son tour, il peut choisir de sacrifier cette action de mouvement pour obtenir au choix +3 en DEF pendant un round ou ‑1 PM sur le lancement d’un sort à ce round. Il est possible de cumuler cette réduction de ‑1 PM avec une Concentration (L) (voir le chapitre « La magie », page 227). Par exemple, une Désintégration lancée de cette façon coûtera 5 – 2 – 1 = 2 PM.",
    sourcePage: 103,
  },
  {
    id: 'magie-des-arcanes-r5',
    nom: 'Désintégration',
    voieId: 'magie-des-arcanes',
    rang: 5,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien projette un rayon mortel dont la portée est de 20 m et qui annule la cohésion de la matière, ne laissant derrière lui qu’un amas de poussière. Un test d’attaque magique réussi contre la DEF de la cible inflige [5d4°+INT] DM. Si le magicien vise un objet porté par une créature, le test d’attaque subit un dé malus. Les objets magiques sont insensibles à ce sort et les objets normaux (jusqu’à 100 kg) sont réduits en poussière. Une créature réduite à 0 PV par ce sort est proprement désintégrée, ne laissant aucun cadavre derrière elle ! (Ses objets magiques sont épargnés).",
    sourcePage: 103,
  },

  // --- Voie de la magie destructrice (p. 103) ---
  {
    id: 'magie-destructrice-r1',
    nom: 'Arc de feu',
    voieId: 'magie-destructrice',
    rang: 1,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Des flammes jaillissent des doigts tendus du magicien. Jusqu’à 3 cibles au contact subissent [1d4°+INT] DM, les cibles peuvent faire un test d’AGI difficulté [10 + INT] pour ne subir que la moitié des DM. Les DM passent à 2d4° au rang 4.",
    sourcePage: 103,
  },
  {
    id: 'magie-destructrice-r2',
    nom: 'Saper les forces',
    voieId: 'magie-destructrice',
    rang: 2,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien choisit une cible vivante située à une distance maximum de 10 m. S’il réussit un test opposé d’attaque magique, la cible subit un malus de ‑2 à ses tests de FOR, d’attaque au contact et aux DM, jusqu’à la fin du combat. Le sort n’est pas cumulable plusieurs fois sur la même cible.",
    sourcePage: 103,
  },
  {
    id: 'magie-destructrice-r3',
    nom: 'Flèche de feu',
    voieId: 'magie-destructrice',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien choisit une cible située à moins de 30 m. Si son attaque magique réussit (contre DEF), la cible subit [3d4°+INT] DM. Chaque round de combat suivant, le feu inflige 1d6 DM supplémentaires. Sur un résultat de 1 ou 2, le sort prend fin. Les DM sur la durée ne sont pas cumulables si le sort est lancé plusieurs fois.",
    sourcePage: 103,
  },
  {
    id: 'magie-destructrice-r4',
    nom: 'Explosion de feu',
    voieId: 'magie-destructrice',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien choisit un point situé à moins de 30 m. Toutes les créatures (y compris le magicien et ses compagnons) se trouvant dans un rayon de 5 m autour de ce point subissent [4d4°+INT] DM et peuvent effectuer un test d’AGI difficulté [10 + INT] pour ne subir que la moitié des DM.",
    sourcePage: 103,
  },
  {
    id: 'magie-destructrice-r5',
    nom: 'Appel de la foudre',
    voieId: 'magie-destructrice',
    rang: 5,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien projette des traits de foudre sur toutes les cibles de son choix dans un rayon de 10 m autour de lui. Il fait un seul test d’attaque magique et toutes les créatures ciblées dont il atteint la DEF subissent [2d4°+INT] DM d’électricité.",
    sourcePage: 103,
  },

  // --- Voie de la magie élémentaire (p. 104) ---
  {
    id: 'magie-elementaire-r1',
    nom: 'Asphyxie',
    voieId: 'magie-elementaire',
    rang: 1,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Si le magicien réussit un test opposé d’attaque magique (avec une portée de 20 m), la créature ciblée est privée d’air. La victime étouffe progressivement et subit 1d4° DM par round pendant INT rounds. Les créatures qui ne respirent pas (morts‑vivants, créatures artificielles) sont immunisées à ce sort. En revanche, les réductions de dommages (voie du colosse, par exemple) ne s’appliquent pas.",
    sourcePage: 104,
  },
  {
    id: 'magie-elementaire-r2',
    nom: 'Maîtrise des éléments',
    voieId: 'magie-elementaire',
    rang: 2,
    estSort: true,
    typesAction: ['M'],
    texte:
      "Le magicien retranche son rang + 2 à tous les DM de feu, de froid, d’électricité ou d’acide subis pendant INT minutes. De plus, pendant la durée du sort, lorsqu’il lance un sort d’un élément, le magicien peut échanger un élément contre un autre (par exemple, une explosion de froid ou une flèche acide).",
    sourcePage: 104,
  },
  {
    id: 'magie-elementaire-r3',
    nom: 'Arme élémentaire',
    voieId: 'magie-elementaire',
    rang: 3,
    estSort: true,
    typesAction: ['A', 'L'],
    texte:
      "Le magicien peut enchanter, en la touchant, une arme au contact ou à distance pour INT minutes. S’il s’agit de son arme, l’incantation est une action d’attaque (A) ; si elle appartient à autrui, c’est une action limitée (L). Si l’arme change de main, le sort prend fin. L’arme inflige +1d4° DM de feu, de froid, d’électricité ou d’acide en plus des DM habituels. Le magicien doit choisir l’élément au moment de l’incantation. Tant qu’il tient l’arme élémentaire en main, les sorts basés sur cet élément lui coûtent 1 PM de moins pour être lancés (par exemple, Mains brûlantes ou Explosion de feu s’il a enflammé son bâton). Ce sort ne fait aucun effet sur une arme qui bénéficie déjà d’un bonus élémentaire aux DM.",
    sourcePage: 104,
  },
  {
    id: 'magie-elementaire-r4',
    nom: 'Respiration aquatique',
    voieId: 'magie-elementaire',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien peut respirer sous l’eau pendant 10 minutes. Cette capacité peut être étendue à un compagnon par point d’INT.",
    sourcePage: 104,
  },
  {
    id: 'magie-elementaire-r5',
    nom: 'Armure de pierre',
    voieId: 'magie-elementaire',
    rang: 5,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Pendant INT minutes, le magicien retranche 5 points à tous les DM subis. Le sort prend fin dès qu’il a absorbé [niveau du magicien × 3] DM. Cette réduction se cumule à celle offerte par la Maîtrise des éléments. Armure de pierre est incompatible avec le sort Déphasage (voie de la magie protectrice), il y met fin immédiatement.",
    sourcePage: 104,
  },

  // --- Voie de la magie protectrice (p. 104) ---
  {
    id: 'magie-protectrice-r1',
    nom: 'Armure de mana',
    voieId: 'magie-protectrice',
    rang: 1,
    estSort: true,
    typesAction: ['M'],
    texte:
      "Le magicien fait apparaître une protection magique chatoyante qui recouvre son corps et produit des étincelles à chaque fois qu’il encaisse un coup. Pendant INT minutes, la DEF du magicien augmente de +3. Cette valeur passe à +4 lorsque le personnage atteint le rang 3 dans la voie et augmente de +1 supplémentaire chaque fois que le personnage atteint le rang 5 dans une voie de magicien (ou dans la voie du mage). Ce sort ne se cumule jamais à une armure (il est considéré comme une armure).",
    sourcePage: 104,
  },
  {
    id: 'magie-protectrice-r2',
    nom: 'Chute ralentie',
    voieId: 'magie-protectrice',
    rang: 2,
    estSort: true,
    typesAction: ['G'],
    texte:
      "Le magicien peut désigner un nombre de cibles maximal (dont lui‑même) égal à son INT à une portée de 10 m, même en dehors de son tour. Les cibles peuvent chuter de n’importe quelle hauteur sans subir de dommages. En cas de chute inattendue, le magicien doit faire un test d’INT difficulté 15 pour chacun de ses compagnons afin d’avoir le temps de lancer le sort (réussite automatique sur lui‑même).",
    sourcePage: 105,
  },
  {
    id: 'magie-protectrice-r3',
    nom: 'Déphasage',
    voieId: 'magie-protectrice',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Pendant [1d4°+INT] rounds, le corps du magicien se désincarne par intermittence, son image se brouille et tous les DM des attaques de contact ou à distance qu’il subit et qu’il inflige sont divisés par 2. Les DM des sorts ne sont pas réduits. Un personnage sous l’effet d’un sort d’armure de pierre ne peut se déphaser.",
    sourcePage: 105,
  },
  {
    id: 'magie-protectrice-r4',
    nom: 'Cercle de protection',
    voieId: 'magie-protectrice',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien peut tracer un cercle sur le sol (environ 2 m de diamètre) afin de se protéger et d’inclure à sa protection un nombre de personnes égal à son INT. Une fois par round, lorsqu’un sort prend pour cible un personnage protégé, le magicien fait un test d’attaque magique opposé avec l’auteur du sort. Si le test est réussi, le sort adverse est annulé et n’a aucun effet. De plus, toutes les créatures invoquées (élémentaires, démons) et les morts‑vivants qui veulent attaquer une créature dans le cercle subissent un dé malus en attaque. Si le magicien sort du cercle, le sort est dissipé.",
    sourcePage: 105,
  },
  {
    id: 'magie-protectrice-r5',
    nom: 'Interruption du temps',
    voieId: 'magie-protectrice',
    rang: 5,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Après avoir lancé ce sort, le personnage bénéficie d’INT rounds complets hors du temps durant lesquels il peut utiliser des sorts ou des objets (potions) sur lui‑même. Il ne peut interagir avec son environnement, ni se déplacer, seulement utiliser son propre équipement ou ses capacités sur lui‑même.",
    sourcePage: 105,
  },

  // --- Voie de la magie universelle (p. 106) ---
  {
    id: 'magie-universelle-r1',
    nom: 'Lumière',
    voieId: 'magie-universelle',
    rang: 1,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Le magicien désigne un objet à moins de 10 m. Celui‑ci produit de la lumière dans un rayon de 10 m pendant INT heures. Cette source de lumière n’émet pas de chaleur. Une fois par combat, le magicien peut lancer ce sort sur les yeux d’une créature dont le NC ne dépasse pas le rang atteint dans la voie. S’il réussit un test opposé d’attaque magique, elle est aveuglée pendant 1 round.",
    sourcePage: 106,
  },
  {
    id: 'magie-universelle-r2',
    nom: 'Familier',
    voieId: 'magie-universelle',
    rang: 2,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien choisit un petit animal (écureuil, corbeau, chat, dragonnet). Il peut utiliser les sens de son familier (voir par ses yeux, entendre ce qu’il entend, etc.) et communiquer avec lui à distance illimitée. Il gagne +2 en Initiative et en DEF lorsque son familier est en vue.\nS’il est réduit à 0 PV, le familier disparaît dans un nuage de fumée et le personnage perd 1d4° PV en contrecoup. Toutefois, le maître pourra à nouveau invoquer son familier dès qu’il aura terminé une récupération complète (c’est toujours le même animal qui apparaît). Le familier récupère tous les PV perdus après une récupération rapide.\n\nFAMILIER\n| AGI +3* | CON 0 | FOR ‑4 | PER +2 | | CHA ‑2 | INT ‑2 | VOL +2 |\n(S) Défense [13 + rang dans la voie] (V) Points de vigueur [niveau du magicien] (I) Initiative [Init. du magicien]\nUn familier est une créature trop petite pour attaquer et infliger des dommages.",
    sourcePage: 106,
  },
  {
    id: 'magie-universelle-r3',
    nom: 'Invisibilité',
    voieId: 'magie-universelle',
    rang: 3,
    estSort: true,
    typesAction: ['A', 'L'],
    texte:
      "Le magicien se rend invisible pendant [1d4°+INT] minutes. Une fois invisible, personne ne peut plus détecter sa présence ou lui porter d’attaque directe. Si le magicien attaque, il redevient visible. À partir du rang 5, le magicien peut lancer ce sort sur un allié au prix d’une action limitée.",
    sourcePage: 106,
  },
  {
    id: 'magie-universelle-r4',
    nom: 'Vol',
    voieId: 'magie-universelle',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le magicien peut voler pendant [2d4°+INT] minutes. Sa vitesse de déplacement est la même qu’au sol. Il peut rester en vol stationnaire s’il le désire et cela est une action gratuite.",
    sourcePage: 106,
  },
  {
    id: 'magie-universelle-r5',
    nom: 'Téléportation',
    voieId: 'magie-universelle',
    rang: 5,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Une fois par jour, le magicien disparaît et réapparaît à un autre endroit situé à moins de (niveau x INT) kilomètres. Le lieu d’arrivée doit être soit en vue, soit parfaitement connu par le magicien. Le magicien peut emmener avec lui un allié à partir du niveau 10, un deuxième au niveau 13, un troisième au niveau 16 et enfin un quatrième au niveau 19.",
    sourcePage: 106,
  },

  // ===================== SORCIER =====================

  // --- Voie du démon (p. 107) ---
  {
    id: 'demon-r1',
    nom: 'Malédiction',
    voieId: 'demon',
    rang: 1,
    estSort: true,
    typesAction: ['M', 'L'],
    texte:
      "Le sorcier effectue un test opposé d’attaque magique contre une cible à moins de 20 m. En cas de succès, si l’incantation était une action de mouvement (M), la victime subit un dé malus à son prochain test. Si l’incantation était une action limitée (L), le dé malus s’applique à ses 3 prochains tests. Dans tous les cas, la cible ne peut subir les effets de ce sort qu’une fois par combat.",
    sourcePage: 107,
  },
  {
    id: 'demon-r2',
    nom: 'Beauté de la succube',
    voieId: 'demon',
    rang: 2,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Le sorcier acquiert une beauté fascinante pour INT minutes. Il gagne un dé bonus aux tests de CHA ainsi qu’une attaque de contact nécessitant un test d’attaque magique (contre DEF, action d’attaque), qui inflige [1d4°+INT] DM. Le sorcier récupère autant de PV (sans dépasser son maximum de PV) que la cible en a perdu.",
    sourcePage: 107,
  },
  {
    id: 'demon-r3',
    nom: 'Pacte démoniaque',
    voieId: 'demon',
    rang: 3,
    estSort: false,
    typesAction: ['G'],
    texte:
      "Le sorcier sacrifie 1d4° PV et gagne immédiatement +INT sur le résultat d’un d20 qu’il vient de lancer ou en DEF contre une attaque (avant de savoir si une attaque touche). De plus, il ajoute désormais sa VOL au nombre de dés de récupération (DR) qu’il possède.",
    sourcePage: 107,
  },
  {
    id: 'demon-r4',
    nom: 'Aspect du démon',
    voieId: 'demon',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le sorcier prend l’apparence d’un démon ailé pendant INT minutes. Il gagne un dé bonus en attaque au contact et +5 en DEF et à tous les tests physiques (FOR, AGI, CON), mais il ne peut pas utiliser d’arme (ni les arts martiaux). Il peut faire deux attaques de griffes à [1d4°+INT] DM à chaque tour, en action limitée (une seule en action d’attaque) et il peut voler de 10 m par action de mouvement.\nNote : Ne se cumule pas avec la Beauté de la succube.",
    sourcePage: 107,
  },
  {
    id: 'demon-r5',
    nom: "Invocation d’un démon",
    voieId: 'demon',
    rang: 5,
    estSort: true,
    typesAction: ['L'],
    texte:
      "En sacrifiant 1d4° PV, le sorcier invoque un démon à son service pour INT minutes. Ce démon possède l’apparence d’un humanoïde musclé d’environ 2,30 m doté d’une épée et d’ailes de chauve‑souris. Le démon divise par deux tous les DM non magiques subis, les sorts et les armes magiques lui infligent des DM normaux. Il est capable de voler à une vitesse équivalente à un déplacement normal. Lorsque le sorcier atteint le niveau 15, le démon devient capable d’attaquer deux fois à son tour, au prix d’une action limitée.\n\nDÉMON\n| AGI +2 | CON +4* | FOR +5* | PER +2 | | CHA +0 | INT +2 | VOL +4 |\n(S) Défense 18 (V) Points de vigueur [niveau du sorcier × 5] (I) Initiative [Init. du sorcier]\nAttaque au contact [attaque magique du sorcier] · DM 2d4°+5",
    sourcePage: 107,
  },

  // --- Voie de la mort (p. 108) ---
  {
    id: 'mort-r1',
    nom: 'Siphon des âmes',
    voieId: 'mort',
    rang: 1,
    estSort: false,
    typesAction: [],
    texte:
      "Une fois par round, lorsqu’une créature humanoïde vivante meurt à moins de 20 m du sorcier, il récupère NC PV (arrondis à 1 pour NC ½). À partir du rang 3, si la créature est de NC supérieur à 4, il peut choisir de récupérer 1 PM au lieu des PV.",
    sourcePage: 108,
  },
  {
    id: 'mort-r2',
    nom: 'Masque mortuaire',
    voieId: 'mort',
    rang: 2,
    estSort: true,
    typesAction: ['M'],
    texte:
      "Le sorcier prend l’apparence de la mort pendant INT minutes. Il est alors considéré non‑vivant et devient immunisé à la plupart des pouvoirs des morts‑vivants (drain de vigueur et affaiblissement, paralysie de la goule, etc.). De plus, ceux‑ci le prennent pour l’un des leurs. Il divise par deux tous les DM de froid. Il ne peut pas bénéficier de soins tant qu’il est sous l’effet de ce sort.\nNote : Les créatures non vivantes sont infatigables, ne respirent pas et sont immunisées aux maladies, aux poisons et à la plupart des attaques qui demandent un test de CON. Elles voient dans le noir comme dans de la pénombre à une distance de 30 m.",
    sourcePage: 108,
  },
  {
    id: 'mort-r3',
    nom: 'Baiser du vampire',
    voieId: 'mort',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Ce sort nécessite la réussite d’un test opposé d’attaque magique (portée 30 m). La victime subit [2d4°+INT] DM et le sorcier récupère autant de PV (sans dépasser son maximum de PV).",
    sourcePage: 108,
  },
  {
    id: 'mort-r4',
    nom: 'Peur',
    voieId: 'mort',
    rang: 4,
    estSort: true,
    typesAction: ['A', 'L'],
    texte:
      "Le sorcier effectue un test opposé d’attaque magique contre une cible (portée 20 m). S’il l’emporte, la victime fuit aussi loin du sorcier que possible pendant INT rounds (il lui faut généralement autant de temps pour revenir !). Les créatures dont le NC est supérieur ou égal au niveau du sorcier ne fuient qu’un seul round. Le sorcier peut choisir de lancer ce sort en action limitée et toutes les créatures à son contact sont affectées (faire un test d’attaque magique par adversaire).",
    sourcePage: 108,
  },
  {
    id: 'mort-r5',
    nom: 'Briser les cœurs',
    voieId: 'mort',
    rang: 5,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le sorcier fait mine d’arracher le cœur de sa victime, puis de broyer dans sa main (l’image du cœur de la victime apparaît dans la main du sorcier). Il doit faire un test opposé d’attaque magique contre une cible vivante (portée 20 m) et, en cas de réussite, il inflige [5d4°+INT] DM, la moitié en cas de test raté. Ce sort ne peut affecter une même cible qu’une seule fois par combat.",
    sourcePage: 108,
  },

  // --- Voie de l’outre‑tombe (p. 109) ---
  {
    id: 'outre-tombe-r1',
    nom: 'Un pied dans la tombe',
    voieId: 'outre-tombe',
    rang: 1,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le sorcier désigne une cible vivante à portée (10 m) et doit réussir un test opposé d’attaque magique. En cas de succès, la cible ressent une douleur intense à l’emplacement du cœur, elle subit [1d4°+INT] DM et, si elle rate un test de CON difficulté 10, l’état ralenti durant 1 round.",
    sourcePage: 109,
  },
  {
    id: 'outre-tombe-r2',
    nom: 'Armure d’os',
    voieId: 'outre-tombe',
    rang: 2,
    estSort: false,
    typesAction: [],
    texte:
      "Le sorcier peut désormais porter une armure d’os (souvent camouflée sous une robe) qui lui offre un bonus de +3 en DEF et n’empêche pas l’utilisation des capacités de sorcier. Son bonus de DEF augmente de +1 chaque fois que le personnage atteint le rang 4 dans une voie de sorcier. Le sorcier doit confectionner cette armure lui‑même à partir d’ossements et l’entretenir par magie 10 min chaque jour. L’armure d’os n’inflige aucun malus d’AGI.",
    sourcePage: 109,
  },
  {
    id: 'outre-tombe-r3',
    nom: 'Animation des morts',
    voieId: 'outre-tombe',
    rang: 3,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Le sorcier anime le cadavre d’un humanoïde de taille moyenne, décédé depuis moins d’INT jours. Le zombie comprend les ordres « Attaquer », « Suivre », « Garder » et « Pas bouger ». Le sorcier peut contrôler un seul zombie, plus un zombie chaque fois qu’il atteint le rang 5 dans une voie de sorcier. Un zombie réduit à 0 PV tombe en poussière.\n\nZOMBIE\n| AGI ‑1 | CON +1 | FOR +2 | PER ‑2 | | CHA ‑4 | INT ‑4 | VOL +6 |\n(S) Défense 10 (V) Points de vigueur [10 + niveau] (I) Initiative 8\nAttaque au contact [attaque magique du sorcier] · DM 1d4°+2 Le zombie se déplace de 5 m par action de mouvement.",
    sourcePage: 109,
  },
  {
    id: 'outre-tombe-r4',
    nom: 'Ensevelissement',
    voieId: 'outre-tombe',
    rang: 4,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Une fois par combat, si le sorcier réussit un test opposé d’attaque magique (portée 20 m), des mains squelettiques surgissent sous les pieds d’une cible de taille moyenne ou inférieure et l’enterrent vivante. Tant qu’elle est ensevelie, elle subit 2d4° DM par round, ne peut agir ni être la cible d’attaques extérieures. À son tour, elle peut tenter de sortir de terre en réussissant un test de FOR ou d’AGI (au choix de la cible) difficulté 15 au prix d’une action limitée. Si elle tombe à 0 PV, elle reste enterrée et décède au tour suivant. Chaque personne qui creuse pour l’aider lui octroie un bonus de +2 sur son test (maximum +10).",
    sourcePage: 109,
  },
  {
    id: 'outre-tombe-r5',
    nom: 'Armée des morts',
    voieId: 'outre-tombe',
    rang: 5,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Une fois par jour, le sorcier peut invoquer d’innombrables squelettes qui émergent du sol pour attaquer ses ennemis pendant [niveau du sorcier] rounds. Tous les adversaires situés dans un rayon de 10 m autour du sorcier subissent automatiquement 2d4° DM par round. Les squelettes se déplacent avec le sorcier, mais tous les déplacements dans cette zone (même ceux du sorcier) sont divisés par deux.",
    sourcePage: 109,
  },

  // --- Voie du sang (p. 109) ---
  {
    id: 'sang-r1',
    nom: 'Saignements',
    voieId: 'sang',
    rang: 1,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le sorcier doit réussir un test d’attaque magique (portée 10 m) contre une difficulté de [10 + CON de la cible]. Du sang s’écoule de la bouche, du nez, des oreilles et même des yeux de la victime, qui subit 1d4° DM par round pendant INT rounds.",
    sourcePage: 109,
  },
  {
    id: 'sang-r2',
    nom: 'Sang mordant',
    voieId: 'sang',
    rang: 2,
    estSort: true,
    typesAction: ['M'],
    texte:
      "Pendant INT minutes, le sang du sorcier se transforme en un acide qui gicle lorsqu’il subit une blessure. Chaque fois qu’un ennemi au contact le blesse, ce dernier subit 1d4° DM d’acide.",
    sourcePage: 109,
  },
  {
    id: 'sang-r3',
    nom: 'Exsangue',
    voieId: 'sang',
    rang: 3,
    estSort: false,
    typesAction: [],
    texte:
      "Le corps du sorcier devient cadavérique. Il gagne +2 en DEF et ce bonus passe à +3 au rang 5 (Si le personnage porte une armure autre qu’une armure d’os de sorcier, le bonus est réduit de 1 point, donc +1 DEF et +2 DEF au rang 5). De plus, lorsqu’il tombe à 0 PV, il peut continuer à agir, mais avec un dé malus à tous ses tests. S’il subit encore au moins 1 DM, il sombre dans l’inconscience.",
    sourcePage: 110,
  },
  {
    id: 'sang-r4',
    nom: 'Rituel de sang',
    voieId: 'sang',
    rang: 4,
    estSort: true,
    typesAction: ['A'],
    texte:
      "Le sorcier s’ouvre les veines et sacrifie 1d4° PV pour cibler une créature vivante (portée 20 m), la victime saigne à la moindre blessure. Tous les DM infligés à la cible par des armes tranchantes ou perçantes (griffes et crocs inclus) augmentent de +1d4° pendant INT rounds.",
    sourcePage: 110,
  },
  {
    id: 'sang-r5',
    nom: 'Lien de sang',
    voieId: 'sang',
    rang: 5,
    estSort: true,
    typesAction: ['A'],
    texte:
      "En réussissant un test opposé d’attaque magique (portée 20 m), le sorcier tisse un lien avec sa victime. Pendant INT minutes, la moitié des DM reçus par le sorcier sont également subis par la cible (les DM infligés au sorcier ne sont pas pour autant réduits) et le sorcier peut lui lancer un sort sans la voir (si elle est à portée).",
    sourcePage: 110,
  },

  // --- Voie de la sombre magie (p. 110) ---
  {
    id: 'sombre-magie-r1',
    nom: 'Ténèbres',
    voieId: 'sombre-magie',
    rang: 1,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Le sorcier invoque une zone fixe de ténèbres magiques, de 10 m de diamètre, à une portée de 20 m pour une durée d’INT minutes. Toutes les créatures, même celles capables de voir dans le noir, sont aveuglées dans cette zone. En plus de ce sort, le sorcier ajoute son rang + 2 à tous les tests d’INT basés sur les savoirs sombres (démons, morts‑vivants, rituels impies, etc.).",
    sourcePage: 110,
  },
  {
    id: 'sombre-magie-r2',
    nom: 'Reptation',
    voieId: 'sombre-magie',
    rang: 2,
    estSort: true,
    typesAction: ['M'],
    texte:
      "Pendant INT minutes, le sorcier peut ramper de 5 m par action de mouvement sur les murs et les plafonds. Il peut lancer des sorts dans cette posture.",
    sourcePage: 110,
  },
  {
    id: 'sombre-magie-r3',
    nom: 'Strangulation',
    voieId: 'sombre-magie',
    rang: 3,
    estSort: true,
    typesAction: ['A'],
    texte:
      "En réussissant un test opposé d’attaque magique (portée 20 m), le sorcier étouffe une créature vivante. La victime subit un dé malus à tous ses tests et [1d4°+INT] DM par round tant que le sorcier maintient sa concentration par une action de mouvement et la dépense de 1 PM par round. Si la victime sort de la portée du sort, il prend fin.",
    sourcePage: 111,
  },
  {
    id: 'sombre-magie-r4',
    nom: 'Manteau d’ombre',
    voieId: 'sombre-magie',
    rang: 4,
    estSort: true,
    typesAction: ['L'],
    texte:
      "Le sorcier s’enveloppe d’ombre pendant INT minutes. Il gagne un dé bonus à tous les tests de discrétion et il impose un dé malus à tous les tests d’attaque à distance qui le prennent pour cible. S’il tombe à 0 PV pendant la durée du sort, il peut choisir de disparaître dans son ombre et de réapparaître à 1d6 km dans la direction de son choix avec 1d4° PV, 1d6 min plus tard (une dissipation de la magie (Maîtrise de la magie, voie du mage) lancée sur la zone où le sorcier a disparu dans son ombre avant sa réapparition au loin fait apparaître son corps et annule l’effet). Ceci met fin au sort et interdit de le lancer de nouveau avant le prochain crépuscule.",
    sourcePage: 111,
  },
  {
    id: 'sombre-magie-r5',
    nom: 'Pacte ténébreux',
    voieId: 'sombre-magie',
    rang: 5,
    estSort: false,
    typesAction: [],
    texte:
      "Le sorcier augmente sa CON de +1. Désormais, il obtient un dé bonus aux tests de CON et voit dans le noir comme s’il s’agissait de pénombre. De plus, lorsqu’il lance un sort, il peut sacrifier 1d4° PV pour ajouter +2d4° aux DM de ce sort. S’il s’agit d’un sort dont les DM durent de round en round (comme strangulation), il peut sacrifier 1d4° PV chaque round.",
    sourcePage: 110,
  },
];
