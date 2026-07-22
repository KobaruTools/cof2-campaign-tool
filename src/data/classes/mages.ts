import type { CharacterClass, ClassPath, Feature } from '../schema';

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

export const mageClasses: CharacterClass[] = [
  {
    id: 'ensorceleur',
    name: 'Ensorceleur',
    familyId: 'mages',
    description:
      "L’ensorceleur tire son pouvoir d’un talent inné pour la magie. Il pratique une magie subtile à base de tromperie et de contrôle, et possède peu de sorts de destruction massive. Dans les Terres d’Osgild : contrairement aux magiciens, les ensorceleurs peuvent provenir de n’importe quelle zone géographique, car le don surgit au hasard. Selon les sociétés, le don peut être considéré comme une bénédiction (chez les elfes par exemple) autant que comme une malédiction (protectorat de Fer). La magie innée est souvent considérée comme la magie du pauvre, car elle ne nécessite aucune éducation pour se développer, toutefois elle traverse toutes les couches de la société. À part quelques cas avérés de pacte avec une entité puissante, l’origine du don reste relativement mystérieuse. Les gnomes, eux‑mêmes très sujets à l’apparition du don, ont toutefois avancé des théories farfelues en rapport avec les Pierres du Ciel, de puissantes sources de magie disséminées sur les Terres d’Osgild. Mais l’existence de telles pierres reste à prouver.",
    weaponsAndArmor:
      "L’ensorceleur sait manier la dague et le bâton ferré. De plus, chaque ensorceleur peut choisir une arme supplémentaire de son choix qu’il a appris à utiliser, sans dépasser 1d6 DM (malgré ses DM de 2d4, l’arbalète légère est aussi une arme éligible). Les voies d’ensorceleur interdisent de porter une armure ou d’utiliser un bouclier.",
    maxArmorId: null,
    shieldAccess: 'none',
    meleeAccess: 'none',
    rangedAccess: 'none',
    allowedWeaponIds: ['dague', 'baton-ferre'],
    weaponNotes:
      "+ une arme supplémentaire au choix (≤ 1d6 DM ; l'arbalète légère est éligible malgré ses 2d4).",
    startingEquipment: [
      { itemId: 'baton-ferre', label: 'Bâton ferré (DM 1d6)', quantity: 1 },
      { itemId: 'dague', label: 'Dague (DM d4) ou autre arme maîtrisée au choix', quantity: 1 },
    ],
    pathIds: ['air', 'divination', 'envouteur', 'illusions', 'invocation'],
    recommendedAbilities: ['CHA', 'VOL', 'AGI'],
    sourcePage: 92,
  },
  {
    id: 'forgesort',
    name: 'Forgesort',
    familyId: 'mages',
    description:
      "À la fois artisan et enchanteur, artiste et magicien, le forgesort lie les énergies occultes à la matière qu’il façonne pour créer des artefacts magiques ou des breuvages aux propriétés fantastiques. Le forgesort est aussi le seul utilisateur de magie profane à pouvoir porter une armure. Dans les Terres d’Osgild : les forgesorts forment une caste de magiciens‑artisans qu’on ne trouve pas partout, mais qui sont très organisés. Les nains et les gnomes sont plus particulièrement férus de cette école de magie et s’organisent souvent en guilde, à la façon des artisans, tandis que les elfes sont moins enclins à la pratiquer. Les Frères forgeurs forment la guilde de la principauté d’Arly, laquelle a son siège à Fort Colline. Les élèves sont recrutés sur leur seul talent, à la suite d’une série de tests poussés de connaissance et d’artisanat, sans distinction de peuple. Après une formation initiale de sept années, le compagnon doit prendre la route et voyager au loin pour apprendre de nouvelles techniques, rencontrer des maîtres forgesorts à travers le monde et réaliser un chef‑d’œuvre : un objet magique original à la fois remarquable pour ses pouvoirs, mais aussi pour la qualité de son artisanat.",
    weaponsAndArmor:
      "Le forgesort sait manier la dague, le bâton, le marteau et l’arbalète légère. Les voies de forgesort limitent l’armure au cuir simple et interdisent d’utiliser un bouclier.",
    maxArmorId: 'cuir-simple',
    shieldAccess: 'none',
    meleeAccess: 'none',
    rangedAccess: 'none',
    allowedWeaponIds: ['dague', 'baton', 'marteau', 'arbalete-legere'],
    startingEquipment: [
      { itemId: 'dague', label: 'Dague (DM 1d4)', quantity: 1 },
      { itemId: 'baton-ferre', label: 'Bâton ferré (DM 1d6)', quantity: 1 },
      { itemId: 'marteau', label: 'Marteau (DM 1d6)', quantity: 1 },
    ],
    pathIds: ['artefacts', 'elixirs', 'metal', 'golem', 'runes'],
    recommendedAbilities: ['INT', 'VOL', 'CON'],
    sourcePage: 97,
  },
  {
    id: 'magicien',
    name: 'Magicien',
    familyId: 'mages',
    description:
      "Le magicien est un érudit qui a fait de longues études sur les fondements théoriques de la magie avant d’être capable de lancer ses premiers sorts. Toutefois, ce n’est pas qu’un rat de bibliothèque, il fait aussi appel à la magie pour se débarrasser de ses ennemis et pour aider ses compagnons. Son bien le plus précieux est son grimoire où il a inscrit tous ses sorts. Dans les Terres d’Osgild : la pratique de la magie profane nécessite une formation complexe généralement enseignée dans une académie. Celle de la principauté d’Arly, située à Ferrance, est dirigée par l’archimage Kerlaft de Rollis, éminence grise du prince Thomar. Ce sont plus souvent les jeunes gens issus de familles fortunées qui peuvent se permettre de telles études. Les jeunes magiciens issus de milieux moins aisés sont généralement repérés par de puissants mages qui les prennent sous leur aile comme apprenti et serviteur en échange de bribes de savoir plus ou moins importantes. En la matière, les maîtres sont tous très différents, certains sont des tyrans, d’autres se montrent plus prévenants mais, en règle générale, tous sont assez peu enclins à partager sans restriction le pouvoir que leur offre leur statut de maître… À part les humains, les elfes forment de puissants magiciens, et les gnomes ont la persévérance et le goût pour la recherche théorique nécessaires à ce profil. En revanche, rencontrer un nain, un halfelin ou un demi‑orc magicien est un événement exceptionnel.",
    weaponsAndArmor:
      "Le magicien sait manier la dague et le bâton. Les voies de magicien interdisent de porter une armure ou d’utiliser un bouclier.",
    maxArmorId: null,
    shieldAccess: 'none',
    meleeAccess: 'none',
    rangedAccess: 'none',
    allowedWeaponIds: ['dague', 'baton'],
    startingEquipment: [
      { itemId: 'baton-ferre', label: 'Bâton ferré (DM 1d6)', quantity: 1 },
      { itemId: 'dague', label: 'Dague (DM 1d4)', quantity: 1 },
      { itemId: 'grimoire-de-sorts', label: 'Grimoire de sorts', quantity: 1 },
    ],
    pathIds: [
      'magie-des-arcanes',
      'magie-destructrice',
      'magie-elementaire',
      'magie-protectrice',
      'magie-universelle',
    ],
    recommendedAbilities: ['INT', 'VOL', 'AGI'],
    sourcePage: 102,
  },
  {
    id: 'sorcier',
    name: 'Sorcier',
    familyId: 'mages',
    description:
      "Le sorcier est un lanceur de sorts qui s’intéresse aux forces obscures et au pouvoir de la mort. Parfois nommés nécromanciens ou démonistes, les sorciers sont généralement considérés comme maléfiques et sont peu appréciés. Toutefois, cela dépend des cultures : après tout, est‑il plus maléfique de vider un ennemi de son sang que de le découper à coup de hache ou de le carboniser à coup de Explosion de feu ? C’est une des questions que soulève le sorcier ! Interprétez‑le de façon subtile afin d’en faire un personnage plutôt sombre ou désespéré, mais pas nécessairement « mauvais ». Dans les Terres d’Osgild : tout comme la magie profane des magiciens, la magie noire nécessite des études poussées. Cette connaissance peut être tirée d’antiques grimoires, mais souvent elle est obtenue par le biais d’un pacte avec un maître maléfique (prince démon, entité indicible, mort‑vivant très ancien, etc.) et dans ce cas, peu importe l’origine sociale du postulant. Pour celui qui n’a pas les moyens de s’offrir de coûteuses études de magie, la tentation est grande de faire appel à un sombre mentor et le ressentiment éventuel contre les riches et les puissants peut être un moteur redoutable. Enfin, il existe des êtres qui n’ont pas choisi la magie noire, mais qui sont nés avec un don pour celle‑ci. Cela est généralement le fruit d’un événement tragique qui a corrompu un parent, voire l’enfant lui‑même. Dans la plupart des nations humaines, les sombres mages sont tout juste tolérés, tant qu’ils ne troublent pas l’ordre public en ramenant les morts à la vie. Ce que la loi interdit à peu près partout. De leur côté, les elfes et les nains abhorrent la magie noire, si les humains ont oublié, les Premiers‑Nés ont encore le souvenir des ravages de la terrible magie du Roi‑Sorcier de Tor‑Angul et du destin funeste de la forêt Sombre. Héritier de cette période, le Kathang (au sud du mur de Kelt) est réputé pour sa magie noire et cette influence s’étend à travers les jungles de Luir‑An‑Doral jusque dans le duché de Périk.",
    weaponsAndArmor:
      "Le sorcier sait manier la dague et le bâton. Les voies de sorcier interdisent de porter une armure ou d’utiliser un bouclier.",
    maxArmorId: null,
    shieldAccess: 'none',
    meleeAccess: 'none',
    rangedAccess: 'none',
    allowedWeaponIds: ['dague', 'baton'],
    startingEquipment: [
      { itemId: 'baton-ferre', label: 'Bâton ferré (DM 1d6)', quantity: 1 },
      { itemId: 'dague', label: 'Dague (DM 1d4)', quantity: 1 },
      {
        // « ou parchemins anciens » : variante de flavor du même grimoire (raccordé au catalogue).
        itemId: 'grimoire-de-sorts',
        label: 'Grimoire de sorts ou parchemins anciens',
        quantity: 1,
      },
    ],
    pathIds: ['demon', 'mort', 'outre-tombe', 'sang', 'sombre-magie'],
    recommendedAbilities: ['INT', 'VOL', 'CON'],
    sourcePage: 107,
  },
];

export const magePaths: ClassPath[] = [
  // --- Ensorceleur ---
  {
    id: 'air',
    name: "Voie de l’air",
    type: 'class',
    classIds: ['ensorceleur'],
    featureIds: ['air-r1', 'air-r2', 'air-r3', 'air-r4', 'air-r5'],
    sourcePage: 93,
  },
  {
    id: 'divination',
    name: 'Voie de la divination',
    type: 'class',
    classIds: ['ensorceleur'],
    featureIds: [
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
    name: "Voie de l’envoûteur",
    type: 'class',
    classIds: ['ensorceleur'],
    featureIds: [
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
    name: 'Voie des illusions',
    type: 'class',
    classIds: ['ensorceleur'],
    featureIds: [
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
    name: "Voie de l’invocation",
    type: 'class',
    classIds: ['ensorceleur'],
    featureIds: [
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
    name: 'Voie des artefacts',
    type: 'class',
    classIds: ['forgesort'],
    featureIds: [
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
    name: 'Voie des élixirs',
    type: 'class',
    classIds: ['forgesort'],
    featureIds: ['elixirs-r1', 'elixirs-r2', 'elixirs-r3', 'elixirs-r4', 'elixirs-r5'],
    note: "Chaque jour, le forgesort peut créer et utiliser (sur lui‑même ou un allié vivant) un élixir par rang acquis dans cette voie. Il ajoute un élixir supplémentaire à chaque fois qu’il atteint le rang 3 dans une voie de forgesort (celle‑ci incluse). Il doit préparer les élixirs le matin après sa période de récupération complète, et cela lui prend environ une demi‑heure. Boire un élixir est une action limitée. Les élixirs qui ne sont pas utilisés le jour même sont perdus.\n\nNote : si un personnage choisit une capacité issue de la voie des élixirs par l’intermédiaire d’une autre voie, il acquiert seulement deux élixirs par jour (ou un seul dans le cas d’un élixir majeur). Consommer un élixir n’est pas limité par le type d’armure que porte celui qui le boit.",
    sourcePage: 98,
  },
  {
    id: 'metal',
    name: 'Voie du métal',
    type: 'class',
    classIds: ['forgesort'],
    featureIds: ['metal-r1', 'metal-r2', 'metal-r3', 'metal-r4', 'metal-r5'],
    sourcePage: 99,
  },
  {
    id: 'golem',
    name: 'Voie du golem',
    type: 'class',
    classIds: ['forgesort'],
    featureIds: ['golem-r1', 'golem-r2', 'golem-r3', 'golem-r4', 'golem-r5'],
    note: "PARTICULARITÉS LIÉES AU GOLEM\nSoigner un golem : le golem ne guérit pas naturellement, mais le forgesort peut le réparer au rythme de [1d6 par rang + INT] PV par heure.\nGolem à 0 PV : si le golem est réduit à 0 PV, il cesse de fonctionner, mais le forgesort peut le réparer.\nMort d’un golem : si le golem est détruit ou perdu, le forgesort peut en construire un nouveau en 1d6 + 3 jours (+1d6 jours par amélioration de golem supérieur). Un forgesort peut utiliser tous les matériaux à sa disposition dans son environnement, par exemple pierre et bois s’il est dans une forêt.",
    sourcePage: 100,
  },
  {
    id: 'runes',
    name: 'Voie des runes',
    type: 'class',
    classIds: ['forgesort'],
    featureIds: ['runes-r1', 'runes-r2', 'runes-r3', 'runes-r4', 'runes-r5'],
    note: "Un personnage ne peut porter qu’une seule rune de chaque type sur lui‑même ou son équipement à la fois. Si l’équipement change de main ou si le sort est utilisé, la rune est dissipée. Une fois la rune dissipée, il est possible de relancer le sort.",
    sourcePage: 101,
  },

  // --- Magicien ---
  {
    id: 'magie-des-arcanes',
    name: 'Voie de la magie des arcanes',
    type: 'class',
    classIds: ['magicien'],
    featureIds: [
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
    name: 'Voie de la magie destructrice',
    type: 'class',
    classIds: ['magicien'],
    featureIds: [
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
    name: 'Voie de la magie élémentaire',
    type: 'class',
    classIds: ['magicien'],
    featureIds: [
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
    name: 'Voie de la magie protectrice',
    type: 'class',
    classIds: ['magicien'],
    featureIds: [
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
    name: 'Voie de la magie universelle',
    type: 'class',
    classIds: ['magicien'],
    featureIds: [
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
    name: 'Voie du démon',
    type: 'class',
    classIds: ['sorcier'],
    featureIds: ['demon-r1', 'demon-r2', 'demon-r3', 'demon-r4', 'demon-r5'],
    sourcePage: 107,
  },
  {
    id: 'mort',
    name: 'Voie de la mort',
    type: 'class',
    classIds: ['sorcier'],
    featureIds: ['mort-r1', 'mort-r2', 'mort-r3', 'mort-r4', 'mort-r5'],
    note: "Les sorts de cette voie n’affectent pas les créatures non vivantes (golem, élémentaires, morts‑vivants…).",
    sourcePage: 108,
  },
  {
    id: 'outre-tombe',
    name: "Voie de l’outre‑tombe",
    type: 'class',
    classIds: ['sorcier'],
    featureIds: [
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
    name: 'Voie du sang',
    type: 'class',
    classIds: ['sorcier'],
    featureIds: ['sang-r1', 'sang-r2', 'sang-r3', 'sang-r4', 'sang-r5'],
    sourcePage: 109,
  },
  {
    id: 'sombre-magie',
    name: 'Voie de la sombre magie',
    type: 'class',
    classIds: ['sorcier'],
    featureIds: [
      'sombre-magie-r1',
      'sombre-magie-r2',
      'sombre-magie-r3',
      'sombre-magie-r4',
      'sombre-magie-r5',
    ],
    sourcePage: 110,
  },
];

export const mageFeatures: Feature[] = [
  // ===================== ENSORCELEUR =====================

  // --- Voie de l’air (p. 93) ---
  {
    id: 'air-r1',
    name: 'Murmures dans le vent',
    pathId: 'air',
    rank: 1,
    isSpell: true,
    actionTypes: ['G'],
    text:
      "L’ensorceleur chuchote un message d’une dizaine de mots qui voyage jusqu’à son destinataire. Il peut entendre sa réponse immédiatement. La portée est de CHA × 100 m et le personnage doit connaître la cible ou la voir. En plus de ce sort, l’ensorceleur gagne un bonus permanent de +1 en Init. et en DEF, car parfois une bourrasque venue de nulle part vient gêner son attaquant, dévier un projectile ou lui permettre d’entendre un adversaire.",
    // Rendu enrichi (PER-90) : « portée est de [=CHA × 100] m » est une QUANTITÉ
    // avec multiplicateur (→ « 500 m » ; info-bulle « CHA × 100 = 500 »).
    richText:
      "L’ensorceleur chuchote un message d’une dizaine de mots qui voyage jusqu’à son destinataire. Il peut entendre sa réponse immédiatement. La portée est de [=CHA × 100] m et le personnage doit connaître la cible ou la voir. En plus de ce sort, l’ensorceleur gagne un bonus permanent de +1 en Init. et en DEF, car parfois une bourrasque venue de nulle part vient gêner son attaquant, dévier un projectile ou lui permettre d’entendre un adversaire.",
    // Bonus permanent et inconditionnel « +1 en Init. et en DEF ».
    effects: [
      { kind: 'stat-bonus', stat: 'initiative', value: 1 },
      { kind: 'stat-bonus', stat: 'def', value: 1 },
    ],
    sourcePage: 93,
  },
  {
    id: 'air-r2',
    name: 'Sous tension',
    pathId: 'air',
    rank: 2,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "L’ensorceleur se charge d’énergie électrique pour CHA minutes. Pendant toute la durée du sort, une créature qui le blesse par une attaque de contact ou le touche reçoit une décharge infligeant 1d4° DM. De plus, il peut utiliser une action d’attaque à chaque round pour délivrer une décharge électrique (test d’attaque magique contre DEF de la cible, portée 10 m) infligeant [1d4°+CHA] DM (aucun coût de mana).",
    // Rendu enrichi (PER-69) : durée « pour [=CHA] minutes », dé fixe de la décharge
    // passive {1d4°}, et formule de la décharge active [1d4° + CHA]. Le « aucun coût
    // de mana » porte sur la décharge active à chaque round, PAS sur le lancement du
    // sort (qui suit le coût standard du rang) → pas de `manaCost`.
    richText:
      "L’ensorceleur se charge d’énergie électrique pour [=CHA] minutes. Pendant toute la durée du sort, une créature qui le blesse par une attaque de contact ou le touche reçoit une décharge infligeant {1d4°} DM. De plus, il peut utiliser une action d’attaque à chaque round pour délivrer une décharge électrique (test d’attaque magique contre DEF de la cible, portée 10 m) infligeant [1d4° + CHA] DM (aucun coût de mana).",
    sourcePage: 93,
  },
  {
    id: 'air-r3',
    name: 'Télékinésie',
    pathId: 'air',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "L’ensorceleur peut déplacer dans les airs un objet inerte (qui n’est pas tenu par un adversaire) ou une cible volontaire (par exemple lui‑même) dont le poids n’excède pas 50 kg par rang, à une portée de 20 m et pendant CHA minutes. L’objet peut être maintenu en l’air ou déplacé de 5 m par action de mouvement. Il est possible de faire tomber un objet sur une cible surprise (test d’attaque magique, DM 1d6 par tranche de 50 kg).",
    // Rendu enrichi (PER-69) : « 50 kg par rang » est une quantité avec
    // multiplicateur (poids max = 50 × rang) → [=50 × rang] kg ; durée [=CHA] minutes ;
    // dé de chute {1d6}.
    richText:
      "L’ensorceleur peut déplacer dans les airs un objet inerte (qui n’est pas tenu par un adversaire) ou une cible volontaire (par exemple lui‑même) dont le poids n’excède pas [=50 × rang] kg, à une portée de 20 m et pendant [=CHA] minutes. L’objet peut être maintenu en l’air ou déplacé de 5 m par action de mouvement. Il est possible de faire tomber un objet sur une cible surprise (test d’attaque magique, DM {1d6} par tranche de 50 kg).",
    sourcePage: 93,
  },
  {
    id: 'air-r4',
    name: 'Foudre',
    pathId: 'air',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "L’ensorceleur produit un éclair sur une ligne de 10 m. Toutes les créatures sur la trajectoire subissent [4d4°+CHA] DM ou seulement la moitié pour celles qui réussissent un test d’AGI difficulté [10 + CHA].",
    // Rendu enrichi (PER-69) : DM [4d4° + CHA] ; le test d’@AGI est celui des CIBLES
    // (stat non calculée → référence) ; la difficulté [10 + CHA] utilise la CHA du
    // joueur (calculée).
    richText:
      "L’ensorceleur produit un éclair sur une ligne de 10 m. Toutes les créatures sur la trajectoire subissent [4d4° + CHA] DM ou seulement la moitié pour celles qui réussissent un test d’@AGI difficulté [10 + CHA].",
    sourcePage: 93,
  },
  {
    id: 'air-r5',
    name: 'Forme éthérée',
    pathId: 'air',
    rank: 5,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "L’ensorceleur et tout son équipement deviennent translucides et intangibles pendant CHA minutes. Sous cette forme, il peut passer à travers murs et obstacles et ne peut subir aucun DM physiques (même infligés par une arme magique), ni en infliger, ni lancer de sorts. Il n’est pas affecté par la gravité et peut se déplacer dans toutes les directions. Il est stoppé par les barrières magiques et ne peut pas passer à travers les êtres vivants.",
    // Rendu enrichi (PER-69) : durée « pendant [=CHA] minutes ».
    richText:
      "L’ensorceleur et tout son équipement deviennent translucides et intangibles pendant [=CHA] minutes. Sous cette forme, il peut passer à travers murs et obstacles et ne peut subir aucun DM physiques (même infligés par une arme magique), ni en infliger, ni lancer de sorts. Il n’est pas affecté par la gravité et peut se déplacer dans toutes les directions. Il est stoppé par les barrières magiques et ne peut pas passer à travers les êtres vivants.",
    // PER-137 : IMMUNITÉ aux DM physiques (même magiques) pendant le sort (forme éthérée). Marqueur
    // d'état pour gater l'affichage de la puce d'immunité.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Forme éthérée active', activeByDefault: false },
      },
    ],
    damageReduction: { kind: 'immunity', scopes: ['physical'] },
    sourcePage: 93,
  },

  // --- Voie de la divination (p. 93) ---
  {
    id: 'divination-r1',
    name: 'Divination',
    pathId: 'divination',
    rank: 1,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "S’il emporte un test opposé d’attaque magique contre une créature de NC inférieur à son niveau (portée 10 m), l’ensorceleur devine son nom d’usage, son métier et quelques autres renseignements, tous de notoriété publique (si la cible agit sous couverture, ce sont les informations qui concernent la couverture que l’ensorceleur apprend). Si la cible du sort est volontaire et qu’il lit les lignes de sa main, il n’y a pas besoin de test et l’ensorceleur peut utiliser ce sort sur une créature de NC supérieur ou égal à son niveau. En plus de ce sort, l’ensorceleur gagne +1 en Init. et en DEF. Ce bonus augmente de +1 au rang 3 de la voie et de +1 chaque fois que le personnage atteint le rang 5 dans une voie d’ensorceleur.",
    // Bonus permanent Init./DEF :
    //  - base 1, porté à 2 au rang 3 de CETTE voie (stepped par rang de voie hôte) ;
    //  - PLUS +1 par voie d’ensorceleur au rang 5 (milestone-count CROSS-VOIE).
    effects: [
      {
        kind: 'stat-bonus',
        stat: 'initiative',
        value: {
          scale: 'sum',
          parts: [
            { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 1 }, { min: 3, value: 2 }] },
            { scale: 'milestone-count', per: 1, rank: 5, classIds: ['ensorceleur'] },
          ],
        },
      },
      {
        kind: 'stat-bonus',
        stat: 'def',
        value: {
          scale: 'sum',
          parts: [
            { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 1 }, { min: 3, value: 2 }] },
            { scale: 'milestone-count', per: 1, rank: 5, classIds: ['ensorceleur'] },
          ],
        },
      },
    ],
    sourcePage: 93,
  },
  {
    id: 'divination-r2',
    name: "Détection de l’invisible",
    pathId: 'divination',
    rank: 2,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Pendant CHA minutes, l’ensorceleur détecte les créatures invisibles (le sort révèle une silhouette, mais pas l’apparence exacte de la créature) ou cachées à moins de 20 m et si un sort de Clairvoyance affecte l’endroit. Aveuglé (par magie ou dans l’obscurité), ce sort lui permet de détecter les créatures présentes (et donc d’attaquer sans malus), mais pas de distinguer son environnement.",
    // Rendu enrichi (PER-69) : durée « Pendant [=CHA] minutes ».
    richText:
      "Pendant [=CHA] minutes, l’ensorceleur détecte les créatures invisibles (le sort révèle une silhouette, mais pas l’apparence exacte de la créature) ou cachées à moins de 20 m et si un sort de Clairvoyance affecte l’endroit. Aveuglé (par magie ou dans l’obscurité), ce sort lui permet de détecter les créatures présentes (et donc d’attaquer sans malus), mais pas de distinguer son environnement.",
    sourcePage: 93,
  },
  {
    id: 'divination-r3',
    name: 'Clairvoyance',
    pathId: 'divination',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "L’ensorceleur peut voir et entendre à distance ce qui se passe dans un lieu qu’il connaît (pas de limite de portée) ou juste derrière une porte qu’il touche pendant CHA rounds (action limitée à chaque round). Les créatures présentes ont droit à un test de PER difficulté [12 + CHA de l’ensorceleur] : en cas de réussite, elles se sentent observées.",
    // Rendu enrichi (PER-69) : durée [=CHA] rounds ; le test de @PER est celui des
    // CIBLES (référence non calculée) ; la difficulté [12 + CHA] utilise la CHA du
    // joueur (suffixe « de l’ensorceleur » retiré, implicite).
    richText:
      "L’ensorceleur peut voir et entendre à distance ce qui se passe dans un lieu qu’il connaît (pas de limite de portée) ou juste derrière une porte qu’il touche pendant [=CHA] rounds (action limitée à chaque round). Les créatures présentes ont droit à un test de @PER difficulté [12 + CHA] : en cas de réussite, elles se sentent observées.",
    sourcePage: 94,
  },
  {
    id: 'divination-r4',
    name: 'Perception héroïque',
    pathId: 'divination',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "L’ensorceleur augmente sa valeur de PER de +1. Désormais, il obtient un dé bonus aux tests de PER, et il ajoute sa PER au nombre de PM dont il bénéficie.",
    // « ajoute sa PER au nombre de PM » → bonus permanent de mana égal à la PER.
    // « augmente sa valeur de PER de +1 » → modificateur permanent de carac. « dé bonus
    // aux tests de PER » → dé bonus permanent (mécanique core, icône double-d20).
    effects: [
      { kind: 'stat-bonus', stat: 'manaPoints', value: { scale: 'ability', ability: 'PER' } },
      { kind: 'ability-bonus', ability: 'PER', value: 1 },
      { kind: 'ability-bonus-die', ability: 'PER' },
    ],
    sourcePage: 94,
  },
  {
    id: 'divination-r5',
    name: 'Prescience',
    pathId: 'divination',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Une fois par combat, au début du round, le joueur peut décider qu’il a eu une vision des différents futurs possibles. Il bénéficie d’un bonus de +10 en attaque, en Défense et à tous les tests de PER pour tout le round, il divise tous les DM subis par 2 et il peut choisir d’agir à n’importe quel moment dans le round, sans considération d’initiative.",
    // Rendu enrichi (PER-137, retour propriétaire) : le +10 est un bonus FIXE → texte
    // littéral (PAS d'encadré de formule dynamique, ce serait trompeur pour un nombre fixe).
    // Les stats DÉRIVÉES sont auto-détectées par le glossaire (puce ambre) : on développe
    // « attaque » en ses trois jets (contact / distance / magique), « Défense » → « DEF », et
    // « initiative » est capitalisée en « Initiative » (glossaire sensible à la casse). @PER reste
    // une puce de caractéristique. Le lien dynamique aux stats passe par les `effects`
    // conditionnels ci-dessous (s'appliquent quand l'interrupteur est actif).
    richText:
      "Une fois par combat, au début du round, le joueur peut décider qu’il a eu une vision des différents futurs possibles. Il bénéficie d’un bonus de +10 en attaque de contact, attaque à distance et attaque magique, en DEF et à tous les tests de @PER pour tout le round, il divise tous les DM subis par 2 et il peut choisir d’agir à n’importe quel moment dans le round, sans considération d’Initiative.",
    // PER-137 : pendant le round de vision (interrupteur) — +10 en attaque (contact, distance ET
    // magique), +10 en DEF, +10 à tous les tests de PER, et ÷2 sur TOUS les DM subis. L'agir-hors-
    // initiative reste verbatim (non modélisable en stat).
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [
          { stat: 'meleeAttack', value: 10 },
          { stat: 'rangedAttack', value: 10 },
          { stat: 'magicAttack', value: 10 },
          { stat: 'def', value: 10 },
        ],
        abilityTestBonusFor: { ability: 'PER', value: 10 },
        activation: { kind: 'temporary', label: 'Prescience active (ce round)', activeByDefault: false },
      },
    ],
    damageReduction: { kind: 'divide', value: 2 },
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 94,
  },

  // --- Voie de l’envoûteur (p. 94) ---
  {
    id: 'envouteur-r1',
    name: 'Injonction',
    pathId: 'envouteur',
    rank: 1,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "L’ensorceleur donne un ordre simple (mais pas suicidaire) de deux ou trois mots que la cible doit pouvoir comprendre. S’il réussit un test opposé d’attaque magique contre une cible à une portée de 20 m, la victime doit exécuter l’ordre pendant son prochain tour. En plus de ce sort, l’ensorceleur ajoute son rang + 2 aux tests de persuasion ou de séduction.",
    // Rendu enrichi (PER-69) : « rang + 2 » est un modificateur aux tests → [rang + 2].
    // Bonus de compétence (PER-89) : profil → valeur déduite (2 + rang).
    richText:
      "L’ensorceleur donne un ordre simple (mais pas suicidaire) de deux ou trois mots que la cible doit pouvoir comprendre. S’il réussit un test opposé d’attaque magique contre une cible à une portée de 20 m, la victime doit exécuter l’ordre pendant son prochain tour. En plus de ce sort, l’ensorceleur ajoute son [rang + 2] aux tests de persuasion ou de séduction.",
    effects: [{ kind: 'test-bonus', domains: ['persuasion', 'seduction'] }],
    sourcePage: 94,
  },
  {
    id: 'envouteur-r2',
    name: 'Sommeil',
    pathId: 'envouteur',
    rank: 2,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Une fois par combat, l’ensorceleur vise une zone de 10 m de diamètre à une portée maximale de 20 m. Le sort affecte jusqu’à [1d4° + CHA] créatures vivantes de NC inférieur à 1. Le sort affecte les créatures de NC inférieur à 2 au rang 4 puis à 3 au rang 5. Les créatures perdent conscience pendant CHA minutes. Il est possible de les réveiller en les cognant violemment (action d’attaque, 1 DM).",
    // Rendu enrichi (PER-69) : nombre de cibles [1d4° + CHA] (dé → forme encadrée) ;
    // durée « pendant [=CHA] minutes ». Les seuils de NC par rang restent en texte.
    richText:
      "Une fois par combat, l’ensorceleur vise une zone de 10 m de diamètre à une portée maximale de 20 m. Le sort affecte jusqu’à [1d4° + CHA] créatures vivantes de NC inférieur à 1. Le sort affecte les créatures de NC inférieur à 2 au rang 4 puis à 3 au rang 5. Les créatures perdent conscience pendant [=CHA] minutes. Il est possible de les réveiller en les cognant violemment (action d’attaque, 1 DM).",
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 94,
  },
  {
    id: 'envouteur-r3',
    name: 'Confusion',
    pathId: 'envouteur',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "En réussissant un test opposé d’attaque magique contre sa cible (portée 20 m), l’ensorceleur désoriente sa victime pendant CHA rounds. Au tour de la victime, celui qui l’incarne lance 1d6 : sur 1‑3 la victime n’agit pas, sur 4‑6 elle attaque la créature la plus proche (au hasard). À la fin de son tour, elle peut mettre fin au sort prématurément en réussissant un test de VOL difficulté [12 + CHA de l’ensorceleur].",
    // Rendu enrichi (PER-69) : durée [=CHA] rounds ; dé {1d6} ; le test de @VOL est
    // celui de la VICTIME (référence) ; la difficulté [12 + CHA] utilise la CHA du joueur.
    richText:
      "En réussissant un test opposé d’attaque magique contre sa cible (portée 20 m), l’ensorceleur désoriente sa victime pendant [=CHA] rounds. Au tour de la victime, celui qui l’incarne lance {1d6} : sur 1‑3 la victime n’agit pas, sur 4‑6 elle attaque la créature la plus proche (au hasard). À la fin de son tour, elle peut mettre fin au sort prématurément en réussissant un test de @VOL difficulté [12 + CHA].",
    sourcePage: 94,
  },
  {
    id: 'envouteur-r4',
    name: 'Amitié',
    pathId: 'envouteur',
    rank: 4,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Si l’ensorceleur réussit un test opposé d’attaque magique (portée 10 m) contre une cible humanoïde de niveau ou NC inférieur au sien, celle‑ci se comporte comme un ami de longue date tant qu’elle n’est pas attaquée. La victime peut résister au sort avec un test de VOL difficulté [10 + CHA de l’ensorceleur] une fois par jour après chaque récupération complète. Si la cible est d’un niveau au moins égal au niveau du lanceur de sort, ce dernier obtient seulement un dé bonus à tous les tests de CHA qu’il effectue contre la victime pendant 10 min.",
    // Rendu enrichi (PER-69) : le test de @VOL est celui de la VICTIME (référence) ;
    // la difficulté [10 + CHA] utilise la CHA du joueur.
    richText:
      "Si l’ensorceleur réussit un test opposé d’attaque magique (portée 10 m) contre une cible humanoïde de niveau ou NC inférieur au sien, celle‑ci se comporte comme un ami de longue date tant qu’elle n’est pas attaquée. La victime peut résister au sort avec un test de @VOL difficulté [10 + CHA] une fois par jour après chaque récupération complète. Si la cible est d’un niveau au moins égal au niveau du lanceur de sort, ce dernier obtient seulement un dé bonus à tous les tests de CHA qu’il effectue contre la victime pendant 10 min.",
    sourcePage: 94,
  },
  {
    id: 'envouteur-r5',
    name: 'Domination',
    pathId: 'envouteur',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "En réussissant un test opposé d’attaque magique contre une cible de niveau ou NC inférieur au sien (portée 20 m), l’ensorceleur prend contrôle de sa cible pendant CHA minutes. Son propre corps devient inactif et s’écroule au sol. Si la créature meurt pendant la domination, l’ensorceleur réintègre son corps et subit 1d4° DM. Si la cible est d’un niveau trop élevé, il peut la forcer à faire une seule action de son choix (mouvement ou attaque) ; ensuite, il est éjecté et subit 1d4° DM.",
    // Rendu enrichi (PER-69) : durée [=CHA] minutes ; DM de contrecoup {1d4°} (×2).
    richText:
      "En réussissant un test opposé d’attaque magique contre une cible de niveau ou NC inférieur au sien (portée 20 m), l’ensorceleur prend contrôle de sa cible pendant [=CHA] minutes. Son propre corps devient inactif et s’écroule au sol. Si la créature meurt pendant la domination, l’ensorceleur réintègre son corps et subit {1d4°} DM. Si la cible est d’un niveau trop élevé, il peut la forcer à faire une seule action de son choix (mouvement ou attaque) ; ensuite, il est éjecté et subit {1d4°} DM.",
    sourcePage: 94,
  },

  // --- Voie des illusions (p. 95) ---
  {
    id: 'illusions-r1',
    name: 'Mirage',
    pathId: 'illusions',
    rank: 1,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "L’ensorceleur crée une illusion visuelle et sonore immobile d’une durée de CHA minutes. Le volume maximal de l’illusion est de 2 m de côté par rang dans la voie (portée 50 m). À partir du rang 4, l’illusion peut être animée, mais dans ce cas sa durée est exprimée en rounds. En plus de ce sort, l’ensorceleur ajoute son rang + 2 aux tests de supercherie ou à tout test qui lui servirait à mentir.",
    // Rendu enrichi (PER-69) : durée [=CHA] minutes ; « 2 m de côté par rang » est une
    // quantité avec multiplicateur → [=2 × rang] m ; « rang + 2 » modificateur aux tests.
    // Bonus de compétence (PER-89) : domaine net = supercherie ; la queue « ou à tout test
    // qui lui servirait à mentir » est une extension situationnelle → laissée en texte.
    richText:
      "L’ensorceleur crée une illusion visuelle et sonore immobile d’une durée de [=CHA] minutes. Le volume maximal de l’illusion est de [=2 × rang] m de côté (portée 50 m). À partir du rang 4, l’illusion peut être animée, mais dans ce cas sa durée est exprimée en rounds. En plus de ce sort, l’ensorceleur ajoute son [rang + 2] aux tests de supercherie ou à tout test qui lui servirait à mentir.",
    effects: [{ kind: 'test-bonus', domains: ['deception'] }],
    sourcePage: 95,
  },
  {
    id: 'illusions-r2',
    name: 'Image décalée',
    pathId: 'illusions',
    rank: 2,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "L’ensorceleur crée des images décalées qui se superposent à sa silhouette pendant [1d4 + CHA] rounds. Lorsqu’une attaque au contact ou à distance le touche, l’ensorceleur lance 1d6 : sur 5‑6, il ne subit pas les DM.",
    // Rendu enrichi (PER-69) : durée [1d4 + CHA] rounds (dé → forme encadrée) ; dé {1d6}.
    richText:
      "L’ensorceleur crée des images décalées qui se superposent à sa silhouette pendant [1d4 + CHA] rounds. Lorsqu’une attaque au contact ou à distance le touche, l’ensorceleur lance {1d6} : sur 5‑6, il ne subit pas les DM.",
    sourcePage: 95,
  },
  {
    id: 'illusions-r3',
    name: 'Sort illusoire',
    pathId: 'illusions',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "L’ensorceleur lance un sort d’attaque qui n’est qu’une illusion. Il inflige [3d4°+CHA] DM contre une seule cible ou [2d4°+CHA] DM contre un maximum de cibles égal au rang atteint. Le joueur peut décrire la nature du sort à sa guise (une Explosion de feu, une nuée de criquets, une lance de glace, etc.), son imagination demeurant sa seule limite. Chaque cible peut faire un test de PER difficulté [10 + CHA de l’ensorceleur] pour ne subir aucun DM. Les créatures sans esprit (créatures artificielles, certaines plantes et morts‑vivants) sont immunisées à ce sort. Les PV perdus de cette façon se récupèrent normalement.",
    // Rendu enrichi (PER-69) : DM [3d4° + CHA] / [2d4° + CHA] ; « maximum de cibles
    // égal au rang atteint » → terme nommé [#rang] (substantif, le déterminant « au »
    // réclame le mot, pas un nombre nu) ; le test de @PER est celui des CIBLES ;
    // difficulté [10 + CHA] (CHA du joueur).
    richText:
      "L’ensorceleur lance un sort d’attaque qui n’est qu’une illusion. Il inflige [3d4° + CHA] DM contre une seule cible ou [2d4° + CHA] DM contre un maximum de cibles égal au [#rang]. Le joueur peut décrire la nature du sort à sa guise (une Explosion de feu, une nuée de criquets, une lance de glace, etc.), son imagination demeurant sa seule limite. Chaque cible peut faire un test de @PER difficulté [10 + CHA] pour ne subir aucun DM. Les créatures sans esprit (créatures artificielles, certaines plantes et morts‑vivants) sont immunisées à ce sort. Les PV perdus de cette façon se récupèrent normalement.",
    sourcePage: 95,
  },
  {
    id: 'illusions-r4',
    name: 'Imitation',
    pathId: 'illusions',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Pendant CHA minutes, l’ensorceleur peut prendre l’apparence d’une créature de taille proche de la sienne (+ ou – 50 cm) qu’il voit au moment de l’incantation. Une créature qui touche l’ensorceleur se rend compte que quelque chose ne va pas et a le droit à un test d’INT difficulté [10 + CHA de l’ensorceleur] pour voir à travers l’illusion.",
    // Rendu enrichi (PER-69) : durée « Pendant [=CHA] minutes » ; le test d’@INT est
    // celui de la créature qui touche (référence) ; difficulté [10 + CHA] (CHA du joueur).
    richText:
      "Pendant [=CHA] minutes, l’ensorceleur peut prendre l’apparence d’une créature de taille proche de la sienne (+ ou – 50 cm) qu’il voit au moment de l’incantation. Une créature qui touche l’ensorceleur se rend compte que quelque chose ne va pas et a le droit à un test d’@INT difficulté [10 + CHA] pour voir à travers l’illusion.",
    sourcePage: 95,
  },
  {
    id: 'illusions-r5',
    name: 'Exécution mentale',
    pathId: 'illusions',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Ce sort invoque les pires terreurs d’une créature humanoïde vivante et lui fait croire à sa propre mort. L’ensorceleur doit faire un test opposé d’attaque magique contre sa cible (portée 20 m). En cas de succès la victime tombe à 0 PV ou si la cible est de niveau supérieur ou égal à l’ensorceleur, elle est étourdie (‑5 DEF et pas d’action) pendant 1 round. Une créature ne peut être la cible de ce sort qu’une fois par jour. Les créatures sans esprit (créatures artificielles, certaines plantes et certains morts‑vivants) sont immunisées à ce sort.",
    sourcePage: 95,
  },

  // --- Voie de l’invocation (p. 96) ---
  {
    id: 'invocation-r1',
    name: 'Choc',
    pathId: 'invocation',
    rank: 1,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Si l’ensorceleur réussit un test d’attaque magique réussi contre la DEF de son adversaire situé à une portée de 20 m, il lui inflige [1d4° + CHA] DM. Si la cible a un NC inférieur au rang atteint par l’ensorceleur dans la voie, elle doit réussir un test de FOR difficulté 10 pour ne pas être renversée.",
    // Rendu enrichi (PER-64) : `[1d4° + CHA]` est rendu dé évolutif (au niveau
    // courant) + CHA résolu ; `@FOR` est mise en avant comme référence de stat.
    richText:
      "Si l’ensorceleur réussit un test d’attaque magique réussi contre la DEF de son adversaire situé à une portée de 20 m, il lui inflige [1d4° + CHA] DM. Si la cible a un NC inférieur au rang atteint par l’ensorceleur dans la voie, elle doit réussir un test de @FOR difficulté 10 pour ne pas être renversée.",
    sourcePage: 96,
  },
  {
    id: 'invocation-r2',
    name: 'Serviteur invisible',
    pathId: 'invocation',
    rank: 2,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Ce sort crée une force invisible pendant CHA minutes. Le serviteur peut effectuer à distance des tâches simples ne nécessitant pas de test de réussite avec une AGI et une INT de +0 et une FOR égale au CHA de l’ensorceleur (portée 20 m). Il peut par exemple rapporter un objet ou actionner un levier, voire faire la vaisselle. Le serviteur invisible se déplace à la même vitesse que l’ensorceleur, ne pèse rien, ne parle pas, n’a pas vraiment d’existence et peut se déplacer dans toutes les directions. Concevez‑le davantage comme une force qui obéit aux injonctions télépathiques de son créateur que comme une créature. Il n’attaque pas et ne peut pas être combattu, mais il peut être dissipé grâce au sort de maîtrise de la magie.",
    // Rendu enrichi (PER-64 + PER-90) : « pendant [=CHA] minutes » est une
    // QUANTITÉ brute (→ « 5 minutes ») ; la @FOR du serviteur « égale au [CHA] »
    // mêle une référence de stat (@FOR/@AGI/@INT) et un encadré de formule `[CHA]`.
    richText:
      "Ce sort crée une force invisible pendant [=CHA] minutes. Le serviteur peut effectuer à distance des tâches simples ne nécessitant pas de test de réussite avec une @AGI et une @INT de +0 et une @FOR égale au [CHA] de l’ensorceleur (portée 20 m). Il peut par exemple rapporter un objet ou actionner un levier, voire faire la vaisselle. Le serviteur invisible se déplace à la même vitesse que l’ensorceleur, ne pèse rien, ne parle pas, n’a pas vraiment d’existence et peut se déplacer dans toutes les directions. Concevez‑le davantage comme une force qui obéit aux injonctions télépathiques de son créateur que comme une créature. Il n’attaque pas et ne peut pas être combattu, mais il peut être dissipé grâce au sort de maîtrise de la magie.",
    // Marqueur d'INVOCATION (PER-235) : le serviteur dure CHA minutes → effet TEMPORAIRE sans
    // bonus (marqueur d'état), affiché en bouton « Invoquer » sur la carte du rang ; le bloc de
    // compagnon n'apparaît que lorsqu'il est actif, et un repos complet le renvoie.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Serviteur invoqué', activeByDefault: false },
      },
    ],
    // Profil LÉGER (PER-235, validé propriétaire) : le livre (p. 96) décrit le serviteur comme
    // « une force, pas une créature » — SANS bloc de stats (pas de PV/DEF/Init., n'attaque pas,
    // ne peut être combattu). On ne connaît que 3 caractéristiques (FOR = CHA du maître, AGI et
    // INT à +0) : pas de grille des 7 caracs (aucune donnée devinée), pas de barre de vie. Tout
    // est porté par `descriptionRich` (résolu sur les caracs du MAÎTRE : `[CHA]`, `[=CHA]`).
    creatureProfile: {
      name: 'Serviteur invisible',
      type: 'force invisible — pas une créature',
      descriptionRich:
        "@FOR égale au [CHA] du maître, @AGI et @INT à +0. Portée 20 m, durée [=CHA] minutes. N’attaque pas et ne peut pas être combattu.",
    },
    sourcePage: 96,
  },
  {
    id: 'invocation-r3',
    name: 'Arme de mana',
    pathId: 'invocation',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le sort crée une lame d’énergie lumineuse pendant [rang] rounds. Dès le premier round et à chaque round suivant, l’ensorceleur peut lui ordonner d’attaquer une cible de son choix à portée (action gratuite, portée 20 m). La lame doit réussir un test d’attaque magique contre la DEF de l’adversaire. Elle inflige [1d4° + CHA] DM en cas de réussite. L’ensorceleur ne peut maintenir actif qu’un seul sort d’arme de mana à la fois.",
    // Rendu enrichi (PER-69) : durée « pendant [=rang] rounds » (quantité) ; DM [1d4° + CHA].
    richText:
      "Le sort crée une lame d’énergie lumineuse pendant [=rang] rounds. Dès le premier round et à chaque round suivant, l’ensorceleur peut lui ordonner d’attaquer une cible de son choix à portée (action gratuite, portée 20 m). La lame doit réussir un test d’attaque magique contre la DEF de l’adversaire. Elle inflige [1d4° + CHA] DM en cas de réussite. L’ensorceleur ne peut maintenir actif qu’un seul sort d’arme de mana à la fois.",
    sourcePage: 96,
  },
  {
    id: 'invocation-r4',
    name: 'Porte dimensionnelle',
    pathId: 'invocation',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "L’ensorceleur se téléporte lui‑même et jusqu’à un allié par point de CHA à une distance maximale de 60 m. Le lieu d’arrivée doit être en vue.",
    // Rendu enrichi (PER-69) : « un allié par point de CHA » = un nombre d’alliés égal
    // à la CHA → quantité [=CHA].
    richText:
      "L’ensorceleur se téléporte lui‑même et jusqu’à un allié par point de [#CHA] à une distance maximale de 60 m. Le lieu d’arrivée doit être en vue.",
    sourcePage: 96,
  },
  {
    id: 'invocation-r5',
    name: 'Mur de mana',
    pathId: 'invocation',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "L’ensorceleur crée un mur de force invisible et indestructible (portée 10 m, maximum 5 m de haut et 10 m de long, vertical, sans coudes), ou bien un hémisphère de 3 m de rayon centré sur lui‑même, tous les deux immobiles. Le sort dure CHA minutes. Aucune matière ni force ne peut passer à travers le mur de force. En revanche, les attaques mentales ne sont pas stoppées et une porte dimensionnelle (ou une téléportation) permet de le franchir.",
    // Rendu enrichi (PER-69) : durée « Le sort dure [=CHA] minutes ».
    richText:
      "L’ensorceleur crée un mur de force invisible et indestructible (portée 10 m, maximum 5 m de haut et 10 m de long, vertical, sans coudes), ou bien un hémisphère de 3 m de rayon centré sur lui‑même, tous les deux immobiles. Le sort dure [=CHA] minutes. Aucune matière ni force ne peut passer à travers le mur de force. En revanche, les attaques mentales ne sont pas stoppées et une porte dimensionnelle (ou une téléportation) permet de le franchir.",
    sourcePage: 96,
  },

  // ===================== FORGESORT =====================

  // --- Voie des artefacts (p. 97) ---
  {
    id: 'artefacts-r1',
    name: 'Bâton de mage',
    pathId: 'artefacts',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsqu’il utilise son bâton, le forgesort inflige [1d4°+INT] DM magiques. À partir du rang 3, au prix d’une action limitée, il peut utiliser sa valeur d’attaque magique pour une attaque au contact et il inflige [2d4°+INT] DM dans un éclair d’énergie ! Si le forgesort fait l’acquisition d’un bâton magique, les bonus de celui‑ci s’ajouteront normalement à l’attaque et aux DM (de même pour le bonus de feu de la voie du métal).",
    // Rendu enrichi (PER-69) : DM [1d4° + INT] puis [2d4° + INT] à partir du rang 3.
    richText:
      "Lorsqu’il utilise son bâton, le forgesort inflige [1d4° + INT] DM magiques. À partir du rang 3, au prix d’une action limitée, il peut utiliser sa valeur d’attaque magique pour une attaque au contact et il inflige [2d4° + INT] DM dans un éclair d’énergie ! Si le forgesort fait l’acquisition d’un bâton magique, les bonus de celui‑ci s’ajouteront normalement à l’attaque et aux DM (de même pour le bonus de feu de la voie du métal).",
    sourcePage: 97,
  },
  {
    id: 'artefacts-r2',
    name: 'Ouverture ‑ fermeture',
    pathId: 'artefacts',
    rank: 2,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "Le forgesort peut ouvrir une porte fermée à clef en la touchant, il doit réussir un test d’attaque magique contre la difficulté pour la crocheter. Il peut aussi sceller une porte ou un coffre pour INT minutes. Seul un mot de commande qu’il choisit permet d’ouvrir l’objet. Celui‑ci peut toujours être brisé par la force, mais il bénéficie d’un bonus de +5 en solidité et en RD pour toute la durée du sort. À partir du rang 4, le forgesort peut rendre ce sort permanent en sacrifiant une gemme d’une valeur de 100 pa et en prolongeant l’incantation par un rituel de 10 min.",
    // Rendu enrichi (PER-69) : durée « pour [=INT] minutes ». Le +5 solidité/RD porte
    // sur l’objet scellé (pas une stat dérivée du joueur) → texte.
    richText:
      "Le forgesort peut ouvrir une porte fermée à clef en la touchant, il doit réussir un test d’attaque magique contre la difficulté pour la crocheter. Il peut aussi sceller une porte ou un coffre pour [=INT] minutes. Seul un mot de commande qu’il choisit permet d’ouvrir l’objet. Celui‑ci peut toujours être brisé par la force, mais il bénéficie d’un bonus de +5 en solidité et en RD pour toute la durée du sort. À partir du rang 4, le forgesort peut rendre ce sort permanent en sacrifiant une gemme d’une valeur de 100 pa et en prolongeant l’incantation par un rituel de 10 min.",
    sourcePage: 97,
  },
  {
    id: 'artefacts-r3',
    name: 'Sac sans fond',
    pathId: 'artefacts',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Le forgesort possède un sac magique dans lequel il peut entreposer 50 kg de matériel par rang dans la voie, tandis que le sac semble toujours peser un kilogramme. Le sac ne fonctionne pas si on tente d’y mettre une créature vivante. Le sac est de plus capable de fournir au forgesort les objets qu’il désire. Une fois par heure, il peut en retirer un ou plusieurs objets dont la valeur totale ne dépasse pas 25 pa, le poids 50 kg, la circonférence 1 m et le volume 1 m3. Ces objets ont hélas la propriété de disparaître au bout d’une heure. De ce fait, la nourriture magique retirée du sac ne nourrit pas vraiment celui qui la consomme.",
    // Rendu enrichi (PER-69) : capacité d’entreposage « 50 kg par rang » → quantité avec
    // multiplicateur [=50 × rang] kg ; le reste (25 pa, 50 kg, 1 m, 1 m³) reste littéral.
    richText:
      "Le forgesort possède un sac magique dans lequel il peut entreposer [=50 × rang] kg de matériel, tandis que le sac semble toujours peser un kilogramme. Le sac ne fonctionne pas si on tente d’y mettre une créature vivante. Le sac est de plus capable de fournir au forgesort les objets qu’il désire. Une fois par heure, il peut en retirer un ou plusieurs objets dont la valeur totale ne dépasse pas 25 pa, le poids 50 kg, la circonférence 1 m et le volume 1 m3. Ces objets ont hélas la propriété de disparaître au bout d’une heure. De ce fait, la nourriture magique retirée du sac ne nourrit pas vraiment celui qui la consomme.",
    sourcePage: 97,
  },
  {
    id: 'artefacts-r4',
    name: 'Frappe des arcanes',
    pathId: 'artefacts',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le forgesort frappe le sol de son bâton et provoque une onde dévastatrice dans un rayon de 10 m autour de lui. Toutes les créatures dans la zone subissent automatiquement [3d4°+INT] DM et doivent réussir un test de FOR difficulté [10 + INT] pour ne pas être renversées.",
    // Rendu enrichi (PER-69) : DM [3d4° + INT] ; le test de @FOR est celui des CIBLES
    // (référence) ; difficulté [10 + INT] (INT du joueur).
    richText:
      "Le forgesort frappe le sol de son bâton et provoque une onde dévastatrice dans un rayon de 10 m autour de lui. Toutes les créatures dans la zone subissent automatiquement [3d4° + INT] DM et doivent réussir un test de @FOR difficulté [10 + INT] pour ne pas être renversées.",
    sourcePage: 97,
  },
  {
    id: 'artefacts-r5',
    name: 'Artefact étrange',
    pathId: 'artefacts',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le forgesort crée un artefact qu’il est le seul à pouvoir utiliser et dont la description est laissée au soin du joueur. L’artefact permet d’utiliser les capacités de rang 5 suivantes chacune une fois par jour au prix d’une action limitée : Téléportation (voie de la magie universelle, magicien), Interruption du temps (voie de la magie protectrice, magicien), Forme éthérée (voie de l’air, ensorceleur), Prescience (voie de la divination, ensorceleur). À chaque utilisation, le joueur doit lancer 1d6 : sur un résultat de 1 ou 2, l’artefact ne fonctionne pas, le forgesort doit réparer l’artefact lors d’une récupération rapide avant de pouvoir faire une nouvelle tentative de ce pouvoir (il peut tenter d’utiliser les autres pouvoirs normalement).",
    // Rendu enrichi (PER-69/163) : dé de fonctionnement {1d6}. Les quatre pouvoirs de rang 5
    // accessibles (pas un choix à persister → pas de `choices`) sont balisés en puces `[&id|nom]`
    // (parenthèses de voie/classe redondantes retirées : la voie source est dans l'info-bulle de la
    // puce et le détail dans l'accordéon). Chacun porte un DOUBLE état de jeu (1×/jour + panne) via
    // `borrowedPowers` — cf. `BorrowedPowersField`.
    richText:
      "Le forgesort crée un artefact qu’il est le seul à pouvoir utiliser et dont la description est laissée au soin du joueur. L’artefact permet d’utiliser les capacités de rang 5 suivantes chacune une fois par jour au prix d’une action limitée : [&magie-universelle-r5|Téléportation], [&magie-protectrice-r5|Interruption du temps], [&air-r5|Forme éthérée], [&divination-r5|Prescience]. À chaque utilisation, le joueur doit lancer {1d6} : sur un résultat de 1 ou 2, l’artefact ne fonctionne pas, le forgesort doit réparer l’artefact lors d’une récupération rapide avant de pouvoir faire une nouvelle tentative de ce pouvoir (il peut tenter d’utiliser les autres pouvoirs normalement).",
    // PER-163 : chaque sort emprunté = usage 1×/jour (repos long) + état « cassé » réparé au repos
    // court. Ordre = ordre de citation dans le texte.
    borrowedPowers: ['magie-universelle-r5', 'magie-protectrice-r5', 'air-r5', 'divination-r5'],
    // PER-163 : le forgesort lance ces sorts avec son INT. Forme éthérée (air-r5) a une durée en CHA
    // (carac de l'ensorceleur) qui n'a aucun sens pour lui → substitution CHA→INT (si INT plus élevée),
    // signalée à l'affichage. Sans effet sur les autres pouvoirs empruntés (ils ne citent pas CHA).
    reproducedAbilitySubstitutions: [{ from: 'CHA', to: 'INT' }],
    sourcePage: 97,
  },

  // --- Voie des élixirs (p. 98) ---
  {
    id: 'elixirs-r1',
    name: 'Fortifiant',
    pathId: 'elixirs',
    rank: 1,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Un breuvage qui guérit immédiatement 1d4° PV et permet de gagner un dé bonus aux trois prochains tests effectués dans une période de 30 min. En plus de cette recette, grâce à ses études, le forgesort ajoute son rang + 2 aux tests d’alchimie et de chimie ou pour identifier une potion (test difficulté 10 + rang du sort).",
    // Rendu enrichi (PER-69) : soin {1d4°} PV ; « son rang + 2 » = rang ATTEINT dans la
    // voie → [rang + 2] (bonus de tests = PER-89). En revanche « 10 + rang du sort »
    // (difficulté d’identification) désigne le rang DU SORT identifié, PAS la voie du
    // forgesort → laissé en texte littéral (le terme `rang` baliserait le rang de voie).
    richText:
      "Un breuvage qui guérit immédiatement {1d4°} PV et permet de gagner un dé bonus aux trois prochains tests effectués dans une période de 30 min. En plus de cette recette, grâce à ses études, le forgesort ajoute son [rang + 2] aux tests d’alchimie et de chimie ou pour identifier une potion (test difficulté 10 + rang du sort).",
    // Bonus de compétence (PER-89) : domaines = alchimie, chimie ; « identifier une potion »
    // (avec sa difficulté propre) est une extension situationnelle → laissée en texte.
    effects: [{ kind: 'test-bonus', domains: ['alchemy', 'chemistry'] }],
    // Réserve quotidienne d'élixirs (note de voie, p. 98) : rang(elixirs) + 1 par voie de forgesort
    // à rang 3 (celle-ci incluse). Pool PARTAGÉ entre tous les élixirs (sharedKey), rechargé au repos
    // long (préparation matinale). Reste verbatim / différé : répertoire = INT recettes (r4/r5) et
    // l'élixir EMPRUNTÉ via une autre voie (2/jour, 1 si majeur) — non modélisés.
    usageCounter: {
      maxByRankCount: { classIds: ['forgesort'], rank: 3, base: 0, addPathRank: true },
      sharedKey: 'elixirs-doses',
      // Réserve suivie dans une barre sous l'en-tête de la voie des élixirs + bouton « Créer
      // l'élixir » par carte (le forgesort prépare toujours 100 % de ses doses) — pas de jauge d'état.
      poolInPathHeader: true,
      resetOn: 'day',
      label: 'Élixirs du jour',
    },
    sourcePage: 98,
  },
  {
    id: 'elixirs-r2',
    name: 'Feu grégeois',
    pathId: 'elixirs',
    rank: 2,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le forgesort lance la fiole à une distance maximale de 10 m (réussite automatique). Le contenu explose dans un rayon de 3 m en infligeant 2d4° DM. Un test d’AGI difficulté [10 + INT du forgesort] réussi permet aux victimes de diviser les DM par deux. Les DM passent à 3d4° au rang 4 et 4d4° au rang 5.",
    // Rendu enrichi (PER-69) : DM principal {2d4°|3@4|4@5} — le NOMBRE DE DÉS suit le rang
    // de voie (2d4° rangs 1-3, 3d4° au rang 4, 4d4° au rang 5) ; la phrase « passent à … »
    // est gardée en explication. Test d’@AGI (victimes) ; difficulté [10 + INT] (INT du joueur).
    richText:
      "Le forgesort lance la fiole à une distance maximale de 10 m (réussite automatique). Le contenu explose dans un rayon de 3 m en infligeant {2d4°|3@4|4@5} DM. Un test d’@AGI difficulté [10 + INT] réussi permet aux victimes de diviser les DM par deux. Les DM passent à {3d4°} au rang 4 et {4d4°} au rang 5.",
    // Consomme 1 dose du pool quotidien d'élixirs (partagé, cf. elixirs-r1).
    usageCounter: {
      maxByRankCount: { classIds: ['forgesort'], rank: 3, base: 0, addPathRank: true },
      sharedKey: 'elixirs-doses',
      // Réserve suivie dans une barre sous l'en-tête de la voie des élixirs + bouton « Créer
      // l'élixir » par carte (le forgesort prépare toujours 100 % de ses doses) — pas de jauge d'état.
      poolInPathHeader: true,
      resetOn: 'day',
      label: 'Élixirs du jour',
    },
    sourcePage: 98,
  },
  {
    id: 'elixirs-r3',
    name: 'Élixir de guérison',
    pathId: 'elixirs',
    rank: 3,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le forgesort peut préparer un élixir qui soigne [2d4°+INT] PV au bout d’une minute ou guérit un empoisonnement de manière instantanée.",
    // Rendu enrichi (PER-69) : soin [2d4° + INT] PV.
    richText:
      "Le forgesort peut préparer un élixir qui soigne [2d4° + INT] PV au bout d’une minute ou guérit un empoisonnement de manière instantanée.",
    // Consomme 1 dose du pool quotidien d'élixirs (partagé, cf. elixirs-r1).
    usageCounter: {
      maxByRankCount: { classIds: ['forgesort'], rank: 3, base: 0, addPathRank: true },
      sharedKey: 'elixirs-doses',
      // Réserve suivie dans une barre sous l'en-tête de la voie des élixirs + bouton « Créer
      // l'élixir » par carte (le forgesort prépare toujours 100 % de ses doses) — pas de jauge d'état.
      poolInPathHeader: true,
      resetOn: 'day',
      label: 'Élixirs du jour',
    },
    sourcePage: 98,
  },
  {
    id: 'elixirs-r4',
    name: 'Élixirs mineurs',
    pathId: 'elixirs',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le forgesort apprend à préparer des élixirs parmi Forme gazeuse, Maîtrise des éléments, Chute ralentie (voies de magicien) et Masque mortuaire (voie de sorcier). Il choisit un nombre d’élixirs égal à sa valeur d’INT (pour un maximum de 4).",
    // Rendu enrichi (PER-69) : nombre d’élixirs préparables = quantité [=INT] (plafonné
    // à 4, en texte). Choix multiple FAIT À LA TABLE (au matin, parmi la liste) → pas
    // de `choices` structuré (décision propriétaire PER-69). Les sorts REPRODUITS sont
    // balisés `[&id|nom]` (puces aux couleurs du profil source) + dépliables via
    // `referencedFeatures` (accordéons sous la description).
    richText:
      "Le forgesort apprend à préparer des élixirs parmi [&magie-des-arcanes-r3|Forme gazeuse], [&magie-elementaire-r2|Maîtrise des éléments], [&magie-protectrice-r2|Chute ralentie] (voies de magicien) et [&mort-r2|Masque mortuaire] (voie de sorcier). Il choisit un nombre d’élixirs égal à [=INT] (pour un maximum de 4).",
    // Sorts reproduits par les recettes mineures (à titre indicatif — non acquis) : dépliables
    // sous la description via un accordéon (cf. `referencedFeatures`).
    referencedFeatures: ['magie-des-arcanes-r3', 'magie-elementaire-r2', 'magie-protectrice-r2', 'mort-r2'],
    // Consomme 1 dose du pool quotidien d'élixirs (partagé, cf. elixirs-r1). Le répertoire préparable
    // (INT recettes, max 4) reste verbatim.
    usageCounter: {
      maxByRankCount: { classIds: ['forgesort'], rank: 3, base: 0, addPathRank: true },
      sharedKey: 'elixirs-doses',
      // Réserve suivie dans une barre sous l'en-tête de la voie des élixirs + bouton « Créer
      // l'élixir » par carte (le forgesort prépare toujours 100 % de ses doses) — pas de jauge d'état.
      poolInPathHeader: true,
      resetOn: 'day',
      label: 'Élixirs du jour',
    },
    sourcePage: 98,
  },
  {
    id: 'elixirs-r5',
    name: 'Élixirs majeurs',
    pathId: 'elixirs',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le forgesort apprend à préparer des élixirs parmi Invisibilité, Vol, Accélération (voies de magicien) et Masque du prédateur (voie de druide). Il choisit un nombre d’élixirs égal à sa valeur d’INT (pour un maximum de 4). Ces préparations comptent pour deux élixirs.",
    // Rendu enrichi (PER-69) : nombre d’élixirs préparables = quantité [=INT] (plafonné
    // à 4, en texte). Choix multiple FAIT À LA TABLE → pas de `choices` structuré. Sorts
    // REPRODUITS balisés `[&id|nom]` + dépliables via `referencedFeatures`.
    richText:
      "Le forgesort apprend à préparer des élixirs parmi [&magie-universelle-r3|Invisibilité], [&magie-universelle-r4|Vol], [&magie-des-arcanes-r4|Accélération] (voies de magicien) et [&animaux-r4|Masque du prédateur] (voie de druide). Il choisit un nombre d’élixirs égal à [=INT] (pour un maximum de 4). Ces préparations comptent pour deux élixirs.",
    // Sorts reproduits par les recettes majeures (à titre indicatif — non acquis) : dépliables
    // sous la description via un accordéon (cf. `referencedFeatures`).
    referencedFeatures: ['magie-universelle-r3', 'magie-universelle-r4', 'magie-des-arcanes-r4', 'animaux-r4'],
    // PER-163 : le forgesort prépare ces élixirs avec son INT. Masque du prédateur (animaux-r4) a une
    // durée en PER (carac du druide) que le forgesort peut avoir à 0 ou négatif → substitution PER→INT
    // (si INT plus élevée), signalée à l'affichage. Sans effet sur les autres recettes (pas de PER).
    reproducedAbilitySubstitutions: [{ from: 'PER', to: 'INT' }],
    // Élixir MAJEUR : « compte pour deux élixirs » → consomme 2 doses du pool partagé (cost: 2).
    // Répertoire préparable (INT recettes, max 4) reste verbatim.
    usageCounter: {
      maxByRankCount: { classIds: ['forgesort'], rank: 3, base: 0, addPathRank: true },
      sharedKey: 'elixirs-doses',
      // Réserve suivie dans une barre sous l'en-tête de la voie des élixirs + bouton « Créer
      // l'élixir » par carte (le forgesort prépare toujours 100 % de ses doses) — pas de jauge d'état.
      poolInPathHeader: true,
      cost: 2,
      resetOn: 'day',
      label: 'Élixirs du jour',
    },
    sourcePage: 98,
  },

  // --- Voie du métal (p. 99) ---
  {
    id: 'metal-r1',
    name: 'Morsure de la forge',
    pathId: 'metal',
    rank: 1,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "Au prix d’une action de mouvement, le forgesort peut enflammer son bâton ou son marteau pendant INT minutes et ajoute +2 DM de feu sur les attaques au contact réalisées avec cette arme. Ce bonus augmente de +1 chaque fois que le personnage atteint le rang 4 dans une voie de forgesort. L’arme s’éteint immédiatement s’il la lâche. En plus de ce sort, le forgesort ajoute son rang + 2 aux tests d’orfèvrerie ou de forge.",
    // Rendu enrichi (PER-69 / PER-92) : durée [=INT] minutes ; « rang + 2 » modificateur aux
    // tests (PER-89). Le « +2 DM de feu » monte de +1 par voie de forgesort au rang 4 (scaling
    // CROSS-VOIE, voie hôte comprise) : encodé [2 + paliers], le compte de voies étant injecté
    // au terme `paliers` (milestoneBonus) par FeaturesByPath. À 0 voie au rang 4, `paliers` est
    // omis → l'encadré affiche « +2 ».
    richText:
      "Au prix d’une action de mouvement, le forgesort peut enflammer son bâton ou son marteau pendant [=INT] minutes et ajoute [2 + paliers] DM de feu sur les attaques au contact réalisées avec cette arme. Ce bonus augmente de +1 chaque fois que le personnage atteint le rang 4 dans une voie de forgesort. L’arme s’éteint immédiatement s’il la lâche. En plus de ce sort, le forgesort ajoute son [rang + 2] aux tests d’orfèvrerie ou de forge.",
    // Bonus de compétence (PER-89) : domaines = orfèvrerie, forge.
    effects: [{ kind: 'test-bonus', domains: ['goldsmithing', 'smithing'] }],
    sourcePage: 99,
  },
  {
    id: 'metal-r2',
    name: 'Métal brûlant',
    pathId: 'metal',
    rank: 2,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "Le forgesort doit réussir un test opposé d’attaque magique (portée 20 m) pour faire chauffer un objet métallique porté par sa cible pendant [1d4+INT] rounds. S’il s’agit d’une arme, elle inflige 1 DM par round à son porteur et un malus de ‑2 aux tests d’attaque. S’il s’agit d’une armure, elle inflige 1d4° DM par round à son porteur (au tour du forgesort). La victime peut se débarrasser précipitamment de son armure au prix d’une action limitée (elle perd le bonus de DEF associé ; dans le cas d’un adversaire, le MJ devra évaluer ce montant).",
    // Rendu enrichi (PER-69) : durée [1d4 + INT] rounds (dé → encadré) ; DM d’armure {1d4°}
    // par round. Les DM/malus subis par la CIBLE ne sont pas des stats du joueur.
    richText:
      "Le forgesort doit réussir un test opposé d’attaque magique (portée 20 m) pour faire chauffer un objet métallique porté par sa cible pendant [1d4 + INT] rounds. S’il s’agit d’une arme, elle inflige 1 DM par round à son porteur et un malus de ‑2 aux tests d’attaque. S’il s’agit d’une armure, elle inflige {1d4°} DM par round à son porteur (au tour du forgesort). La victime peut se débarrasser précipitamment de son armure au prix d’une action limitée (elle perd le bonus de DEF associé ; dans le cas d’un adversaire, le MJ devra évaluer ce montant).",
    sourcePage: 99,
  },
  {
    id: 'metal-r3',
    name: 'Magnétisme',
    pathId: 'metal',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le forgesort contrôle le magnétisme autour de lui pendant INT minutes. Il obtient un bonus de +2 en DEF contre les attaques des armes métalliques (au contact ou à distance). De plus, il divise par deux les DM de tous les projectiles à pointes métalliques (flèches, carreaux, armes de lancer, etc.).",
    // Rendu enrichi (PER-69) : durée [=INT] minutes.
    richText:
      "Le forgesort contrôle le magnétisme autour de lui pendant [=INT] minutes. Il obtient un bonus de +2 en DEF contre les attaques des armes métalliques (au contact ou à distance). De plus, il divise par deux les DM de tous les projectiles à pointes métalliques (flèches, carreaux, armes de lancer, etc.).",
    // +2 DEF SITUATIONNEL (contre les armes métalliques, pendant le sort) → effet
    // conditionnel à interrupteur manuel (PER-67).
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [{ stat: 'def', value: 2 }],
        activation: { kind: 'condition', label: 'Magnétisme actif — contre les armes métalliques', activeByDefault: false },
      },
    ],
    // RD ÷2 sur les projectiles à pointes métalliques (PER-137). Chevauche l'interrupteur ci-dessus :
    // affichée seulement quand Magnétisme est actif.
    damageReduction: { kind: 'divide', value: 2, scopes: ['metallic-projectile'] },
    sourcePage: 99,
  },
  {
    id: 'metal-r4',
    name: 'Métal hurlant',
    pathId: 'metal',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Sur un test opposé d’attaque magique réussi (portée 10 m), le forgesort déforme une pièce d’équipement métallique portée par sa cible. Une arme devient inutilisable et bonne pour le rebut, une armure impose l’utilisation d’un dé malus à tous les tests d’attaque et d’AGI de son porteur. La victime peut se débarrasser de son armure au prix d’une action limitée. Si l’objet est magique, le sort ne fait effet que pendant un seul round (et ne peut pas être renouvelé). Appliqué à une structure (par exemple, une porte blindée), ce sort inflige 3d4° DM en divisant par deux sa RD.",
    // Rendu enrichi (PER-69) : DM de structure {3d4°}. Le reste (déformation d’équipement)
    // affecte la cible → texte.
    richText:
      "Sur un test opposé d’attaque magique réussi (portée 10 m), le forgesort déforme une pièce d’équipement métallique portée par sa cible. Une arme devient inutilisable et bonne pour le rebut, une armure impose l’utilisation d’un dé malus à tous les tests d’attaque et d’AGI de son porteur. La victime peut se débarrasser de son armure au prix d’une action limitée. Si l’objet est magique, le sort ne fait effet que pendant un seul round (et ne peut pas être renouvelé). Appliqué à une structure (par exemple, une porte blindée), ce sort inflige {3d4°} DM en divisant par deux sa RD.",
    sourcePage: 99,
  },
  {
    id: 'metal-r5',
    name: 'Endurer',
    pathId: 'metal',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le forgesort est habitué aux travaux et à la chaleur de la forge. Il divise par deux tous les DM de feu subis et augmente sa CON de +1. Désormais, il obtient un dé bonus aux tests de CON. Finalement, il peut ajouter sa valeur de CON au nombre de PM qu’il obtient.",
    // « ajouter sa valeur de CON au nombre de PM » → bonus permanent de mana égal à la CON.
    // « augmente sa CON de +1 » → modificateur permanent de carac. « dé bonus aux tests de
    // CON » → dé bonus permanent (mécanique core, icône double-d20).
    // « divise par deux les DM de feu » → réduction de dégâts permanente (PER-137).
    effects: [
      { kind: 'stat-bonus', stat: 'manaPoints', value: { scale: 'ability', ability: 'CON' } },
      { kind: 'ability-bonus', ability: 'CON', value: 1 },
      { kind: 'ability-bonus-die', ability: 'CON' },
    ],
    // RD permanente : DM de feu subis divisés par 2 (PER-137). Aucun effet conditionnel → toujours active.
    damageReduction: { kind: 'divide', value: 2, scopes: ['fire'] },
    sourcePage: 99,
  },

  // --- Voie du golem (p. 100) ---
  {
    id: 'golem-r1',
    name: 'Grosse tête',
    pathId: 'golem',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le forgesort remplace la force brutale par un peu de réflexion. Il peut effectuer un test d’INT au lieu d’un test de FOR (par exemple, il utilise un levier pour déplacer une lourde charge). De plus, au niveau où il acquiert cette capacité, il peut ajouter son INT à ses PV au lieu de la CON. Il ajoute son rang + 2 à tous les tests de bricolage ou de science.",
    // Rendu enrichi (PER-69) : « rang + 2 » modificateur aux tests (PER-89).
    // « il peut ajouter son INT à ses PV au lieu de la CON » : DÉCISION du joueur à la prise
    // de la capacité → modélisée en CHOIX d'option (capté, et signalé « non pris » par l'UI,
    // cf. `hasUnmadeChoice`). L'APPLICATION au calcul des PV est un REMPLACEMENT de la
    // contribution de CON (pas un bonus) : l'option `pv-from-int` porte `hpFromAbility: 'INT'`,
    // consommé par `hpAbilitySwapSources` → effet net +(INT − CON) appliqué une seule fois.
    richText:
      "Le forgesort remplace la force brutale par un peu de réflexion. Il peut effectuer un test d’INT au lieu d’un test de FOR (par exemple, il utilise un levier pour déplacer une lourde charge). De plus, au niveau où il acquiert cette capacité, il peut ajouter son INT à ses PV au lieu de la CON. Il ajoute son [rang + 2] à tous les tests de bricolage ou de science.",
    // Bonus de compétence (PER-89) : domaines = bricolage, science (gouvernés par l'INT,
    // cohérent avec « un test d'INT au lieu d'un test de FOR » de cette capacité).
    effects: [{ kind: 'test-bonus', domains: ['tinkering', 'science'] }],
    choices: [
      {
        kind: 'option',
        prompt: 'Caractéristique utilisée pour les PV (à la prise de cette capacité)',
        options: [
          { id: 'pv-from-con', label: 'PV basés sur la CON (par défaut)' },
          { id: 'pv-from-int', label: 'PV basés sur l’INT (au lieu de la CON)', hpFromAbility: 'INT' },
        ],
      },
    ],
    sourcePage: 100,
  },
  {
    id: 'golem-r2',
    name: 'Golem',
    pathId: 'golem',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le golem est une créature humanoïde fabriquée par le forgesort pour lui servir de serviteur et de garde du corps. Il comprend des ordres simples, comme suivre, attaquer, monter la garde, mais il est incapable d’actions complexes ou nécessitant une motricité fine (comme de la couture par exemple !).\n\nGOLEM\nCRÉATURE NON VIVANTE\n| AGI ‑1 | CON +10 | FOR +1 | PER ‑3 | | CHA ‑4 | INT ‑3 | VOL +4 |\n(S) Défense [10 + rang dans la voie] (V) Points de vigueur [niv. du forgesort × 5] (I) Initiative [Init. du forgesort]\nAttaque [attaque magique du forgesort] · DM 1d4°+1",
    // Rendu enrichi (PER-69) : la prose seule ; le bloc de stats est porté par
    // `creatureProfile` (mini-fiche `CreatureStatBlock`), pas recopié dans richText.
    richText:
      "Le golem est une créature humanoïde fabriquée par le forgesort pour lui servir de serviteur et de garde du corps. Il comprend des ordres simples, comme suivre, attaquer, monter la garde, mais il est incapable d’actions complexes ou nécessitant une motricité fine (comme de la couture par exemple !).",
    // Profil structuré du golem. Défense [10 + rang] (rang de la voie), PV [=niveau × 5]
    // (niveau du forgesort), DM [1d4° + 1] ; Initiative et Attaque renvoient au maître.
    creatureProfile: {
      name: 'Golem',
      type: 'Créature non vivante',
      abilities: { AGI: -1, CON: 10, FOR: 1, PER: -3, CHA: -4, INT: -3, VOL: 4 },
      defense: '[10 + rang]',
      hitPoints: '[=niveau × 5]',
      initiative: { fromMaster: 'initiative' },
      attack: { fromMaster: 'magicAttack', damage: '[1d4° + 1]' },
    },
    sourcePage: 100,
  },
  {
    id: 'golem-r3',
    name: 'Protecteur',
    pathId: 'golem',
    rank: 3,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par round, s’il est au contact d’un personnage, le golem peut s’interposer et subir les DM d’une attaque à sa place.",
    sourcePage: 100,
  },
  {
    id: 'golem-r4',
    name: 'Statuette',
    pathId: 'golem',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le forgesort transforme son golem en statuette d’une douzaine de centimètres de haut, recouverte de runes. Sous forme de statuette, le golem ne peut pas agir, mais il bénéficie d’une RD 10. À tout moment, le forgesort peut utiliser une action de mouvement pour jeter la figurine au sol et lui rendre sa taille normale et toutes ses fonctions.",
    sourcePage: 100,
  },
  {
    id: 'golem-r5',
    name: 'Golem supérieur',
    pathId: 'golem',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le forgesort peut améliorer son golem en choisissant une option parmi les suivantes. Le joueur peut choisir une option différente supplémentaire à chaque fois qu’il atteint le rang 5 dans une voie de forgesort.\n Armure : +5 en DEF\n Forme de félin : +3 en AGI et en DEF, dé bonus en AGI\n Baliste : portée 20 m, [1d4°+AGI] DM\n Grande taille : +2 PV par niveau et +1 en FOR et DM\n Vol : des « sauts » de 40 m en action limitée\n Cerveau amélioré : +2 en INT, PER et CHA, doué de parole\n Puissant : +2 en FOR et aux DM, dé bonus en FOR\n Arme à deux mains : +1d4° aux DM au contact",
    // Rendu enrichi (PER-69) : DM de la Baliste [1d4° + AGI] et bonus Arme à deux mains
    // +{1d4°} (stats du GOLEM → pas d’`effects` joueur).
    richText:
      "Le forgesort peut améliorer son golem en choisissant une option parmi les suivantes. Le joueur peut choisir une option différente supplémentaire à chaque fois qu’il atteint le rang 5 dans une voie de forgesort.\n Armure : +5 en DEF\n Forme de félin : +3 en AGI et en DEF, dé bonus en AGI\n Baliste : portée 20 m, [1d4° + AGI] DM\n Grande taille : +2 PV par niveau et +1 en FOR et DM\n Vol : des « sauts » de 40 m en action limitée\n Cerveau amélioré : +2 en INT, PER et CHA, doué de parole\n Puissant : +2 en FOR et aux DM, dé bonus en FOR\n Arme à deux mains : +{1d4°} aux DM au contact",
    // Choix RÉPÉTABLE d’amélioration(s) de golem (p. 100) : une amélioration distincte
    // par voie de forgesort au rang 5 (la voie du golem comprise) → `repeat`. Le moteur
    // de choix résout le nombre autorisé depuis la progression (`repeatableChoiceCount`)
    // et la sélection est un tableau d’ids d’options.
    choices: [
      {
        kind: 'option',
        prompt: 'Amélioration(s) du golem',
        repeat: { by: 'paths-at-rank', classIds: ['forgesort'], rank: 5 },
        options: [
          // Convention « Nom (détail) » (comme Diversité, voie de l'humain) : le rendu
          // n'affiche que le NOM dans le badge et sort le détail entre parenthèses à
          // côté (vue liste) ou le masque (vue colonne compacte).
          { id: 'armor', label: 'Armure (+5 en DEF)' },
          // Dé bonus du GOLEM (icône double-d20 sur sa mini-fiche) quand l'option est retenue.
          { id: 'feline-form', label: 'Forme de félin (+3 en AGI et en DEF, dé bonus en AGI)', creatureAbilityBonusDie: 'AGI' },
          { id: 'ballista', label: 'Baliste (portée 20 m, 1d4°+AGI DM)' },
          { id: 'large', label: 'Grande taille (+2 PV par niveau et +1 en FOR et DM)' },
          { id: 'flight', label: 'Vol (des « sauts » de 40 m en action limitée)' },
          { id: 'enhanced-brain', label: 'Cerveau amélioré (+2 en INT, PER et CHA, doué de parole)' },
          { id: 'mighty', label: 'Puissant (+2 en FOR et aux DM, dé bonus en FOR)', creatureAbilityBonusDie: 'FOR' },
          { id: 'two-handed-weapon', label: 'Arme à deux mains (+1d4° aux DM au contact)' },
        ],
      },
    ],
    sourcePage: 100,
  },

  // --- Voie des runes (p. 101) ---
  {
    id: 'runes-r1',
    name: 'Runes de défense',
    pathId: 'runes',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le forgesort inscrit des runes de protection sur l’ensemble de son équipement et parfois jusque sur sa peau. Il obtient un bonus de +2 en DEF. Ce bonus augmente de +1 au rang 3 puis au rang 5. S’il possède un golem, il peut inscrire les runes sur celui‑ci avec le même effet.\n\nPROFIL HYBRIDE\nExceptionnellement, un profil hybride peut utiliser cette capacité avec une armure qu’il est capable de porter, supérieure à l’armure de cuir, bien que, dans ce cas, le bonus de DEF soit alors divisé par deux (+1 en DEF au rang 1, +2 au rang 4). Bien que cette capacité ne soit pas considérée comme un sort, elle requiert au moins +1 en INT pour être apprise, comme toutes les runes de forgesort.",
    // Bonus permanent +2 en DEF, porté à +3 au rang 3 puis +4 au rang 5 de CETTE voie
    // (stepped par rang de voie hôte). Pas de richText : la montée par rang est décrite
    // en prose (format §7, texte littéral) et portée par `effects`.
    // FRONTIÈRE milestone Armures : le cas « profil hybride » (DEF divisée par deux avec
    // une armure > cuir) dépend du port d’armure → câblé côté milestone Armures, pas ici.
    effects: [
      {
        kind: 'stat-bonus',
        stat: 'def',
        value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 2 }, { min: 3, value: 3 }, { min: 5, value: 4 }] },
      },
    ],
    sourcePage: 101,
  },
  {
    id: 'runes-r2',
    name: 'Rune de puissance',
    pathId: 'runes',
    rank: 2,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le forgesort enchante une arme pour 24 h. Une fois par combat, celle‑ci peut d’infliger les DM maximaux sur une attaque au contact ou à distance. Les dés bonus ne sont pas maximisés (attaque sournoise ou puissante, rage, etc.). Le joueur doit annoncer l’utilisation de la rune avant de lancer les dés de DM.",
    sourcePage: 101,
  },
  {
    id: 'runes-r3',
    name: 'Rune de protection',
    pathId: 'runes',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le forgesort enchante une armure (ou des vêtements) pour 24 h. Une fois par jour, celle‑ci permet d’ignorer les dommages d’une attaque que le personnage subit (au contact, magique ou à distance). Si l’attaque est un critique, le personnage subit tout de même les DM normaux (non‑critique). Pour activer la rune, le personnage doit être conscient et ne pas être surpris (action gratuite). Le joueur doit activer la rune avant de connaître le montant des DM.",
    sourcePage: 101,
  },
  {
    id: 'runes-r4',
    name: 'Rune d’énergie',
    pathId: 'runes',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le forgesort enchante un bijou pour une durée de 24 h. Une fois par combat, celui‑ci permet d’obtenir un d20 bonus sur un test de son choix déterminé au moment où l’effet est utilisé : test d’attaque ou de caractéristique.",
    sourcePage: 101,
  },
  {
    id: 'runes-r5',
    name: 'Rune de garde',
    pathId: 'runes',
    rank: 5,
    isSpell: true,
    actionTypes: [],
    text:
      "En réalisant un rituel de 10 min, le forgesort inscrit des runes invisibles au sol. Il protège une zone allant jusqu’à 10 m de diamètre pendant 12 h. À chaque fois qu’une créature (de taille au moins très petite) pénètre dans la zone protégée, le sort produit un effet choisi (voir ci‑après) au moment où le sort est lancé. Les créatures présentes dans la zone pendant le rituel ne déclenchent pas le sort. Ce sort peut aussi être utilisé sur une porte ou un coffre. Il est automatiquement lancé avec la règle de concentration et coûte seulement 3 PM pour être lancé.\n Alarme : un puissant gong retentit et la cible est étourdie pendant 1 round à moins de réussir un test de CON difficulté 15.\n Feu : [3d4°+INT] DM de feu (un autre élément peut être choisi parmi foudre, froid, acide).",
    // Rendu enrichi (PER-69) : le test de @CON est celui de la créature qui pénètre
    // (référence) ; DM de l’effet Feu [3d4° + INT]. Le choix d’élément (foudre/froid/acide)
    // se fait au lancement → pas de `choices` structuré.
    richText:
      "En réalisant un rituel de 10 min, le forgesort inscrit des runes invisibles au sol. Il protège une zone allant jusqu’à 10 m de diamètre pendant 12 h. À chaque fois qu’une créature (de taille au moins très petite) pénètre dans la zone protégée, le sort produit un effet choisi (voir ci‑après) au moment où le sort est lancé. Les créatures présentes dans la zone pendant le rituel ne déclenchent pas le sort. Ce sort peut aussi être utilisé sur une porte ou un coffre. Il est automatiquement lancé avec la règle de concentration et coûte seulement 3 PM pour être lancé.\n Alarme : un puissant gong retentit et la cible est étourdie pendant 1 round à moins de réussir un test de @CON difficulté 15.\n Feu : [3d4° + INT] DM de feu (un autre élément peut être choisi parmi foudre, froid, acide).",
    // Pas de `manaCost` : le coût de base reste le rang (5 PM). Le « 3 PM » du
    // texte est le rang − 2 dû à la Concentration AUTOMATIQUE de ce sort (p. 228),
    // une réduction dynamique, hors coût de base (PER-65).
    sourcePage: 101,
  },

  // ===================== MAGICIEN =====================

  // --- Voie de la magie des arcanes (p. 103) ---
  {
    id: 'magie-des-arcanes-r1',
    name: 'Projectile de mana',
    pathId: 'magie-des-arcanes',
    rank: 1,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien choisit une cible visible située à moins de 30 m et lance sur elle un projectile d’énergie ésotérique pure, déformant la trame de la réalité. La cible subit automatiquement 1d4° DM. Si le joueur obtient le résultat maximal sur son dé de dommages, il peut le relancer et ajouter le nouveau résultat (une seule fois). Les DM du projectile de mana augmentent de +1 chaque fois que le personnage atteint le rang 4 dans une voie de magicien jusqu’à un maximum égal à sa valeur d’INT.",
    // Rendu enrichi (PER-69 / PER-92) : DM [1d4° + paliers] — le terme `paliers` (milestoneBonus)
    // porte la montée CROSS-VOIE « +1 par voie de magicien au rang 4 » (voie hôte comprise),
    // PLAFONNÉE à l'INT. Le plafond est replié dans la valeur injectée par FeaturesByPath
    // (min(compte, INT)) ; la phrase de montée l'exprime via le token carac [INT]. À 0 voie au
    // rang 4, `paliers` est omis → l'encadré affiche le seul dé {1d4°}.
    richText:
      "Le magicien choisit une cible visible située à moins de 30 m et lance sur elle un projectile d’énergie ésotérique pure, déformant la trame de la réalité. La cible subit automatiquement [1d4° + paliers] DM. Si le joueur obtient le résultat maximal sur son dé de dommages, il peut le relancer et ajouter le nouveau résultat (une seule fois). Les DM du projectile de mana augmentent de +1 chaque fois que le personnage atteint le rang 4 dans une voie de magicien, jusqu’à un maximum égal à son [INT].",
    sourcePage: 103,
  },
  {
    id: 'magie-des-arcanes-r2',
    name: 'Lévitation',
    pathId: 'magie-des-arcanes',
    rank: 2,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "Le magicien peut se déplacer verticalement de 5 m par action de mouvement vers le haut ou de 10 m vers le bas pendant INT minutes. Rester en vol stationnaire à la même hauteur demande une action de mouvement.",
    // Rendu enrichi (PER-69) : durée « pendant [=INT] minutes ».
    richText:
      "Le magicien peut se déplacer verticalement de 5 m par action de mouvement vers le haut ou de 10 m vers le bas pendant [=INT] minutes. Rester en vol stationnaire à la même hauteur demande une action de mouvement.",
    sourcePage: 103,
  },
  {
    id: 'magie-des-arcanes-r3',
    name: 'Forme gazeuse',
    pathId: 'magie-des-arcanes',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien prend la consistance d’un gaz pendant 1 min. Il se déplace au ras du sol (s’il chute, il le fait au ralenti) à une vitesse de 5 m par action de mouvement (M). Il peut s’introduire par les plus petits interstices (comme sous une porte), mais ne peut utiliser aucune capacité. Sous cette forme, les armes ordinaires ne lui infligent aucun DM, mais la magie et les armes magiques l’affectent normalement.",
    // PER-137 : IMMUNITÉ aux DM non magiques (« armes ordinaires ») pendant le sort (forme gazeuse).
    // La magie et les armes magiques affectent normalement → scope `non-magical`. Marqueur d'état.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Forme gazeuse active', activeByDefault: false },
      },
    ],
    damageReduction: { kind: 'immunity', scopes: ['non-magical'] },
    sourcePage: 103,
  },
  {
    id: 'magie-des-arcanes-r4',
    name: 'Accélération',
    pathId: 'magie-des-arcanes',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien voit son métabolisme s’accélérer pendant [1d4°+INT] rounds. Il reçoit immédiatement une action de mouvement supplémentaire, puis une action de mouvement supplémentaire à chaque round. À son tour, il peut choisir de sacrifier cette action de mouvement pour obtenir au choix +3 en DEF pendant un round ou ‑1 PM sur le lancement d’un sort à ce round. Il est possible de cumuler cette réduction de ‑1 PM avec une Concentration (L) (voir le chapitre « La magie », page 227). Par exemple, une Désintégration lancée de cette façon coûtera 5 – 2 – 1 = 2 PM.",
    // Rendu enrichi (PER-69) : durée [1d4° + INT] rounds. Le « +3 DEF pendant un round »
    // est un choix PAR ROUND ultra-transitoire (pas un interrupteur persistant) → texte.
    // Le « ‑1 PM » est une réduction DYNAMIQUE du coût (hors `manaCost`, cf. PER-65).
    richText:
      "Le magicien voit son métabolisme s’accélérer pendant [1d4° + INT] rounds. Il reçoit immédiatement une action de mouvement supplémentaire, puis une action de mouvement supplémentaire à chaque round. À son tour, il peut choisir de sacrifier cette action de mouvement pour obtenir au choix +3 en DEF pendant un round ou ‑1 PM sur le lancement d’un sort à ce round. Il est possible de cumuler cette réduction de ‑1 PM avec une Concentration (L) (voir le chapitre « La magie », page 227). Par exemple, une Désintégration lancée de cette façon coûtera 5 – 2 – 1 = 2 PM.",
    sourcePage: 103,
  },
  {
    id: 'magie-des-arcanes-r5',
    name: 'Désintégration',
    pathId: 'magie-des-arcanes',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien projette un rayon mortel dont la portée est de 20 m et qui annule la cohésion de la matière, ne laissant derrière lui qu’un amas de poussière. Un test d’attaque magique réussi contre la DEF de la cible inflige [5d4°+INT] DM. Si le magicien vise un objet porté par une créature, le test d’attaque subit un dé malus. Les objets magiques sont insensibles à ce sort et les objets normaux (jusqu’à 100 kg) sont réduits en poussière. Une créature réduite à 0 PV par ce sort est proprement désintégrée, ne laissant aucun cadavre derrière elle ! (Ses objets magiques sont épargnés).",
    // Rendu enrichi (PER-69) : DM [5d4° + INT].
    richText:
      "Le magicien projette un rayon mortel dont la portée est de 20 m et qui annule la cohésion de la matière, ne laissant derrière lui qu’un amas de poussière. Un test d’attaque magique réussi contre la DEF de la cible inflige [5d4° + INT] DM. Si le magicien vise un objet porté par une créature, le test d’attaque subit un dé malus. Les objets magiques sont insensibles à ce sort et les objets normaux (jusqu’à 100 kg) sont réduits en poussière. Une créature réduite à 0 PV par ce sort est proprement désintégrée, ne laissant aucun cadavre derrière elle ! (Ses objets magiques sont épargnés).",
    sourcePage: 103,
  },

  // --- Voie de la magie destructrice (p. 103) ---
  {
    id: 'magie-destructrice-r1',
    name: 'Arc de feu',
    pathId: 'magie-destructrice',
    rank: 1,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Des flammes jaillissent des doigts tendus du magicien. Jusqu’à 3 cibles au contact subissent [1d4°+INT] DM, les cibles peuvent faire un test d’AGI difficulté [10 + INT] pour ne subir que la moitié des DM. Les DM passent à 2d4° au rang 4.",
    // Rendu enrichi (PER-69) : DM [1d4°|2@4 + INT] — le NOMBRE DE DÉS passe à 2d4° au rang 4
    // de la voie (palier IN-VOIE `|2@4`) ; la phrase « passent à 2d4° au rang 4 » est gardée
    // en explication. Test d’@AGI (cibles) ; difficulté [10 + INT] (INT du joueur).
    richText:
      "Des flammes jaillissent des doigts tendus du magicien. Jusqu’à 3 cibles au contact subissent [1d4°|2@4 + INT] DM, les cibles peuvent faire un test d’@AGI difficulté [10 + INT] pour ne subir que la moitié des DM. Les DM passent à {2d4°} au rang 4.",
    sourcePage: 103,
  },
  {
    id: 'magie-destructrice-r2',
    name: 'Saper les forces',
    pathId: 'magie-destructrice',
    rank: 2,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien choisit une cible vivante située à une distance maximum de 10 m. S’il réussit un test opposé d’attaque magique, la cible subit un malus de ‑2 à ses tests de FOR, d’attaque au contact et aux DM, jusqu’à la fin du combat. Le sort n’est pas cumulable plusieurs fois sur la même cible.",
    sourcePage: 103,
  },
  {
    id: 'magie-destructrice-r3',
    name: 'Flèche de feu',
    pathId: 'magie-destructrice',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien choisit une cible située à moins de 30 m. Si son attaque magique réussit (contre DEF), la cible subit [3d4°+INT] DM. Chaque round de combat suivant, le feu inflige 1d6 DM supplémentaires. Sur un résultat de 1 ou 2, le sort prend fin. Les DM sur la durée ne sont pas cumulables si le sort est lancé plusieurs fois.",
    // Rendu enrichi (PER-69) : DM initiaux [3d4° + INT] ; DM sur la durée {1d6} par round.
    richText:
      "Le magicien choisit une cible située à moins de 30 m. Si son attaque magique réussit (contre DEF), la cible subit [3d4° + INT] DM. Chaque round de combat suivant, le feu inflige {1d6} DM supplémentaires. Sur un résultat de 1 ou 2, le sort prend fin. Les DM sur la durée ne sont pas cumulables si le sort est lancé plusieurs fois.",
    sourcePage: 103,
  },
  {
    id: 'magie-destructrice-r4',
    name: 'Explosion de feu',
    pathId: 'magie-destructrice',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien choisit un point situé à moins de 30 m. Toutes les créatures (y compris le magicien et ses compagnons) se trouvant dans un rayon de 5 m autour de ce point subissent [4d4°+INT] DM et peuvent effectuer un test d’AGI difficulté [10 + INT] pour ne subir que la moitié des DM.",
    // Rendu enrichi (PER-69) : DM [4d4° + INT] ; le test d’@AGI est celui des créatures ;
    // difficulté [10 + INT] (INT du joueur).
    richText:
      "Le magicien choisit un point situé à moins de 30 m. Toutes les créatures (y compris le magicien et ses compagnons) se trouvant dans un rayon de 5 m autour de ce point subissent [4d4° + INT] DM et peuvent effectuer un test d’@AGI difficulté [10 + INT] pour ne subir que la moitié des DM.",
    sourcePage: 103,
  },
  {
    id: 'magie-destructrice-r5',
    name: 'Appel de la foudre',
    pathId: 'magie-destructrice',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien projette des traits de foudre sur toutes les cibles de son choix dans un rayon de 10 m autour de lui. Il fait un seul test d’attaque magique et toutes les créatures ciblées dont il atteint la DEF subissent [2d4°+INT] DM d’électricité.",
    // Rendu enrichi (PER-69) : DM [2d4° + INT].
    richText:
      "Le magicien projette des traits de foudre sur toutes les cibles de son choix dans un rayon de 10 m autour de lui. Il fait un seul test d’attaque magique et toutes les créatures ciblées dont il atteint la DEF subissent [2d4° + INT] DM d’électricité.",
    sourcePage: 103,
  },

  // --- Voie de la magie élémentaire (p. 104) ---
  {
    id: 'magie-elementaire-r1',
    name: 'Asphyxie',
    pathId: 'magie-elementaire',
    rank: 1,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Si le magicien réussit un test opposé d’attaque magique (avec une portée de 20 m), la créature ciblée est privée d’air. La victime étouffe progressivement et subit 1d4° DM par round pendant INT rounds. Les créatures qui ne respirent pas (morts‑vivants, créatures artificielles) sont immunisées à ce sort. En revanche, les réductions de dommages (voie du colosse, par exemple) ne s’appliquent pas.",
    // Rendu enrichi (PER-69) : DM {1d4°} par round ; durée [=INT] rounds.
    richText:
      "Si le magicien réussit un test opposé d’attaque magique (avec une portée de 20 m), la créature ciblée est privée d’air. La victime étouffe progressivement et subit {1d4°} DM par round pendant [=INT] rounds. Les créatures qui ne respirent pas (morts‑vivants, créatures artificielles) sont immunisées à ce sort. En revanche, les réductions de dommages (voie du colosse, par exemple) ne s’appliquent pas.",
    sourcePage: 104,
  },
  {
    id: 'magie-elementaire-r2',
    name: 'Maîtrise des éléments',
    pathId: 'magie-elementaire',
    rank: 2,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "Le magicien retranche son rang + 2 à tous les DM de feu, de froid, d’électricité ou d’acide subis pendant INT minutes. De plus, pendant la durée du sort, lorsqu’il lance un sort d’un élément, le magicien peut échanger un élément contre un autre (par exemple, une explosion de froid ou une flèche acide).",
    // Rendu enrichi (PER-69) : réduction de DM « rang + 2 » → [rang + 2] ; durée [=INT] minutes.
    richText:
      "Le magicien retranche son [rang + 2] à tous les DM de feu, de froid, d’électricité ou d’acide subis pendant [=INT] minutes. De plus, pendant la durée du sort, lorsqu’il lance un sort d’un élément, le magicien peut échanger un élément contre un autre (par exemple, une explosion de froid ou une flèche acide).",
    // PER-137 : RD TEMPORAIRE plate « rang + 2 » contre UN SEUL élément, CHOISI à la table (le livre
    // dit « feu, froid, électricité OU acide » + échange d'élément en cours de sort). Le scope est donc
    // un choix d'état de jeu (`scopeChoice` → `Character.effectInputs`, hors mode édition), et le
    // sélecteur d'élément tient lieu d'interrupteur (« Aucun » = inactif). Valeur scalante (rang + 2).
    damageReduction: {
      kind: 'flat',
      value: {
        scale: 'stepped',
        by: 'path-rank',
        steps: [
          { min: 1, value: 3 },
          { min: 2, value: 4 },
          { min: 3, value: 5 },
          { min: 4, value: 6 },
          { min: 5, value: 7 },
        ],
      },
      scopeChoice: ['fire', 'cold', 'lightning', 'acid'],
    },
    sourcePage: 104,
  },
  {
    id: 'magie-elementaire-r3',
    name: 'Arme élémentaire',
    pathId: 'magie-elementaire',
    rank: 3,
    isSpell: true,
    actionTypes: ['A', 'L'],
    text:
      "Le magicien peut enchanter, en la touchant, une arme au contact ou à distance pour INT minutes. S’il s’agit de son arme, l’incantation est une action d’attaque (A) ; si elle appartient à autrui, c’est une action limitée (L). Si l’arme change de main, le sort prend fin. L’arme inflige +1d4° DM de feu, de froid, d’électricité ou d’acide en plus des DM habituels. Le magicien doit choisir l’élément au moment de l’incantation. Tant qu’il tient l’arme élémentaire en main, les sorts basés sur cet élément lui coûtent 1 PM de moins pour être lancés (par exemple, Mains brûlantes ou Explosion de feu s’il a enflammé son bâton). Ce sort ne fait aucun effet sur une arme qui bénéficie déjà d’un bonus élémentaire aux DM.",
    // Rendu enrichi (PER-69) : durée [=INT] minutes ; bonus de DM élémentaire +{1d4°}.
    // Le choix d’élément se fait au lancement (runtime) → pas de `choices`. Le « 1 PM de
    // moins » est une réduction DYNAMIQUE du coût (hors `manaCost`, cf. PER-65).
    richText:
      "Le magicien peut enchanter, en la touchant, une arme au contact ou à distance pour [=INT] minutes. S’il s’agit de son arme, l’incantation est une action d’attaque (A) ; si elle appartient à autrui, c’est une action limitée (L). Si l’arme change de main, le sort prend fin. L’arme inflige +{1d4°} DM de feu, de froid, d’électricité ou d’acide en plus des DM habituels. Le magicien doit choisir l’élément au moment de l’incantation. Tant qu’il tient l’arme élémentaire en main, les sorts basés sur cet élément lui coûtent 1 PM de moins pour être lancés (par exemple, Mains brûlantes ou Explosion de feu s’il a enflammé son bâton). Ce sort ne fait aucun effet sur une arme qui bénéficie déjà d’un bonus élémentaire aux DM.",
    sourcePage: 104,
  },
  {
    id: 'magie-elementaire-r4',
    name: 'Respiration aquatique',
    pathId: 'magie-elementaire',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien peut respirer sous l’eau pendant 10 minutes. Cette capacité peut être étendue à un compagnon par point d’INT.",
    // Rendu enrichi (PER-69) : « un compagnon par point d’INT » = un nombre de compagnons
    // égal à l’INT → quantité [=INT]. La durée (10 minutes) est fixe → littéral.
    richText:
      "Le magicien peut respirer sous l’eau pendant 10 minutes. Cette capacité peut être étendue à un compagnon par point d’[#INT].",
    sourcePage: 104,
  },
  {
    id: 'magie-elementaire-r5',
    name: 'Armure de pierre',
    pathId: 'magie-elementaire',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Pendant INT minutes, le magicien retranche 5 points à tous les DM subis. Le sort prend fin dès qu’il a absorbé [niveau du magicien × 3] DM. Cette réduction se cumule à celle offerte par la Maîtrise des éléments. Armure de pierre est incompatible avec le sort Déphasage (voie de la magie protectrice), il y met fin immédiatement.",
    // Rendu enrichi (PER-69) : durée [=INT] minutes ; seuil d’absorption « niveau du
    // magicien × 3 » → quantité [=niveau × 3] (suffixe implicite retiré). La réduction
    // « 5 points » de DM est fixe → littéral.
    richText:
      "Pendant [=INT] minutes, le magicien retranche 5 points à tous les DM subis. Le sort prend fin dès qu’il a absorbé [=niveau × 3] DM. Cette réduction se cumule à celle offerte par la Maîtrise des éléments. Armure de pierre est incompatible avec le sort Déphasage (voie de la magie protectrice), il y met fin immédiatement.",
    // Interrupteur MARQUEUR (aucun bonus de stat dérivée) : il ne porte que la durée
    // du sort et l'exclusion mutuelle avec Déphasage (« incompatible… y met fin »).
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Armure de pierre active', activeByDefault: false },
        disablesFeatures: ['magie-protectrice-r3'],
      },
    ],
    // RD plate de 5 sur TOUS les DM subis, avec plafond d'absorption niveau × 3
    // (préparation « stats avancées » — non encore lue par le moteur).
    damageReduction: { kind: 'flat', value: 5, absorptionCap: { scale: 'level', factor: 3 } },
    // PER-137 : compteur de SUIVI de l'absorption (le sort prend fin après niveau × 3 DM absorbés).
    // Démarre plein et se décrémente À LA MAIN au fil des DM absorbés (pas de consommation au lancement
    // du sort → `consumeOnActivate: false`).
    // Suivi d'absorption rechargé au relancement du sort, pas au repos → resetOn manuel.
    // Compteur de SUIVI lié à l'interrupteur du sort (PER-150) : la jauge d'état ne s'affiche que
    // sort actif (`visibleWhenEffectActive`) ; (re)lancer le sort la remet à plein (`resetOnActivate`) ;
    // atteindre 0 met fin au sort (`endsEffectAtZero`). Hors sort, le plafond niveau × 3 n'a rien à
    // décompter. L'activation ne consomme rien (`consumeOnActivate: false`) et le repos ne recharge pas
    // (`resetOn: 'manual'` — c'est le relancement du sort qui recharge).
    usageCounter: {
      maxByLevel: 3,
      consumeOnActivate: false,
      resetOn: 'manual',
      visibleWhenEffectActive: true,
      resetOnActivate: true,
      endsEffectAtZero: true,
      label: 'Absorption restante (DM)',
    },
    sourcePage: 104,
  },

  // --- Voie de la magie protectrice (p. 104) ---
  {
    id: 'magie-protectrice-r1',
    name: 'Armure de mana',
    pathId: 'magie-protectrice',
    rank: 1,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "Le magicien fait apparaître une protection magique chatoyante qui recouvre son corps et produit des étincelles à chaque fois qu’il encaisse un coup. Pendant INT minutes, la DEF du magicien augmente de +3. Cette valeur passe à +4 lorsque le personnage atteint le rang 3 dans la voie et augmente de +1 supplémentaire chaque fois que le personnage atteint le rang 5 dans une voie de magicien (ou dans la voie du mage). Ce sort ne se cumule jamais à une armure (il est considéré comme une armure).",
    // Rendu enrichi (PER-69) : durée [=INT] minutes ; la montée du bonus de DEF reste en prose.
    richText:
      "Le magicien fait apparaître une protection magique chatoyante qui recouvre son corps et produit des étincelles à chaque fois qu’il encaisse un coup. Pendant [=INT] minutes, la DEF du magicien augmente de +3. Cette valeur passe à +4 lorsque le personnage atteint le rang 3 dans la voie et augmente de +1 supplémentaire chaque fois que le personnage atteint le rang 5 dans une voie de magicien (ou dans la voie du mage). Ce sort ne se cumule jamais à une armure (il est considéré comme une armure).",
    // Bonus de DEF TEMPORAIRE (sort à durée), à interrupteur manuel (PER-67) :
    //  - base 3, porté à 4 au rang 3 de CETTE voie (stepped par rang de voie hôte) ;
    //  - PLUS +1 par voie de magicien (ou la voie du mage) au rang 5 (milestone-count
    //    CROSS-VOIE). Ex. 5 voies de magicien au rang 5 → 4 + 5 = 9.
    // FRONTIÈRE milestone Armures : « ne se cumule jamais à une armure » → câblé côté Armures.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [
          {
            stat: 'def',
            value: {
              scale: 'sum',
              parts: [
                { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 3 }, { min: 3, value: 4 }] },
                { scale: 'milestone-count', per: 1, rank: 5, classIds: ['magicien'], includeMagePath: true },
              ],
            },
          },
        ],
        activation: { kind: 'temporary', label: 'Armure de mana active', activeByDefault: false },
      },
    ],
    sourcePage: 104,
  },
  {
    id: 'magie-protectrice-r2',
    name: 'Chute ralentie',
    pathId: 'magie-protectrice',
    rank: 2,
    isSpell: true,
    actionTypes: ['G'],
    text:
      "Le magicien peut désigner un nombre de cibles maximal (dont lui‑même) égal à son INT à une portée de 10 m, même en dehors de son tour. Les cibles peuvent chuter de n’importe quelle hauteur sans subir de dommages. En cas de chute inattendue, le magicien doit faire un test d’INT difficulté 15 pour chacun de ses compagnons afin d’avoir le temps de lancer le sort (réussite automatique sur lui‑même).",
    // Rendu enrichi (PER-69) : nombre de cibles « égal à son INT » → quantité [=INT].
    richText:
      "Le magicien peut désigner un nombre de cibles maximal (dont lui‑même) égal à son [#INT] à une portée de 10 m, même en dehors de son tour. Les cibles peuvent chuter de n’importe quelle hauteur sans subir de dommages. En cas de chute inattendue, le magicien doit faire un test d’INT difficulté 15 pour chacun de ses compagnons afin d’avoir le temps de lancer le sort (réussite automatique sur lui‑même).",
    sourcePage: 105,
  },
  {
    id: 'magie-protectrice-r3',
    name: 'Déphasage',
    pathId: 'magie-protectrice',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Pendant [1d4°+INT] rounds, le corps du magicien se désincarne par intermittence, son image se brouille et tous les DM des attaques de contact ou à distance qu’il subit et qu’il inflige sont divisés par 2. Les DM des sorts ne sont pas réduits. Un personnage sous l’effet d’un sort d’armure de pierre ne peut se déphaser.",
    // Rendu enrichi (PER-69) : durée [1d4° + INT] rounds.
    richText:
      "Pendant [1d4° + INT] rounds, le corps du magicien se désincarne par intermittence, son image se brouille et tous les DM des attaques de contact ou à distance qu’il subit et qu’il inflige sont divisés par 2. Les DM des sorts ne sont pas réduits. Un personnage sous l’effet d’un sort d’armure de pierre ne peut se déphaser.",
    // Interrupteur MARQUEUR : durée du sort + exclusion réciproque avec Armure de
    // pierre (« un personnage sous armure de pierre ne peut se déphaser »).
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Déphasage actif', activeByDefault: false },
        disablesFeatures: ['magie-elementaire-r5'],
      },
    ],
    // RD défensive : DM physiques (contact/distance) subis divisés par 2, hors sorts.
    // La division des DM INFLIGÉS (malus offensif) sort du modèle RD → reste verbatim.
    damageReduction: { kind: 'divide', value: 2, scopes: ['physical'] },
    sourcePage: 105,
  },
  {
    id: 'magie-protectrice-r4',
    name: 'Cercle de protection',
    pathId: 'magie-protectrice',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien peut tracer un cercle sur le sol (environ 2 m de diamètre) afin de se protéger et d’inclure à sa protection un nombre de personnes égal à son INT. Une fois par round, lorsqu’un sort prend pour cible un personnage protégé, le magicien fait un test d’attaque magique opposé avec l’auteur du sort. Si le test est réussi, le sort adverse est annulé et n’a aucun effet. De plus, toutes les créatures invoquées (élémentaires, démons) et les morts‑vivants qui veulent attaquer une créature dans le cercle subissent un dé malus en attaque. Si le magicien sort du cercle, le sort est dissipé.",
    // Rendu enrichi (PER-69) : nombre de personnes protégées « égal à son INT » → [=INT].
    richText:
      "Le magicien peut tracer un cercle sur le sol (environ 2 m de diamètre) afin de se protéger et d’inclure à sa protection un nombre de personnes égal à son [#INT]. Une fois par round, lorsqu’un sort prend pour cible un personnage protégé, le magicien fait un test d’attaque magique opposé avec l’auteur du sort. Si le test est réussi, le sort adverse est annulé et n’a aucun effet. De plus, toutes les créatures invoquées (élémentaires, démons) et les morts‑vivants qui veulent attaquer une créature dans le cercle subissent un dé malus en attaque. Si le magicien sort du cercle, le sort est dissipé.",
    sourcePage: 105,
  },
  {
    id: 'magie-protectrice-r5',
    name: 'Interruption du temps',
    pathId: 'magie-protectrice',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Après avoir lancé ce sort, le personnage bénéficie d’INT rounds complets hors du temps durant lesquels il peut utiliser des sorts ou des objets (potions) sur lui‑même. Il ne peut interagir avec son environnement, ni se déplacer, seulement utiliser son propre équipement ou ses capacités sur lui‑même.",
    // Rendu enrichi (PER-69) : durée « bénéficie d’[=INT] rounds ».
    richText:
      "Après avoir lancé ce sort, le personnage bénéficie d’[#INT] rounds complets hors du temps durant lesquels il peut utiliser des sorts ou des objets (potions) sur lui‑même. Il ne peut interagir avec son environnement, ni se déplacer, seulement utiliser son propre équipement ou ses capacités sur lui‑même.",
    sourcePage: 105,
  },

  // --- Voie de la magie universelle (p. 106) ---
  {
    id: 'magie-universelle-r1',
    name: 'Lumière',
    pathId: 'magie-universelle',
    rank: 1,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le magicien désigne un objet à moins de 10 m. Celui‑ci produit de la lumière dans un rayon de 10 m pendant INT heures. Cette source de lumière n’émet pas de chaleur. Une fois par combat, le magicien peut lancer ce sort sur les yeux d’une créature dont le NC ne dépasse pas le rang atteint dans la voie. S’il réussit un test opposé d’attaque magique, elle est aveuglée pendant 1 round.",
    // Rendu enrichi (PER-69) : durée [=INT] heures ; seuil de NC « le rang atteint dans
    // la voie » → terme nommé [#rang] (substantif, « le … atteint dans la voie » réclame
    // le mot, pas un nombre nu).
    richText:
      "Le magicien désigne un objet à moins de 10 m. Celui‑ci produit de la lumière dans un rayon de 10 m pendant [=INT] heures. Cette source de lumière n’émet pas de chaleur. Une fois par combat, le magicien peut lancer ce sort sur les yeux d’une créature dont le NC ne dépasse pas le [#rang] atteint dans la voie. S’il réussit un test opposé d’attaque magique, elle est aveuglée pendant 1 round.",
    // « Une fois par combat » (aveuglement) → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 106,
  },
  {
    id: 'magie-universelle-r2',
    name: 'Familier',
    pathId: 'magie-universelle',
    rank: 2,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien choisit un petit animal (écureuil, corbeau, chat, dragonnet). Il peut utiliser les sens de son familier (voir par ses yeux, entendre ce qu’il entend, etc.) et communiquer avec lui à distance illimitée. Il gagne +2 en Initiative et en DEF lorsque son familier est en vue.\nS’il est réduit à 0 PV, le familier disparaît dans un nuage de fumée et le personnage perd 1d4° PV en contrecoup. Toutefois, le maître pourra à nouveau invoquer son familier dès qu’il aura terminé une récupération complète (c’est toujours le même animal qui apparaît). Le familier récupère tous les PV perdus après une récupération rapide.\n\nFAMILIER\n| AGI +3* | CON 0 | FOR ‑4 | PER +2 | | CHA ‑2 | INT ‑2 | VOL +2 |\n(S) Défense [13 + rang dans la voie] (V) Points de vigueur [niveau du magicien] (I) Initiative [Init. du magicien]\nUn familier est une créature trop petite pour attaquer et infliger des dommages.",
    // Rendu enrichi (PER-69) : la prose seule (contrecoup {1d4°} PV) ; le profil du
    // familier est porté par `creatureProfile` (mini-fiche), pas recopié ici.
    richText:
      "Le magicien choisit un petit animal (écureuil, corbeau, chat, dragonnet). Il peut utiliser les sens de son familier (voir par ses yeux, entendre ce qu’il entend, etc.) et communiquer avec lui à distance illimitée. Il gagne +2 en Initiative et en DEF lorsque son familier est en vue.\nS’il est réduit à 0 PV, le familier disparaît dans un nuage de fumée et le personnage perd {1d4°} PV en contrecoup. Toutefois, le maître pourra à nouveau invoquer son familier dès qu’il aura terminé une récupération complète (c’est toujours le même animal qui apparaît). Le familier récupère tous les PV perdus après une récupération rapide.",
    // Profil structuré du familier. Défense [13 + rang] (rang de la voie), PV [=niveau] ;
    // Initiative renvoie au maître. Ne peut pas attaquer (note).
    creatureProfile: {
      name: 'Familier',
      abilities: { AGI: 3, CON: 0, FOR: -4, PER: 2, CHA: -2, INT: -2, VOL: 2 },
      // « AGI +3* » dans le livre — le PER +2 n'a PAS d'astérisque ici (≠ familier du druide).
      bonusDieAbilities: ['AGI'],
      defense: '[13 + rang]',
      hitPoints: '[=niveau]',
      initiative: { fromMaster: 'initiative' },
      note: 'Créature trop petite pour attaquer ou infliger des dommages.',
    },
    // Bonus CONDITIONNEL +2 Init./DEF actif « lorsque son familier est en vue » →
    // interrupteur manuel (PER-67). EXCLUSION MUTUELLE avec Petit compagnon (animaux-r2,
    // druide), version non magique : « le bonus de DEF ne se cumule pas » → `disablesFeatures`
    // réciproque (déclaré des deux côtés).
    effects: [
      {
        kind: 'conditional-stat-bonus',
        // « +2 en Initiative ET en DEF lorsque son familier est en vue » : un seul
        // interrupteur pilote les deux bonus (pas deux toggles séparés). INDEX 0 conservé
        // (des personnages sauvegardés portent déjà `effectToggles[...][0]` pour « en vue »).
        bonuses: [
          { stat: 'initiative', value: 2 },
          { stat: 'def', value: 2 },
        ],
        activation: { kind: 'condition', label: 'familier en vue', activeByDefault: false },
        disablesFeatures: ['animaux-r2'],
      },
      {
        // Marqueur d'INVOCATION (PER-235) : le livre fait du familier une créature qu'on invoque
        // (« le maître pourra à nouveau invoquer son familier dès qu'il aura terminé une
        // récupération complète », p. 96). Effet TEMPORAIRE sans bonus (marqueur d'état on/off) :
        // le bloc de compagnon n'apparaît que lorsqu'il est actif, et un repos complet le
        // renvoie (cf. `clearTemporaryEffectToggles`). DISTINCT de « familier en vue » (index 0),
        // qui ne conditionne que le bonus de DEF/Init.
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Familier invoqué', activeByDefault: false },
      },
    ],
    sourcePage: 106,
  },
  {
    id: 'magie-universelle-r3',
    name: 'Invisibilité',
    pathId: 'magie-universelle',
    rank: 3,
    isSpell: true,
    actionTypes: ['A', 'L'],
    text:
      "Le magicien se rend invisible pendant [1d4°+INT] minutes. Une fois invisible, personne ne peut plus détecter sa présence ou lui porter d’attaque directe. Si le magicien attaque, il redevient visible. À partir du rang 5, le magicien peut lancer ce sort sur un allié au prix d’une action limitée.",
    // Rendu enrichi (PER-69) : durée [1d4° + INT] minutes.
    richText:
      "Le magicien se rend invisible pendant [1d4° + INT] minutes. Une fois invisible, personne ne peut plus détecter sa présence ou lui porter d’attaque directe. Si le magicien attaque, il redevient visible. À partir du rang 5, le magicien peut lancer ce sort sur un allié au prix d’une action limitée.",
    sourcePage: 106,
  },
  {
    id: 'magie-universelle-r4',
    name: 'Vol',
    pathId: 'magie-universelle',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le magicien peut voler pendant [2d4°+INT] minutes. Sa vitesse de déplacement est la même qu’au sol. Il peut rester en vol stationnaire s’il le désire et cela est une action gratuite.",
    // Rendu enrichi (PER-69) : durée [2d4° + INT] minutes.
    richText:
      "Le magicien peut voler pendant [2d4° + INT] minutes. Sa vitesse de déplacement est la même qu’au sol. Il peut rester en vol stationnaire s’il le désire et cela est une action gratuite.",
    sourcePage: 106,
  },
  {
    id: 'magie-universelle-r5',
    name: 'Téléportation',
    pathId: 'magie-universelle',
    rank: 5,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Une fois par jour, le magicien disparaît et réapparaît à un autre endroit situé à moins de (niveau x INT) kilomètres. Le lieu d’arrivée doit être soit en vue, soit parfaitement connu par le magicien. Le magicien peut emmener avec lui un allié à partir du niveau 10, un deuxième au niveau 13, un troisième au niveau 16 et enfin un quatrième au niveau 19.",
    // Rendu enrichi (PER-163) : portée « [=niveau × INT] km » — PRODUIT DE DEUX VARIABLES, désormais
    // exprimable (terme `product`, cf. featureRichText). « Une fois par jour » → compteur 1 usage,
    // rechargé au repos long.
    richText:
      "Une fois par jour, le magicien disparaît et réapparaît à un autre endroit situé à moins de [=niveau × INT] kilomètres. Le lieu d’arrivée doit être soit en vue, soit parfaitement connu par le magicien. Le magicien peut emmener avec lui un allié à partir du niveau 10, un deuxième au niveau 13, un troisième au niveau 16 et enfin un quatrième au niveau 19.",
    usageCounter: { max: 1, resetOn: 'day', hideFromStatusPanel: true },
    sourcePage: 106,
  },

  // ===================== SORCIER =====================

  // --- Voie du démon (p. 107) ---
  {
    id: 'demon-r1',
    name: 'Malédiction',
    pathId: 'demon',
    rank: 1,
    isSpell: true,
    actionTypes: ['M', 'L'],
    text:
      "Le sorcier effectue un test opposé d’attaque magique contre une cible à moins de 20 m. En cas de succès, si l’incantation était une action de mouvement (M), la victime subit un dé malus à son prochain test. Si l’incantation était une action limitée (L), le dé malus s’applique à ses 3 prochains tests. Dans tous les cas, la cible ne peut subir les effets de ce sort qu’une fois par combat.",
    sourcePage: 107,
  },
  {
    id: 'demon-r2',
    name: 'Beauté de la succube',
    pathId: 'demon',
    rank: 2,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le sorcier acquiert une beauté fascinante pour INT minutes. Il gagne un dé bonus aux tests de CHA ainsi qu’une attaque de contact nécessitant un test d’attaque magique (contre DEF, action d’attaque), qui inflige [1d4°+INT] DM. Le sorcier récupère autant de PV (sans dépasser son maximum de PV) que la cible en a perdu.",
    // Rendu enrichi (PER-69) : durée [=INT] minutes ; DM de l’attaque [1d4° + INT].
    richText:
      "Le sorcier acquiert une beauté fascinante pour [=INT] minutes. Il gagne un dé bonus aux tests de CHA ainsi qu’une attaque de contact nécessitant un test d’attaque magique (contre DEF, action d’attaque), qui inflige [1d4° + INT] DM. Le sorcier récupère autant de PV (sans dépasser son maximum de PV) que la cible en a perdu.",
    sourcePage: 107,
  },
  {
    id: 'demon-r3',
    name: 'Pacte démoniaque',
    pathId: 'demon',
    rank: 3,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Le sorcier sacrifie 1d4° PV et gagne immédiatement +INT sur le résultat d’un d20 qu’il vient de lancer ou en DEF contre une attaque (avant de savoir si une attaque touche). De plus, il ajoute désormais sa VOL au nombre de dés de récupération (DR) qu’il possède.",
    // Rendu enrichi (PER-69) : sacrifice {1d4°} PV ; boost ponctuel [INT] sur un d20/la DEF.
    richText:
      "Le sorcier sacrifie {1d4°} PV et gagne immédiatement [INT] sur le résultat d’un d20 qu’il vient de lancer ou en DEF contre une attaque (avant de savoir si une attaque touche). De plus, il ajoute désormais sa VOL au nombre de dés de récupération (DR) qu’il possède.",
    // « ajoute sa VOL au nombre de dés de récupération » → bonus permanent de DR égal à la VOL.
    effects: [
      { kind: 'stat-bonus', stat: 'recoveryDiceCount', value: { scale: 'ability', ability: 'VOL' } },
    ],
    sourcePage: 107,
  },
  {
    id: 'demon-r4',
    name: 'Aspect du démon',
    pathId: 'demon',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le sorcier prend l’apparence d’un démon ailé pendant INT minutes. Il gagne un dé bonus en attaque au contact et +5 en DEF et à tous les tests physiques (FOR, AGI, CON), mais il ne peut pas utiliser d’arme (ni les arts martiaux). Il peut faire deux attaques de griffes à [1d4°+INT] DM à chaque tour, en action limitée (une seule en action d’attaque) et il peut voler de 10 m par action de mouvement.\nNote : Ne se cumule pas avec la Beauté de la succube.",
    // Rendu enrichi (PER-69) : durée [=INT] minutes ; DM des griffes [1d4° + INT].
    richText:
      "Le sorcier prend l’apparence d’un démon ailé pendant [=INT] minutes. Il gagne un dé bonus en attaque au contact et +5 en DEF et à tous les tests physiques (FOR, AGI, CON), mais il ne peut pas utiliser d’arme (ni les arts martiaux). Il peut faire deux attaques de griffes à [1d4° + INT] DM à chaque tour, en action limitée (une seule en action d’attaque) et il peut voler de 10 m par action de mouvement.\nNote : Ne se cumule pas avec la Beauté de la succube.",
    // Bonus de DEF TEMPORAIRE +5 pendant l’Aspect du démon → interrupteur manuel (PER-67).
    // Le « +5 à tous les tests physiques » relève de PER-89 (bonus aux tests) → texte.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [{ stat: 'def', value: 5 }],
        activation: { kind: 'temporary', label: 'Aspect du démon actif', activeByDefault: false },
        // « Ne se cumule pas avec la Beauté de la succube » : tant qu'Aspect du démon
        // est actif, demon-r2 est grisée + désactivée. Lien À SENS UNIQUE (la Beauté
        // de la succube, sans interrupteur, ne désactive rien en retour).
        disablesFeatures: ['demon-r2'],
      },
    ],
    sourcePage: 107,
  },
  {
    id: 'demon-r5',
    name: "Invocation d’un démon",
    pathId: 'demon',
    rank: 5,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "En sacrifiant 1d4° PV, le sorcier invoque un démon à son service pour INT minutes. Ce démon possède l’apparence d’un humanoïde musclé d’environ 2,30 m doté d’une épée et d’ailes de chauve‑souris. Le démon divise par deux tous les DM non magiques subis, les sorts et les armes magiques lui infligent des DM normaux. Il est capable de voler à une vitesse équivalente à un déplacement normal. Lorsque le sorcier atteint le niveau 15, le démon devient capable d’attaquer deux fois à son tour, au prix d’une action limitée.\n\nDÉMON\n| AGI +2 | CON +4* | FOR +5* | PER +2 | | CHA +0 | INT +2 | VOL +4 |\n(S) Défense 18 (V) Points de vigueur [niveau du sorcier × 5] (I) Initiative [Init. du sorcier]\nAttaque au contact [attaque magique du sorcier] · DM 2d4°+5",
    // Rendu enrichi (PER-69) : la prose seule (sacrifice {1d4°} PV, durée [=INT] minutes) ;
    // le profil du démon est porté par `creatureProfile` (mini-fiche).
    richText:
      "En sacrifiant {1d4°} PV, le sorcier invoque un démon à son service pour [=INT] minutes. Ce démon possède l’apparence d’un humanoïde musclé d’environ 2,30 m doté d’une épée et d’ailes de chauve‑souris. Le démon divise par deux tous les DM non magiques subis, les sorts et les armes magiques lui infligent des DM normaux. Il est capable de voler à une vitesse équivalente à un déplacement normal. Lorsque le sorcier atteint le niveau 15, le démon devient capable d’attaquer deux fois à son tour, au prix d’une action limitée.",
    // Interrupteur de présence (PER-69) : le démon invoqué n'accorde AUCUN bonus de
    // stat dérivée au sorcier (il agit seul, cf. mini-fiche `creatureProfile`) ; le toggle
    // sert uniquement à suivre son état d'invocation à la table. Effet conditionnel SANS
    // bonus = marqueur d'état on/off (durée INT minutes).
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Démon invoqué', activeByDefault: false },
      },
    ],
    // Profil structuré du démon. Défense 18 (fixe), PV [=niveau × 5] (niveau du sorcier),
    // DM [2d4° + 5] ; Initiative et Attaque renvoient au maître.
    creatureProfile: {
      name: 'Démon',
      abilities: { AGI: 2, CON: 4, FOR: 5, PER: 2, CHA: 0, INT: 2, VOL: 4 },
      // « CON +4* | FOR +5* » dans le livre.
      bonusDieAbilities: ['CON', 'FOR'],
      defense: '18',
      hitPoints: '[=niveau × 5]',
      initiative: { fromMaster: 'initiative' },
      attack: { fromMaster: 'magicAttack', damage: '[2d4° + 5]' },
    },
    sourcePage: 107,
  },

  // --- Voie de la mort (p. 108) ---
  {
    id: 'mort-r1',
    name: 'Siphon des âmes',
    pathId: 'mort',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Une fois par round, lorsqu’une créature humanoïde vivante meurt à moins de 20 m du sorcier, il récupère NC PV (arrondis à 1 pour NC ½). À partir du rang 3, si la créature est de NC supérieur à 4, il peut choisir de récupérer 1 PM au lieu des PV.",
    sourcePage: 108,
  },
  {
    id: 'mort-r2',
    name: 'Masque mortuaire',
    pathId: 'mort',
    rank: 2,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "Le sorcier prend l’apparence de la mort pendant INT minutes. Il est alors considéré non‑vivant et devient immunisé à la plupart des pouvoirs des morts‑vivants (drain de vigueur et affaiblissement, paralysie de la goule, etc.). De plus, ceux‑ci le prennent pour l’un des leurs. Il divise par deux tous les DM de froid. Il ne peut pas bénéficier de soins tant qu’il est sous l’effet de ce sort.\nNote : Les créatures non vivantes sont infatigables, ne respirent pas et sont immunisées aux maladies, aux poisons et à la plupart des attaques qui demandent un test de CON. Elles voient dans le noir comme dans de la pénombre à une distance de 30 m.",
    // Rendu enrichi (PER-69) : durée « pendant [=INT] minutes » (le « test de CON » de la
    // Note décrit les créatures non vivantes en général → littéral).
    richText:
      "Le sorcier prend l’apparence de la mort pendant [=INT] minutes. Il est alors considéré non‑vivant et devient immunisé à la plupart des pouvoirs des morts‑vivants (drain de vigueur et affaiblissement, paralysie de la goule, etc.). De plus, ceux‑ci le prennent pour l’un des leurs. Il divise par deux tous les DM de froid. Il ne peut pas bénéficier de soins tant qu’il est sous l’effet de ce sort.\nNote : Les créatures non vivantes sont infatigables, ne respirent pas et sont immunisées aux maladies, aux poisons et à la plupart des attaques qui demandent un test de CON. Elles voient dans le noir comme dans de la pénombre à une distance de 30 m.",
    // PER-137 : pendant le sort (interrupteur) — ÷2 froid ET immunité aux poisons/maladies (état
    // non‑vivant). Les pouvoirs de morts‑vivants (drain, paralysie de goule) restent verbatim.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Masque mortuaire actif', activeByDefault: false },
      },
    ],
    damageReduction: [
      { kind: 'divide', value: 2, scopes: ['cold'] },
      { kind: 'immunity', scopes: ['poison', 'disease'] },
    ],
    sourcePage: 108,
  },
  {
    id: 'mort-r3',
    name: 'Baiser du vampire',
    pathId: 'mort',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Ce sort nécessite la réussite d’un test opposé d’attaque magique (portée 30 m). La victime subit [2d4°+INT] DM et le sorcier récupère autant de PV (sans dépasser son maximum de PV).",
    // Rendu enrichi (PER-69) : DM [2d4° + INT].
    richText:
      "Ce sort nécessite la réussite d’un test opposé d’attaque magique (portée 30 m). La victime subit [2d4° + INT] DM et le sorcier récupère autant de PV (sans dépasser son maximum de PV).",
    sourcePage: 108,
  },
  {
    id: 'mort-r4',
    name: 'Peur',
    pathId: 'mort',
    rank: 4,
    isSpell: true,
    actionTypes: ['A', 'L'],
    text:
      "Le sorcier effectue un test opposé d’attaque magique contre une cible (portée 20 m). S’il l’emporte, la victime fuit aussi loin du sorcier que possible pendant INT rounds (il lui faut généralement autant de temps pour revenir !). Les créatures dont le NC est supérieur ou égal au niveau du sorcier ne fuient qu’un seul round. Le sorcier peut choisir de lancer ce sort en action limitée et toutes les créatures à son contact sont affectées (faire un test d’attaque magique par adversaire).",
    // Rendu enrichi (PER-69) : durée de fuite « pendant [=INT] rounds ».
    richText:
      "Le sorcier effectue un test opposé d’attaque magique contre une cible (portée 20 m). S’il l’emporte, la victime fuit aussi loin du sorcier que possible pendant [=INT] rounds (il lui faut généralement autant de temps pour revenir !). Les créatures dont le NC est supérieur ou égal au niveau du sorcier ne fuient qu’un seul round. Le sorcier peut choisir de lancer ce sort en action limitée et toutes les créatures à son contact sont affectées (faire un test d’attaque magique par adversaire).",
    sourcePage: 108,
  },
  {
    id: 'mort-r5',
    name: 'Briser les cœurs',
    pathId: 'mort',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le sorcier fait mine d’arracher le cœur de sa victime, puis de broyer dans sa main (l’image du cœur de la victime apparaît dans la main du sorcier). Il doit faire un test opposé d’attaque magique contre une cible vivante (portée 20 m) et, en cas de réussite, il inflige [5d4°+INT] DM, la moitié en cas de test raté. Ce sort ne peut affecter une même cible qu’une seule fois par combat.",
    // Rendu enrichi (PER-69) : DM [5d4° + INT].
    richText:
      "Le sorcier fait mine d’arracher le cœur de sa victime, puis de broyer dans sa main (l’image du cœur de la victime apparaît dans la main du sorcier). Il doit faire un test opposé d’attaque magique contre une cible vivante (portée 20 m) et, en cas de réussite, il inflige [5d4° + INT] DM, la moitié en cas de test raté. Ce sort ne peut affecter une même cible qu’une seule fois par combat.",
    sourcePage: 108,
  },

  // --- Voie de l’outre‑tombe (p. 109) ---
  {
    id: 'outre-tombe-r1',
    name: 'Un pied dans la tombe',
    pathId: 'outre-tombe',
    rank: 1,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le sorcier désigne une cible vivante à portée (10 m) et doit réussir un test opposé d’attaque magique. En cas de succès, la cible ressent une douleur intense à l’emplacement du cœur, elle subit [1d4°+INT] DM et, si elle rate un test de CON difficulté 10, l’état ralenti durant 1 round.",
    // Rendu enrichi (PER-69) : DM [1d4° + INT] ; le test de @CON est celui de la cible
    // (difficulté 10 fixe).
    richText:
      "Le sorcier désigne une cible vivante à portée (10 m) et doit réussir un test opposé d’attaque magique. En cas de succès, la cible ressent une douleur intense à l’emplacement du cœur, elle subit [1d4° + INT] DM et, si elle rate un test de @CON difficulté 10, l’état ralenti durant 1 round.",
    sourcePage: 109,
  },
  {
    id: 'outre-tombe-r2',
    name: 'Armure d’os',
    pathId: 'outre-tombe',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le sorcier peut désormais porter une armure d’os (souvent camouflée sous une robe) qui lui offre un bonus de +3 en DEF et n’empêche pas l’utilisation des capacités de sorcier. Son bonus de DEF augmente de +1 chaque fois que le personnage atteint le rang 4 dans une voie de sorcier. Le sorcier doit confectionner cette armure lui‑même à partir d’ossements et l’entretenir par magie 10 min chaque jour. L’armure d’os n’inflige aucun malus d’AGI.",
    // Bonus permanent de DEF (armure d’os, portée en continu) : base 3, PLUS +1 par voie
    // de sorcier au rang 4 (milestone-count CROSS-VOIE). Pas de richText : pas de jeton parsable.
    // FRONTIÈRE milestone Armures : l’armure d’os est une armure (n’empêche pas les
    // capacités, aucun malus d’AGI) → interaction avec le port d’armure câblée côté Armures.
    effects: [
      {
        kind: 'stat-bonus',
        stat: 'def',
        value: {
          scale: 'sum',
          parts: [3, { scale: 'milestone-count', per: 1, rank: 4, classIds: ['sorcier'] }],
        },
      },
    ],
    sourcePage: 109,
  },
  {
    id: 'outre-tombe-r3',
    name: 'Animation des morts',
    pathId: 'outre-tombe',
    rank: 3,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le sorcier anime le cadavre d’un humanoïde de taille moyenne, décédé depuis moins d’INT jours. Le zombie comprend les ordres « Attaquer », « Suivre », « Garder » et « Pas bouger ». Le sorcier peut contrôler un seul zombie, plus un zombie chaque fois qu’il atteint le rang 5 dans une voie de sorcier. Un zombie réduit à 0 PV tombe en poussière.\n\nZOMBIE\n| AGI ‑1 | CON +1 | FOR +2 | PER ‑2 | | CHA ‑4 | INT ‑4 | VOL +6 |\n(S) Défense 10 (V) Points de vigueur [10 + niveau] (I) Initiative 8\nAttaque au contact [attaque magique du sorcier] · DM 1d4°+2 Le zombie se déplace de 5 m par action de mouvement.",
    // Rendu enrichi (PER-69) : la prose seule (péremption « moins d’[#INT] jours ») ;
    // le profil du zombie est porté par `creatureProfile` (mini-fiche).
    richText:
      "Le sorcier anime le cadavre d’un humanoïde de taille moyenne, décédé depuis moins d’[#INT] jours. Le zombie comprend les ordres « Attaquer », « Suivre », « Garder » et « Pas bouger ». Le sorcier peut contrôler un seul zombie, plus un zombie chaque fois qu’il atteint le rang 5 dans une voie de sorcier. Un zombie réduit à 0 PV tombe en poussière.",
    // Profil structuré du zombie. Défense 10 et Initiative 8 (fixes), PV [=10 + niveau]
    // (niveau du sorcier), DM [1d4° + 2] ; Attaque renvoie au maître.
    creatureProfile: {
      name: 'Zombie',
      abilities: { AGI: -1, CON: 1, FOR: 2, PER: -2, CHA: -4, INT: -4, VOL: 6 },
      defense: '10',
      hitPoints: '[=10 + niveau]',
      initiative: '8',
      attack: { fromMaster: 'magicAttack', damage: '[1d4° + 2]' },
      note: 'Se déplace de 5 m par action de mouvement.',
      // Compagnon MULTI-INSTANCES (PER-235) : « le sorcier peut contrôler un seul zombie, plus un
      // zombie chaque fois qu'il atteint le rang 5 dans une voie de sorcier » (p. 109) → limite
      // = 1 + nombre de voies de sorcier au rang 5 (voie hôte incluse).
      instances: { limit: { base: 1, rank: 5, classIds: ['sorcier'] } },
    },
    sourcePage: 109,
  },
  {
    id: 'outre-tombe-r4',
    name: 'Ensevelissement',
    pathId: 'outre-tombe',
    rank: 4,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Une fois par combat, si le sorcier réussit un test opposé d’attaque magique (portée 20 m), des mains squelettiques surgissent sous les pieds d’une cible de taille moyenne ou inférieure et l’enterrent vivante. Tant qu’elle est ensevelie, elle subit 2d4° DM par round, ne peut agir ni être la cible d’attaques extérieures. À son tour, elle peut tenter de sortir de terre en réussissant un test de FOR ou d’AGI (au choix de la cible) difficulté 15 au prix d’une action limitée. Si elle tombe à 0 PV, elle reste enterrée et décède au tour suivant. Chaque personne qui creuse pour l’aider lui octroie un bonus de +2 sur son test (maximum +10).",
    // Rendu enrichi (PER-69) : DM {2d4°} par round ; les tests de @FOR/@AGI pour se dégager
    // sont ceux de la CIBLE (difficulté 15, bonus d’aide +2/+10 fixes).
    richText:
      "Une fois par combat, si le sorcier réussit un test opposé d’attaque magique (portée 20 m), des mains squelettiques surgissent sous les pieds d’une cible de taille moyenne ou inférieure et l’enterrent vivante. Tant qu’elle est ensevelie, elle subit {2d4°} DM par round, ne peut agir ni être la cible d’attaques extérieures. À son tour, elle peut tenter de sortir de terre en réussissant un test de @FOR ou d’@AGI (au choix de la cible) difficulté 15 au prix d’une action limitée. Si elle tombe à 0 PV, elle reste enterrée et décède au tour suivant. Chaque personne qui creuse pour l’aider lui octroie un bonus de +2 sur son test (maximum +10).",
    sourcePage: 109,
  },
  {
    id: 'outre-tombe-r5',
    name: 'Armée des morts',
    pathId: 'outre-tombe',
    rank: 5,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Une fois par jour, le sorcier peut invoquer d’innombrables squelettes qui émergent du sol pour attaquer ses ennemis pendant [niveau du sorcier] rounds. Tous les adversaires situés dans un rayon de 10 m autour du sorcier subissent automatiquement 2d4° DM par round. Les squelettes se déplacent avec le sorcier, mais tous les déplacements dans cette zone (même ceux du sorcier) sont divisés par deux.",
    // Rendu enrichi (PER-69) : durée « pendant [=niveau] rounds » (niveau du sorcier,
    // suffixe implicite retiré) ; DM {2d4°} par round.
    richText:
      "Une fois par jour, le sorcier peut invoquer d’innombrables squelettes qui émergent du sol pour attaquer ses ennemis pendant [=niveau] rounds. Tous les adversaires situés dans un rayon de 10 m autour du sorcier subissent automatiquement {2d4°} DM par round. Les squelettes se déplacent avec le sorcier, mais tous les déplacements dans cette zone (même ceux du sorcier) sont divisés par deux.",
    // « Une fois par jour » → compteur 1 usage, rechargé au repos long.
    usageCounter: { max: 1, resetOn: 'day', hideFromStatusPanel: true },
    sourcePage: 109,
  },

  // --- Voie du sang (p. 109) ---
  {
    id: 'sang-r1',
    name: 'Saignements',
    pathId: 'sang',
    rank: 1,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le sorcier doit réussir un test d’attaque magique (portée 10 m) contre une difficulté de [10 + CON de la cible]. Du sang s’écoule de la bouche, du nez, des oreilles et même des yeux de la victime, qui subit 1d4° DM par round pendant INT rounds.",
    // Rendu enrichi (PER-69) : la difficulté « 10 + CON DE LA CIBLE » dépend d’une stat
    // d’adversaire NON calculable → @CON en référence, crochets retirés (format §5) ;
    // DM {1d4°} par round ; durée [=INT] rounds.
    richText:
      "Le sorcier doit réussir un test d’attaque magique (portée 10 m) contre une difficulté de 10 + @CON de la cible. Du sang s’écoule de la bouche, du nez, des oreilles et même des yeux de la victime, qui subit {1d4°} DM par round pendant [=INT] rounds.",
    sourcePage: 109,
  },
  {
    id: 'sang-r2',
    name: 'Sang mordant',
    pathId: 'sang',
    rank: 2,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "Pendant INT minutes, le sang du sorcier se transforme en un acide qui gicle lorsqu’il subit une blessure. Chaque fois qu’un ennemi au contact le blesse, ce dernier subit 1d4° DM d’acide.",
    // Rendu enrichi (PER-69) : durée [=INT] minutes ; DM de représailles {1d4°}.
    richText:
      "Pendant [=INT] minutes, le sang du sorcier se transforme en un acide qui gicle lorsqu’il subit une blessure. Chaque fois qu’un ennemi au contact le blesse, ce dernier subit {1d4°} DM d’acide.",
    sourcePage: 109,
  },
  {
    id: 'sang-r3',
    name: 'Exsangue',
    pathId: 'sang',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Le corps du sorcier devient cadavérique. Il gagne +2 en DEF et ce bonus passe à +3 au rang 5 (Si le personnage porte une armure autre qu’une armure d’os de sorcier, le bonus est réduit de 1 point, donc +1 DEF et +2 DEF au rang 5). De plus, lorsqu’il tombe à 0 PV, il peut continuer à agir, mais avec un dé malus à tous ses tests. S’il subit encore au moins 1 DM, il sombre dans l’inconscience.",
    // Bonus permanent +2 en DEF, porté à +3 au rang 5 de CETTE voie (stepped par rang de
    // voie hôte). Pas de richText : montée par rang en prose.
    // FRONTIÈRE milestone Armures : la réduction « ‑1 si armure autre que l’armure d’os »
    // dépend du port d’armure → câblée côté Armures.
    effects: [
      {
        kind: 'stat-bonus',
        stat: 'def',
        value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 2 }, { min: 5, value: 3 }] },
      },
    ],
    sourcePage: 110,
  },
  {
    id: 'sang-r4',
    name: 'Rituel de sang',
    pathId: 'sang',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le sorcier s’ouvre les veines et sacrifie 1d4° PV pour cibler une créature vivante (portée 20 m), la victime saigne à la moindre blessure. Tous les DM infligés à la cible par des armes tranchantes ou perçantes (griffes et crocs inclus) augmentent de +1d4° pendant INT rounds.",
    // Rendu enrichi (PER-69) : sacrifice {1d4°} PV ; bonus de DM +{1d4°} ; durée [=INT] rounds.
    richText:
      "Le sorcier s’ouvre les veines et sacrifie {1d4°} PV pour cibler une créature vivante (portée 20 m), la victime saigne à la moindre blessure. Tous les DM infligés à la cible par des armes tranchantes ou perçantes (griffes et crocs inclus) augmentent de +{1d4°} pendant [=INT] rounds.",
    sourcePage: 110,
  },
  {
    id: 'sang-r5',
    name: 'Lien de sang',
    pathId: 'sang',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "En réussissant un test opposé d’attaque magique (portée 20 m), le sorcier tisse un lien avec sa victime. Pendant INT minutes, la moitié des DM reçus par le sorcier sont également subis par la cible (les DM infligés au sorcier ne sont pas pour autant réduits) et le sorcier peut lui lancer un sort sans la voir (si elle est à portée).",
    // Rendu enrichi (PER-69) : durée « Pendant [=INT] minutes ».
    richText:
      "En réussissant un test opposé d’attaque magique (portée 20 m), le sorcier tisse un lien avec sa victime. Pendant [=INT] minutes, la moitié des DM reçus par le sorcier sont également subis par la cible (les DM infligés au sorcier ne sont pas pour autant réduits) et le sorcier peut lui lancer un sort sans la voir (si elle est à portée).",
    sourcePage: 110,
  },

  // --- Voie de la sombre magie (p. 110) ---
  {
    id: 'sombre-magie-r1',
    name: 'Ténèbres',
    pathId: 'sombre-magie',
    rank: 1,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le sorcier invoque une zone fixe de ténèbres magiques, de 10 m de diamètre, à une portée de 20 m pour une durée d’INT minutes. Toutes les créatures, même celles capables de voir dans le noir, sont aveuglées dans cette zone. En plus de ce sort, le sorcier ajoute son rang + 2 à tous les tests d’INT basés sur les savoirs sombres (démons, morts‑vivants, rituels impies, etc.).",
    // Rendu enrichi (PER-69) : durée [=INT] minutes ; « rang + 2 » modificateur aux tests.
    // Bonus de compétence (PER-89) : domaine = érudition occulte (le texte précise « tests
    // d'INT basés sur les savoirs sombres » → carac gouvernante INT assurée).
    richText:
      "Le sorcier invoque une zone fixe de ténèbres magiques, de 10 m de diamètre, à une portée de 20 m pour une durée d’[#INT] minutes. Toutes les créatures, même celles capables de voir dans le noir, sont aveuglées dans cette zone. En plus de ce sort, le sorcier ajoute son [rang + 2] à tous les tests d’INT basés sur les savoirs sombres (démons, morts‑vivants, rituels impies, etc.).",
    effects: [{ kind: 'test-bonus', domains: ['occult-lore'] }],
    sourcePage: 110,
  },
  {
    id: 'sombre-magie-r2',
    name: 'Reptation',
    pathId: 'sombre-magie',
    rank: 2,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "Pendant INT minutes, le sorcier peut ramper de 5 m par action de mouvement sur les murs et les plafonds. Il peut lancer des sorts dans cette posture.",
    // Rendu enrichi (PER-69) : durée « Pendant [=INT] minutes ».
    richText:
      "Pendant [=INT] minutes, le sorcier peut ramper de 5 m par action de mouvement sur les murs et les plafonds. Il peut lancer des sorts dans cette posture.",
    sourcePage: 110,
  },
  {
    id: 'sombre-magie-r3',
    name: 'Strangulation',
    pathId: 'sombre-magie',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "En réussissant un test opposé d’attaque magique (portée 20 m), le sorcier étouffe une créature vivante. La victime subit un dé malus à tous ses tests et [1d4°+INT] DM par round tant que le sorcier maintient sa concentration par une action de mouvement et la dépense de 1 PM par round. Si la victime sort de la portée du sort, il prend fin.",
    // Rendu enrichi (PER-69) : DM [1d4° + INT] par round. Le « 1 PM par round » est un coût
    // d’entretien DYNAMIQUE (par round de concentration), hors coût de base → pas de `manaCost`.
    richText:
      "En réussissant un test opposé d’attaque magique (portée 20 m), le sorcier étouffe une créature vivante. La victime subit un dé malus à tous ses tests et [1d4° + INT] DM par round tant que le sorcier maintient sa concentration par une action de mouvement et la dépense de 1 PM par round. Si la victime sort de la portée du sort, il prend fin.",
    sourcePage: 111,
  },
  {
    id: 'sombre-magie-r4',
    name: 'Manteau d’ombre',
    pathId: 'sombre-magie',
    rank: 4,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le sorcier s’enveloppe d’ombre pendant INT minutes. Il gagne un dé bonus à tous les tests de discrétion et il impose un dé malus à tous les tests d’attaque à distance qui le prennent pour cible. S’il tombe à 0 PV pendant la durée du sort, il peut choisir de disparaître dans son ombre et de réapparaître à 1d6 km dans la direction de son choix avec 1d4° PV, 1d6 min plus tard (une dissipation de la magie (Maîtrise de la magie, voie du mage) lancée sur la zone où le sorcier a disparu dans son ombre avant sa réapparition au loin fait apparaître son corps et annule l’effet). Ceci met fin au sort et interdit de le lancer de nouveau avant le prochain crépuscule.",
    // Rendu enrichi (PER-69) : durée [=INT] minutes ; dés de réapparition {1d6} km, {1d4°} PV,
    // {1d6} min.
    richText:
      "Le sorcier s’enveloppe d’ombre pendant [=INT] minutes. Il gagne un dé bonus à tous les tests de discrétion et il impose un dé malus à tous les tests d’attaque à distance qui le prennent pour cible. S’il tombe à 0 PV pendant la durée du sort, il peut choisir de disparaître dans son ombre et de réapparaître à {1d6} km dans la direction de son choix avec {1d4°} PV, {1d6} min plus tard (une dissipation de la magie (Maîtrise de la magie, voie du mage) lancée sur la zone où le sorcier a disparu dans son ombre avant sa réapparition au loin fait apparaître son corps et annule l’effet). Ceci met fin au sort et interdit de le lancer de nouveau avant le prochain crépuscule.",
    sourcePage: 111,
  },
  {
    id: 'sombre-magie-r5',
    name: 'Pacte ténébreux',
    pathId: 'sombre-magie',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le sorcier augmente sa CON de +1. Désormais, il obtient un dé bonus aux tests de CON et voit dans le noir comme s’il s’agissait de pénombre. De plus, lorsqu’il lance un sort, il peut sacrifier 1d4° PV pour ajouter +2d4° aux DM de ce sort. S’il s’agit d’un sort dont les DM durent de round en round (comme strangulation), il peut sacrifier 1d4° PV chaque round.",
    // Rendu enrichi (PER-69) : sacrifice {1d4°} PV ; bonus de DM +{2d4°}.
    // « +1 en CON » → modificateur permanent de carac. « dé bonus aux tests de CON » → dé
    // bonus permanent (mécanique core, icône double-d20).
    // TODO(extraction) : la vision dans le noir (sens narratif) reste en texte verbatim.
    richText:
      "Le sorcier augmente sa CON de +1. Désormais, il obtient un dé bonus aux tests de CON et voit dans le noir comme s’il s’agissait de pénombre. De plus, lorsqu’il lance un sort, il peut sacrifier {1d4°} PV pour ajouter +{2d4°} aux DM de ce sort. S’il s’agit d’un sort dont les DM durent de round en round (comme strangulation), il peut sacrifier {1d4°} PV chaque round.",
    effects: [
      { kind: 'ability-bonus', ability: 'CON', value: 1 },
      { kind: 'ability-bonus-die', ability: 'CON' },
    ],
    sourcePage: 110,
  },
];
